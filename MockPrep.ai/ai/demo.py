import os
import time
import scipy.io.wavfile
from pocket_tts import TTSModel
import torch
import numpy as np

# Configuration
VOICE_FILE = r"D:\temp-interview-ai\Interview-ai\ai\WhatsApp Ptt 2026-04-13 at 19.39.06.wav"
QUESTIONS = [
    "Welcome! To start, could you tell me a bit about yourself?",
    "That is interesting. What would you say is your greatest technical strength?",
    "Can you describe a challenging bug you faced and how you solved it?",
    "Why do you want to work with us specifically?",
    "Finally, where do you see your career heading in the next three years?"
]

def run_interview():
    print("--- 🤖 AI Interview Session (Volume Boosted) ---")
    
    print("Loading Model...")
    model = TTSModel.load_model()
    
    if not os.path.exists(VOICE_FILE):
        print(f"Error: Voice file not found at {VOICE_FILE}")
        return
    voice_state = model.get_state_for_audio_prompt(VOICE_FILE)

    print("Warming up engine...")
    model.generate_audio(voice_state, "Warmup.") 
    
    print("System Ready.\n")

    for i, question in enumerate(QUESTIONS):
        # Using 'So, ' to stabilize the initial robotic tone
        text_to_gen = f"    , {question}"
        print(f"\n[Interviewer]: {question}")
        
        # 1. Generate audio
        audio_tensor = model.generate_audio(voice_state, text_to_gen)
        
        # 2. VOLUME BOOST (Normalization)
        # We find the peak volume and scale the whole clip to 1.0 (max)
        peak = torch.abs(audio_tensor).max()
        if peak > 0:
            audio_tensor = audio_tensor / peak
        
        # 3. Save as 16-bit PCM (Standard for 'aplay')
        temp_file = f"q{i}.wav"
        # Convert to numpy for scipy saving
        audio_data = audio_tensor.numpy()
        scipy.io.wavfile.write(temp_file, model.sample_rate, audio_data)
        
        # 4. Play via aplay
        os.system(f"aplay {temp_file} > /dev/null 2>&1")
        
        answer = input("\n[Your Answer]: ")

    print("\n--- Interview Complete ---")

if __name__ == "__main__":
    run_interview()