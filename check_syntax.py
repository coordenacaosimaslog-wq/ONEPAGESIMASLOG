import sys

with open('js/report.js', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

def check_brackets(text):
    stack = []
    lines = text.split('\n')
    for line_num, line in enumerate(lines, 1):
        for col_num, char in enumerate(line, 1):
            if char in "{[(":
                stack.append((char, line_num, col_num))
            elif char in "}])":
                if not stack:
                    return f"Unmatched {char} at line {line_num}, col {col_num}"
                top, top_l, top_c = stack.pop()
                expected = {'{': '}', '[': ']', '(': ')'}[top]
                if char != expected:
                    return f"Mismatched bracket at line {line_num}, col {col_num}: expected {expected} for {top} from line {top_l}, but found {char}"
    
    if stack:
        return f"Unclosed brackets remaining: {stack}"
    return "All brackets match perfectly."

print(check_brackets(text))
