#!/usr/bin/env python3
"""Fetch the daily AI brief for CareerOS.

The script reads RadarAI RSS and Hugging Face's public model API, cleans the
items into simple Chinese cards, picks nine projects, and writes
frontend/data/ai-brief.json.
"""

from __future__ import annotations

import datetime as dt
import hashlib
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "frontend" / "data" / "ai-brief.json"
HISTORY = ROOT / "frontend" / "data" / "ai-brief-history.json"
RADARAI_RSS = "https://radarai.top/feed.xml"
HF_API = "https://huggingface.co/api/models?sort=createdAt&direction=-1&limit=30"
GITHUBDAILY_2024 = "https://raw.githubusercontent.com/GitHubDaily/GitHubDaily/master/2024.md"

KEYWORDS = {
    "rag": 34,
    "knowledge": 28,
    "document": 24,
    "docs": 18,
    "chat": 22,
    "chatbot": 28,
    "agent": 28,
    "assistant": 22,
    "office": 30,
    "ppt": 30,
    "presentation": 28,
    "slide": 24,
    "meeting": 30,
    "summary": 22,
    "summarization": 22,
    "workflow": 24,
    "automation": 24,
    "customer": 24,
    "support": 18,
    "spreadsheet": 24,
    "excel": 24,
    "voice": 12,
    "transcript": 20,
}


def fetch_text(url: str, timeout: int = 12) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "CareerOS-AIBrief/1.0",
            "Accept": "application/rss+xml, application/json, text/xml, */*",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read().decode("utf-8", errors="replace")


