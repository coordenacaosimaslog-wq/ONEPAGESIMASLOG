import sys
import re

try:
    with open('report.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # The corrupted characters are typically 
    # Let's replace the known corrupted words
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
        r'Atrasad.': 'Atrasado',
        r'\s*2026': '© 2026',
        r'Matriz.*Camaari': 'Matriz, Funeas, Sorocaba, São Roque, Prefeitura SJP, Camaçari'
    }

    # Actually, a simpler approach is to read the original template if I can't guess everything.
    # But let's just do regex replacements for all  followed by specific letters.
    # We will just replace  with the correct letter based on context.
    
    html = html.replace('', '') # Strip literal , but wait, maybe it's just ''
    
    for bad, good in replacements.items():
        html = re.sub(bad, good, html)
        
    # Re-apply the background image 
    html = html.replace("background-image: none;", "background-image: url('equipe-qualidade.png');")

    with open('report.html', 'w', encoding='utf-8') as f:
        f.write(html)

    print("Success")
except Exception as e:
    print(e)
