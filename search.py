
with open('js/report.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'innerHTML =' in line and '\' in line:
        print(i+1, line.strip()[:100])

