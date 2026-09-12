/**
 * UHHS-OD & Payment Source Global Manager (v2 FIXED)
 * Unique Haven Homes Stay
 */

const UHHS_PAYMENT_SOURCES = {
    OD: 'UHHS-OD',
    FIROZ: 'FIROZ',
    COMPANY: 'COMPANY'
};

// 1. Payment Source Dropdown HTML Generator
function getPaymentSourceDropdownHTML(selected = 'COMPANY', id = 'payment_source') {
    return `
        <div class="form-group mb-2">
            <label class="form-label fw-bold" style="font-size:13px; color:#333;">
                💳 Payment Account / Source
            </label>
            <select id="${id}" name="payment_source" class="form-select form-control" style="border: 1.5px solid #0d6efd; font-weight: 600;" required>
                <option value="COMPANY" ${selected === 'COMPANY' ? 'selected' : ''}>🏢 COMPANY (Guest Rent / Cash in Hand)</option>
                <option value="UHHS-OD" ${selected === 'UHHS-OD' ? 'selected' : ''}>🏦 UHHS-OD (Overdraft Account)</option>
                <option value="FIROZ" ${selected === 'FIROZ' ? 'selected' : ''}>👤 FIROZ (Direct Personal)</option>
            </select>
        </div>
    `;
}

// 2. Badge UI Helper for Table Display
function getPaymentSourceBadge(source) {
    const s = (source || 'COMPANY').toUpperCase();
    if (s === 'UHHS-OD') {
        return `<span style="background-color:#dc3545; color:#ffffff; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:700; display:inline-block;">🏦 UHHS-OD</span>`;
    } else if (s === 'FIROZ') {
        return `<span style="background-color:#0d6efd; color:#ffffff; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:700; display:inline-block;">👤 FIROZ</span>`;
    } else {
        return `<span style="background-color:#198754; color:#ffffff; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:700; display:inline-block;">🏢 COMPANY</span>`;
    }
}

