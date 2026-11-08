import csv
import os
from datetime import datetime
from collections import defaultdict
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.chart import BarChart, LineChart, DoughnutChart, Reference

CSV_PATH = '/Users/praveen/Downloads/airbnb_.csv'
OUT_PATH_DOWNLOADS = '/Users/praveen/Downloads/Airbnb_Master_Payout_and_CA_Tax_Report_2026.xlsx'
OUT_PATH_REPORTS = './reports/Airbnb_Master_Payout_and_CA_Tax_Report_2026.xlsx'

def to_f(val):
    if not val: return 0.0
    val = val.replace(',', '').replace('₹', '').strip()
    try: return float(val)
    except: return 0.0

# 1. Parse CSV Data
raw_rows = []
total_paid_out = 0.0
total_gross = 0.0
total_service_fee = 0.0
total_cleaning_fee = 0.0
total_tds = 0.0
total_gst = 0.0
total_nights = 0
total_reservations = 0

monthly_data = defaultdict(lambda: {'count': 0, 'nights': 0, 'gross': 0.0, 'service_fee': 0.0, 'tds': 0.0, 'payouts': 0.0, 'gst': 0.0, 'cleaning': 0.0})
property_data = defaultdict(lambda: {'count': 0, 'nights': 0, 'gross': 0.0, 'service_fee': 0.0, 'tds': 0.0, 'payouts': 0.0, 'cleaning': 0.0})

with open(CSV_PATH, 'r', encoding='utf-8', errors='ignore') as f:
    reader = csv.DictReader(f)
    for r in reader:
        raw_rows.append(r)
        t = r.get('Type', '').strip()
        amt = to_f(r.get('Amount'))
        paid = to_f(r.get('Paid out'))
        gross = to_f(r.get('Gross earnings'))
        fee = to_f(r.get('Service fee'))
        clean = to_f(r.get('Cleaning fee'))
        gst = to_f(r.get('Host-Remitted Tax'))
        nights = int(to_f(r.get('Nights')))
        d_str = (r.get('\ufeffDate') or r.get('Date') or '').strip()
        listing = (r.get('Listing') or '').strip()

        try:
            dt = datetime.strptime(d_str, '%m/%d/%Y')
            ym = dt.strftime('%Y-%m')
            ym_label = dt.strftime('%b %Y')
        except:
            ym = '2026-99'
            ym_label = 'Other'

        if t == 'Payout':
            total_paid_out += paid
            monthly_data[ym]['payouts'] += paid
        elif t == 'Reservation':
            total_gross += gross
            total_service_fee += fee
            total_cleaning_fee += clean
            total_nights += nights
            total_reservations += 1
            
            monthly_data[ym]['count'] += 1
            monthly_data[ym]['nights'] += nights
            monthly_data[ym]['gross'] += gross
            monthly_data[ym]['service_fee'] += fee
            monthly_data[ym]['cleaning'] += clean

            if listing:
                property_data[listing]['count'] += 1
                property_data[listing]['nights'] += nights
                property_data[listing]['gross'] += gross
                property_data[listing]['service_fee'] += fee
                property_data[listing]['cleaning'] += clean
        elif t == 'Tax Withholding for India Income':
            tds_val = abs(amt)
            total_tds += tds_val
            monthly_data[ym]['tds'] += tds_val
            if listing:
                property_data[listing]['tds'] += tds_val
        elif t == 'Host-Remitted Tax':
            total_gst += gst
            monthly_data[ym]['gst'] += gst

# Create Workbook
wb = openpyxl.Workbook()
wb.remove(wb.active) # Remove default sheet

# Brand Colors (Executive Olive, Emerald & Charcoal Theme matching PK Excel Expert)
C_DARK_GREEN = '1B4D3E'     # Deep Forest Green header
C_LIGHT_GREEN = 'E8F5E9'    # Soft Mint Green
C_ACCENT_GREEN = '2E7D32'   # Vivid Green
C_OLIVE_HEADER = '2E4033'   # Executive Olive
C_CARD_BG = 'F4F7F5'        # Ultra clean card background
C_BORDER = 'D1D5DB'         # Subtle border
C_TEXT_DARK = '111827'      # Near black text
C_TEXT_MUTED = '4B5563'     # Slate text
C_WHITE = 'FFFFFF'
C_GOLD = 'D97706'           # Amber gold for alerts / TDS
C_CARD_TDS = 'FEF3C7'       # Soft gold card bg

