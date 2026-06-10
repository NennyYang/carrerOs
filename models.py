from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class JobSkill(Base):
    __tablename__ = "job_skills"
    __table_args__ = (
        UniqueConstraint("position_name", "normalized_name", name="uq_job_skill_position_name"),
    )

    id = Column(Integer, primary_key=True, index=True)
    position_name = Column(String(200), nullable=False, index=True)
    skill_name = Column(String(120), nullable=False)
    normalized_name = Column(String(120), nullable=False, index=True)
    category = Column(String(100), nullable=True)
    importance = Column(String(20), nullable=False, default="required")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ProjectCapabilityProfile(Base):
    __tablename__ = "project_capability_profiles"
    __table_args__ = (
        UniqueConstraint("user_id", "project_name", name="uq_user_project_capability"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    project_name = Column(String(200), nullable=False)
    technology_stack = Column(Text, nullable=False)
    problem = Column(Text, nullable=False)
    solution_and_validation = Column(Text, nullable=False)
    capability_tags = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ResumeVersion(Base):
    __tablename__ = "resume_versions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    version_no = Column(Integer, nullable=False)
    filename = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class ResumeAnalysisRecord(Base):
    __tablename__ = "resume_analysis_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    resume_version_id = Column(Integer, ForeignKey("resume_versions.id"), nullable=False, index=True)
    job_title = Column(String(200), nullable=False, default="目标岗位")
    job_description = Column(Text, nullable=False)
    resume_score = Column(Integer, nullable=False)
    match_score = Column(Integer, nullable=False)
    dimension_scores = Column(JSON, nullable=False, default=list)
    resume_suggestions = Column(JSON, nullable=False, default=list)
    match_highlights = Column(JSON, nullable=False, default=list)
    match_gaps = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class ResumeDimensionScoreRecord(Base):
    __tablename__ = "resume_dimension_score_records"
    __table_args__ = (
        UniqueConstraint("resume_version_id", name="uq_resume_dimension_score_version"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    resume_version_id = Column(Integer, ForeignKey("resume_versions.id"), nullable=False, index=True)
    resume_score = Column(Integer, nullable=False)
    dimension_scores = Column(JSON, nullable=False, default=list)
    model = Column(String(200), nullable=False, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ProjectDimensionScoreRecord(Base):
    __tablename__ = "project_dimension_score_records"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, nullable=True, index=True)
    project_name = Column(String(200), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    technology_stack = Column(Text, nullable=False)
    problem = Column(Text, nullable=False)
    solution_and_validation = Column(Text, nullable=False)
    dimension_scores = Column(JSON, nullable=False, default=list)
    model = Column(String(200), nullable=False, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class LearningBacklog(Base):
    __tablename__ = "learning_backlog"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    note = Column(Text, nullable=True)
    tags = Column(JSON, nullable=True)
    priority = Column(String(20), nullable=False, default="medium")
    completed = Column(Boolean, nullable=False, default=False)
    added_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class AICardFavorite(Base):
    __tablename__ = "ai_card_favorites"
    __table_args__ = (
        UniqueConstraint("user_id", "card_id", name="uq_user_ai_card_favorite"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    card_id = Column(String(120), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    search_name = Column(String(200), nullable=False)
    source = Column(String(120), nullable=True)
    real_summary = Column(Text, nullable=True)
    one = Column(Text, nullable=True)
    for_who = Column(Text, nullable=True)
    why = Column(Text, nullable=True)
    heat = Column(String(120), nullable=True)
    take = Column(Text, nullable=True)
    raw_payload = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
