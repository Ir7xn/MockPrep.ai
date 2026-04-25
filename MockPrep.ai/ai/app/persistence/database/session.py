from sqlalchemy import create_engine, event, exc, text
from sqlalchemy.orm import sessionmaker, scoped_session

from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,  # Reduced for cloud pooler compatibility
    max_overflow=5,  # Reduced overflow for Neon
    pool_recycle=3600,  # Recycle connections every hour to prevent stale connections
    connect_args={
        "connect_timeout": 10,  # Wait up to 10 seconds to connect
    },
    echo=False,
)


# Event listener to log connection issues
@event.listens_for(engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    logger.info("Database connection established")


@event.listens_for(engine, "checkout")
def receive_pool_checkout(dbapi_conn, connection_record, connection_proxy):
    connection_record.info['checkout_time'] = __import__('time').time()


@event.listens_for(engine, "checkin")
def receive_pool_checkin(dbapi_conn, connection_record):
    checkout_time = connection_record.info.get('checkout_time')
    if checkout_time:
        duration = __import__('time').time() - checkout_time
        if duration > 5.0:
            logger.warning(f"Long database connection held for {duration:.2f}s")


SessionLocal = scoped_session(
    sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
    )
)


def get_db_session():
    """
    Returns a scoped SQLAlchemy session with proper error handling for cloud databases.
    """
    session = SessionLocal()
    try:
        # Test connection immediately
        session.execute(text("SELECT 1"))
    except exc.OperationalError as e:
        logger.error(f"Database connection failed: {e}")
        session.close()
        raise
    return session
