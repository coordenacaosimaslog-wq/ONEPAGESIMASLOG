import codecs
import json

path = r"C:\Users\Iara Silva Moreira\.gemini\antigravity\brain\25b309e9-127e-4f4a-8d7e-dae4e1412b31\.system_generated\logs\transcript_full.jsonl"
with codecs.open(path, "r", "utf-8") as f, codecs.open('all_report_html.txt', 'w', 'utf-8') as out:
    for line in f:
        if 'report.html' in line:
            try:
                data = json.loads(line)
                for call in data.get('tool_calls', []):
                    args = call.get('args', {})
                    if 'report.html' in args.get('TargetFile', ''):
                        out.write(f"\n--- TOOL: {call.get('name')} ---\n")
                        if call.get('name') == 'write_to_file':
                            out.write(args.get('CodeContent', ''))
                        elif call.get('name') == 'replace_file_content':
                            out.write("REPLACED:\n" + args.get('ReplacementContent', ''))
            except:
                pass