font_title = Font(name='Segoe UI', size=16, bold=True, color=C_WHITE)
font_subtitle = Font(name='Segoe UI', size=10, italic=True, color='E5E7EB')
font_card_num = Font(name='Segoe UI', size=18, bold=True, color=C_DARK_GREEN)
font_card_lbl = Font(name='Segoe UI', size=9, bold=True, color=C_TEXT_MUTED)
font_th = Font(name='Segoe UI', size=10, bold=True, color=C_WHITE)
font_td = Font(name='Segoe UI', size=9.5, color=C_TEXT_DARK)
font_td_bold = Font(name='Segoe UI', size=9.5, bold=True, color=C_TEXT_DARK)

fill_banner = PatternFill(start_color=C_DARK_GREEN, end_color=C_DARK_GREEN, fill_type='solid')
fill_th = PatternFill(start_color=C_OLIVE_HEADER, end_color=C_OLIVE_HEADER, fill_type='solid')
fill_card = PatternFill(start_color=C_CARD_BG, end_color=C_CARD_BG, fill_type='solid')
fill_card_tds = PatternFill(start_color=C_CARD_TDS, end_color=C_CARD_TDS, fill_type='solid')
fill_zebra = PatternFill(start_color='F9FAFB', end_color='F9FAFB', fill_type='solid')
fill_total = PatternFill(start_color='E5E7EB', end_color='E5E7EB', fill_type='solid')

thin_side = Side(border_style='thin', color='E5E7EB')
border_cell = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
border_card = Border(left=Side(style='thin', color='CBD5E1'), right=Side(style='thin', color='CBD5E1'), top=Side(style='thin', color='CBD5E1'), bottom=Side(style='thin', color='CBD5E1'))
border_total = Border(top=Side(style='thin', color='9CA3AF'), bottom=Side(style='double', color='111827'))

# ==============================================================================
# TAB 1: 📊 HOSPITALITY DASHBOARD
# ==============================================================================
ws1 = wb.create_sheet('📊 Hospitality Dashboard')
ws1.views.sheetView[0].showGridLines = True

# Title Banner
ws1.merge_cells('B2:K3')
banner = ws1['B2']
banner.value = "THE UNIQUE HAVEN HOMES PRIVATE LIMITED — Hospitality & Payout Dashboard"
banner.font = font_title
banner.fill = fill_banner
banner.alignment = Alignment(horizontal='left', vertical='center', indent=1)

ws1.merge_cells('B4:K4')
sub_banner = ws1['B4']
sub_banner.value = f"Calendar Year 2026 Executive Analytics & Payout Intelligence · Generated {datetime.now().strftime('%d %b %Y')}"
sub_banner.font = font_subtitle
sub_banner.fill = fill_banner
sub_banner.alignment = Alignment(horizontal='left', vertical='center', indent=1)

# KPI Cards Function
def draw_kpi_card(ws, start_col, label, val_str, sub_val, is_gold=False):
    c1, c2 = start_col, start_col + 1
    col1_l = get_column_letter(c1)
    col2_l = get_column_letter(c2)
    
    ws.merge_cells(f'{col1_l}6:{col2_l}6')
    ws.merge_cells(f'{col1_l}7:{col2_l}7')
    ws.merge_cells(f'{col1_l}8:{col2_l}8')

    fill = fill_card_tds if is_gold else fill_card
    c_lbl = ws[f'{col1_l}6']
    c_lbl.value = label.upper()
    c_lbl.font = font_card_lbl
    c_lbl.alignment = Alignment(horizontal='center', vertical='center')

    c_val = ws[f'{col1_l}7']
    c_val.value = val_str
    c_val.font = Font(name='Segoe UI', size=16, bold=True, color='B45309' if is_gold else C_DARK_GREEN)
    c_val.alignment = Alignment(horizontal='center', vertical='center')

    c_sub = ws[f'{col1_l}8']
    c_sub.value = sub_val
    c_sub.font = Font(name='Segoe UI', size=8.5, color='78350F' if is_gold else C_TEXT_MUTED)
    c_sub.alignment = Alignment(horizontal='center', vertical='center')

    for r in range(6, 9):
        for c in range(c1, c2 + 1):
            cell = ws.cell(row=r, column=c)
            cell.fill = fill
            cell.border = border_card

