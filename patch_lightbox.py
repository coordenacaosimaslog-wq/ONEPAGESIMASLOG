import re

with open('js/report.js', 'r', encoding='utf-8') as f:
    js = f.read()

# For openLightboxLup
js = js.replace("document.querySelector('#lightboxLupContainer > div:nth-child(1) h3').innerText",
                "var h1 = document.querySelector('#lightboxLupContainer > div:nth-child(1) h3'); if(h1) h1.innerText")
js = js.replace("document.querySelector('#lightboxLupContainer > div:nth-child(2) h3').innerText",
                "var h2 = document.querySelector('#lightboxLupContainer > div:nth-child(2) h3'); if(h2) h2.innerText")

js = js.replace("singleImg.style.display = 'none';", "if(singleImg) singleImg.style.display = 'none';")
js = js.replace("lupContainer.style.display = 'flex';", "if(lupContainer) lupContainer.style.display = 'flex';")

js = js.replace("imgDesvio.src = lup.imgErrado", "if(imgDesvio) imgDesvio.src = lup.imgErrado")
js = js.replace("imgPadrao.src = lup.imgCerto", "if(imgPadrao) imgPadrao.src = lup.imgCerto")

# For openLightboxMelhoria (similar replacements)
js = js.replace("imgDesvio.src = m.imgAntes", "if(imgDesvio) imgDesvio.src = m.imgAntes")
js = js.replace("imgPadrao.src = m.imgDepois", "if(imgPadrao) imgPadrao.src = m.imgDepois")
js = js.replace("modal.style.display = 'flex';", "if(modal) modal.style.display = 'flex';")


with open('js/report.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("report.js patched with null-safety")
