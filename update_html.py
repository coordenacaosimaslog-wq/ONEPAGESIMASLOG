import re

try:
    with open('report.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Add CSS for break-inside: avoid
    css_to_add = """
        .avoid-break,
        .licenses-card,
        .kpi-std-grid,
        .bird-card,
        .safety-images-card,
        .card-padrao,
        .lup-card,
        .melhoria-card,
        table tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
        }
        .preview-break-line {
            position: absolute;
            left: 0;
            right: 0;
            border-bottom: 2px dashed red;
            z-index: 9999;
            pointer-events: none;
        }
        .preview-break-label {
            position: absolute;
            right: 10px;
            background: red;
            color: white;
            padding: 2px 6px;
            font-size: 10px;
            font-weight: bold;
            border-radius: 4px;
            transform: translateY(-100%);
        }
    """
    html = html.replace('</style>', f'{css_to_add}\n    </style>')

    # 2. Add Exportar PDF Profissional and Preview Break buttons
    buttons_html = """                <button onclick="ReportApp.toggleHistoryPanel()" class="btn-sys">
                    <i class="fas fa-history"></i> HISTÓRICO
                </button>
                <button onclick="ReportApp.toggleBreakPreview()" class="btn-sys" style="background: #ef4444;">
                    <i class="fas fa-cut"></i> Pré-visualizar Quebras
                </button>
                <button onclick="ReportApp.downloadProfessionalPDF()" class="btn-sys" style="background: #8b5cf6;">
                    <i class="fas fa-file-pdf"></i> Exportar PDF Profissional
                </button>
                <button onclick="ReportApp.downloadOnePagePDF()" class="btn-sys" style="background: #0ea5e9;">
                    <i class="fas fa-file-pdf"></i> Baixar OnePage (PDF)
                </button>
                <button onclick="ReportApp.downloadOnePageImage()" class="btn-sys" style="background: #10b981;">
                    <i class="fas fa-image"></i> Exportar Imagem (PNG)
                </button>"""
    
    # We will replace the current buttons block
    # Search for the block starting with toggleHistoryPanel and ending with downloadOnePageImage
    pattern = r'<button onclick="ReportApp\.toggleHistoryPanel[^>]*>.*?Exportar Imagem \(PNG\)\s*</button>'
    html = re.sub(pattern, buttons_html, html, flags=re.DOTALL)

    with open('report.html', 'w', encoding='utf-8') as f:
        f.write(html)
        
    print("report.html modified successfully")
except Exception as e:
    print(e)
