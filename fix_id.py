import re

with open('report.html', 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

# Replace lightboxLupPadrão with lightboxLupPadrao
html = re.sub(r'id="lightboxLupPadr[^\"]+"', r'id="lightboxLupPadrao"', html)

with open('report.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Fixed HTML ID")
