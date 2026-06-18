
import json
with open('C:/Users/Iara Silva Moreira/.gemini/antigravity/brain/25b309e9-127e-4f4a-8d7e-dae4e1412b31/.system_generated/logs/transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        if 'run_command' in line and 'CommandLine' in line:
            try:
                data = json.loads(line)
                for call in data.get('tool_calls', []):
                    if call.get('name') == 'run_command':
                        print(call['args']['CommandLine'])
            except: pass

