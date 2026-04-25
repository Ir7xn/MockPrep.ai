from flask import Blueprint, request, jsonify

from app.api.schemas.resume_schema import ResumeUploadSchema
from app.api.dependencies import require_api_key
from app.services.resume_service import ResumeService

resume_bp = Blueprint("resumes", __name__, url_prefix="/api/resumes")


@resume_bp.route("/upload", methods=["POST"])
def upload_resume():
    require_api_key()

    data = {
        "file": request.files.get("file"),
        "name": request.form.get("name") or request.form.get("username"),
        "email": request.form.get("email"),
    }

    validated = ResumeUploadSchema().load(data)

    service = ResumeService()
    result = service.create_resume_from_file(
        file=validated["file"],
        name=validated["name"],
        email=validated["email"],
    )

    return jsonify(result), 201
