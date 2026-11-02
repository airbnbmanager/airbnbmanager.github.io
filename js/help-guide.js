// ═══════════════════════════════════════════════════════════
// ❓ THE UNIQUE HAVEN HOMES (TUHH) — HELP CENTER & OPERATING GUIDE
// Complete Step-by-Step Software Manual, Workflows & Keyboard Shortcuts
// ═══════════════════════════════════════════════════════════

(function() {
  'use strict';

  window._helpActiveTab = 'all';

  window.renderHelpAndGuide = function() {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 || /iPad|iPhone|iPod/.test(navigator.userAgent);
    const cmdSymbol = isMac ? '⌘' : 'Ctrl+';
    const altSymbol = isMac ? '⌥' : 'Alt+';

    const SHORTCUTS_DATA = [
      { key: `${cmdSymbol}K`, single: '/', title: 'Command Palette / Universal Search', desc: 'Poore system me koi bhi guest name, phone, flat number, task ya screen 1 second me dhoondhein.', action: 'window.openCommandPalette()' },
      { key: `${altSymbol}O`, single: 'O', title: 'Today · Operations Hub', desc: 'Aaj ke check-ins, check-outs, in-house guests aur frontdesk execution queue.', action: 'window.openOperationsShortcut()' },
      { key: `${altSymbol}H`, single: 'H', title: 'Executive Financial Dashboard', desc: 'Real-time Net Revenue, ADR, RevPAR, NOI, channels aur 19 properties leaderboard.', action: 'window.openDashboardShortcut()' },
      { key: `${altSymbol}N`, single: 'N', title: 'New Booking Create Karein', desc: 'Naya reservation wizard kholein aur guest details enter karein.', action: 'window.openNewBookingShortcut()' },
      { key: `${cmdSymbol}S`, single: 'S', title: 'Save Booking / Form Instantly', desc: 'Booking form ya wizard open hone par turant save karein.', action: 'if(window.triggerSaveBookingShortcut) window.triggerSaveBookingShortcut()' },
      { key: 'E', single: 'E', title: 'Edit Selected Booking / Expenses', desc: 'Booking card ya drawer open hone par direct E dabakar edit karein.', action: 'if(window.editCurrentSelectedBooking) window.editCurrentSelectedBooking()' },
      { key: `${altSymbol}P`, single: 'P', title: 'Quick Payment / Add Payment', desc: 'Active booking ka payment add karein ya pending dues picker kholein.', action: 'window.openQuickPaymentShortcut()' },
      { key: `${altSymbol}D`, single: 'D', title: 'Duplicate Booking / Rebook', desc: 'Purane guest ki details clone karke nayi date par re-book karein.', action: 'window.duplicateExistingBookingShortcut()' },
      { key: `${altSymbol}C`, single: 'C', title: 'Reservations Calendar', desc: 'Sabhi 19 properties ka multi-unit occupancy timeline grid dekhein.', action: 'window.openCalendarShortcut()' },
      { key: `${altSymbol}B`, single: 'B', title: 'Bookings Management Hub', desc: 'All confirmed, active, check-in aur check-out bookings ki complete register.', action: 'window.openBookingsShortcut()' },
      { key: `${altSymbol}F`, single: 'F', title: 'Flats Status & Turnaround', desc: 'Real-time room cleanliness, dirty status aur turnaround Kanban board.', action: 'window.openFlatsShortcut()' },
      { key: `${altSymbol}U`, single: 'U', title: 'Units & Master Pricing', desc: '19 units ki live inventory, nightly rates, caretaker & manager contacts.', action: 'window.openUnitsShortcut()' },
      { key: `${altSymbol}Q`, single: 'Q', title: 'Universal Claims & TUHH-OD', desc: 'Daily Closing Statements, company ledger & vendor claim approvals.', action: 'window.openClaimShortcut()' },
      { key: `${altSymbol}E`, single: 'E', title: 'Expenses & Outflow Hub', desc: 'Expenses page par jayein (Wi-Fi, Maintenance, Laundry, Staff Advances & P&L).', action: 'window.openExpensesShortcut()', altKey: `${altSymbol}⇧E for Add Expense` },
      { key: `${altSymbol}T`, single: 'T', title: 'Staff Tasks & Checklists', desc: 'Housekeeping, deep cleans aur staff maintenance tasks list.', action: 'window.openTasksShortcut()', altKey: `${altSymbol}⇧T for New` },
      { key: `${altSymbol}A`, single: 'A', title: 'Staff Salary Advances Tracker', desc: 'Employees ko di gayi peshgi (loan/advance) aur pending balance.', action: 'window.openAdvanceShortcut()', altKey: `${altSymbol}⇧A for New` },
      { key: `${altSymbol}W`, single: 'W', title: 'WhatsApp Communications Hub', desc: 'Guest ko welcome letter, invoice, location map aur directions bhejein.', action: 'window.openWhatsAppShortcut()' },
      { key: `${altSymbol}I`, single: 'I', title: 'Investors Hub & Payouts', desc: 'Property investors ke shares, payout slips aur monthly sheets.', action: 'window.openInvestorsShortcut()' },
      { key: `${altSymbol}L`, single: 'L', title: 'Laundry Management', desc: 'Linens, chadar, towels wash cycles aur vendor payments.', action: 'window.openLaundryShortcut()' },
      { key: `${altSymbol}X`, single: 'X', title: 'Monthly Expenses & P&L', desc: 'Property-wise Wi-Fi, maintenance aur operational profit-loss.', action: 'window.openExpensesShortcut()' },
      { key: '?', single: 'F1', title: 'Help Center & Manual', desc: 'Is Help page aur keyboard cheatsheet modal ko kisi bhi waqt kholein.', action: 'navigate("help")' },
      { key: 'ESC', single: 'Esc', title: 'Close Drawer / Dismiss Modal', desc: 'Kisi bhi khule hue drawer, popup ya menu ko turant band karein.', action: 'document.querySelectorAll(".modal-overlay").forEach(m=>m.remove())' }
    ];

    window._helpShortcutsData = SHORTCUTS_DATA;

    const html = `
      <div class="tuhh-help-wrap">
        <!-- ─── HERO HEADER ─── -->
        <div class="tuhh-help-hero">
          <div class="tuhh-help-hero-badge">
            <span class="tuhh-pulse-dot"></span>
            <span>The Unique Haven Homes · Executive Operating Manual (19 Properties)</span>
          </div>
          <h1 class="tuhh-help-hero-title">TUHH CRM Help Center & Operating Guide</h1>
          <p class="tuhh-help-hero-sub">
            Complete Step-by-Step Software Manual, zero-fee payment automation, financial intelligence & high-speed keyboard shortcuts.
          </p>

          <!-- Search & Filter Bar inside Help -->
          <div class="tuhh-help-search-row">
            <div class="tuhh-help-search-box">
              <i class="ti ti-search" style="font-size:18px;color:#0284C7;"></i>
              <input type="text" id="helpGuideSearch" placeholder="Search guide: e.g. 'booking kaise kare', 'upi sync', 'advance', 'shortcut', 'wifi', 'adr'..." oninput="window.filterHelpGuideContent(this.value)" autocomplete="off" />
              <button type="button" class="tuhh-help-search-clear" onclick="const i=document.getElementById('helpGuideSearch');i.value='';i.dispatchEvent(new Event('input'));" title="Clear Search">✕</button>
            </div>
            <button type="button" class="tuhh-help-cheatsheet-btn" onclick="window.openShortcutsModal()" title="View Keyboard Cheatsheet Modal">
              <i class="ti ti-keyboard"></i>
              <span>Shortcuts Cheatsheet (${cmdSymbol}K / ?)</span>
            </button>
          </div>

          <!-- Quick Jump Navigation Pills -->
          <div class="tuhh-help-quick-pills">
            <span class="tuhh-help-quick-label">⚡ Quick Jump:</span>
            <button type="button" class="tuhh-quick-pill" onclick="window.switchHelpTab('bookings')"><i class="ti ti-bed"></i> Booking Kaise Karein</button>
            <button type="button" class="tuhh-quick-pill" onclick="window.switchHelpTab('calendar')"><i class="ti ti-calendar"></i> Calendar & iCal</button>
            <button type="button" class="tuhh-quick-pill" onclick="window.switchHelpTab('analytics')"><i class="ti ti-chart-bar"></i> Executive Analytics</button>
            <button type="button" class="tuhh-quick-pill" onclick="window.switchHelpTab('upi-sync')"><i class="ti ti-qrcode"></i> Zero-Fee UPI Sync</button>
            <button type="button" class="tuhh-quick-pill" onclick="window.switchHelpTab('claims')"><i class="ti ti-scale"></i> Claims & OD Statement</button>
            <button type="button" class="tuhh-quick-pill" onclick="window.switchHelpTab('expenses')"><i class="ti ti-receipt-2"></i> Expenses & Wi-Fi</button>
            <button type="button" class="tuhh-quick-pill" onclick="window.switchHelpTab('hrms')"><i class="ti ti-id-badge-2"></i> Staff & Tasks</button>
            <button type="button" class="tuhh-quick-pill" onclick="window.switchHelpTab('whatsapp')"><i class="ti ti-brand-whatsapp"></i> WhatsApp Hub</button>
            <button type="button" class="tuhh-quick-pill" onclick="window.switchHelpTab('shortcuts')"><i class="ti ti-command"></i> All Shortcuts Matrix</button>
          </div>
        </div>

        <!-- ─── TAB FILTER BAR ─── -->
        <div class="tuhh-help-nav-tabs">
          <button type="button" class="tuhh-help-tab-btn ${window._helpActiveTab === 'all' ? 'active' : ''}" onclick="window.switchHelpTab('all')">
            <i class="ti ti-layout-grid"></i> <span>All Modules</span>
          </button>
          <button type="button" class="tuhh-help-tab-btn ${window._helpActiveTab === 'bookings' ? 'active' : ''}" onclick="window.switchHelpTab('bookings')">
            <i class="ti ti-bed"></i> <span>Bookings & Check-In</span>
          </button>
          <button type="button" class="tuhh-help-tab-btn ${window._helpActiveTab === 'calendar' ? 'active' : ''}" onclick="window.switchHelpTab('calendar')">
            <i class="ti ti-calendar"></i> <span>Calendar & Sync</span>
          </button>
          <button type="button" class="tuhh-help-tab-btn ${window._helpActiveTab === 'analytics' ? 'active' : ''}" onclick="window.switchHelpTab('analytics')">
            <i class="ti ti-chart-bar"></i> <span>Executive Analytics</span>
          </button>
          <button type="button" class="tuhh-help-tab-btn ${window._helpActiveTab === 'upi-sync' ? 'active' : ''}" onclick="window.switchHelpTab('upi-sync')">
            <i class="ti ti-qrcode"></i> <span>Zero-Fee UPI Engine</span>
          </button>
          <button type="button" class="tuhh-help-tab-btn ${window._helpActiveTab === 'claims' ? 'active' : ''}" onclick="window.switchHelpTab('claims')">
            <i class="ti ti-scale"></i> <span>Claims & OD</span>
          </button>
          <button type="button" class="tuhh-help-tab-btn ${window._helpActiveTab === 'expenses' ? 'active' : ''}" onclick="window.switchHelpTab('expenses')">
            <i class="ti ti-receipt-2"></i> <span>Expenses & Wi-Fi</span>
          </button>
          <button type="button" class="tuhh-help-tab-btn ${window._helpActiveTab === 'hrms' ? 'active' : ''}" onclick="window.switchHelpTab('hrms')">
            <i class="ti ti-id-badge-2"></i> <span>HRMS & Tasks</span>
          </button>
          <button type="button" class="tuhh-help-tab-btn ${window._helpActiveTab === 'whatsapp' ? 'active' : ''}" onclick="window.switchHelpTab('whatsapp')">
            <i class="ti ti-brand-whatsapp"></i> <span>WhatsApp Hub</span>
          </button>
          <button type="button" class="tuhh-help-tab-btn ${window._helpActiveTab === 'shortcuts' ? 'active' : ''}" onclick="window.switchHelpTab('shortcuts')">
            <i class="ti ti-command"></i> <span>Keyboard Shortcuts</span>
          </button>
        </div>

        <!-- ─── GUIDE CONTENT CONTAINER ─── -->
        <div class="tuhh-help-sections" id="helpSectionsContainer">

          <!-- SECTION 1: QUICK START WORKFLOW -->
          <div class="tuhh-help-section-block" data-category="overview" id="section-overview">
            <div class="tuhh-section-header">
              <div class="tuhh-section-icon" style="background:#EFF6FF;color:#0284C7;"><i class="ti ti-rocket"></i></div>
              <div>
                <h2 class="tuhh-section-title">1. Daily Manager Routine (5-Minute Quick Start)</h2>
                <p class="tuhh-section-subtitle">Rozana subah CRM open karke sabse pehle ye 4 steps follow karein across 19 properties:</p>
              </div>
            </div>

            <div class="tuhh-steps-grid">
              <div class="tuhh-step-card">
                <div class="tuhh-step-num">Step 1</div>
                <h3 class="tuhh-step-title">Today's Operations Queue</h3>
                <p class="tuhh-step-desc">
                  Top bar me <strong>All Properties (19)</strong> ya specific flat select karein. <strong>Today · Operations</strong> par dekhein ki aaj kin guests ka <strong>Check-in</strong> hai aur kinka <strong>Check-out</strong>.
                </p>
                <div class="tuhh-step-badge"><kbd>${altSymbol}O</kbd> Operations Hub</div>
              </div>

              <div class="tuhh-step-card">
                <div class="tuhh-step-num">Step 2</div>
                <h3 class="tuhh-step-title">Staff Attendance & Tasks</h3>
                <p class="tuhh-step-desc">
                  <strong>HRMS & Tasks &gt; Attendance</strong> me jayein. Subah duty par aane wale caretakers aur housekeeping staff ko <strong>Present</strong> mark karein aur cleaning tasks assign karein.
                </p>
                <div class="tuhh-step-badge"><kbd>${altSymbol}T</kbd> Tasks & HRMS</div>
              </div>

              <div class="tuhh-step-card">
                <div class="tuhh-step-num">Step 3</div>
                <h3 class="tuhh-step-title">Room Cleanliness & Turnaround</h3>
                <p class="tuhh-step-desc">
                  <strong>Properties &gt; Flat Status</strong> me check karein kaunse room <strong>Clean &amp; Ready</strong> hain aur kaunse check-out ke baad <strong>Dirty</strong> hain taaki fast turnaround ho sake.
                </p>
                <div class="tuhh-step-badge"><kbd>${altSymbol}F</kbd> Flats Status</div>
              </div>

              <div class="tuhh-step-card">
                <div class="tuhh-step-num">Step 4</div>
                <h3 class="tuhh-step-title">Executive Financial Overview</h3>
                <p class="tuhh-step-desc">
                  <strong>Finances &gt; Executive Dashboard</strong> me live portfolio metrics (Net Revenue, Net Operating Income, Occupancy %, ADR, RevPAR) track karein.
                </p>
                <div class="tuhh-step-badge"><kbd>${altSymbol}H</kbd> Analytics Suite</div>
              </div>
            </div>
          </div>

          <!-- SECTION 2: BOOKINGS & CHECK-IN -->
          <div class="tuhh-help-section-block" data-category="bookings" id="section-bookings">
            <div class="tuhh-section-header">
              <div class="tuhh-section-icon" style="background:#F0FDF4;color:#16A34A;"><i class="ti ti-bed"></i></div>
              <div>
                <h2 class="tuhh-section-title">2. Bookings, Check-In & Special Timing Guide</h2>
                <p class="tuhh-section-subtitle">Nayi reservation create karne se lekar special timings, Aadhaar upload aur instant settlement tak ka complete flow:</p>
              </div>
            </div>

            <div class="tuhh-workflow-list">
              <div class="tuhh-wf-card">
                <div class="tuhh-wf-badge">1. Nayi Booking Banana</div>
                <div class="tuhh-wf-content">
                  <h4>Kaise banayein?</h4>
                  <p>Top-right me <strong>+ New Booking</strong> button par click karein ya keyboard par <strong>N</strong> dabayein.</p>
                  <ul>
                    <li><strong>Guest Info:</strong> Guest ka Name, Mobile Number aur City enter karein.</li>
                    <li><strong>Dates &amp; Room:</strong> Check-in Date, Check-out Date aur Property / Flat number select karein.</li>
                    <li><strong>Channel:</strong> Select karein ki booking Direct (Phone/Walk-in) aayi hai ya Airbnb / Booking.com / Agoda se.</li>
                    <li><strong>Pricing:</strong> Total amount enter karein. Advance amount enter karte hi remaining balance auto-calculate ho jayega.</li>
                  </ul>
                  <div class="tuhh-tip-box">
                    💡 <strong>Fast Key Tip:</strong> Form fill karte waqt direct <strong>${cmdSymbol}S</strong> dabane se booking form instantly save ho jata hai!
                  </div>
                </div>
              </div>

              <div class="tuhh-wf-card">
                <div class="tuhh-wf-badge">2. Guest Check-In &amp; ID Proof</div>
                <div class="tuhh-wf-content">
                  <h4>Guest Aane Par:</h4>
                  <ul>
                    <li>Bookings list me guest ke card par <strong>Check-In</strong> button dabayein.</li>
                    <li>Camera icon par tap karke guest ka <strong>Aadhaar Card / Passport</strong> upload karein.</li>
                    <li>Room status automatically <strong>Occupied</strong> mark ho jayega.</li>
                    <li>Guest ko <strong>WhatsApp</strong> icon par click karke welcome message aur Wi-Fi password bhej dein.</li>
                  </ul>
                </div>
              </div>

              <div class="tuhh-wf-card">
                <div class="tuhh-wf-badge">3. Payment &amp; Balance Settlement</div>
                <div class="tuhh-wf-content">
                  <h4>Payment Log Karna:</h4>
                  <ul>
                    <li>Kisi bhi booking ka payment add karne ke liye booking card par <strong>Add Payment</strong> dabayein ya keyboard par <strong>P</strong> press karein.</li>
                    <li>Payment mode select karein: <strong>UPI / Bank Transfer / Cash</strong>.</li>
                    <li>Jab full payment settle ho jaye to status automatically <strong>Paid (Full Balance Settled)</strong> ho jayega.</li>
                    <li>Guest ko digital receipt bhejne ke liye <strong>Receipt</strong> button dabayein.</li>
                  </ul>
                </div>
              </div>

              <div class="tuhh-wf-card">
                <div class="tuhh-wf-badge">4. Guest Check-Out &amp; Turnaround</div>
                <div class="tuhh-wf-content">
                  <h4>Departure ke waqt:</h4>
                  <ul>
                    <li>Ensure karein ki koi payment pending nahi hai.</li>
                    <li><strong>Check-Out</strong> button dabayein. Booking status 'Completed' ho jayega.</li>
                    <li>Room status automatically <strong>Dirty / Cleaning Required</strong> me convert ho jata hai taaki staff ko turnaround ka notification mil sake.</li>
                  </ul>
                </div>
              </div>

              <div class="tuhh-wf-card" style="border:2px solid #A78BFA;background:#FAF5FF;">
                <div class="tuhh-wf-badge" style="background:#7C3AED;color:#fff;">5. Special Timing Presets (Day-Use, Early Check-In & Late Check-Out)</div>
                <div class="tuhh-wf-content">
                  <h4 style="color:#6D28D9;">Special Timing Scenarios:</h4>
                  <ul style="color:#4C1D95;">
                    <li><strong>⚡ Same-Day / Day-Use Booking (e.g. Aaj 302 me 9:30 AM Check-in &amp; 4:30 PM Check-out):</strong><br>
                      New Booking wizard me direct <strong>⚡ Same-Day / Day-Use Preset</strong> button par click karein. Check-in aur Check-out dates automatically Aaj ki set ho jayengi, check-in time <strong>09:30 AM</strong> aur checkout time <strong>04:30 PM</strong> fill ho jayega. Calendar me ye <strong>⚡ Day Use</strong> pill ban kar aayega.
                    </li>
                    <li><strong>🌅 Early Check-In (Subah 09:30 AM ya standard 1 PM se pehle):</strong><br>
                      Booking banate waqt ya Edit me <strong>🌅 09:30 AM</strong> preset dabayein. Flats status me Housekeeping aur Caretakers ko <em>"🌅 EARLY CHECK-IN: 09:30 AM (Priority turnaround!)"</em> ka banner dikhega.
                    </li>
                    <li><strong>🌇 Late Check-Out (Shaam 4:30 PM ya 6:00 PM tak rukne par):</strong><br>
                      Booking card ya drawer me <strong>🌇 Late Check-Out</strong> button par click karein. New time select karein aur optional late fee (₹500 / ₹1,000 ya 0) enter karke save karein. Caretakers ko alert mil jayega ki 11:00 AM par disturb na karein.
                    </li>
                    <li><strong>⚡ Early Check-Out (Guest scheduled checkout se pehle nikal jaye):</strong><br>
                      Drawer me <strong>⚡ Early Check-Out</strong> button dabayein. System turant checkout record karke flat ko <strong>Dirty</strong> mark kar dega.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- SECTION 3: CALENDAR & ICAL SYNC -->
          <div class="tuhh-help-section-block" data-category="calendar" id="section-calendar">
            <div class="tuhh-section-header">
              <div class="tuhh-section-icon" style="background:#FAF5FF;color:#9333EA;"><i class="ti ti-calendar"></i></div>
              <div>
                <h2 class="tuhh-section-title">3. Reservations Calendar &amp; Airbnb iCal Sync</h2>
                <p class="tuhh-section-subtitle">Multi-property timeline calendar ko samajhna aur automated clash prevention:</p>
              </div>
            </div>

            <div class="tuhh-grid-2">
              <div class="tuhh-info-box">
                <h4><i class="ti ti-palette"></i> Calendar Color Legend</h4>
                <div class="tuhh-legend-item"><span class="tuhh-dot" style="background:#0284C7;"></span> <strong>Blue Bar:</strong> Direct / Offline Walk-in reservation.</div>
                <div class="tuhh-legend-item"><span class="tuhh-dot" style="background:#FF385C;"></span> <strong>Red/Pink Bar:</strong> Airbnb confirmed reservation.</div>
                <div class="tuhh-legend-item"><span class="tuhh-dot" style="background:#003580;"></span> <strong>Dark Blue:</strong> Booking.com reservation.</div>
                <div class="tuhh-legend-item"><span class="tuhh-dot" style="background:#64748B;"></span> <strong>Grey Hatched Bar:</strong> Maintenance / Owner Blocked dates.</div>
                <div class="tuhh-legend-item"><span class="tuhh-dot" style="background:#10B981;"></span> <strong>Empty White Box:</strong> Available for immediate booking.</div>
              </div>

              <div class="tuhh-info-box">
                <h4><i class="ti ti-refresh"></i> Airbnb Auto iCal Synchronization</h4>
                <p>
                  CRM me <strong>Multi-Property Realtime iCal Engine</strong> active hai. Jab bhi Airbnb par koi guest booking karta hai, dates automatically CRM me block ho jati hain to prevent double-booking across all 19 units.
                </p>
                <p>
                  Aap Calendar view par kisi bhi empty date par direct click karke instant reservation create kar sakte hain.
                </p>
                <div style="margin-top:12px;">
                  <button type="button" class="tuhh-action-inline-btn" onclick="navigate('calendar')"><i class="ti ti-calendar"></i> Open Calendar View (${altSymbol}C)</button>
                </div>
              </div>
            </div>
          </div>

          <!-- SECTION 4: EXECUTIVE FINANCIAL DASHBOARD -->
          <div class="tuhh-help-section-block" data-category="analytics" id="section-analytics">
            <div class="tuhh-section-header">
              <div class="tuhh-section-icon" style="background:#ECFDF5;color:#059669;"><i class="ti ti-chart-bar"></i></div>
              <div>
                <h2 class="tuhh-section-title">4. Executive Financial Analytics &amp; KPIs Guide</h2>
                <p class="tuhh-section-subtitle">Mac OS luxury window view me hotel performance metrics samajhna (Finances &gt; Executive Dashboard):</p>
              </div>
            </div>

            <div class="tuhh-grid-3">
              <div class="tuhh-card-compact">
                <div class="tuhh-card-icon" style="background:#EFF6FF;color:#0284C7;"><i class="ti ti-currency-rupee"></i></div>
                <h4>Net Revenue &amp; NOI</h4>
                <p><strong>Net Revenue</strong> total room earnings minus OTA commissions hai. <strong>Net Operating Income (NOI)</strong> actual profit hai jo Wi-Fi, electricity, staff salary aur laundry kharche deduct karne ke baad bachta hai.</p>
              </div>

              <div class="tuhh-card-compact">
                <div class="tuhh-card-icon" style="background:#F0FDF4;color:#16A34A;"><i class="ti ti-percentage"></i></div>
                <h4>Occupancy Rate %</h4>
                <p>19 managed properties me se kitne room-nights book huye. Target 75%+ occupancy maintain karna hota hai taaki revenue optimize rahe.</p>
              </div>

              <div class="tuhh-card-compact">
                <div class="tuhh-card-icon" style="background:#FFF7ED;color:#EA580C;"><i class="ti ti-tags"></i></div>
                <h4>ADR &amp; RevPAR</h4>
                <p><strong>ADR</strong> (Average Daily Rate): Per room average bikne wala rate. <strong>RevPAR</strong> (Revenue Per Available Room): Total inventory capacity ke hisab se per-room performance.</p>
              </div>
            </div>

            <div style="margin-top:16px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px;">
              <h4 style="margin:0 0 8px 0;font-size:14px;color:#0F172A;"><i class="ti ti-file-spreadsheet" style="color:#16A34A;"></i> Property Rankings &amp; Excel Download</h4>
              <p style="font-size:12.5px;color:#475569;margin:0 0 10px 0;">
                Dashboard ke bottom me sabhi 19 properties ka real-time performance table hai. Aap ise <strong>By revenue</strong> ya <strong>By profit</strong> sort kar sakte hain aur top bar me <strong>⬇ Excel</strong> button par click karke complete report download kar sakte hain.
              </p>
              <button type="button" class="tuhh-action-inline-btn" onclick="navigate('analytics')"><i class="ti ti-chart-bar"></i> Open Executive Dashboard (${altSymbol}H)</button>
            </div>
          </div>

          <!-- SECTION 5: ZERO-FEE UPI & BANK AUTO-SYNC -->
          <div class="tuhh-help-section-block" data-category="upi-sync" id="section-upi-sync">
            <div class="tuhh-section-header">
              <div class="tuhh-section-icon" style="background:#FEF3C7;color:#D97706;"><i class="ti ti-qrcode"></i></div>
              <div>
                <h2 class="tuhh-section-title">5. TUHH Zero-Fee UPI Auto-Sync Engine (Option A)</h2>
                <p class="tuhh-section-subtitle">100% Free · 0% Payment Gateway Commission · 0-Day Instant Settlement:</p>
              </div>
            </div>

            <div class="tuhh-workflow-list">
              <div class="tuhh-wf-card">
                <div class="tuhh-wf-badge" style="background:#10B981;color:#fff;">0% Brokerage Advantage</div>
                <div class="tuhh-wf-content">
                  <h4>Razorpay vs TUHH Native UPI Engine:</h4>
                  <ul>
                    <li><strong>Razorpay / Cashfree:</strong> 2% + 18% GST (₹5,000 transaction par ₹118 cut hota hai aur paisa T+2 working days me aata hai).</li>
                    <li><strong>TUHH Native Engine:</strong> <strong>₹0 (100% Free)</strong>. Paisa seedha aapke TUHH Bank Account me 0 seconds me aata hai without any corporate KYC or monthly quota blocks.</li>
                  </ul>
                </div>
              </div>

              <div class="tuhh-wf-card">
                <div class="tuhh-wf-badge" style="background:#0284C7;color:#fff;">12-Digit UTR Bank Auto-Match</div>
                <div class="tuhh-wf-content">
                  <h4>Kaise Kaam Karta Hai?</h4>
                  <ul>
                    <li><strong>1-Tap UPI Apps:</strong> Guest mobile screen par PhonePe, Google Pay, Paytm, BHIM aur "Open Any UPI App" ka direct button milta hai.</li>
                    <li><strong>Live 3-Second Radar:</strong> Booking confirmation screen par live radar backend par chalte huye bank settlement listen karta hai.</li>
                    <li><strong>Automatic Google Apps Script Sync:</strong> Bank SMS / credit alerts (HDFC, ICICI, PhonePe, Paytm, Yes Bank, Axis, Kotak) ko 1-minute trigger par Supabase se match karta hai.</li>
                    <li><strong>Celebration Confirmation:</strong> Jaise hi match hota hai, status automatically <strong>"Paid"</strong> ho jata hai aur official digital invoice receipt unlock ho jati hai.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- SECTION 6: CLAIMS & TUHH-OD STATEMENT -->
          <div class="tuhh-help-section-block" data-category="claims" id="section-claims">
            <div class="tuhh-section-header">
              <div class="tuhh-section-icon" style="background:#FEF2F2;color:#DC2626;"><i class="ti ti-scale"></i></div>
              <div>
                <h2 class="tuhh-section-title">6. Universal Claims, TUHH-OD &amp; Daily Closing Statement</h2>
                <p class="tuhh-section-subtitle">Vendor claims, company advances aur daily financial balance reconciliation:</p>
              </div>
            </div>

            <div class="tuhh-grid-2">
              <div class="tuhh-info-box">
                <h4><i class="ti ti-report-money"></i> TUHH-OD Account &amp; Claims Balance</h4>
                <p>
                  Company account (TUHH-OD) se staff ko diye gaye funds, deposit entries, aur verified vendor bills (plumbing, electrical, laundry, grocery) <strong>Finances &gt; TUHH-OD &amp; Claims</strong> me maintain hote hain.
                </p>
                <div style="margin-top:10px;">
                  <button type="button" class="tuhh-action-inline-btn" onclick="window.openClaimShortcut()"><i class="ti ti-scale"></i> Open Claims Manager (${altSymbol}Q)</button>
                </div>
              </div>

              <div class="tuhh-info-box">
                <h4><i class="ti ti-check-double"></i> Daily Closing Statement &amp; Mobile Proof</h4>
                <p>
                  Roz raat ko daily closing statement auto-generate hota hai: <strong>Today's Inflow (Deposits)</strong> vs <strong>Today's Outflow (Claims)</strong> = <strong>Net Movement &amp; Closing Balance</strong>.
                </p>
                <p>
                  Aap 1 click me <strong>Download Mobile Proof</strong> (PNG image card) download kar sakte hain ya <strong>Send to WhatsApp Group</strong> par bhej kar owners ko official update de sakte hain.
                </p>
              </div>
            </div>
          </div>

          <!-- SECTION 7: EXPENSES & WI-FI -->
          <div class="tuhh-help-section-block" data-category="expenses" id="section-expenses">
            <div class="tuhh-section-header">
              <div class="tuhh-section-icon" style="background:#FFF7ED;color:#EA580C;"><i class="ti ti-receipt-2"></i></div>
              <div>
                <h2 class="tuhh-section-title">7. Expenses, Wi-Fi Recharge &amp; Laundry Management</h2>
                <p class="tuhh-section-subtitle">Kharche kaise enter karein aur company outflow kaise track karein:</p>
              </div>
            </div>

            <div class="tuhh-grid-3">
              <div class="tuhh-card-compact">
                <div class="tuhh-card-icon" style="background:#EFF6FF;color:#0284C7;"><i class="ti ti-receipt"></i></div>
                <h4>Add Expense &amp; Outflow</h4>
                <p>Kisi bhi flat ka kharcha direct log karein. Keyboard par <strong>${altSymbol}⇧E</strong> dabakar instant modal kholein aur bill receipt photo attach karein.</p>
                <div class="tuhh-card-link"><kbd>${altSymbol}E</kbd> Expenses Hub</div>
              </div>

              <div class="tuhh-card-compact">
                <div class="tuhh-card-icon" style="background:#F0FDF4;color:#16A34A;"><i class="ti ti-wifi"></i></div>
                <h4>Wi-Fi Plans &amp; Recharges</h4>
                <p>Sabhi 19 properties ke Wi-Fi plan expiry dates aur bill payments <strong>Expenses &gt; Wi-Fi</strong> me track hote hain taaki guest stay me internet active rahe.</p>
                <div class="tuhh-card-link"><kbd>${altSymbol}X</kbd> Expenses & P&L</div>
              </div>

              <div class="tuhh-card-compact">
                <div class="tuhh-card-icon" style="background:#FAF5FF;color:#9333EA;"><i class="ti ti-wash-machine"></i></div>
                <h4>Laundry &amp; Linen Cycles</h4>
                <p>Dhobi / laundry vendor ko di gayi chadar, towel aur pillow covers ka count aur per-piece cost <strong>Expenses &gt; Laundry</strong> me enter karein.</p>
                <div class="tuhh-card-link"><kbd>${altSymbol}L</kbd> Laundry Tracker</div>
              </div>
            </div>
          </div>

          <!-- SECTION 8: HRMS & TASKS -->
          <div class="tuhh-help-section-block" data-category="hrms" id="section-hrms">
            <div class="tuhh-section-header">
              <div class="tuhh-section-icon" style="background:#FDF2F8;color:#DB2777;"><i class="ti ti-id-badge-2"></i></div>
              <div>
                <h2 class="tuhh-section-title">8. Staff Attendance, Tasks &amp; Salary Advances</h2>
                <p class="tuhh-section-subtitle">Employees management, daily tasks aur salary advance ka hisab-kitab:</p>
              </div>
            </div>

            <div class="tuhh-grid-2">
              <div class="tuhh-info-box">
                <h4><i class="ti ti-checklist"></i> Housekeeping &amp; Maintenance Tasks</h4>
                <ul>
                  <li><strong>New Task:</strong> Kisi bhi staff ko task assign karne ke liye <strong>${altSymbol}⇧T</strong> dabayein.</li>
                  <li>Task category select karein: <em>Cleaning, Deep Clean, AC Repair, Plumbing, Grocery Purchase</em>.</li>
                  <li>Staff task complete karke status 'Done' mark karta hai jisse manager ko live confirmation milta hai.</li>
                </ul>
              </div>

              <div class="tuhh-info-box">
                <h4><i class="ti ti-wallet"></i> Staff Salary Advances (Peshgi)</h4>
                <ul>
                  <li>Agar kisi employee ko mahine ke beech me advance cash ya UPI diya jata hai, to <strong>${altSymbol}⇧A</strong> dabakar turant record karein.</li>
                  <li>Month-end par salary slip banate waqt system total advance ko salary se <strong>automatically deduct</strong> kar deta hai.</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- SECTION 9: WHATSAPP HUB -->
          <div class="tuhh-help-section-block" data-category="whatsapp" id="section-whatsapp">
            <div class="tuhh-section-header">
              <div class="tuhh-section-icon" style="background:#ECFDF5;color:#059669;"><i class="ti ti-brand-whatsapp"></i></div>
              <div>
                <h2 class="tuhh-section-title">9. WhatsApp Hub &amp; Automated Guest Messages</h2>
                <p class="tuhh-section-subtitle">Bina mobile number save kiye professional 1-tap WhatsApp messages bhejna:</p>
              </div>
            </div>

            <div class="tuhh-grid-4">
              <div class="tuhh-wa-card">
                <div class="tuhh-wa-icon">📝</div>
                <h4>Booking Confirmation</h4>
                <p>Reservation dates, check-in time, property address aur advance receipt details instant 1-tap WhatsApp message.</p>
              </div>

              <div class="tuhh-wa-card">
                <div class="tuhh-wa-icon">📍</div>
                <h4>Location &amp; Directions</h4>
                <p>Apartment/Villa ka Google Map GPS location pin aur caretaker ka contact number guest ko direct bhejein.</p>
              </div>

              <div class="tuhh-wa-card">
                <div class="tuhh-wa-icon">📶</div>
                <h4>Wi-Fi &amp; House Rules</h4>
                <p>Flat ka specific Wi-Fi SSID, Password, swimming pool timing aur house rules guest ke phone par deliver karein.</p>
              </div>

              <div class="tuhh-wa-card">
                <div class="tuhh-wa-icon">⭐</div>
                <h4>Checkout &amp; Review Link</h4>
                <p>Checkout time reminder aur 5-Star Google / Airbnb review link send karke online ratings badhayein.</p>
              </div>
            </div>
          </div>

          <!-- SECTION 10: INTERACTIVE KEYBOARD SHORTCUTS MATRIX -->
          <div class="tuhh-help-section-block" data-category="shortcuts" id="section-shortcuts">
            <div class="tuhh-section-header">
              <div class="tuhh-section-icon" style="background:#F0F9FF;color:#0284C7;"><i class="ti ti-command"></i></div>
              <div>
                <h2 class="tuhh-section-title">10. High-Speed Keyboard Shortcuts Matrix</h2>
                <p class="tuhh-section-subtitle">Mouse use kiye bina super-fast speed se CRM chalayein (Click 'Run' to test any shortcut now):</p>
              </div>
            </div>

            <div class="tuhh-shortcuts-table-wrap">
              <div class="tuhh-shortcuts-grid">
                ${SHORTCUTS_DATA.map(sc => `
                  <div class="tuhh-sc-item">
                    <div class="tuhh-sc-keys">
                      <kbd class="tuhh-kbd-primary">${sc.key}</kbd>
                      ${sc.single && sc.single !== sc.key ? `<span class="tuhh-sc-or">or</span> <kbd class="tuhh-kbd-single">${sc.single}</kbd>` : ''}
                      ${sc.altKey ? `<span class="tuhh-sc-badge">${sc.altKey}</span>` : ''}
                    </div>
                    <div class="tuhh-sc-details">
                      <div class="tuhh-sc-title">${sc.title}</div>
                      <div class="tuhh-sc-desc">${sc.desc}</div>
                    </div>
                    <button type="button" class="tuhh-sc-run-btn" onclick="${sc.action}" title="Test this shortcut action right now">
                      <i class="ti ti-player-play"></i> <span>Run</span>
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- SECTION 11: PRO TIPS & TROUBLESHOOTING -->
          <div class="tuhh-help-section-block" data-category="tips" id="section-tips">
            <div class="tuhh-section-header">
              <div class="tuhh-section-icon" style="background:#FEF2F2;color:#DC2626;"><i class="ti ti-bulb"></i></div>
              <div>
                <h2 class="tuhh-section-title">11. Pro Tips, Safety &amp; Troubleshooting</h2>
                <p class="tuhh-section-subtitle">Common questions aur important operating precautions:</p>
              </div>
            </div>

            <div class="tuhh-grid-2">
              <div class="tuhh-faq-item">
                <h4><i class="ti ti-help"></i> Double-Booking Se Kaise Bachein?</h4>
                <p>
                  Jab bhi phone ya direct walk-in booking aaye, <strong>pehle 1 minute ke andar</strong> CRM me booking log karein ya calendar par dates block karein taaki Airbnb par wahi dates automatically block ho jayein aur koi dusra guest book na kar sake.
                </p>
              </div>

              <div class="tuhh-faq-item">
                <h4><i class="ti ti-help"></i> Data Offline / Slow Internet Par Save Hota Hai?</h4>
                <p>
                  Haan! TUHH CRM Progressive Web App (PWA) hai. Form save karte hi data local encrypted storage me store hota hai aur internet aate hi Supabase cloud se real-time synchronize ho jata hai.
                </p>
              </div>

              <div class="tuhh-faq-item">
                <h4><i class="ti ti-help"></i> Mobile Phone / iPad Par Kaise Install Karein?</h4>
                <p>
                  Safari (iPhone/iPad) me <strong>Share &gt; Add to Home Screen</strong> dabayein, ya Chrome (Android) me <strong>Install App</strong> par click karein. Ye app ki tarah bina browser bar ke fullscreen chalti hai.
                </p>
              </div>

              <div class="tuhh-faq-item">
                <h4><i class="ti ti-help"></i> Kisi Bhi Screen Par Fast Jump Chahiye?</h4>
                <p>
                  Keyboard par direct <strong>?</strong> dabayein ya <strong>Ctrl+K / Cmd+K</strong> press karke search box me kuch bhi type karein — command palette aapko exact screen par le jayega!
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    `;

    renderShell(html, 'help');
  };

  // Switch tab filter
  window.switchHelpTab = function(tabId) {
    window._helpActiveTab = tabId;
    document.querySelectorAll('.tuhh-help-tab-btn').forEach(btn => {
      const txt = (btn.textContent || '').toLowerCase();
      if ((tabId === 'all' && txt.includes('all')) || (tabId !== 'all' && txt.includes(tabId.replace('-', '')))) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const sections = document.querySelectorAll('.tuhh-help-section-block');
    sections.forEach(sec => {
      const cat = sec.getAttribute('data-category') || '';
      if (tabId === 'all' || cat === tabId || (tabId === 'overview' && cat === 'overview')) {
        sec.style.display = 'block';
      } else {
        sec.style.display = 'none';
      }
    });

    try {
      const targetSec = document.getElementById('section-' + tabId);
      if (targetSec && tabId !== 'all') {
        targetSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch(e) {}
  };

  // Live search filtering inside Help Page
  window.filterHelpGuideContent = function(query) {
    const q = (query || '').trim().toLowerCase();
    const sections = document.querySelectorAll('.tuhh-help-section-block');
    const items = document.querySelectorAll('.tuhh-step-card, .tuhh-wf-card, .tuhh-card-compact, .tuhh-sc-item, .tuhh-faq-item, .tuhh-info-box, .tuhh-wa-card');

    if (!q) {
      window.switchHelpTab(window._helpActiveTab || 'all');
      items.forEach(el => el.style.display = '');
      return;
    }

    sections.forEach(sec => sec.style.display = 'block');

    items.forEach(el => {
      const text = (el.textContent || '').toLowerCase();
      if (text.includes(q)) {
        el.style.display = '';
        el.style.opacity = '1';
      } else {
        el.style.display = 'none';
      }
    });
  };

})();