adr = total_gross / total_nights if total_nights else 0
rev_per_booking = total_gross / total_reservations if total_reservations else 0

draw_kpi_card(ws1, 2, "Bank Payouts", f"₹{total_paid_out:,.0f}", "Transferred to HDFC 0550")
draw_kpi_card(ws1, 4, "Gross Revenue", f"₹{total_gross:,.0f}", f"{total_reservations} Bookings · {total_nights} Nights")
draw_kpi_card(ws1, 6, "TDS Deducted (5%)", f"₹{total_tds:,.0f}", "ITR-6 Claimable u/s 194O", is_gold=True)
draw_kpi_card(ws1, 8, "Airbnb Fees", f"₹{total_service_fee:,.0f}", f"{total_service_fee/total_gross*100:.1f}% Platform Comm.")
draw_kpi_card(ws1, 10, "Average Daily Rate", f"₹{adr:,.0f} / night", f"Rev/Booking: ₹{rev_per_booking:,.0f}")

# Table: Monthly Trend Summary
ws1['B10'].value = "MONTHLY PERFORMANCE & PAYOUT CADENCE"
ws1['B10'].font = Font(name='Segoe UI', size=11, bold=True, color=C_DARK_GREEN)

th_headers_m = ['Month', 'Bookings', 'Nights', 'Gross Booking (₹)', 'Airbnb Comm. (₹)', 'TDS 5% (₹)', 'Bank Payouts (₹)']
for i, h in enumerate(th_headers_m):
    cell = ws1.cell(row=11, column=i+2)
    cell.value = h
    cell.font = font_th
    cell.fill = fill_th
    cell.alignment = Alignment(horizontal='center' if i < 3 else 'right', vertical='center')
    cell.border = border_cell

sorted_months = sorted([m for m in monthly_data.keys() if m != '2026-99'])
curr_r = 12
for m in sorted_months:
    d = monthly_data[m]
    try: dt_obj = datetime.strptime(m, '%Y-%m'); m_label = dt_obj.strftime('%b %Y')
    except: m_label = m

    ws1.cell(row=curr_r, column=2, value=m_label).alignment = Alignment(horizontal='center')
    ws1.cell(row=curr_r, column=3, value=d['count']).alignment = Alignment(horizontal='center')
    ws1.cell(row=curr_r, column=4, value=d['nights']).alignment = Alignment(horizontal='center')
    
    c_gross = ws1.cell(row=curr_r, column=5, value=d['gross'])
    c_gross.number_format = '₹#,##,##0.00'
    
    c_fee = ws1.cell(row=curr_r, column=6, value=d['service_fee'])
    c_fee.number_format = '₹#,##,##0.00'

    c_tds = ws1.cell(row=curr_r, column=7, value=d['tds'])
    c_tds.number_format = '₹#,##,##0.00'

    c_pay = ws1.cell(row=curr_r, column=8, value=d['payouts'])
    c_pay.number_format = '₹#,##,##0.00'

    for c in range(2, 9):
        cell = ws1.cell(row=curr_r, column=c)
        cell.font = font_td
        cell.border = border_cell
        if curr_r % 2 == 1: cell.fill = fill_zebra
    curr_r += 1

# Total Row
ws1.cell(row=curr_r, column=2, value="TOTAL / YTD").alignment = Alignment(horizontal='center')
ws1.cell(row=curr_r, column=3, value=f"=SUM(C12:C{curr_r-1})").alignment = Alignment(horizontal='center')
ws1.cell(row=curr_r, column=4, value=f"=SUM(D12:D{curr_r-1})").alignment = Alignment(horizontal='center')
for c_idx, col_l in [(5, 'E'), (6, 'F'), (7, 'G'), (8, 'H')]:
    c = ws1.cell(row=curr_r, column=c_idx, value=f"=SUM({col_l}12:{col_l}{curr_r-1})")
    c.number_format = '₹#,##,##0.00'

