/**
 * Expenses & P&L Module
 * UNIQUE HAVEN HOMES STAY
 */

async function renderExpenses() {
  renderShell(`<div class="loading">Loading...</div>`, 'expenses');
  const cm = new Date().toISOString().slice(0,7);
  const ml = new Date().toLocaleString('en-IN',{month:'short',year:'numeric'}).replace(' ','-');
  const [{data:cats},{data:exps},{data:gs}] = await Promise.all([
    sb.from('expense_categories').select('*').order('category_name'),
    sb.from('expenses').select('*, expense_categories(category_name)').order('entry_date',{ascending:false}),
    sb.from('guest_register').select('booking_id,check_in,total_amount'),
  ]);
  const pm = await getPaidMap((gs||[]).map(g=>g.booking_id));
  const inc = (gs||[]).filter(g=>g.check_in?.startsWith(cm)).reduce((s,g)=>s+(pm[g.booking_id]||0),0);
  const mexp = (exps||[]).filter(e=>e.month===ml).reduce((s,e)=>s+(e.amount||0),0);
  const profit = inc-mexp;

  renderShell(`
    <div class="card">
      <h1>💹 P&L (Profit & Loss)</h1>
      <div class="sub">${ml}</div>
      <div class="btn-row">
        <button onclick="renderAddExpCat()">➕ Category</button>
        <button class="secondary" onclick="renderAddExpEntry()">🧾 Log Expense</button>
      </div>
    </div>
    <div class="card">
      <div class="metric-row"><span class="metric-label">Income</span><span class="metric-value">₹${inc.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Expenses</span><span class="metric-value warn">₹${mexp.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Profit</span><span class="metric-value" style="color:${profit>=0?'var(--green)':'var(--red)'};">₹${profit.toLocaleString('en-IN')}</span></div>
    </div>
    <div class="card"><div class="section-title">Categories</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Category</th><th>Default ₹</th></tr></thead>
        <tbody>${(cats||[]).map(c=>`<tr><td>${c.category_name}</td><td>₹${(c.default_monthly_amount||0).toLocaleString('en-IN')}</td></tr>`).join('')||'<tr><td colspan="2" class="sub">None</td></tr>'}</tbody>
      </table></div>
    </div>
    <div class="card"><div class="section-title">Entries</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Month</th><th>Category</th><th>Amount</th><th>Date</th></tr></thead>
        <tbody>${(exps||[]).map(e=>`<tr><td>${e.month||'-'}</td><td>${e.expense_categories?.category_name||'-'}</td><td>₹${(e.amount||0).toLocaleString('en-IN')}</td><td>${e.entry_date||'-'}</td></tr>`).join('')||'<tr><td colspan="4" class="sub">None</td></tr>'}</tbody>
      </table></div>
    </div>
  `, 'expenses');
}

async function renderAddExpCat() {
  renderShell(`
    <div class="card"><h1>➕ Category</h1><button class="secondary btn-sm" onclick="renderExpenses()">← Back</button></div>
    <div class="card">
      <div class="form-group"><label>Name *</label><input id="cName" /></div>
      <div class="form-group"><label>Default Monthly ₹</label><input id="cAmt" type="number" /></div>
      <button onclick="saveExpCat()" style="width:100%;">💾 Save</button><div id="cErr"></div>
    </div>
  `, 'expenses');
}

async function saveExpCat() {
  const name=document.getElementById('cName').value.trim();
  if(!name){document.getElementById('cErr').innerHTML='<div class="error">Name required</div>';return;}
  await sb.from('expense_categories').insert({category_id:'EXP'+Date.now(),category_name:name,default_monthly_amount:parseFloat(document.getElementById('cAmt').value)||null});
  renderExpenses();
}

async function renderAddExpEntry() {
  const [{data:cats},{data:rooms}] = await Promise.all([
    sb.from('expense_categories').select('*').order('category_name'),
    sb.from('rooms').select('room_id,unit_no,nickname').order('unit_no')
  ]);
  window._expCats = cats||[];
  const ml = new Date().toLocaleString('en-IN',{month:'short',year:'numeric'}).replace(' ','-');

  renderShell(`
    <div class="card"><h1>🧾 Log Expense</h1><button class="secondary btn-sm" onclick="renderExpenses()">← Back</button></div>
    <div class="card">
      <div class="form-group"><label>Category *</label>
        <select id="exCat" onchange="onExpCatChg()"><option value="">Select</option>${(cats||[]).map(c=>`<option value="${c.category_id}">${c.category_name}</option>`).join('')}</select>
      </div>
      <div id="exCatInfo" class="sub"></div>
      <div class="form-group"><label>Property</label>
        <select id="exRoom"><option value="">General</option>${(rooms||[]).map(r=>`<option value="${r.room_id}">${r.nickname||r.unit_no}</option>`).join('')}</select>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Month</label><input id="exMo" value="${ml}" /></div>
        <div class="form-group"><label>Amount ₹ *</label><input id="exAmt" type="number" /></div>
      </div>
      <div class="form-group"><label>Date</label><input id="exDate" type="date" value="${new Date().toISOString().slice(0,10)}" /></div>
      <button onclick="saveExpEntry()" style="width:100%;">💾 Save</button><div id="exErr"></div>
    </div>
  `, 'expenses');
}

