import re

with open('report.html', 'r', encoding='utf-8') as f:
    html = f.read()

error_catcher = """
    <script>
        window.onerror = function(msg, url, line, col, error) {
            var errDiv = document.createElement('div');
            errDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:red;color:white;z-index:9999;padding:20px;font-size:16px;font-family:monospace;white-space:pre-wrap;';
            errDiv.innerHTML = '<strong>JAVASCRIPT ERROR:</strong><br>' + msg + '<br>Line: ' + line + '<br>Col: ' + col + '<br>' + (error ? error.stack : '');
            document.body.appendChild(errDiv);
            return false;
        };
        window.addEventListener('unhandledrejection', function(event) {
            var errDiv = document.createElement('div');
            errDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:red;color:white;z-index:9999;padding:20px;font-size:16px;font-family:monospace;white-space:pre-wrap;';
            errDiv.innerHTML = '<strong>PROMISE REJECTION:</strong><br>' + event.reason;
            if(document.body) document.body.appendChild(errDiv);
        });
    </script>
"""

if "window.onerror" not in html:
    html = html.replace('<head>', '<head>\n' + error_catcher)
    with open('report.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Error catcher injected.")
else:
    print("Error catcher already exists.")
