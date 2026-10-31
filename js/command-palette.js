/* ══════════════════════════════════════════════════════════════════
   🔍 GLOBAL SPOTLIGHT COMMAND PALETTE (Cmd+K) & 🎙️ AI VOICE-TO-BOOKING
   Unique Haven Homes Property Management System
   ══════════════════════════════════════════════════════════════════ */

(function initCommandAndVoice() {
  'use strict';

  // ─── 1. Comprehensive PMS Menu & Navigation Directory ───
  const PMS_MENU_DIRECTORY = [
    // 🧑‍💼 Finance & Accounts
    {
      id: 'investors',
      type: 'menu',
      group: 'Finance & Accounts',
      icon: '🧑‍💼',
      title: 'Investors Hub & Payouts (Alt+I)',
      sub: 'Investor profiles, equity shares, monthly expenses & payout sheets [Alt+I / I]',
      keywords: ['investors', 'investor', 'inv', 'shareholder', 'equity', 'shares', 'payout', 'payouts', 'hisab', 'malik', 'owner', 'alt+i', 'i'],
      action: () => window.openInvestorsShortcut()
    },
    {
      id: 'investor-broadcast',
      type: 'menu',
      group: 'Finance & Accounts',
      icon: '📢',
      title: 'Investor Booking Updates & Broadcast',
      sub: 'Broadcast date-wise guest bookings and revenue to all homestay investors',
      keywords: ['investor broadcast', 'investor update', 'broadcast', 'investor whatsapp', 'send to investors', 'inv'],
      action: () => { if (window.openInvestorBookingBroadcastModal) window.openInvestorBookingBroadcastModal(); else window.navigate('investors'); }
    },
    {
      id: 'reimbursements',
      type: 'menu',
      group: 'Finance & Accounts',
      icon: '💸',
      title: 'Daily Expenses & Spends Tracker',
      sub: 'Daily property operational expenses, utility bills & market grocery spends',
      keywords: ['expenses', 'daily expenses', 'reimbursements', 'reimbursement', 'kharcha', 'spends', 'daily spend', 'bills'],
      action: () => window.navigate('reimbursements')
    },
    {
      id: 'claims',
      type: 'menu',
      group: 'Finance & Accounts',
      icon: '🧾',
      title: 'Staff Expense Claims & Settlements (Alt+E)',
      sub: 'Staff market purchases, fuel, diesel & settlement claims [Alt+E / E]',
      keywords: ['claims', 'claim', 'staff claim', 'employee claim', 'petrol', 'diesel', 'market bill', 'saman bill', 'claims manager', 'reimbursements', 'alt+e', 'e'],
      action: () => window.openClaimShortcut()
    },
    {
      id: 'expenses',
      type: 'menu',
      group: 'Finance & Accounts',
      icon: '📊',
      title: 'Monthly Expenses & P&L Tracker',
      sub: 'Property-wise profit & loss reporting, overheads & monthly sheets',
      keywords: ['expenses', 'monthly expenses', 'pnl', 'profit and loss', 'p&l', 'overhead', 'utility bills', 'bills', 'monthly sheet'],
      action: () => window.navigate('expenses')
    },
    {
      id: 'cashbook',
      type: 'menu',
      group: 'Finance & Accounts',
      icon: '💰',
      title: 'Cash Book & Counter Handover',
      sub: 'Petty cash ledger, cash in hand & daily shift handovers',
      keywords: ['cashbook', 'cash book', 'cash', 'handover', 'counter cash', 'petty cash', 'tijori', 'locker', 'safe balance'],
      action: () => window.openCashBookShortcut()
    },
    {
      id: 'ca-audit',
      type: 'menu',
      group: 'Finance & Accounts',
      icon: '💼',
      title: 'GST Tax Invoices & CA Audit Pack',
      sub: 'Generate customer GST tax invoices, bills & monthly CA audit zip',
      keywords: ['gst', 'ca audit', 'ca pack', 'tax invoices', 'tax invoice', 'tax bill', 'audit pack', 'chartered accountant', 'gst bill'],
      action: () => window.navigate('ca-audit')
    },
    {
      id: 'company-advances',
      type: 'menu',
      group: 'Finance & Accounts',
      icon: '🏢',
      title: 'Company Advances Ledger',
      sub: 'Track business owner & partner corporate cash withdrawals',
      keywords: ['company advances', 'company advance', 'owner advance', 'partner advance', 'business withdrawal', 'advances'],
      action: () => window.navigate('company-advances')
    },

    // 📅 Stay & Bookings
    {
      id: 'bookings',
      type: 'menu',
      group: 'Stay & Bookings',
      icon: '🛎',
      title: 'Bookings Management (Alt+B)',
      sub: 'Guest reservations, status filters, channel tags & payment tracking [Alt+B]',
      keywords: ['bookings', 'booking', 'reservations', 'guest list', 'smart bookings', 'all bookings', 'stay', 'alt+b'],
      action: () => window.openBookingsShortcut()
    },
    {
      id: 'calendar',
      type: 'menu',
      group: 'Stay & Bookings',
      icon: '📅',
      title: 'Airbnb-Style Calendar (Alt+C)',
      sub: 'Visual reservation calendar grid across all properties [Alt+C]',
      keywords: ['calendar', 'dates', 'occupancy calendar', 'grid', 'schedule', 'timeline view', 'cal', 'alt+c'],
      action: () => window.openCalendarShortcut()
    },
    {
      id: 'flats',
      type: 'menu',
      group: 'Stay & Bookings',
      icon: '🛏️',
      title: 'Flats & Housekeeping Turnaround (Alt+F)',
      sub: 'Realtime Kanban room status (Dirty ➔ Cleaning ➔ Ready) [Alt+F]',
      keywords: ['flats', 'flats status', 'turnaround', 'housekeeping', 'dirty', 'cleaning', 'ready', 'inspected', 'safai', 'room status', 'alt+f'],
      action: () => window.openFlatsShortcut()
    },
    {
      id: 'reports',
      type: 'menu',
      group: 'Stay & Bookings',
      icon: '📅',
      title: 'Reservations Calendar Grid',
      sub: 'Visual calendar of all units and guest bookings across dates',
      keywords: ['reports', 'calendar', 'reservations calendar', 'matrix', 'room grid', 'stay grid'],
      action: () => window.navigate('reports')
    },
    {
      id: 'pendingApprovals',
      type: 'menu',
      group: 'Stay & Bookings',
      icon: '🟡',
      title: 'Pending Approvals & Verifications',
      sub: 'Shift cash handovers, staff reimbursements & booking sign-offs',
      keywords: ['pending approvals', 'approvals', 'pending handover', 'verify', 'signoff', 'authorize', 'manzoori'],
      action: () => window.navigate('pendingApprovals')
    },

    {
      id: 'reminders',
      type: 'menu',
      group: 'Stay & Bookings',
      icon: '🔔',
      title: 'Reminders & Checkout Alarms',
      sub: 'Checkout alarms, turnaround notifications & upcoming tasks',
      keywords: ['reminders', 'reminder', 'checkout alarm', 'alarms', 'alerts', 'upcoming tasks', 'follow ups'],
      action: () => window.navigate('reminders')
    },

    // 👥 HRMS & Staff
    {
      id: 'employees',
      type: 'menu',
      group: 'HRMS & Staff',
      icon: '👥',
      title: 'Staff Roster & HRMS Profiles',
      sub: 'Employee profiles, KYC documents, designations & phone directory',
      keywords: ['employees', 'staff', 'staff roster', 'team', 'workers', 'caretakers', 'maids', 'hrms', 'staff list'],
      action: () => window.navigate('employees')
    },
    {
      id: 'attendance',
      type: 'menu',
      group: 'HRMS & Staff',
      icon: '📋',
      title: 'Staff Attendance (Mark Today)',
      sub: 'Daily staff check-in, presence, overtime & leaves',
      keywords: ['attendance', 'staff attendance', 'haziri', 'daily attendance', 'present', 'absent', 'check in staff', 'overtime', 'mark attendance'],
      action: () => window.navigate('attendance')
    },
    {
      id: 'att-summary',
      type: 'menu',
      group: 'HRMS & Staff',
      icon: '📊',
      title: 'Monthly Attendance Summary & Muster Roll',
      sub: 'Monthly attendance percentages, shift totals & muster roll report',
      keywords: ['attendance summary', 'monthly attendance', 'att-summary', 'attendance sheet', 'muster roll', 'haziri sheet'],
      action: () => window.navigate('att-summary')
    },
    {
      id: 'advance',
      type: 'menu',
      group: 'HRMS & Staff',
      icon: '🎁',
      title: 'Staff Advances Tracker (Alt+A)',
      sub: 'Employee advance loans, deduction ledger & pending balances [Alt+A / A]',
      keywords: ['advance', 'advances', 'staff advances', 'employee advance', 'peshgi', 'udhar', 'loan', 'salary advance', 'alt+a', 'a'],
      action: () => window.openAdvanceShortcut()
    },
    {
      id: 'employee-ledger',
      type: 'menu',
      group: 'HRMS & Staff',
      icon: '📒',
      title: 'Employee Ledger & Salary History',
      sub: 'Detailed payroll debit/credit transaction history per employee',
      keywords: ['employee ledger', 'employee-ledger', 'staff ledger', 'salary ledger', 'staff khata', 'transaction history', 'ledger'],
      action: () => window.navigate('employee-ledger')
    },
    {
      id: 'tasks',
      type: 'menu',
      group: 'HRMS & Staff',
      icon: '🧰',
      title: 'Staff Tasks & Checklists (Alt+T)',
      sub: 'Housekeeping duties, room deep cleans & inspection checklists [Alt+T / T]',
      keywords: ['tasks', 'task', 'duty', 'checklist', 'staff task', 'kaam', 'assignments', 'cleaning task', 'alt+t', 't'],
      action: () => window.openTasksShortcut()
    },
    {
      id: 'sop',
      type: 'menu',
      group: 'HRMS & Staff',
      icon: '📘',
      title: 'SOP Operational Guides & Procedures',
      sub: 'Standard operating procedures for cleaning, check-in & emergencies',
      keywords: ['sop', 'sops', 'standard operating procedure', 'rules', 'procedure', 'checklists', 'guide', 'manual'],
      action: () => window.navigate('sop')
    },
    {
      id: 'salary',
      type: 'menu',
      group: 'HRMS & Staff',
      icon: '💼',
      title: 'Staff Salaries & Monthly Payroll',
      sub: 'Monthly salary calculations, advance deductions & net payouts',
      keywords: ['salary', 'salaries', 'payroll', 'tankhwah', 'staff pay', 'wages', 'monthly salary', 'salary slip'],
      action: () => window.navigate('salary')
    },

    // 🏢 Properties & Operations
    {
      id: 'rooms',
      type: 'menu',
      group: 'Properties & Ops',
      icon: '🏢',
      title: 'Properties & Units (Pricing & Amenities)',
      sub: '17 homestays details, unit numbers, pricing & property amenities',
      keywords: ['rooms', 'properties', 'units', 'pricing', 'villas', 'apartments', 'flats pricing', 'amenities', 'homestays'],
      action: () => window.navigate('rooms')
    },
    {
      id: 'property-setup',
      type: 'menu',
      group: 'Properties & Ops',
      icon: '🏗️',
      title: 'Property Setup & Configuration',
      sub: 'Configure units, room structures & base pricing',
      keywords: ['property setup', 'setup rooms', 'new unit', 'configure property', 'room config'],
      action: () => window.navigate('property-setup')
    },
    {
      id: 'airbnb-sync',
      type: 'menu',
      group: 'Properties & Ops',
      icon: '🔄',
      title: 'Airbnb Direct Channel Sync',
      sub: 'Instant bi-directional sync with Airbnb calendars & rates',
      keywords: ['airbnb', 'airbnb-sync', 'airbnb sync', 'channel manager', 'calendar sync', 'ota sync', 'airbnb ical', 'sync'],
      action: () => window.navigate('airbnb-sync')
    },
    {
      id: 'ical-sync',
      type: 'menu',
      group: 'Properties & Ops',
      icon: '📅',
      title: 'iCal Calendar Sync (Booking.com/Agoda)',
      sub: 'Import and export iCalendar feeds for external OTA channels',
      keywords: ['ical', 'ical-sync', 'ical sync', 'booking.com sync', 'agoda sync', 'export ical', 'import ical'],
      action: () => window.navigate('ical-sync')
    },
    {
      id: 'maintenance',
      type: 'menu',
      group: 'Properties & Ops',
      icon: '🔧',
      title: 'Maintenance & Repairs Log',
      sub: 'Log AC servicing, plumbing fixes, electrical repairs & asset upkeep',
      keywords: ['maintenance', 'repairs', 'ac servicing', 'plumbing', 'electrician', 'repair tickets', 'upkeep', 'kharab', 'tuta'],
      action: () => window.navigate('maintenance')
    },
    {
      id: 'laundry',
      type: 'menu',
      group: 'Properties & Ops',
      icon: '🧺',
      title: 'Laundry & Linen Management',
      sub: 'Track bedsheets, duvet covers, towels & washer laundry runs',
      keywords: ['laundry', 'linen', 'sheets', 'towels', 'dhobi', 'washing', 'chadar', 'bedsheet', 'laundry management'],
      action: () => window.navigate('laundry')
    },
    {
      id: 'store',
      type: 'menu',
      group: 'Properties & Ops',
      icon: '📦',
      title: 'Store & Inventory Supplies',
      sub: 'Track toiletries, water bottles, tea kits & room amenities',
      keywords: ['store', 'inventory', 'stock', 'toiletries', 'supplies', 'godown', 'amenities', 'water bottle'],
      action: () => window.navigate('store')
    },
    {
      id: 'showcase-admin',
      type: 'menu',
      group: 'Properties & Ops',
      icon: '🌐',
      title: 'Website Showcase & Media CMS',
      sub: 'Airbnb-style room photos, videos, pricing & guest maps',
      keywords: ['showcase', 'showcase-admin', 'website showcase', 'photos', 'media cms', 'videos', 'gallery', 'website admin'],
      action: () => window.navigate('showcase-admin')
    },

    // 📈 Reports & Analytics
    {
      id: 'dashboard',
      type: 'menu',
      group: 'Dashboard',
      icon: '🏠',
      title: 'Dashboard Overview',
      sub: 'Key performance indicators, daily arrivals & revenue summary',
      keywords: ['dashboard', 'overview', 'kpi', 'home', 'main', 'summary'],
      action: () => window.navigate('dashboard')
    },
    {
      id: 'dailyReport',
      type: 'menu',
      group: 'Reports & Analytics',
      icon: '📈',
      title: 'Daily Operations & Revenue Report (Alt+R)',
      sub: 'Daily collections, occupancy summary & audit logs [Alt+R]',
      keywords: ['daily report', 'daily operations', 'daily ops', 'daily hisab', 'day report', 'revenue report', 'collections', 'alt+r'],
      action: () => window.openDailyReportShortcut()
    },
    {
      id: 'analytics',
      type: 'menu',
      group: 'Reports & Analytics',
      icon: '📊',
      title: 'Business Analytics & RevPAR',
      sub: 'Occupancy trends, ADR, RevPAR trends & property performance',
      keywords: ['analytics', 'business analytics', 'revpar', 'adr', 'occupancy', 'charts', 'graphs', 'revenue analytics', 'trends'],
      action: () => window.navigate('analytics')
    },
    {
      id: 'property-report',
      type: 'menu',
      group: 'Reports & Analytics',
      icon: '🏡',
      title: 'Property Performance Report',
      sub: 'Villa & room-level revenue, expenses & net operating income',
      keywords: ['property report', 'villa report', 'unit report', 'property profit', 'net operating income'],
      action: () => window.navigate('property-report')
    },

    // 📱 Communications
    {
      id: 'whatsapp-hub',
      type: 'menu',
      group: 'Communications',
      icon: '📱',
      title: 'WhatsApp Hub & Guest Automations',
      sub: 'Automated check-in guides, WiFi vouchers & guest chat triggers',
      keywords: ['whatsapp', 'whatsapp hub', 'wa', 'automations', 'guest messaging', 'templates', 'automated chat', 'triggers', 'chat'],
      action: () => window.navigate('whatsapp-hub')
    },

    // ⚙️ System & Settings
    {
      id: 'user-mgmt',
      type: 'menu',
      group: 'System & Settings',
      icon: '👤',
      title: 'User Management & Role Permissions',
      sub: 'Staff portal logins, role assignments (Admin, Manager, Staff)',
      keywords: ['user management', 'users', 'user-mgmt', 'roles', 'permissions', 'staff login', 'admin access', 'passwords'],
      action: () => window.navigate('user-mgmt')
    },
    {
      id: 'settings',
      type: 'menu',
      group: 'System & Settings',
      icon: '⚙️',
      title: 'System Settings & Business Profile',
      sub: 'Company details, property policies, tax numbers & defaults',
      keywords: ['settings', 'system settings', 'config', 'business setup', 'company profile', 'preferences', 'tax config'],
      action: () => window.navigate('settings')
    },

    // ⚡ Fast Primary Actions
    {
      id: 'action-voice',
      type: 'action',
      group: 'Fast Actions',
      icon: '🎙️',
      title: 'Voice-to-Booking (Hindi/English)',
      sub: 'Speak to create a booking instantly [Voice AI]',
      keywords: ['voice', 'bolkar', 'bolke', 'mic', 'nisha', 'speak', 'audio', 'ai booking'],
      action: () => window.openVoiceBookingModal()
    },
    {
      id: 'action-new-booking',
      type: 'action',
      group: 'Fast Actions',
      icon: '➕',
      title: 'New Booking Form (Alt+N)',
      sub: 'Open manual booking creation wizard [Alt+N]',
      keywords: ['new booking', 'add booking', 'create reservation', 'naya', 'book', 'reservation', 'alt+n'],
      action: () => window.openNewBookingShortcut()
    },
    {
      id: 'action-duplicate',
      type: 'action',
      group: 'Fast Actions',
      icon: '📋',
      title: 'Duplicate Existing Booking (Alt+D)',
      sub: 'Clone active booking or pick recent guest to rebook [Alt+D]',
      keywords: ['duplicate', 'clone', 'copy', 'repeat guest', 'rebook', 'wahi booking', 'alt+d', 'dupe'],
      action: () => window.duplicateExistingBookingShortcut()
    },
    {
      id: 'action-quick-pay',
      type: 'action',
      group: 'Fast Actions',
      icon: '💵',
      title: 'Add Payment / Quick Pay (Alt+P)',
      sub: 'Record payment for active booking or quick pay picker [Alt+P]',
      keywords: ['pay', 'payment', 'add payment', 'record payment', 'collect', 'jama', 'paisa', 'baki', 'due', 'receipt', 'fees', 'alt+p'],
      action: () => window.openQuickPaymentShortcut()
    },
    {
      id: 'action-qr-pay',
      type: 'action',
      group: 'Fast Actions',
      icon: '⚡',
      title: 'Instant QR Code Pay / UPI Collect',
      sub: 'Generate UPI QR code to collect payment instantly',
      keywords: ['qr', 'qr pay', 'upi', 'scan', 'gpay', 'phonepe', 'paytm', 'barcode', 'instant pay'],
      action: () => { if (window.openCustomPaymentQRModal) window.openCustomPaymentQRModal(); else if (window.openQuickQRPayModal) window.openQuickQRPayModal(); }
    },
    {
      id: 'action-new-task',
      type: 'action',
      group: 'Fast Actions',
      icon: '➕',
      title: 'Create New Staff Task (Alt+Shift+T)',
      sub: 'Assign room cleaning, maintenance, or errand to staff member [Alt+Shift+T]',
      keywords: ['new task', 'add task', 'create task', 'assign task', 'duty', 'checklist', 'kaam do', 'alt+shift+t'],
      action: () => window.openNewTaskShortcut()
    },
    {
      id: 'action-new-advance',
      type: 'action',
      group: 'Fast Actions',
      icon: '➕',
      title: 'Record New Staff Advance (Alt+Shift+A)',
      sub: 'Issue cash or UPI advance payment to staff member [Alt+Shift+A]',
      keywords: ['give advance', 'new advance', 'add advance', 'advance do', 'staff loan', 'advance payment', 'alt+shift+a'],
      action: () => window.openNewAdvanceShortcut()
    },
    {
      id: 'action-new-claim',
      type: 'action',
      group: 'Fast Actions',
      icon: '➕',
      title: 'Log New Expense Claim (Alt+Shift+E)',
      sub: 'Record new staff expense claim or market purchase bill [Alt+Shift+E]',
      keywords: ['new claim', 'add claim', 'log claim', 'log expense', 'add reimbursement', 'new bill', 'alt+shift+e'],
      action: () => window.openNewClaimShortcut()
    },
    {
      id: 'action-pay-salary',
      type: 'action',
      group: 'Fast Actions',
      icon: '💳',
      title: 'Pay Staff Salary Voucher',
      sub: 'Generate staff salary voucher and record payment',
      keywords: ['pay salary', 'salary voucher', 'salary slip', 'payment to staff', 'salary record'],
      action: () => { window.navigate('salary'); setTimeout(() => { if (typeof window.renderAddSal === 'function') window.renderAddSal(); }, 160); }
    },
    {
      id: 'action-checkin-today',
      type: 'action',
      group: 'Fast Actions',
      icon: '🚪',
      title: 'Today’s Check-ins (Arrivals)',
      sub: 'Guests arriving today across all luxury villas and apartments',
      keywords: ['checkin', 'check-in', 'arrivals', 'today arrivals', 'aaj ke guest', 'aane wale', 'today checkin'],
      action: () => { window.navigate('bookings'); setTimeout(() => { if (window.setBookingTab) window.setBookingTab('today'); }, 150); }
    },
    {
      id: 'action-checkout-today',
      type: 'action',
      group: 'Fast Actions',
      icon: '🛫',
      title: 'Today’s Check-outs (Departures)',
      sub: 'Guests leaving today, turnaround alerts & bill settlements',
      keywords: ['checkout', 'check-out', 'departures', 'leaving', 'jane wale', 'today checkout'],
      action: () => { window.navigate('bookings'); setTimeout(() => { if (window.setBookingTab) window.setBookingTab('departures'); }, 150); }
    },
    {
      id: 'action-unpaid',
      type: 'action',
      group: 'Fast Actions',
      icon: '⚠️',
      title: 'Unpaid & Balance Due Bookings',
      sub: 'Reservations with pending balance payment or unpaid dues',
      keywords: ['unpaid', 'balance due', 'pending payment', 'due amount', 'baki', 'udhar guest', 'dues'],
      action: () => { window.navigate('bookings'); setTimeout(() => { if (window.setBookingTab) window.setBookingTab('unpaid'); }, 150); }
    },
    {
      id: 'action-security-deposits',
      type: 'action',
      group: 'Fast Actions',
      icon: '🛡️',
      title: 'Security Deposits & Advance Refunds',
      sub: 'Manage guest caution deposits, deduction logs & UPI refunds',
      keywords: ['security deposit', 'deposit', 'advance refund', 'caution money', 'guest deposit', 'wapas', 'refund'],
      action: () => { if (typeof window.showAllSecurityDeposits === 'function') window.showAllSecurityDeposits(); else window.navigate('bookings'); }
    },
    {
      id: 'action-shortcuts',
      type: 'action',
      group: 'Fast Actions',
      icon: '⌨️',
      title: 'Keyboard Shortcuts Help (?)',
      sub: 'View all keyboard shortcuts and fast keys [?]',
      keywords: ['shortcuts', 'keys', 'keyboard', 'help', 'fast keys', 'command', 'cheatsheet', '?'],
      action: () => window.openShortcutsModal()
    }
  ];

  // Backwards compatibility alias
  const SYSTEM_COMMANDS = PMS_MENU_DIRECTORY;

  // ─── 2. Properties Directory ───
  const PROPERTIES_LIST = [
    {
      id: '101', roomId: 'VIL-108', unitNo: '101',
      name: 'Pink Paradise Villa (101)', nickname: 'Pink Paradise',
      aliases: ['pink paradise villa', 'pink paradise', 'paradise villa', 'पिंक पैराडाइज', 'पिंक पैराडाइज़', 'पिंक पैराडाइस', 'पिंक विला', 'गुलाबी विला', 'गुलाबी पैराडाइज', '101', 'vil-108']
    },
    {
      id: '102', roomId: 'VIL-105', unitNo: '102',
      name: 'The Yellow House (102)', nickname: 'Yellow House',
      aliases: ['the yellow house', 'yellow house', 'yellow', 'येलो हाउस', 'येलो', 'द येलो हाउस', 'पीला घर', 'पीला हाउस', 'पीला', 'peela house', 'peela', '102', 'vil-105']
    },
    {
      id: '103', roomId: 'VIL-106', unitNo: '103',
      name: 'Green Forest View (103)', nickname: 'Green Forest',
      aliases: ['green forest view', 'green forest', 'forest view', 'forest', 'ग्रीन फॉरेस्ट', 'ग्रीन फारेस्ट', 'ग्रीन व्यू', 'हरा जंगल', '103', 'vil-106']
    },
    {
      id: '104', roomId: 'LUL-402', unitNo: '104',
      name: 'Celebrity Garden (104)', nickname: 'Celebrity Garden',
      aliases: ['celebrity garden', 'celebrity', 'garden villa', 'सेलिब्रिटी गार्डन', 'सेलिब्रिटी', 'सेलेब्रिटी', '104', 'lul-402']
    },
    {
      id: '105', roomId: 'GOM-302', unitNo: '105',
      name: 'The Unique 3BHK (105)', nickname: 'Unique 3BHK',
      aliases: ['the unique 3bhk', 'the unique', 'unique 3bhk', 'unique', 'द यूनिक', 'यूनिक', '105', 'gom-302']
    },
    {
      id: '106', roomId: 'GOM-301', unitNo: '106',
      name: 'The Light Green (106)', nickname: 'Light Green',
      aliases: ['the light green', 'light green', 'लाइट ग्रीन', 'हल्का हरा', '106', 'gom-301']
    },
    {
      id: '107', roomId: 'GOM-501', unitNo: '107',
      name: 'Starlight Blue Penthouse (107)', nickname: 'Starlight Blue',
      aliases: ['starlight blue penthouse', 'starlight blue', 'starlight', 'blue penthouse', 'penthouse', 'स्टारलाइट ब्लू', 'स्टारलाइट', 'ब्लू पेंटहाउस', 'पेंटहाउस', 'नीला पेंटहाउस', '107', 'gom-501']
    },
    {
      id: '108', roomId: 'GOM-102', unitNo: '108',
      name: 'Black Beauty (108)', nickname: 'Black Beauty',
      aliases: ['black beauty', 'black', 'ब्लैक ब्यूटी', 'ब्लैक', 'काला ब्यूटी', 'काला', '108', 'gom-102']
    },
    {
      id: '109', roomId: 'GOM-401', unitNo: '109',
      name: 'The Nawabi Stay (109)', nickname: 'Nawabi Stay',
      aliases: ['the nawabi stay', 'nawabi stay', 'nawabi', 'द नवाबी स्टे', 'नवाबी स्टे', 'नवाबी', '109', 'gom-401']
    },
    {
      id: '110', roomId: 'VIL-101', unitNo: '110',
      name: 'Gomti Grand Villa (110)', nickname: 'Gomti Grand Villa',
      aliases: ['gomti grand villa', 'gomti grand', 'grand villa', 'gomti villa', 'गोमती ग्रैंड विला', 'गोमती ग्रैंड', 'ग्रैंड विला', 'गोमती विला', '110', 'vil-101']
    },
    {
      id: '111', roomId: 'VIL-104', unitNo: '111',
      name: 'The Green House (111)', nickname: 'Green House',
      aliases: ['the green house', 'green house', 'द ग्रीन हाउस', 'ग्रीन हाउस', 'हरा घर', 'हरा हाउस', 'हरा', '111', 'vil-104']
    },
    {
      id: '112', roomId: 'VIL-103', unitNo: '112',
      name: 'The Pink House (112)', nickname: 'Pink House',
      aliases: ['the pink house', 'pink house', 'द पिंक हाउस', 'पिंक हाउस', 'गुलाबी घर', 'गुलाबी हाउस', 'गुलाबी', 'पिंक', '112', 'vil-103']
    },
    {
      id: '113', roomId: 'GOM-202', unitNo: '113',
      name: 'The Brown Flat (113)', nickname: 'Brown Flat',
      aliases: ['the brown flat', 'the brown', 'brown flat', 'brown', 'द ब्राउन फ्लैट', 'द ब्राउन', 'ब्राउन फ्लैट', 'ब्राउन', '113', 'gom-202']
    },
    {
      id: '114', roomId: 'VIL-107', unitNo: '114',
      name: 'The Velvet House (114)', nickname: 'Velvet House',
      aliases: ['the velvet house', 'velvet house', 'velvet', 'द वेलवेट हाउस', 'वेलवेट हाउस', 'वेलवेट', '114', 'vil-107']
    },
    {
      id: '115', roomId: 'VIL-102', unitNo: '115',
      name: 'Royal White House (115)', nickname: 'Royal White',
      aliases: ['royal white house', 'royal white', 'white house', 'royal villa', 'रॉयल व्हाइट हाउस', 'रॉयल व्हाइट', 'व्हाइट हाउस', 'सफेद कोठी', 'सफेद घर', 'सफेद हाउस', 'सफेद', '115', 'vil-102']
    },
    {
      id: '116', roomId: 'GOM-201', unitNo: '116',
      name: 'The Dark Blue (116)', nickname: 'Dark Blue',
      aliases: ['the dark blue', 'dark blue', 'द डार्क ब्लू', 'डार्क ब्लू', 'गहरा नीला', 'नीला', '116', 'gom-201']
    },
    {
      id: '117', roomId: 'GOM-101', unitNo: '117',
      name: 'RedRose Palace (117)', nickname: 'RedRose Palace',
      aliases: ['redrose palace', 'redrose', 'red rose', 'the red', 'red', 'रेडरोज़ पैलेस', 'रेडरोज़', 'रेड रोज', 'रेड रोज़', 'रेड', 'हेरेड', 'द रेड', 'ह रेड', 'दे रेड', 'लाल घर', 'लाल पैलेस', 'लाल रोज', 'लाल', '117', 'gom-101']
    }
  ];

  // ─── 3. State Management ───
  let _selectedIndex = 0;
  let _currentResults = [];

  // ─── 4. Command Palette Modal ───
  window.openCommandPalette = function(initialQuery = '') {
    let el = document.getElementById('cmdPaletteBackdrop');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cmdPaletteBackdrop';
      el.className = 'cmd-palette-backdrop';
      el.onclick = (e) => { if (e.target === el) closeCommandPalette(); };
      document.body.appendChild(el);
    }

    el.innerHTML = `
      <div class="cmd-palette-box" onclick="event.stopPropagation()">
        <div class="cmd-palette-header">
          <span style="font-size:18px;color:#94A3B8;">🔍</span>
          <input type="text" id="cmdPaletteInput" class="cmd-palette-input" placeholder="Search menu, pages or actions (e.g. Investors, Expenses, Laundry)..." autocomplete="off" />
          <span class="cmd-palette-kbd">ESC</span>
        </div>
        <div class="cmd-palette-results" id="cmdPaletteResults"></div>
      </div>
    `;

    el.style.display = 'flex';
    const input = document.getElementById('cmdPaletteInput');
    if (input) {
      if (initialQuery) input.value = initialQuery;
      input.focus();
      input.oninput = () => renderPaletteResults(input.value);
      input.onkeydown = handlePaletteKeydown;
    }

    renderPaletteResults(initialQuery || '');
  };

  function closeCommandPalette() {
    const el = document.getElementById('cmdPaletteBackdrop');
    if (el) el.style.display = 'none';
  }
  window.closeCommandPalette = closeCommandPalette;

  // ─── 4B. Global Keyboard Shortcuts Actions ───
  window.openNewBookingShortcut = function() {
    if (typeof window.renderAddBooking === 'function') {
      window.renderAddBooking();
    } else if (typeof window.navigate === 'function') {
      window.navigate('bookings');
      setTimeout(() => {
        if (typeof window.renderAddBooking === 'function') window.renderAddBooking();
      }, 200);
    }
  };

  // ─── 4A. Helper: Find Currently Open / Active Booking ───
  function getCurrentlyActiveBookingId() {
    // 1. Check slide-over drawer (smart-bookings / calendar)
    const drawerEl = document.querySelector('#sbkDrawerContainer .sbk-drawer');
    if (drawerEl) {
      if (window._currentDrawerBooking?.booking_id) return String(window._currentDrawerBooking.booking_id);
      if (window._currentDrawerBookingId) return String(window._currentDrawerBookingId);
      if (window._sbkState?.drawerBookingId) return String(window._sbkState.drawerBookingId);

      // Extract from Duplicate button inside drawer
      const dupeBtn = drawerEl.querySelector('[onclick*="drawerDuplicateBooking"], [onclick*="duplicateBooking"]');
      if (dupeBtn) {
        const m = dupeBtn.getAttribute('onclick')?.match(/(?:drawerDuplicateBooking|duplicateBooking)\(['"]([^'"]+)['"]\)/);
        if (m && m[1]) return m[1];
      }

      // Extract from Payment button inside drawer
      const payBtn = drawerEl.querySelector('[onclick*="showPaymentModal"], [onclick*="openAddPaymentModal"]');
      if (payBtn) {
        const m = payBtn.getAttribute('onclick')?.match(/(?:showPaymentModal|openAddPaymentModal)\(['"]([^'"]+)['"]\)/);
        if (m && m[1]) return m[1];
      }

      // Extract reference string (e.g. B1791968864128)
      const refMatch = drawerEl.innerText.match(/\bB\d{10,}\b/);
      if (refMatch) return refMatch[0];
    }

    // 2. Check open modal overlays
    const modals = Array.from(document.querySelectorAll('.modal-overlay')).filter(m => 
      m.id !== 'uhhShortcutsModal' && m.id !== 'uhhDupePickerModal' && m.id !== 'uhhQuickPayPickerModal'
    );
    for (const m of modals) {
      const dupeBtn = m.querySelector('[onclick*="duplicateBooking"]');
      if (dupeBtn) {
        const match = dupeBtn.getAttribute('onclick')?.match(/duplicateBooking\(['"]([^'"]+)['"]\)/);
        if (match && match[1]) return match[1];
      }
      const payBtn = m.querySelector('[onclick*="showPaymentModal"], [onclick*="openAddPaymentModal"]');
      if (payBtn) {
        const match = payBtn.getAttribute('onclick')?.match(/(?:showPaymentModal|openAddPaymentModal)\(['"]([^'"]+)['"]\)/);
        if (match && match[1]) return match[1];
      }
      const bIdInput = m.querySelector('#bookingIdField, [name="booking_id"], [data-booking-id]');
      if (bIdInput) {
        const val = bIdInput.value || bIdInput.getAttribute('data-booking-id');
        if (val) return String(val);
      }
      const ref = m.innerText.match(/\bB\d{10,}\b/);
      if (ref) return ref[0];
    }

    // 3. Check memory & state variables
    if (window._activeReceiptData?.booking?.booking_id) return String(window._activeReceiptData.booking.booking_id);
    if (window._activeSingleReceiptData?.booking?.booking_id) return String(window._activeSingleReceiptData.booking.booking_id);
    if (window._activeMultiReceiptData?.primaryBooking?.booking_id) return String(window._activeMultiReceiptData.primaryBooking.booking_id);
    if (window._activeMultiReceiptData?.bookings?.[0]?.booking_id) return String(window._activeMultiReceiptData.bookings[0].booking_id);
    if (window._currentDrawerBooking?.booking_id) return String(window._currentDrawerBooking.booking_id);
    if (window._currentDrawerBookingId) return String(window._currentDrawerBookingId);
    if (window._activeBookingId) return String(window._activeBookingId);
    if (window._currentOpenBookingId) return String(window._currentOpenBookingId);

    return null;
  }
  window.getCurrentlyActiveBookingId = getCurrentlyActiveBookingId;

  // 🔄 Duplicate Existing Booking Shortcut (Alt+D / D)
  window.duplicateExistingBookingShortcut = async function(bookingId) {
    const activeBkId = bookingId || getCurrentlyActiveBookingId();

    if (activeBkId && typeof window.duplicateBooking === 'function') {
      // 1. Close slide-over drawer if open
      if (typeof window.closeBookingDrawer === 'function') {
        window.closeBookingDrawer();
      }

      // 2. Close open modal overlays
      document.querySelectorAll('.modal-overlay').forEach(m => {
        if (m.id !== 'uhhShortcutsModal' && m.id !== 'uhhDupePickerModal' && m.id !== 'uhhQuickPayPickerModal') m.remove();
      });

      // 3. Keep SESSION in sync
      if (typeof SESSION !== 'undefined') {
        SESSION.currentPage = 'bookings';
      }
      if (window.location.hash !== '#bookings') {
        try { history.replaceState(null, '', '#bookings'); } catch(e) {}
      }

      // 4. Duplicate the booking
      window.duplicateBooking(activeBkId);
      return;
    }

    // Otherwise show the duplicate picker modal
    window.openDuplicateBookingPickerModal();
  };

  // 💵 Quick Payment / Add Payment Shortcut (Alt+P / P)
  window.openQuickPaymentShortcut = async function(bookingId) {
    const activeBkId = bookingId || getCurrentlyActiveBookingId();

    if (activeBkId) {
      if (typeof window.showPaymentModal === 'function') {
        window.showPaymentModal(activeBkId);
        return;
      } else if (typeof window.openAddPaymentModal === 'function') {
        window.openAddPaymentModal(activeBkId);
        return;
      }
    }

    // Otherwise show the quick payment picker modal
    window.openQuickPaymentPickerModal();
  };

  // ─── 4C. Quick Payment Picker Modal ───
  window.openQuickPaymentPickerModal = async function() {
    let oldModal = document.getElementById('uhhQuickPayPickerModal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'uhhQuickPayPickerModal';
    modal.style.zIndex = '999999';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    modal.innerHTML = `
      <div class="modal-box" style="max-width:680px;width:95%;padding:22px;border-radius:16px;background:#0F172A;color:#fff;box-shadow:0 25px 60px -12px rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.1);max-height:85vh;display:flex;flex-direction:column;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.1);">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:24px;">💵</span>
            <div>
              <div style="font-weight:900;font-size:16.5px;color:#F8FAFC;">Add Payment / Quick Collect (Alt+P)</div>
              <div style="font-size:11.5px;color:#94A3B8;">1-Click record payment, UPI dues or collect outstanding balances</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <button type="button" class="btn-sm" style="background:#059669;color:#fff;border:none;padding:5px 12px;border-radius:8px;font-size:11.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;" onclick="document.getElementById('uhhQuickPayPickerModal')?.remove(); if(window.openCustomPaymentQRModal) window.openCustomPaymentQRModal();">
              ⚡ Instant QR Pay
            </button>
            <button type="button" onclick="this.closest('.modal-overlay').remove()" style="width:32px;height:32px;border-radius:50%;background:#EF4444;border:none;color:#fff;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
          <input type="text" id="quickPaySearchInput" placeholder="🔍 Search guest name, phone, room, or booking ID..." style="flex:1;min-width:220px;box-sizing:border-box;background:#1E293B;border:1.5px solid #334155;color:#fff;border-radius:10px;padding:10px 14px;font-size:13px;outline:none;" />
          <div style="display:flex;gap:4px;">
            <button type="button" id="payFilterUnpaid" class="btn-sm" style="background:#3B82F6;color:#fff;border:none;padding:6px 12px;border-radius:8px;font-size:11.5px;font-weight:700;cursor:pointer;">Pending Dues</button>
            <button type="button" id="payFilterAll" class="btn-sm" style="background:#1E293B;color:#94A3B8;border:1px solid #334155;padding:6px 12px;border-radius:8px;font-size:11.5px;font-weight:700;cursor:pointer;">All Stays</button>
          </div>
        </div>

        <div id="quickPayBookingsList" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-right:4px;">
          <div style="text-align:center;padding:24px;color:#94A3B8;">⏳ Loading guest payment balances...</div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const input = document.getElementById('quickPaySearchInput');
    if (input) input.focus();

    let bookings = [];
    let paidMap = window._bkPaidMap || window._sbkState?.cachedPaidMap || {};

    try {
      if (window.sb) {
        const { data: bks } = await window.sb.from('guest_register')
          .select('booking_id, guest_name, phone, room_id, check_in, check_out, total_amount, rooms(nickname, property_name, unit_no)')
          .neq('is_cancelled', true)
          .order('check_in', { ascending: false })
          .limit(40);
        bookings = bks || [];

        // If paidMap is empty, fetch recent payments
        if (Object.keys(paidMap).length === 0 && bookings.length > 0) {
          const bkIds = bookings.map(x => x.booking_id);
          const { data: pays } = await window.sb.from('payment_history')
            .select('booking_id, amount, verification_status')
            .in('booking_id', bkIds);
          paidMap = {};
          (pays || []).forEach(p => {
            if (p.verification_status !== 'rejected') {
              paidMap[p.booking_id] = (paidMap[p.booking_id] || 0) + (p.amount || 0);
            }
          });
        }
      }
    } catch(e) {
      console.warn('Could not load bookings for quick payment picker:', e);
      bookings = window._rawBookingsList || [];
    }

    let currentFilter = 'unpaid';

    function renderPayList() {
      const listEl = document.getElementById('quickPayBookingsList');
      if (!listEl) return;
      const q = (input?.value || '').toLowerCase().trim();

      let filtered = (bookings || []).filter(b => {
        const tot = b.total_amount || 0;
        const pd = paidMap[b.booking_id] || 0;
        const due = tot - pd;
        if (currentFilter === 'unpaid' && due <= 0) return false;

        if (!q) return true;
        const name = (b.guest_name || '').toLowerCase();
        const rid = (b.room_id || '').toLowerCase();
        const prop = (b.rooms?.nickname || b.rooms?.property_name || '').toLowerCase();
        const bid = (b.booking_id || '').toLowerCase();
        const phoneMatched = (window.matchPhoneSearch && window.matchPhoneSearch(q, b.phone)) || (b.phone || '').includes(q);
        return name.includes(q) || phoneMatched || rid.includes(q) || prop.includes(q) || bid.includes(q);
      });

      // Sort: bookings with highest positive due balance first
      filtered.sort((a, b) => {
        const dueA = (a.total_amount || 0) - (paidMap[a.booking_id] || 0);
        const dueB = (b.total_amount || 0) - (paidMap[b.booking_id] || 0);
        return dueB - dueA;
      });

      if (!filtered.length) {
        listEl.innerHTML = `
          <div style="text-align:center;padding:28px 16px;color:#94A3B8;font-size:13px;">
            ${currentFilter === 'unpaid' ? '🎉 No pending dues found in recent bookings!' : 'No matching bookings found.'}
          </div>
        `;
        return;
      }

      listEl.innerHTML = filtered.slice(0, 25).map(b => {
        const prop = b.rooms?.nickname || b.rooms?.property_name || b.room_id || 'Room';
        const unit = b.rooms?.unit_no ? ` (${b.rooms.unit_no})` : '';
        const tot = b.total_amount || 0;
        const pd = paidMap[b.booking_id] || 0;
        const due = tot - pd;
        const isDue = due > 0;

        return `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:11px 14px;background:#1E293B;border:1px solid #334155;border-radius:10px;gap:12px;">
            <div style="min-width:0;flex:1;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span style="font-weight:800;font-size:14px;color:#F8FAFC;">${escapeHtml(b.guest_name || 'Guest')}</span>
                <span style="font-size:11px;color:#38BDF8;font-weight:700;">${escapeHtml(prop)}${escapeHtml(unit)}</span>
                ${isDue ? `
                  <span style="font-size:10.5px;font-weight:800;background:rgba(239,68,68,0.2);color:#FCA5A5;border:1px solid rgba(239,68,68,0.4);padding:2px 7px;border-radius:6px;">
                    Due: ₹${Math.round(due).toLocaleString('en-IN')}
                  </span>
                ` : `
                  <span style="font-size:10.5px;font-weight:800;background:rgba(16,185,129,0.2);color:#6EE7B7;border:1px solid rgba(16,185,129,0.4);padding:2px 7px;border-radius:6px;">
                    ✅ Fully Paid
                  </span>
                `}
              </div>
              <div style="font-size:11px;color:#94A3B8;margin-top:3px;">
                📅 ${b.check_in || '-'} → ${b.check_out || '-'} · 📱 ${b.phone || 'No phone'} · Total: ₹${tot.toLocaleString('en-IN')} · Paid: ₹${pd.toLocaleString('en-IN')}
              </div>
            </div>
            <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
              <button type="button" class="btn-sm" style="background:#10B981;color:#fff;border:none;padding:7px 13px;border-radius:8px;font-weight:800;cursor:pointer;font-size:12px;box-shadow:0 2px 8px rgba(16,185,129,0.35);"
                onclick="document.getElementById('uhhQuickPayPickerModal')?.remove(); if(window.showPaymentModal) window.showPaymentModal('${b.booking_id}'); else if(window.openAddPaymentModal) window.openAddPaymentModal('${b.booking_id}');">
                💵 Add Payment
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    renderPayList();

    if (input) {
      input.oninput = () => renderPayList();
    }

    const btnUnpaid = document.getElementById('payFilterUnpaid');
    const btnAll = document.getElementById('payFilterAll');
    if (btnUnpaid && btnAll) {
      btnUnpaid.onclick = () => {
        currentFilter = 'unpaid';
        btnUnpaid.style.background = '#3B82F6'; btnUnpaid.style.color = '#fff'; btnUnpaid.style.border = 'none';
        btnAll.style.background = '#1E293B'; btnAll.style.color = '#94A3B8'; btnAll.style.border = '1px solid #334155';
        renderPayList();
      };
      btnAll.onclick = () => {
        currentFilter = 'all';
        btnAll.style.background = '#3B82F6'; btnAll.style.color = '#fff'; btnAll.style.border = 'none';
        btnUnpaid.style.background = '#1E293B'; btnUnpaid.style.color = '#94A3B8'; btnUnpaid.style.border = '1px solid #334155';
        renderPayList();
      };
    }
  };

  // Quick picker modal for duplicating a booking when none is active
  window.openDuplicateBookingPickerModal = async function() {
    let oldModal = document.getElementById('uhhDupePickerModal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'uhhDupePickerModal';
    modal.style.zIndex = '999999';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    modal.innerHTML = `
      <div class="modal-box" style="max-width:620px;width:95%;padding:22px;border-radius:16px;background:#0F172A;color:#fff;box-shadow:0 25px 60px -12px rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.1);max-height:85vh;display:flex;flex-direction:column;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.1);">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:24px;">📋</span>
            <div>
              <div style="font-weight:900;font-size:16.5px;color:#F8FAFC;">Duplicate / Clone Existing Booking</div>
              <div style="font-size:11.5px;color:#94A3B8;">1-Click duplicate with guest details, ID proof &amp; photos pre-filled</div>
            </div>
          </div>
          <button type="button" onclick="this.closest('.modal-overlay').remove()" style="width:32px;height:32px;border-radius:50%;background:#EF4444;border:none;color:#fff;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
        </div>

        <div style="margin-bottom:12px;">
          <input type="text" id="dupeSearchInput" placeholder="🔍 Search by guest name, phone, or property..." style="width:100%;box-sizing:border-box;background:#1E293B;border:1.5px solid #334155;color:#fff;border-radius:10px;padding:10px 14px;font-size:13px;outline:none;" />
        </div>

        <div id="dupeBookingsList" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-right:4px;">
          <div style="text-align:center;padding:20px;color:#94A3B8;">⏳ Loading recent bookings...</div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const input = document.getElementById('dupeSearchInput');
    if (input) input.focus();

    // Load bookings from cache or Supabase
    let bookings = window._rawBookingsList || [];
    if (!bookings.length && window.sb) {
      try {
        const { data } = await window.sb.from('guest_register')
          .select('booking_id, guest_name, phone, room_id, check_in, check_out, total_amount, rooms(nickname, property_name, unit_no)')
          .neq('is_cancelled', true)
          .order('check_in', { ascending: false })
          .limit(30);
        bookings = data || [];
      } catch(e) {
        console.warn('Could not fetch bookings for duplicate picker:', e);
      }
    }

    function renderList(query = '') {
      const listEl = document.getElementById('dupeBookingsList');
      if (!listEl) return;
      const q = query.toLowerCase().trim();
      const filtered = (bookings || []).filter(b => {
        if (!q) return true;
        const name = (b.guest_name || '').toLowerCase();
        const rid = (b.room_id || '').toLowerCase();
        const prop = (b.rooms?.nickname || b.rooms?.property_name || '').toLowerCase();
        const phoneMatched = (window.matchPhoneSearch && window.matchPhoneSearch(q, b.phone)) || (b.phone || '').includes(q);
        return name.includes(q) || phoneMatched || rid.includes(q) || prop.includes(q) || (b.booking_id || '').toLowerCase().includes(q);
      }).slice(0, 20);

      if (!filtered.length) {
        listEl.innerHTML = '<div style="text-align:center;padding:20px;color:#94A3B8;">No matching bookings found.</div>';
        return;
      }

      listEl.innerHTML = filtered.map(b => {
        const prop = b.rooms?.nickname || b.rooms?.property_name || b.room_id || 'Homestay';
        const unit = b.rooms?.unit_no ? ` (${b.rooms.unit_no})` : '';
        return `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#1E293B;border:1px solid #334155;border-radius:10px;gap:10px;">
            <div style="min-width:0;flex:1;">
              <div style="font-weight:800;font-size:13.5px;color:#F8FAFC;">
                ${escapeHtml(b.guest_name || 'Guest')}
                <span style="font-size:11px;color:#38BDF8;font-weight:700;margin-left:6px;">${escapeHtml(prop)}${escapeHtml(unit)}</span>
              </div>
              <div style="font-size:11px;color:#94A3B8;margin-top:2px;">
                📅 ${b.check_in || '-'} → ${b.check_out || '-'} · 📱 ${b.phone || 'No phone'} · ID: <code style="color:#C7D2FE;">${b.booking_id}</code>
              </div>
            </div>
            <button type="button" class="btn-sm" style="background:#6366F1;color:#fff;border:none;padding:7px 14px;border-radius:8px;font-weight:800;cursor:pointer;white-space:nowrap;font-size:12px;box-shadow:0 2px 8px rgba(99,102,241,0.35);"
              onclick="document.getElementById('uhhDupePickerModal')?.remove(); if(window.duplicateBooking) window.duplicateBooking('${b.booking_id}');">
              📋 Duplicate
            </button>
          </div>
        `;
      }).join('');
    }

    renderList('');
    if (input) {
      input.oninput = (e) => renderList(e.target.value);
    }
  };

  window.openCalendarShortcut = function() {
    if (typeof window.navigate === 'function') {
      window.navigate('calendar');
    }
  };

  window.openBookingsShortcut = function() {
    if (typeof SESSION !== 'undefined') {
      SESSION.bookingPayFilter = '';
    }
    if (typeof window.navigate === 'function') {
      window.navigate('bookings');
    }
    setTimeout(() => {
      const sel = document.getElementById('fPayStatus');
      if (sel && sel.value === 'duplicates') {
        sel.value = '';
        sel.dispatchEvent(new Event('change'));
      }
    }, 150);
  };

  window.openFlatsShortcut = function() {
    if (window.setFlatsViewMode) window.setFlatsViewMode('kanban');
    if (typeof window.navigate === 'function') {
      window.navigate('flats');
    }
  };

  window.openDailyReportShortcut = function() {
    if (typeof window.navigate === 'function') {
      window.navigate('daily-report');
    }
  };

  window.openCashBookShortcut = function() {
    if (typeof window.navigate === 'function') {
      window.navigate('cashbook');
    }
  };

  window.openTasksShortcut = function() {
    if (typeof window.navigate === 'function') {
      window.navigate('tasks');
    }
  };

  window.openNewTaskShortcut = function() {
    if (typeof window.navigate === 'function') {
      window.navigate('tasks');
      setTimeout(() => {
        if (typeof window.renderAddTask === 'function') window.renderAddTask();
      }, 180);
    }
  };

  window.openAdvanceShortcut = function() {
    if (typeof window.navigate === 'function') {
      window.navigate('advance');
    }
  };

  window.openNewAdvanceShortcut = function() {
    if (typeof window.navigate === 'function') {
      window.navigate('advance');
      setTimeout(() => {
        if (typeof window.renderAddAdv === 'function') window.renderAddAdv();
      }, 180);
    }
  };

  window.openClaimShortcut = function() {
    if (typeof window.navigate === 'function') {
      const page = (window.SESSION?.role === 'employee') ? 'emp-expenses' : 'reimbursements';
      window.navigate(page);
    }
  };

  window.openInvestorsShortcut = function() {
    if (typeof window.navigate === 'function') {
      window.navigate('investors');
    }
  };

  window.openLaundryShortcut = function() {
    if (typeof window.navigate === 'function') {
      window.navigate('laundry');
    }
  };

  window.openNewClaimShortcut = function() {
    if (typeof window.navigate === 'function') {
      const isEmp = window.SESSION?.role === 'employee';
      if (isEmp) {
        window.navigate('emp-expenses');
        setTimeout(() => {
          if (typeof window.renderAddEmpExpense === 'function') window.renderAddEmpExpense();
        }, 180);
      } else {
        window.navigate('reimbursements');
        setTimeout(() => {
          if (typeof window.renderAddReimbursement === 'function') window.renderAddReimbursement();
        }, 180);
      }
    }
  };

  window.openShortcutsModal = function() {
    let el = document.getElementById('uhhShortcutsModal');
    if (el) { el.remove(); return; }

    const isApple = navigator.platform.toUpperCase().indexOf('MAC') >= 0 || /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const altSymbol = isApple ? '⌥' : 'Alt+';
    const cmdSymbol = isApple ? '⌘' : 'Ctrl+';

    el = document.createElement('div');
    el.id = 'uhhShortcutsModal';
    el.className = 'modal-overlay';
    el.style.zIndex = '999999';
    el.onclick = (e) => { if (e.target === el) el.remove(); };

    el.innerHTML = `
      <div class="modal-box" style="max-width:540px;width:95%;padding:22px;border-radius:16px;background:#0F172A;color:#fff;box-shadow:0 25px 50px -12px rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.1);position:relative;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.1);">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:24px;">⚡</span>
            <div>
              <div style="font-weight:900;font-size:16.5px;color:#F8FAFC;">PMS Keyboard Shortcuts</div>
              <div style="font-size:11px;color:#94A3B8;">Fast navigation & high-speed booking controls</div>
            </div>
          </div>
          <button type="button" class="modal-close-prominent" aria-label="Close" onclick="this.closest('.modal-overlay').remove()" style="width:32px;height:32px;border-radius:50%;background:#EF4444;border:none;color:#fff;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(239,68,68,0.4);">✕</button>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;max-height:60vh;overflow-y:auto;padding-right:4px;">
          ${[
            { key: 'E', single: 'E', label: '✏️ Edit Selected Booking', desc: 'When booking drawer/details is open, press E to edit', action: 'if(window.editCurrentSelectedBooking) window.editCurrentSelectedBooking()' },
            { key: `${cmdSymbol}S`, single: 'S', label: '💾 Save Booking Form', desc: 'Save active booking or wizard form instantly', action: 'if(window.triggerSaveBookingShortcut) window.triggerSaveBookingShortcut()' },
            { key: `${altSymbol}N`, single: 'N', label: '➕ New Booking', desc: 'Open manual booking creation wizard', action: 'window.openNewBookingShortcut()' },
            { key: `${altSymbol}D`, single: 'D', label: '📋 Duplicate Booking', desc: 'Clone active booking or pick recent guest to rebook', action: 'window.duplicateExistingBookingShortcut()' },
            { key: `${altSymbol}P`, single: 'P', label: '💵 Add Payment / Quick Pay', desc: 'Open payment popup for active booking or dues picker', action: 'window.openQuickPaymentShortcut()' },
            { key: `${altSymbol}T`, single: 'T', label: '📋 Staff Tasks & Checklists', desc: 'Housekeeping, deep cleans & staff duties (Alt+Shift+T for new)', action: 'window.openTasksShortcut()' },
            { key: `${altSymbol}A`, single: 'A', label: '💸 Staff Advances Tracker', desc: 'Track employee loans, peshgi & balances (Alt+Shift+A for new)', action: 'window.openAdvanceShortcut()' },
            { key: `${altSymbol}E`, single: 'Alt+E', label: '🧾 Expense Claims & Reimbursements', desc: 'Staff daily market purchases & claims (Alt+Shift+E for new)', action: 'window.openClaimShortcut()' },
            { key: `${altSymbol}C`, single: 'C', label: '📅 Calendar View', desc: 'Open multi-property occupancy grid', action: 'window.openCalendarShortcut()' },
            { key: `${altSymbol}B`, single: 'B', label: '📑 Smart Bookings', desc: 'View all reservations & guests register', action: 'window.openBookingsShortcut()' },
            { key: `${altSymbol}F`, single: 'F', label: '🛏️ Flats & Turnaround', desc: 'Realtime room turnaround Kanban board', action: 'window.openFlatsShortcut()' },
            { key: `${altSymbol}I`, single: 'I', label: '🧑‍💼 Investors Hub', desc: 'Open Investors list, shares, payout sheets & broadcasts', action: 'window.openInvestorsShortcut()' },
            { key: `${altSymbol}L`, single: 'L', label: '🧺 Laundry Tracker', desc: 'Track linens, vendors, wash cycles & laundry dues', action: 'window.openLaundryShortcut()' },
            { key: `${cmdSymbol}K`, single: '/', label: '🔍 Command Palette', desc: 'Spotlight search anything across PMS (Tasks, Advances, Claims, etc.)', action: 'window.openCommandPalette()' },
            { key: '?', single: '?', label: '⚡ Shortcuts Help', desc: 'Open this keyboard cheatsheet modal', action: '' },
            { key: 'ESC', single: 'Esc', label: '✕ Close Drawer / Dialog', desc: 'Dismiss active booking drawer or any open modal', action: '' }
          ].map(s => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 12px;background:rgba(255,255,255,0.04);border-radius:10px;border:1px solid rgba(255,255,255,0.06);cursor:${s.action ? 'pointer' : 'default'};transition:all 0.15s;" ${s.action ? `onclick="document.getElementById('uhhShortcutsModal')?.remove();${s.action}" onmouseenter="this.style.background='rgba(255,255,255,0.09)'" onmouseleave="this.style.background='rgba(255,255,255,0.04)'"` : ''}>
              <div>
                <div style="font-weight:800;font-size:13px;color:#F1F5F9;">${s.label}</div>
                <div style="font-size:11px;color:#94A3B8;margin-top:2px;">${s.desc}</div>
              </div>
              <div style="display:flex;align-items:center;gap:6px;">
                <kbd style="background:#1E293B;border:1px solid #475569;border-radius:6px;padding:4px 8px;font-size:11.5px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:800;color:#38BDF8;box-shadow:0 2px 0 #0F172A;">${s.key}</kbd>
                ${s.single && s.single !== s.key ? `<span style="font-size:10px;color:#64748B;">or</span> <kbd style="background:#1E293B;border:1px solid #475569;border-radius:6px;padding:4px 7px;font-size:11.5px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:800;color:#F59E0B;box-shadow:0 2px 0 #0F172A;">${s.single}</kbd>` : ''}
              </div>
            </div>
          `).join('')}
        </div>

        <div style="margin-top:14px;padding:9px 12px;background:#1E293B;border-radius:10px;font-size:11.5px;color:#94A3B8;text-align:center;line-height:1.4;">
          💡 <em>Tip: Booking open hone par direct <strong>E</strong> dabayein to Edit Booking khul jayega, aur form me <strong>S</strong> ya <strong>⌘S</strong> dabane par Save ho jayega. Single navigation keys: <strong>I</strong> (Investors), <strong>T</strong>, <strong>A</strong>, <strong>D</strong>, <strong>P</strong>, <strong>N</strong>, <strong>C</strong>, <strong>B</strong>, <strong>F</strong>.</em>
        </div>
      </div>
    `;

    document.body.appendChild(el);
  };

  // Keyboard shortcut listener (Cmd+K / Ctrl+K, Alt+shortcuts, and single-letter navigation)
  window.addEventListener('keydown', (e) => {
    // 1. ESC handler: dismiss picker modal, shortcut modal, command palette, voice modal, OR slide-over booking drawer
    const keyCode = e.keyCode || e.which || 0;
    const code = e.code || '';
    const key = (e.key || '').toLowerCase();

    if (key === 'escape' || key === 'esc' || code === 'Escape' || keyCode === 27) {
      const payModal = document.getElementById('uhhQuickPayPickerModal');
      if (payModal) { payModal.remove(); return; }
      const dupeModal = document.getElementById('uhhDupePickerModal');
      if (dupeModal) { dupeModal.remove(); return; }
      const scModal = document.getElementById('uhhShortcutsModal');
      if (scModal) { scModal.remove(); return; }
      closeCommandPalette();
      closeVoiceBookingModal();

      // If slide-over booking drawer is open, dismiss it smoothly
      const drawerEl = document.querySelector('#sbkDrawerContainer .sbk-drawer');
      if (drawerEl && typeof window.closeBookingDrawer === 'function') {
        window.closeBookingDrawer();
        return;
      }
      return;
    }

    // 2. Cmd+K / Ctrl+K (Command Palette Spotlight on iPad/Mac/PC)
    const isK = code === 'KeyK' || keyCode === 75 || key === 'k';
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && isK) {
      e.preventDefault();
      const el = document.getElementById('cmdPaletteBackdrop');
      if (el && el.style.display === 'flex') closeCommandPalette();
      else window.openCommandPalette();
      return;
    }

    // Never intercept native browser reload / hard reload (Cmd+R, Ctrl+R, Cmd+Shift+R, Ctrl+Shift+R, F5)
    if (((e.metaKey || e.ctrlKey) && (code === 'KeyR' || keyCode === 82 || key === 'r')) || code === 'F5' || keyCode === 116) {
      return;
    }

    // Check if user is typing in a form input, textarea, select, or contenteditable
    const targetTag = (e.target?.tagName || '').toUpperCase();
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag) ||
                     e.target?.isContentEditable ||
                     e.target?.getAttribute('contenteditable') === 'true' ||
                     e.target?.getAttribute('role') === 'textbox';

    // Key matchers compatible across iPadOS Safari, macOS, Windows, Android
    // Note: On iPadOS Safari, Option+N is a Dead key (~), Option+D is ∂, Option+P is π, etc.
    const isKeyN = code === 'KeyN' || keyCode === 78 || key === 'n' || key === 'ñ' || key === '~' || key === '˜' || (key === 'dead' && (code === 'KeyN' || keyCode === 78));
    const isKeyD = code === 'KeyD' || keyCode === 68 || key === 'd' || key === '∂';
    const isKeyP = code === 'KeyP' || keyCode === 80 || key === 'p' || key === 'π';
    const isKeyC = code === 'KeyC' || keyCode === 67 || key === 'c' || key === 'ç';
    const isKeyB = code === 'KeyB' || keyCode === 66 || key === 'b' || key === '∫';
    const isKeyF = code === 'KeyF' || keyCode === 70 || key === 'f' || key === 'ƒ';
    const isKeyR = code === 'KeyR' || keyCode === 82 || key === 'r' || key === '®';
    const isKeyT = code === 'KeyT' || keyCode === 84 || key === 't' || key === '†';
    const isKeyA = code === 'KeyA' || keyCode === 65 || key === 'a' || key === 'å';
    const isKeyE = code === 'KeyE' || keyCode === 69 || key === 'e' || key === '´' || (key === 'dead' && (code === 'KeyE' || keyCode === 69));
    const isKeyS = code === 'KeyS' || keyCode === 83 || key === 's' || key === 'ß';
    const isKeyI = code === 'KeyI' || keyCode === 73 || key === 'i' || key === 'ˆ';
    const isKeyL = code === 'KeyL' || keyCode === 76 || key === 'l' || key === '¬' || key === '@';
    const isKeySlash = code === 'Slash' || keyCode === 191 || key === '/' || key === '?';

    // Global Save Shortcut: Cmd+S / Ctrl+S
    if ((e.metaKey || e.ctrlKey) && isKeyS) {
      e.preventDefault();
      if (typeof window.triggerSaveBookingShortcut === 'function') {
        window.triggerSaveBookingShortcut();
      }
      return;
    }

    // 3. Modifier Combinations (Option/Alt on iPad/Mac OR Cmd+Shift on iPad)
    const isOptionCombo = e.altKey && !e.ctrlKey && !e.metaKey;
    const isCmdShiftCombo = (e.metaKey || e.ctrlKey) && e.shiftKey;

    if (isOptionCombo || isCmdShiftCombo) {
      if (isKeyN) {
        e.preventDefault();
        window.openNewBookingShortcut();
        return;
      }
      if (isKeyD) {
        e.preventDefault();
        window.duplicateExistingBookingShortcut();
        return;
      }
      if (isKeyP) {
        e.preventDefault();
        window.openQuickPaymentShortcut();
        return;
      }
      if (isKeyC) {
        e.preventDefault();
        window.openCalendarShortcut();
        return;
      }
      if (isKeyB) {
        e.preventDefault();
        window.openBookingsShortcut();
        return;
      }
      if (isKeyF) {
        e.preventDefault();
        window.openFlatsShortcut();
        return;
      }
      if (isKeyT) {
        e.preventDefault();
        if (e.shiftKey) window.openNewTaskShortcut();
        else window.openTasksShortcut();
        return;
      }
      if (isKeyA) {
        e.preventDefault();
        if (e.shiftKey) window.openNewAdvanceShortcut();
        else window.openAdvanceShortcut();
        return;
      }
      if (isKeyE) {
        e.preventDefault();
        if (e.shiftKey) window.openNewClaimShortcut();
        else window.openClaimShortcut();
        return;
      }
      if (isKeyI) {
        e.preventDefault();
        window.openInvestorsShortcut();
        return;
      }
      if (isKeyL) {
        e.preventDefault();
        window.openLaundryShortcut();
        return;
      }
      if (isKeySlash) {
        e.preventDefault();
        window.openShortcutsModal();
        return;
      }
    }

    // 4. Single-key shortcuts (Active on iPad Magic Keyboard & PC when NOT typing in an input field)
    if (!isTyping && !e.altKey && !e.ctrlKey && !e.metaKey) {
      // ? (Shift + /) -> Show shortcuts modal
      if (key === '?' || (e.shiftKey && isKeySlash)) {
        e.preventDefault();
        window.openShortcutsModal();
        return;
      }
      // / -> Open Command Palette / Spotlight Search
      if (key === '/' || isKeySlash) {
        e.preventDefault();
        window.openCommandPalette();
        return;
      }
      // e -> Edit Selected Booking (Drawer or open booking)
      if (isKeyE) {
        if (window._currentDrawerBookingId || document.getElementById('sbkDrawerOverlay')) {
          e.preventDefault();
          if (typeof window.editCurrentSelectedBooking === 'function') {
            window.editCurrentSelectedBooking();
          }
          return;
        }
      }
      // s -> Save Booking (when viewing a form/modal)
      if (isKeyS) {
        if (document.getElementById('smartSaveBtn') || document.getElementById('saveBtn') || document.getElementById('btnSaveBookingId')) {
          e.preventDefault();
          if (typeof window.triggerSaveBookingShortcut === 'function') {
            window.triggerSaveBookingShortcut();
          }
          return;
        }
      }
      // n -> New booking
      if (isKeyN) {
        e.preventDefault();
        window.openNewBookingShortcut();
        return;
      }
      // d -> Duplicate booking
      if (isKeyD) {
        e.preventDefault();
        window.duplicateExistingBookingShortcut();
        return;
      }
      // p -> Add Payment / Quick Pay
      if (isKeyP) {
        e.preventDefault();
        window.openQuickPaymentShortcut();
        return;
      }
      // c -> Calendar
      if (isKeyC) {
        e.preventDefault();
        window.openCalendarShortcut();
        return;
      }
      // b -> Bookings
      if (isKeyB) {
        e.preventDefault();
        window.openBookingsShortcut();
        return;
      }
      // f -> Flats
      if (isKeyF) {
        e.preventDefault();
        window.openFlatsShortcut();
        return;
      }
      // t -> Tasks
      if (isKeyT) {
        e.preventDefault();
        if (e.shiftKey) window.openNewTaskShortcut();
        else window.openTasksShortcut();
        return;
      }
      // a -> Advances
      if (isKeyA) {
        e.preventDefault();
        if (e.shiftKey) window.openNewAdvanceShortcut();
        else window.openAdvanceShortcut();
        return;
      }
      // i -> Investors Hub
      if (isKeyI) {
        e.preventDefault();
        window.openInvestorsShortcut();
        return;
      }
      // l -> Laundry Tracker
      if (isKeyL) {
        e.preventDefault();
        window.openLaundryShortcut();
        return;
      }
      // e -> Claims fallback when no booking is selected
      if (isKeyE) {
        e.preventDefault();
        if (e.shiftKey) window.openNewClaimShortcut();
        else window.openClaimShortcut();
        return;
      }
    }
  }, { capture: true });

  // Expose global action helpers for Edit & Save booking shortcuts
  window.editCurrentSelectedBooking = function() {
    const bkId = window._currentDrawerBookingId || window._sbkState?.drawerBookingId;
    if (bkId) {
      if (typeof window.drawerEditBooking === 'function') {
        window.drawerEditBooking(bkId);
      } else if (typeof window.editBooking === 'function') {
        window.editBooking(bkId);
      }
    } else {
      if (window.fsn) fsn.info('No Booking Selected', 'Pehle koi booking card ya drawer select karein, fir "E" dabayein.');
    }
  };

  window.triggerSaveBookingShortcut = function() {
    // 1. Smart Booking wizard save button
    const smartSave = document.getElementById('smartSaveBtn');
    if (smartSave && !smartSave.disabled) {
      smartSave.click();
      return;
    }
    // 2. Standard booking save button
    const standardSave = document.getElementById('saveBtn');
    if (standardSave && !standardSave.disabled) {
      standardSave.click();
      return;
    }
    // 3. Direct booking ID save button
    const idSave = document.getElementById('btnSaveBookingId');
    if (idSave && !idSave.disabled) {
      idSave.click();
      return;
    }
    // Fallback: functions
    if (typeof window.saveSmartBooking === 'function') {
      window.saveSmartBooking();
    } else if (typeof window.saveBooking === 'function') {
      window.saveBooking();
    }
  };

  // ─── 4C. Fast Scoring & Ranking Algorithm for Menu & Page Search ───
  function calcMatchScore(item, q) {
    if (!q) return 0;
    const title = (item.title || '').toLowerCase();
    const sub = (item.sub || '').toLowerCase();
    const pageId = (item.id || item.page || '').toLowerCase();
    const group = (item.group || '').toLowerCase();
    const keywords = (item.keywords || []).map(k => String(k).toLowerCase());

    let score = 0;

    // 1. Exact match on title or page ID
    if (title === q || pageId === q) score += 1000;

    // 2. Exact match on any keyword (e.g. 'inv' strictly matches keyword 'inv')
    if (keywords.includes(q)) score += 900;

    // 3. Title starts with query (e.g. "Investors..." starts with "inv")
    if (title.startsWith(q)) score += 800;

    // 4. Any word in title starts with query (e.g. "Staff Attendance" starts with "att", "Daily Report" starts with "rep")
    const titleWords = title.split(/[\s\-_&/()]+/);
    for (const w of titleWords) {
      if (w.startsWith(q)) {
        score += 700;
        break;
      }
    }

    // 5. Page ID starts with query (e.g. "investors".startsWith("inv"))
    if (pageId.startsWith(q)) score += 650;

    // 6. Keyword starts with query (e.g. "investor".startsWith("inv"))
    for (const kw of keywords) {
      if (kw.startsWith(q)) {
        score += 600;
        break;
      }
      const kwWords = kw.split(/[\s\-_&/()]+/);
      for (const w of kwWords) {
        if (w.startsWith(q)) {
          score += 550;
          break;
        }
      }
    }

    // 7. Group / Hub name starts with query
    if (group.startsWith(q)) score += 400;

    // 8. Subtitle word starts with query
    const subWords = sub.split(/[\s\-_&/()]+/);
    for (const w of subWords) {
      if (w.startsWith(q)) {
        score += 300;
        break;
      }
    }

    // 9. Title contains query as substring
    if (title.includes(q)) score += 200;

    // 10. Keyword contains query as substring (for queries >= 3 chars)
    if (q.length >= 3) {
      for (const kw of keywords) {
        if (kw.includes(q)) {
          score += 100;
          break;
        }
      }
    }

    // 11. Subtitle contains query as substring (for queries >= 3 chars)
    if (q.length >= 3 && sub.includes(q)) score += 50;

    return score;
  }

  // Render & Filter Results (Pure, Instant Menu & Page Search)
  function renderPaletteResults(query) {
    const q = (query || '').toLowerCase().trim();
    const resultsContainer = document.getElementById('cmdPaletteResults');
    if (!resultsContainer) return;

    let items = [];

    // Combine static PMS menu registry with any dynamic tabs in UHHS_HUBS & PAGE_TITLES
    const seenIds = new Set();
    const allMenuCatalog = [];

    PMS_MENU_DIRECTORY.forEach(item => {
      seenIds.add(item.id.toLowerCase());
      allMenuCatalog.push(item);
    });

    // Dynamic index from window._UHHS_HUBS and PAGE_TITLES (if any new custom sub-tab exists)
    const hubs = window._UHHS_HUBS || [];
    hubs.forEach(hub => {
      (hub.tabs || []).forEach(tab => {
        const tabIdLower = (tab.id || '').toLowerCase();
        if (seenIds.has(tabIdLower)) return;
        seenIds.add(tabIdLower);

        const pageMeta = (typeof PAGE_TITLES !== 'undefined' && PAGE_TITLES[tab.id]) || {};
        const titleStr = tab.label || pageMeta.title || tab.id;
        allMenuCatalog.push({
          id: tab.id,
          type: 'menu',
          group: hub.label ? hub.label.replace(/^[^\w\s]+/, '').trim() : 'Navigation',
          icon: pageMeta.icon || '📑',
          title: titleStr,
          sub: pageMeta.sub || `Open ${titleStr} (${hub.label || 'Module'})`,
          keywords: [tab.id, hub.id, hub.label || ''],
          action: () => window.navigate(tab.id)
        });
      });
    });

    if (!q) {
      // 📌 Default view when search box is empty: Quick Actions & Primary Modules
      items.push({ isHeader: true, title: '⚡ Fast Actions & Shortcuts' });
      items.push(...allMenuCatalog.filter(c => c.type === 'action').slice(0, 5));

      items.push({ isHeader: true, title: '🧭 Primary Menus & Hubs' });
      const defaultPages = ['investors', 'reimbursements', 'bookings', 'calendar', 'flats', 'cashbook', 'attendance', 'advance', 'tasks', 'whatsapp-hub', 'settings'];
      const defaultMenus = allMenuCatalog.filter(c => defaultPages.includes(c.id));
      items.push(...defaultMenus);
    } else {
      // 🔍 Query search: Score and rank all registered menus & pages
      const scoredItems = [];
      allMenuCatalog.forEach(item => {
        const score = calcMatchScore(item, q);
        if (score > 0) {
          scoredItems.push({ ...item, _score: score });
        }
      });

      // Sort strictly descending by relevance score (highest score first)
      scoredItems.sort((a, b) => b._score - a._score);

      if (scoredItems.length) {
        items.push({ isHeader: true, title: `🎯 Matching Menus & Actions (${scoredItems.length})` });
        items.push(...scoredItems.slice(0, 16));
      }
    }

    _currentResults = items.filter(x => !x.isHeader);
    _selectedIndex = 0;

    if (!items.length || !_currentResults.length) {
      resultsContainer.innerHTML = `
        <div style="text-align:center;padding:32px 16px;color:#94A3B8;font-size:13px;">
          No matching menu or page found for "<strong>${escapeHtml(query)}</strong>"
          <div style="margin-top:6px;font-size:11.5px;color:#64748B;">Try searching: <em>Investors, Expenses, Bookings, Calendar, Attendance, Laundry, Store...</em></div>
        </div>
      `;
      return;
    }

    let selectableCounter = 0;
    resultsContainer.innerHTML = items.map(item => {
      if (item.isHeader) {
        return `<div class="cmd-result-group-title">${item.title}</div>`;
      }
      const myIdx = selectableCounter++;
      const isSel = myIdx === _selectedIndex;
      const groupBadge = item.group ? `<span style="font-size:10px;padding:2px 7px;border-radius:6px;background:#F1F5F9;color:#64748B;font-weight:700;margin-left:8px;border:1px solid #E2E8F0;">${escapeHtml(item.group)}</span>` : '';
      return `
        <div class="cmd-result-item ${isSel ? 'selected' : ''}" data-idx="${myIdx}" onclick="executePaletteItem(${myIdx})">
          <div class="cmd-result-left">
            <span class="cmd-result-icon">${item.icon}</span>
            <div>
              <div class="cmd-result-label" style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;">
                <span>${escapeHtml(item.title)}</span>
                ${groupBadge}
              </div>
              <div class="cmd-result-sub">${escapeHtml(item.sub)}</div>
            </div>
          </div>
          <span style="font-size:11px;color:#94A3B8;font-weight:700;">↵ Go</span>
        </div>
      `;
    }).join('');
  }

  function handlePaletteKeydown(e) {
    if (!_currentResults.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _selectedIndex = (_selectedIndex + 1) % _currentResults.length;
      updatePaletteSelection();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _selectedIndex = (_selectedIndex - 1 + _currentResults.length) % _currentResults.length;
      updatePaletteSelection();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executePaletteItem(_selectedIndex);
    }
  }

  function updatePaletteSelection() {
    document.querySelectorAll('.cmd-result-item').forEach((el, idx) => {
      if (idx === _selectedIndex) {
        el.classList.add('selected');
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.classList.remove('selected');
      }
    });
  }

  window.executePaletteItem = function(idx) {
    const item = _currentResults[idx];
    if (!item) return;
    closeCommandPalette();
    if (item.action) {
      item.action();
    } else if (item.page) {
      window.navigate(item.page);
    }
  };


  // ══════════════════════════════════════════════════════════════════
  // 🎙️ 5. AI VOICE-TO-BOOKING ENGINE (Hindi & English)
  // ══════════════════════════════════════════════════════════════════
  let _recognition = null;
  let _isRecording = false;

  window.openVoiceBookingModal = function() {
    closeCommandPalette();

    let el = document.getElementById('voiceBookingBackdrop');
    if (!el) {
      el = document.createElement('div');
      el.id = 'voiceBookingBackdrop';
      el.className = 'voice-booking-backdrop';
      el.onclick = (e) => { if (e.target === el) closeVoiceBookingModal(); };
      document.body.appendChild(el);
    }

    el.innerHTML = `
      <div class="voice-booking-card" onclick="event.stopPropagation()">
        <button onclick="closeVoiceBookingModal()" style="position:absolute;top:16px;right:18px;background:none;border:none;color:#94A3B8;font-size:22px;cursor:pointer;">✕</button>

        <div style="font-family:'Outfit',sans-serif;font-size:20px;font-weight:800;color:#fff;">
          🎙️ AI Voice-to-Booking
        </div>
        <div style="font-size:12.5px;color:#94A3B8;margin-top:-8px;">
          Speak in Hindi or English to automatically create a booking
        </div>

        <div class="voice-mic-glow" id="voiceMicBtn" onclick="toggleVoiceRecording()">
          🎤
        </div>

        <div class="voice-waveform-container" id="voiceWaveform" style="opacity:0.3;">
          <div class="voice-wave-bar"></div>
          <div class="voice-wave-bar"></div>
          <div class="voice-wave-bar"></div>
          <div class="voice-wave-bar"></div>
          <div class="voice-wave-bar"></div>
        </div>

        <div id="voiceStatusText" style="font-size:13px;font-weight:700;color:#38BDF8;">
          Tap microphone to start speaking...
        </div>

        <textarea class="voice-transcript-box" id="voiceTranscriptBox" rows="3"
          placeholder="Boliye ya type karein (e.g. 'गेस्ट नेम प्रवीण सिंह मोबाइल 9454470872 हेरेड प्रॉपर्टी')"
          oninput="processVoiceCommand(this.value)"
          style="width:100%;box-sizing:border-box;background:#1E293B;color:#F1F5F9;border:1.5px solid #334155;border-radius:10px;padding:10px 12px;font-size:13px;font-family:inherit;resize:none;outline:none;margin:10px 0 8px 0;line-height:1.5;"></textarea>

        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;width:100%;">
          <button type="button" style="background:#334155;color:#E2E8F0;border:1px solid #475569;padding:4px 9px;border-radius:6px;font-size:11px;cursor:pointer;" onclick="const t='गेस्ट नेम प्रवीण सिंह मोबाइल नंबर 9454470872 हेरेड प्रॉपर्टी रहेंगी।';document.getElementById('voiceTranscriptBox').value=t;processVoiceCommand(t);">
            ⚡ Test 1: प्रवीण सिंह (RedRose)
          </button>
          <button type="button" style="background:#334155;color:#E2E8F0;border:1px solid #475569;padding:4px 9px;border-radius:6px;font-size:11px;cursor:pointer;" onclick="const t='गेस्ट राहुल शर्मा फोन 9876543210 येलो हाउस 2 रात रेट 3500 एडवांस 2000';document.getElementById('voiceTranscriptBox').value=t;processVoiceCommand(t);">
            ⚡ Test 2: राहुल शर्मा (Yellow House)
          </button>
          <button type="button" style="background:#334155;color:#E2E8F0;border:1px solid #475569;padding:4px 9px;border-radius:6px;font-size:11px;cursor:pointer;" onclick="const t='लांगेस्ट नाम राजीव तलवार बुकिंग डेट 15 अक्टूबर 2026 से 20 अक्टूबर 2026 रेट पर दे 6000 प्रॉपर्टी पीला हाउस';document.getElementById('voiceTranscriptBox').value=t;processVoiceCommand(t);">
            ⚡ Test 3: राजीव तलवार (पीला हाउस 15-20 Oct)
          </button>
        </div>

        <div id="voiceParsedContainer" style="display:none;width:100%;">
          <div class="voice-parsed-summary" id="voiceParsedSummary"></div>
          <button type="button" class="btn" onclick="applyVoiceBooking()" style="width:100%;margin-top:10px;background:#10B981;color:#fff;font-weight:800;padding:12px;border-radius:10px;border:none;cursor:pointer;">
            ✨ Populate Booking Form ➔
          </button>
        </div>
      </div>
    `;

    el.style.display = 'flex';
    startVoiceRecording();
  };

  function closeVoiceBookingModal() {
    stopVoiceRecording();
    const el = document.getElementById('voiceBookingBackdrop');
    if (el) el.style.display = 'none';
  }
  window.closeVoiceBookingModal = closeVoiceBookingModal;

  function toggleVoiceRecording() {
    if (_isRecording) stopVoiceRecording();
    else startVoiceRecording();
  }
  window.toggleVoiceRecording = toggleVoiceRecording;

  function startVoiceRecording() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const statusText = document.getElementById('voiceStatusText');
    if (!SpeechRec) {
      if (statusText) {
        statusText.textContent = '⚠️ Mic not supported in this browser. Please type below.';
        statusText.style.color = '#F59E0B';
      }
      return;
    }

    try {
      if (_recognition) _recognition.abort();
    } catch(e) {}

    _recognition = new SpeechRec();
    _recognition.lang = 'hi-IN'; // Bilingual fallback handles Hinglish
    _recognition.continuous = true; // Keep recording through natural pauses
    _recognition.interimResults = true;

    const micBtn = document.getElementById('voiceMicBtn');
    const waveform = document.getElementById('voiceWaveform');

    if (micBtn) micBtn.style.animation = 'pulseVoice 1.2s infinite';
    if (waveform) waveform.style.opacity = '1';
    if (statusText) {
      statusText.textContent = '🔴 Listening... bolo abhi';
      statusText.style.color = '#FF385C';
    }

    _isRecording = true;

    _recognition.onresult = (event) => {
      let fullSpeech = '';
      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i] && event.results[i][0]) {
          fullSpeech += event.results[i][0].transcript + ' ';
        }
      }
      fullSpeech = fullSpeech.trim();
      const transcriptBox = document.getElementById('voiceTranscriptBox');
      if (transcriptBox) {
        transcriptBox.value = fullSpeech;
      }
      if (fullSpeech) {
        processVoiceCommand(fullSpeech);
      }
    };

    _recognition.onerror = (event) => {
      console.warn('Speech error:', event.error);
      if (statusText) {
        statusText.textContent = '⚠️ Mic Error: ' + event.error;
        statusText.style.color = '#F59E0B';
      }
      stopVoiceRecording();
    };

    _recognition.onend = () => {
      stopVoiceRecording();
      const transcriptBox = document.getElementById('voiceTranscriptBox');
      const text = transcriptBox ? (transcriptBox.value || '').trim() : '';
      if (text) {
        processVoiceCommand(text);
      }
    };

    try {
      _recognition.start();
    } catch (err) {
      console.warn('Recognition start error:', err);
    }
  }

  function stopVoiceRecording() {
    _isRecording = false;
    const micBtn = document.getElementById('voiceMicBtn');
    const waveform = document.getElementById('voiceWaveform');
    const statusText = document.getElementById('voiceStatusText');

    if (micBtn) micBtn.style.animation = 'none';
    if (waveform) waveform.style.opacity = '0.3';
    if (statusText && statusText.textContent.includes('Listening')) {
      statusText.textContent = 'Speech processed successfully!';
      statusText.style.color = '#38BDF8';
    }

    try {
      if (_recognition) _recognition.stop();
    } catch(e) {}
  }

  // ─── 6. Natural Speech Parser (Hindi, Hinglish & English) ───
  let _lastParsedData = null;

  const HINDI_MONTH_MAP = {
    'जनवरी': 1, 'january': 1, 'jan': 1,
    'फरवरी': 2, 'फ़रवरी': 2, 'february': 2, 'feb': 2,
    'मार्च': 3, 'march': 3, 'mar': 3,
    'अप्रैल': 4, 'अप्रेल': 4, 'एप्रिल': 4, 'april': 4, 'apr': 4,
    'मई': 5, 'may': 5,
    'जून': 6, 'june': 6, 'jun': 6,
    'जुलाई': 7, 'july': 7, 'jul': 7,
    'अगस्त': 8, 'august': 8, 'aug': 8,
    'सितंबर': 9, 'सितम्बर': 9, 'september': 9, 'sep': 9, 'sept': 9,
    'अक्टूबर': 10, 'अक्तूबर': 10, 'october': 10, 'oct': 10,
    'नवंबर': 11, 'नवम्बर': 11, 'november': 11, 'nov': 11,
    'दिसंबर': 12, 'दिसम्बर': 12, 'december': 12, 'dec': 12
  };

  const MONTH_PATTERN = '(?:जनवरी|फरवरी|फ़रवरी|मार्च|अप्रैल|अप्रेल|एप्रिल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|अक्तूबर|नवंबर|नवम्बर|दिसंबर|दिसम्बर|january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)';

  function normalizeHindiDigits(str) {
    if (!str) return '';
    const hindiDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
    return String(str).replace(/[०-९]/g, d => {
      const idx = hindiDigits.indexOf(d);
      return idx !== -1 ? idx : d;
    });
  }

  function formatGuestName(str) {
    if (!str) return '';
    let clean = String(str).replace(/[।\,\.\-\:\;]/g, ' ').trim();
    // Strip accidental leading speech recognition prefixes
    clean = clean.replace(/^(?:लांगेस्ट|लॉन्गस्ट|लॉन्गेस्ट|गेस्ट|गस्ट|कस्टमर|क्लाइंट|यात्री|guest|customer|client|name|naam|नेम|नाम)\s*/i, '').trim();
    // Strip trailing postpositions or booking keywords
    clean = clean.replace(/\s+(?:का|की|के|ने|me|में|ko|को|ki|ka|ke|ne|booking|बुकिंग)$/i, '').trim();
    // Capitalize words for Latin characters while preserving Devanagari
    return clean.replace(/\b[a-z]/g, l => l.toUpperCase());
  }

  function buildIsoDate(dayNum, monthStr, yearNum) {
    const day = parseInt(dayNum, 10);
    const mKey = String(monthStr || '').toLowerCase().trim();
    const month = HINDI_MONTH_MAP[mKey];
    if (!day || !month || day < 1 || day > 31) return null;

    let year = yearNum ? parseInt(yearNum, 10) : new Date().getFullYear();
    if (year < 100) year += 2000;

    const pad = n => String(n).padStart(2, '0');
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  function addDaysToIso(isoStr, days) {
    if (!isoStr) return '';
    const d = new Date(isoStr + 'T00:00:00');
    d.setDate(d.getDate() + (days || 1));
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function processVoiceCommand(text) {
    if (!text || !text.trim()) return;

    // Convert Hindi Devanagari numerals if any
    const normText = normalizeHindiDigits(text);
    const lower = normText.toLowerCase();

    const parsed = {
      guestName: '',
      roomNickname: '',
      roomId: '',
      nights: 1,
      rate: '',
      advance: '',
      phone: '',
      checkIn: '',
      checkOut: ''
    };

    // 1. Match Phone Number (10 digits starting with 6-9)
    const phoneCleaned = normText.replace(/[-\s]/g, '');
    const phoneMatch = phoneCleaned.match(/(?:\+?91)?([6-9]\d{9})/);
    if (phoneMatch) {
      parsed.phone = phoneMatch[1];
    }

    // 2. Match Property (Multi-lingual: Hindi Devanagari, English, and phonetic speech variations)
    // First, sort PROPERTIES_LIST aliases by descending length for greedy matching
    let matchedProp = null;
    let longestMatchLen = 0;

    for (const p of PROPERTIES_LIST) {
      const aliases = p.aliases || [p.nickname.toLowerCase()];
      for (const alias of aliases) {
        const al = alias.toLowerCase().trim();
        if (al.length > longestMatchLen && lower.includes(al)) {
          matchedProp = p;
          longestMatchLen = al.length;
        }
      }
      if (!matchedProp && (lower.includes(`room ${p.id}`) || lower.includes(`flat ${p.id}`) || lower.includes(`unit ${p.id}`))) {
        matchedProp = p;
        longestMatchLen = 1;
      }
    }

    if (matchedProp) {
      parsed.roomNickname = matchedProp.name;
      parsed.roomId = matchedProp.roomId || matchedProp.id;
    }

    // Fallback matching for speech recognition phonetic variations
    if (!parsed.roomNickname) {
      if (/हेरेड|रेडरोज़|रेड रोज|रेड रोज़|रेड पैलेस|द रेड|redrose|red rose|the red|लाल घर|लाल पैलेस|लाल/i.test(lower)) {
        parsed.roomNickname = 'RedRose Palace (117)';
        parsed.roomId = 'GOM-101';
      } else if (/पिंक पैरा|pink paradise|गुलाबी पैरा/i.test(lower)) {
        parsed.roomNickname = 'Pink Paradise Villa (101)';
        parsed.roomId = 'VIL-108';
      } else if (/पिंक|pink|गुलाबी/i.test(lower)) {
        parsed.roomNickname = 'The Pink House (112)';
        parsed.roomId = 'VIL-103';
      } else if (/येलो|yellow|पीला|peela/i.test(lower)) {
        parsed.roomNickname = 'The Yellow House (102)';
        parsed.roomId = 'VIL-105';
      } else if (/फॉरेस्ट|green forest|हरा जंगल/i.test(lower)) {
        parsed.roomNickname = 'Green Forest View (103)';
        parsed.roomId = 'VIL-106';
      } else if (/सेलिब्रिटी|celebrity/i.test(lower)) {
        parsed.roomNickname = 'Celebrity Garden (104)';
        parsed.roomId = 'LUL-402';
      } else if (/यूनिक|unique/i.test(lower)) {
        parsed.roomNickname = 'The Unique 3BHK (105)';
        parsed.roomId = 'GOM-302';
      } else if (/लाइट ग्रीन|light green/i.test(lower)) {
        parsed.roomNickname = 'The Light Green (106)';
        parsed.roomId = 'GOM-301';
      } else if (/स्टारलाइट|पेंटहाउस|penthouse|starlight|नीला पेंट/i.test(lower)) {
        parsed.roomNickname = 'Starlight Blue Penthouse (107)';
        parsed.roomId = 'GOM-501';
      } else if (/ब्लैक ब्यूटी|ब्लैक|black|काला/i.test(lower)) {
        parsed.roomNickname = 'Black Beauty (108)';
        parsed.roomId = 'GOM-102';
      } else if (/नवाबी|nawabi/i.test(lower)) {
        parsed.roomNickname = 'The Nawabi Stay (109)';
        parsed.roomId = 'GOM-401';
      } else if (/गोमती ग्रैंड|ग्रैंड विला|gomti grand|गोमती विला/i.test(lower)) {
        parsed.roomNickname = 'Gomti Grand Villa (110)';
        parsed.roomId = 'VIL-101';
      } else if (/हरा हाउस|हरा घर|green house/i.test(lower)) {
        parsed.roomNickname = 'The Green House (111)';
        parsed.roomId = 'VIL-104';
      } else if (/ब्राउन|brown/i.test(lower)) {
        parsed.roomNickname = 'The Brown Flat (113)';
        parsed.roomId = 'GOM-202';
      } else if (/वेलवेट|velvet/i.test(lower)) {
        parsed.roomNickname = 'The Velvet House (114)';
        parsed.roomId = 'VIL-107';
      } else if (/रॉयल व्हाइट|व्हाइट हाउस|royal white|सफेद घर|सफेद हाउस|सफेद कोठी/i.test(lower)) {
        parsed.roomNickname = 'Royal White House (115)';
        parsed.roomId = 'VIL-102';
      } else if (/डार्क ब्लू|dark blue|गहरा नीला|नीला/i.test(lower)) {
        parsed.roomNickname = 'The Dark Blue (116)';
        parsed.roomId = 'GOM-201';
      }
    }

    // 3. Match Nights / Duration (supports digits and Hindi words)
    const hindiWordToNum = {
      'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5,
      'छह': 6, 'छः': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5
    };
    const nightsMatch = lower.match(/(\d+|एक|दो|तीन|चार|पांच|पाँच|छह|सात|आठ|नौ|दस|one|two|three|four|five)\s*(night|nights|नाइट्स|नाइट|रात|रातें|दिन|din|day|days)/i);
    if (nightsMatch) {
      const val = nightsMatch[1];
      parsed.nights = hindiWordToNum[val] || parseInt(val, 10) || 1;
    }

    // 4. Match Dates (Full support for Hindi & English spoken dates & ranges)
    let foundCheckIn = null;
    let foundCheckOut = null;

    // Pattern A: Two dates with explicit month names (e.g. "15 अक्टूबर 2026 से 20 अक्टूबर 2026" or "15 Oct to 20 Oct")
    const dateRangeBothMonthsRegex = new RegExp(
      `(\\d{1,2})(?:th|st|nd|rd)?\\s*(?:तारीख)?\\s*(${MONTH_PATTERN})\\s*(\\d{4})?\\s*(?:से|to|तक|-)\\s*(\\d{1,2})(?:th|st|nd|rd)?\\s*(?:तारीख)?\\s*(${MONTH_PATTERN})\\s*(\\d{4})?`,
      'i'
    );
    const mRangeBoth = lower.match(dateRangeBothMonthsRegex);

    if (mRangeBoth) {
      const y1 = mRangeBoth[3] || mRangeBoth[6] || '';
      const y2 = mRangeBoth[6] || mRangeBoth[3] || '';
      foundCheckIn = buildIsoDate(mRangeBoth[1], mRangeBoth[2], y1);
      foundCheckOut = buildIsoDate(mRangeBoth[4], mRangeBoth[5], y2);
    }

    // Pattern B: Shared month range (e.g. "15 से 20 अक्टूबर 2026" or "15 to 20 october 2026")
    if (!foundCheckIn) {
      const dateRangeSharedMonthRegex = new RegExp(
        `(\\d{1,2})(?:th|st|nd|rd)?\\s*(?:तारीख)?\\s*(?:से|to|तक|-)\\s*(\\d{1,2})(?:th|st|nd|rd)?\\s*(?:तारीख)?\\s*(${MONTH_PATTERN})\\s*(\\d{4})?`,
        'i'
      );
      const mRangeShared = lower.match(dateRangeSharedMonthRegex);
      if (mRangeShared) {
        foundCheckIn = buildIsoDate(mRangeShared[1], mRangeShared[3], mRangeShared[4]);
        foundCheckOut = buildIsoDate(mRangeShared[2], mRangeShared[3], mRangeShared[4]);
      }
    }

    // Pattern C: Numeric date range (e.g. "15/10/2026 से 20/10/2026" or "15-10-2026 to 20-10-2026")
    if (!foundCheckIn) {
      const numericRangeRegex = /(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?\s*(?:से|to|तक|-)\s*(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?/i;
      const mNum = lower.match(numericRangeRegex);
      if (mNum) {
        const y1 = mNum[3] || mNum[6] || '';
        const y2 = mNum[6] || mNum[3] || '';
        const pad = n => String(n).padStart(2, '0');
        const curY = new Date().getFullYear();
        foundCheckIn = `${y1 || curY}-${pad(mNum[2])}-${pad(mNum[1])}`;
        foundCheckOut = `${y2 || curY}-${pad(mNum[5])}-${pad(mNum[4])}`;
      }
    }

    // Pattern D: Single start date (e.g. "15 अक्टूबर 2026" or "चेक इन 15 अक्टूबर")
    if (!foundCheckIn) {
      const singleDateRegex = new RegExp(
        `(?:बुकिंग\\s*डेट|चेक\\s*इन|तारीख|डेट|from|date)?\\s*[:=\\-]?\\s*(\\d{1,2})(?:th|st|nd|rd)?\\s*(?:तारीख)?\\s*(${MONTH_PATTERN})\\s*(\\d{4})?`,
        'i'
      );
      const mSingle = lower.match(singleDateRegex);
      if (mSingle && mSingle[1] && mSingle[2]) {
        foundCheckIn = buildIsoDate(mSingle[1], mSingle[2], mSingle[3]);
      }
    }

    // Apply resolved dates or fall back to relative dates
    if (foundCheckIn && foundCheckOut) {
      parsed.checkIn = foundCheckIn;
      parsed.checkOut = foundCheckOut;
      const diffMs = new Date(foundCheckOut + 'T00:00:00') - new Date(foundCheckIn + 'T00:00:00');
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        parsed.nights = diffDays;
      }
    } else if (foundCheckIn) {
      parsed.checkIn = foundCheckIn;
      parsed.checkOut = addDaysToIso(foundCheckIn, parsed.nights || 1);
    } else {
      const today = new Date();
      let checkInDate = new Date(today);
      checkInDate.setDate(checkInDate.getDate() + 1); // default tomorrow

      if (/आज|today/i.test(lower)) {
        checkInDate = new Date(today);
      } else if (/परसों|day after tomorrow/i.test(lower)) {
        checkInDate = new Date(today);
        checkInDate.setDate(checkInDate.getDate() + 2);
      } else if (/कल|tomorrow/i.test(lower)) {
        checkInDate = new Date(today);
        checkInDate.setDate(checkInDate.getDate() + 1);
      }

      const pad = n => String(n).padStart(2, '0');
      parsed.checkIn = `${checkInDate.getFullYear()}-${pad(checkInDate.getMonth() + 1)}-${pad(checkInDate.getDate())}`;
      parsed.checkOut = addDaysToIso(parsed.checkIn, parsed.nights || 1);
    }

    // 5. Match Rate & Advance (Ensuring 4-digit years like 2026 are never mistaken for rates)
    const isYearOrDateDigit = (val) => {
      if (!val) return false;
      const n = parseInt(val, 10);
      if (n >= 2024 && n <= 2035) {
        const re = new RegExp(`(?:${MONTH_PATTERN}|[0-9]{1,2}[\\/\\-\\.]|तारीख)\\s*${val}`, 'i');
        if (re.test(lower)) return true;
      }
      return false;
    };

    // Forward rate: "रेट पर दे 6000", "रेट पर डे 6000", "रेट 6000", "rate per day 6000", "किराया 6000"
    const rateMatch1 = lower.match(/(?:रेट|rate|किराया|rent|price|प्राइस)\s*(?:पर\s*दे|पर\s*डे|परदे|परडे|पर\s*दिन|प्रति\s*दिन|रोज\s*का|per\s*day|per\s*night|पर\s*नाइट|पर\s*रात|है|होगा|रहेगा|का|की|के|is)?\s*[:=\-]?\s*(\d{3,6})/i);
    // Reverse rate: "6000 रुपये", "6000 रेट", "6000 पर डे"
    const rateMatch2 = lower.match(/(\d{3,6})\s*(?:रेट|rate|रुपये|रुपया|रू|रु|₹|rs\.?|inr|per night|पर नाइट|per day|पर डे|पर दे|पर दिन|प्रति दिन|रोज का|में|me)/i);

    if (rateMatch1 && !isYearOrDateDigit(rateMatch1[1])) {
      parsed.rate = rateMatch1[1];
    } else if (rateMatch2 && !isYearOrDateDigit(rateMatch2[1])) {
      parsed.rate = rateMatch2[1];
    }

    const advMatch1 = lower.match(/(?:एडवांस|advance|टोकन|token|जमा|paid)\s*(?:में|का|की|के|is)?\s*[:=\-]?\s*(\d{3,6})/i);
    const advMatch2 = lower.match(/(\d{3,6})\s*(?:एडवांस|advance|मिला|paid|टोकन|token|जमा)/i);
    if (advMatch1 && !isYearOrDateDigit(advMatch1[1])) parsed.advance = advMatch1[1];
    else if (advMatch2 && !isYearOrDateDigit(advMatch2[1])) parsed.advance = advMatch2[1];

    // 6. Match Guest Name (Hindi Devanagari & English)
    // Pattern A: Prefix like "लांगेस्ट नाम राजीव तलवार", "गेस्ट नेम प्रवीण सिंह", "गेस्ट नाम राहुल", "नाम अमित", "guest name John"
    const prefixNameRegex = /(?:(?:लांगेस्ट|लॉन्गस्ट|लॉन्गेस्ट|गेस्ट|गस्ट|कस्टमर|क्लाइंट|यात्री|guest|customer|client)\s*(?:नेम|नाम|name)?|(?:नेम|नाम|name|naam)|for|booked\s*for|booking\s*for)\s*[:=\-]?\s*([a-zA-Z\u0900-\u097F\s\.\'\-]+?)(?=\s+(?:बुकिंग|booking|डेट|date|तारीख|tarikh|from|to|से|तक|चेक\s*इन|check\s*in|चेक\s*आउट|check\s*out|मोबाइल|फोन|नंबर|phone|mobile|number|mob|\d+|प्रॉपर्टी|property|रूम|room|कमरा|फ्लैट|flat|विला|villa|हाउस|house|होटल|hotel|रेट|rate|किराया|rent|price|प्राइस|एडवांस|advance|टोकन|token|जमा|कल|आज|परसों|today|tomorrow|night|nights|नाइट|नाइट्स|रात|रातें|दिन|din|day|days|(?:का|की|के|ने)\s+(?:बुकिंग|कमरा|stay))|[\,\.\।\:\;\-\n]|$)/i;
    const prefixMatch = normText.match(prefixNameRegex);

    if (prefixMatch && prefixMatch[1] && prefixMatch[1].trim()) {
      parsed.guestName = formatGuestName(prefixMatch[1]);
    } else {
      // Pattern B: Postfix particle like "प्रवीण सिंह का बुकिंग", "Rahul Sharma ki booking"
      const postfixMatch = normText.match(/([a-zA-Z\u0900-\u097F\s\.\'\-]{2,30}?)\s+(?:का|की|के|ने|ka|ki|ke|ne)\s+(?:बुकिंग|booking|कमरा|stay|room|staying)/i);
      if (postfixMatch && postfixMatch[1] && postfixMatch[1].trim()) {
        parsed.guestName = formatGuestName(postfixMatch[1]);
      } else {
        // Pattern C: Leading Name without prefix before booking/date/property keyword (e.g. "राजीव तलवार बुकिंग डेट...")
        const leadMatch = normText.match(/^\s*([a-zA-Z\u0900-\u097F\s\.\'\-]{2,30}?)\s+(?:बुकिंग|booking|मोबाइल|फोन|phone|mobile|डेट|date|तारीख|tarikh|check|चेक|रूम|room|प्रॉपर्टी|property|rate|रेट)/i);
        if (leadMatch && leadMatch[1] && leadMatch[1].trim()) {
          const candidate = leadMatch[1].trim();
          const words = candidate.split(/\s+/).filter(w => !/^(बुकिंग|booking|डेट|date|का|की|के|ने|for)$/i.test(w));
          if (words.length >= 1 && words.length <= 4) {
            parsed.guestName = formatGuestName(words.join(' '));
          }
        } else if (parsed.phone) {
          // Pattern D: Context before phone number (e.g. "प्रवीण सिंह मोबाइल 9454470872")
          const parts = normText.split(parsed.phone);
          if (parts[0]) {
            let candidate = parts[0].replace(/(?:मोबाइल|फोन|नंबर|phone|mobile|number|का|की|ke|ka|ki)\s*$/i, '').trim();
            candidate = candidate.replace(/^(?:लांगेस्ट|गेस्ट\s*(?:नेम|नाम)|नेम|नाम|guest\s*name|guest|name)\s*/i, '').trim();
            const words = candidate.split(/\s+/).filter(w => w && !/^(का|की|के|हेरेड|रेड|रूम|होटल|stay|प्रॉपर्टी|property)$/i.test(w));
            if (words.length >= 1 && words.length <= 4) {
              parsed.guestName = formatGuestName(words.join(' '));
            }
          }
        }
      }
    }

    _lastParsedData = parsed;

    // Display summary
    const parsedContainer = document.getElementById('voiceParsedContainer');
    const summaryBox = document.getElementById('voiceParsedSummary');
    const statusText = document.getElementById('voiceStatusText');

    if (parsedContainer && summaryBox) {
      parsedContainer.style.display = 'block';
      const totalEstimated = parsed.rate ? Number(parsed.rate) * (parsed.nights || 1) : 0;
      summaryBox.innerHTML = `
        <div style="font-weight:800;font-size:13px;margin-bottom:6px;color:#fff;">✅ Speech Parsed Successfully:</div>
        <div style="margin-bottom:3px;">👤 <strong>Guest Name:</strong> ${parsed.guestName ? `<span style="color:#34D399;font-weight:800;">${escapeHtml(parsed.guestName)}</span>` : '<span style="color:#FBBF24;">(Not specified)</span>'}</div>
        <div style="margin-bottom:3px;">🏡 <strong>Property:</strong> ${parsed.roomNickname ? `<span style="color:#38BDF8;font-weight:800;">${escapeHtml(parsed.roomNickname)}</span>` : '<span style="color:#FBBF24;">(Select in form)</span>'}</div>
        <div style="margin-bottom:3px;">🌙 <strong>Duration:</strong> ${parsed.nights} Night(s) (${parsed.checkIn} → ${parsed.checkOut})</div>
        ${parsed.rate ? `<div style="margin-bottom:3px;">💰 <strong>Rate:</strong> ₹${parsed.rate} / night ${parsed.nights > 1 ? `<span style="color:#94A3B8;font-size:11.5px;">(Total: ₹${totalEstimated})</span>` : ''}</div>` : ''}
        ${parsed.advance ? `<div style="margin-bottom:3px;">💵 <strong>Advance:</strong> ₹${parsed.advance}</div>` : ''}
        ${parsed.phone ? `<div style="margin-bottom:3px;">📞 <strong>Phone:</strong> <span style="color:#A7F3D0;font-weight:800;">${escapeHtml(parsed.phone)}</span></div>` : ''}
      `;
    }

    if (statusText) {
      statusText.textContent = '🎉 Ready! Tap button below to populate form';
      statusText.style.color = '#10B981';
    }

    // Play pleasant confirmation sound if available
    if (window.notifications && typeof window.notifications.notify === 'function') {
      // Audio chime
    }
  }

  window.processVoiceCommand = processVoiceCommand;
  window.getLastParsedVoiceData = () => _lastParsedData;

  window.applyVoiceBooking = function() {
    if (!_lastParsedData) return;
    const p = _lastParsedData;
    closeVoiceBookingModal();

    window._bookingPrefill = {
      guestName: p.guestName || '',
      guestPhone: p.phone || '',
      checkIn: p.checkIn,
      checkOut: p.checkOut,
      totalAmount: p.rate ? Number(p.rate) * (p.nights || 1) : '',
      advance: p.advance || '',
      advanceAmt: p.advance || '',
      roomId: p.roomId || '',
      room_id: p.roomId || ''
    };

    if (typeof window.renderAddBooking === 'function') {
      window.renderAddBooking();
    } else {
      window.navigate('bookings');
    }
  };

  function capitalizeWords(str) {
    if (!str) return '';
    return str.replace(/\b\w/g, l => l.toUpperCase());
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

})();
