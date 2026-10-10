"""
Creative brief generation.

Default behaviour: a local, deterministic template engine that turns a short
idea into a structured brief. The `generate_brief()` entry point first checks
whether an optional LLM is configured (env LLM_API_KEY + LLM_API_URL); if so,
it calls it, otherwise it falls back to the template engine. This keeps the
architecture LLM-ready without requiring any paid API for the demo.
"""
import os
import re
from datetime import date, timedelta
from typing import Any, Dict, List

# --- taxonomy used by both the template engine and the UI -------------------
CONTENT_TYPES = [
    "AI film",
    "AI animation",
    "AI-generated images",
    "AI product advertisement",
    "AI storytelling",
    "Generative 3D design",
]

STYLES = [
    "Cinematic",
    "Minimalist",
    "Playful & vibrant",
    "Dark & moody",
    "Editorial",
    "Photorealistic",
    "Hand-drawn 2D",
    "Retro-futuristic",
]

SKILL_CATALOG = [
    "Prompt engineering",
    "AI filmmaking",
    "AI animation",
    "AI-generated images",
    "AI product advertisements",
    "AI storytelling",
    "Generative 3D design",
    "Storyboarding",
    "Video editing",
    "Color grading",
    "Character design",
    "Motion design",
]

TOOL_CATALOG = [
    "Midjourney",
    "Stable Diffusion",
    "Runway",
    "Pika",
    "Sora",
    "DALL·E",
    "Blender",
    "Luma",
    "Kling",
    "ElevenLabs",
    "Adobe Firefly",
    "Cinema 4D",
]

USAGE_RIGHTS = [
    "3-month organic social",
    "12-month digital ads",
    "Perpetual worldwide",
    "Editorial / organic only",
]

_KEYWORD_MAP = {
    "AI film": ["film", "movie", "cinematic", "trailer", "short film"],
    "AI animation": ["animation", "animate", "cartoon", "explainer", "motion"],
    "AI-generated images": ["image", "images", "photo", "photography", "illustration", "poster"],
    "AI product advertisement": ["product", "advert", " ad ", "ads", "commercial", "ecommerce", "launch"],
    "AI storytelling": ["story", "storytelling", "narrative", "brand story", "chapter"],
    "Generative 3D design": ["3d", "model", "sculpt", "figurine", "render"],
}

_STYLE_MAP = {
    "Cinematic": ["cinematic", "film", "movie", "dramatic"],
    "Minimalist": ["minimal", "clean", "simple"],
    "Playful & vibrant": ["playful", "fun", "colorful", "vibrant", "kids", "youth"],
    "Dark & moody": ["dark", "moody", "night", "noir", "luxury"],
    "Editorial": ["editorial", "magazine", "fashion"],
    "Photorealistic": ["realistic", "photo", "hyperreal", "lifelike"],
    "Hand-drawn 2D": ["hand-drawn", " 2d", "sketch", "watercolor"],
    "Retro-futuristic": ["retro", "synthwave", "vaporwave", "futuristic", "80s"],
}


def _detect(content: str, mapping: Dict[str, List[str]], default: str) -> str:
    low = content.lower()
    for key, words in mapping.items():
        if any(w in low for w in words):
            return key
    return default


def _title_from_idea(idea: str) -> str:
    clean = re.sub(r"\s+", " ", idea).strip().rstrip(".")
    clean = clean[0].upper() + clean[1:] if clean else "Untitled campaign"
    return clean[:90]


def template_generate_brief(idea: str) -> Dict[str, Any]:
    """Deterministic, local fallback: idea -> structured brief fields."""
    content_type = _detect(idea, _KEYWORD_MAP, "AI-generated images")
    style = _detect(idea, _STYLE_MAP, "Cinematic")

    audience_default = "Gen Z & millennial social audiences"
    low = idea.lower()
    if any(w in low for w in ["b2b", "enterprise", "saas", "developer"]):
        audience_default = "B2B decision makers & tech professionals"
    elif any(w in low for w in ["luxury", "premium", "couture"]):
        audience_default = "Affluent premium consumers (25–45)"
    elif any(w in low for w in ["fitness", "sport", "athletic", "gym"]):
        audience_default = "Active lifestyle consumers (18–34)"

    skill_guess = content_type if content_type in SKILL_CATALOG else "Prompt engineering"
    tool_guess = {
        "AI film": ["Runway", "Kling"],
        "AI animation": ["Pika", "Sora"],
        "AI-generated images": ["Midjourney", "Stable Diffusion"],
        "AI product advertisement": ["Midjourney", "Runway"],
        "AI storytelling": ["Midjourney", "ElevenLabs"],
        "Generative 3D design": ["Blender", "Cinema 4D"],
    }.get(content_type, ["Midjourney"])

    deliverable_guess = {
        "AI film": "1 × 30–60s hero film (16:9 + 9:16 cutdown), captions, master file",
        "AI animation": "1 × 20–40s animated explainer + 3 social cutdowns",
        "AI-generated images": "10 × high-res key visuals (4K) + 3 aspect-ratio variants",
        "AI product advertisement": "1 × 15s hero ad + 5 static key visuals",
        "AI storytelling": "1 × narrated story reel + 5 chapter illustrations",
        "Generative 3D design": "5 × textured 3D models (GLB/OBJ) + turntable renders",
    }.get(content_type, "10 × high-res key visuals")

    return {
        "title": _title_from_idea(idea),
        "objective": (
            f"Bring this idea to life with AI-native production: “{idea.strip()}”. "
            f"The piece should feel {style.lower()} while clearly communicating the "
            "campaign's core message and driving engagement with the target audience."
        ),
        "audience": audience_default,
        "content_type": content_type,
        "preferred_style": style,
        "required_skills": [skill_guess, "Prompt engineering"],
        "required_tools": tool_guess,
        "budget_min": 800,
        "budget_max": 3500,
        "deadline": (date.today() + timedelta(days=21)).isoformat(),
        "deliverables": deliverable_guess,
        "usage_rights": "3-month organic social",
    }


def generate_brief(idea: str) -> Dict[str, Any]:
    """
    Entry point used by the API.

    If an LLM endpoint is configured (LLM_API_URL + LLM_API_KEY), the idea is
    sent there first; on any failure we fall back to the local template engine,
    so the demo never breaks.
    """
    llm_url = os.environ.get("LLM_API_URL")
    llm_key = os.environ.get("LLM_API_KEY")
    if llm_url and llm_key:
        try:
            return _llm_generate(llm_url, llm_key, idea)
        except Exception:
            pass  # fall through to the deterministic template engine
    return template_generate_brief(idea)


def _llm_generate(url: str, key: str, idea: str) -> Dict[str, Any]:
    """Optional LLM integration (unused in the default demo)."""
    import json
    import urllib.request

    prompt = (
        "Turn the marketing idea below into a structured creative brief as JSON "
        "with keys: title, objective, audience, content_type, preferred_style, "
        "required_skills, required_tools, budget_min, budget_max, deadline, "
        "deliverables, usage_rights. Idea: " + idea
    )
    req = urllib.request.Request(
        url,
        data=json.dumps({"prompt": prompt}).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode())
    return {**template_generate_brief(idea), **data}

    return clean[:90]
