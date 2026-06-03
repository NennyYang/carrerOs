import json
import logging
import os
import urllib.error
import urllib.request

import config  # noqa: F401


logger = logging.getLogger("careeros.llm")


PROJECT_SCORE_FIELDS = {
    "python_networking_score": "python_networking_reason",
    "llm_prompt_engineering_score": "llm_prompt_engineering_reason",
    "rag_score": "rag_reason",
    "ai_frameworks_score": "ai_frameworks_reason",
    "backend_data_storage_score": "backend_data_storage_reason",
    "deployment_finetuning_score": "deployment_finetuning_reason",
    "engineering_ops_score": "engineering_ops_reason",
}


CAPABILITY_STANDARD = [
    {
        "field": "python_networking_score",
        "name": "Python编程与网络基础",
        "description": "Python、HTTP/API集成、异步编程、请求处理、JSON、日志记录、接口调试。",
    },
    {
        "field": "llm_prompt_engineering_score",
        "name": "大模型基础与Prompt工程",
        "description": "Prompt设计、Token/上下文处理、Embedding、模型API使用、安全性和Prompt迭代。",
    },
    {
        "field": "rag_score",
        "name": "RAG检索增强技术",
        "description": "文档解析、文本分块、向量化、向量搜索、召回评估、RAG质量改进。",
    },
    {
        "field": "ai_frameworks_score",
        "name": "AI框架、智能体与多模态集成",
        "description": "LangChain/LlamaIndex、智能体、工具调用、工作流编排、多模态API集成。",
    },
    {
        "field": "backend_data_storage_score",
        "name": "后端服务与数据存储",
        "description": "FastAPI/Flask、REST API、验证、认证、PostgreSQL/MySQL、Redis、文件处理。",
    },
    {
        "field": "deployment_finetuning_score",
        "name": "模型部署、推理与微调",
        "description": "云/私有模型API、推理服务、vLLM/TGI、LoRA/QLoRA、模型部署。",
    },
    {
        "field": "engineering_ops_score",
        "name": "工程运维与业务交付",
        "description": "Docker、部署、日志、监控、故障排查、成本/性能优化、业务交付。",
    },
]


def _extract_json_object(text: str) -> dict:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            return json.loads(text[start : end + 1])
        raise


def _clamp_score(value) -> float:
    try:
        score = float(value)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, min(100.0, score))


def _validate_project_scores(output: dict, model: str, project_name: str) -> dict:
    result = {}
    for score_field, reason_field in PROJECT_SCORE_FIELDS.items():
        result[score_field] = _clamp_score(output.get(score_field, 0.0))
        result[reason_field] = str(output.get(reason_field) or "No reason returned by model.")
    result["model"] = model
    result["project_name"] = project_name
    return result


def _chat_completion(payload: dict) -> dict:
    api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY or OPENAI_API_KEY is not configured")

    base_url = os.getenv("OPENAI_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
    endpoint = f"{base_url}/chat/completions"
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8078",
            "X-Title": "CareerOS Local Prototype",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        logger.error("LLM HTTP error: status=%s detail=%s", error.code, detail[:800])
        raise RuntimeError(f"LLM request failed: {error.code} {detail}") from error
    except urllib.error.URLError as error:
        logger.error("LLM network error: %s", error.reason)
        raise RuntimeError(f"LLM network request failed: {error.reason}") from error


def analyze_project_with_llm(project_data: dict) -> dict:
    model = os.getenv("OPENAI_MODEL", "poolside/laguna-xs.2:free")
    project_name = project_data["project_name"]
    logger.info("Project LLM analysis started: project=%s model=%s", project_name, model)

    schema_hint = {
        score_field: 0.0 if score_field.endswith("_score") else ""
        for pair in PROJECT_SCORE_FIELDS.items()
        for score_field in pair
    }
    standards = "\n".join(
        f"- {item['field']}: {item['name']} - {item['description']}"
        for item in CAPABILITY_STANDARD
    )
    user_content = f"""
评估单个项目对能力增长的贡献程度。评分应保守谨慎，避免过高估计。

项目信息:
- 项目名称: {project_data['project_name']}
- 技术栈: {project_data['technology_stack']}
- 解决的问题: {project_data['problem']}
- 解决方案与验证: {project_data['solution_and_validation']}

能力标准:
{standards}

评分规则（保守评分）:
- 只返回有效的JSON格式。
- 每个分数必须是0到10之间的数字，保留一位小数。
- 项目未使用该能力时评0分。
- 仅提及或证据薄弱时评0.1-1分。
- 基础实际使用（了解并能简单应用）评1.1-3分。
- 常规实践使用（熟练应用）评3.1-5分。
- 深入实践（能独立解决问题）评5.1-7分。
- 高级应用（有创新或明确验证效果）评7.1-9分。
- 卓越表现（行业领先水平）评9.1-10分。
- 除非有非常明确的证据，否则不要轻易给高分。
- 每个项目对单项能力的增量贡献通常不应超过5分。
- 理由必须是基于项目事实的简洁中文解释，不要使用英文。

输出JSON格式:
{json.dumps(schema_hint, ensure_ascii=False, indent=2)}
""".strip()

    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "You are a strict career capability evaluator. Use only the user's project facts. Return JSON only.",
            },
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.2,
        "max_tokens": 1800,
        "response_format": {"type": "json_object"},
    }
    body = _chat_completion(payload)
    content = body["choices"][0]["message"]["content"]
    analysis = _extract_json_object(content)
    return _validate_project_scores(analysis, body.get("model", model), project_name)


