import json
import codecs
with codecs.open('C:/Users/Iara Silva Moreira/.gemini/antigravity/brain/25b309e9-127e-4f4a-8d7e-dae4e1412b31/.system_generated/logs/transcript_full.jsonl', 'r', 'utf-8', errors='ignore') as f:
    for line in f:
        if 'replace_file_content' in line and 'report.html' in line:
            try:
                data = json.loads(line)
                if data.get('created_at') == '2026-06-17T19:08:19Z':
                    for call in data.get('tool_calls', []):
                        if call.get('name') == 'replace_file_content':
                            print(json.dumps(call['args'], indent=2))
            except Exception as e:
                pass
