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
function getPaymentSourceDropdownHTML(selected = 'UHHS-OD', id = 'payment_source') {
    return `
        <div class="form-group mb-2">
            <label class="form-label fw-bold" style="font-size:13px; color:#333;">
                💳 Payment Account / Source
            </label>
            <select id="${id}" name="payment_source" class="form-select form-control" style="border: 1.5px solid #0d6efd; font-weight: 600; width: 100%; max-width: 100%; box-sizing: border-box;" required>
                <option value="UHHS-OD" ${selected === 'UHHS-OD' ? 'selected' : ''}>🏦 TUHH-OD (Overdraft Account)</option>
                <option value="COMPANY" ${selected === 'COMPANY' ? 'selected' : ''}>🏢 COMPANY (Guest Rent / Cash in Hand)</option>
                <option value="FIROZ" ${selected === 'FIROZ' ? 'selected' : ''}>👤 FIROZ (Direct Personal)</option>
            </select>
        </div>
    `;
}

// 2. Badge UI Helper for Table Display
function getPaymentSourceBadge(source) {
    const s = (source || 'COMPANY').toUpperCase();
    if (s === 'UHHS-OD' || s === 'TUHH-OD') {
        return `<span style="background-color:#dc3545; color:#ffffff; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:700; display:inline-block;">🏦 TUHH-OD</span>`;
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

function normalizePaymentSource(src) {
    if (!src) return '';
    const s = String(src).trim().toUpperCase();
    if (s.includes('OD') || s.includes('UHHS') || s.includes('TUHH')) return 'UHHS-OD';
    return src;
}

function extractSecurityDeposit(b) {
    if (!b) return null;
    if (typeof window !== 'undefined' && typeof window.getSecurityDeposit === 'function') {
        const sec = window.getSecurityDeposit(b);
        if (sec && (sec.amount > 0 || (sec.status && sec.status !== 'none'))) return sec;
    }
    if (b.security_deposit_amount != null || b.security_deposit_status) {
        const amt = parseFloat(b.security_deposit_amount) || 0;
        const st = b.security_deposit_status || (amt > 0 ? 'collected' : 'none');
        if (amt > 0 || (st && st !== 'none')) {
            return {
                amount: amt,
                status: st,
                mode: b.security_deposit_mode || 'UPI',
                receivedBy: b.security_deposit_received_by || '',
                receivedDate: b.security_deposit_received_date || '',
                refundDate: b.security_deposit_refund_date || '',
                refundAmount: parseFloat(b.security_deposit_refund_amount) || 0,
                refundMode: b.security_deposit_refund_mode || 'UPI',
                refundedBy: b.security_deposit_refunded_by || '',
                deductedAmount: parseFloat(b.security_deposit_deducted_amount) || 0,
                deductionReason: b.security_deposit_deduction_reason || '',
                notes: b.security_deposit_notes || ''
            };
        }
    }
    if (b.notes && b.notes.includes('[SECURITY_DEPOSIT:')) {
        try {
            const match = b.notes.match(/\[SECURITY_DEPOSIT:(.*?)\]/);
            if (match && match[1]) {
                const p = JSON.parse(match[1]);
                return {
                    amount: parseFloat(p.amount) || 0,
                    status: p.status || (parseFloat(p.amount) > 0 ? 'collected' : 'none'),
                    mode: p.mode || 'UPI',
                    receivedBy: p.receivedBy || '',
                    receivedDate: p.receivedDate || '',
                    refundDate: p.refundDate || '',
                    refundAmount: parseFloat(p.refundAmount) || 0,
                    refundMode: p.refundMode || 'UPI',
                    refundedBy: p.refundedBy || '',
                    deductedAmount: parseFloat(p.deductedAmount) || 0,
                    deductionReason: p.deductionReason || '',
                    notes: p.notes || ''
                };
            }
        } catch (e) {}
    }
    return null;
}

let _hasNativeSecDepCols = null;

async function fetchRawSecurityDepositBookings(client) {
    if (!client) return [];
    try {
        if (_hasNativeSecDepCols !== false) {
            try {
                const { data, error } = await client.from('guest_register')
                    .select('booking_id, guest_name, room_id, check_in, check_out, notes, security_deposit_amount, security_deposit_status, security_deposit_mode, security_deposit_received_by, security_deposit_received_date, security_deposit_refund_date, security_deposit_refund_amount, security_deposit_refund_mode, security_deposit_refunded_by, security_deposit_deducted_amount, rooms(nickname, unit_no)')
                    .or('security_deposit_received_by.ilike.%OD%,security_deposit_received_by.ilike.%UHHS%,security_deposit_received_by.ilike.%TUHH%,security_deposit_refunded_by.ilike.%OD%,security_deposit_refunded_by.ilike.%UHHS%,security_deposit_refunded_by.ilike.%TUHH%,notes.ilike.%[SECURITY_DEPOSIT:%');
                if (!error && Array.isArray(data)) {
                    _hasNativeSecDepCols = true;
                    return data;
                }
                _hasNativeSecDepCols = false;
            } catch (e) {
                _hasNativeSecDepCols = false;
            }
        }
        const { data: fbData, error: fbErr } = await client.from('guest_register')
            .select('booking_id, guest_name, room_id, check_in, check_out, notes, rooms(nickname, unit_no)')
            .ilike('notes', '%[SECURITY_DEPOSIT:%');
        if (!fbErr && Array.isArray(fbData)) {
            return fbData;
        }
    } catch (e) {
        console.warn('Error fetching security deposit bookings:', e);
    }
    return [];
}

async function getODSecurityRefunds(client, startDate, endDate) {
    if (!client) return [];
    try {
        const secBookings = await fetchRawSecurityDepositBookings(client);
        const refunds = [];
        secBookings.forEach(b => {
            const sec = extractSecurityDeposit(b);
            if (!sec) return;
            const refAmt = parseFloat(sec.refundAmount || 0);
            const isODRef = normalizePaymentSource(sec.refundedBy) === 'UHHS-OD' || 
                            (normalizePaymentSource(sec.receivedBy) === 'UHHS-OD' && (sec.refundMode || 'UPI') !== 'Cash');
            if (refAmt > 0 && isODRef) {
                const refDate = sec.refundDate || b.check_out || '';
                if (startDate && refDate && refDate < startDate) return;
                if (endDate && refDate && refDate > endDate) return;

                const guestName = b.guest_name || 'Guest';
                const r = b.rooms;
                const roomStr = r ? (r.nickname ? `${r.nickname} (${r.unit_no || ''})` : (r.unit_no || '')) : '';
                const desc = `🛡️ Security Deposit Refund: ${guestName}${roomStr ? ' - ' + roomStr : ''} [Booking #${b.booking_id}]`;

                refunds.push({
                    id: 'sec_ref_' + b.booking_id,
                    booking_id: b.booking_id,
                    date: refDate,
                    desc: desc,
                    amount: refAmt,
                    mode: sec.refundMode || 'UPI',
                    created_at: refDate
                });
            }
        });
        return refunds;
    } catch (e) {
        console.warn('UHHS-OD security refund read error:', e.message);
        return [];
    }
}

// Default baseline reconciliation & settlement entries
const BASELINE_OD_ENTRIES = [
    {
        id: 'settlement_2026_09_16_od',
        transaction_date: '2026-09-16',
        description: 'Reconciliation & Full Settlement: All UHHS-OD expenses & advances settled up to 16-Sep-2026',
        amount: 77962,
        transaction_type: 'INFLOW',
        payment_mode: 'BANK',
        received_from: 'FIROZ / COMPANY SETTLEMENT',
        reference_note: 'Account reconciled and balanced to ₹0 as of 16-Sep-2026 11:59 PM. New active tracking starts 17-Sep-2026.'
    }
];

async function getAllODDeposits(supabaseClient, startDate = '2026-09-17', endDate = null) {
    const client = supabaseClient || window.sb || window.supabaseClient || window.supabase;
    const itemsMap = new Map();

    // 1. Baseline entries (settlement on 2026-09-16)
    BASELINE_OD_ENTRIES.forEach(d => {
        if (startDate && d.transaction_date < startDate) return;
        if (endDate && d.transaction_date > endDate) return;
        itemsMap.set(d.id, d);
    });

    if (client) {
        // 2. Primary cloud persistence: company_advances
        try {
            let q = client.from('company_advances').select('*').or('payment_source.eq.UHHS-OD,given_to.eq.UHHS-OD');
            if (startDate) q = q.gte('advance_date', startDate);
            if (endDate) q = q.lte('advance_date', endDate);
            const { data: caData, error: caErr } = await q.order('advance_date', { ascending: false });
            if (!caErr && Array.isArray(caData)) {
                caData.forEach(ca => {
                    // Exclude returns/handovers (which are outflows)
                    if (ca.given_by === 'UHHS-OD' || ca.status === 'Returned' || ca.status === 'Handover') return;
                    const uniqueKey = 'ca_' + ca.id;
                    itemsMap.set(uniqueKey, {
                        id: uniqueKey,
                        db_id: ca.id,
                        source_table: 'company_advances',
                        transaction_date: ca.advance_date,
                        description: ca.purpose || `Funds added by ${ca.given_by || 'Firoz'} via UPI`,
                        amount: parseFloat(ca.amount_given || 0),
                        transaction_type: 'INFLOW',
                        payment_mode: 'UPI',
                        received_from: ca.given_by || 'Firoz',
                        reference_note: ca.notes || null,
                        created_at: ca.created_at
                    });
                });
            }
        } catch (e) {
            console.warn('Company advances OD read error:', e.message);
        }

        // 2b. Auto-synced Guest Payments directly received into UHHS-OD
        try {
            let qPay = client.from('payment_history')
                .select('id, amount, payment_date, payment_mode, received_by, notes, booking_id, guest_register(guest_name, rooms(nickname, unit_no))')
                .or('received_by.eq.UHHS-OD,received_by.ilike.%UHHS-OD%')
                .neq('verification_status', 'rejected');
            if (startDate) qPay = qPay.gte('payment_date', startDate);
            if (endDate) qPay = qPay.lte('payment_date', endDate);
            const { data: payData, error: payErr } = await qPay.order('payment_date', { ascending: false });
            if (!payErr && Array.isArray(payData)) {
                payData.forEach(p => {
                    const uniqueKey = 'pay_' + p.id;
                    const guestName = p.guest_register?.guest_name || 'Guest';
                    const r = p.guest_register?.rooms;
                    const roomStr = r ? (r.nickname ? `${r.nickname} (${r.unit_no || ''})` : (r.unit_no || '')) : '';
                    const desc = `Guest Payment: ${guestName}${roomStr ? ' - ' + roomStr : ''} [Booking #${p.booking_id || ''}]`;
                    itemsMap.set(uniqueKey, {
                        id: uniqueKey,
                        db_id: p.id,
                        booking_id: p.booking_id,
                        source_table: 'payment_history',
                        transaction_date: p.payment_date,
                        description: desc,
                        amount: parseFloat(p.amount || 0),
                        transaction_type: 'INFLOW',
                        payment_mode: p.payment_mode || 'UPI',
                        received_from: guestName,
                        reference_note: p.notes || `Booking #${p.booking_id}`,
                        created_at: p.payment_date
                    });
                });
            }
        } catch (e) {
            console.warn('UHHS-OD payment_history auto-sync read error:', e.message);
        }

        // 2c. Auto-synced Guest Security Deposits directly received into UHHS-OD
        try {
            const secBookings = await fetchRawSecurityDepositBookings(client);
            secBookings.forEach(b => {
                const sec = extractSecurityDeposit(b);
                if (!sec) return;
                const isCollected = sec.amount > 0 && ['collected', 'refunded', 'partially_refunded', 'retained'].includes(sec.status);
                const isODReceived = normalizePaymentSource(sec.receivedBy) === 'UHHS-OD';

                if (isCollected && isODReceived) {
                    const txDate = sec.receivedDate || b.check_in || '';
                    if (startDate && txDate && txDate < startDate) return;
                    if (endDate && txDate && txDate > endDate) return;

                    const uniqueKey = 'sec_dep_' + b.booking_id;
                    const guestName = b.guest_name || 'Guest';
                    const r = b.rooms;
                    const roomStr = r ? (r.nickname ? `${r.nickname} (${r.unit_no || ''})` : (r.unit_no || '')) : '';
                    const desc = `🛡️ Security Deposit: ${guestName}${roomStr ? ' - ' + roomStr : ''} [Booking #${b.booking_id || ''}]`;

                    itemsMap.set(uniqueKey, {
                        id: uniqueKey,
                        db_id: b.booking_id,
                        booking_id: b.booking_id,
                        source_table: 'guest_register_security_deposit',
                        transaction_date: txDate,
                        description: desc,
                        amount: parseFloat(sec.amount || 0),
                        transaction_type: 'INFLOW',
                        payment_mode: sec.mode || 'UPI',
                        received_from: guestName,
                        reference_note: sec.notes || `Security Deposit Booking #${b.booking_id}`,
                        created_at: txDate,
                        isSecurityDeposit: true
                    });
                }
            });
        } catch (e) {
            console.warn('UHHS-OD security deposit auto-sync read error:', e.message);
        }

        // 3. Historical account_transactions prior to 2026-09-17
        try {
            if (!startDate || startDate <= '2026-09-16') {
                let q1 = client.from('account_transactions')
                    .select('*')
                    .eq('account_type', 'UHHS_OD')
                    .eq('transaction_type', 'INFLOW')
                    .lte('created_at', '2026-09-16');
                if (startDate) q1 = q1.gte('created_at', startDate);
                const { data: atData } = await q1.order('created_at', { ascending: false });
                if (Array.isArray(atData)) {
                    atData.forEach(at => {
                        const uniqueKey = 'at_' + at.id;
                        if (!itemsMap.has(uniqueKey)) {
                            itemsMap.set(uniqueKey, {
                                id: uniqueKey,
                                db_id: at.id,
                                source_table: 'account_transactions',
                                transaction_date: (at.created_at || '').slice(0, 10),
                                description: at.description || `Funds added by ${at.sender_name || 'Owner'} via ${at.payment_mode || 'UPI'}`,
                                amount: parseFloat(at.amount || 0),
                                transaction_type: 'INFLOW',
                                payment_mode: at.payment_mode || 'UPI',
                                received_from: at.sender_name || 'Owner',
                                reference_note: null,
                                created_at: at.created_at
                            });
                        }
                    });
                }
            }
        } catch (e) {}
    }

    return Array.from(itemsMap.values()).sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
}

// 3. Live UHHS-OD Ledger Engine & Single Source of Truth
async function getLedgerData(supabaseClient, customStartDate, customEndDate) {
    const client = supabaseClient || window.sb || window.supabaseClient || window.supabase;
    if (!client) return { txns: [], totalInflow: 0, totalOutflow: 0, netBalance: 0, openingBalance: 0 };

    const CHECKPOINT_START = "2026-09-17";
    const startDate = customStartDate || CHECKPOINT_START;
    const endDate = customEndDate || null;

    // ─── 0. CALCULATE OPENING BALANCE B/F (If startDate is after Checkpoint 17-Sep) ───
    let openingBalance = 0;
    let openingInflow = 0;
    let openingOutflow = 0;

    if (startDate > CHECKPOINT_START) {
        const d = new Date(startDate);
        d.setDate(d.getDate() - 1);
        const dayBefore = d.toISOString().slice(0, 10);

        const priorDeposits = await getAllODDeposits(client, CHECKPOINT_START, dayBefore);
        const [
            { data: pExps },
            { data: pMaints },
            { data: pLaunds },
            { data: pAdvs },
            { data: pReturns },
            pSecRefunds
        ] = await Promise.all([
            client.from('reimbursements').select('*').gte('expense_date', CHECKPOINT_START).lte('expense_date', dayBefore),
            client.from('maintenance_log').select('*').gte('reported_date', CHECKPOINT_START).lte('reported_date', dayBefore),
            client.from('laundry_payments').select('*').gte('payment_date', CHECKPOINT_START).lte('payment_date', dayBefore),
            client.from('advance_tracker').select('*').gte('date_given', CHECKPOINT_START).lte('date_given', dayBefore),
            client.from('company_advances').select('*').or('given_by.eq.UHHS-OD,status.eq.Returned,status.eq.Handover').gte('advance_date', CHECKPOINT_START).lte('advance_date', dayBefore),
            getODSecurityRefunds(client, CHECKPOINT_START, dayBefore)
        ]);

        const seenPrior = new Set();
        (priorDeposits || []).forEach(d => {
            const k = String(d.db_id || d.id);
            if (!seenPrior.has(k)) {
                seenPrior.add(k);
                openingInflow += parseFloat(d.amount || 0);
            }
        });

        (pExps || []).filter(e => normalizePaymentSource(e.payment_source || e.paid_by) === 'UHHS-OD').forEach(e => {
            openingOutflow += parseFloat(e.amount || 0);
        });
        (pMaints || []).filter(m => normalizePaymentSource(m.payment_source || m.paid_by) === 'UHHS-OD').forEach(m => {
            openingOutflow += parseFloat(m.cost || 0);
        });
        (pLaunds || []).filter(l => normalizePaymentSource(l.payment_source || l.payment_mode) === 'UHHS-OD').forEach(l => {
            openingOutflow += parseFloat(l.amount || 0);
        });
        (pAdvs || []).filter(a => normalizePaymentSource(a.paid_by) === 'UHHS-OD').forEach(a => {
            openingOutflow += parseFloat(a.advance_amount || 0);
        });
        (pReturns || []).forEach(r => {
            openingOutflow += parseFloat(r.amount_given || 0);
        });
        (pSecRefunds || []).forEach(sr => {
            openingOutflow += parseFloat(sr.amount || 0);
        });

        openingBalance = openingInflow - openingOutflow;
    }

    // 1. Deposits (Inflows in period)
    const deposits = await getAllODDeposits(client, startDate, endDate);

    // 2. Outflows (Parallel queries in period)
    let qReimb = client.from('reimbursements').select('*').gte('expense_date', startDate);
    if (endDate) qReimb = qReimb.lte('expense_date', endDate);

    let qMaint = client.from('maintenance_log').select('*').gte('reported_date', startDate);
    if (endDate) qMaint = qMaint.lte('reported_date', endDate);

    let qLaund = client.from('laundry_payments').select('*').gte('payment_date', startDate);
    if (endDate) qLaund = qLaund.lte('payment_date', endDate);

    let qAdv = client.from('advance_tracker').select('*, employees(name)');

    let qReturns = client.from('company_advances').select('*').or('given_by.eq.UHHS-OD,status.eq.Returned,status.eq.Handover').gte('advance_date', startDate);
    if (endDate) qReturns = qReturns.lte('advance_date', endDate);

    const [{ data: exps }, { data: maints }, { data: launds }, { data: allAdvs }, { data: returns }, secRefunds] = await Promise.all([
        qReimb, qMaint, qLaund, qAdv, qReturns, getODSecurityRefunds(client, startDate, endDate)
    ]);

    const txns = [];

    // Deduplicate Deposits
    const seenDepIds = new Set();
    (deposits || []).forEach(d => {
        const depKey = String(d.db_id || d.id);
        if (seenDepIds.has(depKey)) return;
        seenDepIds.add(depKey);

        txns.push({
            id: d.id,
            db_id: d.db_id,
            booking_id: d.booking_id,
            source_table: d.source_table || 'company_advances',
            date: d.transaction_date,
            type: 'DEPOSIT',
            desc: d.description || `Funds added by ${d.received_from || 'Firoz'} via ${d.payment_mode || 'UPI'}`,
            amount: parseFloat(d.amount || 0),
            isDep: true,
            isSecurityDeposit: !!d.isSecurityDeposit
        });
    });

    // Daily Expenses (-)
    (exps || []).filter(e => normalizePaymentSource(e.payment_source || e.paid_by) === 'UHHS-OD').forEach(e => {
        txns.push({
            id: e.id,
            source: 'reimbursements',
            date: e.expense_date,
            type: 'EXPENSE',
            desc: `Daily Expense: ${e.category || ''} - ${e.description || ''}`,
            amount: parseFloat(e.amount || 0),
            isDep: false
        });
    });

    // Maintenance (-)
    (maints || []).filter(m => normalizePaymentSource(m.payment_source || m.paid_by) === 'UHHS-OD').forEach(m => {
        txns.push({
            id: m.id,
            source: 'maintenance_log',
            date: m.reported_date,
            type: 'EXPENSE',
            desc: `Maintenance: ${m.issue_type || ''} - ${m.description || ''}`,
            amount: parseFloat(m.cost || 0),
            isDep: false
        });
    });

    // Laundry (-)
    (launds || []).filter(l => normalizePaymentSource(l.payment_source || l.payment_mode) === 'UHHS-OD').forEach(l => {
        txns.push({
            id: l.id,
            source: 'laundry_payments',
            date: l.payment_date,
            type: 'EXPENSE',
            desc: `Laundry: ${l.notes || ''}`,
            amount: parseFloat(l.amount || 0),
            isDep: false
        });
    });

    // Staff Advances (-)
    (allAdvs || []).filter(a => {
        const aDate = a.date_given || '';
        if (aDate < startDate) return false;
        if (endDate && aDate > endDate) return false;
        return normalizePaymentSource(a.paid_by) === 'UHHS-OD';
    }).forEach(a => {
        const realName = a.employees?.name || 'Staff';
        txns.push({
            id: a.id,
            source: 'advance_tracker',
            date: a.date_given,
            type: 'EXPENSE',
            desc: `Staff Advance (${realName}): ${a.reason || 'Advance'}`,
            amount: parseFloat(a.advance_amount || 0),
            isDep: false
        });
    });

    // Funds Returned to Company (-)
    (returns || []).forEach(r => {
        txns.push({
            id: 'ret_' + r.id,
            db_id: r.id,
            source: 'company_advances',
            date: r.advance_date,
            type: 'EXPENSE',
            desc: `💸 Return to Company: ${r.purpose || 'Funds returned to ' + (r.given_to || 'Company')}`,
            amount: parseFloat(r.amount_given || 0),
            isDep: false,
            isReturn: true
        });
    });

    // Security Deposit Refunds to Guests from UHHS-OD (-)
    (secRefunds || []).forEach(sr => {
        txns.push({
            id: sr.id,
            db_id: sr.booking_id,
            booking_id: sr.booking_id,
            source: 'guest_register_security_refund',
            date: sr.date,
            type: 'EXPENSE',
            desc: sr.desc,
            amount: parseFloat(sr.amount || 0),
            isDep: false,
            isSecurityRefund: true
        });
    });

    // Add Opening Balance row if openingBalance exists
    if (openingBalance !== 0) {
        txns.push({
            id: 'op_bal_' + startDate,
            db_id: null,
            date: startDate,
            type: 'OPENING_BAL',
            desc: `💼 Opening Balance B/F (accumulated from 17-Sep to ${startDate})`,
            amount: Math.abs(openingBalance),
            isDep: openingBalance >= 0,
            isOpening: true
        });
    }

    txns.sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalInflow = txns.filter(t => t.isDep && !t.isOpening).reduce((s, t) => s + t.amount, 0);
    const totalOutflow = txns.filter(t => !t.isDep && !t.isOpening).reduce((s, t) => s + t.amount, 0);
    const netBalance = openingBalance + totalInflow - totalOutflow;

    return { txns, totalInflow, totalOutflow, netBalance, openingBalance };
}

// 4. Live UHHS-OD Balance Calculator & DOM Synchronizer
async function calculateLiveODBalance(supabaseClient) {
    const client = supabaseClient || window.sb || window.supabaseClient || window.supabase;
    if (!client) return { inflow: 0, outflow: 0, balance: 0 };

    try {
        // 🏦 CRITICAL RULE: Top Banner ALWAYS calculates from the Checkpoint (2026-09-17) onwards,
        // so filtering the table below never distorts the true bank running balance!
        const { txns, totalInflow, totalOutflow, netBalance } = await getLedgerData(client, "2026-09-17", null);

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
                if (el.id === 'claims-od-banner-bal' || el.classList?.contains('claims-od-bal-value')) {
                    const prefix = netBalance < 0 ? '-₹' : '₹';
                    const absVal = Math.abs(netBalance).toLocaleString('en-IN');
                    el.innerText = `${prefix}${absVal}`;
                    el.style.color = netBalance >= 0 ? '#15803D' : '#DC2626';
                } else {
                    const isNegative = netBalance < 0;
                    el.innerHTML = `
                        <div style="padding:14px; border-radius:10px; background:${isNegative ? '#fff5f5' : '#f0fff4'}; border:1.5px solid ${isNegative ? '#dc3545' : '#198754'}; margin-bottom:12px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                                <div>
                                    <div style="font-size:12px; font-weight:700; color:#555; text-transform:uppercase;">🏦 TUHH-OD ACCOUNT BALANCE</div>
                                    <div style="font-size:24px; font-weight:800; color:${isNegative ? '#dc3545' : '#198754'}; margin-top:2px;">
                                        ${netBalance < 0 ? '-₹' : '₹'}${Math.abs(netBalance).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                    </div>
                                </div>
                                <div style="display:flex; gap:8px; align-items:center;">
                                    <button onclick="window.cbDepositToODModal()" style="padding:8px 12px; background:#10B981; color:#fff; border:none; border-radius:6px; font-weight:700; font-size:12px; cursor:pointer;">
                                        📥 + Deposit Funds
                                    </button>
                                    <button onclick="window.cbReturnFromODModal()" style="padding:8px 12px; background:#EF4444; color:#fff; border:none; border-radius:6px; font-weight:700; font-size:12px; cursor:pointer;">
                                        💸 Return to Company
                                    </button>
                                </div>
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

        return { inflow: totalInflow, outflow: totalOutflow, balance: netBalance, count: txns.length, txns };
    } catch (error) {
        console.error("Error calculating OD balance:", error);
        return { inflow: 0, outflow: 0, balance: 0, txns: [] };
    }
}

// Global Manager Export
window.UHHSODManager = {
    getDropdownHTML: getPaymentSourceDropdownHTML,
    getBadge: getPaymentSourceBadge,
    calculateBalance: calculateLiveODBalance,
    getDeposits: getAllODDeposits,
    getLedgerData: getLedgerData
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
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999999;padding:20px;backdrop-filter:blur(2px);';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
    
    modal.innerHTML = `
        <div class="modal-box" style="background:#fff;border-radius:12px;padding:22px;max-width:450px;width:100%;box-shadow:0 10px 25px rgba(0,0,0,0.2);" onclick="event.stopPropagation()">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #eee;padding-bottom:10px;">
                <h3 style="margin:0;font-size:18px;color:#10B981;font-weight:800;">🏦 Deposit to TUHH-OD Account</h3>
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
    if (window._isSavingODDeposit) return;
    window._isSavingODDeposit = true;

    const btn = document.querySelector('button[onclick*="cbSaveODDeposit"]');
    if (btn) {
        btn.disabled = true;
        btn.innerText = "⏳ Saving Deposit...";
    }

    const client = window.sb || window.supabaseClient || window.supabase;
    const date = document.getElementById('odDepDate').value;
    const amount = parseFloat(document.getElementById('odDepAmt').value) || 0;
    const mode = document.getElementById('odDepMode').value;
    const sender = document.getElementById('odDepFrom').value.trim();
    const note = document.getElementById('odDepNote').value.trim();
    const errDiv = document.getElementById('odDepErr');

    if (amount <= 0 || isNaN(amount)) {
        if (errDiv) errDiv.innerText = "⚠️ Please enter a valid positive amount!";
        if (btn) { btn.disabled = false; btn.innerText = "💾 Save Deposit & Update Balance"; }
        window._isSavingODDeposit = false;
        return;
    }
    if (!sender) {
        if (errDiv) errDiv.innerText = "⚠️ Sender name is required!";
        if (btn) { btn.disabled = false; btn.innerText = "💾 Save Deposit & Update Balance"; }
        window._isSavingODDeposit = false;
        return;
    }

    try {
        if (client) {
            // Save directly to Supabase company_advances (primary cloud store)
            const { data: caSaved, error: dbErr } = await client.from('company_advances').insert([{
                advance_date: date,
                amount_given: amount,
                given_by: sender,
                given_to: 'UHHS-OD',
                purpose: `Funds added by ${sender} via ${mode}${note ? ' - ' + note : ''}`,
                payment_source: 'UHHS-OD',
                status: 'Active',
                notes: note || 'UHHS-OD Deposit'
            }]).select();

            if (dbErr) {
                console.error('Company advances deposit insert error:', dbErr);
                throw dbErr;
            }
        }

        // Purge old local storage cache so it never collides with DB
        setLocalODDeposits([]);

        // Close deposit modal & notify
        document.querySelector('.od-deposit-modal-overlay')?.remove();
        if (window.fsn?.success) {
            fsn.success('Success', `🏦 ₹${amount.toLocaleString('en-IN')} deposited to TUHH-OD!`);
        } else {
            alert(`✅ ₹${amount.toLocaleString('en-IN')} deposited to TUHH-OD!`);
        }

        // Refresh UI & Balance
        if (window.UHHSODManager) window.UHHSODManager.calculateBalance(client);
        if (typeof window.loadClaimsData === 'function') window.loadClaimsData();
        if (typeof window.renderCashBook === 'function') window.renderCashBook();
        if (typeof window.showUhhsStatementModal === 'function') {
            const modal = document.querySelector('#uhhsLedgerModalOverlay');
            if (modal) { modal.remove(); window.showUhhsStatementModal(); }
        }
        if (typeof window.notifyDataChanged === 'function') window.notifyDataChanged();
    } catch (saveErr) {
        alert('❌ Error saving deposit: ' + (saveErr.message || saveErr));
    } finally {
        window._isSavingODDeposit = false;
    }
};

// =========================================================================
// 💸 GLOBAL MODAL: Return / Handover Funds to Company (from UHHS-OD)
// =========================================================================
window.cbReturnFromODModal = function() {
    const oldModal = document.querySelector('.od-return-modal-overlay');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay od-return-modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999999;padding:20px;backdrop-filter:blur(2px);';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };

    modal.innerHTML = `
        <div class="modal-box" style="background:#fff;border-radius:12px;padding:22px;max-width:450px;width:100%;box-shadow:0 10px 25px rgba(0,0,0,0.2);" onclick="event.stopPropagation()">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #eee;padding-bottom:10px;">
                <h3 style="margin:0;font-size:18px;color:#EF4444;font-weight:800;">💸 Return Funds to Company</h3>
                <button onclick="this.closest('.modal-overlay').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#888;">✕</button>
            </div>

            <div style="background:#fef2f2;padding:10px;border-radius:8px;font-size:12px;color:#991b1b;margin-bottom:14px;border:1px solid #fecaca;">
                Record funds returned / transferred from TUHH-OD back to Company or Firoz. This will reduce your TUHH-OD running balance.
            </div>

            <div class="form-group" style="margin-bottom:12px;">
                <label style="font-weight:600;font-size:13px;display:block;margin-bottom:4px;">Date *</label>
                <input id="odRetDate" type="date" value="${new Date().toISOString().slice(0,10)}" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
            </div>

            <div class="form-group" style="margin-bottom:12px;">
                <label style="font-weight:600;font-size:13px;display:block;margin-bottom:4px;">Amount (₹) *</label>
                <input id="odRetAmt" type="number" min="1" placeholder="e.g. 10000" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;font-size:16px;font-weight:700;box-sizing:border-box;">
            </div>

            <div class="form-group" style="margin-bottom:12px;">
                <label style="font-weight:600;font-size:13px;display:block;margin-bottom:4px;">Transfer Mode *</label>
                <select id="odRetMode" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
                    <option value="UPI">UPI Transfer</option>
                    <option value="BANK">Bank Transfer / NEFT</option>
                    <option value="CASH">Cash Handover</option>
                </select>
            </div>

            <div class="form-group" style="margin-bottom:12px;">
                <label style="font-weight:600;font-size:13px;display:block;margin-bottom:4px;">Returned To *</label>
                <select id="odRetTo" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
                    <option value="FIROZ">👤 Firoz Ahmad</option>
                    <option value="COMPANY">🏢 Company Bank Account</option>
                </select>
            </div>

            <div class="form-group" style="margin-bottom:16px;">
                <label style="font-weight:600;font-size:13px;display:block;margin-bottom:4px;">Reference Note / Remarks</label>
                <input id="odRetNote" placeholder="e.g. Returned guest excess / rent funds" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
            </div>

            <button onclick="window.cbSaveODReturn()" style="width:100%;padding:12px;background:#EF4444;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:15px;cursor:pointer;transition:0.2s;">
                💾 Save Return & Update Balance
            </button>
            <div id="odRetErr" style="margin-top:10px;color:#dc3545;font-size:12px;font-weight:600;text-align:center;"></div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.cbSaveODReturn = async function() {
    if (window._isSavingODReturn) return;
    window._isSavingODReturn = true;

    const btn = document.querySelector('button[onclick*="cbSaveODReturn"]');
    if (btn) {
        btn.disabled = true;
        btn.innerText = "⏳ Saving Return...";
    }

    const client = window.sb || window.supabaseClient || window.supabase;
    const date = document.getElementById('odRetDate').value;
    const amount = parseFloat(document.getElementById('odRetAmt').value) || 0;
    const mode = document.getElementById('odRetMode').value;
    const target = document.getElementById('odRetTo').value.trim();
    const note = document.getElementById('odRetNote').value.trim();
    const errDiv = document.getElementById('odRetErr');

    if (amount <= 0 || isNaN(amount)) {
        if (errDiv) errDiv.innerText = "⚠️ Please enter a valid positive amount!";
        if (btn) { btn.disabled = false; btn.innerText = "💾 Save Return & Update Balance"; }
        window._isSavingODReturn = false;
        return;
    }

    try {
        if (client) {
            // 1. Insert into company_advances as a Return
            const { error: dbErr } = await client.from('company_advances').insert([{
                advance_date: date,
                amount_given: amount,
                given_by: 'UHHS-OD',
                given_to: target || 'Company',
                purpose: `Funds returned to ${target || 'Company'} via ${mode}${note ? ' - ' + note : ''}`,
                payment_source: 'UHHS-OD',
                status: 'Returned',
                notes: note || 'Funds returned to company'
            }]);

            if (dbErr) throw dbErr;

            // 2. If mode is CASH, also log in cash_handovers for Cash Book transparency
            if (mode === 'CASH') {
                try {
                    await client.from('cash_handovers').insert([{
                        from_person: 'UHHS-OD',
                        to_person: target === 'FIROZ' ? 'Firoz' : 'Company',
                        amount: amount,
                        handover_date: date,
                        notes: `Cash return from UHHS-OD | ${note || ''}`,
                        created_by: window.SESSION?.userId || null
                    }]);
                } catch (e) {
                    console.warn('cash_handovers sync note:', e.message);
                }
            }
        }

        document.querySelector('.od-return-modal-overlay')?.remove();
        if (window.fsn?.success) {
            fsn.success('Success', `💸 ₹${amount.toLocaleString('en-IN')} returned to ${target}!`);
        } else {
            alert(`✅ ₹${amount.toLocaleString('en-IN')} returned to ${target}!`);
        }

        // Refresh UI & Balance
        if (window.UHHSODManager) window.UHHSODManager.calculateBalance(client);
        if (typeof window.loadClaimsData === 'function') window.loadClaimsData();
        if (typeof window.renderCashBook === 'function') window.renderCashBook();
        if (typeof window.showUhhsStatementModal === 'function') {
            const modal = document.querySelector('#uhhsLedgerModalOverlay');
            if (modal) { modal.remove(); window.showUhhsStatementModal(); }
        }
        if (typeof window.notifyDataChanged === 'function') window.notifyDataChanged();
    } catch (saveErr) {
        console.error('Error saving return:', saveErr);
        if (errDiv) errDiv.innerText = "❌ Save failed: " + (saveErr.message || saveErr);
        if (btn) { btn.disabled = false; btn.innerText = "💾 Save Return & Update Balance"; }
    } finally {
        window._isSavingODReturn = false;
    }
};

// =========================================================================
// ✏️ GLOBAL MODAL: Edit / Delete an existing UHHS-OD Deposit Entry
// =========================================================================
window.cbEditODDeposit = async function(id) {
    const client = window.sb || window.supabaseClient || window.supabase;
    let d = null;

    if (String(id).startsWith('sec_dep_') || String(id).startsWith('sec_ref_')) {
        const bkId = String(id).replace('sec_dep_', '').replace('sec_ref_', '');
        if (typeof window.showSecurityDepositModal === 'function') {
            window.showSecurityDepositModal(bkId);
        } else {
            alert('ℹ️ This is an auto-synced Guest Security Deposit. You can manage or refund this deposit directly in the Bookings manager.');
        }
        return;
    }

    if (String(id).startsWith('pay_')) {
        alert('ℹ️ This is an auto-synced Guest Booking Payment. Any changes to this payment or booking (or deleting the booking) in the Bookings manager will automatically sync with UHHS-OD.');
        return;
    }

    if (String(id).startsWith('ret_')) {
        const retId = id.replace('ret_', '');
        if (confirm('Delete this Return to Company record? The amount will be added back to your TUHH-OD balance.')) {
            await client.from('company_advances').delete().eq('id', retId);
            if (window.fsn?.success) fsn.success('Deleted', 'Return record deleted');
            if (window.UHHSODManager) window.UHHSODManager.calculateBalance(client);
            if (typeof window.showUhhsStatementModal === 'function') {
                const m = document.querySelector('#uhhsLedgerModalOverlay');
                if (m) { m.remove(); window.showUhhsStatementModal(); }
            }
            if (typeof window.notifyDataChanged === 'function') window.notifyDataChanged();
        }
        return;
    }

    // Check LocalStorage first
    const localList = getLocalODDeposits();
    d = localList.find(x => String(x.id) === String(id));

    if (!d && client) {
        if (String(id).startsWith('ca_')) {
            const realId = id.replace('ca_', '');
            try {
                const { data } = await client.from('company_advances').select('*').eq('id', realId).single();
                if (data) {
                    d = {
                        id: 'ca_' + data.id,
                        transaction_date: data.advance_date,
                        amount: data.amount_given,
                        payment_mode: 'UPI',
                        received_from: data.given_by || 'Firoz',
                        reference_note: data.notes || '',
                        description: data.purpose
                    };
                }
            } catch (e) {}
        } else {
            try {
                const { data } = await client.from('uhhs_od_account').select('*').eq('id', id).single();
                if (data) d = data;
            } catch (e) {}
        }
    }

    if (!d) {
        alert('❌ Deposit entry not found.');
        return;
    }

    const oldModal = document.querySelector('.od-edit-modal-overlay');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay od-edit-modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999999;padding:20px;backdrop-filter:blur(2px);';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };

    modal.innerHTML = `
        <div class="modal-box" style="background:#fff;border-radius:12px;padding:22px;max-width:450px;width:100%;box-shadow:0 10px 25px rgba(0,0,0,0.2);" onclick="event.stopPropagation()">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #eee;padding-bottom:10px;">
                <h3 style="margin:0;font-size:18px;color:#3B82F6;font-weight:800;">✏️ Edit TUHH-OD Deposit</h3>
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

    // Update Supabase by exact ID
    if (client) {
        const dbId = String(id).startsWith('ca_') ? parseInt(id.replace('ca_', ''), 10) : parseInt(id, 10);
        if (!isNaN(dbId)) {
            try {
                await client.from('company_advances').update({
                    advance_date: date,
                    amount_given: amount,
                    given_by: sender,
                    purpose: `Funds added by ${sender} via ${mode}${note ? ' - ' + note : ''}`,
                    notes: note || 'UHHS-OD Deposit'
                }).eq('id', dbId);
            } catch (e) {
                console.error('Failed to update company_advances:', e);
            }
        }
    }

    setLocalODDeposits([]);

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
    if (String(id).startsWith('sec_dep_') || String(id).startsWith('sec_ref_')) {
        alert('ℹ️ This is an auto-synced Guest Security Deposit. To edit, refund or remove this deposit, update the booking in the Bookings manager.');
        return;
    }
    if (String(id).startsWith('pay_')) {
        alert('ℹ️ This is an auto-synced Guest Booking Payment. To delete or edit this payment, update the booking in the Bookings manager.');
        return;
    }
    if (!confirm('🗑️ Delete this deposit entry? This cannot be undone.')) return;
    const client = window.sb || window.supabaseClient || window.supabase;

    // Delete strictly by exact record ID
    if (client) {
        const dbId = String(id).startsWith('ca_') ? parseInt(id.replace('ca_', ''), 10) : parseInt(id, 10);
        if (!isNaN(dbId)) {
            try {
                await client.from('company_advances').delete().eq('id', dbId);
            } catch (e) {
                console.error('Failed to delete company_advances:', e);
            }
        } else if (id && !String(id).startsWith('dep_')) {
            try { await client.from('account_transactions').delete().eq('id', id); } catch (e) {}
        }
    }

    setLocalODDeposits([]);

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

// Auto-refresh OD balance on cross-module data changes
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('uhhs:dataChanged', () => {
        const client = window.sb || window.supabaseClient || window.supabase;
        if (client && window.UHHSODManager && typeof window.UHHSODManager.calculateBalance === 'function') {
            window.UHHSODManager.calculateBalance(client);
        }
    });
}

console.log("✅ UHHS-OD Global Manager loaded & Global Modals Attached!");
