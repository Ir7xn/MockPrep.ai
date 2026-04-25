from flask import jsonify
from marshmallow import ValidationError as MarshmallowValidationError

from app.core.exceptions import BaseAppException
from app.core.logger import get_logger

logger = get_logger(__name__)


def register_error_handlers(app):
    @app.errorhandler(BaseAppException)
    def handle_app_exception(error: BaseAppException):
        logger.error(
            "Application error",
            extra={"error": str(error)},
        )
        return (
            jsonify(
                {
                    "error": error.message,
                    "status_code": error.status_code,
                }
            ),
            error.status_code,
        )

    @app.errorhandler(MarshmallowValidationError)
    def handle_marshmallow_error(error: MarshmallowValidationError):
        return (
            jsonify(
                {
                    "error": "Invalid request payload",
                    "details": error.messages,
                }
            ),
            400,
        )

    @app.errorhandler(Exception)
    def handle_unhandled_exception(error: Exception):
        import traceback
        traceback.print_exc()  # 👈 ADD THIS

        logger.exception("Unhandled exception")
        return (
            jsonify(
                {
                    "error": "Internal server error",
                    "detail": str(error),
                }
            ),
            500,
        )
