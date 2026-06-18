import os
import json
import codecs

root = r"C:\Users\Iara Silva Moreira\.gemini\antigravity\brain"
found_content = ""
for d in os.listdir(root):
    transcript = os.path.join(root, d, ".system_generated", "logs", "transcript_full.jsonl")
    if os.path.exists(transcript):
        try:
            with codecs.open(transcript, "r", "utf-8", errors="ignore") as f:
                for line in f:
                    if 'id=\\"reportElement\\"' in line or 'id="reportElement"' in line:
                        if 'write_to_file' in line and 'report.html' in line:
                            data = json.loads(line)
                            for call in data.get('tool_calls', []):
                                if call.get('name') == 'write_to_file':
                                    args = call.get('args', {})
                                    if 'report.html' in args.get('TargetFile', ''):
                                        content = args.get('CodeContent')
                                        if content and len(content) > 1000:
                                            found_content = content
                                            break
                        if found_content: break
        except Exception as e:
            pass
    if found_content: break

if found_content:
    with codecs.open("C:\\Users\\Iara Silva Moreira\\.gemini\\antigravity\\scratch\\simas-one-page-report\\report.html", "w", "utf-8") as out:
        out.write(found_content)
    print(f"BINGO! Restored report.html, length: {len(found_content)}")
else:
    print("Not found in any transcript.")
