import json
import os
import re

transcript_path = r'C:\Users\Iara Silva Moreira\.gemini\antigravity\brain\812ce54c-cbca-42eb-adbc-863827912abb\.system_generated\logs\transcript.jsonl'
best_content = ""
max_len = 0

try:
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                data = json.loads(line)
                content = str(data)
                # Let's search for "ReportApp" and just extract anything that looks like the file
                # Maybe there is a huge chunk!
                # If "content" has '<!DOCTYPE html', we might extract it. But what if it was outputted by powershell cat without html tags?
                # The file starts with <!DOCTYPE html> mostly.
                html_matches = re.findall(r'(<!DOCTYPE html>.*?)(\n\n|$)', content, re.DOTALL | re.IGNORECASE)
                for html in html_matches:
                    html_str = html[0]
                    if len(html_str) > max_len:
                        max_len = len(html_str)
                        best_content = html_str
                        
                # What if the whole file was returned as a string in `replace_file_content` targetContent?
                # In replace_file_content, targetContent could be large if replaced large blocks. But I didn't.
            except Exception:
                pass

    print("Found HTML of length:", max_len)
    if max_len > 50000:
        with open('recovered.html', 'w', encoding='utf-8') as out:
            # fix escaped newlines
            out.write(best_content.replace('\\n', '\n').replace('\\t', '\t').replace('\\"', '"'))
            print("Recovered!")
except Exception as e:
    print(e)
