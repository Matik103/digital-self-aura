#!/usr/bin/env python3
"""Chunk the avatar knowledge base and POST to ingest-avatar-kb edge function."""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KB = ROOT / "migrate" / "ernst_avatar_knowledge_base.txt"
SOURCE = "avatar_knowledge_base_v1"

# Reuse section splitter from previous version via import-by-exec of local helpers
sys.path.insert(0, str(ROOT / "migrate"))

SECTION_META = {
    "how to use this document": ("avatar_kb", "meta", "critical"),
    "core operating rule": ("avatar_kb", "rules", "critical"),
    "executive identity": ("avatar_kb", "profile", "critical"),
    "one-sentence positioning": ("avatar_kb", "profile", "critical"),
    "longer positioning": ("avatar_kb", "profile", "critical"),
    "professional narrative": ("avatar_kb", "experience", "high"),
    "skills matrix": ("avatar_kb", "skills", "high"),
    "technical profile": ("avatar_kb", "skills", "high"),
    "engineering principles": ("avatar_kb", "approach", "critical"),
    "product & venture": ("avatar_kb", "projects", "high"),
    "auctra": ("avatar_kb", "projects", "high"),
    "sanctum": ("avatar_kb", "projects", "high"),
    "stopa": ("avatar_kb", "projects", "high"),
    "haulora": ("avatar_kb", "projects", "critical"),
    "kura": ("avatar_kb", "projects", "high"),
    "taskpay": ("avatar_kb", "projects", "medium"),
    "happeningnow": ("avatar_kb", "projects", "high"),
    "faceory": ("avatar_kb", "projects", "medium"),
    "other product": ("avatar_kb", "projects", "medium"),
    "client work": ("avatar_kb", "experience", "high"),
    "logistics": ("avatar_kb", "expertise", "high"),
    "ai governance": ("avatar_kb", "approach", "critical"),
    "business & entrepreneurial": ("avatar_kb", "approach", "high"),
    "how ernst makes decisions": ("avatar_kb", "approach", "critical"),
    "communication style": ("avatar_kb", "voice", "critical"),
    "voice examples": ("avatar_kb", "voice", "critical"),
    "rules for writing": ("avatar_kb", "voice", "critical"),
    "rules for speaking": ("avatar_kb", "voice", "critical"),
    "professional boundaries": ("avatar_kb", "rules", "critical"),
    "remote work": ("avatar_kb", "preferences", "critical"),
    "international perspective": ("avatar_kb", "personal", "high"),
    "learning & intellectual": ("avatar_kb", "personal", "medium"),
    "detailed product philosophy": ("avatar_kb", "approach", "critical"),
    "approach to product competition": ("avatar_kb", "approach", "high"),
    "approach to client communication": ("avatar_kb", "voice", "high"),
    "representative experience": ("avatar_kb", "experience", "high"),
    "what ernst is good at": ("avatar_kb", "profile", "high"),
    "areas the avatar should not": ("avatar_kb", "rules", "critical"),
    "linkedin avatar conversation": ("avatar_kb", "voice", "critical"),
    "when someone asks": ("avatar_kb", "voice", "critical"),
    "conversation behaviors": ("avatar_kb", "voice", "critical"),
    "personal style": ("avatar_kb", "voice", "high"),
    "values that consistently": ("avatar_kb", "voice", "critical"),
    "preferred response structure": ("avatar_kb", "voice", "critical"),
    "vocabulary & concepts": ("avatar_kb", "voice", "high"),
    "chronological career": ("avatar_kb", "experience", "high"),
    "training prompts": ("avatar_kb", "rules", "critical"),
    "system prompt": ("avatar_kb", "voice", "critical"),
    "knowledge gaps": ("avatar_kb", "meta", "medium"),
    "compact machine-readable": ("avatar_kb", "profile", "critical"),
    "final avatar directive": ("avatar_kb", "voice", "critical"),
}