// 3. Live UHHS-OD Balance Calculator with EXACT DB Table Names
async function calculateLiveODBalance(supabaseClient) {
    const client = supabaseClient || window.sb || window.supabaseClient || window.supabase;
    if (!client) return { inflow: 0, outflow: 0, balance: 0 };

    try {
        const startDate = "2026-09-12";

        // A. Inflows from 12 Sep onwards
        const { data: odInflows } = await client
            .from('uhhs_od_account')
            .select('amount')
            .eq('transaction_type', 'INFLOW')
            .gte('transaction_date', startDate);

        const totalInflow = (odInflows || []).reduce((sum, row) => sum + parseFloat(row.amount || 0), 0);

        // B. Outflows from 12 Sep onwards
        let totalOutflow = 0;

        // 1. Daily Expenses
        try {
            const { data: r1 } = await client.from('reimbursements')
                .select('amount, payment_source, paid_by')
                .gte('expense_date', startDate);
            if (r1) {
                totalOutflow += r1.filter(e => {
                    const s = String(e.payment_source || e.paid_by || '').toUpperCase();
                    return s.includes('OD') || s.includes('UHHS');
                }).reduce((s, r) => s + parseFloat(r.amount || 0), 0);
            }
        } catch (e) {}

        // 2. Maintenance Log
        try {
            const { data: r2 } = await client.from('maintenance_log')
                .select('cost, payment_source')
                .gte('reported_date', startDate);
            if (r2) {
                totalOutflow += r2.filter(m => String(m.payment_source || '').toUpperCase().includes('OD'))
                                  .reduce((s, r) => s + parseFloat(r.cost || 0), 0);
            }
        } catch (e) {}

        // 3. Laundry Payments
        try {
            const { data: r3 } = await client.from('laundry_payments')
                .select('amount, payment_source')
                .gte('payment_date', startDate);
            if (r3) {
                totalOutflow += r3.filter(l => String(l.payment_source || '').toUpperCase().includes('OD'))
                                  .reduce((s, r) => s + parseFloat(r.amount || 0), 0);
            }
        } catch (e) {}

        // 4. Company Advances (UHHS-OD Advances)
        try {
            const { data: r4 } = await client.from('company_advances')
                .select('amount_given, payment_source, given_by, purpose')
                .gte('advance_date', startDate);
            if (r4) {
                totalOutflow += r4.filter(a => {
                    const src = String(a.payment_source || '').toUpperCase();
                    const gBy = String(a.given_by || '').toUpperCase();
                    const purp = String(a.purpose || '').toUpperCase();
                    const isFiroz = src === 'FIROZ' || gBy.includes('FIROZ') || purp.includes('FIROZ');
                    return !isFiroz;
                }).reduce((s, r) => s + parseFloat(r.amount_given || 0), 0);
            }
        } catch (e) {}

        const netBalance = totalInflow - totalOutflow;

        // Update Top Banner Elements across all pages
        const bannerElements = [
            document.getElementById('uhhs-od-balance-display'),
            document.getElementById('claims-od-banner-bal'),
            document.querySelector('.claims-od-bal-value')
        ];

        bannerElements.forEach(el => {
            if (el) {
                if (el.id === 'claims-od-banner-bal' || el.classList.contains('claims-od-bal-value')) {
                    el.innerText = `₹${netBalance.toLocaleString('en-IN')}`;
                    el.style.color = netBalance >= 0 ? '#059669' : '#DC2626';
                } else {
                    const isNegative = netBalance < 0;
                    el.innerHTML = `
                        <div style="padding:14px; border-radius:10px; background:${isNegative ? '#fff5f5' : '#f0fff4'}; border:1.5px solid ${isNegative ? '#dc3545' : '#198754'}; margin-bottom:12px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <div style="font-size:12px; font-weight:700; color:#555; text-transform:uppercase;">🏦 UHHS-OD ACCOUNT BALANCE</div>
                                    <div style="font-size:24px; font-weight:800; color:${isNegative ? '#dc3545' : '#198754'}; margin-top:2px;">
                                        ₹${netBalance.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                    </div>
                                </div>
                                <button onclick="window.cbDepositToODModal()" style="padding:8px 14px; background:#10B981; color:#fff; border:none; border-radius:6px; font-weight:700; font-size:12px; cursor:pointer;">
                                    📥 + Deposit Funds
                                </button>
                            </div>
                            <div style="font-size:11px; color:#666; margin-top:6px; border-top:1px solid ${isNegative ? '#fecdd3' : '#bbf7d0'}; padding-top:6px;">
                                Inflow: <b>₹${totalInflow.toLocaleString('en-IN')}</b> | Outflow: <b>₹${totalOutflow.toLocaleString('en-IN')}</b>
                                ${isNegative ? ' — <b style="color:#dc3545;">(OD Running in Minus)</b>' : ' — <b style="color:#198754;">(In Surplus)</b>'}
                            </div>
                        </div>
                    `;
                }
            }
        });

        return { inflow: totalInflow, outflow: totalOutflow, balance: netBalance };
    } catch (error) {
        console.error("Error calculating OD balance:", error);
        return { inflow: 0, outflow: 0, balance: 0 };
    }
}

// Global Manager Export
window.UHHSODManager = {
    getDropdownHTML: getPaymentSourceDropdownHTML,
    getBadge: getPaymentSourceBadge,
    calculateBalance: calculateLiveODBalance
};

