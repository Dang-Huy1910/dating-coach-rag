from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from backend.app.eval.retrieval import evaluate_retrieval_compare
from backend.app.eval.runner import run_quality_suite

REPO = Path(__file__).resolve().parents[3]
PUBLIC_DIR = REPO / "frontend" / "public"


def _md_escape(text: str) -> str:
    return str(text).replace("|", "\\|").replace("\n", " ")


def render_markdown(quality: dict[str, Any], retrieval: dict[str, Any]) -> str:
    lines: list[str] = [
        "# Dating Coach — Evaluation Report",
        "",
        f"_Generated: {quality.get('generated_at') or datetime.now(timezone.utc).isoformat()}_",
        "",
        "## Summary",
        "",
        f"- **Quality suite**: **{quality['pass_count']}/{quality['total']} passed** "
        f"({quality['pass_rate']}%) — status `{quality['status']}`",
        f"- **Mode**: {quality.get('mode')}",
        f"- **Retrieval (hash)**: Hit@{retrieval['hash']['top_k']} = "
        f"**{retrieval['hash']['hit_at_k']:.1%}**, "
        f"MRR = **{retrieval['hash']['mrr']:.3f}** "
        f"({retrieval['hash']['query_count']} queries)",
    ]
    if retrieval.get("minilm"):
        m = retrieval["minilm"]
        lines.append(
            f"- **Retrieval (minilm)**: Hit@{m['top_k']} = **{m['hit_at_k']:.1%}**, "
            f"MRR = **{m['mrr']:.3f}**"
        )
    else:
        lines.append(f"- **Retrieval (minilm)**: {retrieval.get('minilm_note')}")
    lines.extend(
        [
            "",
            "## Quality cases",
            "",
            "| ID | Category | Result | Reason |",
            "|----|----------|--------|--------|",
        ]
    )
    for row in quality.get("results") or []:
        mark = {"pass": "✅", "fail": "❌", "incomplete": "⏸️"}.get(row["status"], row["status"])
        lines.append(
            f"| `{row['id']}` | {row['category']} | {mark} {row['status']} | "
            f"{_md_escape(row['reason'])} |"
        )

    lines.extend(
        [
            "",
            "## Retrieval queries (hash embedder)",
            "",
            "| ID | Hit@k | RR | Top sources | Query |",
            "|----|-------|----|-------------|-------|",
        ]
    )
    for row in retrieval["hash"].get("queries") or []:
        hit = "✅" if row["hit_at_k"] else "❌"
        tops = ", ".join(row.get("top_sources") or []) or "—"
        lines.append(
            f"| `{row['id']}` | {hit} | {row['reciprocal_rank']:.2f} | "
            f"{_md_escape(tops)} | {_md_escape(row['query'])} |"
        )

    lines.extend(
        [
            "",
            "## How to re-run",
            "",
            "```bash",
            "source .venv/bin/activate",
            "DATING_COACH_EMBEDDER=hash python -m backend.app.eval.report",
            "# optional MiniLM compare (needs pip install -e '.[embed]'):",
            "# DATING_COACH_EMBEDDER=hash python -m backend.app.eval.report",
            "```",
            "",
            "Report writes to `docs/EVAL.md` by default. Deterministic mode mocks the LLM;",
            "retrieval metrics use the real local FAISS index built from `data/knowledge/`.",
            "",
        ]
    )
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Dating Coach quality + retrieval eval report")
    parser.add_argument(
        "--out",
        type=Path,
        default=REPO / "docs" / "EVAL.md",
        help="Markdown output path (default: docs/EVAL.md)",
    )
    parser.add_argument("--skip-retrieval", action="store_true")
    parser.add_argument("--skip-quality", action="store_true")
    args = parser.parse_args(argv)

    quality = (
        run_quality_suite()
        if not args.skip_quality
        else {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "mode": "skipped",
            "status": "incomplete",
            "pass_count": 0,
            "fail_count": 0,
            "incomplete_count": 0,
            "total": 0,
            "pass_rate": 0.0,
            "results": [],
        }
    )
    retrieval = (
        evaluate_retrieval_compare()
        if not args.skip_retrieval
        else {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "hash": {"top_k": 4, "hit_at_k": 0.0, "mrr": 0.0, "query_count": 0, "queries": []},
            "minilm": None,
            "minilm_note": "skipped",
        }
    )
    markdown = render_markdown(quality, retrieval)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(markdown, encoding="utf-8")
    print(f"Wrote {args.out}")

    # Mirror for the Vite demo UI (footer badge + /EVAL.md).
    if PUBLIC_DIR.is_dir():
        (PUBLIC_DIR / "EVAL.md").write_text(markdown, encoding="utf-8")
        summary = {
            "generated_at": quality.get("generated_at"),
            "quality_pass": f"{quality['pass_count']}/{quality['total']}",
            "pass_rate": quality.get("pass_rate"),
            "status": quality.get("status"),
            "hit_at_4": retrieval["hash"].get("hit_at_k"),
            "mrr": retrieval["hash"].get("mrr"),
            "report_url": "/EVAL.md",
        }
        (PUBLIC_DIR / "eval-summary.json").write_text(
            json.dumps(summary, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"Wrote {PUBLIC_DIR / 'EVAL.md'} and eval-summary.json")

    print(
        f"Quality: {quality['pass_count']}/{quality['total']} "
        f"({quality['pass_rate']}%) status={quality['status']}"
    )
    print(
        f"Retrieval hash Hit@{retrieval['hash']['top_k']}="
        f"{retrieval['hash']['hit_at_k']:.1%} MRR={retrieval['hash']['mrr']:.3f}"
    )
    if quality.get("fail_count") or quality.get("incomplete_count"):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
