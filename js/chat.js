// ═══════════════════════════════════════════════════════════
// 💬 TEAM CHAT - Real-time group chat
// ═══════════════════════════════════════════════════════════

(function() {
  const CHAT = {
    messages: [],
    channel: null,
    unreadCount: 0,
    lastSeenId: parseInt(localStorage.getItem('uh_chat_lastseen') || '0'),
    isOpen: false
  };

  // ─── Fetch messages ───
  async function loadMessages() {
    const { data, error } = await sb.from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(200);
    if (error) return console.warn('Chat load error:', error);
    CHAT.messages = data || [];
    updateUnread();
  }

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

    appEl.innerHTML = `
      <div class="wrap" style="padding:0;display:flex;flex-direction:column;height:calc(100vh - 130px);">
        <div style="padding:14px;background:#1a1f26;color:#fff;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:10;">
          <div style="font-size:22px;">💬</div>
          <div>
            <div style="font-weight:700;font-size:15px;">Team Chat</div>
            <div style="font-size:11px;opacity:0.7;" id="chatOnlineText">Loading...</div>
          </div>
        </div>

        <div id="chatMessages" style="flex:1;overflow-y:auto;padding:12px;background:#fafafa;-webkit-overflow-scrolling:touch;">
          ${renderMessagesList()}
        </div>

        <div style="padding:10px;background:#fff;border-top:1px solid #e5e5e5;display:flex;gap:8px;position:sticky;bottom:0;">
          <input
            id="chatInput"
            type="text"
            placeholder="Type a message..."
            style="flex:1;padding:12px 14px;border:1px solid #ddd;border-radius:24px;font-size:14px;outline:none;"
            onkeydown="if(event.key==='Enter'){event.preventDefault();window.sendChatMessage();}"
          />
          <button
            onclick="window.sendChatMessage()"
            style="background:#25D366;color:#fff;border:none;padding:0 18px;border-radius:24px;font-weight:600;cursor:pointer;min-width:70px;"
          >Send</button>
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
            <div style="font-size:14px;color:#111;word-wrap:break-word;">${escapeHtml(m.message)}</div>
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

  // ─── Send message ───
  window.sendChatMessage = async function() {
    const input = document.getElementById('chatInput');
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;

    input.value = '';
    input.disabled = true;

    try {
      const { error } = await sb.from('chat_messages').insert({
        user_id: SESSION.userId,
        user_name: SESSION.displayName || 'User',
        message: msg
      });
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
          CHAT.messages.push(payload.new);
          if (CHAT.isOpen) {
            // Update UI
            const box = document.getElementById('chatMessages');
            if (box) {
              box.innerHTML = renderMessagesList();
              box.scrollTop = box.scrollHeight;
            }
            // Mark as read
            CHAT.lastSeenId = payload.new.id;
            localStorage.setItem('uh_chat_lastseen', CHAT.lastSeenId.toString());
          } else {
            // Show unread badge
            updateUnread();
            // Notification
            if (payload.new.user_id !== SESSION.userId && window.notifications) {
              window.notifications.notify({
                type: 'chat',
                icon: '💬',
                title: payload.new.user_name,
                message: payload.new.message.substring(0, 100),
                page: 'chat',
                sound: 'info'
              });
            }
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
      if (page !== 'chat') CHAT.isOpen = false;
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
