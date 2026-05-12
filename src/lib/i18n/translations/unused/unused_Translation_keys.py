#!/usr/bin/env python3
"""
check_translation_keys.py
─────────────────────────
Walk a TypeScript translation file and report every dot-notation key
that is NOT referenced anywhere inside the /src directory.

Also produces a commented-out copy of the translation file where every
unused key's line is prefixed with `// UNUSED ·`.

Usage:
    python check_translation_keys.py                        # uses defaults below
    python check_translation_keys.py en.ts src/             # custom paths
    python check_translation_keys.py en.ts src/ report.txt  # custom output file

Positional args (all optional):
    1. path to translation file  (default: src/locales/en.ts)
    2. path to src directory     (default: src)
    3. output report file        (default: unused_translation_keys.txt)

Output files:
    <output_file>                  — plain-text report listing unused keys
    <translation_file>.annotated.ts — copy of translation file with unused
                                      key lines commented out
"""

import os
import re
import sys
from pathlib import Path

# ──────────────────────────────────────────────────────────────────────────────
# Configuration  (edit these or pass as CLI args)
# ──────────────────────────────────────────────────────────────────────────────

# TRANSLATION_FILE       = "/home/dragutin/projects/rentmate/src/lib/i18n/translations/en.ts"
TRANSLATION_FILE       = "/home/dragutin/projects/rentmate/src/lib/i18n/translations/es.ts"
# TRANSLATION_EXPORT_NAME = "en"          # the `export const <name> = {...}`
TRANSLATION_EXPORT_NAME = "es"          # the `export const <name> = {...}`
SRC_DIR                = "/home/dragutin/projects/rentmate/src"
OUTPUT_FILE            = "unused_translation_keys-Spanish.txt"
# OUTPUT_FILE            = "unused_translation_keys-English.txt"

# File extensions to scan inside SRC_DIR
SEARCH_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte"}

# Directories to skip while walking SRC_DIR
SKIP_DIRS = {"node_modules", ".git", "dist", "build", ".next", ".nuxt", "__pycache__"}

# Whether to also skip the translation file itself when searching
SKIP_TRANSLATION_FILE = True

# Prefix added to commented-out lines in the annotated file
COMMENT_PREFIX = "// UNUSED · "


# ──────────────────────────────────────────────────────────────────────────────
# Key extraction  (parse TS object → dot-notation leaf keys + char positions)
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
    m = re.match(r"[^,}\n]+", s[pos:])
    if m:
        return pos + len(m.group())
    return pos + 1


def _collect_keys(obj_str: str, offset: int, prefix: str, results: list):
    """
    Recursively walk a JS/TS object literal string and collect:
        (dot_key, abs_char_pos_of_key_start)
    `offset` is the absolute position of obj_str[0] inside the original file.
    """
    inner = obj_str[1:-1]           # strip surrounding {}
    inner_offset = offset + 1       # absolute position of inner[0]
    pos = 0

    while pos < len(inner):
        while pos < len(inner) and inner[pos] in " \t\n\r":
            pos += 1
        if pos >= len(inner):
            break

        key_start_abs = inner_offset + pos   # absolute position of the key
        key, pos = _read_key(inner, pos)
        if key is None:
            break

        while pos < len(inner) and inner[pos] in " \t\n\r":
            pos += 1
        if pos >= len(inner) or inner[pos] != ":":
            break
        pos += 1

        while pos < len(inner) and inner[pos] in " \t\n\r":
            pos += 1
        if pos >= len(inner):
            break

        full_key = f"{prefix}.{key}" if prefix else key

        if inner[pos] == "{":
            nested_str = _extract_balanced_braces(inner, pos)
            _collect_keys(nested_str, inner_offset + pos, full_key, results)
            pos += len(nested_str)
        else:
            results.append((full_key, key_start_abs))
            pos = _skip_value(inner, pos)

        while pos < len(inner) and inner[pos] in " \t\n\r,":
            pos += 1


def extract_keys_with_positions(filepath: str, export_name: str) -> tuple[list, str]:
    """
    Parse the translation file and return:
        ([(dot_key, abs_char_pos), ...], original_file_content)

    abs_char_pos points to the first character of the key token inside the
    *comment-stripped* content — we use it only to map keys → line numbers.
    We return both the stripped content (for position mapping) and keep the
    original untouched for writing.
    """
    original = Path(filepath).read_text(encoding="utf-8")

    # Strip comments for parsing only
    stripped = re.sub(r"//[^\n]*", "", original)
    stripped = re.sub(r"/\*.*?\*/", "", stripped, flags=re.DOTALL)

    pattern = re.compile(
        r"export\s+const\s+" + re.escape(export_name) + r"\s*=\s*\{"
    )
    m = pattern.search(stripped)
    if not m:
        raise ValueError(
            f"Could not find `export const {export_name} = {{` in {filepath}.\n"
            f"Check TRANSLATION_EXPORT_NAME in the script config."
        )

    obj_start = m.end() - 1
    obj_str = _extract_balanced_braces(stripped, obj_start)

    results: list = []
    _collect_keys(obj_str, obj_start, "", results)

    return results, stripped, original


