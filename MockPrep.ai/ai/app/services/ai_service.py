# app/services/ai_service.py

import os
import json
from groq import Groq
from app.llm.prompts import SYSTEM_QUESTION_TEMPLATE, HUMAN_QUESTION_TEMPLATE
from app.core.logger import get_logger
from app.core.config import settings

logger = get_logger(__name__)

class AIService:
    def __init__(self):
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.model = getattr(settings, "GROQ_MODEL", "llama-3.1-8b-instant")
        self.temperature = getattr(settings, "GROQ_TEMPERATURE", 0.5)

    def generate_next_dynamic_question(self, role, resume_text, previous_interactions, level):
        logger.info(f"Dynamic Question layer is running. Level: {level}")

        # Normalize level
        level = level.lower()

        # Apply language rules based on candidate level
        if level == "beginner":
            language_rule = "Use VERY SIMPLE language, avoid complex technical jargon. Keep it easy to understand."
        elif level == "intermediate":
            language_rule = "Use simple and clear English, focus on practical coding applications."
        else:
            language_rule = "Use professional and technical language. Focus on system design and deep concepts."

        # Combine the system template with your dynamic level rules
        system_prompt = SYSTEM_QUESTION_TEMPLATE + f"\n\n# LEVEL-SPECIFIC RULES:\n- Candidate Level: {level}\n- {language_rule}"

        # Format the human prompt with current interview context
        human_prompt = HUMAN_QUESTION_TEMPLATE.format(
            role=role,
            previous_interactions=previous_interactions,
            resume_text=resume_text
        )

        try:
            # Call Groq API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": human_prompt}
                ],
                temperature=self.temperature,
                response_format={"type": "json_object"} # Forces strictly JSON output
            )

            output = response.choices[0].message.content
            logger.info("Generated dynamic question payload", extra={"payload": output})
            return json.loads(output)
        except json.JSONDecodeError as e:
            logger.error("Failed to parse JSON from Groq LLM.", extra={"error": str(e), "output": locals().get("output")})
            return {"question": "Could you elaborate more on your previous experience?"}
        except Exception as e:
            logger.exception("An unexpected error occurred during question generation.", extra={"error": str(e)})
            return {"question": "Let's switch gears. What are your long-term career goals?"}

ai_service = AIService()
