# 📋 PENDING TASKS (10 Aug 2026)

## ✅ COMPLETED (09 Aug):
- Photo upload mobile/iPad fix
- Duplicate booking button
- Cash Book (4 tabs) + Handover checkbox fix
- Payment Received By tracking
- Company Advances (4 tabs)
- SQL data cleanup + verification
- v3.0-cash-flow-stable tagged

## 🟡 REMAINING:

### 1. Maintenance Before/After Photos
- Verify workflow (already partially done)
- Test on mobile

### 2. Full Responsive Design (Phase 3)
- Sidebar accordion groups
- Mobile bottom nav
- Tablet drawer

### 3. Praveen Cash Handover Test
- ₹12,600 pending to Shahenshah
- Test new checkbox handover system

## 💡 IDEAS (Optional):
- WhatsApp batch send to investors
- Guest search across bookings

## 🐛 NEW BUGS (10 Aug Session):

### 1. Photo Attachment Issue
- Daily Expenses photo upload proper nahi
- Check: add form + edit form
- Test on mobile

### 2. UPI Payment → "Unknown" in Cash Book
- UPI mode select karne pe received_by auto Firoz nahi ho raha
- Fix: onPayModeChange logic verify
- Query: SELECT * FROM payment_history WHERE payment_mode='UPI' AND received_by IS NULL LIMIT 5;

### 3. Test Smart Cash Management
- New feature deployed but not fully tested
- Test scenarios:
  - Amount = available cash (company_cash)
  - Amount > available (split)
  - Amount < available (own or company choice)
