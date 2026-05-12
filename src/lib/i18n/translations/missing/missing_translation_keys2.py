#!/usr/bin/env python3
"""
check_missing_translation_keys.py
──────────────────────────────────
Scan all source files under /src for translation key usage and verify
that every referenced key exists in the translation file.

Also produces a patched copy of the translation file with all missing keys
inserted into the correct namespace, using the last key segment as a
human-readable English placeholder and marked with // NEW ADDITION.

Usage:
    python check_missing_translation_keys.py                        # defaults
    python check_missing_translation_keys.py en.ts src/             # custom paths
    python check_missing_translation_keys.py en.ts src/ report.txt  # custom output

Positional args (all optional):
    1. path to translation file  (default: src/locales/en.ts)
    2. path to src directory     (default: src)
    3. output report file        (default: missing_translation_keys.txt)

Output files:
    <output_file>                   — plain-text report listing missing keys
    <translation_file>.patched.ts   — copy of the translation file with missing
                                      keys inserted and marked as new additions

Insertion behaviour:
    - Keys are grouped into a tree so sibling keys share a single new block.
    - If the namespace block already exists in the file, new keys are inserted
      inside it (recursively, at any depth).
    - If the namespace doesn't exist, a new properly-indented block is appended
      before the parent's closing brace.
    - The placeholder value is derived from the leaf segment converted from
      camelCase to Title Case: "loginButton" → "Login Button".
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

SEARCH_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte"}
SKIP_DIRS = {"node_modules", ".git", "dist", "build", ".next", ".nuxt", "__pycache__"}
SKIP_TRANSLATION_FILE = True

# Comment appended to every inserted missing key line
REVISION_COMMENT = "// NEW ADDITION"

# ── Key detection regexes ─────────────────────────────────────────────────────

KEY_CALL_PATTERN = re.compile(
    r"""(?:^|[\s(,=:])"""
    r"""\$?(?:\w+\.)*t\s*\(\s*"""
    r"""(?:["'`])"""
    r"""([a-zA-Z_$][a-zA-Z0-9_$]*"""
    r"""(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)"""
    r"""(?:["'`])"""
    r"""\s*[,)]""",
    re.MULTILINE,
)

BARE_STRING_PATTERN = re.compile(
    r"""["'`]([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]+)+)["'`]"""
)

MIN_SEGMENTS_FOR_BARE = 2


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _camel_to_words(name: str) -> str:
    """'loginButton' → 'Login Button'"""
    return re.sub(r"([A-Z])", r" \1", name).strip().title()


def _detect_indent(content: str) -> str:
    """Detect the indentation unit (spaces or tab) from file content."""
    for line in content.splitlines():
        m = re.match(r"^(\s+)\S", line)
        if m:
            raw = m.group(1)
            return "\t" if "\t" in raw else " " * len(raw)
    return "  "


# ──────────────────────────────────────────────────────────────────────────────
# Translation file parsing
# ──────────────────────────────────────────────────────────────────────────────

def _extract_balanced_braces(s: str, start: int) -> str:
    assert s[start] == "{"
    depth = 0
    for i in range(start, len(s)):
        if s[i] == "{":   depth += 1
        elif s[i] == "}":
            depth -= 1
            if depth == 0: return s[start : i + 1]
    raise ValueError("Unbalanced braces in translation object.")


def _read_key_token(s: str, pos: int):
    if pos >= len(s): return None, pos
    if s[pos] in ('"', "'", "`"):
        q = s[pos]; end = s.index(q, pos + 1)
        return s[pos + 1 : end], end + 1
    m = re.match(r"[a-zA-Z_$][a-zA-Z0-9_$]*", s[pos:])
    if m: return m.group(), pos + len(m.group())
    return None, pos


def _skip_value(s: str, pos: int) -> int:
    if pos >= len(s): return pos
    if s[pos] in ('"', "'", "`"):
        q = s[pos]; pos += 1
        while pos < len(s):
            if s[pos] == "\\": pos += 2; continue
            if s[pos] == q: return pos + 1
            pos += 1
        return pos
    m = re.match(r"[^,}\n]+", s[pos:])
    if m: return pos + len(m.group())
    return pos + 1


def _collect_keys(obj_str: str, prefix: str, keys: set):
    inner = obj_str[1:-1].strip(); pos = 0
    while pos < len(inner):
        while pos < len(inner) and inner[pos] in " \t\n\r": pos += 1
        if pos >= len(inner): break
        key, pos = _read_key_token(inner, pos)
        if key is None: break
        while pos < len(inner) and inner[pos] in " \t\n\r": pos += 1
        if pos >= len(inner) or inner[pos] != ":": break
        pos += 1
        while pos < len(inner) and inner[pos] in " \t\n\r": pos += 1
        if pos >= len(inner): break
        full_key = f"{prefix}.{key}" if prefix else key
        if inner[pos] == "{":
            nested = _extract_balanced_braces(inner, pos)
            _collect_keys(nested, full_key, keys)
            pos += len(nested)
        else:
            keys.add(full_key)
            pos = _skip_value(inner, pos)
        while pos < len(inner) and inner[pos] in " \t\n\r,": pos += 1


def load_translation_keys(filepath: str, export_name: str) -> set:
    """Return the set of all dot-notation leaf keys in the translation file."""
    content = Path(filepath).read_text(encoding="utf-8")
    content = re.sub(r"//[^\n]*", "", content)
    content = re.sub(r"/\*.*?\*/", "", content, flags=re.DOTALL)
    m = re.search(r"export\s+const\s+" + re.escape(export_name) + r"\s*=\s*\{", content)
    if not m:
        raise ValueError(f"Could not find `export const {export_name} = {{` in {filepath}.")
    obj_str = _extract_balanced_braces(content, m.end() - 1)
    keys: set = set()
    _collect_keys(obj_str, "", keys)
    return keys


# ──────────────────────────────────────────────────────────────────────────────
# Source file scanning
# ──────────────────────────────────────────────────────────────────────────────

def extract_keys_from_source(content: str) -> set:
    found = set()
    for m in KEY_CALL_PATTERN.finditer(content):
        found.add(m.group(1))
    for m in BARE_STRING_PATTERN.finditer(content):
        key = m.group(1)
        if key.count(".") >= MIN_SEGMENTS_FOR_BARE - 1:
            found.add(key)
    return found


def scan_src_for_keys(src_dir: str, skip_file: str | None = None) -> dict:
    """
    Walk src_dir and return { dot_key: [(filepath, [line_numbers]), ...] }
    for every translation key referenced in source files.
    """
    skip_abs = os.path.abspath(skip_file) if skip_file else None
    occurrences: dict = defaultdict(lambda: defaultdict(set))

    for root, dirs, files in os.walk(src_dir):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fname in files:
            if Path(fname).suffix not in SEARCH_EXTENSIONS: continue
            fpath = os.path.join(root, fname)
            if skip_abs and os.path.abspath(fpath) == skip_abs: continue
            try:
                content = Path(fpath).read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            file_keys = extract_keys_from_source(content)
            if not file_keys: continue
            src_lines = content.splitlines()
            for key in file_keys:
                for lineno, line in enumerate(src_lines, 1):
                    if key in line:
                        occurrences[key][fpath].add(lineno)

    return {
        key: sorted((fp, sorted(lnos)) for fp, lnos in file_map.items())
        for key, file_map in occurrences.items()
    }


# ──────────────────────────────────────────────────────────────────────────────
# Patched translation file generation
# ──────────────────────────────────────────────────────────────────────────────

def _build_key_tree(keys: list) -> dict:
    """
    Convert a flat list of dot-notation keys into a nested dict tree.
    Leaf nodes have value None.
    e.g. ["auth.login", "auth.logout"] → {"auth": {"login": None, "logout": None}}
    """
    tree: dict = {}
    for key in sorted(keys):
        parts = key.split(".")
        node = tree
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = None
    return tree


def _serialize_subtree(seg: str, subtree, base_indent: str, unit: str, comment: str) -> list:
    """
    Recursively serialize a subtree node into a list of TS lines (no newlines).
    base_indent is the indentation for `seg` itself.
    """
    if subtree is None:
        return [f'{base_indent}{seg}: "{_camel_to_words(seg)}", {comment}']
    lines = [f"{base_indent}{seg}: {{"]
    for child_seg, child_tree in sorted(subtree.items()):
        lines.extend(_serialize_subtree(child_seg, child_tree, base_indent + unit, unit, comment))
    lines.append(f"{base_indent}}},")
    return lines


def _find_block_open(clean_lines: list, seg: str, search_from: int, search_to: int) -> int | None:
    """Find the line index of `  <seg>: {` within clean_lines[search_from:search_to]."""
    pat = re.compile(r"^\s*" + re.escape(seg) + r"\s*:\s*\{")
    for i in range(search_from, search_to):
        if pat.match(clean_lines[i]):
            return i
    return None


def _find_block_close(clean_lines: list, open_idx: int) -> int:
    """Return the line index of the closing `}` matching the block opened at open_idx."""
    depth = 0
    for i in range(open_idx, len(clean_lines)):
        depth += clean_lines[i].count("{") - clean_lines[i].count("}")
        if depth <= 0:
            return i
    return len(clean_lines) - 1


def _find_export_close(clean_lines: list) -> int:
    """Find the last top-level `}` or `};` line."""
    for i in range(len(clean_lines) - 1, -1, -1):
        if re.match(r"^\s*\}\s*;?\s*$", clean_lines[i]):
            return i
    return len(clean_lines) - 1


def _walk_tree(
    tree: dict,
    clean_lines: list,
    insertions: list,
    search_from: int,
    search_to: int,
    depth: int,
    indent_unit: str,
    comment: str,
):
    """
    Recursively walk the missing-key tree and schedule insertions.
    - If a namespace block already exists in the file → recurse inside it.
    - If it doesn't exist → serialize the whole subtree and insert it before
      the current scope's closing brace.
    """
    for seg, subtree in sorted(tree.items()):
        base_indent = indent_unit * (depth + 1)
        if subtree is None:
            # Leaf: insert `key: "Placeholder", // TODO` before parent's close
            line = f'{base_indent}{seg}: "{_camel_to_words(seg)}", {comment}'
            insertions.append((search_to, line))
        else:
            open_idx = _find_block_open(clean_lines, seg, search_from, search_to)
            if open_idx is not None:
                # Block exists — recurse inside it
                close_idx = _find_block_close(clean_lines, open_idx)
                _walk_tree(subtree, clean_lines, insertions, open_idx + 1, close_idx, depth + 1, indent_unit, comment)
            else:
                # Block doesn't exist — serialize and insert before current close
                block_lines = _serialize_subtree(seg, subtree, base_indent, indent_unit, comment)
                insertions.append((search_to, "\n".join(block_lines)))


def insert_missing_keys(original: str, missing_keys: list, comment: str) -> str:
    """
    Return a patched copy of the translation file content with all missing keys
    inserted into their correct namespace positions, marked with `comment`.
    """
    indent_unit = _detect_indent(original)
    clean = [l.rstrip("\n").rstrip("\r") for l in original.splitlines()]

    tree = _build_key_tree(missing_keys)
    insertions: list = []  # (insert_before_this_line_idx, text)

    export_close = _find_export_close(clean)
    _walk_tree(tree, clean, insertions, 0, export_close, depth=0, indent_unit=indent_unit, comment=comment)

    # Apply in reverse so earlier insertions don't shift later indices
    insertions.sort(key=lambda x: x[0], reverse=True)
    for line_idx, text in insertions:
        clean.insert(line_idx, text)

    return "\n".join(clean) + "\n"


def patched_filepath(translation_file: str) -> str:
    p = Path(translation_file)
    return str(p.with_name(p.stem + ".patched" + p.suffix))


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main():
    translation_file = sys.argv[1] if len(sys.argv) > 1 else TRANSLATION_FILE
    src_dir          = sys.argv[2] if len(sys.argv) > 2 else SRC_DIR
    output_file      = sys.argv[3] if len(sys.argv) > 3 else OUTPUT_FILE
    patched_file     = patched_filepath(translation_file)

    if not os.path.isfile(translation_file):
        print(f"[ERROR] Translation file not found: {translation_file}", file=sys.stderr)
        sys.exit(1)
    if not os.path.isdir(src_dir):
        print(f"[ERROR] Source directory not found: {src_dir}", file=sys.stderr)
        sys.exit(1)

    print(f"Translation file : {translation_file}")
    print(f"Source directory : {src_dir}")
    print(f"Report           : {output_file}")
    print(f"Patched copy     : {patched_file}")
    print()

    print("[1/4] Loading translation keys...")
    known_keys = load_translation_keys(translation_file, TRANSLATION_EXPORT_NAME)
    print(f"      {len(known_keys)} keys in translation file")

    print("\n[2/4] Scanning source files for key usage...")
    skip = translation_file if SKIP_TRANSLATION_FILE else None
    src_keys = scan_src_for_keys(src_dir, skip_file=skip)
    print(f"      {len(src_keys)} unique keys referenced in source")

    missing = {k: v for k, v in src_keys.items() if k not in known_keys}
    present = {k: v for k, v in src_keys.items() if k in known_keys}

    print(f"\n[3/4] Writing report to {output_file}...")
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
                report_lines.append(
                    f"      {filepath}  (line{'s' if len(linenos) > 1 else ''} {lines_str})"
                )
        report_lines.append("")
    else:
        report_lines.append(
            "All keys referenced in source files exist in the translation file."
        )
    Path(output_file).write_text("\n".join(report_lines) + "\n", encoding="utf-8")

    print(f"\n[4/4] Writing patched translation file to {patched_file}...")
    original_content = Path(translation_file).read_text(encoding="utf-8")
    if missing:
        patched_content = insert_missing_keys(original_content, list(missing.keys()), REVISION_COMMENT)
    else:
        patched_content = original_content
    Path(patched_file).write_text(patched_content, encoding="utf-8")

    print()
    print(f"  ✓ Present : {len(present)}")
    print(f"  ✗ Missing : {len(missing)}")
    print(f"  Report    : {output_file}")
    print(f"  Patched   : {patched_file}  ({len(missing)} keys inserted)")


if __name__ == "__main__":
    main()
