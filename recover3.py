import os
import glob
import json
import re

base_dir = r'C:\Users\Iara Silva Moreira\.gemini\antigravity\brain'
best_content = ""
max_len = 0
found_file = ""

for root, dirs, files in os.walk(base_dir):
    for f in files:
        if f == 'transcript.jsonl':
            path = os.path.join(root, f)
            try:
                with open(path, 'r', encoding='utf-8') as file:
                    for line in file:
                        try:
                            data = json.loads(line)
                            content = str(data)
                            html_matches = re.findall(r'(<!DOCTYPE html>.*?)(\n\n|$)', content, re.DOTALL | re.IGNORECASE)
                            for html in html_matches:
                                html_str = html[0]
                                if len(html_str) > max_len:
                                    max_len = len(html_str)
                                    best_content = html_str
                                    found_file = path
                        except:
                            pass
            except:
                pass

print("Found HTML of length:", max_len, "in", found_file)
if max_len > 100000:
    with open('recovered.html', 'w', encoding='utf-8') as out:
        out.write(best_content.replace('\\n', '\n').replace('\\t', '\t').replace('\\"', '"'))
        print("Recovered!")
