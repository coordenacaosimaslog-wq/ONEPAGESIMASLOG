
import json
with open('C:/Users/Iara Silva Moreira/.gemini/antigravity/brain/25b309e9-127e-4f4a-8d7e-dae4e1412b31/.system_generated/logs/transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        if 'view_file' in line and 'report.html' in line and 'managerName' in line:
            try:
                data = json.loads(line)
                print(data['content'][:500])
                # Find managerName in content
                idx = data['content'].find('managerName')
                if idx != -1:
                    print(data['content'][max(0, idx-100):idx+200])
            except Exception as e:
                pass

