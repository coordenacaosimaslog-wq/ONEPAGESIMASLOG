import re

try:
    with open('report.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Fix the broken ID safetyNãoLostTime
    html = html.replace('id="safetyNãoLostTime"', 'id="safetyNoLostTime"')

    # 2. Add the "Recorde" editable input
    old_record_html = """                        <div>
                            <input type="hidden" id="safetyRecord" value="0">
                            <input type="hidden" id="safetyCurrent" value="0">
                            <label
                                style="display: block; font-size: 0.7rem; font-weight: 700; color: #64748b; margin-bottom: 0.25rem;">DATA
                                ÚLTIMO ACIDENTE</label>
                            <input type="date" id="safetyLastAccident" class="kpi-value"
                                onchange="ReportApp.calculateSafetyDays()"
                                style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 700; font-size: 1rem; text-align: center;">
                        </div>
                        <div>
                            <label
                                style="display: block; font-size: 0.7rem; font-weight: 700; color: #64748b; margin-bottom: 0.25rem;">INÍCIO
                                DA CONTAGEM</label>
                            <input type="text" value="01/01/2026" disabled
                                style="width: 100%; padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 4px; font-weight: 700; font-size: 1rem; text-align: center; background: #f8fafc; color: #94a3b8;">
                        </div>"""

    new_record_html = """                        <div>
                            <input type="hidden" id="safetyCurrent" value="0">
                            <label style="display: block; font-size: 0.7rem; font-weight: 700; color: #64748b; margin-bottom: 0.25rem;">DATA ÚLTIMO ACIDENTE</label>
                            <input type="date" id="safetyLastAccident" class="kpi-value" onchange="ReportApp.calculateSafetyDays()"
                                style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 700; font-size: 1rem; text-align: center;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.7rem; font-weight: 700; color: #64748b; margin-bottom: 0.25rem;">RECORDE (DIAS)</label>
                            <input type="number" id="safetyRecord" value="0" min="0" class="kpi-value" onchange="ReportApp.calculateSafetyDays()"
                                style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 700; font-size: 1rem; text-align: center;">
                        </div>"""
    
    # We will just do regex replace to be safe since spaces might vary
    # Remove hidden safetyRecord
    html = re.sub(r'<input type="hidden" id="safetyRecord" value="0">\s*', '', html)
    # Replace INÍCIO DA CONTAGEM with RECORDE (DIAS)
    html = re.sub(
        r'<label[^>]*>INÍCIO\s*DA CONTAGEM</label>\s*<input type="text" value="01/01/2026" disabled[^>]*>',
        r'<label style="display: block; font-size: 0.7rem; font-weight: 700; color: #64748b; margin-bottom: 0.25rem;">RECORDE (DIAS)</label>\n                            <input type="number" id="safetyRecord" value="0" min="0" class="kpi-value" onchange="ReportApp.calculateSafetyDays()" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 700; font-size: 1rem; text-align: center;">',
        html
    )

    # 3. Add delete image buttons
    for i in range(3):
        find_str = f"""<div style="margin-top: 0.5rem; display: flex; justify-content: center; gap: 0.5rem;">
                                <label for="safetyImageUpload-{i}" class="btn-sys"
                                    style="padding: 0.25rem 0.5rem; font-size: 0.6rem;">
                                    <i class="fas fa-camera"></i> Anexar Foto
                                </label>
                            </div>"""
        rep_str = f"""<div style="margin-top: 0.5rem; display: flex; justify-content: center; gap: 0.5rem;">
                                <label for="safetyImageUpload-{i}" class="btn-sys"
                                    style="padding: 0.25rem 0.5rem; font-size: 0.6rem;">
                                    <i class="fas fa-camera"></i> Anexar Foto
                                </label>
                                <button onclick="ReportApp.removeSafetyImage({i})" id="del-img-{i}" class="btn-sys" style="padding: 0.25rem 0.5rem; font-size: 0.6rem; background: #ef4444; display: none;">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>"""
        html = html.replace(find_str, rep_str)


    with open('report.html', 'w', encoding='utf-8') as f:
        f.write(html)
        
    print("Success")
except Exception as e:
    print(e)
