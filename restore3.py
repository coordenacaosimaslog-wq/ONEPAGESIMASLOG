import json
import codecs

path = r"C:\Users\Iara Silva Moreira\.gemini\antigravity\brain\25b309e9-127e-4f4a-8d7e-dae4e1412b31\.system_generated\logs\transcript_full.jsonl"
with codecs.open(path, "r", "utf-8") as f:
    for line in f:
        if 'report.html' in line and '"name":"write_to_file"' in line:
            try:
                data = json.loads(line)
                for call in data.get('tool_calls', []):
                    if call.get('name') == 'write_to_file':
                        args = call.get('args', {})
                        if 'report.html' in args.get('TargetFile', ''):
                            content = args.get('CodeContent')
                            if content:
                                with codecs.open('report_restored.html', 'w', 'utf-8') as out:
                                    out.write(content)
                                print(f"Found and extracted! Size: {len(content)}")
            except Exception as e:
                print("Err parsing JSON:", e)
