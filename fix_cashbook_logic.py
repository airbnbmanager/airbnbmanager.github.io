with open('js/cashbook.js', 'r') as f:
    code = f.read()

# Find and replace holder balance calculation
import re

# We will inspect how holder balance is calculated in cashbook.js
print("Current cashbook.js size:", len(code))

# Update logic:
# 1. Handovers with 'UPI' in notes should only affect UPI tab.
# 2. Handovers without 'UPI' in notes should only affect CASH tab.

# Let's inspect the code snippet for holder calculation
matches = [line for line in code.split('\n') if 'from_person' in line or 'received_by' in line]
print("Found lines:", len(matches))

