from flask import Blueprint, request, jsonify

from app.core.logger import get_logger
from app.api.schemas.interview_schema import (
    StartInterviewSchema,
    HandleInterviewSchema,
)
from app.services.interview_service import InterviewService
from app.persistence.redis.interview_session import InterviewSessionStore
from app.core.exceptions import CustomException

logger = get_logger(__name__)

from flask import Blueprint, request, jsonify
import sys

from app.services.interview_service import InterviewService
from app.api.schemas.interview_schema import StartInterviewSchema
from app.api.dependencies import require_api_key
from app.services.report_service import ReportService
import json

interview_bp = Blueprint("interviews", __name__, url_prefix="/api/interviews")

@interview_bp.route("/start", methods=["POST"])
def start_interview():
    require_api_key()

    payload = request.get_json()
    data = StartInterviewSchema().load(payload)

    service = InterviewService()
    
    result = service.start_interview_session(data)

    return jsonify(
        {
            "interview_id": result["interview_id"],
            "question": result["question"],
            "question_index": result["question_no"],
            "total_questions": result["total_questions"],
        }
    ), 201


def _pregenerate_question_safe(interview_id, question_no):
    """Helper to safely pre-generate questions in background"""
    try:
        from app.persistence.redis.interview_session import InterviewSessionStore
        import requests
        
        session_store = InterviewSessionStore()
        session = session_store.get_session(interview_id)
        if not session or not session.get("questions", {}).get(str(question_no)):
            # Question not yet generated, skip
            return
        
        question_text = session["questions"][str(question_no)]
        # Trigger pre-generation
        import os
        flask_api = os.getenv("FLASK_API_BASE_URL", "http://localhost:5000")
        requests.post(
            f"{flask_api}/api/tts/pregenerate",
            json={
                "interview_id": interview_id,
                "text": question_text,
                "question_no": question_no
            },
            headers={"X-API-KEY": os.getenv("FLASK_API_KEY", "test-key")},
            timeout=5
        )
    except Exception as e:
        logger.warning(f"Pre-generation failed for Q{question_no}: {e}")


@interview_bp.route("/handle", methods=["POST"])
def submit_answer():
    try:
        data = HandleInterviewSchema().load(request.json)

        service = InterviewService()
        
        response = service.handle_interview_session(data)

        if response.get("stop"):
            session_store = InterviewSessionStore()
            session=session_store.get_session(data["interview_id"])
            if session:
                report_service=ReportService()
                report_service.create_report(session)
            return jsonify({
                "message": "Interview Finished!.Thank you for joining",
                "stop":True
            })

        return jsonify(response)

    except Exception as e:
        raise CustomException(e,sys) 

