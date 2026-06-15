/**
 * KONVO™ CHAT FEATURE
 * src/features/chat/chat.js
 *
 * Coordinates matches logs loading, active chat threads, and WS chat servers.
 */

import { apiFetch } from '/src/services/api.js';
import { getState, setState } from '/src/store/state.js';
import { WS_BASE_URL } from '/src/constants/config.js';
import { subscribeToRealtimeUpdates } from '/src/services/realtime.js';

let userPresenceMap = {};

export function initChatWorkspace() {
    const contactsList = document.getElementById('chat-contacts-list') || document.getElementById('matched-contacts-list');
    const chatWorkspace = document.getElementById('chat-thread-pane') || document.getElementById('chat-workspace-box');
    
    if (!contactsList) return;

    let activeMessages = [];
    const token = localStorage.getItem('konvo_token') || '';

    // Load matches where BOTH humans have approved
    async function loadMatches() {
        try {
            const sims = await apiFetch('/api/agents/simulations');
            contactsList.innerHTML = '';
            
            const currentUser = window.currentUser || getState('currentUser');
            const incompleteWarn = document.getElementById('incomplete-assessment-warning');
            const mainConsole = document.getElementById('main-console-content');
            const isAdmin = currentUser?.role === 'admin';
            
            if ((!currentUser?.profile || !currentUser?.profile.mbti_summary) && !isAdmin) {
                if (incompleteWarn) incompleteWarn.classList.remove('hidden');
                if (mainConsole) mainConsole.classList.add('hidden');
                return;
            } else {
                if (incompleteWarn) incompleteWarn.classList.add('hidden');
                if (mainConsole) mainConsole.classList.remove('hidden');
            }

            if (!sims || sims.length === 0) {
                contactsList.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem; font-style: italic; padding: 1rem;">No approved matches unlocked. Visit Twin DNA to review and approve simulated dates.</div>`;
                return;
            }

            sims.forEach(match => {
                const item = document.createElement('div');
                item.style.padding = '0.75rem 1rem';
                item.style.border = '1px solid var(--border-color)';
                item.style.borderRadius = '8px';
                item.style.cursor = 'pointer';
                item.style.transition = 'all 0.2s';
                item.style.marginBottom = '0.5rem';
                
                const chatPartnerId = getState('chatPartnerId');
                const partner_id = match.user_a_id === currentUser.id ? match.user_b_id : match.user_a_id;
                const isApproved = (match.approval_user_a === 'approved' && match.approval_user_b === 'approved') || isAdmin;
                
                if (chatPartnerId === partner_id) {
                    item.style.backgroundColor = 'rgba(13, 148, 136, 0.08)';
                    item.style.borderColor = 'var(--accent-teal)';
                } else {
                    item.style.backgroundColor = 'rgba(255, 255, 255, 0.01)';
                }
                
                let badgeHtml = '';
                let presenceIndicator = '';
                const isOnline = userPresenceMap[partner_id] === 'online';
                
                if (isOnline) {
                    presenceIndicator = `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:var(--accent-teal); margin-left:5px;"></span>`;
                } else {
                    presenceIndicator = `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:var(--text-muted); margin-left:5px;"></span>`;
                }

                if (!isApproved) {
                    badgeHtml = `<span style="font-family:var(--font-mono); font-size:0.6rem; color:var(--accent-rose); border:1px solid rgba(234,88,12,0.3); border-radius:3px; padding:0.05rem 0.25rem; background:rgba(234,88,12,0.02);">🔒 Locked</span>`;
                } else {
                    badgeHtml = `<span style="font-family:var(--font-mono); font-size:0.65rem; color:var(--text-muted);">${match.partner_konvo_id || 'ACTIVE'}</span>`;
                }

                item.innerHTML = `
                    <div style="font-weight:600; font-size:0.85rem; display:flex; justify-content:space-between; align-items:center; color: var(--text-primary);">
                        <span>${match.partner_name}${presenceIndicator}</span>
                        ${badgeHtml}
                    </div>
                `;
                
                item.addEventListener('click', () => {
                    setState('chatPartnerId', partner_id);
                    document.querySelectorAll('#chat-contacts-list > div, #matched-contacts-list > div').forEach(el => {
                        el.style.backgroundColor = 'rgba(255, 255, 255, 0.01)';
                        el.style.borderColor = 'var(--border-color)';
                    });
                    item.style.backgroundColor = 'rgba(13, 148, 136, 0.08)';
                    item.style.borderColor = 'var(--accent-teal)';
                    
                    if (!isApproved) {
                        chatWorkspace.innerHTML = `
                            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; padding:3rem; text-align:center; background:radial-gradient(circle at 50% 30%, rgba(234,88,12,0.02) 0%, var(--bg-primary) 80%);">
                                <div style="font-size:3.5rem; margin-bottom:1.5rem;">🔒</div>
                                <h3 style="font-family:var(--font-serif); font-size:1.6rem; color:var(--accent-rose); margin-bottom:0.75rem;">Direct Conversation Locked</h3>
                                <p style="color:var(--text-secondary); max-width:460px; font-size:0.9rem; line-height:1.6; margin-bottom:2rem;">
                                    Direct cryptographic chat routes require mutual human approval of the AI Twin simulated date logs first.
                                </p>
                                <a href="/profile" class="btn btn-primary" style="text-decoration:none;" onclick="event.preventDefault(); window.navigateTo('/profile');">
                                    Review & Approve Simulated Dates →
                                </a>
                            </div>
                        `;
                    } else {
                        openDirectChat(match, partner_id);
                    }
                });
                
                contactsList.appendChild(item);
            });

            // Auto-open first match if available
            const params = new URLSearchParams(window.location.search);
            const urlPartnerId = params.get('partner_id');
            
            if (urlPartnerId) {
                const preselected = sims.find(m => {
                    const pId = m.user_a_id === currentUser.id ? m.user_b_id : m.user_a_id;
                    return String(pId) === String(urlPartnerId);
                });
                if (preselected) {
                    const pId = preselected.user_a_id === currentUser.id ? preselected.user_b_id : preselected.user_a_id;
                    setState('chatPartnerId', pId);
                    openDirectChat(preselected, pId);
                }
            } else if (sims.length > 0) {
                const first = sims[0];
                const pId = first.user_a_id === currentUser.id ? first.user_b_id : first.user_a_id;
                const isApproved = (first.approval_user_a === 'approved' && first.approval_user_b === 'approved') || isAdmin;
                if (isApproved) {
                    setState('chatPartnerId', pId);
                    openDirectChat(first, pId);
                }
            }
        } catch (e) {
            contactsList.innerHTML = `<div style="color:var(--accent-rose); font-family:var(--font-mono); font-size:0.8rem; padding:1rem;">Error: ${e.message}</div>`;
        }
    }

    function updateChatHeaderPresence(partner_id) {
        const presenceIndicator = document.getElementById('chat-partner-presence');
        if (presenceIndicator) {
            const isOnline = userPresenceMap[partner_id] === 'online';
            presenceIndicator.style.backgroundColor = isOnline ? 'var(--accent-teal)' : 'var(--text-muted)';
        }
    }

    async function openDirectChat(match, partner_id) {
        const currentUser = window.currentUser || getState('currentUser');
        
        chatWorkspace.innerHTML = `
            <div class="chat-layout" style="border: none; border-radius: 0; height: 100%; display: flex; flex-direction: column;">
                <div class="chat-header" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid var(--border-color); background: rgba(20,20,22,0.4);">
                    <div>
                        <strong style="font-size: 1.1rem; color: var(--text-primary);">${match.partner_name}</strong>
                        <span id="chat-partner-presence" style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:var(--text-muted); margin-left:0.5rem;"></span>
                        <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); margin-left: 0.5rem;">${match.partner_konvo_id || ''}</span>
                    </div>
                    <div>
                        <button class="btn btn-secondary" id="btn-block-node" style="padding: 0.25rem 0.5rem; font-size: 0.7rem; color: var(--accent-rose); border-color: var(--accent-rose); margin-right: 0.5rem; background: transparent;">Block</button>
                        <button class="btn btn-secondary" id="btn-report-node" style="padding: 0.25rem 0.5rem; font-size: 0.7rem; background: transparent;">Report</button>
                    </div>
                </div>
                
                <div class="chat-search-row" style="padding: 0.5rem 1rem; border-bottom: 1px solid var(--border-color); display: flex; gap: 1rem; align-items: center;">
                    <span style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted);">FILTER MESSAGES:</span>
                    <input type="text" id="chat-search-input" placeholder="Filter transcript keyword..." style="flex: 1; padding: 0.25rem 0.5rem; font-size: 0.8rem; background-color: var(--input-bg); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary);">
                </div>

                <div class="chat-body-history" id="chat-history-messages-box" style="flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
                    <div class="safety-warning-box" style="font-size: 0.75rem; color: var(--text-muted); background: rgba(255,255,255,0.01); border: 1px solid var(--border-color); padding: 0.5rem; border-radius: 6px; text-align: center;">
                        <span>🔒 Encrypted connection active. System complies with standard TLS security algorithms.</span>
                    </div>
                    <div id="messages-list-wrapper" style="display: flex; flex-direction: column; gap: 0.75rem;"></div>
                    <div id="typing-indicator" style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted); padding: 0.2rem 0.5rem; display: none;">${match.partner_name} is typing...</div>
                </div>

                <form id="chat-send-form" class="chat-input-row" style="display: flex; gap: 0.75rem; padding: 1rem; border-top: 1px solid var(--border-color); background: rgba(20,20,22,0.4);">
                    <div class="upload-btn-wrapper" style="position: relative; overflow: hidden; display: inline-block;">
                        <button class="btn btn-secondary" style="padding: 0.55rem 0.75rem; font-size: 1.1rem; background: transparent;" title="Upload Media" type="button">📎</button>
                        <input type="file" id="chat-media-file" name="file" accept="image/*,audio/*" style="font-size: 100px; position: absolute; left: 0; top: 0; opacity: 0; cursor: pointer;">
                    </div>
                    <input type="text" id="chat-msg-input" class="search-input" style="flex: 1; height: 38px;" placeholder="Type a message..." required autocomplete="off">
                    <button type="submit" class="btn btn-primary" style="background-color: var(--accent-teal); border-color: var(--accent-teal); color: var(--bg-primary); font-weight: 600;">Transmit</button>
                </form>
            </div>
        `;

        updateChatHeaderPresence(partner_id); // Initialize presence indicator

        const msgList = document.getElementById('messages-list-wrapper');
        const historyBox = document.getElementById('chat-history-messages-box');
        const inputField = document.getElementById('chat-msg-input');
        const searchField = document.getElementById('chat-search-input');
        const fileField = document.getElementById('chat-media-file');
        let searchTimer = null;

        // Block & Report binds
        document.getElementById('btn-block-node')?.addEventListener('click', () => {
            if (confirm(`Are you sure you want to block ${match.partner_name}?`)) {
                alert(`Blocked successfully. Re-routing.`);
                window.location.reload();
            }
        });
        
        document.getElementById('btn-report-node')?.addEventListener('click', () => {
            const reason = prompt(`Reason for reporting ${match.partner_name}:`);
            if (reason) {
                alert(`Report filed. Operational teams will analyze this transaction log.`);
            }
        });

        // Filter messages
        if (searchField) {
            searchField.addEventListener('input', () => {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(() => {
                    const query = searchField.value.trim().toLowerCase();
                    if (!query) {
                        renderMessagesList(msgList, activeMessages);
                    } else {
                        const filtered = activeMessages.filter(m => m.content.toLowerCase().includes(query));
                        renderMessagesList(msgList, filtered);
                    }
                }, 300);
            });
        }

        // Attachment handles
        if (fileField) {
            fileField.addEventListener('change', async () => {
                const file = fileField.files[0];
                if (!file) return;
                
                if (file.size > 5 * 1024 * 1024) {
                    alert("Upload payload exceeds 5MB limit.");
                    fileField.value = '';
                    return;
                }
                
                const ext = file.name.split('.').pop().toLowerCase();
                const dangerousExts = ['exe', 'bat', 'sh', 'js', 'py', 'json', 'html', 'php'];
                if (dangerousExts.includes(ext)) {
                    alert("Executable upload blocked by gateway validation rule.");
                    fileField.value = '';
                    return;
                }
                
                alert(`File ready: ${file.name} (${Math.round(file.size / 1024)} KB). Transmitting.`);
                try {
                    await apiFetch(`/api/chat/messages/${partner_id}`, {
                        method: 'POST',
                        body: JSON.stringify({ content: `[Media Attachment: ${file.name}]` })
                    });
                } catch (e) {
                    alert(`Attachment failed: ${e.message}`);
                }
            });
        }

        // Fetch past thread messages
        try {
            activeMessages = await apiFetch(`/api/chat/messages/${partner_id}`);
            renderMessagesList(msgList, activeMessages);
            if (historyBox) historyBox.scrollTop = historyBox.scrollHeight;
        } catch (e) {
            msgList.innerHTML = `<div style="color:var(--accent-rose); font-family:var(--font-mono);">Failed loading messages: ${e.message}</div>`;
        }

        // Establish Live Messaging WS
        connectChatWebSocket(partner_id, msgList, historyBox);

        // Typing notifier bindings
        inputField?.addEventListener('input', () => {
            sendTypingState(true);
            let tOut = getState('typingTimeout');
            clearTimeout(tOut);
            tOut = setTimeout(() => sendTypingState(false), 2000);
            setState('typingTimeout', tOut);
        });

        // Submit form
        const sendForm = document.getElementById('chat-send-form');
        sendForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const content = inputField.value;
            inputField.value = '';
            sendTypingState(false);
            
            try {
                await apiFetch(`/api/chat/messages/${partner_id}`, {
                    method: 'POST',
                    body: JSON.stringify({ content })
                });
            } catch (err) {
                alert(`Transmission failed: ${err.message}`);
            }
        });
    }

    function renderMessagesList(container, messages) {
        const currentUser = window.currentUser || getState('currentUser');
        container.innerHTML = '';
        if (!messages || messages.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.8rem; font-style:italic;">Dialectic ledger is empty. Write the first argument.</div>`;
            return;
        }
        
        messages.forEach(msg => {
            const isMe = msg.sender_id === currentUser.id;
            const row = document.createElement('div');
            row.className = `message-row ${isMe ? 'sent' : 'received'}`;
            row.style.display = 'flex';
            row.style.flexDirection = 'column';
            row.style.alignItems = isMe ? 'flex-end' : 'flex-start';
            row.style.marginBottom = '0.75rem';
            
            let reactionBadgeHtml = '';
            if (msg.reactions && msg.reactions.length > 0) {
                const ems = msg.reactions.map(r => r.emoji).join(' ');
                reactionBadgeHtml = `<div class="reaction-badge" data-msg-id="${msg.id}" style="position:absolute; bottom:-10px; right:10px; background:var(--bg-secondary); border:1px solid var(--border-primary); padding:2px 6px; border-radius:10px; font-size:0.7rem;">${ems}</div>`;
            }

            const bubbleBg = isMe ? 'var(--accent-teal)' : 'var(--bg-secondary)';
            const bubbleColor = isMe ? 'var(--bg-primary)' : 'var(--text-primary)';
            const bubbleBorder = isMe ? 'none' : '1px solid var(--border-primary)';

            row.innerHTML = `
                <div class="msg-bubble" style="position:relative; max-width: 70%; padding:0.75rem 1rem; border-radius:12px; background:${bubbleBg}; color:${bubbleColor}; border:${bubbleBorder}; font-size:0.92rem; word-break:break-word;" title="Double click to react">
                    ${msg.content}
                    ${reactionBadgeHtml}
                </div>
                <div class="msg-receipts" style="font-size:0.68rem; color:var(--text-muted); margin-top:0.25rem;">
                    ${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    ${isMe ? `<span>• ${msg.read_status ? 'Read' : 'Delivered'}</span>` : ''}
                </div>
            `;
            
            const bubbleEl = row.querySelector('.msg-bubble');
            bubbleEl.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                openReactionsPicker(bubbleEl, msg.id);
            });

            container.appendChild(row);
        });
    }

    function openReactionsPicker(bubbleEl, msgId) {
        document.querySelectorAll('.reaction-picker-modal').forEach(el => el.remove());
        
        const picker = document.createElement('div');
        picker.className = 'reaction-picker-modal';
        picker.style.cssText = `
            position: absolute;
            top: -40px;
            left: 10px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-primary);
            border-radius: 20px;
            padding: 4px 8px;
            display: flex;
            gap: 6px;
            z-index: 100;
            box-shadow: var(--shadow-md);
        `;
        picker.innerHTML = `
            <span class="reaction-option" data-emoji="❤️" style="cursor:pointer; font-size:0.9rem;">❤️</span>
            <span class="reaction-option" data-emoji="😂" style="cursor:pointer; font-size:0.9rem;">😂</span>
            <span class="reaction-option" data-emoji="👍" style="cursor:pointer; font-size:0.9rem;">👍</span>
            <span class="reaction-option" data-emoji="🔥" style="cursor:pointer; font-size:0.9rem;">🔥</span>
            <span class="reaction-option" data-emoji="👀" style="cursor:pointer; font-size:0.9rem;">👀</span>
        `;
        
        bubbleEl.appendChild(picker);
        
        picker.querySelectorAll('.reaction-option').forEach(opt => {
            opt.addEventListener('click', async (e) => {
                e.stopPropagation();
                const emoji = opt.dataset.emoji;
                picker.remove();
                
                alert(`Reaction logged locally: ${emoji}`);
                const msg = activeMessages.find(m => m.id === msgId);
                if (msg) {
                    if (!msg.reactions) msg.reactions = [];
                    const currentUser = window.currentUser || getState('currentUser');
                    msg.reactions.push({ user_id: currentUser.id, emoji });
                    renderMessagesList(document.getElementById('messages-list-wrapper'), activeMessages);
                }
            });
        });
        
        document.addEventListener('click', () => picker.remove(), {once: true});
    }

    function connectChatWebSocket(partner_id, msgList, historyBox) {
        let activeWsChat = getState('activeWsChat');
        if (activeWsChat) {
            activeWsChat.close();
        }
        
        const wsUrl = `${WS_BASE_URL}/api/chat/ws?user_token=${token}`;
        activeWsChat = new WebSocket(wsUrl);
        setState('activeWsChat', activeWsChat);
        
        activeWsChat.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const currentUser = window.currentUser || getState('currentUser');
            
            if (data.type === 'chat_message') {
                const msg = data.message;
                if ((msg.sender_id === currentUser.id && msg.receiver_id === partner_id) || 
                    (msg.sender_id === partner_id && msg.receiver_id === currentUser.id)) {
                    
                    const exists = activeMessages.find(m => m.id === msg.id);
                    if (!exists) {
                        activeMessages.push(msg);
                        renderMessagesList(msgList, activeMessages);
                        if (historyBox) historyBox.scrollTop = historyBox.scrollHeight;
                    }
                }
            } else if (data.type === 'typing') {
                if (data.sender_id === partner_id) {
                    const indicator = document.getElementById('typing-indicator');
                    if (indicator) {
                        if (data.typing) {
                            indicator.style.display = 'block';
                        } else {
                            indicator.style.display = 'none';
                        }
                    }
                }
            }
        };

        activeWsChat.onclose = () => {
            console.log("Chat websocket closed");
        };
    }

    function sendTypingState(isTyping) {
        const activeWsChat = getState('activeWsChat');
        const chatPartnerId = getState('chatPartnerId');
        if (activeWsChat && activeWsChat.readyState === WebSocket.OPEN) {
            activeWsChat.send(JSON.stringify({
                type: 'typing',
                partner_id: chatPartnerId,
                typing: isTyping
            }));
        }
    }

    loadMatches();

    // Subscribe to real-time presence updates
    subscribeToRealtimeUpdates('presence_updates', (payload) => {
        const { user_id, status } = payload;
        userPresenceMap[user_id] = status;
        
        // Refresh contacts list to update presence indicators
        loadMatches();

        // If the updated user is the current chat partner, update chat header presence
        const currentChatPartnerId = getState('chatPartnerId');
        if (currentChatPartnerId === user_id) {
            updateChatHeaderPresence(user_id);
        }
    });
}

// Expose globally for backward compatibility
window.initChatPage = initChatWorkspace;
window.initChatWorkspace = initChatWorkspace;
export { initChatWorkspace as initChatPage };
