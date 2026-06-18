import json
import codecs
with codecs.open('C:/Users/Iara Silva Moreira/.gemini/antigravity/brain/25b309e9-127e-4f4a-8d7e-dae4e1412b31/.system_generated/logs/transcript_full.jsonl', 'r', 'utf-8', errors='ignore') as f:
    for line in f:
        if 'run_command' in line and '-replace' in line:
            try:
                data = json.loads(line)
                if data.get('type') == 'PLANNER_RESPONSE':
                    for call in data.get('tool_calls', []):
                        if call.get('name') == 'run_command':
                            cmd = call['args'].get('CommandLine', '')
                            if '-replace' in cmd:
                                print(f"Regex at {data.get('created_at')}: {cmd[:300]}")
            except Exception as e:
                pass
