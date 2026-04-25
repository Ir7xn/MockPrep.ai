from flask import Blueprint, request, send_file, Response
import os
from io import BytesIO
import numpy as np
import scipy.io.wavfile
from pocket_tts import TTSModel
from functools import lru_cache
import hashlib
from concurrent.futures import ThreadPoolExecutor
import threading

tts_bp = Blueprint('tts_bp', __name__, url_prefix='/api/tts')

VOICE_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "WhatsApp Ptt 2026-04-13 at 19.39.06.wav")

print("Loading Pocket-TTS (100M parameters)...")
model = TTSModel.load_model()

# if os.path.exists(VOICE_FILE):
#     voice_state = model.get_state_for_audio_prompt(VOICE_FILE)
#     print(f"Successfully cloned {VOICE_FILE}")
# else:
#     print(f"Warning: {VOICE_FILE} not found. Falling back to default voice.")
#     voice_state = model.get_state_for_audio_prompt("alba")

# Disable voice cloning completely (no HF auth required)
DEFAULT_VOICE = "anna"  

print(f"Using default TTS voice: {DEFAULT_VOICE}")
voice_state = model.get_state_for_audio_prompt(DEFAULT_VOICE)

def _warmup_tts_model():
    """
    Warm up the TTS model with a test generation to ensure GPU/CPU is ready.
    This primes the model and prevents latency spikes on first real request.
    """
    try:
        print("[TTS] Warming up model with test generation...")
        test_text = "Hello, this is a test."
        _ = model.generate_audio(voice_state, test_text)
        print("[TTS] OK - Model warm-up complete")
    except Exception as e:
        print(f"[TTS] WARN - Model warm-up failed (non-critical): {e}")


# Warm up model on module load
_warmup_tts_model()

# Cache for generated audio
_audio_cache = {}
_pregeneration_cache = {}  # Store pre-generated audio with TTL
_pregeneration_threads = {}  # Track active pre-generation threads
_pregeneration_lock = threading.Lock()  # Ensure only one pregen thread starts per question

def _amplify_audio(audio_tensor, gain_db=3.0):
    """
    Gentle amplification without aggressive normalization.
    Prevents robotic sound artifacts.
    
    Args:
        audio_tensor: Audio tensor (float or numpy array)
        gain_db: Gain in decibels (default 3dB ≈ 1.4x amplitude)
    
    Returns:
        Amplified audio as numpy array
    """
    audio = np.array(audio_tensor, dtype=np.float32)
    
    # Apply gain linearly (less aggressive than normalization)
    gain_linear = 10 ** (gain_db / 20.0)
    audio = audio * gain_linear
    
    # Gentle limiter (no harsh clipping)
    # Threshold at 0.95 to leave headroom
    threshold = 0.95
    mask = np.abs(audio) > threshold
    audio[mask] = np.sign(audio[mask]) * threshold
    
    return audio