// =========================================================================
// 📥 GLOBAL MODAL: Deposit Funds into UHHS-OD Account
// =========================================================================
window.cbDepositToODModal = function() {
    const oldModal = document.querySelector('.od-deposit-modal-overlay');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay od-deposit-modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
    
    modal.innerHTML = `
        <div class="modal-box" style="background:#fff;border-radius:12px;padding:22px;max-width:450px;width:100%;box-shadow:0 10px 25px rgba(0,0,0,0.2);" onclick="event.stopPropagation()">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #eee;padding-bottom:10px;">
                <h3 style="margin:0;font-size:18px;color:#10B981;font-weight:800;">🏦 Deposit to UHHS-OD Account</h3>
                <button onclick="this.closest('.modal-overlay').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#888;">✕</button>
            </div>
            
            <div style="background:#f0fff4;padding:10px;border-radius:8px;font-size:12px;color:#155724;margin-bottom:14px;border:1px solid #c3e6cb;">
                Enter funds deposited by Firoz / Owner via UPI or Cash into the Overdraft Account.
            </div>

            <div class="form-group" style="margin-bottom:12px;">
                <label style="font-weight:600;font-size:13px;display:block;margin-bottom:4px;">Deposit Date *</label>
                <input id="odDepDate" type="date" value="${new Date().toISOString().slice(0,10)}" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
            </div>

            <div class="form-group" style="margin-bottom:12px;">
                <label style="font-weight:600;font-size:13px;display:block;margin-bottom:4px;">Amount (₹) *</label>
                <input id="odDepAmt" type="number" min="1" placeholder="e.g. 50000" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;font-size:16px;font-weight:700;box-sizing:border-box;">
            </div>

            <div class="form-group" style="margin-bottom:12px;">
                <label style="font-weight:600;font-size:13px;display:block;margin-bottom:4px;">Payment Mode *</label>
                <select id="odDepMode" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
                    <option value="UPI">UPI Transfer</option>
                    <option value="CASH">Cash Deposit</option>
                    <option value="BANK">Direct Net Banking / NEFT</option>
                </select>
            </div>

            <div class="form-group" style="margin-bottom:12px;">
                <label style="font-weight:600;font-size:13px;display:block;margin-bottom:4px;">Sender / Received From *</label>
                <input id="odDepFrom" type="text" value="FIROZ" placeholder="Sender name" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
            </div>

            <div class="form-group" style="margin-bottom:16px;">
                <label style="font-weight:600;font-size:13px;display:block;margin-bottom:4px;">Reference Note / Remarks</label>
                <input id="odDepNote" placeholder="e.g. Added for laundry and maintenance bills" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
            </div>

            <button onclick="window.cbSaveODDeposit()" style="width:100%;padding:12px;background:#10B981;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:15px;cursor:pointer;transition:0.2s;">
                💾 Save Deposit & Update Balance
            </button>
            <div id="odDepErr" style="margin-top:10px;color:#dc3545;font-size:12px;font-weight:600;text-align:center;"></div>
        </div>
    `;
    document.body.appendChild(modal);
};

// Save OD Deposit Controller
window.cbSaveODDeposit = async function() {
    const client = window.sb || window.supabaseClient || window.supabase;
    const date = document.getElementById('odDepDate').value;
    const amount = parseFloat(document.getElementById('odDepAmt').value) || 0;
    const mode = document.getElementById('odDepMode').value;
    const sender = document.getElementById('odDepFrom').value.trim();
    const note = document.getElementById('odDepNote').value.trim();
    const errDiv = document.getElementById('odDepErr');

    if (amount <= 0 || isNaN(amount)) {
        errDiv.innerText = "⚠️ Please enter a valid positive amount!";
        return;
    }
    if (!sender) {
        errDiv.innerText = "⚠️ Sender name is required!";
        return;
    }

    try {
        const { error } = await client.from('uhhs_od_account').insert([{
            transaction_date: date,
            description: `Funds added by ${sender} via ${mode}`,
            amount: amount,
            transaction_type: 'INFLOW',
            payment_mode: mode,
            received_from: sender,
            reference_note: note || null
        }]);

        if (error) {
            errDiv.innerText = "❌ DB Error: " + error.message;
            return;
        }

        // Close modal & notify
        document.querySelector('.od-deposit-modal-overlay')?.remove();
        if (window.fsn?.success) {
            fsn.success('Success', `🏦 ₹${amount.toLocaleString('en-IN')} deposited to UHHS-OD!`);
        } else {
            alert(`✅ ₹${amount.toLocaleString('en-IN')} deposited to UHHS-OD!`);
        }

        // Refresh UI & Balance
        if (window.UHHSODManager) window.UHHSODManager.calculateBalance(client);
        if (typeof window.renderCashBook === 'function') window.renderCashBook();
    } catch (err) {
        errDiv.innerText = "❌ Exception: " + err.message;
    }
};

// Global Handover All Cash Modal Handler (Fallback Fix)
window.cbBulkHandoverAllModal = window.cbBulkHandoverAllModal || function() {
    if (typeof window.cbHandover === 'function') {
        window.cbHandover('Company Cash', 0);
    } else {
        alert('🤝 Cash Handover action initialized.');
    }
};

console.log("✅ UHHS-OD Global Manager loaded & Global Modals Attached!");
