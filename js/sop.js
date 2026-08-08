/**
 * SOP Module — Quick Action Guide (v2 Compact)
 * UNIQUE HAVEN HOMES STAY
 */

const SOP_SECTIONS = [
  {
    id: 'daily',
    icon: '⚡',
    title: 'Daily Quick Actions',
    color: '#3B82F6',
    items: [
      {
        icon: '📅',
        title: 'New Offline Booking (Direct)',
        time: '30 sec',
        desc: 'Walk-in guest ya direct call se booking',
        steps: [
          'Bookings → ➕ New Booking',
          'Mode: <strong>Offline / Direct</strong>',
          'Select <strong>Property</strong> (jahan guest rukega)',
          'Guest name + Phone',
          'Check-in / Check-out dates',
          'Amount + Payment mode',
          'Upload ID photo',
          '💾 Save Booking'
        ],
        tip: '💡 Direct bookings pe full revenue milta hai (no platform fee).'
      },
      {
        icon: '🌐',
        title: 'New Online Booking (Airbnb Manual)',
        time: '1 min',
        desc: '⚠️ IMPORTANT: Airbnb me 2 property select karni hoti hain',
        steps: [
          'Bookings → ➕ New Booking',
          'Mode: <strong>Online-Airbnb</strong>',
          '<strong>Source Property</strong> = Jahan Airbnb pe listed hai (jaha guest ne book kiya)',
          '<strong>Actual Property</strong> = Jahan guest actually rukega (agar different room diya)',
          '💡 Same property? → Dono me same select karo',
          'Guest name + Airbnb Confirmation Code',
          'Check-in / Check-out',
          'Gross Amount (Airbnb pe jo total dikha)',
          'Platform Fee (Airbnb ki cut)',
          'Net Amount (jo actually milega) — auto-calc',
          '💾 Save'
        ],
        tip: '💡 <strong>Example:</strong> Guest ne "Black Beauty" book kiya but aap ne "The Brown" me shift kiya. Source=Black Beauty, Actual=The Brown. Ye tracking ke liye zaroori hai — Airbnb ke saath reconcile karne me.'
      },
      {
        icon: '🔄',
        title: 'Auto-Sync Airbnb Bookings',
        time: 'Auto',
        desc: 'Manual entry ki zaroorat NAHI — automatic!',
        steps: [
          'iCal Sync setup already done hai',
          'Har 2 hours automatic sync hota hai',
          'New Airbnb booking → auto import',
          'Guest "Airbnb Guest (Needs Details)" name se save hoti hai',
          'Baad me manually name + amount fill kar do (Edit karke)'
        ],
        tip: '💡 Manual entry sirf tab karo jab guest ka name/details available ho pehle hi.'
      },
      {
        icon: '💰',
        title: 'Add Payment',
        time: '15 sec',
        steps: [
          'Bookings → Find guest row',
          'Click 💰 Pay button',
          'Amount + Mode (Cash/UPI/Bank)',
          'Date (default: today)',
          '💾 Save'
        ],
        tip: '💡 Multiple payments per booking allowed. History always visible.'
      },
      {
        icon: '📋',
        title: 'Mark Attendance',
        time: '15 sec',
        steps: [
          'Attendance → Mark Today tab',
          'Click Present ✅ / Absent ❌ / Half ½ per employee',
          'Auto-saved instantly'
        ],
        tip: '💡 Back-dated attendance allowed via date picker.'
      }
    ]
  },
  {
    id: 'expenses',
    icon: '💸',
    title: 'Expense Management',
    color: '#10B981',
    items: [
      {
        icon: '💸',
        title: 'Daily Expense (Reimbursement)',
        time: '30 sec',
        desc: 'Personal payments to claim back from owner',
        steps: [
          'Daily Expenses → ➕ Add Expense',
          'Category: Delivery/Grocery/Other',
          'Amount + Description',
          'From/To location (optional)',
          'Photo receipt (auto-compressed)',
          '💾 Save → Status: Pending'
        ],
        tip: '💡 Later: 📤 Claimed → ✅ Received (owner paid you)'
      },
      {
        icon: '🧺',
        title: 'Laundry Entry',
        time: '1 min',
        steps: [
          'Laundry → ➕ Add Laundry',
          'Vendor (dropdown OR add new)',
          'Date + Property (optional)',
          'Add items: qty + rate (auto-total)',
          '💾 Save → Later mark Payment'
        ],
        tip: '💡 Type Total → Rate auto-calculates!'
      },
      {
        icon: '📅',
        title: 'Monthly Property Expenses',
        time: '2 min',
        desc: 'Rent, Maid, Cleaning supplies etc.',
        steps: [
          'Investors → 📅 Monthly Expenses tab',
          'Select Property + Month',
          'Fill amounts (or Copy from previous month)',
          'Auto-saved',
          'Used in Investor reports'
        ]
      },
      {
        icon: '💵',
        title: 'Staff Advance',
        time: '30 sec',
        steps: [
          'Advances → ➕ Give Advance',
          'Select employee + Amount',
          'Date + Reason',
          '💾 Save',
          'Auto-deducts from next salary'
        ]
      }
    ]
  },
  {
    id: 'operations',
    icon: '🏘️',
    title: 'Operations',
    color: '#F59E0B',
    items: [
      {
        icon: '🔧',
        title: 'Report Maintenance Issue',
        time: '30 sec',
        steps: [
          'Maintenance → ➕ Add Issue',
          'Property + Priority (🔴🟡🟢)',
          'Type + Description',
          'Assign to Employee OR Vendor',
          'Photo (before) → 💾 Save'
        ],
        tip: '💡 Add "After" photo when resolved for records.'
      },
      {
        icon: '🧰',
        title: 'Assign Task',
        time: '20 sec',
        steps: [
          'Tasks → ➕ Add Task',
          'Employee + Property',
          'Type (Cleaning/Dusting/etc)',
          'Description + Priority',
          '💾 Save'
        ],
        tip: '💡 View: By Employee OR By Date'
      },
      {
        icon: '🛏️',
        title: 'Check Flat Status',
        time: '10 sec',
        steps: [
          'Flats Status → All rooms visible',
          'Green = Available, Red = Occupied',
          'Click to see current guest'
        ]
      }
    ]
  },
  {
    id: 'reports',
    icon: '📊',
    title: 'Reports & Analytics',
    color: '#8B5CF6',
    items: [
      {
        icon: '📊',
        title: 'Investor Report',
        time: '1 min',
        steps: [
          'Investors → Find investor',
          'Click 📊 Report View button',
          'Select month → Auto-calculates',
          '📱 Send WhatsApp report',
          'PDF download available'
        ]
      },
      {
        icon: '📈',
        title: 'Analytics Dashboard',
        time: '',
        steps: [
          'Analytics → Charts + trends',
          'Property performance',
          'Revenue breakdowns',
          'Occupancy rates'
        ]
      },
      {
        icon: '📅',
        title: 'Daily Report',
        time: '',
        steps: [
          'Daily Report → Todays summary',
          'Check-ins / Check-outs',
          'Payments received',
          'Pending dues'
        ]
      }
    ]
  },
  {
    id: 'sync',
    icon: '🔄',
    title: 'Airbnb Sync',
    color: '#EF4444',
    items: [
      {
        icon: '📅',
        title: 'iCal Auto-Sync (Recommended)',
        time: 'Auto',
        desc: 'Real-time booking import from Airbnb',
        steps: [
          'Airbnb Sync → 📅 iCal Auto-Sync tab',
          'Add iCal URL per property (Airbnb Calendar → Export)',
          'Auto-runs every 2 hours',
          'Only imports real bookings (skips manual blocks)',
          'Enable/Disable toggle available'
        ],
        tip: '💡 Manual sync anytime via Sync All button'
      },
      {
        icon: '📁',
        title: 'CSV Import (Reconciliation)',
        time: '5 min',
        steps: [
          'Airbnb Sync → 📁 CSV Import tab',
          'Download CSV from Airbnb → Earnings',
          'Upload → Auto-matches bookings',
          'Fix discrepancies with one click'
        ]
      }
    ]
  },
  {
    id: 'tips',
    icon: '💡',
    title: 'Pro Tips & Emergency',
    color: '#EC4899',
    items: [
      {
        icon: '🚨',
        title: 'Common Fixes',
        time: '',
        steps: [
          'Wrong booking? → Bookings → ✏️ Edit or 🗑️ Delete',
          'Double booking? → System auto-warns you',
          'Payment mistake? → 💰 Pay → History → ✏️ Edit that payment',
          'Guest name wrong? → ✏️ Edit booking'
        ]
      },
      {
        icon: '💡',
        title: 'Time Savers',
        time: '',
        steps: [
          '📸 All photos auto-compress (fast upload)',
          '🔍 Search sidebar top se any page find karo',
          '📱 Bell icon (🔔) — real-time notifications',
          '⚙️ Preferences — customize your view',
          '🌐 Works offline (PWA installed)'
        ]
      },
      {
        icon: '🎯',
        title: 'Best Practices',
        time: '',
        steps: [
          '✅ Attendance daily mark karo (payroll auto)',
          '✅ Guest ID always upload (compliance)',
          '✅ Payment same-day record karo',
          '✅ Maintenance issues photo ke saath report',
          '✅ Investor reports monthly bhejo (1st week)'
        ]
      }
    ]
  }
];