def analyze_resume_with_llm(resume_data: dict) -> dict:
    model = os.getenv("OPENAI_MODEL", "poolside/laguna-xs.2:free")
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "Analyze resume capability evidence. Return JSON only with summary, matched_capabilities, gaps, suggestions.",
            },
            {
                "role": "user",
                "content": (
                    "Return JSON with fields: summary, matched_capabilities, gaps, suggestions.\n"
                    "matched_capabilities items need: name, capability_id, level, evidence, score_delta.\n\n"
                    f"Filename: {resume_data['filename']}\n"
                    f"Content:\n{resume_data['content']}"
                ),
            },
        ],
        "temperature": 0.2,
        "max_tokens": 1600,
        "response_format": {"type": "json_object"},
    }
    body = _chat_completion(payload)
    content = body["choices"][0]["message"]["content"]
    analysis = _extract_json_object(content)
    analysis.setdefault("summary", "")
    analysis.setdefault("matched_capabilities", [])
    analysis.setdefault("gaps", [])
    analysis.setdefault("suggestions", [])
    analysis["model"] = body.get("model", model)
    return analysis


def analyze_resume_dimensions_with_llm(resume_data: dict) -> dict:
    model = os.getenv("OPENAI_MODEL", "poolside/laguna-xs.2:free")
    filename = resume_data["filename"]
    content = resume_data["content"]
    logger.info("Resume dimensions LLM analysis started: filename=%s model=%s", filename, model)

    schema_hint = {
        "python_networking_score": 0.0,
        "python_networking_reason": "",
        "llm_prompt_engineering_score": 0.0,
        "llm_prompt_engineering_reason": "",
        "rag_score": 0.0,
        "rag_reason": "",
        "ai_frameworks_score": 0.0,
        "ai_frameworks_reason": "",
        "backend_data_storage_score": 0.0,
        "backend_data_storage_reason": "",
        "deployment_finetuning_score": 0.0,
        "deployment_finetuning_reason": "",
        "engineering_ops_score": 0.0,
        "engineering_ops_reason": "",
    }
    standards = "\n".join(
        f"- {item['field']}: {item['name']} - {item['description']}"
        for item in CAPABILITY_STANDARD
    )
    user_content = f"""
评估简历中体现的各项技术能力水平。评分应保守谨慎，基于简历中明确陈述的事实。

简历信息:
- 文件名: {filename}
- 内容:
{content[:3000] if len(content) > 3000 else content}

能力标准:
{standards}

评分规则（保守评分）:
- 只返回有效的JSON格式。
- 每个分数必须是0到100之间的数字。
- 简历未提及该能力领域时评0分。
- 仅提及但无实际经验证据时评1-15分。
- 有基础经验（了解并能简单应用）评16-30分。
- 有实际项目经验（熟练应用）评31-50分。
- 有深入经验（能独立解决复杂问题）评51-70分。
- 有丰富经验（有成果或带领项目）评71-85分。
- 有专家水平（行业认可或显著影响力）评86-100分。
- 理由必须是基于简历事实的简洁中文解释。

输出JSON格式:
{json.dumps(schema_hint, ensure_ascii=False, indent=2)}
""".strip()

    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "You are a strict resume capability evaluator. Use only the facts stated in the resume. Return JSON only.",
            },
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.2,
        "max_tokens": 2000,
        "response_format": {"type": "json_object"},
    }
    body = _chat_completion(payload)
    content = body["choices"][0]["message"]["content"]
    analysis = _extract_json_object(content)
    result = {}
    for score_field, reason_field in PROJECT_SCORE_FIELDS.items():
        result[score_field] = _clamp_score(analysis.get(score_field, 0.0))
        result[reason_field] = str(analysis.get(reason_field) or "No reason returned by model.")
    result["model"] = body.get("model", model)
    result["filename"] = filename
    return result


