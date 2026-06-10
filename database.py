import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("PGSQL_DSN", "postgresql://nennny:123456@localhost:5432/career_os")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from models import (
        AICardFavorite,
        JobSkill,
        LearningBacklog,
        ProjectCapabilityProfile,
        ProjectDimensionScoreRecord,
        ResumeAnalysisRecord,
        ResumeDimensionScoreRecord,
        ResumeVersion,
        User,
    )
    Base.metadata.create_all(bind=engine)
