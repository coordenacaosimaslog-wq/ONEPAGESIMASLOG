$b64 = Get-Content 'logo-nova.b64' -Raw
$b64 = $b64.Trim()
$html = Get-Content 'report.html' -Raw
$html = $html.Replace('src="logo-nova.png"', 'src="data:image/png;base64,' + $b64 + '"')
$html = $html.Replace('url(''equipe-qualidade.png'')', 'none')
Set-Content -Path 'report.html' -Value $html -Encoding UTF8
