import re

with open('js/report.js', 'r', encoding='utf-8') as f:
    js = f.read()

js = re.sub(r'alert\("ATENCAO CRITICA:[^"]+"\);\s*\}', r'console.warn("Limite de memoria atingido"); }', js)

with open('js/report.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Alert removed")