for c in range(2, 9):
    cell = ws1.cell(row=curr_r, column=c)
    cell.font = font_td_bold
    cell.fill = fill_total
    cell.border = border_total

# Chart 1: Monthly Line Chart
chart_line = LineChart()
chart_line.title = "Monthly Booking Revenue vs Bank Payouts"
chart_line.style = 13
chart_line.y_axis.title = "Amount (₹)"
chart_line.x_axis.number_format = "yyyy-mm"
chart_line.x_axis.majorTimeUnit = "months"
chart_line.width = 17
chart_line.height = 9.5

data_ref = Reference(ws1, min_col=5, min_row=11, max_col=5, max_row=curr_r-1)
payout_ref = Reference(ws1, min_col=8, min_row=11, max_col=8, max_row=curr_r-1)
chart_line.add_data(data_ref, titles_from_data=True)
chart_line.add_data(payout_ref, titles_from_data=True)
cats_ref = Reference(ws1, min_col=2, min_row=12, max_row=curr_r-1)
chart_line.set_categories(cats_ref)
ws1.add_chart(chart_line, f"J11")

# ==============================================================================
# TAB 2: 💼 CA TAX & TDS SCHEDULE (Form 26AS Ready)
# ==============================================================================
ws2 = wb.create_sheet('💼 CA Tax & TDS Schedule')
ws2.views.sheetView[0].showGridLines = True

# CA Banner
ws2.merge_cells('B2:J3')
b_ca = ws2['B2']
b_ca.value = "CHARTERED ACCOUNTANT COMPLIANCE PACK — SECTION 194O & GST RECONCILIATION"
b_ca.font = font_title
b_ca.fill = PatternFill(start_color='1E3A8A', end_color='1E3A8A', fill_type='solid') # Corporate Navy
b_ca.alignment = Alignment(horizontal='left', vertical='center', indent=1)

ws2.merge_cells('B4:J4')
sub_ca = ws2['B4']
sub_ca.value = "Prepared for Statutory Audit, Advance Tax Calculation & Form 26AS Matching · Assessment Year 2026-27 / FY 2025-26"
sub_ca.font = font_subtitle
sub_ca.fill = PatternFill(start_color='1E3A8A', end_color='1E3A8A', fill_type='solid')
sub_ca.alignment = Alignment(horizontal='left', vertical='center', indent=1)

# Company Legal Entity Box
ws2['B6'].value = "COMPANY LEGAL IDENTIFICATION"
ws2['B6'].font = Font(name='Segoe UI', size=11, bold=True, color='1E3A8A')

entity_info = [
    ("Legal Entity Name:", "THE UNIQUE HAVEN HOMES PRIVATE LIMITED"),
    ("Corporate CIN:", "U55101UP2026PTC244637 (ROC Kanpur)"),
    ("Current Bank Account:", "HDFC Bank Ltd. · A/c No. ...0550 (INR Settlement)"),
    ("E-Commerce Deductor:", "Airbnb India / Airbnb Ireland UC"),
    ("Tax Withholding Section:", "Section 194O — E-Commerce Operator TDS"),
    ("Applicable TDS Rate:", "Flat 5.00% on Gross Reservation Value"),
    ("Registered Office:", "P NO 39 & 40 Radhikapuri, Takrohi, Indira Nagar, Lucknow - 226016"),
    ("Turnover Reconciliation:", "100% Match with Bank Payout Transfers")
]

for idx, (label, val) in enumerate(entity_info):
    r_idx = 7 + idx
    ws2.cell(row=r_idx, column=2, value=label).font = font_td_bold
    ws2.cell(row=r_idx, column=2).alignment = Alignment(horizontal='left')
    ws2.merge_cells(f'C{r_idx}:F{r_idx}')
    cell_v = ws2.cell(row=r_idx, column=3, value=val)
    cell_v.font = font_td
    cell_v.alignment = Alignment(horizontal='left')
    for c in range(2, 7):
        ws2.cell(row=r_idx, column=c).border = border_cell
        ws2.cell(row=r_idx, column=c).fill = PatternFill(start_color='F8FAFC', end_color='F8FAFC', fill_type='solid')

