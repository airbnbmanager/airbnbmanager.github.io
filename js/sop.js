/**
 * SOP Module
 * UNIQUE HAVEN HOMES STAY
 */

function renderSOPPage() {
  renderShell(`
    <div class="card"><h1>📘 Standard Operating Procedure</h1><div class="sub">${BRAND} — System Manual</div></div>

    <div class="card"><div class="section-title">👥 Team & Roles</div>
      <div class="metric-row"><span class="metric-label">Mr. Shahanshah</span><span class="badge green">Owner</span></div>
      <div class="metric-row"><span class="metric-label">Mr. Firoz Khan</span><span class="badge green">Owner</span></div>
      <div class="metric-row"><span class="metric-label">Praveen Singh</span><span class="badge blue">Admin & Developer</span></div>
      <div style="font-size:12px;color:var(--muted);padding:10px;background:var(--bg);border-radius:8px;margin-top:8px;">
        📞 Shahanshah: 9450055554<br>📞 Firoz: 8299600709<br>🛠️ Praveen: System Admin
      </div>
    </div>

    <div class="card"><div class="section-title">🔐 Permissions</div>
      <div style="font-size:13px;line-height:1.8;">
        <p><strong>Owners:</strong> View + Add + Edit ✅ | Delete ❌</p>
        <p><strong>Admin:</strong> Full access ✅</p>
        <p><strong>Checkin Manager:</strong> Dashboard + Calendar + Bookings + Flats ✅</p>
        <p><strong>Investor:</strong> Own property read-only ✅</p>
        <p><strong>CA:</strong> Financial reports ✅</p>
      </div>
    </div>

    <div class="card"><div class="section-title">✅ Booking Rules</div>
      <div style="font-size:13px;line-height:1.8;">
        <p>1. Register = final truth</p>
        <p>2. Actual room = save room</p>
        <p>3. Shift = source listing note</p>
        <p>4. Extension = new booking</p>
        <p>5. No fake names</p>
        <p>6. Same day entry</p>
        <p>7. Zero amount = warning</p>
      </div>
    </div>

    <div class="card"><div class="section-title">💰 Payment</div>
      <div style="font-size:13px;line-height:1.8;">
        <p>Online: Airbnb payout verify</p>
        <p>Offline: Register ke hisab se</p>
        <p>Partial allowed | Edit/Delete genuine cases</p>
      </div>
    </div>

    <div class="card"><div class="section-title">🧹 Cleaning</div>
      <div style="font-size:13px;line-height:1.8;">
        <p>Checkout → Free + Dirty (auto)</p>
        <p>Safai → Clean (manual)</p>
        <p>Check-in → Booked + Clean</p>
      </div>
    </div>

    <div class="card"><div class="section-title">⏰ Timings</div>
      <div style="font-size:13px;line-height:1.8;">
        <p>🕑 Check-in: 2:00 PM</p>
        <p>🕚 Check-out: 11:00 AM</p>
      </div>
    </div>

    <div class="card"><div class="section-title">🧰 Daily SOP</div>
      <div style="font-size:13px;line-height:1.8;">
        <p>1. Register → App</p>
        <p>2. Payment update</p>
        <p>3. Cleaning update</p>
        <p>4. Shift/ext notes</p>
        <p>5. Check overlaps</p>
      </div>
    </div>

    <div class="card"><div class="section-title">❌ Don'ts</div>
      <div style="font-size:13px;line-height:1.8;">
        <p>• 2 bookings same room</p>
        <p>• Mix online + offline</p>
        <p>• Fake names</p>
        <p>• Random DB changes</p>
      </div>
    </div>

    <div class="card" style="background:var(--dark);color:#fff;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.5);margin-bottom:8px;">System Status</div>
      <div style="font-size:13px;line-height:1.8;color:rgba(255,255,255,0.9);">
        <p>✅ All logins verified</p>
        <p>✅ Bookings working</p>
        <p>✅ Payments working</p>
        <p>✅ Flats toggle working</p>
        <p>✅ Google Auth ready</p>
        <p>✅ Modular code structure</p>
      </div>
    </div>

    <div class="card" style="text-align:center;">
      <div style="font-size:12px;color:var(--muted);">
        ${BRAND}<br><strong>System by Praveen Singh</strong><br>
        Build ${APP_VERSION} · ${new Date().toLocaleDateString('en-IN')}
      </div>
      <button class="btn-sm" onclick="window.print()" style="margin-top:8px;">🖨️ Print</button>
    </div>
  `, 'sop');
}