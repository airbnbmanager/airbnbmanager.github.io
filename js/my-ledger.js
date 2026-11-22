/**
 * 💼 REAL-TIME PAYMENT RECEIVER & CASH LEDGER
 * Tracks live money held by each staff member, manager, and company account.
 * "Kiske paas kitna paisa hai, real-time me"
 * The Unique Haven Homes CRM
 */

window._myLedgerSelectedPerson = window._myLedgerSelectedPerson || 'ALL';

window.renderMyLedger = async function() {
  const currentRole = SESSION.role || 'manager';
  const currentUser = SESSION.userName || SESSION.name || 'Praveen';
  const selectedPerson = window._myLedgerSelectedPerson || 'ALL';

  renderShell('<div class="card"><h1>💼 Cash & Payment Receiver Ledger</h1><div class="loading">Loading real-time transactions & balances...</div></div>', 'my-ledger');

  try {
    const [
      { data: holders },
      { data: payments },
      { data: handovers },
      { data: expenses }
    ] = await Promise.all([
      sb.from('cash_holders').select('*').eq('is_active', true).order('type').order('name'),
      sb.from('payment_history')
        .select('*, guest_register(guest_name, rooms(nickname, unit_no))')
        .neq('verification_status', 'rejected')
        .order('payment_date', { ascending: false })
        .limit(1000),
      sb.from('cash_handovers').select('*').order('handover_date', { ascending: false }),
      sb.from('cash_expenses').select('*').order('expense_date', { ascending: false })
    ]);

    // Build real-time stats for each person
    const stats = {};
    const getOrInit = (rawName) => {
      const name = (rawName || 'Unassigned').trim();
      if (!stats[name]) {
        stats[name] = {
          name,
          cashInHand: 0,
          cashHandedOver: 0,
          upiOnline: 0,
          totalCollected: 0,
          handoversGiven: 0,
          handoversRecv: 0,
          expensesPaid: 0,
          paymentsList: [],
          handoversInList: [],
          handoversOutList: [],
          expensesList: []
        };
      }
      return stats[name];
    };

    // Pre-populate with known holders
    (holders || []).forEach(h => getOrInit(h.name));

    // Process all payments
    (payments || []).forEach(p => {
      const rec = (p.received_by || 'Unassigned').trim();
      const s = getOrInit(rec);
      const amt = Number(p.amount || 0);
      s.totalCollected += amt;
      s.paymentsList.push(p);

      if (p.payment_mode === 'Cash') {
        if (p.handover_status === 'in_hand') {
          s.cashInHand += amt;
        } else {
          s.cashHandedOver += amt;
        }
      } else {
        s.upiOnline += amt;
      }
    });

    // Process handovers
    (handovers || []).forEach(h => {
      const amt = Number(h.amount || 0);
      if (h.from_person) {
        const sFrom = getOrInit(h.from_person);
        sFrom.handoversGiven += amt;
        sFrom.handoversOutList.push(h);
        // Handover settles cash in hand
        sFrom.cashInHand = Math.max(0, sFrom.cashInHand - amt);
      }
      if (h.to_person) {
        const sTo = getOrInit(h.to_person);
        sTo.handoversRecv += amt;
        sTo.handoversInList.push(h);
      }
    });

    // Process expenses paid in cash
    (expenses || []).forEach(e => {
      const amt = Number(e.amount || 0);
      if (e.paid_by) {
        const sPaid = getOrInit(e.paid_by);
        sPaid.expensesPaid += amt;
        sPaid.expensesList.push(e);
        sPaid.cashInHand = Math.max(0, sPaid.cashInHand - amt);
      }
    });

    const allReceiversList = Object.values(stats)
      .filter(x => x.totalCollected > 0 || x.cashInHand > 0 || x.handoversRecv > 0 || (holders || []).some(h => h.name === x.name))
      .sort((a, b) => (b.cashInHand * 1000 + b.totalCollected) - (a.cashInHand * 1000 + a.totalCollected));

    const totalCashInHandAll = allReceiversList.reduce((s, x) => s + x.cashInHand, 0);
    const totalUPIAll = allReceiversList.reduce((s, x) => s + x.upiOnline, 0);
    const totalGrossCollectedAll = allReceiversList.reduce((s, x) => s + x.totalCollected, 0);
    const totalHandedOverAll = allReceiversList.reduce((s, x) => s + x.cashHandedOver + x.handoversGiven, 0);

    let html = '';

    // Header & Filter Controls Bar
    html += `
      <div class="card" style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
          <div>
            <h1 style="margin:0;font-size:22px;font-weight:900;color:#0F172A;display:flex;align-items:center;gap:10px;">
              💼 Cash & Payment Receiver Ledger
            </h1>
            <div style="font-size:13px;color:#64748B;margin-top:4px;">
              Real-time tracking of cash in hand, UPI, and handovers across all team members
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <button onclick="quickAddNewPaymentReceiver().then(()=>renderMyLedger())" 
                    style="background:#2563EB;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;">
              ➕ Add Receiver
            </button>
            <button onclick="quickHandoverPrompt('', 0)" 
                    style="background:#059669;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;">
              🔄 Record Handover
            </button>
            <button onclick="renderMyLedger()" 
                    style="background:#F1F5F9;color:#334155;border:1px solid #CBD5E1;border-radius:8px;padding:8px 12px;font-size:13px;font-weight:700;cursor:pointer;">
              ⚡ Refresh
            </button>
          </div>
        </div>

        <!-- Filter Dropdown & Tabs -->
        <div style="display:flex;gap:12px;align-items:center;margin-top:16px;flex-wrap:wrap;background:#F8FAFC;padding:10px 14px;border-radius:10px;border:1px solid #E2E8F0;">
          <div style="display:flex;align-items:center;gap:8px;">
            <label style="font-size:13px;font-weight:700;color:#334155;">👤 Select View:</label>
            <select onchange="window._myLedgerSelectedPerson=this.value;renderMyLedger();" 
                    style="padding:8px 12px;border:1.5px solid #CBD5E1;border-radius:8px;font-size:13px;font-weight:700;background:#fff;color:#0F172A;cursor:pointer;">
              <option value="ALL" ${selectedPerson === 'ALL' ? 'selected' : ''}>👥 All Team Members (Team Overview)</option>
              ${allReceiversList.map(r => `
                <option value="${escapeHtml(r.name)}" ${selectedPerson === r.name ? 'selected' : ''}>
                  ${r.cashInHand > 0 ? '🔴 ' : '🟢 '} ${escapeHtml(r.name)} ${r.cashInHand > 0 ? `(Cash: ₹${r.cashInHand.toLocaleString('en-IN')})` : ''}
                </option>
              `).join('')}
            </select>
          </div>

          ${selectedPerson !== 'ALL' ? `
            <button onclick="window._myLedgerSelectedPerson='ALL';renderMyLedger();" 
                    style="background:#EEF2F6;border:none;border-radius:6px;padding:6px 10px;font-size:12px;font-weight:700;color:#475569;cursor:pointer;">
              ⬅️ Back to All Team Overview
            </button>
          ` : ''}
        </div>
      </div>
    `;

    // ═══ VIEW 1: ALL RECEIVERS OVERVIEW ═══
    if (selectedPerson === 'ALL') {
      html += `
        <!-- Top Metrics Cards -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:18px;">
          <div style="background:#FEF2F2;border:1px solid #FECACA;border-left:5px solid #DC2626;border-radius:12px;padding:16px;">
            <div style="font-size:11px;font-weight:800;color:#991B1B;text-transform:uppercase;letter-spacing:0.5px;">💵 Total Cash in Hand (Staff)</div>
            <div style="font-size:26px;font-weight:900;color:#DC2626;margin-top:4px;">₹${totalCashInHandAll.toLocaleString('en-IN')}</div>
            <div style="font-size:11.5px;color:#991B1B;margin-top:2px;">Currently held by team members</div>
          </div>
          <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-left:5px solid #2563EB;border-radius:12px;padding:16px;">
            <div style="font-size:11px;font-weight:800;color:#1E40AF;text-transform:uppercase;letter-spacing:0.5px;">📱 UPI & Online Total</div>
            <div style="font-size:26px;font-weight:900;color:#2563EB;margin-top:4px;">₹${totalUPIAll.toLocaleString('en-IN')}</div>
            <div style="font-size:11.5px;color:#1E40AF;margin-top:2px;">Direct digital payments</div>
          </div>
          <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-left:5px solid #059669;border-radius:12px;padding:16px;">
            <div style="font-size:11px;font-weight:800;color:#065F46;text-transform:uppercase;letter-spacing:0.5px;">🔄 Cash Handed Over</div>
            <div style="font-size:26px;font-weight:900;color:#059669;margin-top:4px;">₹${totalHandedOverAll.toLocaleString('en-IN')}</div>
            <div style="font-size:11.5px;color:#065F46;margin-top:2px;">Safely deposited or transferred</div>
          </div>
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-left:5px solid #475569;border-radius:12px;padding:16px;">
            <div style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">💰 Gross Revenue Collected</div>
            <div style="font-size:26px;font-weight:900;color:#0F172A;margin-top:4px;">₹${totalGrossCollectedAll.toLocaleString('en-IN')}</div>
            <div style="font-size:11.5px;color:#64748B;margin-top:2px;">Total booking receipts tracked</div>
          </div>
        </div>

        <!-- Real-time Balances Cards for Each Person -->
        <div class="card" style="margin-bottom:18px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <h2 style="margin:0;font-size:16px;font-weight:800;color:#1E293B;">
              👥 Live Balances by Team Member ("Kiske Paas Kitna Hai")
            </h2>
            <span style="font-size:12px;color:#64748B;font-weight:600;">${allReceiversList.length} Active Accounts</span>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;">
            ${allReceiversList.map(r => {
              const hasCash = r.cashInHand > 0;
              const isOD = r.name.includes('OD') || r.name.includes('UHHS') || r.name.includes('TUHH');
              return `
                <div style="background:${hasCash ? '#FFFBEB' : '#FFFFFF'};border:1.5px solid ${hasCash ? '#F59E0B' : '#E2E8F0'};border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);transition:all 0.15s;">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
                    <div>
                      <div style="font-size:15px;font-weight:800;color:#0F172A;display:flex;align-items:center;gap:6px;">
                        ${isOD ? '🏦' : '👤'} ${escapeHtml(r.name)}
                      </div>
                      <div style="font-size:11px;color:#64748B;margin-top:2px;">
                        ${r.paymentsList.length} payments recorded
                      </div>
                    </div>
                    ${hasCash 
                      ? `<span style="background:#FEE2E2;color:#DC2626;border:1px solid #FCA5A5;font-size:10px;font-weight:800;padding:3px 8px;border-radius:12px;">CASH IN HAND</span>`
                      : `<span style="background:#ECFDF5;color:#059669;border:1px solid #A7F3D0;font-size:10px;font-weight:800;padding:3px 8px;border-radius:12px;">ALL CLEAR</span>`}
                  </div>

                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;background:rgba(255,255,255,0.7);padding:10px;border-radius:8px;border:1px solid #E2E8F0;margin-bottom:12px;">
                    <div>
                      <div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;">💵 Cash in Hand</div>
                      <div style="font-size:18px;font-weight:800;color:${hasCash ? '#DC2626' : '#10B981'};margin-top:2px;">
                        ₹${r.cashInHand.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div>
                      <div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;">📱 UPI / Bank</div>
                      <div style="font-size:16px;font-weight:700;color:#2563EB;margin-top:2px;">
                        ₹${r.upiOnline.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div style="margin-top:4px;">
                      <div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;">🔄 Handed Over</div>
                      <div style="font-size:13px;font-weight:600;color:#475569;margin-top:2px;">
                        ₹${(r.cashHandedOver + r.handoversGiven).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div style="margin-top:4px;">
                      <div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;">💰 Total Gross</div>
                      <div style="font-size:13px;font-weight:700;color:#059669;margin-top:2px;">
                        ₹${r.totalCollected.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <div style="display:flex;gap:6px;">
                    ${hasCash ? `
                      <button type="button" onclick="window.quickHandoverPrompt('${r.name}', ${r.cashInHand})" 
                              style="flex:1;background:#059669;color:#fff;border:none;border-radius:6px;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer;">
                        🔄 Take Handover
                      </button>
                    ` : ''}
                    <button type="button" onclick="window._myLedgerSelectedPerson='${r.name}';renderMyLedger();" 
                            style="flex:1;background:#F1F5F9;color:#334155;border:1px solid #CBD5E1;border-radius:6px;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer;">
                      📜 View Statement
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Recent Payments Stream -->
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <h2 style="margin:0;font-size:16px;font-weight:800;color:#1E293B;">
              📋 Recent Booking Payments Log (${(payments || []).length} Transactions)
            </h2>
          </div>

          <div style="overflow-x:auto;">
            <table style="width:100%;font-size:13px;border-collapse:collapse;">
              <thead>
                <tr style="background:#F8FAFC;border-bottom:1.5px solid #E2E8F0;color:#475569;text-align:left;">
                  <th style="padding:10px 12px;">Date</th>
                  <th style="padding:10px 12px;">Guest / Stay</th>
                  <th style="padding:10px 12px;">Mode</th>
                  <th style="padding:10px 12px;">Received By</th>
                  <th style="padding:10px 12px;">Status</th>
                  <th style="padding:10px 12px;text-align:right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${(payments || []).slice(0, 50).map(p => {
                  const isInHand = p.payment_mode === 'Cash' && p.handover_status === 'in_hand';
                  return `
                    <tr style="border-bottom:1px solid #F1F5F9;${isInHand ? 'background:#FEFCE8;' : ''}">
                      <td style="padding:10px 12px;white-space:nowrap;color:#64748B;">${p.payment_date || '-'}</td>
                      <td style="padding:10px 12px;">
                        <div style="font-weight:700;color:#0F172A;">${escapeHtml(p.guest_register?.guest_name || 'Guest')}</div>
                        <div style="font-size:11px;color:#64748B;">${escapeHtml(p.guest_register?.rooms?.nickname || p.guest_register?.rooms?.unit_no || p.booking_id || '')}</div>
                      </td>
                      <td style="padding:10px 12px;">
                        <span style="font-weight:600;padding:2px 8px;border-radius:4px;font-size:11.5px;background:${p.payment_mode==='Cash'?'#FEF3C7':'#EFF6FF'};color:${p.payment_mode==='Cash'?'#92400E':'#1D4ED8'};">
                          ${p.payment_mode || 'Cash'}
                        </span>
                      </td>
                      <td style="padding:10px 12px;font-weight:700;color:#1E293B;">
                        ${escapeHtml(p.received_by || '-')}
                      </td>
                      <td style="padding:10px 12px;">
                        ${isInHand 
                          ? `<span style="background:#FEE2E2;color:#DC2626;font-size:10.5px;font-weight:800;padding:2px 6px;border-radius:4px;">In Hand</span>`
                          : `<span style="background:#ECFDF5;color:#059669;font-size:10.5px;font-weight:800;padding:2px 6px;border-radius:4px;">Cleared</span>`}
                      </td>
                      <td style="padding:10px 12px;text-align:right;font-weight:800;color:#059669;font-size:14px;">
                        ₹${Number(p.amount || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    // ═══ VIEW 2: INDIVIDUAL PERSON LEDGER ═══
    else {
      const pStats = stats[selectedPerson] || getOrInit(selectedPerson);
      const isOD = selectedPerson.includes('OD') || selectedPerson.includes('UHHS') || selectedPerson.includes('TUHH');

      html += `
        <!-- Person Summary Header Card -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:18px;">
          <div style="background:${pStats.cashInHand > 0 ? '#FEF2F2' : '#ECFDF5'};border:1px solid ${pStats.cashInHand > 0 ? '#FECACA' : '#A7F3D0'};border-left:5px solid ${pStats.cashInHand > 0 ? '#DC2626' : '#059669'};border-radius:12px;padding:16px;">
            <div style="font-size:11px;font-weight:800;color:${pStats.cashInHand > 0 ? '#991B1B' : '#065F46'};text-transform:uppercase;">💵 Cash in Hand (Live)</div>
            <div style="font-size:26px;font-weight:900;color:${pStats.cashInHand > 0 ? '#DC2626' : '#059669'};margin-top:4px;">₹${pStats.cashInHand.toLocaleString('en-IN')}</div>
            <div style="font-size:11.5px;color:${pStats.cashInHand > 0 ? '#991B1B' : '#065F46'};margin-top:2px;">
              ${pStats.cashInHand > 0 ? '⚠️ Cash to be collected from staff' : '✅ No pending cash held'}
            </div>
          </div>
          <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-left:5px solid #2563EB;border-radius:12px;padding:16px;">
            <div style="font-size:11px;font-weight:800;color:#1E40AF;text-transform:uppercase;">📱 UPI / Digital Collections</div>
            <div style="font-size:26px;font-weight:900;color:#2563EB;margin-top:4px;">₹${pStats.upiOnline.toLocaleString('en-IN')}</div>
            <div style="font-size:11.5px;color:#1E40AF;margin-top:2px;">Online receipts received in account</div>
          </div>
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-left:5px solid #475569;border-radius:12px;padding:16px;">
            <div style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;">💰 Total Payments Received</div>
            <div style="font-size:26px;font-weight:900;color:#0F172A;margin-top:4px;">₹${pStats.totalCollected.toLocaleString('en-IN')}</div>
            <div style="font-size:11.5px;color:#64748B;margin-top:2px;">Across ${pStats.paymentsList.length} transactions</div>
          </div>
        </div>

        <!-- Incoming Payments by Guest -->
        <div class="card" style="margin-bottom:18px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <h2 style="margin:0;font-size:16px;font-weight:800;color:#059669;">
              📥 Money Received by ${escapeHtml(selectedPerson)} (${pStats.paymentsList.length})
            </h2>
            ${pStats.cashInHand > 0 ? `
              <button onclick="quickHandoverPrompt('${escapeHtml(selectedPerson)}', ${pStats.cashInHand})" 
                      style="background:#059669;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;">
                🔄 Record Handover From ${escapeHtml(selectedPerson)}
              </button>
            ` : ''}
          </div>

          <div style="overflow-x:auto;">
            <table style="width:100%;font-size:13px;border-collapse:collapse;">
              <thead>
                <tr style="background:#F8FAFC;border-bottom:1.5px solid #E2E8F0;color:#475569;text-align:left;">
                  <th style="padding:10px 12px;">Date</th>
                  <th style="padding:10px 12px;">Guest</th>
                  <th style="padding:10px 12px;">Room</th>
                  <th style="padding:10px 12px;">Mode</th>
                  <th style="padding:10px 12px;">Status</th>
                  <th style="padding:10px 12px;text-align:right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${pStats.paymentsList.length === 0 ? `<tr><td colspan="6" style="text-align:center;padding:24px;color:#94A3B8;">No booking payments recorded under this receiver</td></tr>` : ''}
                ${pStats.paymentsList.map(p => {
                  const isInHand = p.payment_mode === 'Cash' && p.handover_status === 'in_hand';
                  return `
                    <tr style="border-bottom:1px solid #F1F5F9;${isInHand ? 'background:#FEFCE8;' : ''}">
                      <td style="padding:10px 12px;color:#64748B;">${p.payment_date || '-'}</td>
                      <td style="padding:10px 12px;font-weight:700;color:#0F172A;">${escapeHtml(p.guest_register?.guest_name || 'Guest')}</td>
                      <td style="padding:10px 12px;font-size:11.5px;color:#64748B;">${escapeHtml(p.guest_register?.rooms?.nickname || p.guest_register?.rooms?.unit_no || '-')}</td>
                      <td style="padding:10px 12px;">
                        <span style="font-weight:600;padding:2px 8px;border-radius:4px;font-size:11.5px;background:${p.payment_mode==='Cash'?'#FEF3C7':'#EFF6FF'};color:${p.payment_mode==='Cash'?'#92400E':'#1D4ED8'};">
                          ${p.payment_mode || 'Cash'}
                        </span>
                      </td>
                      <td style="padding:10px 12px;">
                        ${isInHand 
                          ? `<span style="background:#FEE2E2;color:#DC2626;font-size:10.5px;font-weight:800;padding:2px 6px;border-radius:4px;">In Hand</span>`
                          : `<span style="background:#ECFDF5;color:#059669;font-size:10.5px;font-weight:800;padding:2px 6px;border-radius:4px;">Handed Over</span>`}
                      </td>
                      <td style="padding:10px 12px;text-align:right;font-weight:800;color:#059669;">
                        ₹${Number(p.amount || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Handovers Given / Received -->
        ${pStats.handoversOutList.length > 0 || pStats.handoversInList.length > 0 ? `
          <div class="card" style="margin-bottom:18px;">
            <h2 style="margin:0 0 12px;font-size:16px;font-weight:800;color:#1E293B;">
              🔄 Cash Handovers History
            </h2>
            <div style="overflow-x:auto;">
              <table style="width:100%;font-size:13px;border-collapse:collapse;">
                <thead>
                  <tr style="background:#F8FAFC;border-bottom:1.5px solid #E2E8F0;color:#475569;text-align:left;">
                    <th style="padding:10px 12px;">Date</th>
                    <th style="padding:10px 12px;">Direction</th>
                    <th style="padding:10px 12px;">Counterparty</th>
                    <th style="padding:10px 12px;">Notes</th>
                    <th style="padding:10px 12px;text-align:right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${pStats.handoversOutList.map(h => `
                    <tr style="border-bottom:1px solid #F1F5F9;">
                      <td style="padding:10px 12px;color:#64748B;">${h.handover_date || '-'}</td>
                      <td style="padding:10px 12px;color:#DC2626;font-weight:700;">📤 Handed Over TO</td>
                      <td style="padding:10px 12px;font-weight:700;">${escapeHtml(h.to_person || '-')}</td>
                      <td style="padding:10px 12px;color:#64748B;font-size:11.5px;">${escapeHtml(h.notes || '-')}</td>
                      <td style="padding:10px 12px;text-align:right;font-weight:800;color:#DC2626;">-₹${Number(h.amount || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  `).join('')}
                  ${pStats.handoversInList.map(h => `
                    <tr style="border-bottom:1px solid #F1F5F9;">
                      <td style="padding:10px 12px;color:#64748B;">${h.handover_date || '-'}</td>
                      <td style="padding:10px 12px;color:#059669;font-weight:700;">📥 Received FROM</td>
                      <td style="padding:10px 12px;font-weight:700;">${escapeHtml(h.from_person || '-')}</td>
                      <td style="padding:10px 12px;color:#64748B;font-size:11.5px;">${escapeHtml(h.notes || '-')}</td>
                      <td style="padding:10px 12px;text-align:right;font-weight:800;color:#059669;">+₹${Number(h.amount || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}
      `;
    }

    renderShell(html, 'my-ledger');

  } catch (err) {
    console.error('Error rendering cash ledger:', err);
    renderShell(`<div class="card"><div class="error">❌ Failed to load ledger: ${err.message}</div></div>`, 'my-ledger');
  }
};

console.log('✅ Real-Time Multi-Receiver Cash Ledger module loaded');
