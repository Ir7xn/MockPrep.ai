import uuid
import os
import tempfile
from datetime import datetime
from sqlalchemy import func

from app.persistence.database.session import get_db_session
from app.persistence.database.models.user_model import UserModel
from app.persistence.database.models.resume_model import Resume
from app.core.exceptions import ValidationError, NotFoundError
from app.core.logger import get_logger

import pdfplumber
from docx import Document
import fitz  # PyMuPDF for PDF image extraction
import os
from pathlib import Path

logger = get_logger(__name__)



class ResumeService:

    def create_resume_from_file(self, file, name: str, email: str) -> dict:
        # Extract text BEFORE opening database session to prevent long-held connections
        extracted_text = self._extract_text(file)

        if not extracted_text.strip():
            raise ValidationError("Unable to extract text from resume")

        resume_id = str(uuid.uuid4())

        # Extract face image if PDF
        face_image_path = None
        if file.filename.lower().endswith('.pdf'):
            # Save file temporarily for image extraction
            temp_path = os.path.join(tempfile.gettempdir(), f"{resume_id}.pdf")
            file.seek(0)
            with open(temp_path, 'wb') as f:
                f.write(file.read())
            face_image_path = self._extract_image_from_pdf(temp_path, resume_id)
            os.remove(temp_path)
            file.seek(0)  # Reset file pointer

        try:
            db = get_db_session()
            
            user_exist = db.query(UserModel).filter(func.lower(UserModel.email) == email.lower()).first()

            if user_exist:
                candidate_id = user_exist.id
                # Keep user profile aligned with latest submitted name.
                if name and user_exist.name != name:
                    user_exist.name = name
            else:
                candidate_id = str(uuid.uuid4())
                user = UserModel(
                    id=candidate_id,
                    name=name,
                    email=email.lower(),
                )
                db.add(user)
                db.flush()

            resume = Resume(
                id=resume_id,
                candidate_id=candidate_id,
                filename=file.filename,
                extracted_text=extracted_text,
                face_image_path=face_image_path,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(resume)
            db.commit()
        except Exception as e:
            #Ensure session is closed even on error
            if 'db' in locals():
                db.close()
            raise
        finally:
            if 'db' in locals():
                db.close()

        return {
            "candidate_id": candidate_id,
            "resume_id": resume_id,
        }

    def _extract_text(self, file) -> str:
        filename = file.filename.lower()

        if filename.endswith(".pdf"):
            return self._extract_pdf(file)

        if filename.endswith(".docx"):
            return self._extract_docx(file)

        raise ValidationError("Unsupported resume format")

    def _extract_pdf(self, file) -> str:
        logger.info(f"Extracting PDF: {file.filename}")
        text = []
        try:
            with pdfplumber.open(file) as pdf:
                logger.info(f"PDF has {len(pdf.pages)} pages")
                for i, page in enumerate(pdf.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text.append(page_text)
                    logger.debug(f"Extracted page {i+1}/{len(pdf.pages)}")
        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            raise ValidationError(f"Failed to extract PDF: {str(e)}")
        logger.info("PDF extraction completed")
        return "\n".join(text)

    def _extract_docx(self, file) -> str:
        doc = Document(file)
        return "\n".join(p.text for p in doc.paragraphs)

    def _extract_image_from_pdf(self, file_path: str, resume_id: str) -> str:
        """Extract face image from PDF resume"""
        try:
            doc = fitz.open(file_path)
            
            for page_index in range(len(doc)):
                page = doc[page_index]
                images = page.get_images(full=True)
                
                for img in images:
                    xref = img[0]
                    base = doc.extract_image(xref)
                    image_bytes = base["image"]
                    
                    # Save image
                    uploads_dir = Path("uploads")
                    uploads_dir.mkdir(exist_ok=True)
                    img_path = uploads_dir / f"{resume_id}_face.jpg"
                    with open(img_path, "wb") as f:
                        f.write(image_bytes)
                    
                    return str(img_path)
            
            return None
        except Exception as e:
            logger.warning(f"Image extraction failed: {e}")
            return None

    def get_resume_text(self, resume_id: str) -> str:
        db = get_db_session()
        try:
            resume = db.query(Resume).filter(Resume.id == resume_id).first()

            if not resume:
                raise NotFoundError("Resume not found")

            if not resume.extracted_text:
                raise ValidationError("Resume text not available")

            return resume.extracted_text
        finally:
            db.close()

    def get_resume_face_image(self, resume_id: str) -> str:
        db = get_db_session()
        try:
            resume = db.query(Resume).filter(Resume.id == resume_id).first()

            if not resume:
                raise NotFoundError("Resume not found")

            return resume.face_image_path
        finally:
            db.close()
