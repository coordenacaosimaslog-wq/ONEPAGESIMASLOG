import codecs

path = r"C:\Users\Iara Silva Moreira\.gemini\antigravity\brain\25b309e9-127e-4f4a-8d7e-dae4e1412b31\.system_generated\logs\transcript_full.jsonl"
with codecs.open(path, "r", "utf-8") as f:
    for line in f:
        if 'simas-one-page-report' in line and ('"name":"write_to_file"' in line or '"name":"multi_replace_file_content"' in line or '"name":"replace_file_content"' in line):
            print("Found tool call mentioning simas-one-page-report!")
            break
