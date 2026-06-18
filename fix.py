
import re

with open('js/report.js', 'r', encoding='utf-8') as f:
    text = f.read()

replacements = {
    'todAçãor param': 'today or param',
    'locAção.search': 'location.search',
    'urlParaMÊS': 'urlParams',
    '300MÊS': '300ms',
    'MÊStr': 'mStr',
    'nAção_solucionadas': 'nao_solucionadas',
    'galpAção': 'galpao',
    'OperAção': 'Operation',
    'datAçoupload': 'data to upload',
    'siMÊS': 'simas',
    'SiMÊS': 'Simas',
    'naMÊS': 'names',
    'Açãon': 'ation',
    'animAçãon': 'animation',
    'Açaon': 'ation',
    'Ação': 'acao', # default fallback for Ação that should be acao
    'MÊS': 'mes',
    'PRÓXIMA': 'proxima',
    'Conclusão': 'conclusao',
    'Manutenção': 'manutencao',
    'Padrão': 'padrao',
    'Segurança': 'seguranca',
    'Concluída': 'concluida',
    'Histórico': 'historico'
}

for k, v in replacements.items():
    text = text.replace(k, v)

with open('js/report_fixed.js', 'w', encoding='utf-8') as f:
    f.write(text)
print('Fixed!')

