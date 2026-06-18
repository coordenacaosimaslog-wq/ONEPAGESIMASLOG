import json
with open('restore_log2.txt', 'r', encoding='utf-16le') as f:
    line = f.read().strip()
    try:
        data = json.loads(line)
        for call in data.get('tool_calls', []):
            if call.get('name') in ['write_to_file', 'replace_file_content', 'multi_replace_file_content']:
                args = call.get('args', {})
                content = args.get('CodeContent') or args.get('ReplacementContent') or ''
                if not content and 'ReplacementChunks' in args:
                    for chunk in args['ReplacementChunks']:
                        content += chunk.get('ReplacementContent', '') + '\n'
                
                with open('report_restored.html', 'w', encoding='utf-8') as out:
                    out.write(content)
                print(f'Extracted {len(content)} bytes')
    except Exception as e:
        print('Error:', e)