function onExpCatChg() {
  const c=(window._expCats||[]).find(x=>x.category_id===document.getElementById('exCat').value);
  if(c?.default_monthly_amount){document.getElementById('exCatInfo').innerHTML=`💡 Default: ₹${c.default_monthly_amount.toLocaleString('en-IN')}`;document.getElementById('exAmt').value=c.default_monthly_amount;}
  else document.getElementById('exCatInfo').innerHTML='';
}

async function saveExpEntry() {
  const cid=document.getElementById('exCat').value, mo=document.getElementById('exMo').value.trim(), amt=parseFloat(document.getElementById('exAmt').value)||0;
  if(!cid||!mo||amt<=0){document.getElementById('exErr').innerHTML='<div class="error">Category, month & amount required</div>';return;}
  await sb.from('expenses').insert({category_id:cid,room_id:document.getElementById('exRoom').value||null,month:mo,amount:amt,entry_date:document.getElementById('exDate').value||null});
  renderExpenses();
}

// ============ PROPERTY REPORT ============
async function renderPropertyReport(roomId, range='Month') {
  renderShell(`<div class="loading">Loading...</div>`, 'property-report');
  const {data:rooms} = await sb.from('rooms').select('room_id,unit_no,nickname,property_name').order('unit_no');
  const sel = roomId||rooms?.[0]?.room_id;
  if(!sel){renderShell(`<div class="card"><h1>No properties</h1></div>`,'property-report');return;}

  const now=new Date(); let s,e,label;
  if(range==='Month'){s=new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10);e=new Date(now.getFullYear(),now.getMonth()+1,0).toISOString().slice(0,10);label=now.toLocaleString('en-IN',{month:'long',year:'numeric'});}
  else if(range==='Quarter'){const q=Math.floor(now.getMonth()/3);s=new Date(now.getFullYear(),q*3,1).toISOString().slice(0,10);e=new Date(now.getFullYear(),q*3+3,0).toISOString().slice(0,10);label=`Q${q+1} ${now.getFullYear()}`;}
  else{s=`${now.getFullYear()}-01-01`;e=`${now.getFullYear()}-12-31`;label=`${now.getFullYear()}`;}
  const ml=now.toLocaleString('en-IN',{month:'short',year:'numeric'}).replace(' ','-');

  const [{data:gs},{data:exs}] = await Promise.all([
    sb.from('guest_register').select('*').eq('room_id',sel).gte('check_in',s).lte('check_in',e),
    sb.from('expenses').select('*, expense_categories(category_name)').eq('room_id',sel).eq('month',ml)
  ]);
  const pm = await getPaidMap((gs||[]).map(g=>g.booking_id));
  const onRev=(gs||[]).filter(g=>g.booking_mode==='Online-Airbnb').reduce((a,g)=>a+(pm[g.booking_id]||0),0);
  const offRev=(gs||[]).filter(g=>g.booking_mode!=='Online-Airbnb').reduce((a,g)=>a+(pm[g.booking_id]||0),0);
  const totRev=onRev+offRev;
  const totExp=(exs||[]).reduce((a,e2)=>a+(e2.amount||0),0);
  const profit=totRev-totExp;
  const room=rooms.find(r=>r.room_id===sel);

  renderShell(`
    <div class="card">
      <h1>🏘️ Property Report</h1>
      <div class="form-group"><select id="rpRoom">${rooms.map(r=>`<option value="${r.room_id}" ${r.room_id===sel?'selected':''}>${r.nickname||r.unit_no}</option>`).join('')}</select></div>
      <div class="btn-row">
        <button class="${range==='Month'?'':'secondary'} btn-sm" onclick="renderPropertyReport('${sel}','Month')">Month</button>
        <button class="${range==='Quarter'?'':'secondary'} btn-sm" onclick="renderPropertyReport('${sel}','Quarter')">Quarter</button>
        <button class="${range==='Year'?'':'secondary'} btn-sm" onclick="renderPropertyReport('${sel}','Year')">Year</button>
      </div>
    </div>
    <div class="card">
      <div class="sub">${room?.property_name||''} — ${label}</div>
      <div class="metric-row"><span class="metric-label">Revenue</span><span class="metric-value">₹${totRev.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Online</span><span class="metric-value" style="color:var(--blue);">₹${onRev.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Offline</span><span class="metric-value" style="color:var(--yellow);">₹${offRev.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Expenses</span><span class="metric-value warn">₹${totExp.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Profit</span><span class="metric-value" style="color:${profit>=0?'var(--green)':'var(--red)'};">₹${profit.toLocaleString('en-IN')}</span></div>
    </div>
  `, 'property-report');
  document.getElementById('rpRoom').onchange = e2 => renderPropertyReport(e2.target.value, range);
}