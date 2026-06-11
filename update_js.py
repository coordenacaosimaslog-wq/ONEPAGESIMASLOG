import re

try:
    with open(r'js\report.js', 'r', encoding='utf-8') as f:
        js = f.read()

    js_to_add = """    toggleBreakPreview: function() {
        const element = document.getElementById('reportElement');
        const existingLines = element.querySelectorAll('.preview-break-line');
        if (existingLines.length > 0) {
            existingLines.forEach(l => l.remove());
            return;
        }
        
        const width = element.offsetWidth;
        const pageHeight = width / (277 / 190);
        const totalHeight = element.offsetHeight;
        
        let currentY = pageHeight;
        let pageNum = 1;
        
        element.style.position = 'relative';

        while (currentY < totalHeight) {
            const line = document.createElement('div');
            line.className = 'preview-break-line';
            line.style.top = `${currentY}px`;
            
            const label = document.createElement('div');
            label.className = 'preview-break-label';
            label.innerText = `Fim da Página ${pageNum} (Tesoura)`;
            line.appendChild(label);
            
            element.appendChild(line);
            currentY += pageHeight;
            pageNum++;
        }
        alert("Modo de Pré-visualização ativado! As linhas vermelhas pontilhadas estimam onde a página vai quebrar. O 'PDF Profissional' vai empurrar os cards inteiros para a próxima página automaticamente se a tesoura cortar no meio.");
    },

    downloadProfessionalPDF: function () {
        const element = document.getElementById('reportElement');
        this._prepareForExport(element);

        const existingLines = element.querySelectorAll('.preview-break-line');
        existingLines.forEach(l => l.style.display = 'none');

        const opt = {
            margin: [10, 10, 10, 10],
            filename: `${this.currentFilial} - ${this.currentDate} (Profissional).pdf`,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: { 
                scale: 2, 
                useCORS: true, 
                letterRendering: true, 
                backgroundColor: '#f1f5f9',
                scrollY: 0
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
            pagebreak: { mode: ['css', 'legacy'] }
        };

        const controlBar = document.querySelector('.report-control-bar');
        if(controlBar) controlBar.style.display = 'none';

        html2pdf().set(opt).from(element).save().then(() => {
            if(controlBar) controlBar.style.display = 'flex';
            existingLines.forEach(l => l.style.display = 'block');
        }).catch(err => {
            console.error(err);
            alert("Erro ao gerar o PDF Profissional. " + err);
            if(controlBar) controlBar.style.display = 'flex';
            existingLines.forEach(l => l.style.display = 'block');
        });
    },
"""
    # Find toggleSafetyGeneralPanel: function
    js = js.replace('toggleSafetyGeneralPanel: function () {', f'{js_to_add}\n    toggleSafetyGeneralPanel: function () {{')

    with open(r'js\report.js', 'w', encoding='utf-8') as f:
        f.write(js)
        
    print("report.js modified successfully")
except Exception as e:
    print(e)
