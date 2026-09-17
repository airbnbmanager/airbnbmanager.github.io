/**
 * UHHS-OD & Payment Source Global Manager (v2 FIXED)
 * THE UNIQUE HAVEN HOMES PRIVATE LIMITED
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
    } else if (s === 'COMPANY') {
        return `<span style="background-color:#198754; color:#ffffff; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:700; display:inline-block;">🏢 COMPANY</span>`;
    } else {
        return `<span style="background-color:#F59E0B; color:#ffffff; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:700; display:inline-block;">⚠️ OTHER</span>`;
    }
}

// Dual-layer LocalStorage deposit persistence helper
const OD_DEPOSITS_LOCAL_KEY = 'uhhs_od_deposits_v1';

function getLocalODDeposits() {
    try {
        const raw = localStorage.getItem(OD_DEPOSITS_LOCAL_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function setLocalODDeposits(list) {
    try {
        localStorage.setItem(OD_DEPOSITS_LOCAL_KEY, JSON.stringify(list || []));
    } catch (e) {}
}

async function getAllODDeposits(supabaseClient, startDate = '2026-09-12', endDate = null) {
    const client = supabaseClient || window.sb || window.supabaseClient || window.supabase;
    const localList = getLocalODDeposits();
    let dbList = [];

    if (client) {
        try {
            let q = client.from('uhhs_od_account').select('*').eq('transaction_type', 'INFLOW');
            if (startDate) q = q.gte('transaction_date', startDate);
            if (endDate) q = q.lte('transaction_date', endDate);
            const { data, error } = await q.order('transaction_date', { ascending: false });
            if (!error && Array.isArray(data)) {
                dbList = data;
            }
        } catch (e) {
            console.warn('UHHS-OD Supabase read notice:', e.message);
        }
    }

    // Merge & deduplicate by ID or (date + amount + sender)
    const map = new Map();
    dbList.forEach(d => {
        const key = d.id || `${d.transaction_date}_${d.amount}_${d.received_from}`;
        map.set(key, d);
    });

    localList.forEach(d => {
        const key = d.id || `${d.transaction_date}_${d.amount}_${d.received_from}`;
        if (!map.has(key)) {
            // Check date bounds
            if (startDate && d.transaction_date < startDate) return;
            if (endDate && d.transaction_date > endDate) return;
            map.set(key, d);
        }
    });

    return Array.from(map.values()).sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
}

// 3. Live UHHS-OD Balance Calculator with EXACT DB Table Names & Dual-Layer Inflows
async function calculateLiveODBalance(supabaseClient, customStartDate, customEndDate) {
    const client = supabaseClient || window.sb || window.supabaseClient || window.supabase;
    if (!client) return { inflow: 0, outflow: 0, balance: 0 };

    try {
        const startDate = customStartDate || "2026-09-12";
        const endDate = customEndDate || null;

        // A. Inflows (Supabase + LocalStorage)
        const odInflows = await getAllODDeposits(client, startDate, endDate);
        const totalInflow = (odInflows || []).reduce((sum, row) => sum + parseFloat(row.amount || 0), 0);

        let totalOutflow = 0;

        // Daily Expenses
        try {
            let q1 = client.from('reimbursements').select('amount, payment_source, paid_by, expense_date').gte('expense_date', startDate);
            if (endDate) q1 = q1.lte('expense_date', endDate);
            const { data: r1 } = await q1;
            if (r1) {
                totalOutflow += r1.filter(e => {
                    const s = String(e.payment_source || e.paid_by || '').toUpperCase();
                    return s.includes('OD') || s.includes('UHHS');
                }).reduce((s, r) => s + parseFloat(r.amount || 0), 0);
            }
        } catch (e) {}

        // Maintenance
        try {
            let q2 = client.from('maintenance_log').select('cost, payment_source, reported_date').gte('reported_date', startDate);
            if (endDate) q2 = q2.lte('reported_date', endDate);
            const { data: r2 } = await q2;
            if (r2) {
                totalOutflow += r2.filter(m => String(m.payment_source || '').toUpperCase().includes('OD'))
                                  .reduce((s, r) => s + parseFloat(r.cost || 0), 0);
            }
        } catch (e) {}

        // Laundry
        try {
            let q3 = client.from('laundry_payments').select('amount, payment_source, payment_date').gte('payment_date', startDate);
            if (endDate) q3 = q3.lte('payment_date', endDate);
            const { data: r3 } = await q3;
            if (r3) {
                totalOutflow += r3.filter(l => String(l.payment_source || '').toUpperCase().includes('OD'))
                                  .reduce((s, r) => s + parseFloat(r.amount || 0), 0);
            }
        } catch (e) {}

        // Staff Advances from OD
        try {
            const { data: r4 } = await client.from('advance_tracker').select('advance_amount, paid_by, date_given, created_at');
            if (r4) {
                totalOutflow += r4.filter(a => {
                    const aDate = a.date_given || (a.created_at || '').slice(0, 10);
                    if (aDate < startDate) return false;
                    if (endDate && aDate > endDate) return false;
                    const s = String(a.paid_by || '').toUpperCase();
                    return s.includes('OD') || s.includes('UHHS');
                }).reduce((s, r) => s + parseFloat(r.advance_amount || 0), 0);
            }
        } catch (e) {}

        const netBalance = totalInflow - totalOutflow;

        // Update Claims Manager Inflow / Outflow Sub-elements if present
        const inEl = document.getElementById('claims-od-inflow');
        if (inEl) inEl.innerText = `₹${totalInflow.toLocaleString('en-IN')}`;
        const outEl = document.getElementById('claims-od-outflow');
        if (outEl) outEl.innerText = `₹${totalOutflow.toLocaleString('en-IN')}`;

        const bannerElements = [
            document.getElementById('uhhs-od-balance-display'),
            document.getElementById('claims-od-banner-bal'),
            document.querySelector('.claims-od-bal-value')
        ];

        bannerElements.forEach(el => {
            if (el) {
                if (el.id === 'claims-od-banner-bal' || el.classList.contains('claims-od-bal-value')) {
                    const prefix = netBalance < 0 ? '-₹' : '₹';
                    const absVal = Math.abs(netBalance).toLocaleString('en-IN');
                    el.innerText = `${prefix}${absVal}`;
                    el.style.color = netBalance >= 0 ? '#15803D' : '#DC2626';
                } else {
                    const isNegative = netBalance < 0;
                    el.innerHTML = `
                        <div style="padding:14px; border-radius:10px; background:${isNegative ? '#fff5f5' : '#f0fff4'}; border:1.5px solid ${isNegative ? '#dc3545' : '#198754'}; margin-bottom:12px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <div style="font-size:12px; font-weight:700; color:#555; text-transform:uppercase;">🏦 UHHS-OD ACCOUNT BALANCE</div>
                                    <div style="font-size:24px; font-weight:800; color:${isNegative ? '#dc3545' : '#198754'}; margin-top:2px;">
                                        ${netBalance < 0 ? '-₹' : '₹'}${Math.abs(netBalance).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                    </div>
                                </div>
                                <button onclick="window.cbDepositToODModal()" style="padding:8px 14px; background:#10B981; color:#fff; border:none; border-radius:6px; font-weight:700; font-size:12px; cursor:pointer;">
                                    📥 + Deposit Funds
                                </button>
                            </div>
                            <div style="font-size:11px; color:#666; margin-top:6px; border-top:1px solid ${isNegative ? '#fecdd3' : '#bbf7d0'}; padding-top:6px;">
                                Inflow: <b>₹${totalInflow.toLocaleString('en-IN')}</b> | Outflow: <b>₹${totalOutflow.toLocaleString('en-IN')}</b>
                                ${isNegative ? ' — <b style="color:#dc3545;">(OD Running in Deficit)</b>' : ' — <b style="color:#198754;">(In Surplus)</b>'}
                            </div>
                        </div>
                    `;
                }
            }
        });

        return { inflow: totalInflow, outflow: totalOutflow, balance: netBalance, count: odInflows.length };
    } catch (error) {
        console.error("Error calculating OD balance:", error);
        return { inflow: 0, outflow: 0, balance: 0 };
    }
}

// Global Manager Export
window.UHHSODManager = {
    getDropdownHTML: getPaymentSourceDropdownHTML,
    getBadge: getPaymentSourceBadge,
    calculateBalance: calculateLiveODBalance,
    getDeposits: getAllODDeposits
};

// =========================================================================
// 📡 Cross-module "data changed" broadcaster — lets Claims Manager (and
// Cash Book) auto-refresh whenever an expense/maintenance/laundry/advance/
// deposit is saved, edited or deleted anywhere in the app.
// =========================================================================
window.notifyDataChanged = function() {
    try {
        window.dispatchEvent(new CustomEvent('uhhs:dataChanged'));
    } catch (e) { /* no-op */ }
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

