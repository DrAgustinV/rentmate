#!/usr/bin/env python3
"""
check_translation_keys.py
─────────────────────────
Walk a TypeScript translation file and report every dot-notation key
that is NOT referenced anywhere inside the /src directory.

Usage:
    python check_translation_keys.py                        # uses defaults below
    python check_translation_keys.py en.ts src/             # custom paths
    python check_translation_keys.py en.ts src/ report.txt  # custom output file

Positional args (all optional):
    1. path to translation file  (default: src/locales/en.ts)
    2. path to src directory     (default: src)
    3. output report file        (default: unused_translation_keys.txt)
"""

import os
import re
import sys
from pathlib import Path

# ──────────────────────────────────────────────────────────────────────────────
# Configuration  (edit these or pass as CLI args)
# ──────────────────────────────────────────────────────────────────────────────

TRANSLATION_FILE       = "/home/dragutin/projects/rentmate/src/lib/i18n/translations/en.ts"
TRANSLATION_EXPORT_NAME = "en"          # the `export const <name> = {...}`
SRC_DIR                = "/home/dragutin/projects/rentmate/src"
OUTPUT_FILE            = "unused_translation_keys.txt"

# File extensions to scan inside SRC_DIR
SEARCH_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte"}

# Directories to skip while walking SRC_DIR
SKIP_DIRS = {"node_modules", ".git", "dist", "build", ".next", ".nuxt", "__pycache__"}

# Whether to also skip the translation file itself when searching
SKIP_TRANSLATION_FILE  = True


# ──────────────────────────────────────────────────────────────────────────────
# Key extraction
# ──────────────────────────────────────────────────────────────────────────────

def _extract_balanced_braces(s: str, start: int) -> str:
    """Return the substring from the `{` at `start` to its matching `}`."""
    assert s[start] == "{", f"Expected '{{' at position {start}, got {s[start]!r}"
    depth = 0
    for i in range(start, len(s)):
        if s[i] == "{":
            depth += 1
        elif s[i] == "}":
            depth -= 1
            if depth == 0:
                return s[start : i + 1]
    raise ValueError("Unbalanced braces in translation object — check for syntax errors.")


def _read_key(s: str, pos: int):
    """Read a JS object key (quoted string or bare identifier) at `pos`."""
    if pos >= len(s):
        return None, pos
    if s[pos] in ('"', "'", "`"):
        quote = s[pos]
        end = s.index(quote, pos + 1)
        return s[pos + 1 : end], end + 1
    m = re.match(r"[a-zA-Z_$][a-zA-Z0-9_$]*", s[pos:])
    if m:
        return m.group(), pos + len(m.group())
    return None, pos


def _skip_value(s: str, pos: int) -> int:
    """Skip past a primitive value (string / number / boolean literal)."""
    if pos >= len(s):
        return pos
    if s[pos] in ('"', "'", "`"):
        quote = s[pos]
        pos += 1
        while pos < len(s):
            if s[pos] == "\\":
                pos += 2
                continue
            if s[pos] == quote:
                return pos + 1
            pos += 1
        return pos
    # bare token (number, boolean, identifier)
    m = re.match(r"[^,}\n]+", s[pos:])
    if m:
        return pos + len(m.group())
    return pos + 1


def _collect_keys(obj_str: str, prefix: str, keys: list):
    """Recursively walk a JS/TS object literal and collect all leaf dot-keys."""
    inner = obj_str[1:-1].strip()
    pos = 0
    while pos < len(inner):
        # skip whitespace
        while pos < len(inner) and inner[pos] in " \t\n\r":
            pos += 1
        if pos >= len(inner):
            break

        key, pos = _read_key(inner, pos)
        if key is None:
            break

        # skip whitespace + colon
        while pos < len(inner) and inner[pos] in " \t\n\r":
            pos += 1
        if pos >= len(inner) or inner[pos] != ":":
            break
        pos += 1  # consume ':'

        # skip whitespace
        while pos < len(inner) and inner[pos] in " \t\n\r":
            pos += 1
        if pos >= len(inner):
            break

        full_key = f"{prefix}.{key}" if prefix else key

        if inner[pos] == "{":
            nested = _extract_balanced_braces(inner, pos)
            _collect_keys(nested, full_key, keys)
            pos += len(nested)
        else:
            keys.append(full_key)
            pos = _skip_value(inner, pos)

        # skip trailing comma/whitespace
        while pos < len(inner) and inner[pos] in " \t\n\r,":
            pos += 1


