import re

with open('js/report.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Remove the internal alerts
js = re.sub(r'\s*alert\("ERRO INTERNO:[^)]+\)\);', '', js)

with open('js/report.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Alerts removed")