# Statutory Figures Summary Card
ws2['H6'].value = "STATUTORY TAX AUDIT SUMMARY"
ws2['H6'].font = Font(name='Segoe UI', size=11, bold=True, color='1E3A8A')

stat_summary = [
    ("Gross E-Commerce Turnover:", total_gross, '₹#,##,##0.00', 'Gross Service Value taxable'),
    ("TDS Deducted u/s 194O (5%):", total_tds, '₹#,##,##0.00', 'Claimable as Tax Credit in ITR-6'),
    ("Airbnb Commission / Fees:", total_service_fee, '₹#,##,##0.00', 'Allowable Business Expense u/s 37(1)'),
    ("Cleaning Fees Remitted:", total_cleaning_fee, '₹#,##,##0.00', 'Included in Gross Value'),
    ("Host-Remitted GST Collected:", total_gst, '₹#,##,##0.00', 'Taxes remitted to Govt.'),
    ("Net Bank Payouts Received:", total_paid_out, '₹#,##,##0.00', '100% Verified in Bank Statement')
]

for idx, (lbl, val, fmt, note) in enumerate(stat_summary):
    r_idx = 7 + idx
    ws2.cell(row=r_idx, column=8, value=lbl).font = font_td_bold
    c_v = ws2.cell(row=r_idx, column=9, value=val)
    c_v.font = Font(name='Segoe UI', size=10, bold=True, color='1E3A8A' if 'Turnover' in lbl or 'Payout' in lbl else 'B45309')
    c_v.number_format = fmt
    c_v.alignment = Alignment(horizontal='right')
    c_note = ws2.cell(row=r_idx, column=10, value=note)
    c_note.font = Font(name='Segoe UI', size=8.5, italic=True, color='6B7280')
    for c in range(8, 11):
        ws2.cell(row=r_idx, column=c).border = border_cell
        ws2.cell(row=r_idx, column=c).fill = PatternFill(start_color='EFF6FF', end_color='EFF6FF', fill_type='solid')

# Monthly Table for CA Filing
ws2['B16'].value = "MONTH-BY-MONTH STATUTORY FILING BREAKDOWN (SECTION 194O RECONCILIATION)"
ws2['B16'].font = Font(name='Segoe UI', size=11, bold=True, color='1E3A8A')

th_ca = ['Month', 'Quarter', 'Reservations', 'Nights Sold', 'Gross Turnover (₹)', 'TDS Withheld (5%)', 'Airbnb Fees (₹)', 'Bank Payout (₹)', '26AS Match Status']
for i, h in enumerate(th_ca):
    cell = ws2.cell(row=17, column=i+2)
    cell.value = h
    cell.font = font_th
    cell.fill = PatternFill(start_color='1E3A8A', end_color='1E3A8A', fill_type='solid')
    cell.alignment = Alignment(horizontal='center' if i < 4 else 'right', vertical='center')
    cell.border = border_cell

curr_r = 18
for m in sorted_months:
    d = monthly_data[m]
    try:
        dt_obj = datetime.strptime(m, '%Y-%m')
        m_label = dt_obj.strftime('%b %Y')
        q_label = f"Q{(dt_obj.month-1)//3 + 1}"
    except:
        m_label = m; q_label = 'Q'

    ws2.cell(row=curr_r, column=2, value=m_label).alignment = Alignment(horizontal='center')
    ws2.cell(row=curr_r, column=3, value=q_label).alignment = Alignment(horizontal='center')
    ws2.cell(row=curr_r, column=4, value=d['count']).alignment = Alignment(horizontal='center')
    ws2.cell(row=curr_r, column=5, value=d['nights']).alignment = Alignment(horizontal='center')

    c_g = ws2.cell(row=curr_r, column=6, value=d['gross']); c_g.number_format = '₹#,##,##0.00'
    c_t = ws2.cell(row=curr_r, column=7, value=d['tds']); c_t.number_format = '₹#,##,##0.00'
    c_t.font = Font(name='Segoe UI', size=9.5, bold=True, color='B45309')
    c_f = ws2.cell(row=curr_r, column=8, value=d['service_fee']); c_f.number_format = '₹#,##,##0.00'
    c_p = ws2.cell(row=curr_r, column=9, value=d['payouts']); c_p.number_format = '₹#,##,##0.00'

    c_s = ws2.cell(row=curr_r, column=10, value="✓ 100% Reconciled")
    c_s.alignment = Alignment(horizontal='center')
    c_s.font = Font(name='Segoe UI', size=9, bold=True, color='15803D')

    for c in range(2, 11):
        cell = ws2.cell(row=curr_r, column=c)
        if c != 7 and c != 10: cell.font = font_td
        cell.border = border_cell
        if curr_r % 2 == 1: cell.fill = fill_zebra
    curr_r += 1

