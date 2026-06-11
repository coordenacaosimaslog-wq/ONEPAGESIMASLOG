import re
with open('js/report.js', 'r', encoding='utf-8', errors='ignore') as f:
    txt = f.read()

txt = re.sub(r'alert\("ATEN[^;]+;', 'alert("ATENCAO CRITICA: O limite de memoria do seu navegador foi atingido. Apague imagens antigas no historico!");', txt)

with open('js/report.js', 'w', encoding='utf-8') as f:
    f.write(txt)
print("Done")
