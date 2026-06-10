import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from llm_service import chat_with_careeros_agent, stream_careeros_agent
from models import (
    AICardFavorite,
    LearningBacklog,
    ProjectCapabilityProfile,
    ProjectDimensionScoreRecord,
    ResumeAnalysisRecord,
    ResumeDimensionScoreRecord,
    ResumeVersion,
    User,
)
from schemas import (
    AgentChatRequest,
    AgentChatResponse,
    AICardFavoriteCreate,
    AICardFavoriteResponse,
)


router = APIRouter(prefix="/api/agent", tags=["agent"])
logger = logging.getLogger("careeros.agent")


def ensure_user(user_id: int, db: Session) -> None:
    if not db.query(User.id).filter(User.id == user_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")


def start_of_today() -> datetime:
    now = datetime.now(timezone.utc)
    return datetime(now.year, now.month, now.day, tzinfo=timezone.utc)


CAPABILITY_ALIASES = {
    "Python编程与网络基础": ["Python编程与网络基础", "Python 编程与网络基础"],
    "大模型基础与Prompt工程": ["大模型基础与Prompt工程", "大模型基础与 Prompt 工程"],
    "RAG检索增强技术": ["RAG检索增强技术", "RAG 检索增强技术"],
    "AI框架、智能体与多模态集成": ["AI框架、智能体与多模态集成", "AI 框架、智能体与多模态集成"],
    "后端服务与数据存储": ["后端服务与数据存储", "后端服务与数据存储开发"],
    "模型部署、推理与微调": ["模型部署、推理与微调"],
    "工程运维与业务交付": ["工程运维与业务交付", "工程运维与业务落地优化"],
}


def normalize_name(value: str) -> str:
    return "".join(str(value or "").split())


def capability_matches(name: str, aliases: list[str]) -> bool:
    source = normalize_name(name)
    return any(source == normalize_name(alias) or normalize_name(alias) in source or source in normalize_name(alias) for alias in aliases)


def summarize_capabilities(project_records: list[ProjectDimensionScoreRecord], resume_records: list[ResumeDimensionScoreRecord]) -> str:
    lines = []
    latest_resume = resume_records[0] if resume_records else None
    for capability, aliases in CAPABILITY_ALIASES.items():
        project_score = 0.0
        project_count = 0
        for record in project_records:
            for dim in record.dimension_scores or []:
                if capability_matches(dim.get("name", ""), aliases):
                    project_score += float(dim.get("score") or 0)
                    project_count += 1
        resume_score = 0.0
        if latest_resume:
            for dim in latest_resume.dimension_scores or []:
                if capability_matches(dim.get("name", ""), aliases):
                    resume_score = float(dim.get("score") or 0)
                    break
        total = round(project_score + resume_score, 1)
        lines.append(
            f"{capability}: 项目累计 {round(project_score, 1)} 分/{project_count} 条项目证据，"
            f"最近简历 {round(resume_score, 1)} 分，合计参考 {total} 分"
        )
    return "；".join(lines)


def serialize_favorite(record: AICardFavorite) -> dict:
    return {
        "id": record.card_id,
        "name": record.name,
        "searchName": record.search_name,
        "source": record.source or "",
        "realSummary": record.real_summary or "",
        "one": record.one or "",
        "forWho": record.for_who or "",
        "why": record.why or "",
        "heat": record.heat or "",
        "take": record.take or "",
    }


def build_agent_context(user_id: int | None, db: Session) -> str:
    if not user_id:
        return "用户未登录或未提供 user_id，无法读取个人数据库上下文。"

    today = start_of_today()
    week_ago = today - timedelta(days=7)

    projects_today = (
        db.query(ProjectCapabilityProfile)
        .filter(ProjectCapabilityProfile.user_id == user_id, ProjectCapabilityProfile.created_at >= today)
        .order_by(ProjectCapabilityProfile.created_at.desc())
        .limit(8)
        .all()
    )
    project_scores_today = (
        db.query(ProjectDimensionScoreRecord)
        .filter(ProjectDimensionScoreRecord.user_id == user_id, ProjectDimensionScoreRecord.created_at >= today)
        .order_by(ProjectDimensionScoreRecord.created_at.desc())
        .limit(8)
        .all()
    )
    resumes_today = (
        db.query(ResumeVersion)
        .filter(ResumeVersion.user_id == user_id, ResumeVersion.created_at >= today)
        .order_by(ResumeVersion.created_at.desc())
        .limit(8)
        .all()
    )
    matches_today = (
        db.query(ResumeAnalysisRecord)
        .filter(ResumeAnalysisRecord.user_id == user_id, ResumeAnalysisRecord.created_at >= today)
        .order_by(ResumeAnalysisRecord.created_at.desc())
        .limit(8)
        .all()
    )
    resume_scores_today = (
        db.query(ResumeDimensionScoreRecord)
        .filter(ResumeDimensionScoreRecord.user_id == user_id, ResumeDimensionScoreRecord.created_at >= today)
        .order_by(ResumeDimensionScoreRecord.created_at.desc())
        .limit(8)
        .all()
    )
    recent_resume_scores = (
        db.query(ResumeDimensionScoreRecord)
        .filter(ResumeDimensionScoreRecord.user_id == user_id)
        .order_by(ResumeDimensionScoreRecord.updated_at.desc(), ResumeDimensionScoreRecord.created_at.desc())
        .limit(8)
        .all()
    )
    learning_added_today = (
        db.query(LearningBacklog)
        .filter(LearningBacklog.user_id == user_id, LearningBacklog.added_at >= today)
        .order_by(LearningBacklog.added_at.desc())
        .limit(8)
        .all()
    )
    learning_completed_today = (
        db.query(LearningBacklog)
        .filter(LearningBacklog.user_id == user_id, LearningBacklog.completed_at >= today)
        .order_by(LearningBacklog.completed_at.desc())
        .limit(8)
        .all()
    )
    favorites_today = (
        db.query(AICardFavorite)
        .filter(AICardFavorite.user_id == user_id, AICardFavorite.created_at >= today)
        .order_by(AICardFavorite.created_at.desc())
        .limit(8)
        .all()
    )
    favorites_week = (
        db.query(AICardFavorite)
        .filter(AICardFavorite.user_id == user_id, AICardFavorite.created_at >= week_ago)
        .order_by(AICardFavorite.created_at.desc())
        .limit(12)
        .all()
    )
    recent_projects = (
        db.query(ProjectCapabilityProfile)
        .filter(ProjectCapabilityProfile.user_id == user_id)
        .order_by(ProjectCapabilityProfile.updated_at.desc())
        .limit(10)
        .all()
    )
    all_project_scores = (
        db.query(ProjectDimensionScoreRecord)
        .filter(ProjectDimensionScoreRecord.user_id == user_id)
        .order_by(ProjectDimensionScoreRecord.created_at.desc())
        .all()
    )
    recent_resumes = (
        db.query(ResumeVersion)
        .filter(ResumeVersion.user_id == user_id)
        .order_by(ResumeVersion.created_at.desc())
        .limit(10)
        .all()
    )
    recent_matches = (
        db.query(ResumeAnalysisRecord)
        .filter(ResumeAnalysisRecord.user_id == user_id)
        .order_by(ResumeAnalysisRecord.created_at.desc())
        .limit(10)
        .all()
    )
    recent_learning = (
        db.query(LearningBacklog)
        .filter(LearningBacklog.user_id == user_id)
        .order_by(LearningBacklog.updated_at.desc())
        .limit(10)
        .all()
    )

    def names(items, attr):
        return "、".join(str(getattr(item, attr, "") or "") for item in items) or "无"

    resume_versions = {
        item.id: item
        for item in db.query(ResumeVersion)
        .filter(ResumeVersion.user_id == user_id)
        .order_by(ResumeVersion.created_at.desc())
        .limit(80)
        .all()
    }

    def resume_score_lines(items):
        lines = []
        for item in items:
            resume = resume_versions.get(item.resume_version_id)
            filename = resume.filename if resume else f"resume_version_id={item.resume_version_id}"
            lines.append(f"{filename}: 简历维度评分 {item.resume_score} 分")
        return "；".join(lines) or "无"

    def match_lines(items):
        lines = []
        for item in items:
            resume = resume_versions.get(item.resume_version_id)
            filename = resume.filename if resume else f"resume_version_id={item.resume_version_id}"
            lines.append(
                f"{filename} -> {item.job_title}: 简历质量 {item.resume_score} 分，JD匹配 {item.match_score} 分"
            )
        return "；".join(lines) or "无"

    return "\n".join(
        [
            "CareerOS 数据库上下文：",
            f"- 今日新增项目：{len(projects_today)} 个；{names(projects_today, 'project_name')}",
            f"- 今日项目能力分析：{len(project_scores_today)} 次；{names(project_scores_today, 'project_name')}",
            f"- 今日保存简历：{len(resumes_today)} 个；{names(resumes_today, 'filename')}",
            f"- 今日简历-JD匹配：{len(matches_today)} 次；{names(matches_today, 'job_title')}",
            f"- 今日简历维度评分：{len(resume_scores_today)} 次",
            f"- 最近简历维度评分记录：{resume_score_lines(recent_resume_scores)}",
            f"- 岗位能力标准积累：{summarize_capabilities(all_project_scores, recent_resume_scores)}",
            f"- 今日新增学习项：{len(learning_added_today)} 个；{names(learning_added_today, 'title')}",
            f"- 今日完成学习项：{len(learning_completed_today)} 个；{names(learning_completed_today, 'title')}",
            f"- 今日收藏 AI 小卡：{len(favorites_today)} 个；{names(favorites_today, 'search_name')}",
            f"- 近7天收藏 AI 小卡：{len(favorites_week)} 个；{names(favorites_week, 'search_name')}",
            f"- 最近项目档案：{names(recent_projects, 'project_name')}",
            f"- 最近简历版本：{names(recent_resumes, 'filename')}",
            f"- 最近简历-JD匹配记录：{match_lines(recent_matches)}",
            f"- 最近学习仓库：{names(recent_learning, 'title')}",
        ]
    )


@router.post("/chat", response_model=AgentChatResponse)
def agent_chat(request: AgentChatRequest, db: Session = Depends(get_db)):
    logger.info("Agent chat API called: history=%s cards=%s", len(request.history), len(request.ai_cards))
    try:
        result = chat_with_careeros_agent(
            message=request.message.strip(),
            history=[item.model_dump() for item in request.history],
            ai_cards=request.ai_cards,
            career_context=build_agent_context(request.user_id, db),
        )
        return AgentChatResponse(**result)
    except Exception as error:
        logger.exception("Agent chat failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error


@router.post("/chat/stream")
def agent_chat_stream(request: AgentChatRequest, db: Session = Depends(get_db)):
    logger.info("Agent chat stream API called: history=%s cards=%s", len(request.history), len(request.ai_cards))
    context = build_agent_context(request.user_id, db)

    def generate():
        try:
            for chunk in stream_careeros_agent(
                message=request.message.strip(),
                history=[item.model_dump() for item in request.history],
                ai_cards=request.ai_cards,
                career_context=context,
            ):
                yield chunk
        except Exception as error:
            logger.exception("Agent chat stream failed")
            yield f"\n\n[智能体暂时无法连接大模型：{error}]"

    return StreamingResponse(generate(), media_type="text/plain; charset=utf-8")


@router.get("/favorites", response_model=list[AICardFavoriteResponse])
def list_ai_card_favorites(user_id: int, db: Session = Depends(get_db)):
    ensure_user(user_id, db)
    return (
        db.query(AICardFavorite)
        .filter(AICardFavorite.user_id == user_id)
        .order_by(AICardFavorite.created_at.desc(), AICardFavorite.id.desc())
        .all()
    )


@router.post("/favorites", response_model=AICardFavoriteResponse, status_code=status.HTTP_201_CREATED)
def save_ai_card_favorite(payload: AICardFavoriteCreate, db: Session = Depends(get_db)):
    ensure_user(payload.user_id, db)
    card_id = payload.card_id.strip()
    record = (
        db.query(AICardFavorite)
        .filter(AICardFavorite.user_id == payload.user_id, AICardFavorite.card_id == card_id)
        .first()
    )
    if record is None:
        record = AICardFavorite(user_id=payload.user_id, card_id=card_id)
        db.add(record)
    record.name = payload.name.strip()
    record.search_name = (payload.search_name or payload.name).strip()
    record.source = payload.source.strip()
    record.real_summary = payload.real_summary.strip()
    record.one = payload.one.strip()
    record.for_who = payload.for_who.strip()
    record.why = payload.why.strip()
    record.heat = payload.heat.strip()
    record.take = payload.take.strip()
    record.raw_payload = payload.raw_payload
    db.commit()
    db.refresh(record)
    return record


@router.delete("/favorites/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ai_card_favorite(card_id: str, user_id: int, db: Session = Depends(get_db)):
    ensure_user(user_id, db)
    record = (
        db.query(AICardFavorite)
        .filter(AICardFavorite.user_id == user_id, AICardFavorite.card_id == card_id)
        .first()
    )
    if not record:
        return None
    db.delete(record)
    db.commit()
    return None
