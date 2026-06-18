
import json
with open('C:/Users/Iara Silva Moreira/.gemini/antigravity/brain/25b309e9-127e-4f4a-8d7e-dae4e1412b31/.system_generated/logs/transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        if 'report.html' in line and 'replace_file_content' in line:
            print(line[:2000])

