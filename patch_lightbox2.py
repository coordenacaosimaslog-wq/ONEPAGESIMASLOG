import re

with open('js/report.js', 'r', encoding='utf-8') as f:
    js = f.read()

js = js.replace("document.getElementById('lightboxLupPadrao')", "(document.getElementById('lightboxLupPadrao') || document.getElementById('lightboxLupPadrão'))")

with open('js/report.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("report.js patched to support both IDs")
