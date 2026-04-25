from typing import Dict

from app.core.logger import get_logger
from app.core.exceptions import ApplicationError, NotFoundError
from app.services.scoring_service import ScoringService
from app.persistence.database.session import get_db_session
from app.persistence.database.models.report_model import ReportModel
import json
import re
from app.utils.json import to_dict, safe_json_loads

logger = get_logger(__name__)


class ReportService:
    def __init__(self):
        self.scoring_service = ScoringService()

    def create_report(self, interview_session: Dict) -> None:
        db = get_db_session()

        try:
            scored = self.scoring_service.score_interview(interview_session)
            campaign_id = interview_session.get("campaign_id")
            if not campaign_id or campaign_id == "None":
                import uuid
                campaign_id = str(uuid.uuid4())
                logger.warning("Interview session is missing campaign_id, using fallback UUID.")

            report = ReportModel(
                interview_id=interview_session["interview_id"],
                candidate_id=interview_session["candidate_id"],
                campaign_id=campaign_id,
                role=interview_session["role"],
                report_data=scored,
            )

            db.add(report)
            db.commit()

            logger.info(
                "Interview report stored",
                extra={"interview_id": interview_session["interview_id"]},
            )
        finally:
            db.close()

    def get_report(self, interview_id) -> Dict:
        db = get_db_session()

        try:
            report = db.query(ReportModel).filter(ReportModel.interview_id == interview_id).first()
            if not report:
                raise NotFoundError("Report not found")

            parsed_report = to_dict(report)
            raw_report_data = parsed_report["report_data"]

            if isinstance(raw_report_data, dict):
                return raw_report_data

            parsed_json_report = str(raw_report_data).strip("` \n")
            parsed_json_report = re.sub(r"^```json\s*", "", parsed_json_report, flags=re.IGNORECASE)
            parsed_json_report = re.sub(r"^```\s*", "", parsed_json_report, flags=re.IGNORECASE)
            parsed_json_report = re.sub(
                r"\s*```$", "", parsed_json_report, flags=re.IGNORECASE
            ).strip()

            start = parsed_json_report.find("{")
            end = parsed_json_report.rfind("}")
            if start != -1 and end != -1 and end > start:
                parsed_json_report = parsed_json_report[start : end + 1].strip()

            try:
                data = safe_json_loads(parsed_json_report)
                return data
            except Exception as e:
                logger.exception(
                    "Json loading error",
                    extra={"error": str(e)},
                )
            return parsed_json_report
        finally:
            db.close()
