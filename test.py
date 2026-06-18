
import re
with open('js/report.js', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# remove base64
text = re.sub(r'data:image\/[^;]+;base64,[A-Za-z0-9+/=]+', 'BASE64_REMOVED', text)
print('Size without base64:', len(text))

