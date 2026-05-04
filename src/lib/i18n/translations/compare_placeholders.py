#!/usr/bin/env python3
"""
Comprehensive translation key comparator for en.ts and es.ts
Extracts ALL translation keys from the entire nested structure
"""

import re
import json
from typing import Set, Dict, List, Tuple, Any

def extract_all_keys_recursive(content: str, start_pos: int = 0, prefix: str = "") -> Set[str]:
    """
    Recursively extract all translation keys from TypeScript object literal
    Returns full dot-notation paths like "common.save", "auth.email", etc.
    """
    keys = set()
    
    # Find all top-level sections (common, auth, kyc, etc.)
    # Pattern matches "sectionName: {" 
    section_pattern = r'^(\w+):\s*\{'
    
    # Process the content line by line to handle nesting
    lines = content.split('\n')
    stack = []  # Track current path
    in_object = False
    brace_count = 0
    
    for line in lines:
        stripped = line.strip()
        
        # Skip comments and empty lines
        if not stripped or stripped.startswith('//'):
            continue
        
        # Track brace count to know nesting level
        brace_count += stripped.count('{') - stripped.count('}')
        
        # Look for key patterns
        # Match keys like: key: value, or key: { (for nested objects)
        key_match = re.match(r'^(\w+):', stripped)
        
        if key_match:
            key = key_match.group(1)
            
            # Skip known non-translation keys
            if key in ['locale', 'en', 'es']:
                continue
            
            # Build the full path
            current_path = '.'.join(stack + [key]) if stack else key
            keys.add(current_path)
            
            # If this opens a nested object, push to stack
            if '{' in stripped:
                stack.append(key)
        
        # When a closing brace reduces count, pop from stack
        # This is simplified - proper parsing would be better but works for this structure
        if '}' in stripped and brace_count >= 0 and stack:
            # Check if this line closes the current object
            if stripped == '}' or stripped == '},':
                stack.pop()
            elif stripped.endswith('},') and stripped.count('{') == 0:
                stack.pop()
    
    return keys

def extract_all_keys_simple(content: str) -> Set[str]:
    """
    Simpler approach: Extract all keys using regex and track nesting
    """
    keys = set()
    
    # Remove the export const line
    content = re.sub(r'export const \w+ = \{', '', content)
    
    # Track current path
    path_stack = []
    
    # Process character by character to handle nesting
    i = 0
    length = len(content)
    current_key = ""
    in_string = False
    string_char = None
    
    while i < length:
        char = content[i]
        
        # Handle string boundaries
        if char in ['"', "'"] and (i == 0 or content[i-1] != '\\'):
            if not in_string:
                in_string = True
                string_char = char
            elif char == string_char:
                in_string = False
        
        # Look for keys when not in a string
        if not in_string:
            # Key pattern: word followed by colon
            if char.isalpha() or char == '_':
                # Potential start of a key
                match = re.match(r'^([a-zA-Z_][a-zA-Z0-9_]*)\s*:', content[i:])
                if match:
                    key = match.group(1)
                    
                    # Skip locale and export names
                    if key not in ['locale', 'en', 'es']:
                        # Build full path
                        full_path = '.'.join(path_stack + [key]) if path_stack else key
                        keys.add(full_path)
                    
                    # Move past the key
                    i += match.end() - 1
            
            # Track object nesting
            if char == '{':
                # Don't push for the root object
                if path_stack or len(keys) > 0:
                    # Get the last added key as the new parent
                    if keys:
                        # This is simplified - we need to know what key opened this object
                        pass
            elif char == '}':
                if path_stack:
                    path_stack.pop()
        
        i += 1
    
    return keys

