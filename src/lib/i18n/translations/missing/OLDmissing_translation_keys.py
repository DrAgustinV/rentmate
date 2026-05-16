#!/usr/bin/env python3
"""
check_missing_translation_keys.py
──────────────────────────────────
Scan all source files under /src for translation key usage and verify
that every referenced key exists in the translation file.

Missing keys (used in code but absent from the translation file) are
logged to a report file.

Usage:
    python check_missing_translation_keys.py                        # defaults
    python check_missing_translation_keys.py en.ts src/             # custom paths
    python check_missing_translation_keys.py en.ts src/ report.txt  # custom output

Positional args (all optional):
    1. path to translation file  (default: src/locales/en.ts)
    2. path to src directory     (default: src)
    3. output report file        (default: missing_translation_keys.txt)

Detection patterns (all configurable below):
    t("some.key")   t('some.key')   t(`some.key`)
    i18n.t("some.key")
    useTranslation("some.key")
    trans("some.key")
    $t("some.key")           ← Vue / Svelte
"""

import os
import re
import sys
from pathlib import Path
from collections import defaultdict

# ──────────────────────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────────────────────

TRANSLATION_FILE        = "/home/dragutin/projects/rentmate/src/lib/i18n/translations/en.ts"
TRANSLATION_EXPORT_NAME = "en"          # the `export const <name> = {...}`
SRC_DIR                 = "/home/dragutin/projects/rentmate/src"
OUTPUT_FILE             = "missing_translation_keys.txt"

# File extensions to scan
SEARCH_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte"}

# Directories to skip
SKIP_DIRS = {"node_modules", ".git", "dist", "build", ".next", ".nuxt", "__pycache__"}

# Whether to skip the translation file itself while scanning src
SKIP_TRANSLATION_FILE = True

# ── Key detection regex ────────────────────────────────────────────────────────
# Matches the string argument passed to any of these i18n call patterns:
#   t("a.b.c")   t('a.b.c')   $t("a.b.c")   i18n.t("a.b.c")
#   useTranslation("a.b.c")   trans("a.b.c")
#
# A valid translation key: dot-separated camelCase/snake_case segments,
# e.g.  "common.save"  "landing.carousel.rent.title"
#
# The regex captures the key string (without quotes) from inside the call.
KEY_CALL_PATTERN = re.compile(
    r"""(?:^|[\s(,=:])"""                # preceded by whitespace / punctuation
    r"""\$?(?:\w+\.)*t\s*\(\s*"""        # optional chain like i18n.t(  or  $t(
    r"""(?:["'`])"""                     # opening quote
    r"""([a-zA-Z_$][a-zA-Z0-9_$]*"""    # first segment
    r"""(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)"""  # additional .segment parts
    r"""(?:["'`])"""                     # closing quote
    r"""\s*[,)]""",                      # followed by comma or closing paren
    re.MULTILINE,
)

# Additional bare-string pattern: catches keys that appear as plain string
# literals but aren't necessarily inside a t() call — e.g. passed as a prop.
# Format: "namespace.key"  where there are at least 2 segments.
BARE_STRING_PATTERN = re.compile(
    r"""["'`]([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]+)+)["'`]"""
)

# Minimum number of dot-segments for a bare string to be considered a key.
# Set to 2 to avoid false positives on short strings like "en-US".
MIN_SEGMENTS_FOR_BARE = 2


# ──────────────────────────────────────────────────────────────────────────────
# Translation file parsing  (reused from check_translation_keys.py)
# ──────────────────────────────────────────────────────────────────────────────

def _extract_balanced_braces(s: str, start: int) -> str:
    assert s[start] == "{"
    depth = 0
    for i in range(start, len(s)):
        if s[i] == "{":
            depth += 1
        elif s[i] == "}":
            depth -= 1
            if depth == 0:
                return s[start : i + 1]
    raise ValueError("Unbalanced braces in translation object.")


def _read_key_token(s: str, pos: int):
    if pos >= len(s):
        return None, pos
    if s[pos] in ('"', "'", "`"):
        q = s[pos]
        end = s.index(q, pos + 1)
        return s[pos + 1 : end], end + 1
    m = re.match(r"[a-zA-Z_$][a-zA-Z0-9_$]*", s[pos:])
    if m:
        return m.group(), pos + len(m.group())
    return None, pos


def _skip_value(s: str, pos: int) -> int:
    if pos >= len(s):
        return pos
    if s[pos] in ('"', "'", "`"):
        q = s[pos]
        pos += 1
        while pos < len(s):
            if s[pos] == "\\":
                pos += 2
                continue
            if s[pos] == q:
                return pos + 1
            pos += 1
        return pos
    m = re.match(r"[^,}\n]+", s[pos:])
    if m:
        return pos + len(m.group())
    return pos + 1


def _collect_keys(obj_str: str, prefix: str, keys: set):
    inner = obj_str[1:-1].strip()
    pos = 0
    while pos < len(inner):
        while pos < len(inner) and inner[pos] in " \t\n\r":
            pos += 1
        if pos >= len(inner):
            break
        key, pos = _read_key_token(inner, pos)
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
            nested = _extract_balanced_braces(inner, pos)
            _collect_keys(nested, full_key, keys)
            pos += len(nested)
        else:
            keys.add(full_key)
            pos = _skip_value(inner, pos)
        while pos < len(inner) and inner[pos] in " \t\n\r,":
            pos += 1


