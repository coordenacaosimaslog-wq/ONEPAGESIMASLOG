import time
import re

with open('report.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Append a timestamp to the script tag to bust the cache
timestamp = str(int(time.time()))
html = re.sub(r'src="js/report\.js[^"]*"', f'src="js/report.js?v={timestamp}"', html)

with open('report.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Cache busted in report.html")