def extract_keys_with_regex(content: str) -> Set[str]:
    """
    Extract keys by matching patterns and handling nesting through indentation
    """
    keys = set()
    
    # Split into lines and track context
    lines = content.split('\n')
    context_stack = []
    
    for line in lines:
        # Skip empty lines and comments
        if not line.strip() or line.strip().startswith('//'):
            continue
        
        # Count indentation (spaces or tabs)
        indent = len(line) - len(line.lstrip())
        current_level = indent // 2  # Assuming 2 spaces per level
        
        # Adjust context stack based on indentation
        while len(context_stack) > current_level:
            context_stack.pop()
        
        # Look for key: value pattern
        match = re.match(r'^(\s*)(\w+):', line)
        if match:
            key = match.group(2)
            
            # Skip special keys
            if key in ['locale', 'en', 'es']:
                continue
            
            # Build full path
            if context_stack:
                full_path = '.'.join(context_stack + [key])
            else:
                full_path = key
            
            keys.add(full_path)
            
            # If this line opens an object (has '{' after the key), add to context
            if '{' in line.split(':')[1] if ':' in line else False:
                context_stack.append(key)
    
    return keys

def extract_keys_comprehensive(content: str) -> Dict[str, str]:
    """
    Extract all translation keys with their values
    Returns dict of key_path -> value
    """
    translations = {}
    
    # Remove the export const line
    content_clean = re.sub(r'^export const \w+ = ', '', content.strip())
    
    # Parse the object using a more robust approach
    lines = content_clean.split('\n')
    path_stack = []
    in_multiline_string = False
    multiline_string_char = None
    multiline_buffer = []
    
    i = 0
    while i < len(lines):
        line = lines[i]
        original_line = line
        line = line.strip()
        
        # Skip comments and empty lines
        if not line or line.startswith('//'):
            i += 1
            continue
        
        # Track multiline strings
        if not in_multiline_string:
            # Look for key pattern at the beginning of the line (no leading spaces)
            key_match = re.match(r'^(\w+):', line)
            if key_match:
                key = key_match.group(1)
                
                if key not in ['locale', 'en', 'es']:
                    # Determine current path
                    current_path = '.'.join(path_stack + [key]) if path_stack else key
                    
                    # Check if this key opens an object
                    if '{' in line:
                        # It's a nested object
                        translations[current_path] = None  # Mark as object
                        path_stack.append(key)
                    else:
                        # It's a value - extract it
                        value_part = line[key_match.end():].strip()
                        
                        # Check if it's the start of a multiline string
                        if value_part.startswith('"') and not value_part.endswith('"') and value_part.count('"') == 1:
                            in_multiline_string = True
                            multiline_string_char = '"'
                            multiline_buffer = [value_part]
                        elif value_part.startswith("'") and not value_part.endswith("'") and value_part.count("'") == 1:
                            in_multiline_string = True
                            multiline_string_char = "'"
                            multiline_buffer = [value_part]
                        else:
                            # Single line value
                            value_match = re.search(r'["\']([^"\']*)["\']', value_part)
                            if value_match:
                                translations[current_path] = value_match.group(1)
        else:
            # In a multiline string
            multiline_buffer.append(line)
            # Check if string ends on this line
            if multiline_string_char in line and line.rstrip().endswith(multiline_string_char):
                full_string = ' '.join(multiline_buffer)
                # Extract the quoted content
                value_match = re.search(rf'{multiline_string_char}([^{multiline_string_char}]*)', full_string)
                if value_match:
                    # For the current key (last added)
                    current_path = '.'.join(path_stack + [key]) if path_stack else key
                    translations[current_path] = value_match.group(1)
                in_multiline_string = False
                multiline_buffer = []
        
        # Track object closing
        if '}' in line and not in_multiline_string:
            # Count closing braces
            brace_count = line.count('}')
            for _ in range(brace_count):
                if path_stack:
                    path_stack.pop()
        
        i += 1
    
    return translations

def compare_translations(en_content: str, es_content: str) -> Dict[str, Any]:
    """
    Compare all translation keys between en.ts and es.ts
    """
    # Extract all keys with their values
    en_dict = extract_keys_comprehensive(en_content)
    es_dict = extract_keys_comprehensive(es_content)
    
    en_keys = set(en_dict.keys())
    es_keys = set(es_dict.keys())
    
    return {
        'en_keys': en_keys,
        'es_keys': es_keys,
        'en_dict': en_dict,
        'es_dict': es_dict,
        'only_in_en': en_keys - es_keys,
        'only_in_es': es_keys - en_keys,
        'common': en_keys & es_keys,
        'value_mismatches': {}  # Keys that exist in both but have different values
    }

