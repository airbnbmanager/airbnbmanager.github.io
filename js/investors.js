/**
 * Investors Module
 * UNIQUE HAVEN HOMES STAY
 */

async function renderManageInvestors() {
  renderShell(`<div class="loading">Loading...</div>`, 'investors');
  const [{data:invs},{data:links},{data:rooms}] = await Promise.all([
    sb.from('investors').select('*').order('name'),
    sb.from('investor_properties').select('*, investors(name), rooms(unit_no,property_name,nickname)'),
    sb.from('rooms').select('room_id,unit_no,property_name,nickname').order('room_id')
  ]);
  window._invRooms = rooms || [];

  const invPropMap = {};
  (links||[]).forEach(l => {
    if (!invPropMap[l.investor_id]) invPropMap[l.investor_id] = [];
    invPropMap[l.investor_id].push(l);
  });

  renderShell(`
    <div class="card">
      <h1>🧑‍💼 Investors</h1>
      <div class="sub">${(invs||[]).length} investors</div>
      <div class="btn-row">
        <button onclick="renderAddInv()">➕ Add Investor</button>
        <button class="secondary" onclick="renderLinkProp()">🔗 Link Property</button>
      </div>
    </div>
    <div class="card">
      <div class="section-title">All Investors</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Phone</th><th>Share</th><th>Properties</th><th>Report</th></tr></thead>
        <tbody>${(invs||[]).map(i => {
          const iLinks = invPropMap[i.investor_id] || [];
          const propNames = iLinks.map(l => l.rooms?.nickname || l.room_id).join(', ') || '-';
          return `<tr>
            <td><strong>${i.name}</strong></td>
            <td>${i.phone||'-'}</td>
            <td><span class="badge green">${i.revenue_share_pct||70}%</span></td>
            <td style="font-size:12px;">${propNames}</td>
            <td class="table-actions">
              ${iLinks.map(l=>`<button class="btn-sm" onclick="renderInvestorReport('${i.investor_id}','${l.room_id}')">📊</button>`).join('')||'-'}
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>
    <div class="card">
      <div class="section-title">Property Mapping</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Property</th><th>Investor</th><th>Remove</th></tr></thead>
        <tbody>${(links||[]).map(l=>`<tr>
          <td><strong>${l.rooms?.nickname||l.room_id}</strong></td>
          <td>${l.investors?.name||l.investor_id}</td>
          <td><button class="btn-sm danger" onclick="unlinkProperty('${l.investor_id}','${l.room_id}')">🗑️</button></td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>
  `, 'investors');
}

async function unlinkProperty(inv,room) {
  if (!confirm('Remove link?')) return;
  await sb.from('investor_properties').delete().eq('investor_id',inv).eq('room_id',room);
  renderManageInvestors();
}

async function renderAddInv() {
  const {data:rooms} = await sb.from('rooms').select('room_id, nickname, unit_no').order('room_id');
  renderShell(`
    <div class="card"><h1>➕ Add Investor</h1><button class="secondary btn-sm" onclick="renderManageInvestors()">← Back</button></div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group"><label>Name *</label><input id="invName" /></div>
        <div class="form-group"><label>Phone</label><input id="invPhone" type="tel" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Revenue Share %</label><input id="invShare" type="number" value="70" /></div>
        <div class="form-group"><label>Email</label><input id="invEmail" type="email" placeholder="For future login" /></div>
      </div>
      <div class="form-group"><label>Assign Properties</label>
        <select id="invRooms" multiple style="min-height:120px;">
          ${(rooms||[]).map(r=>`<option value="${r.room_id}">${r.nickname||r.unit_no}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Notes</label><textarea id="invNotes"></textarea></div>
      <button onclick="saveInvSafe()" style="width:100%;margin-top:10px;">💾 Save Investor</button>
      <div id="invErr"></div>
    </div>
  `, 'investors');
}

async function saveInvSafe() {
  const btn = document.querySelector('button[onclick="saveInvSafe()"]');
  if (btn) { btn.disabled=true; btn.textContent='⏳ Saving...'; }
  const name = document.getElementById('invName').value.trim();
  if (!name) { document.getElementById('invErr').innerHTML='<div class="error">Name required</div>'; if(btn){btn.disabled=false;btn.textContent='💾 Save Investor';} return; }

  const phone = document.getElementById('invPhone').value.trim();
  const share = parseFloat(document.getElementById('invShare').value) || 70;
  const email = document.getElementById('invEmail').value.trim();
  const notes = document.getElementById('invNotes').value.trim();
  const roomsSelect = document.getElementById('invRooms');
  const selectedRooms = roomsSelect ? Array.from(roomsSelect.selectedOptions).map(o=>o.value) : [];

  try {
    const investorId = 'INV'+Date.now();
    const {error} = await sb.from('investors').insert({
      investor_id:investorId, name, phone:phone||null,
      revenue_share_pct:share,
      notes:[notes,email?`Email: ${email}`:''].filter(Boolean).join(' | ')||null
    });
    if (error) throw new Error(error.message);

    if (selectedRooms.length > 0) {
      const links = selectedRooms.map(rid=>({investor_id:investorId, room_id:rid}));
      await sb.from('investor_properties').insert(links);
    }

    renderShell(`
      <div class="card" style="text-align:center;">
        <div style="font-size:48px;margin-bottom:10px;">✅</div>
        <h1>Investor Added</h1>
        <div class="metric-row"><span class="metric-label">Name</span><span class="metric-value">${name}</span></div>
        <div class="metric-row"><span class="metric-label">Share</span><span>${share}%</span></div>
        <div class="metric-row"><span class="metric-label">ID</span><code>${investorId}</code></div>
        <button class="secondary" onclick="renderManageInvestors()" style="margin-top:12px;">← Back</button>
      </div>
    `, 'investors');
  } catch(err) {
    document.getElementById('invErr').innerHTML=`<div class="error">${err.message}</div>`;
    if(btn){btn.disabled=false;btn.textContent='💾 Save Investor';}
  }
}

async function renderLinkProp() {
  const {data:invs} = await sb.from('investors').select('investor_id,name').order('name');
  renderShell(`
    <div class="card"><h1>🔗 Link Property</h1><button class="secondary btn-sm" onclick="renderManageInvestors()">← Back</button></div>
    <div class="card">
      <div class="form-group"><label>Investor</label>
        <select id="lInv"><option value="">Select</option>${(invs||[]).map(i=>`<option value="${i.investor_id}">${i.name}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Property</label>
        <select id="lRoom"><option value="">Select</option>${(window._invRooms||[]).map(r=>`<option value="${r.room_id}">${r.nickname||r.unit_no}</option>`).join('')}</select>
      </div>
      <button onclick="saveLink()" style="width:100%;">💾 Link</button>
      <div id="lErr"></div>
    </div>
  `, 'investors');
}

async function saveLink() {
  const inv=document.getElementById('lInv').value, room=document.getElementById('lRoom').value;
  if(!inv||!room){document.getElementById('lErr').innerHTML='<div class="error">Both required</div>';return;}
  await sb.from('investor_properties').insert({investor_id:inv,room_id:room});
  renderManageInvestors();
}

// ============ INVESTOR REPORT ============
async function renderInvestorReport(investorId, roomId, month) {
  renderShell(`<div class="loading">Generating report...</div>`, 'investors');
  const now = new Date();
  const selMonth = month || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthLabel = new Date(selMonth+'-01').toLocaleString('en-IN',{month:'long',year:'numeric'});
  const monthStart = selMonth+'-01';
  const monthEnd = new Date(parseInt(selMonth.split('-')[0]),parseInt(selMonth.split('-')[1]),0).toISOString().slice(0,10);

  const [{data:inv},{data:room},{data:bookings},{data:defaults},{data:expenses},{data:payments}] = await Promise.all([
    sb.from('investors').select('*').eq('investor_id',investorId).single(),
    sb.from('rooms').select('*').eq('room_id',roomId).single(),
    sb.from('guest_register').select('*').eq('room_id',roomId).gte('check_in',monthStart).lte('check_in',monthEnd),
    sb.from('property_default_expenses').select('*').eq('room_id',roomId).order('expense_name'),
    sb.from('expenses').select('*, expense_categories(category_name)').eq('room_id',roomId),
    sb.from('payment_history').select('booking_id, amount'),
  ]);

  const share = inv?.revenue_share_pct||70;
  const cs = 100-share;
  const bkIds = (bookings||[]).map(b=>b.booking_id);
  const pm = {};
  (payments||[]).forEach(p=>{if(bkIds.includes(p.booking_id))pm[p.booking_id]=(pm[p.booking_id]||0)+(p.amount||0);});

  const cn = b => b.check_in&&b.check_out?calcNights(b.check_in,b.check_out):0;
  const onBks = (bookings||[]).filter(b=>b.booking_mode==='Online-Airbnb');
  const offBks = (bookings||[]).filter(b=>b.booking_mode!=='Online-Airbnb');
  const onRev = onBks.reduce((s,b)=>s+(pm[b.booking_id]||0),0);
  const offRev = offBks.reduce((s,b)=>s+(pm[b.booking_id]||0),0);
  const totalRev = onRev+offRev;

  const expMonth = new Date(selMonth+'-01').toLocaleString('en-IN',{month:'short',year:'numeric'}).replace(' ','-');
  const mExp = (expenses||[]).filter(e=>e.month===expMonth);
  const useDefaults = mExp.length===0;
  const effectiveExp = useDefaults?(defaults||[]).reduce((s,d)=>s+(d.default_amount||0),0):mExp.reduce((s,e)=>s+(e.amount||0),0);
  const profit = totalRev-effectiveExp;
  const investorAmount = Math.round(profit*share/100);
  const companyAmount = profit-investorAmount;

  const months = [];
  for(let i=0;i<12;i++){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({val:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,lbl:d.toLocaleString('en-IN',{month:'short',year:'numeric'})});}

  renderShell(`
    <div class="card">
      <h1>📊 Investor Report</h1>
      <button class="secondary btn-sm" onclick="renderManageInvestors()">← Back</button>
      <div class="form-grid" style="margin-top:8px;">
        <div class="form-group"><label>Month</label>
          <select onchange="renderInvestorReport('${investorId}','${roomId}',this.value)">
            ${months.map(m=>`<option value="${m.val}" ${m.val===selMonth?'selected':''}>${m.lbl}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="justify-content:flex-end;"><button class="btn-sm" onclick="window.print()">🖨️ Print</button></div>
      </div>
    </div>

    <div class="card" style="background:var(--dark);color:#fff;text-align:center;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.6);">Monthly Investor Report</div>
      <h1 style="color:#fff;margin:6px 0;">${BRAND}</h1>
      <div style="font-size:13px;color:rgba(255,255,255,0.8);">${monthLabel}</div>
    </div>

    <div class="card">
      <div class="section-title">Property</div>
      <div class="metric-row"><span class="metric-label">Property</span><span style="font-weight:600;">${room?.nickname||'-'}</span></div>
      <div class="metric-row"><span class="metric-label">Owner</span><span style="font-weight:600;">${inv?.name||'-'}</span></div>
      <div class="metric-row"><span class="metric-label">Share</span><span>${share}% / ${cs}%</span></div>
    </div>

    <div class="card">
      <div class="section-title">💰 Financial</div>
      <div class="metric-row"><span class="metric-label">Revenue</span><span class="metric-value">₹${totalRev.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Expenses</span><span class="metric-value warn">₹${effectiveExp.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Profit</span><span class="metric-value" style="color:${profit>=0?'var(--green)':'var(--red)'};">₹${profit.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">${inv?.name} (${share}%)</span><span class="metric-value" style="color:var(--green);">₹${investorAmount.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">${BRAND} (${cs}%)</span><span class="metric-value">₹${companyAmount.toLocaleString('en-IN')}</span></div>
    </div>

    <div class="card">
      <div class="section-title">📅 Bookings</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Guest</th><th>Mode</th><th>In</th><th>Out</th><th>Nights</th><th>₹</th></tr></thead>
        <tbody>${(bookings||[]).map(b=>`<tr>
          <td>${b.guest_name||'-'}</td>
          <td><span class="badge ${b.booking_mode==='Online-Airbnb'?'blue':'yellow'}">${b.booking_mode==='Online-Airbnb'?'On':'Off'}</span></td>
          <td>${b.check_in||'-'}</td><td>${b.check_out||'-'}</td><td>${cn(b)}</td>
          <td>₹${(pm[b.booking_id]||0).toLocaleString('en-IN')}</td>
        </tr>`).join('')||'<tr><td colspan="6" class="sub">None</td></tr>'}</tbody>
      </table></div>
    </div>
    <div class="card">
      <div class="section-title">🧾 Expense Breakdown (${expMonth})</div>
      ${useDefaults ? '<div class="sub" style="margin-bottom:8px;">ℹ️ Default expenses (actual not logged yet)</div>' : ''}
      <div class="table-wrap"><table>
        <thead><tr><th>Expense</th><th>Amount</th><th>Type</th></tr></thead>
        <tbody>
          ${useDefaults
            ? (defaults||[]).map(d=>`<tr>
                <td>${d.expense_name}</td>
                <td>₹${(d.default_amount||0).toLocaleString('en-IN')}</td>
                <td><span class="badge ${d.is_fixed?'green':'yellow'}">${d.is_fixed?'Fixed':'Variable'}</span></td>
              </tr>`).join('')
            : mExp.map(e=>`<tr>
                <td>${e.expense_categories?.category_name||'-'}</td>
                <td>₹${(e.amount||0).toLocaleString('en-IN')}</td>
                <td>-</td>
              </tr>`).join('')
          }
          <tr style="font-weight:700;background:#fafafa;">
            <td>Total Expenses</td>
            <td>₹${effectiveExp.toLocaleString('en-IN')}</td>
            <td></td>
          </tr>
        </tbody>
      </table></div>
    </div>

    <div class="card" style="background:linear-gradient(135deg,#1a1a1a,#2d2d2d);color:#fff;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:rgba(255,255,255,0.5);margin-bottom:10px;">Profit Distribution</div>
      <div class="metric-row" style="border-color:rgba(255,255,255,0.15);">
        <span style="color:rgba(255,255,255,0.8);">Revenue</span>
        <span class="metric-value" style="color:#fff;">₹${totalRev.toLocaleString('en-IN')}</span>
      </div>
      <div class="metric-row" style="border-color:rgba(255,255,255,0.15);">
        <span style="color:rgba(255,255,255,0.8);">Expenses</span>
        <span class="metric-value" style="color:#ef4444;">₹${effectiveExp.toLocaleString('en-IN')}</span>
      </div>
      <div class="metric-row" style="border-color:rgba(255,255,255,0.15);">
        <span style="color:rgba(255,255,255,0.8);">Net Profit</span>
        <span class="metric-value" style="color:${profit>=0?'#4ade80':'#ef4444'};">₹${profit.toLocaleString('en-IN')}</span>
      </div>
      <div class="metric-row" style="border-color:rgba(255,255,255,0.15);">
        <span style="color:rgba(255,255,255,0.8);">🏠 ${inv?.name} (${share}%)</span>
        <span class="metric-value" style="color:#4ade80;">₹${investorAmount.toLocaleString('en-IN')}</span>
      </div>
      <div class="metric-row" style="border:none;">
        <span style="color:rgba(255,255,255,0.8);">🏢 ${BRAND} (${cs}%)</span>
        <span class="metric-value" style="color:#60a5fa;">₹${companyAmount.toLocaleString('en-IN')}</span>
      </div>
    </div>

    <div class="card" style="text-align:center;font-size:12px;color:var(--muted);">
      Prepared By: <strong>NISHA KHAN</strong><br>
      Operator: <strong>${BRAND}</strong><br>
      Report Date: ${new Date().toLocaleDateString('en-IN')}<br>
      <div style="margin-top:8px;">
        <button class="btn-sm" onclick="window.print()">🖨️ Print Report</button>
      </div>
    </div>
    
  `, 'investors');
}

// ============ INVESTOR VIEW (Read-Only) ============
function filterByRange(bks, range) {
  if(range==='All') return bks;
  const now=new Date(); let start;
  if(range==='Today') start=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  else if(range==='Week'){start=new Date(now);start.setDate(now.getDate()-7);}
  else if(range==='Month') start=new Date(now.getFullYear(),now.getMonth(),1);
  else return bks;
  return bks.filter(b=>b.check_in&&new Date(b.check_in)>=start);
}

async function renderInvestorView(range='Month') {
  if(!SESSION.investorId){showError('No property linked.');return;}
  appEl.innerHTML=`<div class="wrap" style="max-width:650px;"><div class="loading">Loading...</div></div>`;

  const {data:inv} = await sb.from('investors').select('*').eq('investor_id',SESSION.investorId).single();
  const {data:links} = await sb.from('investor_properties').select('room_id, rooms(unit_no, property_name, nickname, checkin_manager)').eq('investor_id',SESSION.investorId);
  const rids = (links||[]).map(l=>l.room_id);

  const {data:allBk} = rids.length
    ? await sb.from('guest_register').select('booking_id, guest_name, room_id, booking_mode, check_in, check_out, total_amount, rooms(unit_no, nickname)').in('room_id',rids).order('check_in',{ascending:false})
    : {data:[]};

  const bks = filterByRange(allBk||[], range);
  const pm = await getPaidMap(bks.map(b=>b.booking_id));
  const rev = bks.reduce((s,b)=>s+(pm[b.booking_id]||0),0);
  const share = inv?.revenue_share_pct||70;

  appEl.innerHTML = `
    <div class="wrap" style="max-width:650px;">
      <div class="card" style="text-align:center;">
        <img src="assets/logo.png" alt="" style="width:52px;height:52px;border-radius:12px;margin-bottom:6px;" />
        <h1>${BRAND}</h1>
        <div class="sub">👋 ${SESSION.displayName||inv?.name||'Investor'}</div>
        <div class="badge blue">Investor · View Only</div>
        <div style="margin-top:10px;"><button class="danger btn-sm" onclick="logout()">🚪 Logout</button></div>
      </div>
      <div class="card"><div class="form-group"><label>Period</label>
        <select id="invRange">
          <option value="Today" ${range==='Today'?'selected':''}>Today</option>
          <option value="Week" ${range==='Week'?'selected':''}>Week</option>
          <option value="Month" ${range==='Month'?'selected':''}>Month</option>
          <option value="All" ${range==='All'?'selected':''}>All</option>
        </select>
      </div></div>
      <div class="card">
        <div class="metric-row"><span class="metric-label">Total Revenue</span><span class="metric-value">₹${rev.toLocaleString('en-IN')}</span></div>
        <div class="metric-row"><span class="metric-label">Your Share (${share}%)</span><span class="metric-value" style="color:var(--green);">₹${Math.round(rev*share/100).toLocaleString('en-IN')}</span></div>
      </div>
      <div class="card"><div class="section-title">Properties</div>
        ${(links||[]).map(l=>`<div style="padding:8px 0;border-bottom:1px solid var(--border);"><strong>${l.rooms?.nickname||l.rooms?.unit_no||'-'}</strong><br><small style="color:var(--muted);">${l.rooms?.property_name||''}</small></div>`).join('')||'<div class="sub">None</div>'}
      </div>
      <div class="card"><div class="section-title">Bookings (${range})</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Guest</th><th>Property</th><th>Mode</th><th>In</th><th>Out</th><th>₹</th></tr></thead>
          <tbody>${bks.map(b=>`<tr>
            <td>${b.guest_name||'-'}</td><td>${b.rooms?.nickname||'-'}</td>
            <td><span class="badge ${b.booking_mode==='Online-Airbnb'?'blue':'yellow'}">${b.booking_mode==='Online-Airbnb'?'On':'Off'}</span></td>
            <td>${b.check_in||'-'}</td><td>${b.check_out||'-'}</td>
            <td>₹${(pm[b.booking_id]||0).toLocaleString('en-IN')}</td>
          </tr>`).join('')||'<tr><td colspan="6" class="sub">None</td></tr>'}</tbody>
        </table></div>
      </div>
      <div class="card" style="text-align:center;">
        <button class="danger btn-sm" onclick="logout()">🚪 Logout</button>
      </div>
    </div>`;
  document.getElementById('invRange').onchange = e => renderInvestorView(e.target.value);
}

// ============ EMPLOYEE VIEW ============
async function renderEmployeeView() {
  if(!SESSION.empId){appEl.innerHTML=`<div class="wrap"><div class="card"><h1>⚠️</h1><div class="error">Employee ID not set</div><button onclick="logout()">Logout</button></div></div>`;return;}
  const [{data:emp},{data:sal},{data:adv},{data:tasks},{data:att}] = await Promise.all([
    sb.from("employees").select("*").eq("emp_id",SESSION.empId).single(),
    sb.from("salary_tracker").select("salary_due,salary_paid").eq("emp_id",SESSION.empId),
    sb.from("advance_tracker").select("advance_amount,repaid_amount").eq("emp_id",SESSION.empId),
    sb.from("employee_tasks").select("task_description,status").eq("emp_id",SESSION.empId).eq("status","Pending"),
    sb.from("attendance_log").select("status,att_date").eq("emp_id",SESSION.empId),
  ]);
  const pSal=(sal||[]).reduce((s,r)=>s+((r.salary_due||0)-(r.salary_paid||0)),0);
  const pAdv=(adv||[]).reduce((s,r)=>s+((r.advance_amount||0)-(r.repaid_amount||0)),0);
  const cm=new Date().toISOString().slice(0,7);
  const mr=(att||[]).filter(a=>a.att_date?.startsWith(cm));
  const pr=mr.filter(a=>a.status==='Present').length;
  const ab=mr.filter(a=>a.status==='Absent').length;

  appEl.innerHTML=`<div class="wrap">
    <div class="card" style="text-align:center;">
      <img src="assets/logo.png" alt="" style="width:48px;height:48px;border-radius:10px;margin-bottom:6px;" />
      <h1>${BRAND}</h1><div class="sub">👋 ${SESSION.displayName}</div>
      <button class="secondary btn-sm" onclick="logout()">🚪 Logout</button>
    </div>
    <div class="card">
      <div class="metric-row"><span class="metric-label">Name</span><span class="metric-value" style="font-size:15px;">${emp?.name||'-'}</span></div>
      <div class="metric-row"><span class="metric-label">Role</span><span>${emp?.role||'-'}</span></div>
      <div class="metric-row"><span class="metric-label">Salary</span><span class="metric-value">₹${(emp?.monthly_salary||0).toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Salary Pending</span><span class="metric-value${pSal>0?' warn':''}">₹${pSal.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Advance Due</span><span class="metric-value${pAdv>0?' warn':''}">₹${pAdv.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Present</span><span class="metric-value">${pr}</span></div>
      <div class="metric-row"><span class="metric-label">Absent</span><span class="metric-value${ab>0?' warn':''}">${ab}</span></div>
    </div>
    <div class="card"><div class="section-title">Pending Tasks</div>
      ${(tasks||[]).length===0?'<div class="sub">No tasks ✅</div>':(tasks||[]).map(t=>`<div class="metric-row"><span class="metric-label">${t.task_description}</span><span class="badge red">Pending</span></div>`).join('')}
    </div>
  </div>`;
}