def keys_to_line_numbers(key_positions: list, stripped_content: str) -> dict:
    """
    Convert absolute char positions to 1-based line numbers within stripped_content.
    Returns { dot_key: line_number }.
    """
    # Build cumulative line-start offsets
    line_starts = [0]
    for i, ch in enumerate(stripped_content):
        if ch == "\n":
            line_starts.append(i + 1)

    def char_to_line(pos: int) -> int:
        lo, hi = 0, len(line_starts) - 1
        while lo < hi:
            mid = (lo + hi + 1) // 2
            if line_starts[mid] <= pos:
                lo = mid
            else:
                hi = mid - 1
        return lo + 1  # 1-based

    return {key: char_to_line(pos) for key, pos in key_positions}


# ──────────────────────────────────────────────────────────────────────────────
# Usage search
# ──────────────────────────────────────────────────────────────────────────────

def is_key_used(key: str, src_dir: str, skip_file: str | None = None) -> bool:
    """
    Return True if `key` appears verbatim anywhere in a source file under src_dir.
    Covers t("key"), t('key'), bare string references, etc.
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
# Annotated file generation
# ──────────────────────────────────────────────────────────────────────────────

def build_annotated_file(
    original_content: str,
    unused_line_numbers: set,
    comment_prefix: str = COMMENT_PREFIX,
) -> str:
    """
    Return a copy of original_content where every line whose 1-based line number
    is in `unused_line_numbers` is prefixed with `comment_prefix`.

    Lines that are already pure comment lines are left untouched.
    """
    out_lines = []
    for lineno, line in enumerate(original_content.splitlines(keepends=True), start=1):
        if lineno in unused_line_numbers:
            # Preserve the original indentation; prefix just before the content
            stripped_line = line.lstrip()
            indent = line[: len(line) - len(stripped_line)]
            # Don't double-comment an already-commented line
            if stripped_line.startswith("//"):
                out_lines.append(line)
            else:
                out_lines.append(f"{indent}{comment_prefix}{stripped_line}")
        else:
            out_lines.append(line)
    return "".join(out_lines)


def annotated_filepath(translation_file: str) -> str:
    """Return e.g. `src/locales/en.annotated.ts` for `src/locales/en.ts`."""
    p = Path(translation_file)
    return str(p.with_name(p.stem + ".annotated" + p.suffix))


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main():
    translation_file = sys.argv[1] if len(sys.argv) > 1 else TRANSLATION_FILE
    src_dir          = sys.argv[2] if len(sys.argv) > 2 else SRC_DIR
    output_file      = sys.argv[3] if len(sys.argv) > 3 else OUTPUT_FILE
    annotated_file   = annotated_filepath(translation_file)

    # ── Validate paths ──────────────────────────────────────────────────────
    if not os.path.isfile(translation_file):
        print(f"[ERROR] Translation file not found: {translation_file}", file=sys.stderr)
        sys.exit(1)
    if not os.path.isdir(src_dir):
        print(f"[ERROR] Source directory not found: {src_dir}", file=sys.stderr)
        sys.exit(1)

    print(f"Translation file : {translation_file}")
    print(f"Source directory : {src_dir}")
    print(f"Report           : {output_file}")
    print(f"Annotated copy   : {annotated_file}")
    print()

    # ── Extract keys + line positions ───────────────────────────────────────
    print("[1/4] Extracting translation keys...")
    key_positions, stripped_content, original_content = extract_keys_with_positions(
        translation_file, TRANSLATION_EXPORT_NAME
    )
    key_to_line = keys_to_line_numbers(key_positions, stripped_content)
    keys = [kp[0] for kp in key_positions]
    print(f"      {len(keys)} keys found")

    # ── Check usage ─────────────────────────────────────────────────────────
    print("\n[2/4] Checking usage across source files...")
    skip = translation_file if SKIP_TRANSLATION_FILE else None
    used:   list = []
    unused: list = []

    for i, key in enumerate(keys, 1):
        if is_key_used(key, src_dir, skip_file=skip):
            used.append(key)
        else:
            unused.append(key)
        print(f"      {i}/{len(keys)}  ·  {len(unused)} unused so far   ", end="\r")

    print()

    # ── Write plain-text report ─────────────────────────────────────────────
    print(f"\n[3/4] Writing report to {output_file}...")
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

    # ── Write annotated copy ────────────────────────────────────────────────
    print(f"\n[4/4] Writing annotated translation file to {annotated_file}...")
    unused_lines: set = {key_to_line[k] for k in unused if k in key_to_line}
    annotated = build_annotated_file(original_content, unused_lines)
    Path(annotated_file).write_text(annotated, encoding="utf-8")

    # ── Summary ─────────────────────────────────────────────────────────────
    print()
    print(f"  ✓ Used    : {len(used)}")
    print(f"  ✗ Unused  : {len(unused)}")
    print(f"  Report    : {output_file}")
    print(f"  Annotated : {annotated_file}  ({len(unused_lines)} lines commented out)")


if __name__ == "__main__":
    main()
