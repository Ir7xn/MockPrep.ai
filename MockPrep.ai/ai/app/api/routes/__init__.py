from flask import Blueprint

from app.api.routes.resume_routes import resume_bp
from app.api.routes.interview_routes import interview_bp
from app.api.routes.report_routes import report_bp
from app.api.routes.face_analysis_routes import face_analysis_bp
from app.api.routes.tts_routes import tts_bp


def register_routes(app):
    app.register_blueprint(resume_bp, url_prefix="/api/resumes")
    app.register_blueprint(interview_bp, url_prefix="/api/interviews")
    app.register_blueprint(report_bp, url_prefix="/api/reports")
    app.register_blueprint(face_analysis_bp, url_prefix="/api/face-analysis")
    app.register_blueprint(tts_bp)

