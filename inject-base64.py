import re

try:
    with open('logo-nova.b64', 'r', encoding='ascii') as f:
        logo_b64 = f.read().strip()
        
    with open('equipe-qualidade.b64', 'r', encoding='ascii') as f:
        equipe_b64 = f.read().strip()

    with open('report.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # Replace logo
    html = html.replace('src="logo-nova.png"', f'src="data:image/png;base64,{logo_b64}"')
    
    # Replace background image
    html = html.replace("url('equipe-qualidade.png')", f"url('data:image/png;base64,{equipe_b64}')")

    with open('report.html', 'w', encoding='utf-8') as f:
        f.write(html)
        
    print("Success replacing images with base64")
except Exception as e:
    print(e)
