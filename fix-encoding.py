import sys

try:
    with open('report.html', 'r', encoding='utf-8') as f:
        corrupted = f.read()
    
    # Remove BOM if present
    if corrupted.startswith('\ufeff'):
        corrupted = corrupted[1:]
        
    # We might also have an old BOM encoded as ï»¿ inside the file!
    # ï»¿ is \xef \xbb \xbf in cp1252.

    raw_bytes = corrupted.encode('cp1252')
    restored = raw_bytes.decode('utf-8')

    with open('report.html', 'w', encoding='utf-8') as f:
        f.write(restored)

    print("Success")
except Exception as e:
    print(e)