def extract_keys(filepath: str, export_name: str) -> list:
    """
    Parse `export const <export_name> = { ... }` in a TypeScript file and
    return all dot-notation leaf keys.
    """
    content = Path(filepath).read_text(encoding="utf-8")

    # strip comments
    content = re.sub(r"//[^\n]*", "", content)
    content = re.sub(r"/\*.*?\*/", "", content, flags=re.DOTALL)

    pattern = re.compile(
        r"export\s+const\s+" + re.escape(export_name) + r"\s*=\s*\{"
    )
    m = pattern.search(content)
    if not m:
        raise ValueError(
            f"Could not find `export const {export_name} = {{` in {filepath}.\n"
            f"Check TRANSLATION_EXPORT_NAME in the script config."
        )

    obj_str = _extract_balanced_braces(content, m.end() - 1)
    keys: list = []
    _collect_keys(obj_str, "", keys)
    return keys


# ──────────────────────────────────────────────────────────────────────────────
# Usage search
# ──────────────────────────────────────────────────────────────────────────────

def is_key_used(key: str, src_dir: str, skip_file: str | None = None) -> bool:
    """
    Return True if `key` (the exact dot-notation string) appears anywhere
    inside a source file under `src_dir`.

    This covers all common i18n patterns:
        t("common.save")   t('common.save')   t(`common.save`)
        i18n.t("common.save")
        useTranslation("common.save")
        "common.save"   (bare string reference in any context)
    """
    skip_abs = os.path.abspath(skip_file) if skip_file else None

    for root, dirs, files in os.walk(src_dir):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fname in files:
            if Path(fname).suffix not in SEARCH_EXTENSIONS:
                continue
            fpath = os.path.join(root, fname)
            if skip_abs and os.path.abspath(fpath) == skip_abs:
                continue
            try:
                content = Path(fpath).read_text(encoding="utf-8", errors="ignore")
                if key in content:
                    return True
            except OSError:
                continue
    return False


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main():
    translation_file = sys.argv[1] if len(sys.argv) > 1 else TRANSLATION_FILE
    src_dir          = sys.argv[2] if len(sys.argv) > 2 else SRC_DIR
    output_file      = sys.argv[3] if len(sys.argv) > 3 else OUTPUT_FILE

    # ── Validate paths ──────────────────────────────────────────────────────
    if not os.path.isfile(translation_file):
        print(f"[ERROR] Translation file not found: {translation_file}", file=sys.stderr)
        sys.exit(1)
    if not os.path.isdir(src_dir):
        print(f"[ERROR] Source directory not found: {src_dir}", file=sys.stderr)
        sys.exit(1)

    print(f"Translation file : {translation_file}")
    print(f"Source directory : {src_dir}")
    print(f"Output file      : {output_file}")
    print()

    # ── Extract keys ────────────────────────────────────────────────────────
    print("[1/3] Extracting translation keys...")
    keys = extract_keys(translation_file, TRANSLATION_EXPORT_NAME)
    print(f"      {len(keys)} keys found")

    # ── Check usage ─────────────────────────────────────────────────────────
    print("\n[2/3] Checking usage across source files...")
    skip = translation_file if SKIP_TRANSLATION_FILE else None
    used:   list = []
    unused: list = []

    for i, key in enumerate(keys, 1):
        if is_key_used(key, src_dir, skip_file=skip):
            used.append(key)
        else:
            unused.append(key)
        # inline progress
        print(f"      {i}/{len(keys)}  ·  {len(unused)} unused so far   ", end="\r")

    print()  # newline after progress

    # ── Write report ────────────────────────────────────────────────────────
    print(f"\n[3/3] Writing report to {output_file}...")
    lines = [
        "Unused Translation Keys",
        "=" * 60,
        f"Translation file : {translation_file}",
        f"Source directory : {src_dir}",
        f"Total keys       : {len(keys)}",
        f"Used keys        : {len(used)}",
        f"Unused keys      : {len(unused)}",
        "",
    ]
    if unused:
        lines.append("Keys NOT found in any source file:")
        lines.append("")
        for key in unused:
            lines.append(f"  {key}")
    else:
        lines.append("All keys are used — nothing to clean up.")

    Path(output_file).write_text("\n".join(lines) + "\n", encoding="utf-8")

    # ── Summary ─────────────────────────────────────────────────────────────
    print()
    print(f"  ✓ Used    : {len(used)}")
    print(f"  ✗ Unused  : {len(unused)}")
    print(f"  Report    : {output_file}")


if __name__ == "__main__":
    main()
