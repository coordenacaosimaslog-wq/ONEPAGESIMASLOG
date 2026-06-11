import sys
import re

try:
    with open(r'C:\Users\Iara Silva Moreira\.gemini\antigravity-backup\scratch\simas-one-page-report\report.html', 'r', encoding='utf-8') as f:
        backup_html = f.read()

    with open('report.html', 'r', encoding='utf-8') as f:
        current_html = f.read()

    # Find the missing chunk in the backup
    start_str = "        /* Inputs & Editables */\n"
    # Actually let's find the exact block that was deleted.
    # The regex in my previous script was r'\.editable-[a-z\x80-\xff\u0000-\uffff]+rea'
    # It matched from `.editable-area {`
    # down to `Classificao das ruas/rea`
    # So the chunk is everything between them.
    # To be safe, let's extract by exact string matching.

    start_idx = backup_html.find('        .editable-area {\n')
    # The string `Classificação das ruas/áreas</p>` might be encoded weirdly in backup. Let's just find `das ruas/`
    end_idx = backup_html.find('das ruas/reas</p>')
    if end_idx == -1:
        end_idx = backup_html.find('das ruas/áreas</p>')
    if end_idx == -1:
        end_idx = backup_html.find('das ruas/')
        end_idx = backup_html.find('</p>', end_idx) + 4
        
    print(f"Start: {start_idx}, End: {end_idx}")

    missing_chunk = backup_html[start_idx:end_idx]

    # Now replace the corrupted `.editable-areas</p>` in current_html with the missing_chunk
    # The corrupted string is: `        .editable-areas</p>`
    
    # Wait, the current_html has `        .editable-areas</p>` right after `        /* Inputs & Editables */\n`
    current_html = current_html.replace('        .editable-areas</p>', missing_chunk)

    # Let's fix the text corruption in the restored chunk too
    replacements = {
        r'Segurana': 'Segurança',
        r'Seguran.a': 'Segurança',
        r'Qualidade.*conformidade': 'Qualidade, conformidade',
        r'Padro': 'Padrão',
        r'Padr.o': 'Padrão',
        r'Gesto': 'Gestão',
        r'Gest.o': 'Gestão',
        r'Evidncias': 'Evidências',
        r'Evid.ncias': 'Evidências',
        r'Ms': 'Mês',
        r'M.s': 'Mês',
        r'No': 'Não',
        r'N.o': 'Não',
        r'Operao': 'Operação',
        r'Opera..o': 'Operação',
        r'Histrico': 'Histórico',
        r'Hist.rico': 'Histórico',
        r'Concludo': 'Concluído',
        r'Conclu.do': 'Concluído',
        r'Cartes': 'Cartões',
        r'Cart.es': 'Cartões',
        r'Opes': 'Opções',
        r'Op..es': 'Opções',
        r'rea': 'Área',
        r'.rea': 'Área',
        r'Edio': 'Edição',
        r'Edi..o': 'Edição',
        r'Aplicao': 'Aplicação',
        r'Aplica..o': 'Aplicação',
        r'Reviso': 'Revisão',
        r'Revis.o': 'Revisão',
        r'Aprovao': 'Aprovação',
        r'Aprova..o': 'Aprovação',
        r'Atrasad.': 'Atrasado'
    }

    current_html = current_html.replace('', '')
    for bad, good in replacements.items():
        current_html = re.sub(bad, good, current_html)

    with open('report.html', 'w', encoding='utf-8') as f:
        f.write(current_html)

    print("Success")
except Exception as e:
    print(e)