def _pregenerate_audio_background(interview_id: str, question_text: str, question_no: int):
    """
    Pre-generate audio in background thread without blocking.
    Stores result in _pregeneration_cache keyed by interview_id and question_no.
    """
    cache_key = f"{interview_id}:{question_no}"
    
    try:
        print(f"[PreGen] Starting background generation for Q{question_no}")
        
        # Use chunking if long
        if len(question_text) > 200:
            audio_chunks = _generate_audio_chunks(question_text)
            combined_audio = b""
            for i, chunk_data in enumerate(audio_chunks):
                if i == 0:
                    combined_audio = chunk_data
                else:
                    combined_audio += chunk_data[44:]
            audio_data = combined_audio
        else:
            audio_data = _generate_audio_cached(question_text)
        
        # Apply interview volume ducking
        audio_int16 = np.frombuffer(audio_data[44:], dtype=np.int16)
        audio_float = audio_int16.astype(np.float32) / 32768.0
        audio_float *= 0.7
        audio_int16_reduced = np.clip(audio_float * 32767, -32768, 32767).astype(np.int16)
        audio_buffer = BytesIO()
        scipy.io.wavfile.write(audio_buffer, model.sample_rate, audio_int16_reduced)
        audio_buffer.seek(0)
        
        _pregeneration_cache[cache_key] = audio_buffer.getvalue()
        print(f"[PreGen] OK - Pre-generated Q{question_no} ready for interview {interview_id}")
        
    except Exception as e:
        print(f"[PreGen] ERR - Error pre-generating Q{question_no}: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Clean up thread reference
        if cache_key in _pregeneration_threads:
            del _pregeneration_threads[cache_key]

@tts_bp.route('/pregenerate', methods=['POST'])
def pregenerate_audio():
    """
    Trigger background pre-generation of audio for a question.
    Called while user is answering current question.
    Returns immediately without waiting.
    """
    data = request.json
    interview_id = data.get('interview_id')
    question_text = data.get('text')
    question_no = data.get('question_no', 0)
    
    if not interview_id or not question_text:
        return {"error": "interview_id and text required"}, 400
    
    cache_key = f"{interview_id}:{question_no}"
    
    with _pregeneration_lock:
        if cache_key in _pregeneration_threads or cache_key in _pregeneration_cache:
            return {"status": "already_in_progress_or_cached"}, 200

        thread = threading.Thread(
            target=_pregenerate_audio_background,
            args=(interview_id, question_text, question_no),
            daemon=True
        )
        _pregeneration_threads[cache_key] = thread
        thread.start()

    return {"status": "pre-generation_started"}, 202

@tts_bp.route('/get-pregenerated', methods=['POST'])
def get_pregenerated_audio():
    """
    Retrieve pre-generated audio if available.
    Falls back to on-demand generation if not ready yet.
    """
    data = request.json
    interview_id = data.get('interview_id')
    question_text = data.get('text')
    question_no = data.get('question_no', 0)
    max_wait_ms = data.get('max_wait_ms', 3000)  # Wait up to 3000ms
    
    if not interview_id or not question_text:
        return {"error": "interview_id and text required"}, 400
    
    cache_key = f"{interview_id}:{question_no}"
    
    # Check if pre-generated audio is ready
    if cache_key in _pregeneration_cache:
        audio_data = _pregeneration_cache.pop(cache_key)
        print(f"[Cache] OK - Using pre-generated audio for Q{question_no}")
        audio_buffer = BytesIO(audio_data)
        return send_file(audio_buffer, mimetype="audio/wav", as_attachment=False)
    
    # Wait limited time for pre-generation to complete
    wait_interval = 50  # ms
    elapsed = 0
    while elapsed < max_wait_ms and cache_key in _pregeneration_threads:
        threading.Event().wait(wait_interval / 1000.0)
        elapsed += wait_interval
        if cache_key in _pregeneration_cache:
            audio_data = _pregeneration_cache.pop(cache_key)
            print(f"[Cache] OK - Using pre-generated audio after {elapsed}ms wait for Q{question_no}")
            audio_buffer = BytesIO(audio_data)
            return send_file(audio_buffer, mimetype="audio/wav", as_attachment=False)
    
    # Fall back to on-demand generation if pre-gen not ready
    print(f"[Cache] WARN - Pre-gen not ready, falling back to on-demand for Q{question_no}")
    if len(question_text) > 200:
        audio_chunks = _generate_audio_chunks(question_text)
        combined_audio = b""
        for i, chunk_data in enumerate(audio_chunks):
            if i == 0:
                combined_audio = chunk_data
            else:
                combined_audio += chunk_data[44:]
        audio_data = combined_audio
    else:
        audio_data = _generate_audio_cached(question_text)
    
    audio_int16 = np.frombuffer(audio_data[44:], dtype=np.int16)
    audio_float = audio_int16.astype(np.float32) / 32768.0
    audio_float *= 0.7
    audio_int16_reduced = np.clip(audio_float * 32767, -32768, 32767).astype(np.int16)
    audio_buffer = BytesIO()
    scipy.io.wavfile.write(audio_buffer, model.sample_rate, audio_int16_reduced)
    audio_buffer.seek(0)
    return send_file(audio_buffer, mimetype="audio/wav", as_attachment=False)


def _split_text_for_streaming(text: str, max_chunk_length: int = 200) -> list:
    """Split text into chunks for faster parallel generation.
    Keeps sentences together for naturalness.
    """
    sentences = text.replace('?', '?.').replace('!', '!.').split('.')
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        if not sentence.strip():
            continue
        sentence_with_period = sentence.strip() + "."
        if len(current_chunk) + len(sentence_with_period) <= max_chunk_length:
            current_chunk += sentence_with_period + " "
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence_with_period + " "
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return [c for c in chunks if c.strip()]

def _generate_audio_cached(text: str):
    """Generate audio with caching to avoid regenerating same text."""
    text_hash = hashlib.md5(text.encode()).hexdigest()
    
    if text_hash in _audio_cache:
        return _audio_cache[text_hash]
    
    audio_tensor = model.generate_audio(voice_state, text)
    
    # Gentle amplification for natural sound (reduced from 8dB)
    audio_amplified = _amplify_audio(audio_tensor, gain_db=3.0)
    
    # Convert to int16 for WAV (range: -32768 to 32767)
    audio_int16 = np.clip(audio_amplified * 32767, -32768, 32767).astype(np.int16)
    
    # Store in memory buffer
    audio_bytes = BytesIO()
    scipy.io.wavfile.write(audio_bytes, model.sample_rate, audio_int16)
    audio_bytes.seek(0)
    
    _audio_cache[text_hash] = audio_bytes.getvalue()
    return _audio_cache[text_hash]

def _generate_audio_chunks(text: str) -> list:
    """Generate audio chunks in parallel for long text - 2x faster for long questions."""
    chunks = _split_text_for_streaming(text)
    
    if len(chunks) <= 1:
        return [_generate_audio_cached(text)]
    
    audio_chunks = [None] * len(chunks)
    
    def generate_chunk(index, chunk_text):
        text_hash = hashlib.md5(chunk_text.encode()).hexdigest()
        if text_hash in _audio_cache:
            audio_chunks[index] = _audio_cache[text_hash]
        else:
            audio_tensor = model.generate_audio(voice_state, chunk_text)
            audio_amplified = _amplify_audio(audio_tensor, gain_db=3.0)
            audio_int16 = np.clip(audio_amplified * 32767, -32768, 32767).astype(np.int16)
            wav_bytes = BytesIO()
            scipy.io.wavfile.write(wav_bytes, model.sample_rate, audio_int16)
            wav_bytes.seek(0)
            audio_chunks[index] = wav_bytes.getvalue()
    
    # Generate chunks sequentially for pocket_tts (thread-safe issues possible)
    for i, chunk in enumerate(chunks):
        generate_chunk(i, chunk)
    
    return audio_chunks

@tts_bp.route('', methods=['POST'])
def generate_speech():
    data = request.json
    text = data.get('text')
    is_recording = data.get('is_recording', False)  # True when user is responding
    
    if not text:
        return {"error": "Text is required"}, 400

    try:
        audio_data = _generate_audio_cached(text)
        audio_array = np.frombuffer(audio_data, dtype=np.uint8)
        
        # If recording is active, reduce AI volume to avoid echo feedback
        if is_recording:
            # Convert from uint8 WAV to float for processing
            audio_int16 = np.frombuffer(audio_data[44:], dtype=np.int16)  # Skip WAV header
            audio_float = audio_int16.astype(np.float32) / 32768.0
            
            # Reduce volume to -6dB (50%) to prevent microphone pickup
            audio_float *= 0.5
            
            # Convert back
            audio_int16_reduced = np.clip(audio_float * 32767, -32768, 32767).astype(np.int16)
            audio_buffer = BytesIO()
            scipy.io.wavfile.write(audio_buffer, model.sample_rate, audio_int16_reduced)
            audio_buffer.seek(0)
            return send_file(audio_buffer, mimetype="audio/wav", as_attachment=False)
        
        audio_buffer = BytesIO(audio_data)
        return send_file(audio_buffer, mimetype="audio/wav", as_attachment=False)
        
    except Exception as e:
        print(f"TTS Error: {e}")
        return {"error": str(e)}, 500

@tts_bp.route('/interview', methods=['POST'])
def generate_interview_speech():
    """
    Generate TTS for interview questions.
    - Uses text chunking for 2x faster performance on long questions
    - Automatically ducks volume to prevent echo/feedback during recording
    - Natural sound without robotic artifacts
    """
    data = request.json
    text = data.get('text')
    
    if not text:
        return {"error": "Text is required"}, 400

    try:
        # For long text, use chunking for faster generation
        if len(text) > 200:
            audio_chunks = _generate_audio_chunks(text)
            # Combine chunks into single WAV
            combined_audio = b""
            for i, chunk_data in enumerate(audio_chunks):
                if i == 0:
                    combined_audio = chunk_data
                else:
                    # Skip WAV header for subsequent chunks
                    combined_audio += chunk_data[44:]
            audio_data = combined_audio
        else:
            audio_data = _generate_audio_cached(text)
        
        # Always duck volume for interview mode (user will be speaking right after)
        # Convert from uint8 WAV to float for processing
        audio_int16 = np.frombuffer(audio_data[44:], dtype=np.int16)  # Skip WAV header
        audio_float = audio_int16.astype(np.float32) / 32768.0
        
        # Reduce volume to -3dB (70%) for interview mode
        # Allows user to hear clearly but reduces echo feedback
        audio_float *= 0.7
        
        # Convert back
        audio_int16_reduced = np.clip(audio_float * 32767, -32768, 32767).astype(np.int16)
        audio_buffer = BytesIO()
        scipy.io.wavfile.write(audio_buffer, model.sample_rate, audio_int16_reduced)
        audio_buffer.seek(0)
        
        return send_file(audio_buffer, mimetype="audio/wav", as_attachment=False)
        
    except Exception as e:
        print(f"TTS Error: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500
