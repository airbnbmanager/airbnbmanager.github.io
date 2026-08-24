with open('js/cashbook.js', 'r') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if 'received_by' in line or 'from_person' in line or 'to_person' in line or 'holders' in line:
        print(f"Line {idx+1}: {line.strip()[:100]}")
