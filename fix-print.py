import sys
import re

try:
    with open('report.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # Replace corrupted class names robustly using regex
    html = re.sub(r'\.editable-[a-z\x80-\xff\u0000-\uffff]+rea', '.editable-area', html, flags=re.IGNORECASE)
    # Also handle it globally:
    html = re.sub(r'editable-[a-z\x80-\xff\u0000-\uffff]+rea', 'editable-area', html, flags=re.IGNORECASE)

    with open('report.html', 'w', encoding='utf-8') as f:
        f.write(html)
        
    print("Success")
except Exception as e:
    print("Error:", e)