function renderSOPPage() {
  const activeSection = window._sopActiveSection || 'daily';
  const section = SOP_SECTIONS.find(s => s.id === activeSection) || SOP_SECTIONS[0];
  
  renderShell(`
    <div class="card">
      <h1>📘 SOP — Quick Action Guide</h1>
      <div class="sub">Practical guide for daily operations</div>
    </div>

    <div class="card" style="padding:8px;">
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${SOP_SECTIONS.map(s => `
          <button 
            onclick="window._sopActiveSection='${s.id}';renderSOPPage()"
            style="padding:8px 14px;border-radius:8px;border:none;cursor:pointer;font-weight:600;font-size:13px;background:${s.id===activeSection?s.color:'#f5f5f5'};color:${s.id===activeSection?'#fff':'#333'};">
            ${s.icon} ${s.title}
          </button>
        `).join('')}
      </div>
    </div>

    <div class="card" style="border-left:4px solid ${section.color};">
      <h2 style="color:${section.color};margin-bottom:12px;">${section.icon} ${section.title}</h2>
      
      ${section.items.map(item => `
        <div style="padding:14px;background:#fafafa;border-radius:10px;margin-bottom:12px;border-left:3px solid ${section.color};">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
            <div style="font-size:16px;font-weight:700;">${item.icon} ${item.title}</div>
            ${item.time ? `<span style="background:${section.color};color:#fff;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;">⏱️ ${item.time}</span>` : ''}
          </div>
          ${item.desc ? `<div style="color:#666;font-size:12px;font-style:italic;margin-bottom:8px;">${item.desc}</div>` : ''}
          <ol style="margin:0;padding-left:20px;line-height:1.9;font-size:13px;">
            ${item.steps.map(s => `<li>${s}</li>`).join('')}
          </ol>
          ${item.tip ? `<div style="margin-top:10px;padding:8px 12px;background:#FEF3C7;border-radius:6px;font-size:12px;color:#78350F;">${item.tip}</div>` : ''}
        </div>
      `).join('')}
    </div>

    <div class="card" style="text-align:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;">
      <div style="font-size:14px;font-weight:600;margin-bottom:6px;">🎯 Need Help?</div>
      <div style="font-size:12px;opacity:0.9;">Contact Admin or check Notifications 🔔 for updates</div>
      <div style="margin-top:10px;">
        <button onclick="window.print()" style="background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.4);padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px;">🖨️ Print SOP</button>
      </div>
    </div>
  `, 'sop');
}

// Backward compatibility
window.renderSOPTab = function(page) {
  const sectionIds = ['daily', 'daily', 'daily', 'sync', 'daily', 'operations', 'operations', 'operations', 'operations', 'operations', 'operations', 'daily', 'expenses', 'expenses', 'expenses', 'expenses', 'expenses', 'reports', 'reports', 'reports', 'operations', 'reports', 'sync', 'tips', 'tips'];
  window._sopActiveSection = sectionIds[page] || 'daily';
  renderSOPPage();
};