def load_translation_keys(filepath: str, export_name: str) -> set:
    """Return a set of all dot-notation leaf keys from the translation file."""
    content = Path(filepath).read_text(encoding="utf-8")
    content = re.sub(r"//[^\n]*", "", content)
    content = re.sub(r"/\*.*?\*/", "", content, flags=re.DOTALL)

    m = re.search(
        r"export\s+const\s+" + re.escape(export_name) + r"\s*=\s*\{", content
    )
    if not m:
        raise ValueError(
            f"Could not find `export const {export_name} = {{` in {filepath}.\n"
            f"Check TRANSLATION_EXPORT_NAME in the script config."
        )

    obj_str = _extract_balanced_braces(content, m.end() - 1)
    keys: set = set()
    _collect_keys(obj_str, "", keys)
    return keys


# ──────────────────────────────────────────────────────────────────────────────
# Source file scanning
# ──────────────────────────────────────────────────────────────────────────────

def extract_keys_from_source(content: str) -> set:
    """
    Return all translation key strings found in a single source file's content.
    Uses KEY_CALL_PATTERN (t("...") style) as the primary detector, and
    BARE_STRING_PATTERN as a secondary catch-all for prop-passed keys.
    """
    found = set()

    for m in KEY_CALL_PATTERN.finditer(content):
        found.add(m.group(1))

    for m in BARE_STRING_PATTERN.finditer(content):
        key = m.group(1)
        if key.count(".") >= MIN_SEGMENTS_FOR_BARE - 1:
            found.add(key)

    return found


def scan_src_for_keys(
    src_dir: str,
    skip_file: str | None = None,
) -> dict:
    """
    Walk src_dir and collect all translation keys referenced in source files.

    Returns:
        { dot_key: [ (filepath, [line_numbers]), ... ] }
    """
    skip_abs = os.path.abspath(skip_file) if skip_file else None
    # key → {filepath → set of line numbers}
    occurrences: dict = defaultdict(lambda: defaultdict(set))

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
            except OSError:
                continue

            file_keys = extract_keys_from_source(content)
            if not file_keys:
                continue

            # Map each found key to the line numbers where it appears
            lines = content.splitlines()
            for key in file_keys:
                for lineno, line in enumerate(lines, 1):
                    if key in line:
                        occurrences[key][fpath].add(lineno)

    # Convert inner defaultdicts to plain sorted lists
    result = {}
    for key, file_map in occurrences.items():
        result[key] = sorted(
            (fp, sorted(lnos)) for fp, lnos in file_map.items()
        )
    return result


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main():
    translation_file = sys.argv[1] if len(sys.argv) > 1 else TRANSLATION_FILE
    src_dir          = sys.argv[2] if len(sys.argv) > 2 else SRC_DIR
    output_file      = sys.argv[3] if len(sys.argv) > 3 else OUTPUT_FILE

    # ── Validate ────────────────────────────────────────────────────────────
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

    # ── Load known keys ─────────────────────────────────────────────────────
    print("[1/3] Loading translation keys...")
    known_keys = load_translation_keys(translation_file, TRANSLATION_EXPORT_NAME)
    print(f"      {len(known_keys)} keys in translation file")

    # ── Scan source files ────────────────────────────────────────────────────
    print("\n[2/3] Scanning source files for key usage...")
    skip = translation_file if SKIP_TRANSLATION_FILE else None
    src_keys = scan_src_for_keys(src_dir, skip_file=skip)
    print(f"      {len(src_keys)} unique keys referenced in source")

    # ── Classify ─────────────────────────────────────────────────────────────
    missing = {k: v for k, v in src_keys.items() if k not in known_keys}
    present = {k: v for k, v in src_keys.items() if k in known_keys}

    # ── Write report ─────────────────────────────────────────────────────────
    print(f"\n[3/3] Writing report to {output_file}...")

    report_lines = [
        "Missing Translation Keys",
        "=" * 60,
        f"Translation file   : {translation_file}",
        f"Source directory   : {src_dir}",
        f"Keys in trans file : {len(known_keys)}",
        f"Keys used in src   : {len(src_keys)}",
        f"Present            : {len(present)}",
        f"Missing            : {len(missing)}",
        "",
    ]

    if missing:
        report_lines.append(
            "The following keys are referenced in source files but "
            "DO NOT exist in the translation file:"
        )
        report_lines.append("")
        for key in sorted(missing):
            report_lines.append(f"  {key}")
            for filepath, linenos in missing[key]:
                lines_str = ", ".join(str(n) for n in linenos)
                report_lines.append(f"      {filepath}  (line{'s' if len(linenos)>1 else ''} {lines_str})")
        report_lines.append("")
    else:
        report_lines.append(
            "All keys referenced in source files exist in the translation file."
        )

    Path(output_file).write_text("\n".join(report_lines) + "\n", encoding="utf-8")

    # ── Summary ──────────────────────────────────────────────────────────────
    print()
    print(f"  ✓ Present : {len(present)}")
    print(f"  ✗ Missing : {len(missing)}")
    print(f"  Report    : {output_file}")

    if missing:
        print()
        print("Missing keys:")
        for key in sorted(missing):
            print(f"    {key}")


if __name__ == "__main__":
    main()
