const fs = require('fs');
const b64 = fs.readFileSync('logo-nova.b64', 'utf8').trim();
let html = fs.readFileSync('report.html', 'utf8');
html = html.replace('src="logo-nova.png"', 'src="data:image/png;base64,' + b64 + '"');
fs.writeFileSync('report.html', html, 'utf8');
