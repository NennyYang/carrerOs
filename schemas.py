from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import List, Optional

class UserRegister(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=50)

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=50)

class UserResponse(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    success: bool
    message: str
    user: Optional[UserResponse] = None


class JobSkillCreate(BaseModel):
    position_name: str = Field(min_length=1, max_length=200)
    skill_name: str = Field(min_length=1, max_length=120)
    category: Optional[str] = Field(default=None, max_length=100)
    importance: str = Field(default="required", pattern="^(required|preferred|bonus)$")
    description: Optional[str] = None


class JobSkillResponse(BaseModel):
    id: int
    position_name: str
    skill_name: str
    category: Optional[str]
    importance: str
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ProjectCapabilityProfileUpsert(BaseModel):
    user_id: int
    project_name: str = Field(min_length=1, max_length=200)
    technology_stack: str = Field(min_length=1)
    problem: str = Field(min_length=1)
    solution_and_validation: str = Field(min_length=1)
    capability_tags: list[str] = Field(default_factory=list)


class ProjectCapabilityProfileResponse(BaseModel):
    id: int
    user_id: int
    project_name: str
    technology_stack: str
    problem: str
    solution_and_validation: str
    capability_tags: list[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectAnalysisRequest(BaseModel):
    user_id: int
    project_name: str = Field(min_length=1, max_length=200)
    technology_stack: str = Field(min_length=1)
    problem: str = Field(min_length=1)
    solution_and_validation: str = Field(min_length=1)


class ProjectAnalysisResponse(BaseModel):
    python_networking_score: float = Field(default=0.0)
    python_networking_reason: str = Field(default="")
    llm_prompt_engineering_score: float = Field(default=0.0)
    llm_prompt_engineering_reason: str = Field(default="")
    rag_score: float = Field(default=0.0)
    rag_reason: str = Field(default="")
    ai_frameworks_score: float = Field(default=0.0)
    ai_frameworks_reason: str = Field(default="")
    backend_data_storage_score: float = Field(default=0.0)
    backend_data_storage_reason: str = Field(default="")
    deployment_finetuning_score: float = Field(default=0.0)
    deployment_finetuning_reason: str = Field(default="")
    engineering_ops_score: float = Field(default=0.0)
    engineering_ops_reason: str = Field(default="")
    model: str = Field(default="")
    project_name: str = Field(default="")


class LearningSuggestion(BaseModel):
    title: str
    description: str
    priority: str = Field(pattern="^(high|medium|low)$")


class LearningSuggestionRequest(BaseModel):
    work_content: str = Field(min_length=1, max_length=8000)


class LearningSuggestionResponse(BaseModel):
    suggestions: list[LearningSuggestion] = Field(default_factory=list)
    model: str = Field(default="")


class CapabilityMatch(BaseModel):
    name: str
    capability_id: str = ""
    level: str
    evidence: str
    score_delta: int = 0


class ResumeVersionCreate(BaseModel):
    user_id: int
    filename: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1)


class ResumeVersionResponse(BaseModel):
    id: int
    user_id: int
    version_no: int
    filename: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ScoreDimension(BaseModel):
    name: str
    score: int
    suggestion: str


class ResumeMatchAnalysisCreate(BaseModel):
    user_id: int
    resume_version_id: int
    job_title: str = Field(default="目标岗位", max_length=200)
    job_description: str = Field(min_length=1)


class ResumeMatchAnalysisResponse(BaseModel):
    id: int
    user_id: int
    resume_version_id: int
    job_title: str
    job_description: str
    resume_score: int
    match_score: int
    dimension_scores: list[ScoreDimension]
    resume_suggestions: list[str]
    match_highlights: list[str]
    match_gaps: list[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ResumeAnalysisRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1)


class ResumeAnalysisResponse(BaseModel):
    summary: str
    matched_capabilities: list[CapabilityMatch] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    model: str


class ResumeDimensionsResponse(BaseModel):
    python_networking_score: float = Field(default=0.0)
    python_networking_reason: str = Field(default="")
    llm_prompt_engineering_score: float = Field(default=0.0)
    llm_prompt_engineering_reason: str = Field(default="")
    rag_score: float = Field(default=0.0)
    rag_reason: str = Field(default="")
    ai_frameworks_score: float = Field(default=0.0)
    ai_frameworks_reason: str = Field(default="")
    backend_data_storage_score: float = Field(default=0.0)
    backend_data_storage_reason: str = Field(default="")
    deployment_finetuning_score: float = Field(default=0.0)
    deployment_finetuning_reason: str = Field(default="")
    engineering_ops_score: float = Field(default=0.0)
    engineering_ops_reason: str = Field(default="")
    model: str = Field(default="")
    filename: str = Field(default="")


class ResumeDimensionsRequest(BaseModel):
    user_id: int
    resume_version_id: int


class ResumeDimensionScoreRecordResponse(BaseModel):
    id: int
    user_id: int
    resume_version_id: int
    resume_score: int
    dimension_scores: list[ScoreDimension]
    model: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectDimensionScoreRecordResponse(BaseModel):
    id: int
    project_id: int
    project_name: str
    user_id: int
    technology_stack: str
    problem: str
    solution_and_validation: str
    dimension_scores: list[ScoreDimension]
    model: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectDimensionScoreRequest(BaseModel):
    user_id: int
    project_id: int


class LearningBacklogCreate(BaseModel):
    user_id: int
    title: str = Field(min_length=1, max_length=500)
    added_at: Optional[datetime] = None


class LearningBacklogBatchCreate(BaseModel):
    user_id: int
    titles: list[str] = Field(min_length=1, max_length=200)
    added_at: Optional[datetime] = None


class LearningBacklogOwnerRequest(BaseModel):
    user_id: int


class LearningBacklogResponse(BaseModel):
    id: int
    user_id: int
    title: str
    note: Optional[str] = None
    tags: Optional[list[str]] = None
    priority: str = "medium"
    completed: bool
    added_at: datetime
    completed_at: Optional[datetime] = None
    updated_at: datetime

    class Config:
        from_attributes = True
