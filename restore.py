import json
with open('C:\\Users\\Iara Silva Moreira\\.gemini\\antigravity\\brain\\25b309e9-127e-4f4a-8d7e-dae4e1412b31\\.system_generated\\logs\\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        if '"TargetFile":"' in line and 'report.html' in line and '"name":"write_to_file"' in line:
            try:
                data = json.loads(line)
                for call in data.get('tool_calls', []):
                    if call.get('name') == 'write_to_file':
                        target = call.get('args', {}).get('TargetFile', '')
                        if 'report.html' in target:
                            content = call['args']['CodeContent']
                            with open('report_restored.html', 'w', encoding='utf-8') as out:
                                out.write(content)
                            print(f'Restored {target} with length {len(content)}')
            except Exception as e:
                pass
