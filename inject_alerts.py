import re

with open('js/report.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace console.error(..., err) with an alert so the user can see it
js = re.sub(r'catch\s*\(([^)]+)\)\s*\{([\s\S]*?console\.error\([^,]+,\s*\1\);[\s\S]*?)\}', 
            r'catch (\1) { \2 alert("ERRO INTERNO: " + (\1.stack || \1)); }', js)

with open('js/report.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Injected alerts into catch blocks.")
