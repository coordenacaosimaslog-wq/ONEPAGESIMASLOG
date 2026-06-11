import re

with open('js/report.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace Firebase block
js = js.replace('// 1. Save to Firebase\n            if (window.firebaseDB && this.data[opToSave]) {', 
                '// 1. Save to Firebase\n            if (window.firebaseDB && this.data[opToSave]) { try {')
                
js = js.replace('opRef.child(\'global\').set(this.data[opToSave].global).catch(e => console.warn(\'Firebase fail\'));\n                    }\n                }\n            }', 
                'opRef.child(\'global\').set(this.data[opToSave].global).catch(e => console.warn(\'Firebase fail\'));\n                    }\n                } } catch(fe) { console.warn("Firebase Error", fe); }\n            }')

with open('js/report.js', 'w', encoding='utf-8') as f:
    f.write(js)

print('Wrapped successfully')
