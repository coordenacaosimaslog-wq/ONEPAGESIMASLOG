import codecs

path = r"C:\Users\Iara Silva Moreira\.gemini\antigravity\brain\25b309e9-127e-4f4a-8d7e-dae4e1412b31\.system_generated\logs\transcript_full.jsonl"
with codecs.open(path, "r", "utf-8") as f:
    for i, line in enumerate(f):
        if 'id="reportElement"' in line or "id=\"reportElement\"" in line or "report-header" in line:
            print(f"Found something interesting at line {i}!")
            with codecs.open('found_line.txt', 'w', 'utf-8') as out:
                out.write(line)
            break