// Save OD Deposit Controller (Dual-Layer: LocalStorage + Supabase)
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

    const newDep = {
        id: 'dep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        transaction_date: date,
        description: `Funds added by ${sender} via ${mode}`,
        amount: amount,
        transaction_type: 'INFLOW',
        payment_mode: mode,
        received_from: sender,
        reference_note: note || null,
        created_at: new Date().toISOString()
    };

    // 1. Immediately save to LocalStorage so data is never lost
    const localList = getLocalODDeposits();
    localList.unshift(newDep);
    setLocalODDeposits(localList);

    // 2. Attempt saving to Supabase
    if (client) {
        try {
            await client.from('uhhs_od_account').insert([{
                transaction_date: date,
                description: newDep.description,
                amount: amount,
                transaction_type: 'INFLOW',
                payment_mode: mode,
                received_from: sender,
                reference_note: note || null
            }]);
        } catch (dbErr) {
            console.warn('Supabase deposit insert notice (saved locally):', dbErr.message);
        }
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
    if (typeof window.loadClaimsData === 'function') window.loadClaimsData();
    if (typeof window.renderCashBook === 'function') window.renderCashBook();
    if (typeof window.showUhhsStatementModal === 'function') {
        const modal = document.querySelector('.modal-overlay');
        if (modal) { modal.remove(); window.showUhhsStatementModal(); }
    }
    window.notifyDataChanged();
};

