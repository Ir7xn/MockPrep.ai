import os
import tempfile
import time
from collections import Counter
from threading import Lock
from typing import Dict, Tuple

from app.core.exceptions import NotFoundError
from app.core.logger import get_logger
from app.persistence.redis.interview_session import InterviewSessionStore

logger = get_logger(__name__)

MIN_ANALYSIS_INTERVAL_SECONDS = 12
VERIFY_EVERY_NTH_FRAME = 3


class FaceAnalysisService:
    def __init__(self):
        self._sessions: Dict[str, Dict[str, list]] = {}
        self._lock = Lock()
        self._deepface = None
        self._session_store = InterviewSessionStore()

    def _get_deepface(self):
        if self._deepface is not None:
            return self._deepface

        from deepface import DeepFace

        self._deepface = DeepFace
        return self._deepface

    def _default_session(self, reference_image_path: str = None) -> Dict:
        return {
            "face_scores": [],
            "emotions": [],
            "reference_image": reference_image_path,
            "has_reference_image": bool(reference_image_path),
            "verified_frames": 0,
            "total_frames": 0,
            "analysis_attempts": 0,
            "last_analysis_at": 0.0,
            "last_result": None,
            "terminated": False,
        }

    def _load_persisted_session(self, interview_id: str) -> Dict | None:
        try:
            interview_session = self._session_store.get_session(interview_id)
        except NotFoundError:
            return None

        runtime = interview_session.get("face_analysis_runtime")
        return runtime if isinstance(runtime, dict) else None

    def _persist_session(self, interview_id: str, runtime: Dict) -> None:
        try:
            interview_session = self._session_store.get_session(interview_id)
        except NotFoundError:
            logger.warning(f"Interview session not found while persisting face analysis: {interview_id}")
            return

        interview_session["face_analysis_runtime"] = runtime
        self._session_store.update_session(interview_id, interview_session)

    def start_session(self, interview_id: str, reference_image_path: str = None) -> None:
        runtime = self._default_session(reference_image_path)
        with self._lock:
            self._sessions[interview_id] = runtime
        self._persist_session(interview_id, runtime)

    def analyze_frame(self, interview_id: str, image_file) -> Dict:
        if not interview_id:
            raise ValueError("interview_id is required")

        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            image_path = temp_file.name
            image_file.save(image_path)

        try:
            with self._lock:
                session = self._sessions.get(interview_id) or self._load_persisted_session(interview_id) or self._default_session()
                self._sessions[interview_id] = session
                now = time.monotonic()
                if now - float(session.get("last_analysis_at", 0.0)) < MIN_ANALYSIS_INTERVAL_SECONDS:
                    return session.get("last_result") or {
                        "score": None,
                        "emotion": None,
                        "verified": None,
                        "distance": None,
                        "throttled": True,
                        "terminated": session.get("terminated", False),
                    }
                session["last_analysis_at"] = now
                session["analysis_attempts"] = int(session.get("analysis_attempts", 0)) + 1
                self._persist_session(interview_id, session)

            score, emotion = self._analyze_face_frame(image_path)

            with self._lock:
                session = self._sessions.get(interview_id) or self._load_persisted_session(interview_id) or self._default_session()
                self._sessions[interview_id] = session
                session["face_scores"].append(score)
                session["emotions"].append(emotion)
                session["total_frames"] += 1

                # Verification if reference image exists
                verified = True
                distance = None
                should_verify = session["total_frames"] % VERIFY_EVERY_NTH_FRAME == 0
                if session.get("reference_image") and should_verify:
                    try:
                        deepface = self._get_deepface()
                        result = deepface.verify(
                            img1_path=session["reference_image"],
                            img2_path=image_path,
                            enforce_detection=False
                        )
                        verified = result["verified"]
                        distance = result["distance"]
                        if verified:
                            session["verified_frames"] += 1
                        else:
                            session["terminated"] = True
                    except Exception as e:
                        logger.warning(f"Face verification failed: {e}")
                        verified = False
                elif not session.get("reference_image"):
                    session["verified_frames"] += 1

            result_payload = {
                "score": score,
                "emotion": emotion,
                "verified": verified,
                "distance": distance,
                "throttled": False,
                "terminated": session.get("terminated", False),
            }
            session["last_result"] = result_payload
            self._persist_session(interview_id, session)
            return result_payload
        finally:
            try:
                os.unlink(image_path)
            except OSError:
                pass

    def end_session(self, interview_id: str) -> Dict:
        with self._lock:
            session = self._sessions.pop(interview_id, None)

        if session is None:
            session = self._load_persisted_session(interview_id)

        if session is None:
            session = self._default_session()

        scores = session["face_scores"]
        emotions = session["emotions"]
        confidence_score = round(sum(scores) / len(scores), 2) if scores else 5
        dominant_emotion = Counter(emotions).most_common(1)[0][0] if emotions else "unknown"
        has_reference_image = bool(session.get("has_reference_image"))
        total_frames = session["total_frames"]

        if not total_frames:
            return {
                "confidence_score": confidence_score,
                "dominant_emotion": dominant_emotion,
                "last_emotion": emotions[-1] if emotions else None,
                "frame_count": 0,
                "total_frames": 0,
                "verified_frames": 0,
                "behavior": "No face-analysis frames were captured.",
                "behavior_assessment": "No face-analysis frames were captured for this interview.",
                "verification_rate": None,
                "verification_status": "not_available",
                "terminated": session.get("terminated", False),
            }

        verification_rate = (
            (session["verified_frames"] / total_frames) * 100
        )

        verification_status = "verified" if verification_rate > 60 else "suspicious"
        if not has_reference_image:
            verification_status = "verified"

        return {
            "confidence_score": confidence_score,
            "dominant_emotion": dominant_emotion,
            "last_emotion": emotions[-1] if emotions else None,
            "frame_count": len(scores),
            "total_frames": total_frames,
            "verified_frames": session["verified_frames"],
            "behavior": "Confident" if confidence_score > 5 else "Needs Improvement",
            "behavior_assessment": (
                "Face verification used the candidate camera feed and remained consistent."
                if verification_status == "verified"
                else "Face verification dropped below the safe threshold and should be reviewed."
            ),
            "verification_rate": round(verification_rate, 2),
            "verification_status": verification_status,
            "terminated": session.get("terminated", False),
        }

    def _analyze_face_frame(self, image_path: str) -> Tuple[int, str]:
        try:
            deepface = self._get_deepface()
            result = deepface.analyze(
                image_path,
                actions=["emotion"],
                enforce_detection=False,
            )
            first_result = result[0] if isinstance(result, list) else result
            emotion = first_result.get("dominant_emotion", "unknown")

            score_map = {
                "happy": 8,
                "neutral": 6,
                "surprise": 7,
                "fear": 4,
                "sad": 3,
                "angry": 2,
                "disgust": 2,
            }

            return score_map.get(emotion, 5), emotion
        except Exception:
            return 5, "unknown"


face_analysis_service = FaceAnalysisService()
