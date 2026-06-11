import re

with open('js/report.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Wrap the entire Firebase sync block in try/catch to guarantee it never crashes the local save
firebase_block_regex = re.compile(r'(// 1\. Save to Firebase\s*if \(window\.firebaseDB && this\.data\[opToSave\]\) \{)([\s\S]*?)(// 2\. Save to Local Storage)', re.MULTILINE)

match = firebase_block_regex.search(js)
if match:
    prefix = match.group(1)
    body = match.group(2)
    suffix = match.group(3)
    
    # Check if we already wrapped it (to avoid double wrapping)
    if 'try {' not in body[:50]:
        new_body = f"""
                try {{
        {body}
                }} catch(firebaseErr) {{
                    console.warn("Firebase Sync Error (ignored):", firebaseErr);
                }}
        """
        js = js[:match.start()] + prefix + new_body + suffix + js[match.end():]
        
        with open('js/report.js', 'w', encoding='utf-8') as f:
            f.write(js)
        print("Firebase block wrapped in try-catch.")
    else:
        print("Already wrapped.")
else:
    print("Firebase block not found.")