// =========================================================================
// ✏️ GLOBAL MODAL: Edit / Delete an existing UHHS-OD Deposit Entry
// =========================================================================
window.cbEditODDeposit = async function(id) {
    const client = window.sb || window.supabaseClient || window.supabase;
    let d = null;

    // Check LocalStorage first
    const localList = getLocalODDeposits();
    d = localList.find(x => String(x.id) === String(id));

    if (!d && client) {
        try {
            const { data } = await client.from('uhhs_od_account').select('*').eq('id', id).single();
            if (data) d = data;
        } catch (e) {}
    }

    if (!d) {
        alert('❌ Deposit entry not found.');
        return;
    }

    const oldModal = document.querySelector('.od-edit-modal-overlay');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay od-edit-modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:100000;padding:20px;';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };

    modal.innerHTML = `
        <div class="modal-box" style="background:#fff;border-radius:12px;padding:22px;max-width:450px;width:100%;box-shadow:0 10px 25px rgba(0,0,0,0.2);" onclick="event.stopPropagation()">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #eee;padding-bottom:10px;">
                <h3 style="margin:0;font-size:18px;color:#3B82F6;font-weight:800;">✏️ Edit UHHS-OD Deposit</h3>
                <button onclick="this.closest('.modal-overlay').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#888;">✕</button>
            </div>

            <div class="form-group" style="margin-bottom:12px;">
                <label style="font-weight:600;font-size:13px;display:block;margin-bottom:4px;">Deposit Date *</label>
                <input id="odEditDate" type="date" value="${d.transaction_date}" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
            </div>

            <div class="form-group" style="margin-bottom:12px;">
                <label style="font-weight:600;font-size:13px;display:block;margin-bottom:4px;">Amount (₹) *</label>
                <input id="odEditAmt" type="number" min="1" value="${d.amount}" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;font-size:16px;font-weight:700;box-sizing:border-box;">
            </div>

            <div class="form-group" style="margin-bottom:12px;">
                <label style="font-weight:600;font-size:13px;display:block;margin-bottom:4px;">Payment Mode</label>
                <select id="odEditMode" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
                    <option value="UPI" ${d.payment_mode === 'UPI' ? 'selected' : ''}>UPI Transfer</option>
                    <option value="CASH" ${d.payment_mode === 'CASH' ? 'selected' : ''}>Cash Deposit</option>
                    <option value="BANK" ${d.payment_mode === 'BANK' ? 'selected' : ''}>Direct Net Banking / NEFT</option>
                </select>
            </div>

            <div class="form-group" style="margin-bottom:12px;">
                <label style="font-weight:600;font-size:13px;display:block;margin-bottom:4px;">Sender / Received From *</label>
                <input id="odEditFrom" type="text" value="${(d.received_from || '').replace(/"/g, '&quot;')}" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
            </div>

            <div class="form-group" style="margin-bottom:16px;">
                <label style="font-weight:600;font-size:13px;display:block;margin-bottom:4px;">Reference Note / Remarks</label>
                <input id="odEditNote" value="${(d.reference_note || '').replace(/"/g, '&quot;')}" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
            </div>

            <div style="display:flex;gap:8px;">
                <button onclick="window.cbSaveODEditDeposit('${id}')" style="flex:1;padding:12px;background:#3B82F6;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:15px;cursor:pointer;">💾 Save Changes</button>
                <button onclick="window.cbDeleteODDeposit('${id}')" style="flex:1;padding:12px;background:#DC2626;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:15px;cursor:pointer;">🗑️ Delete</button>
            </div>
            <div id="odEditErr" style="margin-top:10px;color:#dc3545;font-size:12px;font-weight:600;text-align:center;"></div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.cbSaveODEditDeposit = async function(id) {
    const client = window.sb || window.supabaseClient || window.supabase;
    const date = document.getElementById('odEditDate').value;
    const amount = parseFloat(document.getElementById('odEditAmt').value) || 0;
    const mode = document.getElementById('odEditMode').value;
    const sender = document.getElementById('odEditFrom').value.trim();
    const note = document.getElementById('odEditNote').value.trim();
    const errDiv = document.getElementById('odEditErr');

    if (amount <= 0 || isNaN(amount)) {
        errDiv.innerText = "⚠️ Please enter a valid positive amount!";
        return;
    }
    if (!sender) {
        errDiv.innerText = "⚠️ Sender name is required!";
        return;
    }

    // Update LocalStorage
    const localList = getLocalODDeposits();
    const idx = localList.findIndex(x => String(x.id) === String(id));
    if (idx >= 0) {
        localList[idx].transaction_date = date;
        localList[idx].amount = amount;
        localList[idx].payment_mode = mode;
        localList[idx].received_from = sender;
        localList[idx].reference_note = note || null;
        localList[idx].description = `Funds added by ${sender} via ${mode}`;
        setLocalODDeposits(localList);
    }

    // Update Supabase if possible
    if (client) {
        try {
            await client.from('uhhs_od_account').update({
                transaction_date: date,
                amount: amount,
                payment_mode: mode,
                received_from: sender,
                description: `Funds added by ${sender} via ${mode}`,
                reference_note: note || null
            }).eq('id', id);
        } catch (e) {}
    }

    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
    if (window.fsn?.success) {
        fsn.success('Updated', '✅ Deposit updated!');
    } else {
        alert('✅ Deposit updated!');
    }

    if (window.UHHSODManager) window.UHHSODManager.calculateBalance(client);
    if (typeof window.loadClaimsData === 'function') window.loadClaimsData();
    if (typeof window.showUhhsStatementModal === 'function') window.showUhhsStatementModal();
    if (typeof window.renderCashBook === 'function') window.renderCashBook();
    if (typeof window.notifyDataChanged === 'function') window.notifyDataChanged();
};

window.cbDeleteODDeposit = async function(id) {
    if (!confirm('🗑️ Delete this deposit entry? This cannot be undone.')) return;
    const client = window.sb || window.supabaseClient || window.supabase;

    // Delete from LocalStorage
    const localList = getLocalODDeposits();
    const filtered = localList.filter(x => String(x.id) !== String(id));
    setLocalODDeposits(filtered);

    // Delete from Supabase
    if (client) {
        try {
            await client.from('uhhs_od_account').delete().eq('id', id);
        } catch (e) {}
    }

    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
    if (window.fsn?.success) {
        fsn.success('Deleted', '✅ Deposit deleted!');
    } else {
        alert('✅ Deposit deleted!');
    }
    if (window.UHHSODManager) window.UHHSODManager.calculateBalance(client);
    if (typeof window.loadClaimsData === 'function') window.loadClaimsData();
    if (typeof window.showUhhsStatementModal === 'function') window.showUhhsStatementModal();
    if (typeof window.renderCashBook === 'function') window.renderCashBook();
    if (typeof window.notifyDataChanged === 'function') window.notifyDataChanged();
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