def clean_text(value: str) -> str:
    value = html.unescape(value or "")
    value = re.sub(r"<[^>]+>", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def short_name(name: str) -> str:
    name = clean_text(name)
    name = re.sub(r"^[\[\(].*?[\]\)]\s*", "", name)
    name = name.replace(" - Hugging Face", "")
    return name[:56] or "AI 项目"


def concise_search_name(name: str, description: str, url: str) -> str:
    text = clean_text(f"{name} {description} {url}")

    repo = re.search(r"github\.com/([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)", text)
    if repo:
        return repo.group(1).rstrip(".")

    hf_model = re.search(r"huggingface\.co/([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)", text)
    if hf_model:
        return hf_model.group(1).rstrip(".")

    quoted = re.search(r"[`'\"]([A-Za-z][A-Za-z0-9_.\-/ ]{2,40})[`'\"]", text)
    if quoted:
        return quoted.group(1).strip()

    title = clean_text(name)
    prefix = re.split(r"[:：｜|，,。]", title, maxsplit=1)[0].strip()
    if re.search(r"[A-Za-z]", prefix) and len(prefix) <= 34:
        return prefix

    candidates = re.findall(r"\b[A-Za-z][A-Za-z0-9_.-]*(?:\s+[A-Za-z][A-Za-z0-9_.-]*){0,2}\b", title)
    stop_words = {
        "AI", "GPU", "RAG", "API", "LLM", "Agent", "Code", "Open", "New",
        "GitHub", "Hugging", "Face", "World", "Cup", "Frontier"
    }
    for candidate in candidates:
        candidate = candidate.strip()
        if candidate in stop_words:
            continue
        if 2 <= len(candidate) <= 34:
            return candidate

    if candidates:
        combined = " ".join(candidates[:2]).strip()
        if 2 <= len(combined) <= 34:
            return combined

    return title[:24]


def has_concise_native_name(value: str) -> bool:
    value = clean_text(value)
    if "/" in value and re.search(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", value):
        return True
    if re.search(r"[A-Za-z]", value) and len(value) <= 34:
        return True
    return len(value) <= 18 and not re.search(r"[。！？!?，,：:]", value)


def item_id(source: str, name: str, url: str) -> str:
    raw = f"{source}|{name}|{url}".encode("utf-8", errors="ignore")
    return hashlib.sha1(raw).hexdigest()[:16]


def format_count(value: int | float | None, suffix: str) -> str:
    try:
        number = int(value or 0)
    except (TypeError, ValueError):
        number = 0
    if number >= 1_000_000:
        text = f"{number / 1_000_000:.1f}m"
    elif number >= 1000:
        text = f"{number / 1000:.1f}k"
    else:
        text = str(number)
    return f"{text} {suffix}"


def score_item(text: str, likes: int = 0, downloads: int = 0) -> int:
    lowered = text.lower()
    score = 0
    for keyword, weight in KEYWORDS.items():
        if keyword in lowered:
            score += weight
    score += min(likes, 2000) // 40
    score += min(downloads, 100000) // 2500
    return score


def simple_one_line(name: str, description: str) -> str:
    text = f"{name} {description}".lower()
    if any(word in text for word in ["ppt", "presentation", "slide"]):
        return "它能帮你把想法、文档或大纲变成演示材料。"
    if any(word in text for word in ["spreadsheet", "excel", "table", "dataframe"]):
        return "它能帮你看表格、整理数据，少一点手工活。"
    if any(word in text for word in ["meeting", "transcript", "summary", "summarization"]):
        return "它能把长内容、会议或记录整理成更短的摘要。"
    if any(word in text for word in ["rag", "knowledge", "document", "docs"]):
        return "它能把资料变成可以提问的知识库。"
    if any(word in text for word in ["chatbot", "chat", "assistant", "customer", "support"]):
        return "它像一个可以对话的小助手，能帮人回答问题。"
    if any(word in text for word in ["agent", "workflow", "automation", "browser"]):
        return "它能把一些重复操作交给 AI 自动处理。"
    return "这是一个新的 AI 项目，适合看看能不能变成实用工具。"


def simple_for_who(name: str, description: str) -> str:
    text = f"{name} {description}".lower()
    if any(word in text for word in ["office", "ppt", "presentation", "slide", "spreadsheet", "excel"]):
        return "适合：经常做办公材料、报表和汇报的人"
    if any(word in text for word in ["customer", "support", "chatbot"]):
        return "适合：客服、售后、社群运营团队"
    if any(word in text for word in ["meeting", "summary", "transcript"]):
        return "适合：经常开会、整理纪要和跟进任务的人"
    if any(word in text for word in ["rag", "knowledge", "document", "docs"]):
        return "适合：资料很多、经常被问流程的团队"
    if any(word in text for word in ["agent", "workflow", "automation"]):
        return "适合：每天有重复操作和资料整理的人"
    return "适合：想找 AI 产品灵感的人"


def simple_why(name: str, description: str) -> str:
    text = f"{name} {description}".lower()
    if any(word in text for word in ["rag", "knowledge", "document", "docs"]):
        return "不用翻一堆文件，直接问它就能找到重点。"
    if any(word in text for word in ["agent", "workflow", "automation"]):
        return "它不是只会聊天，而是能帮你做一点真正的事。"
    if any(word in text for word in ["meeting", "summary", "transcript"]):
        return "少写一点纪要，多留一点精力做判断。"
    if any(word in text for word in ["chatbot", "assistant", "customer"]):
        return "把重复回答交给 AI，人只处理更难的问题。"
    if any(word in text for word in ["ppt", "presentation", "slide", "office", "excel"]):
        return "它贴近日常办公，不需要很懂技术也能想象怎么用。"
    return "它可能不是最终产品，但很适合拿来找新点子。"


def make_card(source: str, name: str, description: str, url: str, likes: int = 0, downloads: int = 0) -> dict:
    raw_name = clean_text(name)
    search_name = concise_search_name(raw_name, description, url)
    name = short_name(raw_name)
    description = clean_text(description)
    heat_parts = []
    if likes:
        heat_parts.append(format_count(likes, "likes"))
    if downloads:
        heat_parts.append(format_count(downloads, "downloads"))
    heat = "，".join(heat_parts) if heat_parts else "今日新收录"
    text = f"{name} {description}"
    return {
        "id": item_id(source, name, url),
        "name": name,
        "searchName": search_name,
        "source": source,
        "realSummary": description[:160],
        "one": simple_one_line(name, description),
        "forWho": simple_for_who(name, description),
        "why": simple_why(name, description),
        "heat": heat,
        "take": "先收藏观察，适合以后判断能不能做成一个小产品。",
        "score": score_item(text, likes, downloads) + (24 if has_concise_native_name(search_name) else -80),
        "rawUrl": url,
    }


def parse_radarai() -> list[dict]:
    print("Fetching RadarAI RSS...")
    xml_text = fetch_text(RADARAI_RSS)
    root = ET.fromstring(xml_text)
    items = []
    for item in root.findall(".//item")[:80]:
        title = clean_text(item.findtext("title"))
        description = clean_text(item.findtext("description"))
        link = clean_text(item.findtext("link"))
        if title:
            items.append(make_card("RadarAI 每日聚合", title, description, link))
    return items


def parse_hugging_face() -> list[dict]:
    print("Fetching Hugging Face models...")
    text = fetch_text(HF_API)
    data = json.loads(text)
    items = []
    for model in data[:80]:
        model_id = model.get("modelId") or model.get("id") or "Hugging Face Model"
        description = (
            model.get("description")
            or (model.get("cardData") or {}).get("summary")
            or "Hugging Face 今日上新的 AI 模型。"
        )
        tags = " ".join(model.get("tags") or [])
        likes = int(model.get("likes") or 0)
        downloads = int(model.get("downloads") or 0)
        url = "https://huggingface.co/" + urllib.parse.quote(model_id, safe="/")
        items.append(make_card("Hugging Face 今日上新", model_id, f"{description} {tags}", url, likes, downloads))
    return items


def parse_githubdaily() -> list[dict]:
    print("Fetching GitHubDaily archive...")
    markdown = fetch_text(GITHUBDAILY_2024)
    items = []
    row_pattern = re.compile(r"\[([^\]]+)\]\(([^)]+)\)\s*\|\s*([^|]+)\|", re.MULTILINE)
    for match in row_pattern.finditer(markdown):
        name = clean_text(match.group(1))
        url = clean_text(match.group(2))
        description = clean_text(match.group(3))
        if not name or not description:
            continue
        if "github.com" not in url and "huggingface.co" not in url:
            continue
        text = f"{name} {description}"
        if score_item(text) < 18:
            continue
        card = make_card("GitHubDaily 项目库", name, description, url)
        card["searchName"] = name
        card["name"] = name
        card["score"] += 36
        items.append(card)
    return items[:80]


def load_history() -> dict:
    if not HISTORY.exists():
        return {}
    try:
        return json.loads(HISTORY.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def save_history(history: dict) -> None:
    HISTORY.parent.mkdir(parents=True, exist_ok=True)
    HISTORY.write_text(json.dumps(history, ensure_ascii=False, indent=2), encoding="utf-8")


def pick_daily(items: list[dict], today: str) -> list[dict]:
    history = load_history()
    recent_ids = set()
    for date_key in sorted(history.keys())[-7:]:
        recent_ids.update(history.get(date_key, []))

    unique = {}
    for item in items:
        if item["id"] not in unique:
            unique[item["id"]] = item

    sorted_items = sorted(unique.values(), key=lambda item: item.get("score", 0), reverse=True)
    fresh = [item for item in sorted_items if item["id"] not in recent_ids]
    picked = fresh[:9]
    if len(picked) < 9:
        picked.extend([item for item in sorted_items if item not in picked][: 9 - len(picked)])

    history[today] = [item["id"] for item in picked]
    save_history(history)
    return picked[:9]


def main() -> int:
    today = dt.date.today().isoformat()
    errors = []
    items: list[dict] = []
    for source_name, parser in (
        ("RadarAI", parse_radarai),
        ("Hugging Face", parse_hugging_face),
        ("GitHubDaily", parse_githubdaily),
    ):
        try:
            items.extend(parser())
            time.sleep(0.4)
        except Exception as error:  # noqa: BLE001 - CLI should keep going when one source fails.
            errors.append(f"{source_name}: {error}")
            print(f"Skipped {source_name}: {error}", file=sys.stderr)

    if not items:
        print("No AI brief items fetched: " + " | ".join(errors), file=sys.stderr)
        return 1

    picked = pick_daily(items, today)
    for item in picked:
        item.pop("score", None)
        item.pop("rawUrl", None)

    payload = {
        "date": today,
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "sources": ["RadarAI RSS", "Hugging Face API", "GitHubDaily"],
        "items": picked,
        "errors": errors,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(picked)} items to {OUTPUT}")
    if errors:
        print("Warnings: " + " | ".join(errors), file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