def classify(title: str) -> tuple[str, str, str]:
    low = title.lower()
    for key, meta in SECTION_META.items():
        if key in low:
            return meta
    return ("avatar_kb", "general", "high")


def split_sections(text: str) -> list[tuple[str, str]]:
    lines = text.splitlines()
    sections: list[tuple[str, list[str]]] = [("Overview", [])]
    known_starts = [
        "how to use",
        "privacy boundary",
        "core operating",
        "executive identity",
        "one-sentence",
        "longer positioning",
        "professional narrative",
        "early operational",
        "search, analytics",
        "automation and chatbot",
        "generative ai and",
        "founder-builder",
        "skills matrix",
        "technical profile",
        "languages and development",
        "data and infrastructure",
        "ai engineering",
        "engineering principles",
        "product & venture",
        "auctra",
        "sanctum",
        "stopa",
        "haulora",
        "kura",
        "taskpay",
        "happeningnow",
        "faceory",
        "other product",
        "client work",
        "problem space",
        "work performed",
        "what this demonstrates",
        "logistics",
        "ai governance",
        "the three-layer",
        "business & entrepreneurial",
        "how ernst makes",
        "typical decision",
        "what earns",
        "what he is skeptical",
        "communication style",
        "tone characteristics",
        "professional email",
        "linkedin voice",
        "voice examples",
        "explaining a product",
        "responding to a",
        "discussing ai agents",
        "rules for writing",
        "rules for speaking",
        "professional boundaries",
        "remote work",
        "international perspective",
        "learning & intellectual",
        "detailed product philosophy",
        "ai should compress",
        "the interface should",
        "automation needs authority",
        "evidence matters",
        "build for the messy",
        "approach to product",
        "approach to client",
        "representative experience",
        "from chatbot",
        "from dispatcher",
        "from ai safety",
        "from informal",
        "what ernst is good at",
        "areas the avatar",
        "linkedin avatar",
        "when someone asks",
        "when a recruiter",
        "when a founder",
        "when someone proposes",
        "conversation behaviors",
        "personal style",
        "values that consistently",
        "preferred response",
        "length guidance",
        "vocabulary & concepts",
        "chronological career",
        "training prompts",
        "system prompt",
        "knowledge gaps",
        "compact machine-readable",
        "final avatar directive",
    ]
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        known = any(stripped.lower().startswith(k) for k in known_starts)
        if known:
            sections.append((stripped.rstrip(":"), []))
            continue
        sections[-1][1].append(stripped)

    out: list[tuple[str, str]] = []
    for title, body_lines in sections:
        body = " ".join(body_lines).strip()
        if len(body) < 40:
            continue
        if len(body) <= 1100:
            out.append((title, body))
        else:
            words = body.split()
            chunk: list[str] = []
            n = 0
            part = 1
            for w in words:
                chunk.append(w)
                n += len(w) + 1
                if n >= 950:
                    out.append((f"{title} (part {part})", " ".join(chunk)))
                    part += 1
                    chunk = []
                    n = 0
            if chunk:
                out.append((f"{title} (part {part})", " ".join(chunk)))
    return out


def main() -> int:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get(
        "SUPABASE_ANON_KEY", ""
    )
    if not url or not key:
        print("Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 1
    if not KB.exists():
        print(f"Missing {KB}", file=sys.stderr)
        return 1

    sections = split_sections(KB.read_text())
    chunks = []
    for title, body in sections:
        category, typ, priority = classify(title)
        chunks.append(
            {
                "content": f"{title}\n\n{body}",
                "metadata": {
                    "category": category,
                    "type": typ,
                    "priority": priority,
                    "title": title,
                },
            }
        )
    print(f"posting {len(chunks)} chunks to ingest-avatar-kb")

    payload = json.dumps(
        {"source": SOURCE, "replace": True, "chunks": chunks}
    ).encode()
    req = urllib.request.Request(
        f"{url}/functions/v1/ingest-avatar-kb",
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {key}",
            "apikey": key,
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=300) as resp:
        print(resp.read().decode())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
