with open('js/daily-report.js', 'r') as f:
    code = f.read()

# 1. Update function signature to handle startDate and endDate
if 'async function renderDailyReport(repDate) {' in code:
    code = code.replace(
        'async function renderDailyReport(repDate) {',
        'async function renderDailyReport(repDate, endDate = null) {\n  window._repStartDate = repDate || window._repStartDate || new Date().toISOString().slice(0, 10);\n  window._repEndDate = endDate || window._repEndDate || window._repStartDate;\n  repDate = window._repStartDate;\n  endDate = window._repEndDate;'
    )

# 2. Update queries to use range filtering
code = code.replace(
    "sb.from('payment_history').select('*').eq('payment_date', repDate)",
    "sb.from('payment_history').select('*').gte('payment_date', repDate).lte('payment_date', endDate)"
)

# 3. Update Checkin & Checkout filtering for Date Range
code = code.replace(
    "const checkins = (allBks || []).filter(b => b.check_in === repDate && !b.is_cancelled);",
    "const checkins = (allBks || []).filter(b => (b.check_in >= repDate && b.check_in <= endDate) && !b.is_cancelled);"
)

code = code.replace(
    "const checkouts = (allBks || []).filter(b => b.check_out === repDate && !b.is_cancelled);",
    "const checkouts = (allBks || []).filter(b => (b.check_out >= repDate && b.check_out <= endDate) && !b.is_cancelled);"
)

# 4. Inject Date Range UI Control into Header
old_title = '<h1>📅 Daily Business Report</h1>'
new_title = '''<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
      <h1>📅 Daily Business Report</h1>
      <div style="display:flex;gap:8px;align-items:center;background:rgba(0,0,0,0.2);padding:8px 14px;border-radius:8px;border:1px solid var(--border);">
        <label style="font-size:12px;font-weight:bold;">From:</label>
        <input type="date" id="dailyReportFrom" value="' + repDate + '" style="padding:4px 8px;border-radius:6px;border:1px solid #ccc;color:#000;">
        <label style="font-size:12px;font-weight:bold;">To:</label>
        <input type="date" id="dailyReportTo" value="' + endDate + '" style="padding:4px 8px;border-radius:6px;border:1px solid #ccc;color:#000;">
        <button class="btn-sm" style="background:var(--accent);color:#fff;" onclick="renderDailyReport(document.getElementById(\\'dailyReportFrom\\').value, document.getElementById(\\'dailyReportTo\\').value)">🔍 Filter Range</button>
        <button class="btn-sm outline" onclick="renderDailyReport(new Date().toISOString().slice(0, 10))">Today</button>
      </div>
    </div>'''

if old_title in code:
    code = code.replace(old_title, new_title)

with open('js/daily-report.js', 'w') as f:
    f.write(code)

print("✅ Daily Report Date Range & Date Selector successfully added!")
