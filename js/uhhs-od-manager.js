/**
 * UHHS-OD & Payment Source Global Manager
 * Handles UHHS-OD, FIROZ, and COMPANY account balances & UI helpers
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
            <select id="${id}" name="payment_source" class="form-select form-control" style="border: 1.5px solid #0d6efd; font-weight: 500;" required>
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

// 3. Live UHHS-OD Running Balance Calculator
async function calculateLiveODBalance(supabaseClient) {
    const client = supabaseClient || window.supabaseClient || window.supabase;
    if (!client) {
        console.warn("Supabase client not found for OD balance calculation");
        return { inflow: 0, outflow: 0, balance: 0 };
    }

    try {
        // A. Total Inflow received in UHHS-OD account (from Firoz via UPI/Cash)
        const { data: odInflows, error: inErr } = await client
            .from('uhhs_od_account')
            .select('amount')
            .eq('transaction_type', 'INFLOW');

        const totalInflow = (odInflows || []).reduce((sum, row) => sum + parseFloat(row.amount || 0), 0);

        // B. Total Outflows spent using UHHS-OD across all expense modules
        const tables = ['expenses', 'maintenance', 'laundry', 'employee_advances', 'company_advances', 'claims', 'reimbursements'];
        let totalOutflow = 0;

        for (const tbl of tables) {
            try {
                const { data: rows } = await client
                    .from(tbl)
                    .select('amount')
                    .eq('payment_source', 'UHHS-OD');
                if (rows) {
                    totalOutflow += rows.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
                }
            } catch (err) {
                // Skip if table has slight schema difference
            }
        }

        const netBalance = totalInflow - totalOutflow;

        // C. Update UI Card if element exists
        const odCardEl = document.getElementById('uhhs-od-balance-display');
        if (odCardEl) {
            const isNegative = netBalance < 0;
            odCardEl.innerHTML = `
                <div style="padding:12px; border-radius:8px; background:${isNegative ? '#fff5f5' : '#f0fff4'}; border:1.5px solid ${isNegative ? '#dc3545' : '#198754'};">
                    <div style="font-size:12px; font-weight:600; color:#666;">🏦 UHHS-OD ACCOUNT BALANCE</div>
                    <div style="font-size:22px; font-weight:800; color:${isNegative ? '#dc3545' : '#198754'}; margin-top:4px;">
                        ₹${netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div style="font-size:11px; color:#777; margin-top:4px;">
                        Inflow: ₹${totalInflow.toLocaleString('en-IN')} | Outflow: ₹${totalOutflow.toLocaleString('en-IN')}
                        ${isNegative ? ' <b style="color:#dc3545;">(OD Running in Minus)</b>' : ' <b style="color:#198754;">(In Surplus)</b>'}
                    </div>
                </div>
            `;
        }

        return { inflow: totalInflow, outflow: totalOutflow, balance: netBalance };
    } catch (error) {
        console.error("Error calculating OD balance:", error);
        return { inflow: 0, outflow: 0, balance: 0 };
    }
}

// 4. Deposit Money into UHHS-OD Account (Inflow Entry)
async function depositToUHHSOD(supabaseClient, { amount, received_from = 'FIROZ', payment_mode = 'UPI', reference_note = '', date = new Date().toISOString().split('T')[0] }) {
    const client = supabaseClient || window.supabaseClient || window.supabase;
    return await client.from('uhhs_od_account').insert([{
        transaction_date: date,
        description: `Funds added by ${received_from} via ${payment_mode}`,
        amount: parseFloat(amount),
        transaction_type: 'INFLOW',
        payment_mode: payment_mode,
        received_from: received_from,
        reference_note: reference_note
    }]);
}

window.UHHSODManager = {
    getDropdownHTML: getPaymentSourceDropdownHTML,
    getBadge: getPaymentSourceBadge,
    calculateBalance: calculateLiveODBalance,
    deposit: depositToUHHSOD
};
