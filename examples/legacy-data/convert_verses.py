#!/usr/bin/env python3
"""
Convert legacy Laravel Bible Memory verses from SQL dump to JSON format
for import into the new Bible Memory PWA.

Usage:
    python3 convert_verses.py

Input:  laravel_demo_biblememory_2025-11-02.sql
Output: converted-verses.json
"""

import re
import json
from datetime import datetime
from typing import Optional, List, Dict, Any


def parse_sql_value(value: str) -> Optional[str]:
    """Parse a SQL value, handling NULL and quoted strings."""
    if value == 'NULL':
        return None
    # Remove quotes and unescape
    if value.startswith("'") and value.endswith("'"):
        value = value[1:-1]
        # Unescape SQL escapes
        value = value.replace("\\'", "'")
        value = value.replace("\\r\\n", "\n")
        value = value.replace("\\r", "\n")
        value = value.replace("\\n", "\n")
        value = value.replace("\\\\", "\\")
    return value


def mysql_timestamp_to_epoch_ms(timestamp_str: Optional[str]) -> Optional[int]:
    """Convert MySQL timestamp to epoch milliseconds."""
    if timestamp_str is None:
        return None
    try:
        # Parse MySQL timestamp format: "2010-03-13 00:00:00"
        dt = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")
        return int(dt.timestamp() * 1000)
    except (ValueError, AttributeError):
        return None


def extract_translation(reference: str) -> tuple[str, str]:
    """
    Extract translation from reference if present in parentheses.
    
    Examples:
        "John 3:16 (NIV)" -> ("John 3:16", "NIV")
        "John 3:16" -> ("John 3:16", "KJV")
    """
    match = re.search(r'\(([^)]+)\)\s*$', reference)
    if match:
        translation = match.group(1).strip()
        clean_reference = reference[:match.start()].strip()
        return clean_reference, translation
    return reference, "KJV"


def parse_tags(tags_str: str) -> List[Dict[str, str]]:
    """
    Parse comma-separated tags into structured array.
    
    Examples:
        "fast.sk=3, personal, ss=2010.Q2.W01"
        -> [{"key": "fast.sk", "value": "3"}, {"key": "personal", "value": ""}, ...]
    """
    if not tags_str or tags_str.strip() == '':
        return []
    
    tags = []
    for tag in tags_str.split(','):
        tag = tag.strip()
        if not tag:
            continue
        
        if '=' in tag:
            key, value = tag.split('=', 1)
            tags.append({
                "key": key.strip(),
                "value": value.strip()
            })
        else:
            tags.append({
                "key": tag,
                "value": ""
            })
    
    return tags


def map_review_category(review_cat: str) -> str:
    """Map legacy review categories to new format."""
    mapping = {
        'd': 'daily',
        'auto': 'auto',
        'future': 'future',
        'learn': 'learn',
        'weekly': 'weekly',
        'monthly': 'monthly'
    }
    return mapping.get(review_cat, 'auto')


def normalize_content(content: str) -> str:
    """Normalize content line breaks."""
    if not content:
        return content
    # Already handled in parse_sql_value, but ensure consistency
    content = content.replace('\r\n', '\n')
    content = content.replace('\r', '\n')
    return content


def parse_insert_statement(line: str) -> List[tuple]:
    """
    Parse a SQL INSERT statement and extract values.
    
    Returns list of tuples, each containing the field values for one row.
    """
    # Find the VALUES clause
    values_match = re.search(r'VALUES\s*(.+);', line, re.DOTALL | re.IGNORECASE)
    if not values_match:
        return []
    
    values_str = values_match.group(1).strip()
    
    # Parse each row - split by "),(" pattern but keep the parentheses
    # First, let's find all complete tuples
    rows = []
    depth = 0
    current_tuple = []
    in_quotes = False
    escape_next = False
    
    i = 0
    while i < len(values_str):
        char = values_str[i]
        
        if escape_next:
            current_tuple.append(char)
            escape_next = False
            i += 1
            continue
        
        if char == '\\':
            current_tuple.append(char)
            escape_next = True
            i += 1
            continue
        
        if char == "'" and not escape_next:
            in_quotes = not in_quotes
            current_tuple.append(char)
            i += 1
            continue
        
        if not in_quotes:
            if char == '(':
                depth += 1
                if depth == 1:
                    # Start of a new tuple, don't include the opening paren
                    i += 1
                    continue
            elif char == ')':
                depth -= 1
                if depth == 0:
                    # End of tuple - parse it
                    tuple_str = ''.join(current_tuple).strip()
                    
                    # Remove leading comma if present (from between tuples)
                    if tuple_str.startswith(','):
                        tuple_str = tuple_str[1:].strip()
                    
                    if tuple_str:
                        # Split by comma, respecting quotes
                        values = []
                        current_value = []
                        in_val_quotes = False
                        val_escape = False
                        
                        for c in tuple_str:
                            if val_escape:
                                current_value.append(c)
                                val_escape = False
                                continue
                            
                            if c == '\\':
                                current_value.append(c)
                                val_escape = True
                                continue
                            
                            if c == "'":
                                in_val_quotes = not in_val_quotes
                                current_value.append(c)
                                continue
                            
                            if c == ',' and not in_val_quotes:
                                values.append(''.join(current_value).strip())
                                current_value = []
                                continue
                            
                            current_value.append(c)
                        
                        # Add last value
                        if current_value:
                            values.append(''.join(current_value).strip())
                        
                        rows.append(tuple(values))
                    
                    current_tuple = []
                    i += 1
                    continue
        
        current_tuple.append(char)
        i += 1
    
    return rows


