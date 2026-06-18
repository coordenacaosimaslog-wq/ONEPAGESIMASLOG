
with open('js/report.js', 'r', encoding='utf-8') as f:
    text = f.read()

# basic parenthesis stack finder ignoring strings
stack = 0
line_no = 1
for i, c in enumerate(text):
    if c == '\n': line_no += 1
    if c == '(': stack += 1
    if c == ')':
        stack -= 1
        if stack < 0:
            print('Extra ) at line', line_no, 'context:', text[max(0, i-20):i+20])
            break