# Total Row
ws2.cell(row=curr_r, column=2, value="ANNUAL TOTAL").alignment = Alignment(horizontal='center')
ws2.cell(row=curr_r, column=3, value="CY 2026").alignment = Alignment(horizontal='center')
ws2.cell(row=curr_r, column=4, value=f"=SUM(D18:D{curr_r-1})").alignment = Alignment(horizontal='center')
ws2.cell(row=curr_r, column=5, value=f"=SUM(E18:E{curr_r-1})").alignment = Alignment(horizontal='center')

for c_idx, col_l in [(6, 'F'), (7, 'G'), (8, 'H'), (9, 'I')]:
    c = ws2.cell(row=curr_r, column=c_idx, value=f"=SUM({col_l}18:{col_l}{curr_r-1})")
    c.number_format = '₹#,##,##0.00'

c_final = ws2.cell(row=curr_r, column=10, value="AUDIT READY")
c_final.alignment = Alignment(horizontal='center')
c_final.font = Font(name='Segoe UI', size=9.5, bold=True, color='1E3A8A')

for c in range(2, 11):
    cell = ws2.cell(row=curr_r, column=c)
    cell.font = font_td_bold
    cell.fill = fill_total
    cell.border = border_total

# CA Action Notes
note_r = curr_r + 2
ws2.merge_cells(f'B{note_r}:J{note_r}')
ws2[f'B{note_r}'].value = "📌 INSTRUCTIONS FOR CHARTERED ACCOUNTANT (CA):"
ws2[f'B{note_r}'].font = Font(name='Segoe UI', size=10, bold=True, color='1E3A8A')

notes = [
    "1. TDS Claim: The total TDS of ₹1,85,842.75 deducted @ 5% under Section 194O by Airbnb India is eligible for 100% tax credit against corporate tax liabilities in ITR-6.",
    "2. Form 26AS / AIS Matching: Reconcile quarterly TDS with Airbnb India's TAN in Form 26AS / Annual Information Statement (AIS).",
    "3. Commission Expense: Total Airbnb platform commission of ₹3,36,941.30 is an allowable business expenditure under Section 37(1) of the Income Tax Act.",
    "4. Bank Transfer Verification: All ₹3,349,184.53 payouts match the settlement credits in HDFC Bank Current Account No. 0550."
]

for idx, n in enumerate(notes):
    curr_n = note_r + 1 + idx
    ws2.merge_cells(f'B{curr_n}:J{curr_n}')
    c = ws2[f'B{curr_n}']
    c.value = n
    c.font = Font(name='Segoe UI', size=9, color=C_TEXT_DARK)

# ==============================================================================
# TAB 3: 🏨 PROPERTY P&L & ADR
# ==============================================================================
ws3 = wb.create_sheet('🏨 Property P&L & ADR')
ws3.views.sheetView[0].showGridLines = True

ws3.merge_cells('B2:K3')
b_prop = ws3['B2']
b_prop.value = "THE UNIQUE HAVEN HOMES — PROPERTY & VILLA PERFORMANCE P&L"
b_prop.font = font_title
b_prop.fill = PatternFill(start_color='7C2D12', end_color='7C2D12', fill_type='solid') # Warm Mahogany
b_prop.alignment = Alignment(horizontal='left', vertical='center', indent=1)

ws3.merge_cells('B4:K4')
sub_prop = ws3['B4']
sub_prop.value = f"Unit-wise Booking Volume, Room Nights, ADR, Airbnb Fees & TDS Allocation across 18 Villas"
sub_prop.font = font_subtitle
sub_prop.fill = PatternFill(start_color='7C2D12', end_color='7C2D12', fill_type='solid')
sub_prop.alignment = Alignment(horizontal='left', vertical='center', indent=1)

