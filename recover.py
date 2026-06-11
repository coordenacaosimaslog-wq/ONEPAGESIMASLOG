import json
import os
import re

transcript_path = r'C:\Users\Iara Silva Moreira\.gemini\antigravity\brain\8ac1b6ac-1279-439d-ad1a-49edfc6fd807\.system_generated\logs\transcript.jsonl'
best_content = ""
max_len = 0

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            # Search anywhere in the content or output
            content = str(data)
            if 'class="editable-area"' in content:
                # Find all strings that look like HTML
                html_matches = re.findall(r'(<!DOCTYPE html>.*?</html>)', content, re.DOTALL | re.IGNORECASE)
                for html in html_matches:
                    if len(html) > max_len:
                        max_len = len(html)
                        best_content = html
        except Exception:
            pass

print("Found HTML of length:", max_len)
if max_len > 100000:
    with open('recovered.html', 'w', encoding='utf-8') as out:
        out.write(best_content)
        print("Recovered!")