def convert_verse(row: tuple) -> Dict[str, Any]:
    """
    Convert a legacy verse row to new format.
    
    Legacy columns (from SQL):
    0: id, 1: user_id, 2: reference, 3: content, 4: review_cat, 
    5: tags, 6: ref_sort, 7: started_at, 8: created_at, 9: updated_at
    """
    # Parse values
    reference = parse_sql_value(row[2])
    content = parse_sql_value(row[3])
    review_cat = parse_sql_value(row[4])
    tags_str = parse_sql_value(row[5])
    ref_sort = parse_sql_value(row[6])
    started_at_str = parse_sql_value(row[7])
    created_at_str = parse_sql_value(row[8])
    updated_at_str = parse_sql_value(row[9])
    
    # Extract translation from reference
    clean_reference, translation = extract_translation(reference)
    
    # Parse tags
    tags = parse_tags(tags_str)
    
    # Convert timestamps
    started_at = mysql_timestamp_to_epoch_ms(started_at_str)
    created_at = mysql_timestamp_to_epoch_ms(created_at_str)
    updated_at = mysql_timestamp_to_epoch_ms(updated_at_str)
    
    # Map review category
    review_cat = map_review_category(review_cat)
    
    # Normalize content
    content = normalize_content(content)
    
    # Build verse object (omitting id and favorite as requested)
    verse = {
        "reference": clean_reference,
        "refSort": ref_sort,
        "content": content,
        "translation": translation,
        "reviewCat": review_cat,
        "startedAt": started_at,
        "tags": tags,
        "createdAt": created_at,
        "updatedAt": updated_at
    }
    
    return verse


def main():
    """Main conversion process."""
    input_file = 'laravel_demo_biblememory_2025-11-02.sql'
    output_file = 'converted-verses.json'
    
    print(f"Reading {input_file}...")
    
    verses = []
    
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
        
        # Find the verses INSERT statement
        # Look for: INSERT INTO `verses` ... VALUES ... ending with );
        # Need to match until we find ); that's not inside quotes
        pattern = r"INSERT INTO `verses`.*?VALUES\s*\(.*?\);(?=\s*(?:$|/\*|!|UNLOCK))"
        
        for match in re.finditer(pattern, content, re.DOTALL | re.IGNORECASE):
            insert_statement = match.group(0)
            
            # Parse the INSERT statement
            rows = parse_insert_statement(insert_statement)
            
            print(f"Found {len(rows)} verses in INSERT statement")
            
            # Convert each row
            for i, row in enumerate(rows):
                try:
                    verse = convert_verse(row)
                    verses.append(verse)
                except Exception as e:
                    print(f"Error converting verse {i+1}: {e}")
                    print(f"Row has {len(row)} fields")
                    for j, field in enumerate(row[:5]):
                        print(f"  Field {j}: {field[:50] if len(field) > 50 else field}")
                    continue
    
    print(f"\nConverted {len(verses)} verses")
    
    # Write output
    print(f"Writing {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(verses, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Conversion complete!")
    print(f"  Output: {output_file}")
    print(f"  Total verses: {len(verses)}")
    
    # Print some statistics
    translations = {}
    review_cats = {}
    for verse in verses:
        trans = verse['translation']
        translations[trans] = translations.get(trans, 0) + 1
        
        cat = verse['reviewCat']
        review_cats[cat] = review_cats.get(cat, 0) + 1
    
    print(f"\nTranslations:")
    for trans, count in sorted(translations.items()):
        print(f"  {trans}: {count}")
    
    print(f"\nReview Categories:")
    for cat, count in sorted(review_cats.items()):
        print(f"  {cat}: {count}")


if __name__ == '__main__':
    main()
