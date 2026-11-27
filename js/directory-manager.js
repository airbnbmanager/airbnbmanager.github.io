// ============================================================================
// 📱 DIRECTORY MANAGER MODULE — STAFF & EMERGENCY VENDORS (CRM CRUD)
// The Unique Haven Homes Private Limited
// Permissions: Add / Edit / Delete STRICTLY restricted to Praveen (Admin/Dev)
// ============================================================================

(function () {
  'use strict';

  // 1. Initial Default Seed Data
  const DEFAULT_STAFF = [
    { id: 'st_1', cluster: 'central', name: 'Shahanshah', roleBadge: 'Founder & Owner', roleClass: 'role-lead', avatar: '👑', responsibilities: 'Founder & Managing Director · Executive Head', properties: 'All 20 Properties · Direct Contact & Escalation', phone: '+919450055554', whatsapp: '919450055554' },
    { id: 'st_2', cluster: 'central', name: 'Host Concierge Desk', roleBadge: 'Support Line', roleClass: 'role-lead', avatar: '🛎️', responsibilities: 'Guest Helpdesk, Payment Verification & Check-in Pass', properties: 'WhatsApp & Phone Support Desk', phone: '+919450055554', whatsapp: '919450055554' },
    { id: 'st_3', cluster: 'central', name: 'Kanchan', roleBadge: 'Housekeeping Supervisor', roleClass: 'role-housekeeping', avatar: '✨', responsibilities: 'Linen, Toiletries, Maid Turnaround & Cleaning Quality', properties: 'All City Locations · Quality Control Lead', phone: '+919194109911', whatsapp: '919194109911' },
    { id: 'st_4', cluster: 'vikalp', name: 'Arman Commandar', roleBadge: 'Primary Caretaker', roleClass: 'role-caretaker', avatar: '🔑', responsibilities: 'Guest Check-in, Keys, Luggage & Flat Maintenance', properties: 'Vikalp Khand & Blossom Skyline (10 Flats)', phone: '+918467080284', whatsapp: '8467080284' },
    { id: 'st_5', cluster: 'vikalp', name: 'Shuaib', roleBadge: 'Field Executive', roleClass: 'role-caretaker', avatar: '⚡', responsibilities: 'Night Check-ins, Technical Support & Society Coordination', properties: 'Vikalp Khand Cluster', phone: '+918957725081', whatsapp: '8957725081' },
    { id: 'st_6', cluster: 'vishesh', name: 'Aniket', roleBadge: 'Villa Caretaker & Supervisor', roleClass: 'role-caretaker', avatar: '🏡', responsibilities: 'Villa Check-in, Keys, Lawn Maintenance & Guest Service', properties: 'Vishesh Khand 3 Villas (Pink, Green, Yellow)', phone: '+919214246820', whatsapp: '9214246820' },
    { id: 'st_7', cluster: 'shaheed', name: 'Sarvan', roleBadge: 'Property In-Charge', roleClass: 'role-caretaker', avatar: '🌴', responsibilities: 'Madhav Kunj Villas & Celebrity Garden Check-ins & Upkeep', properties: 'Madhav Kunj (3 Villas) + Celebrity Garden', phone: '+918858034382', whatsapp: '8858034382' },
    { id: 'st_8', cluster: 'shaheed', name: 'Shrwan', roleBadge: 'Golf City Caretaker', roleClass: 'role-caretaker', avatar: '🏢', responsibilities: 'The Luxe Haven Check-ins, Keys & Society Access', properties: 'The Luxe Haven (Golf City, Lulu Mall Zone)', phone: '+918858034382', whatsapp: '8858034382' }
  ];

  const DEFAULT_VENDORS = [
    { id: 'vd_1', cluster: 'vikalp', category: 'Plumber (नल व पाइपलाइन)', name: 'Mohd. Arif Plumber', meta: 'Jet spray, RO connection, Taps, Cistern, Pipeline leak & Geyser', icon: '🔧', phone: '+918467080284', whatsapp: '8467080284' },
    { id: 'vd_2', cluster: 'vikalp', category: 'Electrician (बिजली व AC)', name: 'Dinesh Electrician', meta: 'AC cooling, Power trip, Geyser, Switchboards & Inverter', icon: '⚡', phone: '+918957725081', whatsapp: '8957725081' },
    { id: 'vd_3', cluster: 'vikalp', category: 'Carpenter (बढ़ई व फर्नीचर)', name: 'Aslam Carpenter', meta: 'Door locks, Bed, Almirah hinges, Handles & Keys', icon: '🪚', phone: '+918467080284', whatsapp: '8467080284' },
    { id: 'vd_4', cluster: 'vikalp', category: 'Sofa & Deep Cleaning', name: 'A1 Cleanify / Kanchan Team', meta: 'Sofa shampooing, Curtains & Deep wash', icon: '🛋️', phone: '+919194109911', whatsapp: '919194109911' },
    { id: 'vd_5', cluster: 'vishesh', category: 'Plumber (नल व पाइपलाइन)', name: 'Aniket Supervisor / Local Plumber', meta: 'Water tank, Pressure pump, Taps & Flush', icon: '🔧', phone: '+919214246820', whatsapp: '9214246820' },
    { id: 'vd_6', cluster: 'vishesh', category: 'Electrician (बिजली व AC)', name: 'Vishesh Khand Electrical Care', meta: 'AC service, Hall chandeliers, Geysers & Inverter battery', icon: '⚡', phone: '+919214246820', whatsapp: '9214246820' },
    { id: 'vd_7', cluster: 'vishesh', category: 'Carpenter (बढ़ई व फर्नीचर)', name: 'Gomti Nagar Woodworks', meta: 'Door alignment, Wardrobe & Smart lock replacement', icon: '🪚', phone: '+919214246820', whatsapp: '9214246820' },
    { id: 'vd_8', cluster: 'vishesh', category: 'Sofa & Deep Cleaning', name: 'A1 Cleanify / Deep Scrub Team', meta: 'Living room sofa extraction, Rugs, Mattress sanitization', icon: '🛋️', phone: '+919194109911', whatsapp: '919194109911' },
    { id: 'vd_9', cluster: 'shaheed', category: 'Plumber (नल व पाइपलाइन)', name: 'Shaheed Path Plumbing Desk', meta: 'Motor pump, Geyser leak, Bathroom fittings', icon: '🔧', phone: '+918858034382', whatsapp: '8858034382' },
    { id: 'vd_10', cluster: 'shaheed', category: 'Electrician (बिजली व AC)', name: 'Sarvan / South City Electricals', meta: 'AC capacitor, Power backup & Panel board', icon: '⚡', phone: '+918858034382', whatsapp: '8858034382' },
    { id: 'vd_11', cluster: 'shaheed', category: 'Carpenter (बढ़ई व फर्नीचर)', name: 'Babu Carpenter', meta: 'Villa wooden deck fixtures, Bed repair & Locks', icon: '🪚', phone: '+918858034382', whatsapp: '8858034382' },
    { id: 'vd_12', cluster: 'shaheed', category: 'Sofa & Deep Cleaning', name: 'A1 Cleanify / Prime Steam Wash', meta: 'Sofa extraction, Carpet & Lawn villa cleaning', icon: '🛋️', phone: '+919194109911', whatsapp: '919194109911' }
  ];

  let state = {
    activeTab: 'staff', // 'staff' | 'vendors'
    clusterFilter: 'all', // 'all' | 'central' | 'vikalp' | 'vishesh' | 'shaheed'
    staffList: [],
    vendorsList: [],
    loading: false
  };

  // 2. Strict Permission Check: Only Praveen can do Add / Edit / Delete
  function canPraveenManage() {
    if (typeof window.isCurrentSessionPraveen === 'function') {
      return window.isCurrentSessionPraveen();
    }
    const sess = window.SESSION || {};
    const email = (sess.email || '').toLowerCase();
    const name = (sess.displayName || sess.name || '').toLowerCase();
    const role = (sess.role || '').toLowerCase();
    return role === 'developer' || email.includes('praveensingh') || name.includes('praveen');
  }

  // 3. Cloud Load & Save via Supabase app_settings
  async function loadDirectories() {
    state.loading = true;
    try {
      if (window.sb) {
        const { data: staffRow } = await window.sb.from('app_settings').select('value').eq('key', 'tuhh_staff_directory').maybeSingle();
        if (staffRow && staffRow.value) {
          state.staffList = typeof staffRow.value === 'string' ? JSON.parse(staffRow.value) : staffRow.value;
        } else {
          state.staffList = [...DEFAULT_STAFF];
        }

        const { data: vendorRow } = await window.sb.from('app_settings').select('value').eq('key', 'tuhh_vendors_directory').maybeSingle();
        if (vendorRow && vendorRow.value) {
          state.vendorsList = typeof vendorRow.value === 'string' ? JSON.parse(vendorRow.value) : vendorRow.value;
        } else {
          state.vendorsList = [...DEFAULT_VENDORS];
        }
      } else {
        const cachedStaff = localStorage.getItem('tuhh_staff_directory');
        state.staffList = cachedStaff ? JSON.parse(cachedStaff) : [...DEFAULT_STAFF];
        const cachedVend = localStorage.getItem('tuhh_vendors_directory');
        state.vendorsList = cachedVend ? JSON.parse(cachedVend) : [...DEFAULT_VENDORS];
      }
    } catch (e) {
      console.warn('[DirectoryManager] Error loading:', e);
      state.staffList = [...DEFAULT_STAFF];
      state.vendorsList = [...DEFAULT_VENDORS];
    } finally {
      state.loading = false;
    }
  }

  async function saveDirectories() {
    try {
      localStorage.setItem('tuhh_staff_directory', JSON.stringify(state.staffList));
      localStorage.setItem('tuhh_vendors_directory', JSON.stringify(state.vendorsList));

      if (window.sb) {
        await window.sb.from('app_settings').upsert({
          key: 'tuhh_staff_directory',
          value: JSON.stringify(state.staffList),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

        await window.sb.from('app_settings').upsert({
          key: 'tuhh_vendors_directory',
          value: JSON.stringify(state.vendorsList),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      }
      return true;
    } catch (e) {
      console.error('[DirectoryManager] Error saving to cloud:', e);
      return false;
    }
  }

  // 4. Cluster Label Map
  const CLUSTER_NAMES = {
    central: '⭐ Central Executive & Concierge',
    vikalp: '🏢 Vikalp Khand & Chinhat (10 Flats)',
    vishesh: '🌿 Vishesh Khand (3 Villas)',
    shaheed: '🛣️ Shaheed Path & Madhav Kunj (7 Stays)'
  };

  // 5. Render Main UI
  window.renderDirectoryManager = async function (initialTab) {
    if (initialTab) state.activeTab = initialTab;
    if (!state.staffList.length && !state.vendorsList.length) {
      await loadDirectories();
    }

    const isPraveen = canPraveenManage();
    const appEl = document.getElementById('mainContent') || document.getElementById('app');
    if (!appEl) return;

    const staffItems = state.staffList.filter(item => state.clusterFilter === 'all' || item.cluster === state.clusterFilter);
    const vendorItems = state.vendorsList.filter(item => state.clusterFilter === 'all' || item.cluster === state.clusterFilter);

    const html = `
      <div class="directory-manager-wrap" style="padding: 20px; max-width: 1200px; margin: 0 auto; font-family: 'Plus Jakarta Sans', sans-serif;">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); border: 1.5px solid ${isPraveen ? '#F59E0B' : 'rgba(255,255,255,0.1)'}; border-radius: 16px; padding: 22px 24px; color: #FFFFFF; margin-bottom: 22px; box-shadow: 0 10px 25px rgba(0,0,0,0.25);">
          <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 14px;">
            <div>
              <div style="display: inline-flex; align-items: center; gap: 6px; background: ${isPraveen ? 'rgba(245,158,11,0.2)' : 'rgba(148,163,184,0.15)'}; border: 1px solid ${isPraveen ? '#F59E0B' : '#64748B'}; color: ${isPraveen ? '#FDE047' : '#94A3B8'}; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px;">
                ${isPraveen ? '👑 Master Admin Mode · Full CRUD (Praveen Only)' : '🔒 Read-Only Directory Mode'}
              </div>
              <h2 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px;">
                Staff &amp; Vendor Directory Management Hub
              </h2>
              <div style="font-size: 13px; color: #94A3B8; line-height: 1.5;">
                Centralized control center for on-ground caretakers, supervisors, and emergency maintenance technicians.
              </div>
            </div>

            <!-- External Live Portal Pills -->
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
              <a href="https://uniquehavenhomesstay.com/staff.html" target="_blank" style="display: inline-flex; align-items: center; gap: 7px; background: rgba(2,132,199,0.18); border: 1px solid #0284C7; color: #38BDF8; padding: 8px 14px; border-radius: 10px; font-size: 12.5px; font-weight: 700; text-decoration: none;">
                <i class="ti ti-users"></i> Live staff.html <i class="ti ti-external-link" style="font-size: 13px;"></i>
              </a>
              <a href="https://uniquehavenhomesstay.com/vendors.html" target="_blank" style="display: inline-flex; align-items: center; gap: 7px; background: rgba(217,119,6,0.18); border: 1px solid #D97706; color: #FBBF24; padding: 8px 14px; border-radius: 10px; font-size: 12.5px; font-weight: 700; text-decoration: none;">
                <i class="ti ti-tools"></i> Live vendors.html <i class="ti ti-external-link" style="font-size: 13px;"></i>
              </a>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs & Actions Toolbar -->
        <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 20px; border-bottom: 1.5px solid var(--crm-border, #E2E8F0); padding-bottom: 14px;">
          <!-- Tabs -->
          <div style="display: flex; gap: 8px;">
            <button type="button" onclick="window.switchDirectoryTab('staff')" style="padding: 10px 18px; border-radius: 10px; font-size: 13.5px; font-weight: 800; cursor: pointer; border: none; display: flex; align-items: center; gap: 8px; transition: all 0.2s; background: ${state.activeTab === 'staff' ? '#0F172A' : '#F1F5F9'}; color: ${state.activeTab === 'staff' ? '#FFFFFF' : '#475569'}; box-shadow: ${state.activeTab === 'staff' ? '0 4px 12px rgba(15,23,42,0.2)' : 'none'};">
              <span>👥 Staff &amp; Caretakers</span>
              <span style="background: ${state.activeTab === 'staff' ? '#2563EB' : '#CBD5E1'}; color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 12px;">${state.staffList.length}</span>
            </button>
            <button type="button" onclick="window.switchDirectoryTab('vendors')" style="padding: 10px 18px; border-radius: 10px; font-size: 13.5px; font-weight: 800; cursor: pointer; border: none; display: flex; align-items: center; gap: 8px; transition: all 0.2s; background: ${state.activeTab === 'vendors' ? '#0F172A' : '#F1F5F9'}; color: ${state.activeTab === 'vendors' ? '#FFFFFF' : '#475569'}; box-shadow: ${state.activeTab === 'vendors' ? '0 4px 12px rgba(15,23,42,0.2)' : 'none'};">
              <span>🔧 Emergency Vendors</span>
              <span style="background: ${state.activeTab === 'vendors' ? '#D97706' : '#CBD5E1'}; color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 12px;">${state.vendorsList.length}</span>
            </button>
          </div>

          <!-- Add Action (Praveen Only) -->
          <div style="display: flex; gap: 10px; align-items: center;">
            ${isPraveen ? `
              <button type="button" onclick="window.openDirectoryModal('add', '${state.activeTab}')" style="background: #10B981; color: #FFFFFF; border: none; padding: 10px 18px; border-radius: 10px; font-weight: 800; font-size: 13.5px; cursor: pointer; display: flex; align-items: center; gap: 7px; box-shadow: 0 4px 12px rgba(16,185,129,0.3);">
                <i class="ti ti-plus" style="font-size: 16px;"></i> + Add New ${state.activeTab === 'staff' ? 'Staff' : 'Vendor'}
              </button>
            ` : `
              <div style="font-size: 12px; color: #64748B; font-weight: 700; background: #F8FAFC; padding: 8px 12px; border-radius: 8px; border: 1px solid #E2E8F0;">
                🔒 Read-Only (Only Praveen can Add/Edit/Delete)
              </div>
            `}
          </div>
        </div>

        <!-- Cluster Filter Strip -->
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;">
          ${['all', 'central', 'vikalp', 'vishesh', 'shaheed'].map(cl => {
            const isSel = state.clusterFilter === cl;
            const label = cl === 'all' ? 'All Clusters' : (cl === 'central' ? 'Central HQ' : (cl === 'vikalp' ? 'Vikalp Khand' : (cl === 'vishesh' ? 'Vishesh Khand' : 'Shaheed Path')));
            return `
              <button type="button" onclick="window.setDirectoryClusterFilter('${cl}')" style="padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1.5px solid ${isSel ? '#2563EB' : '#E2E8F0'}; background: ${isSel ? '#EFF6FF' : '#FFFFFF'}; color: ${isSel ? '#1D4ED8' : '#64748B'};">
                ${label}
              </button>
            `;
          }).join('')}
        </div>

        <!-- Directory Cards Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px;">
          ${state.activeTab === 'staff' ? renderStaffCards(staffItems, isPraveen) : renderVendorCards(vendorItems, isPraveen)}
        </div>

      </div>

      <!-- Add / Edit Modal -->
      <div id="dirModalBackdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 99998; align-items: center; justify-content: center; padding: 16px;">
        <div id="dirModalBox" style="background: #FFFFFF; border-radius: 18px; width: 100%; max-width: 520px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); overflow: hidden; font-family: 'Plus Jakarta Sans', sans-serif;">
          <!-- Injected via openDirectoryModal -->
        </div>
      </div>
    `;

    if (typeof window.renderShell === 'function') {
      window.renderShell(html, 'directory-manager');
    } else {
      appEl.innerHTML = html;
    }
  };

  function renderStaffCards(items, isPraveen) {
    if (!items.length) {
      return `<div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: #94A3B8; background: #F8FAFC; border-radius: 12px; border: 1.5px dashed #CBD5E1;">No staff records found in this cluster.</div>`;
    }

    return items.map(item => `
      <div style="background: #FFFFFF; border: 1px solid var(--crm-border, #E2E8F0); border-radius: 14px; padding: 18px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.2s, box-shadow 0.2s;">
        <div>
          <!-- Top Row -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 44px; height: 44px; border-radius: 12px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; font-size: 22px;">
                ${item.avatar || '👤'}
              </div>
              <div>
                <h4 style="margin: 0 0 3px 0; font-size: 16px; font-weight: 800; color: #0F172A;">${escape(item.name)}</h4>
                <span style="display: inline-block; background: #EFF6FF; color: #2563EB; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 6px;">${escape(item.roleBadge || 'Staff')}</span>
              </div>
            </div>
            
            <span style="font-size: 11px; font-weight: 700; color: #64748B; background: #F8FAFC; padding: 3px 8px; border-radius: 6px; border: 1px solid #E2E8F0;">
              ${item.cluster.toUpperCase()}
            </span>
          </div>

          <!-- Description & Details -->
          <div style="font-size: 12.5px; color: #475569; margin-bottom: 8px; line-height: 1.45;">
            <strong>Role:</strong> ${escape(item.responsibilities || 'General staff')}
          </div>
          <div style="font-size: 12px; color: #64748B; margin-bottom: 14px; line-height: 1.45;">
            <strong>Assigned:</strong> ${escape(item.properties || 'All properties')}
          </div>
        </div>

        <!-- Action Row -->
        <div style="border-top: 1px solid #F1F5F9; padding-top: 12px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
          <!-- Quick Call & WA -->
          <div style="display: flex; gap: 6px;">
            <a href="tel:${escape(item.phone)}" style="display: inline-flex; align-items: center; gap: 4px; background: #0284C7; color: #FFFFFF; text-decoration: none; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700;">
              📞 Call
            </a>
            <a href="https://wa.me/${escape(item.whatsapp)}" target="_blank" style="display: inline-flex; align-items: center; gap: 4px; background: #10B981; color: #FFFFFF; text-decoration: none; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700;">
              💬 WA
            </a>
          </div>

          <!-- Praveen Master Controls -->
          ${isPraveen ? `
            <div style="display: flex; gap: 6px;">
              <button type="button" onclick="window.openDirectoryModal('edit', 'staff', '${item.id}')" title="Edit Staff Member" style="background: #F1F5F9; color: #0F172A; border: 1px solid #CBD5E1; padding: 6px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">
                ✏️ Edit
              </button>
              <button type="button" onclick="window.deleteDirectoryItem('staff', '${item.id}')" title="Delete Staff Member" style="background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; padding: 6px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">
                🗑️
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');
  }

  function renderVendorCards(items, isPraveen) {
    if (!items.length) {
      return `<div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: #94A3B8; background: #F8FAFC; border-radius: 12px; border: 1.5px dashed #CBD5E1;">No vendor records found in this cluster.</div>`;
    }

    return items.map(item => `
      <div style="background: #FFFFFF; border: 1px solid var(--crm-border, #E2E8F0); border-radius: 14px; padding: 18px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <!-- Top Row -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 44px; height: 44px; border-radius: 12px; background: #FEF3C7; color: #D97706; display: flex; align-items: center; justify-content: center; font-size: 22px;">
                ${item.icon || '🔧'}
              </div>
              <div>
                <h4 style="margin: 0 0 3px 0; font-size: 16px; font-weight: 800; color: #0F172A;">${escape(item.category)}</h4>
                <div style="font-size: 12.5px; font-weight: 700; color: #D97706;">${escape(item.name)}</div>
              </div>
            </div>
            
            <span style="font-size: 11px; font-weight: 700; color: #64748B; background: #F8FAFC; padding: 3px 8px; border-radius: 6px; border: 1px solid #E2E8F0;">
              ${item.cluster.toUpperCase()}
            </span>
          </div>

          <!-- Scope -->
          <div style="font-size: 12px; color: #475569; margin-bottom: 14px; line-height: 1.45;">
            <strong>Scope:</strong> ${escape(item.meta || 'General repairs')}
          </div>
        </div>

        <!-- Action Row -->
        <div style="border-top: 1px solid #F1F5F9; padding-top: 12px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
          <!-- Quick Call & WA -->
          <div style="display: flex; gap: 6px;">
            <a href="tel:${escape(item.phone)}" style="display: inline-flex; align-items: center; gap: 4px; background: #D97706; color: #FFFFFF; text-decoration: none; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700;">
              📞 Call
            </a>
            <a href="https://wa.me/${escape(item.whatsapp)}" target="_blank" style="display: inline-flex; align-items: center; gap: 4px; background: #10B981; color: #FFFFFF; text-decoration: none; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700;">
              💬 WA
            </a>
          </div>

          <!-- Praveen Master Controls -->
          ${isPraveen ? `
            <div style="display: flex; gap: 6px;">
              <button type="button" onclick="window.openDirectoryModal('edit', 'vendors', '${item.id}')" title="Edit Vendor" style="background: #F1F5F9; color: #0F172A; border: 1px solid #CBD5E1; padding: 6px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">
                ✏️ Edit
              </button>
              <button type="button" onclick="window.deleteDirectoryItem('vendors', '${item.id}')" title="Delete Vendor" style="background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; padding: 6px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">
                🗑️
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');
  }

  function escape(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  // 6. Window Actions & Event Handlers
  window.switchDirectoryTab = function (tab) {
    state.activeTab = tab;
    window.renderDirectoryManager();
  };

  window.setDirectoryClusterFilter = function (cl) {
    state.clusterFilter = cl;
    window.renderDirectoryManager();
  };

  window.openDirectoryModal = function (mode, type, id) {
    if (!canPraveenManage()) {
      alert('Access Restricted: Only Admin (Praveen) has permissions to add or edit directory entries.');
      return;
    }

    const backdrop = document.getElementById('dirModalBackdrop');
    const box = document.getElementById('dirModalBox');
    if (!backdrop || !box) return;

    let item = null;
    if (mode === 'edit' && id) {
      item = (type === 'staff' ? state.staffList : state.vendorsList).find(x => x.id === id);
    }

    const isStaff = type === 'staff';
    const title = `${mode === 'add' ? 'Add New' : 'Edit'} ${isStaff ? 'Staff Member' : 'Emergency Vendor'}`;

    box.innerHTML = `
      <div style="padding: 20px 24px; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; background: #F8FAFC;">
        <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #0F172A;">${title}</h3>
        <button type="button" onclick="window.closeDirectoryModal()" style="border: none; background: transparent; font-size: 18px; cursor: pointer; color: #64748B;">✕</button>
      </div>

      <form id="dirForm" onsubmit="window.saveDirectoryItem(event, '${mode}', '${type}', '${id || ''}')" style="padding: 22px 24px;">
        <div style="margin-bottom: 14px;">
          <label style="display: block; font-size: 12px; font-weight: 800; color: #334155; margin-bottom: 5px;">Location Cluster *</label>
          <select id="dirCluster" required style="width: 100%; padding: 10px; border-radius: 8px; border: 1.5px solid #CBD5E1; font-size: 13.5px; font-weight: 600;">
            <option value="central" ${item && item.cluster === 'central' ? 'selected' : ''}>⭐ Central Executive & Concierge</option>
            <option value="vikalp" ${item && item.cluster === 'vikalp' ? 'selected' : ''}>🏢 Vikalp Khand & Chinhat</option>
            <option value="vishesh" ${item && item.cluster === 'vishesh' ? 'selected' : ''}>🌿 Vishesh Khand (Gomti Nagar)</option>
            <option value="shaheed" ${item && item.cluster === 'shaheed' ? 'selected' : ''}>🛣️ Shaheed Path & Madhav Kunj</option>
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
          <div>
            <label style="display: block; font-size: 12px; font-weight: 800; color: #334155; margin-bottom: 5px;">${isStaff ? 'Staff Name *' : 'Technician / Shop Name *'}</label>
            <input type="text" id="dirName" required value="${escape(item ? item.name : '')}" placeholder="e.g. Arman Commandar" style="width: 100%; padding: 10px; border-radius: 8px; border: 1.5px solid #CBD5E1; font-size: 13px;" />
          </div>
          <div>
            <label style="display: block; font-size: 12px; font-weight: 800; color: #334155; margin-bottom: 5px;">${isStaff ? 'Role Title / Badge *' : 'Trade / Category *'}</label>
            <input type="text" id="dirRole" required value="${escape(item ? (isStaff ? item.roleBadge : item.category) : '')}" placeholder="${isStaff ? 'e.g. Primary Caretaker' : 'e.g. Plumber (नल व पाइपलाइन)'}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1.5px solid #CBD5E1; font-size: 13px;" />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
          <div>
            <label style="display: block; font-size: 12px; font-weight: 800; color: #334155; margin-bottom: 5px;">Phone Number (Call) *</label>
            <input type="text" id="dirPhone" required value="${escape(item ? item.phone : '+91')}" placeholder="+91 8467080284" style="width: 100%; padding: 10px; border-radius: 8px; border: 1.5px solid #CBD5E1; font-size: 13px;" />
          </div>
          <div>
            <label style="display: block; font-size: 12px; font-weight: 800; color: #334155; margin-bottom: 5px;">WhatsApp Number *</label>
            <input type="text" id="dirWhatsApp" required value="${escape(item ? item.whatsapp : '91')}" placeholder="918467080284" style="width: 100%; padding: 10px; border-radius: 8px; border: 1.5px solid #CBD5E1; font-size: 13px;" />
          </div>
        </div>

        <div style="margin-bottom: 14px;">
          <label style="display: block; font-size: 12px; font-weight: 800; color: #334155; margin-bottom: 5px;">${isStaff ? 'Responsibilities / Duties' : 'Scope of Work & Repairs'}</label>
          <input type="text" id="dirResponsibilities" value="${escape(item ? (isStaff ? item.responsibilities : item.meta) : '')}" placeholder="e.g. Check-in, keys, pipeline repairs, geyser leak" style="width: 100%; padding: 10px; border-radius: 8px; border: 1.5px solid #CBD5E1; font-size: 13px;" />
        </div>

        ${isStaff ? `
          <div style="margin-bottom: 18px;">
            <label style="display: block; font-size: 12px; font-weight: 800; color: #334155; margin-bottom: 5px;">Assigned Flats / Properties</label>
            <input type="text" id="dirProperties" value="${escape(item ? item.properties : '')}" placeholder="e.g. Vikalp Khand (10 Flats)" style="width: 100%; padding: 10px; border-radius: 8px; border: 1.5px solid #CBD5E1; font-size: 13px;" />
          </div>
        ` : ''}

        <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #E2E8F0; padding-top: 16px;">
          <button type="button" onclick="window.closeDirectoryModal()" style="background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1; padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer;">
            Cancel
          </button>
          <button type="submit" style="background: #2563EB; color: #FFFFFF; border: none; padding: 10px 22px; border-radius: 8px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">
            💾 Save &amp; Sync to Cloud
          </button>
        </div>
      </form>
    `;

    backdrop.style.display = 'flex';
  };

  window.closeDirectoryModal = function () {
    const backdrop = document.getElementById('dirModalBackdrop');
    if (backdrop) backdrop.style.display = 'none';
  };

  window.saveDirectoryItem = async function (e, mode, type, id) {
    e.preventDefault();
    if (!canPraveenManage()) return;

    const cluster = document.getElementById('dirCluster').value;
    const name = document.getElementById('dirName').value.trim();
    const roleOrCat = document.getElementById('dirRole').value.trim();
    const phone = document.getElementById('dirPhone').value.trim();
    const whatsapp = document.getElementById('dirWhatsApp').value.trim().replace(/[^0-9]/g, '');
    const respOrScope = document.getElementById('dirResponsibilities').value.trim();
    const props = document.getElementById('dirProperties') ? document.getElementById('dirProperties').value.trim() : '';

    if (type === 'staff') {
      if (mode === 'add') {
        state.staffList.push({
          id: 'st_' + Date.now(),
          cluster,
          name,
          roleBadge: roleOrCat,
          roleClass: 'role-caretaker',
          avatar: '👤',
          responsibilities: respOrScope,
          properties: props || 'Assigned Properties',
          phone,
          whatsapp
        });
      } else {
        const item = state.staffList.find(x => x.id === id);
        if (item) {
          item.cluster = cluster;
          item.name = name;
          item.roleBadge = roleOrCat;
          item.phone = phone;
          item.whatsapp = whatsapp;
          item.responsibilities = respOrScope;
          item.properties = props;
        }
      }
    } else {
      if (mode === 'add') {
        state.vendorsList.push({
          id: 'vd_' + Date.now(),
          cluster,
          category: roleOrCat,
          name,
          meta: respOrScope,
          icon: '🔧',
          phone,
          whatsapp
        });
      } else {
        const item = state.vendorsList.find(x => x.id === id);
        if (item) {
          item.cluster = cluster;
          item.category = roleOrCat;
          item.name = name;
          item.meta = respOrScope;
          item.phone = phone;
          item.whatsapp = whatsapp;
        }
      }
    }

    window.closeDirectoryModal();
    const ok = await saveDirectories();
    if (ok) {
      if (typeof window.showToast === 'function') {
        window.showToast('✅ Directory updated & synced to cloud live!', 'success');
      } else {
        alert('✅ Directory updated & synced to cloud live!');
      }
    }
    window.renderDirectoryManager();
  };

  window.deleteDirectoryItem = async function (type, id) {
    if (!canPraveenManage()) {
      alert('Access Restricted: Only Admin (Praveen) can delete entries.');
      return;
    }

    const item = (type === 'staff' ? state.staffList : state.vendorsList).find(x => x.id === id);
    const label = item ? (item.name || item.category) : 'this item';
    if (!confirm(`Are you sure you want to permanently delete "${label}" from the directory?`)) {
      return;
    }

    if (type === 'staff') {
      state.staffList = state.staffList.filter(x => x.id !== id);
    } else {
      state.vendorsList = state.vendorsList.filter(x => x.id !== id);
    }

    const ok = await saveDirectories();
    if (ok) {
      if (typeof window.showToast === 'function') {
        window.showToast('🗑️ Record deleted & cloud synced.', 'info');
      }
    }
    window.renderDirectoryManager();
  };

})();
