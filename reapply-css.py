import re

try:
    with open('report.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # Add print-color-adjust to @media print body
    html = re.sub(
        r'(\s*@media print {\s*body {\s*background: #fff;)',
        r'\1\n                -webkit-print-color-adjust: exact !important;\n                print-color-adjust: exact !important;',
        html
    )

    with open('report.html', 'w', encoding='utf-8') as f:
        f.write(html)
        
    print("Success")
except Exception as e:
    print(e)
