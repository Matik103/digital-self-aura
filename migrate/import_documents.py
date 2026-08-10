#!/usr/bin/env python3
"""Import exported RAG documents into a Supabase project.

Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from the environment
(or migrate/.secrets.local via `set -a; source ...`).
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPORT = ROOT / ".tmp" / "db-export" / "documents.json"
BATCH = 25


def main() -> int:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 1
    if not EXPORT.exists():
        print(f"Missing export: {EXPORT}", file=sys.stderr)
        return 1

    rows = json.loads(EXPORT.read_text())
    print(f"Importing {len(rows)} documents → {url}")

    ok = err = 0
    for i in range(0, len(rows), BATCH):
        batch = []
        for row in rows[i : i + BATCH]:
            batch.append(
                {
                    "id": row["id"],
                    "content": row.get("content"),
                    "metadata": row.get("metadata") or {},
                    "embedding": row.get("embedding"),
                }
            )
        payload = json.dumps(batch).encode()
        req = urllib.request.Request(
            f"{url}/rest/v1/documents?on_conflict=id",
            data=payload,
            method="POST",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates,return=minimal",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                if resp.status not in (200, 201):
                    raise RuntimeError(f"HTTP {resp.status}")
            ok += len(batch)
            print(f"  upserted {ok}/{len(rows)}")
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")
            err += len(batch)
            print(f"  batch {i} FAILED {e.code}: {body[:400]}", file=sys.stderr)
        except Exception as e:
            err += len(batch)
            print(f"  batch {i} FAILED: {e}", file=sys.stderr)

    print("Done.", f"ok={ok}", f"err={err}")
    print(
        "SQL: select setval(pg_get_serial_sequence('public.documents','id'),"
        " (select max(id) from public.documents));"
    )
    return 0 if err == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
