import json
import os

log_path = 'C:/Users/Iara Silva Moreira/.gemini/antigravity/brain/8ac1b6ac-1279-439d-ad1a-49edfc6fd807/.system_generated/logs/transcript_full.jsonl'

found = []
with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            content = data.get('content')
            if content and 'index.html' in content:
                found.append(content[:1000])
        except Exception as e:
            pass

with open('search_results.txt', 'w', encoding='utf-8') as f:
    for res in found:
        f.write("=== ENTRY ===\n" + res + "\n\n")

print(f"Found {len(found)} entries.")
