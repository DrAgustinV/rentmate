#!/usr/bin/env python3
"""
Extract all translation keys from es.ts and save as CSV
"""

import re
import csv
from typing import Set, Dict, List

def extract_all_keys(content: str) -> Dict[str, str]:
    """
    Extract all translation keys with their values from TypeScript file
    Returns dict of key_path -> value
    """
    translations = {}
    
    # Remove the export const line
    content_clean = re.sub(r'^export const \w+ = ', '', content.strip())
    
    lines = content_clean.split('\n')
    path_stack = []
    in_multiline_string = False
    multiline_string_char = None
    multiline_buffer = []
    current_key = None
    
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
            # Look for key pattern at the beginning of the line
            key_match = re.match(r'^(\w+):', line)
            if key_match:
                current_key = key_match.group(1)
                
                if current_key not in ['locale']:
                    # Determine current path
                    current_path = '.'.join(path_stack + [current_key]) if path_stack else current_key
                    
                    # Check if this key opens an object
                    if '{' in line:
                        translations[current_path] = None  # Mark as object
                        path_stack.append(current_key)
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
                                # Might be a boolean, number, or null
                                if value_part in ['true', 'false', 'null']:
                                    translations[current_path] = value_part
                                elif value_part.isdigit():
                                    translations[current_path] = value_part
                                else:
                                    # Fallback - try to extract anything in quotes
                                    alt_match = re.search(r'["\']([^"\']*)["\']', line)
                                    if alt_match:
                                        translations[current_path] = alt_match.group(1)
        else:
            # In a multiline string
            multiline_buffer.append(line)
            # Check if string ends on this line
            if multiline_string_char in line and line.rstrip().endswith(multiline_string_char):
                full_string = ' '.join(multiline_buffer)
                # Extract the quoted content
                value_match = re.search(rf'{multiline_string_char}([^{multiline_string_char}]*)', full_string)
                if value_match and current_key:
                    current_path = '.'.join(path_stack + [current_key]) if path_stack else current_key
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

def flatten_dict(translations: Dict[str, str], parent_key: str = '', sep: str = '.') -> Dict[str, str]:
    """Flatten nested dictionary (already flattened but ensure consistency)"""
    return translations

def save_to_csv(translations: Dict[str, str], output_file: str = 'translation_keys_es.csv'):
    """Save translations to CSV file"""
    # Sort keys for better readability
    sorted_keys = sorted(translations.keys())
    
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['Key', 'English Value'])
        
        for key in sorted_keys:
            value = translations.get(key, '')
            # Clean up value for CSV (remove newlines, etc.)
            if value:
                value = value.replace('\n', ' ').replace('"', '""')
            writer.writerow([key, value])
    
    print(f"✅ Saved {len(translations)} translation keys to {output_file}")

def main():
    try:
        with open('es.ts', 'r', encoding='utf-8') as f:
            en_content = f.read()
        
        print("Extracting translation keys from es.ts...")
        translations = extract_all_keys(en_content)
        
        # Remove entries with None value (objects)
        translations = {k: v for k, v in translations.items() if v is not None}
        
        print(f"Found {len(translations)} translation keys")
        
        # Save to CSV
        save_to_csv(translations, 'translation_keys_es.csv')
        
        # Show sample
        print("\n📋 Sample keys:")
        for i, (key, value) in enumerate(list(translations.items())[:20], 1):
            display_value = value[:50] + "..." if len(value) > 50 else value
            print(f"   {i:3}. {key} = \"{display_value}\"")
        
        if len(translations) > 20:
            print(f"   ... and {len(translations) - 20} more keys")
        
    except FileNotFoundError:
        print("❌ Error: es.ts file not found in current directory")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
