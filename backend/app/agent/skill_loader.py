"""
Skill Loader System
===================
Dynamically loads skills and documentation for AI agents.
"""
import os
import re
import json
import sys
from pathlib import Path
from typing import Optional


# Base paths - these work both in dev and packaged app
if getattr(sys, 'frozen', False):
    # PyInstaller bundled app
    BASE_DIR = Path(sys._MEIPASS)
else:
    BASE_DIR = Path(__file__).parent.parent.parent.parent

SKILLS_DIR = BASE_DIR / "skills"
AMIS_DOCS_DIR = BASE_DIR / "amis_docs"

# Skill cache
_skill_cache: dict = {}


def load_skill(skill_name: str) -> str:
    """
    Load a skill file by name (without .md extension).

    Args:
        skill_name: e.g., "amis-json" → loads skills/amis-json.md

    Returns:
        The content of the skill file
    """
    if skill_name in _skill_cache:
        return _skill_cache[skill_name]

    skill_path = SKILLS_DIR / f"{skill_name}.md"
    if not skill_path.exists():
        print(f"[SkillLoader] Skill not found: {skill_path}")
        return ""

    content = skill_path.read_text(encoding="utf-8")
    _skill_cache[skill_name] = content
    print(f"[SkillLoader] Loaded skill: {skill_name}")
    return content


def load_amis_doc(doc_path: str) -> str:
    """
    Load an amis documentation file.

    Args:
        doc_path: Relative path within amis_docs, e.g., "components/button.md"
                 or "components/form/index.md"

    Returns:
        The content of the doc file
    """
    full_path = AMIS_DOCS_DIR / doc_path
    if not full_path.exists():
        print(f"[SkillLoader] Doc not found: {full_path}")
        return ""

    content = full_path.read_text(encoding="utf-8")
    print(f"[SkillLoader] Loaded doc: {doc_path}")
    return content


def find_relevant_docs(keywords: list[str], max_docs: int = 5) -> dict[str, str]:
    """
    Find amis documentation files relevant to the given keywords.

    Args:
        keywords: List of keywords to search for (e.g., ["button", "table", "form"])
        max_docs: Maximum number of docs to return

    Returns:
        Dict mapping doc paths to their content (truncated)
    """
    if not keywords:
        return {}

    amis_docs = {}
    components_dir = AMIS_DOCS_DIR / "components"

    if not components_dir.exists():
        return {}

    # Search component docs
    keyword_map = {
        "button": ["button.md", "button-group.md", "dropdown-button.md"],
        "form": ["form/index.md", "input-text.md", "input-number.md", "select.md", "checkbox.md", "radios.md", "switch.md"],
        "table": ["table.md", "crud.md"],
        "crud": ["crud.md"],
        "list": ["list.md", "cards.md"],
        "card": ["cards.md", "card.md"],
        "chart": ["chart.md"],
        "dialog": ["dialog.md", "modal.md", "drawer.md"],
        "modal": ["modal.md"],
        "drawer": ["drawer.md"],
        "tabs": ["tabs.md"],
        "page": ["page.md"],
        "grid": ["grid.md", "flex.md"],
        "flex": ["flex.md"],
        "input": ["form/index.md"],
        "select": ["form/select.md"],
        "date": ["form/input-date.md"],
        "tree": ["form/input-tree.md"],
        "image": ["form/input-image.md"],
        "file": ["form/input-file.md"],
        "rich": ["form/input-rich-text.md"],
        "editor": ["form/editor.md", "form/diff-editor.md"],
        "mapping": ["mapping.md"],
        "progress": ["progress.md"],
        "status": ["status.md"],
        "tags": ["tags.md"],
        "divider": ["divider.md"],
        "collapse": ["collapse.md"],
        "carousel": ["carousel.md"],
    }

    found_docs = set()
    for keyword in keywords:
        keyword_lower = keyword.lower()
        if keyword_lower in keyword_map:
            for doc in keyword_map[keyword_lower]:
                if doc not in found_docs:
                    content = load_amis_doc(f"components/{doc}")
                    if content:
                        # Truncate long docs to first 2000 chars
                        if len(content) > 2000:
                            content = content[:2000] + "\n\n... (文档已截断) ..."
                        amis_docs[f"components/{doc}"] = content
                        found_docs.add(doc)
                        if len(amis_docs) >= max_docs:
                            break
        else:
            # Fallback: search all docs for the keyword
            for md_file in components_dir.rglob("*.md"):
                if len(amis_docs) >= max_docs:
                    break
                rel_path = md_file.relative_to(AMIS_DOCS_DIR)
                if str(rel_path) in found_docs:
                    continue
                try:
                    content = md_file.read_text(encoding="utf-8")
                    if keyword_lower in content.lower():
                        if len(content) > 2000:
                            content = content[:2000] + "\n\n... (文档已截断) ..."
                        amis_docs[str(rel_path)] = content
                        found_docs.add(str(rel_path))
                except Exception:
                    pass

    return amis_docs


def build_skill_context(
    skill_names: list[str],
    keywords: Optional[list[str]] = None,
    include_docs: bool = True
) -> str:
    """
    Build a complete context string from skills and relevant docs.

    Args:
        skill_names: List of skill names to load (without .md)
        keywords: Keywords to find relevant docs (optional)
        include_docs: Whether to include relevant docs

    Returns:
        Combined context string
    """
    context_parts = []

    # Load skills
    for skill_name in skill_names:
        content = load_skill(skill_name)
        if content:
            context_parts.append(f"\n\n=== Skill: {skill_name} ===\n\n{content}")

    # Load relevant docs
    if include_docs and keywords:
        docs = find_relevant_docs(keywords)
        for doc_path, content in docs.items():
            context_parts.append(f"\n\n=== Doc: {doc_path} ===\n\n{content}")

    return "\n".join(context_parts)