def analyze_resume_match_with_llm(resume_content: str, job_description: str) -> dict:
    model = os.getenv("OPENAI_MODEL", "poolside/laguna-xs.2:free")
    schema_hint = {
        "resume_score": 0,
        "match_score": 0,
        "match_highlights": ["匹配亮点，基于简历和JD的共同证据"],
        "match_gaps": ["待优化项 + 针对性修改建议"],
    }
    user_content = f"""
请基于“当前简历内容”和“目标岗位JD”做岗位匹配分析。

当前简历内容:
{resume_content[:5000] if len(resume_content) > 5000 else resume_content}

目标岗位JD:
{job_description[:4000] if len(job_description) > 4000 else job_description}

分析要求:
- 只返回有效 JSON。
- match_score 是简历与该 JD 的匹配度，范围 0-100。
- resume_score 是简历本身针对该 JD 的可投递质量评分，范围 0-100。
- match_highlights 输出 2-5 条匹配亮点，必须来自简历和 JD 的共同证据。
- match_gaps 输出 2-5 条“待优化项 + 针对性修改建议”，每条要具体说明应如何改简历。
- 不要编造简历中没有的经历。
- 所有列表内容使用中文，短句即可。

JSON 格式:
{json.dumps(schema_hint, ensure_ascii=False, indent=2)}
""".strip()
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "You are a strict resume-to-JD matching evaluator. Use only the resume and JD facts. Return JSON only.",
            },
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.2,
        "max_tokens": 1800,
        "response_format": {"type": "json_object"},
    }
    body = _chat_completion(payload)
    analysis = _extract_json_object(body["choices"][0]["message"]["content"])
    highlights = analysis.get("match_highlights") or []
    gaps = analysis.get("match_gaps") or []
    if isinstance(highlights, str):
        highlights = [highlights]
    if isinstance(gaps, str):
        gaps = [gaps]
    return {
        "resume_score": round(_clamp_score(analysis.get("resume_score", 0))),
        "match_score": round(_clamp_score(analysis.get("match_score", 0))),
        "dimension_scores": [],
        "resume_suggestions": [],
        "match_highlights": [str(item) for item in highlights][:5],
        "match_gaps": [str(item) for item in gaps][:5],
        "model": body.get("model", model),
    }


def generate_learning_suggestions_with_llm(work_content: str) -> dict:
    model = os.getenv("OPENAI_MODEL", "poolside/laguna-xs.2:free")
    schema_hint = {
        "suggestions": [
            {
                "title": "学习主题",
                "description": "结合今日工作问题给出的具体学习建议和练习方向",
                "priority": "high",
            }
        ]
    }
    user_content = f"""
请根据用户今天的工作内容和遇到的问题，生成个性化学习建议。

今日工作内容：
{work_content}

要求：
- 只返回有效 JSON，不要使用 Markdown。
- 返回 3-5 条建议，按优先级从高到低排序。
- 每条建议必须与用户描述的实际问题直接相关，避免泛泛而谈。
- title 使用简洁中文，description 说明应该学习什么、为什么以及可执行的练习方向。
- priority 只能是 high、medium、low。
- 不要编造用户没有提到的项目事实。

JSON 格式：
{json.dumps(schema_hint, ensure_ascii=False, indent=2)}
""".strip()
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "You are a practical career learning advisor. Return JSON only.",
            },
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.3,
        "max_tokens": 1400,
        "response_format": {"type": "json_object"},
    }
    body = _chat_completion(payload)
    analysis = _extract_json_object(body["choices"][0]["message"]["content"])
    raw_suggestions = analysis.get("suggestions") or []
    if not isinstance(raw_suggestions, list):
        raw_suggestions = []

    suggestions = []
    for item in raw_suggestions[:5]:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        description = str(item.get("description") or "").strip()
        priority = str(item.get("priority") or "medium").strip().lower()
        if priority not in {"high", "medium", "low"}:
            priority = "medium"
        if title and description:
            suggestions.append(
                {
                    "title": title,
                    "description": description,
                    "priority": priority,
                }
            )

    if not suggestions:
        raise RuntimeError("LLM did not return valid learning suggestions")

    return {"suggestions": suggestions, "model": body.get("model", model)}
