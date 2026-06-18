import json
import codecs
with codecs.open('C:/Users/Iara Silva Moreira/.gemini/antigravity/brain/25b309e9-127e-4f4a-8d7e-dae4e1412b31/.system_generated/logs/transcript_full.jsonl', 'r', 'utf-8', errors='ignore') as f:
    for line in f:
        if 'report.html' in line:
            try:
                data = json.loads(line)
                if data.get('type') == 'PLANNER_RESPONSE':
                    pass
                elif data.get('type') == 'RUN_COMMAND':
                    if 'Length Name' in line and 'report.html' in line:
                        content = data.get('content', '')
                        idx = content.find('report.html')
                        if idx != -1:
                            start = max(0, idx - 80)
                            print(f"File size log at {data.get('created_at')}: {content[start:idx+15]}")
            except Exception as e:
                pass