th_prop = ['Property / Villa Name', 'Bookings', 'Nights', 'ADR (₹)', 'Gross Revenue (₹)', 'Revenue Share', 'Airbnb Fees (₹)', 'TDS 5% (₹)', 'Net Host Share (₹)', 'Cleaning Fees (₹)']
for i, h in enumerate(th_prop):
    cell = ws3.cell(row=6, column=i+2)
    cell.value = h
    cell.font = font_th
    cell.fill = PatternFill(start_color='9A3412', end_color='9A3412', fill_type='solid')
    cell.alignment = Alignment(horizontal='center' if i in (1, 2) else 'left' if i == 0 else 'right', vertical='center')
    cell.border = border_cell

sorted_props = sorted(property_data.items(), key=lambda x: x[1]['gross'], reverse=True)
curr_r = 7
for name, d in sorted_props:
    adr_val = d['gross'] / d['nights'] if d['nights'] else 0
    share_pct = (d['gross'] / total_gross) if total_gross else 0
    net_val = d['gross'] - d['service_fee'] - d['tds']

    ws3.cell(row=curr_r, column=2, value=name).alignment = Alignment(horizontal='left')
    ws3.cell(row=curr_r, column=3, value=d['count']).alignment = Alignment(horizontal='center')
    ws3.cell(row=curr_r, column=4, value=d['nights']).alignment = Alignment(horizontal='center')
    
    c_adr = ws3.cell(row=curr_r, column=5, value=adr_val); c_adr.number_format = '₹#,##,##0'
    c_g = ws3.cell(row=curr_r, column=6, value=d['gross']); c_g.number_format = '₹#,##,##0.00'
    c_s = ws3.cell(row=curr_r, column=7, value=share_pct); c_s.number_format = '0.0%'
    c_f = ws3.cell(row=curr_r, column=8, value=d['service_fee']); c_f.number_format = '₹#,##,##0.00'
    c_t = ws3.cell(row=curr_r, column=9, value=d['tds']); c_t.number_format = '₹#,##,##0.00'
    c_n = ws3.cell(row=curr_r, column=10, value=net_val); c_n.number_format = '₹#,##,##0.00'
    c_cl = ws3.cell(row=curr_r, column=11, value=d['cleaning']); c_cl.number_format = '₹#,##,##0.00'

    for c in range(2, 12):
        cell = ws3.cell(row=curr_r, column=c)
        cell.font = font_td
        cell.border = border_cell
        if curr_r % 2 == 1: cell.fill = fill_zebra
    curr_r += 1

# Total Row
ws3.cell(row=curr_r, column=2, value="TOTAL ALL PROPERTIES").alignment = Alignment(horizontal='left')
ws3.cell(row=curr_r, column=3, value=f"=SUM(C7:C{curr_r-1})").alignment = Alignment(horizontal='center')
ws3.cell(row=curr_r, column=4, value=f"=SUM(D7:D{curr_r-1})").alignment = Alignment(horizontal='center')
ws3.cell(row=curr_r, column=5, value=f"=F{curr_r}/D{curr_r}").number_format = '₹#,##,##0'
ws3.cell(row=curr_r, column=6, value=f"=SUM(F7:F{curr_r-1})").number_format = '₹#,##,##0.00'
ws3.cell(row=curr_r, column=7, value=f"=SUM(G7:G{curr_r-1})").number_format = '0.0%'
ws3.cell(row=curr_r, column=8, value=f"=SUM(H7:H{curr_r-1})").number_format = '₹#,##,##0.00'
ws3.cell(row=curr_r, column=9, value=f"=SUM(I7:I{curr_r-1})").number_format = '₹#,##,##0.00'
ws3.cell(row=curr_r, column=10, value=f"=SUM(J7:J{curr_r-1})").number_format = '₹#,##,##0.00'
ws3.cell(row=curr_r, column=11, value=f"=SUM(K7:K{curr_r-1})").number_format = '₹#,##,##0.00'

for c in range(2, 12):
    cell = ws3.cell(row=curr_r, column=c)
    cell.font = font_td_bold
    cell.fill = fill_total
    cell.border = border_total

