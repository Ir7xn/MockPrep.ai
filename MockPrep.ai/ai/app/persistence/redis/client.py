import redis

from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

_redis_client = None


def get_redis_client() -> redis.Redis:
    """
    Returns a singleton Redis client.
    """
    global _redis_client

    if _redis_client is None:
        if not settings.REDIS_URL:
            raise RuntimeError("REDIS_URL is not configured")

        _redis_client = redis.Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_timeout=5,
            socket_connect_timeout=5,
            retry_on_timeout=True,
        )

        logger.info("Redis client initialized")

    return _redis_client
