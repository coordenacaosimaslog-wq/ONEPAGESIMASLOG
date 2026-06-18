import json
import codecs

path = r"C:\Users\Iara Silva Moreira\.gemini\antigravity\brain\25b309e9-127e-4f4a-8d7e-dae4e1412b31\.system_generated\logs\transcript_full.jsonl"
longest_html = ""

with codecs.open(path, "r", "utf-8", errors="ignore") as f:
    for line in f:
        if 'reportElement' in line or '<div class="report-header">' in line:
            # Maybe it's in the output of a command!
            try:
                data = json.loads(line)
                # Check tool responses
                if data.get('type') == 'TOOL_RESPONSE':
                    output = str(data)
                    if 'reportElement' in output:
                        if len(output) > len(longest_html):
                            longest_html = output
            except:
                pass

if longest_html:
    with codecs.open("C:\\Users\\Iara Silva Moreira\\.gemini\\antigravity\\scratch\\simas-one-page-report\\extracted_from_output.txt", "w", "utf-8") as out:
        out.write(longest_html)
    print(f"BINGO! Found output of length: {len(longest_html)}")
else:
    print("Not found in any output.")