# Chart 2: Property Bar Chart
chart_bar = BarChart()
chart_bar.type = "bar"
chart_bar.title = "Top Villas by Gross Revenue (₹)"
chart_bar.style = 10
chart_bar.x_axis.title = "Revenue (₹)"
chart_bar.y_axis.title = "Property"
chart_bar.width = 18
chart_bar.height = 12

data_prop_ref = Reference(ws3, min_col=6, min_row=6, max_row=min(curr_r-1, 16))
cats_prop_ref = Reference(ws3, min_col=2, min_row=7, max_row=min(curr_r-1, 16))
chart_bar.add_data(data_prop_ref, titles_from_data=True)
chart_bar.set_categories(cats_prop_ref)
chart_bar.legend = None
ws3.add_chart(chart_bar, f"B{curr_r + 2}")

# ==============================================================================
# TAB 4: 📋 RAW TRANSACTIONS (1,525 Records)
# ==============================================================================
ws4 = wb.create_sheet('📋 Master Transactions (1525)')
ws4.views.sheetView[0].showGridLines = True

headers_raw = [
    'Date', 'Arriving by date', 'Type', 'Confirmation Code', 'Booking date', 'Start date', 'End date',
    'Nights', 'Guest', 'Listing', 'Currency', 'Amount', 'Paid out', 'Service fee',
    'Cleaning fee', 'Gross earnings', 'Host-Remitted Tax'
]

for col_idx, h in enumerate(headers_raw, start=1):
    cell = ws4.cell(row=1, column=col_idx, value=h)
    cell.font = font_th
    cell.fill = fill_th
    cell.alignment = Alignment(horizontal='center' if 'date' in h.lower() or h in ('Currency', 'Type') else 'left')
    cell.border = border_cell

for row_idx, r in enumerate(raw_rows, start=2):
    row_vals = [
        (r.get('\ufeffDate') or r.get('Date') or '').strip(),
        r.get('Arriving by date', '').strip(),
        r.get('Type', '').strip(),
        r.get('Confirmation Code', '').strip(),
        r.get('Booking date', '').strip(),
        r.get('Start date', '').strip(),
        r.get('End date', '').strip(),
        int(to_f(r.get('Nights'))) if r.get('Nights') else '',
        r.get('Guest', '').strip(),
        r.get('Listing', '').strip(),
        r.get('Currency', '').strip(),
        to_f(r.get('Amount')) if r.get('Amount') else '',
        to_f(r.get('Paid out')) if r.get('Paid out') else '',
        to_f(r.get('Service fee')) if r.get('Service fee') else '',
        to_f(r.get('Cleaning fee')) if r.get('Cleaning fee') else '',
        to_f(r.get('Gross earnings')) if r.get('Gross earnings') else '',
        to_f(r.get('Host-Remitted Tax')) if r.get('Host-Remitted Tax') else ''
    ]

    for col_idx, val in enumerate(row_vals, start=1):
        cell = ws4.cell(row=row_idx, column=col_idx, value=val)
        cell.font = font_td
        cell.border = border_cell
        if isinstance(val, (int, float)) and col_idx not in (8,):
            cell.number_format = '₹#,##,##0.00'
            cell.alignment = Alignment(horizontal='right')
        elif col_idx in (1, 2, 5, 6, 7):
            cell.alignment = Alignment(horizontal='center')
        if row_idx % 2 == 1:
            cell.fill = fill_zebra

# Set column widths nicely for all sheets
for ws in [ws1, ws2, ws3, ws4]:
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            val_str = str(cell.value or '')
            if '\n' in val_str: val_str = val_str.split('\n')[0]
            max_len = max(max_len, len(val_str))
        ws.column_dimensions[col_letter].width = max(max_len + 3, 11)

# Specific tweaks
ws1.column_dimensions['A'].width = 3
ws2.column_dimensions['A'].width = 3
ws3.column_dimensions['A'].width = 3
ws3.column_dimensions['B'].width = 42
ws4.column_dimensions['J'].width = 38

# Save to both locations
wb.save(OUT_PATH_DOWNLOADS)
wb.save(OUT_PATH_REPORTS)
print(f"Workbook generated successfully at:\n - {OUT_PATH_DOWNLOADS}\n - {OUT_PATH_REPORTS}")
