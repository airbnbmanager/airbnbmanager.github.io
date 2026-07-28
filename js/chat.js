// ═══════════════════════════════════════════════════════════
// 💬 TEAM CHAT - Real-time group chat
// ═══════════════════════════════════════════════════════════

(function() {
  const CHAT = {
    messages: [],
    channel: null,
    unreadCount: 0,
    lastSeenId: parseInt(localStorage.getItem('uh_chat_lastseen') || '0'),
    isOpen: false,
    mode: localStorage.getItem('uh_chat_mode') || 'group',  // group | GOM | VIL | dm
    dmUserId: localStorage.getItem('uh_chat_dm_user') || null,
    dmUserName: localStorage.getItem('uh_chat_dm_name') || null,
    users: []  // for DM selector
  };

  // ─── Fetch messages (filtered by mode) ───
  async function loadMessages() {
    let query = sb.from('chat_messages').select('*').order('created_at', { ascending: true }).limit(200);

    if (CHAT.mode === 'group') {
      query = query.or('chat_type.is.null,chat_type.eq.group');
    } else if (CHAT.mode === 'GOM' || CHAT.mode === 'VIL') {
      query = query.eq('chat_type', 'property').eq('property_id', CHAT.mode);
    } else if (CHAT.mode === 'dm' && CHAT.dmUserId) {
      // Show messages between me and selected user (both directions)
      query = query.eq('chat_type', 'dm')
        .or(`and(user_id.eq.${SESSION.userId},recipient_user_id.eq.${CHAT.dmUserId}),and(user_id.eq.${CHAT.dmUserId},recipient_user_id.eq.${SESSION.userId})`);
    } else if (CHAT.mode === 'dm' && !CHAT.dmUserId) {
      CHAT.messages = [];
      updateUnread();
      return;
    }

    const { data, error } = await query;
    if (error) return console.warn('Chat load error:', error);
    CHAT.messages = data || [];
    updateUnread();
  }

  // ─── Fetch users for DM selector ───
  async function loadDMUsers() {
    if (CHAT.users.length > 0) return CHAT.users;
    const { data } = await sb.from('profiles')
      .select('user_id, display_name, role')
      .eq('is_approved', true)
      .neq('user_id', SESSION.userId)
      .order('display_name');
    CHAT.users = data || [];
    return CHAT.users;
  }

  // ─── Switch mode ───
  window.switchChatMode = async function(mode, dmUserId, dmUserName) {
    CHAT.mode = mode;
    localStorage.setItem('uh_chat_mode', mode);
    if (mode === 'dm') {
      if (dmUserId) {
        CHAT.dmUserId = dmUserId;
        CHAT.dmUserName = dmUserName || 'User';
        localStorage.setItem('uh_chat_dm_user', dmUserId);
        localStorage.setItem('uh_chat_dm_name', CHAT.dmUserName);
      }
    } else {
      CHAT.dmUserId = null;
      CHAT.dmUserName = null;
    }
    await renderChat();
  };

  // ─── Show DM user picker ───
  window.showDMPicker = async function() {
    const users = await loadDMUsers();
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.zIndex = '99999';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
    let userList = '';
    users.forEach(u => {
      const initial = (u.display_name || '?').charAt(0).toUpperCase();
      userList += '<div onclick="window.startDM(\'' + u.user_id + '\',\'' + (u.display_name || 'User').replace(/'/g, "\\'") + '\')" style="display:flex;align-items:center;gap:10px;padding:12px;border-bottom:1px solid #eee;cursor:pointer;">' +
        '<div style="width:40px;height:40px;border-radius:50%;background:#128C7E;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;">' + initial + '</div>' +
        '<div><div style="font-weight:600;">' + (u.display_name || 'User') + '</div>' +
        '<div style="font-size:11px;color:#888;">' + (u.role || '') + '</div></div>' +
        '</div>';
    });
    modal.innerHTML = '<div class="modal-box" style="max-width:400px;max-height:70vh;overflow-y:auto;">' +
      '<button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">✕</button>' +
      '<h2>💬 Select User to DM</h2>' +
      (userList || '<div style="text-align:center;color:#888;padding:20px;">No users</div>') +
      '</div>';
    document.body.appendChild(modal);
  };

  window.startDM = function(userId, userName) {
    document.querySelector('.modal-overlay')?.remove();
    window.switchChatMode('dm', userId, userName);
  };

  // ─── Render chat page ───
  async function renderChat() {
    CHAT.isOpen = true;
    await loadMessages();

    // Mark all as read
    if (CHAT.messages.length > 0) {
      CHAT.lastSeenId = CHAT.messages[CHAT.messages.length - 1].id;
      localStorage.setItem('uh_chat_lastseen', CHAT.lastSeenId.toString());
      CHAT.unreadCount = 0;
      updateChatBadge();
    }

    const appEl = document.getElementById('mainContent') || document.getElementById('app');
    if (!appEl) return;

    // Inject chat CSS once
    if (!document.getElementById('chat-mobile-css')) {
      const css = document.createElement('style');
      css.id = 'chat-mobile-css';
      css.textContent = `
        .uh-chat-root {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          background: #fafafa;
          z-index: 9999;
          padding-top: env(safe-area-inset-top, 0px);
        }
        .uh-chat-header {
          flex: 0 0 auto;
          padding: 12px 14px;
          background: #1a1f26;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .uh-chat-messages {
          flex: 1 1 auto;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 12px;
          background: #fafafa;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
        .uh-chat-input-bar {
          flex: 0 0 auto;
          padding: 10px;
          padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
          background: #fff;
          border-top: 1px solid #e5e5e5;
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .uh-chat-input {
          flex: 1 1 auto;
          min-width: 0;
          padding: 12px 14px;
          border: 1px solid #ddd;
          border-radius: 24px;
          font-size: 16px;
          outline: none;
          background: #fff;
          color: #111;
          -webkit-appearance: none;
          appearance: none;
        }
        .uh-chat-input:focus {
          border-color: #25D366;
        }
        .uh-chat-send {
          flex: 0 0 auto;
          background: #25D366;
          color: #fff;
          border: none;
          padding: 0 18px;
          height: 44px;
          border-radius: 24px;
          font-weight: 600;
          cursor: pointer;
          min-width: 70px;
          font-size: 14px;
        }
        .uh-chat-send:active { background: #128C7E; }
        @media (max-width: 768px) {
          .uh-chat-root { padding-top: env(safe-area-inset-top, 0px); }
        }
        body.uh-chat-active { overflow: hidden; }
        body.uh-chat-active .bottom-nav,
        body.uh-chat-active #bottomNav,
        body.uh-chat-active .bottomNav,
        body.uh-chat-active .drawer,
        body.uh-chat-active #drawer,
        body.uh-chat-active .drawer-overlay,
        body.uh-chat-active #drawerOverlay,
        body.uh-chat-active .top-bar,
        body.uh-chat-active #topBar,
        body.uh-chat-active .header,
        body.uh-chat-active .sidebar { display: none !important; }
        .uh-chat-imgbtn {
          flex: 0 0 auto;
          font-size: 22px;
          padding: 8px 10px;
          cursor: pointer;
          background: #f0f0f0;
          border-radius: 20px;
          user-select: none;
          border: 1px solid #ddd;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 42px;
          height: 42px;
        }
        .uh-chat-imgbtn:active { background: #e0e0e0; }
        .uh-chat-img-msg {
          max-width: 220px;
          max-height: 280px;
          border-radius: 8px;
          cursor: pointer;
          margin: 4px 0;
          display: block;
          background: #f0f0f0;
        }
        .uh-chat-img-fullscreen {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.95);
          z-index: 100000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .uh-chat-img-fullscreen img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .uh-chat-img-fullscreen .close-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(255,255,255,0.2);
          color: #fff;
          border: none;
          font-size: 28px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          cursor: pointer;
        }
        .uh-chat-uploading {
          opacity: 0.6;
          pointer-events: none;
        }
        .uh-chat-tabs {
          flex: 0 0 auto;
          display: flex;
          background: #fff;
          border-bottom: 1px solid #e5e5e5;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .uh-chat-tab {
          flex: 1 0 auto;
          padding: 10px 14px;
          background: transparent;
          border: none;
          border-bottom: 3px solid transparent;
          color: #666;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .uh-chat-tab:hover { background: #f5f5f5; color: #222; }
        .uh-chat-tab.active {
          color: #128C7E;
          border-bottom-color: #128C7E;
        }
      `;
      document.head.appendChild(css);
    }

    document.body.classList.add('uh-chat-active');

    appEl.innerHTML = `
      <div class="uh-chat-root">
        <div class="uh-chat-header">
          <div onclick="window.navigate && window.navigate('dashboard')" style="font-size:20px;cursor:pointer;padding:4px 10px;margin-left:-6px;">←</div>
          <div style="font-size:22px;">💬</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:15px;">${
              CHAT.mode === 'group' ? 'Team Chat' :
              CHAT.mode === 'GOM' ? '🏢 Gomti Chat' :
              CHAT.mode === 'VIL' ? '🏢 Villa Chat' :
              CHAT.mode === 'dm' && CHAT.dmUserName ? '👤 ' + CHAT.dmUserName :
              CHAT.mode === 'dm' ? 'Select user' : 'Team Chat'
            }</div>
            <div style="font-size:11px;opacity:0.7;" id="chatOnlineText">Loading...</div>
          </div>
          <div onclick="window.navigate && window.navigate('dashboard')" style="font-size:22px;cursor:pointer;padding:4px 10px;opacity:0.8;">✕</div>
        </div>
        <div class="uh-chat-tabs">
          <button class="uh-chat-tab ${CHAT.mode === 'group' ? 'active' : ''}" onclick="window.switchChatMode('group')">🌐 All</button>
          <button class="uh-chat-tab ${CHAT.mode === 'GOM' ? 'active' : ''}" onclick="window.switchChatMode('GOM')">🏢 GOM</button>
          <button class="uh-chat-tab ${CHAT.mode === 'VIL' ? 'active' : ''}" onclick="window.switchChatMode('VIL')">🏢 VIL</button>
          <button class="uh-chat-tab ${CHAT.mode === 'dm' ? 'active' : ''}" onclick="window.showDMPicker()">👤 DM</button>
        </div>
        <div id="chatMessages" class="uh-chat-messages">
          ${renderMessagesList()}
        </div>
        <div class="uh-chat-input-bar">
          <label for="chatImgInput" class="uh-chat-imgbtn" title="Send image">📷</label>
          <input id="chatImgInput" type="file" accept="image/*" style="display:none;" onchange="window.uploadChatImage(this)" />
          <input
            id="chatInput"
            type="text"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="sentences"
            placeholder="Type a message..."
            class="uh-chat-input"
            onkeydown="if(event.key==='Enter'){event.preventDefault();window.sendChatMessage();}"
          />
          <button onclick="window.sendChatMessage()" class="uh-chat-send">Send</button>
        </div>
      </div>
    `;

    // Scroll to bottom
    setTimeout(() => {
      const box = document.getElementById('chatMessages');
      if (box) box.scrollTop = box.scrollHeight;
      const input = document.getElementById('chatInput');
      if (input) input.focus();
    }, 100);

    updateOnlineCount();
  }

  function renderMessagesList() {
    if (CHAT.messages.length === 0) {
      return `<div style="text-align:center;color:#999;padding:60px 20px;">
        <div style="font-size:48px;">💬</div>
        <div style="margin-top:10px;">No messages yet. Say hi to the team! 👋</div>
      </div>`;
    }

    let lastDate = '';
    let html = '';

    CHAT.messages.forEach(m => {
      const date = new Date(m.created_at);
      const dateStr = date.toDateString();
      const isMine = m.user_id === SESSION.userId;
      const canDelete = isMine || (window.canDelete && window.canDelete());

      // Date separator
      if (dateStr !== lastDate) {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        let label = dateStr;
        if (dateStr === today) label = 'Today';
        else if (dateStr === yesterday) label = 'Yesterday';
        else label = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

        html += `<div style="text-align:center;margin:14px 0;">
          <span style="background:#e5e5e5;color:#666;padding:4px 12px;border-radius:12px;font-size:11px;font-weight:600;">${label}</span>
        </div>`;
        lastDate = dateStr;
      }

      const time = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

      html += `
        <div style="display:flex;justify-content:${isMine ? 'flex-end' : 'flex-start'};margin-bottom:6px;">
          <div style="max-width:75%;background:${isMine ? '#DCF8C6' : '#fff'};border-radius:12px;padding:8px 12px;box-shadow:0 1px 1px rgba(0,0,0,0.08);position:relative;">
            ${!isMine ? `<div style="font-size:11px;font-weight:700;color:#E2725B;margin-bottom:2px;">${m.user_name}</div>` : ''}
            ${m.image_path ? `<img class="uh-chat-img-msg" src="${window.chatImageUrl(m.image_path)}" onclick="window.openChatImage('${m.image_path}')" alt="Chat image" />` : ''}
            ${m.message ? `<div style="font-size:14px;color:#111;word-wrap:break-word;">${escapeHtml(m.message)}</div>` : ''}
            <div style="font-size:10px;color:#888;text-align:right;margin-top:2px;">
              ${time}
              ${canDelete ? `<span onclick="window.deleteChatMsg(${m.id})" style="margin-left:8px;cursor:pointer;color:#999;" title="Delete">🗑</span>` : ''}
            </div>
          </div>
        </div>
      `;
    });

    return html;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ─── Image URL helper ───
  window.chatImageUrl = function(path) {
    if (!path) return '';
    const { data } = sb.storage.from('chat-images').getPublicUrl(path);
    return data?.publicUrl || '';
  };

  // ─── Open image fullscreen ───
  window.openChatImage = function(path) {
    const url = window.chatImageUrl(path);
    if (!url) return;
    const overlay = document.createElement('div');
    overlay.className = 'uh-chat-img-fullscreen';
    overlay.innerHTML = '<button class="close-btn">✕</button><img src="' + url + '" alt="Full image" />';
    overlay.onclick = () => overlay.remove();
    document.body.appendChild(overlay);
  };

  // ─── Upload image ───
  window.uploadChatImage = async function(fileInput) {
    const file = fileInput?.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      if (window.fsn) fsn.error('Too Large', 'Image must be under 5MB');
      fileInput.value = '';
      return;
    }

    const imgBtn = document.querySelector('.uh-chat-imgbtn');
    if (imgBtn) imgBtn.classList.add('uh-chat-uploading');

    try {
      let uploadFile = file;
      if (window.smartCompress) {
        try { uploadFile = await window.smartCompress(file); } catch(e) {}
      }

      const ts = Date.now();
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = SESSION.userId + '/' + ts + '.' + ext;

      const { error: upErr } = await sb.storage
        .from('chat-images')
        .upload(path, uploadFile, { contentType: file.type || 'image/jpeg', upsert: false });

      if (upErr) throw upErr;

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error: msgErr } = await sb.from('chat_messages').insert({
        user_id: SESSION.userId,
        user_name: SESSION.displayName || 'User',
        message: '',
        image_path: path,
        expires_at: expiresAt,
        chat_type: CHAT.mode === 'dm' ? 'dm' : (CHAT.mode === 'group' ? 'group' : 'property'),
        property_id: (CHAT.mode === 'GOM' || CHAT.mode === 'VIL') ? CHAT.mode : null,
        recipient_user_id: CHAT.mode === 'dm' ? CHAT.dmUserId : null
      });

      if (msgErr) throw msgErr;

      if (window.fsn) fsn.success('Sent', 'Image sent (auto-delete in 24hr)');
    } catch (e) {
      console.error('Image upload failed:', e);
      if (window.fsn) fsn.error('Upload Failed', e.message || 'Try again');
    } finally {
      if (imgBtn) imgBtn.classList.remove('uh-chat-uploading');
      fileInput.value = '';
    }
  };

  // ─── Send message ───
  window.sendChatMessage = async function() {
    const input = document.getElementById('chatInput');
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;

    if (CHAT.mode === 'dm' && !CHAT.dmUserId) {
      if (window.fsn) fsn.warning('Select User', 'Pick a user first');
      return;
    }

    input.value = '';
    input.disabled = true;

    const payload = {
      user_id: SESSION.userId,
      user_name: SESSION.displayName || 'User',
      message: msg,
      chat_type: CHAT.mode === 'dm' ? 'dm' : (CHAT.mode === 'group' ? 'group' : 'property'),
      property_id: (CHAT.mode === 'GOM' || CHAT.mode === 'VIL') ? CHAT.mode : null,
      recipient_user_id: CHAT.mode === 'dm' ? CHAT.dmUserId : null
    };

    try {
      const { error } = await sb.from('chat_messages').insert(payload);
      if (error) throw error;
    } catch (e) {
      if (window.fsn) fsn.error('Send Failed', e.message);
      input.value = msg;
    } finally {
      input.disabled = false;
      input.focus();
    }
  };

  // ─── Delete message ───
  window.deleteChatMsg = async function(id) {
    if (!confirm('Delete this message?')) return;
    try {
      const { error } = await sb.from('chat_messages').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      if (window.fsn) fsn.error('Delete Failed', e.message);
    }
  };

  // ─── Realtime subscription ───
  function startRealtime() {
    if (CHAT.channel) return;

    CHAT.channel = sb.channel('chat-messages')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const m = payload.new;
          const isMine = m.user_id === SESSION.userId;

          // ═══ NOTIFICATION LOGIC (independent of current mode) ═══
          // Show notification for ANY relevant message (not from self)
          if (!isMine && window.notifications) {
            // Determine if THIS user should be notified for this message
            const shouldNotify = (
              // Group chat → notify everyone
              (!m.chat_type || m.chat_type === 'group') ||
              // Property chat (GOM/VIL) → notify everyone (open access)
              (m.chat_type === 'property') ||
              // DM → notify only recipient
              (m.chat_type === 'dm' && m.recipient_user_id === SESSION.userId)
            );

            if (shouldNotify) {
              // Skip toast if chat OPEN and in matching mode
              const inSameView = (
                CHAT.isOpen && (
                  (CHAT.mode === 'group' && (!m.chat_type || m.chat_type === 'group')) ||
                  ((CHAT.mode === 'GOM' || CHAT.mode === 'VIL') && m.chat_type === 'property' && m.property_id === CHAT.mode) ||
                  (CHAT.mode === 'dm' && m.chat_type === 'dm' &&
                   (m.user_id === CHAT.dmUserId && m.recipient_user_id === SESSION.userId))
                )
              );

              if (!inSameView) {
                // Build notification title based on chat type
                let title = m.user_name || 'New message';
                if (m.chat_type === 'property' && m.property_id) {
                  title = '🏢 ' + m.property_id + ' — ' + (m.user_name || 'User');
                } else if (m.chat_type === 'dm') {
                  title = '👤 ' + (m.user_name || 'User') + ' (DM)';
                }

                const previewMsg = m.image_path ? '📷 Sent an image' : (m.message || '').substring(0, 100);

                window.notifications.notify({
                  type: 'chat',
                  icon: '💬',
                  title: title,
                  message: previewMsg,
                  page: 'chat',
                  sound: 'info'
                });
              }
            }
          }

          // ═══ UPDATE UI (only if matches current mode) ═══
          const matchesMode = (
            (CHAT.mode === 'group' && (!m.chat_type || m.chat_type === 'group')) ||
            ((CHAT.mode === 'GOM' || CHAT.mode === 'VIL') && m.chat_type === 'property' && m.property_id === CHAT.mode) ||
            (CHAT.mode === 'dm' && m.chat_type === 'dm' &&
             ((m.user_id === SESSION.userId && m.recipient_user_id === CHAT.dmUserId) ||
              (m.user_id === CHAT.dmUserId && m.recipient_user_id === SESSION.userId)))
          );

          if (!matchesMode) {
            // Still update unread count for other views
            updateUnread();
            return;
          }

          CHAT.messages.push(m);
          if (CHAT.isOpen) {
            const box = document.getElementById('chatMessages');
            if (box) {
              box.innerHTML = renderMessagesList();
              box.scrollTop = box.scrollHeight;
            }
            CHAT.lastSeenId = m.id;
            localStorage.setItem('uh_chat_lastseen', CHAT.lastSeenId.toString());
          } else {
            updateUnread();
          }
        })
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          CHAT.messages = CHAT.messages.filter(m => m.id !== payload.old.id);
          if (CHAT.isOpen) {
            const box = document.getElementById('chatMessages');
            if (box) box.innerHTML = renderMessagesList();
          }
        })
      .subscribe(s => console.log('💬 Chat channel:', s));
  }

  function updateUnread() {
    CHAT.unreadCount = CHAT.messages.filter(m =>
      m.id > CHAT.lastSeenId && m.user_id !== SESSION.userId
    ).length;
    updateChatBadge();
  }

  function updateChatBadge() {
    document.querySelectorAll('.chat-badge').forEach(b => {
      if (CHAT.unreadCount > 0) {
        b.textContent = CHAT.unreadCount > 99 ? '99+' : CHAT.unreadCount;
        b.style.display = 'flex';
      } else {
        b.style.display = 'none';
      }
    });
  }

  async function updateOnlineCount() {
    try {
      const { data } = await sb.from('profiles')
        .select('user_id')
        .gte('last_seen', new Date(Date.now() - 120000).toISOString());
      const el = document.getElementById('chatOnlineText');
      if (el) el.textContent = `${(data || []).length} online now`;
    } catch(e) {}
  }

  // Detect leaving chat page
  const origNav = window.navigate;
  if (origNav && !window._chatNavWrapped) {
    window.navigate = function(page) {
      if (page !== 'chat') {
        CHAT.isOpen = false;
        document.body.classList.remove('uh-chat-active');
      }
      return origNav.apply(this, arguments);
    };
    window._chatNavWrapped = true;
  }

  // Auto-start realtime when session ready
  const timer = setInterval(() => {
    if (window.sb && window.SESSION && window.SESSION.userId) {
      clearInterval(timer);
      loadMessages();
      startRealtime();
      console.log('💬 Chat ready');
    }
  }, 1000);

  // Expose
  window.renderChat = renderChat;
})();
