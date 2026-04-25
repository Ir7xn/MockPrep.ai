from flask import Blueprint, jsonify, request

from app.api.dependencies import require_api_key
from app.services.face_analysis_service import face_analysis_service

face_analysis_bp = Blueprint(
    "face_analysis_routes",
    __name__,
    url_prefix="/api/face-analysis",
)


@face_analysis_bp.route("/start", methods=["POST"])
def start_face_analysis():
    require_api_key()

    payload = request.get_json(silent=True) or {}
    interview_id = payload.get("interview_id")
    if not interview_id:
        return jsonify({"error": "interview_id is required"}), 400

    face_analysis_service.start_session(interview_id)
    return jsonify({"message": "Face analysis started"}), 200


@face_analysis_bp.route("/frame", methods=["POST"])
def analyze_face_frame():
    require_api_key()

    interview_id = request.form.get("interview_id")
    image = request.files.get("image")
    if not interview_id:
        return jsonify({"error": "interview_id is required"}), 400
    if not image:
        return jsonify({"error": "image is required"}), 400

    result = face_analysis_service.analyze_frame(interview_id, image)
    return jsonify(result), 200


@face_analysis_bp.route("/end", methods=["POST"])
def end_face_analysis():
    require_api_key()

    payload = request.get_json(silent=True) or {}
    interview_id = payload.get("interview_id")
    if not interview_id:
        return jsonify({"error": "interview_id is required"}), 400

    result = face_analysis_service.end_session(interview_id)
    return jsonify(result), 200
