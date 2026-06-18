import os
import codecs

root = r"C:\Users\Iara Silva Moreira\.gemini\antigravity\brain"
found_content = ""
for d in os.listdir(root):
    transcript = os.path.join(root, d, ".system_generated", "logs", "transcript_full.jsonl")
    if os.path.exists(transcript):
        try:
            with codecs.open(transcript, "r", "utf-8", errors="ignore") as f:
                for i, line in enumerate(f):
                    if '<div class="report-header">' in line and 'id="reportElement"' in line:
                        found_content += line + "\n"
        except Exception as e:
            pass

if found_content:
    with codecs.open("C:\\Users\\Iara Silva Moreira\\.gemini\\antigravity\\scratch\\simas-one-page-report\\extracted_raw.txt", "w", "utf-8") as out:
        out.write(found_content)
    print(f"BINGO! Found raw lines, length: {len(found_content)}")
else:
    print("Not found anywhere.")
