import re

with open('js/report.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace document.getElementById('...').value with document.getElementById('...')?.value
# Also handles `document.getElementById(...)` without quotes if there are any variables
js = re.sub(r'document\.getElementById\(([^)]+)\)\.value', r'document.getElementById(\1)?.value', js)

with open('js/report.js', 'w', encoding='utf-8') as f:
    f.write(js)

print('Replaced .value with ?.value successfully')
