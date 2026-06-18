import json
import codecs

path = r"C:\Users\Iara Silva Moreira\.gemini\antigravity\brain\25b309e9-127e-4f4a-8d7e-dae4e1412b31\.system_generated\logs\transcript_full.jsonl"

with codecs.open(path, "r", "utf-8", errors="ignore") as f, codecs.open('view_file_logs.txt', 'w', 'utf-8') as out:
    for line in f:
        if 'report.html' in line:
            try:
                data = json.loads(line)
                if data.get('type') == 'TOOL_RESPONSE' and 'file://' in str(data):
                    out.write(line + '\n')
            except:
                pass