def print_detailed_report(result: Dict[str, Any]):
    """
    Print detailed comparison report
    """
    print("=" * 80)
    print("TRANSLATION KEY COMPARATOR")
    print("Comparing ALL translation keys between en.ts and es.ts")
    print("=" * 80)
    
    print(f"\n📊 STATISTICS:")
    print(f"   {'-' * 40}")
    print(f"   Total keys in en.ts: {len(result['en_keys'])}")
    print(f"   Total keys in es.ts: {len(result['es_keys'])}")
    print(f"   Common keys: {len(result['common'])}")
    print(f"   Only in en.ts: {len(result['only_in_en'])}")
    print(f"   Only in es.ts: {len(result['only_in_es'])}")
    
    # Calculate completion
    total_unique = len(result['en_keys'] | result['es_keys'])
    matching = len(result['common'])
    completion = (matching / total_unique * 100) if total_unique > 0 else 0
    
    print(f"\n📈 COMPLETION:")
    print(f"   {'-' * 40}")
    print(f"   Matching rate: {completion:.1f}% ({matching}/{total_unique})")
    
    if not result['only_in_en'] and not result['only_in_es']:
        print("\n🎉 PERFECT! All translation keys exist in both files!")
    else:
        print("\n⚠️  MISMATCHES FOUND!")
        
        if result['only_in_en']:
            print(f"\n📌 Keys ONLY in en.ts ({len(result['only_in_en'])}):")
            print(f"   {'-' * 40}")
            for i, key in enumerate(sorted(result['only_in_en'])[:30], 1):
                value = result['en_dict'].get(key, 'N/A')
                display_value = value[:50] + "..." if value and len(value) > 50 else value
                print(f"   {i:3}. {key}")
                if value and value != 'N/A':
                    print(f"       Value: \"{display_value}\"")
            if len(result['only_in_en']) > 30:
                print(f"\n   ... and {len(result['only_in_en']) - 30} more keys")
        
        if result['only_in_es']:
            print(f"\n📌 Keys ONLY in es.ts ({len(result['only_in_es'])}):")
            print(f"   {'-' * 40}")
            for i, key in enumerate(sorted(result['only_in_es'])[:30], 1):
                value = result['es_dict'].get(key, 'N/A')
                display_value = value[:50] + "..." if value and len(value) > 50 else value
                print(f"   {i:3}. {key}")
                if value and value != 'N/A':
                    print(f"       Value: \"{display_value}\"")
            if len(result['only_in_es']) > 30:
                print(f"\n   ... and {len(result['only_in_es']) - 30} more keys")
    
    # Show sample of common keys to verify extraction worked
    print("\n" + "=" * 80)
    print("📋 SAMPLE COMMON KEYS (first 20):")
    print("-" * 40)
    for i, key in enumerate(sorted(result['common'])[:20], 1):
        en_val = result['en_dict'].get(key, 'N/A')
        es_val = result['es_dict'].get(key, 'N/A')
        en_display = en_val[:30] + "..." if en_val and len(en_val) > 30 else en_val
        es_display = es_val[:30] + "..." if es_val and len(es_val) > 30 else es_val
        print(f"   {i:2}. {key}")
        print(f"       en: \"{en_display}\"")
        print(f"       es: \"{es_display}\"")
    
    # Option to see all missing keys
    if result['only_in_en'] or result['only_in_es']:
        print("\n" + "=" * 80)
        show_all = input("\nShow all missing keys? (y/n): ").lower().strip()
        if show_all == 'y':
            if result['only_in_en']:
                print("\n🔴 Missing in es.ts (all):")
                for key in sorted(result['only_in_en']):
                    print(f"  • {key}")
            if result['only_in_es']:
                print("\n🔴 Missing in en.ts (all):")
                for key in sorted(result['only_in_es']):
                    print(f"  • {key}")

def main():
    try:
        with open('en.ts', 'r', encoding='utf-8') as f:
            en_content = f.read()
        
        with open('es.ts', 'r', encoding='utf-8') as f:
            es_content = f.read()
        
        result = compare_translations(en_content, es_content)
        print_detailed_report(result)
        
    except FileNotFoundError as e:
        print(f"\n❌ Error: {e}")
        print("Make sure both en.ts and es.ts are in the current directory")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
