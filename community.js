(function() {
  'use strict';

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const notify=text=>{let el=document.getElementById('community-status');if(!el){el=document.createElement('p');el.id='community-status';el.setAttribute('role','status');document.querySelector('main').prepend(el)}el.textContent=text;};
  const alert=notify;
  const confirmations=new Map();
  const confirm=text=>{const now=Date.now();if((confirmations.get(text)||0)>now){confirmations.delete(text);return true}confirmations.set(text,now+5000);notify(text+' 再次点击原按钮确认（5秒内）');return false;};
  const STORAGE_NS = 'star-community-demo-v1';
  const BOTS = [
    { id: 'bot-1', name: '星鲸', avatar: 'assets/avatar-whale.webp', label: 'AI 测试机器人' },
    { id: 'bot-2', name: '月狐', avatar: 'assets/avatar-fox.webp', label: 'AI 测试机器人' },
    { id: 'bot-3', name: '糖羽', avatar: 'assets/avatar-pink.webp', label: 'AI 测试机器人' },
    { id: 'bot-4', name: '银星', avatar: 'assets/avatar-silver.webp', label: 'AI 测试机器人' }
  ];

  let state = {
    currentUser: 'user-local',
    friends: [],
    requests: [{id:'bot-2',direction:'incoming',timestamp:Date.now()}],
    blocked: [],
    guilds: [],
    currentGuild: null,
    chatMessages: []
  };

  function loadState() {
    let stored;try{stored=localStorage.getItem(`${STORAGE_NS}:state`)}catch{notify('浏览器禁止保存，仅本次演示有效');}
    if (stored) {
      try {
        const parsed=JSON.parse(stored);if(!parsed||!Array.isArray(parsed.friends)||!Array.isArray(parsed.requests)||!Array.isArray(parsed.blocked)||!Array.isArray(parsed.guilds)||!Array.isArray(parsed.chatMessages))throw Error('Invalid state');
        const ids=['user-local',...BOTS.map(b=>b.id)];parsed.currentUser='user-local';parsed.friends=parsed.friends.filter(f=>BOTS.some(b=>b.id===f.id)).map(f=>BOTS.find(b=>b.id===f.id));parsed.requests=parsed.requests.filter(v=>ids.includes(v.id)&&['incoming','outgoing'].includes(v.direction));parsed.blocked=parsed.blocked.filter(v=>ids.includes(v));parsed.guilds=parsed.guilds.filter(g=>/^guild-[a-zA-Z0-9-]+$/.test(g.id)&&Array.isArray(g.members)&&g.members.every(m=>ids.includes(m))&&g.roles&&typeof g.name==='string'&&typeof g.description==='string');state=parsed;
      } catch (e) {
        console.warn('Invalid stored state:', e);
        initDefaultState();
      }
    } else {
      initDefaultState();
    }
  }

  function initDefaultState() {
    state = {
      currentUser: 'user-local',
      friends: [BOTS[0]],
      requests: [{id:'bot-2',direction:'incoming',timestamp:Date.now()}],
      blocked: [],
      guilds: [
        {
          id: 'guild-1',
          name: '星糖探险队',
          description: '欢迎加入星糖探险队',
          owner: 'user-local',
          members: ['user-local', 'bot-1'],
          roles: { 'user-local': 'owner', 'bot-1': 'member' },
          createdAt: Date.now()
        }
      ],
      currentGuild: null,
      chatMessages: []
    };
    saveState();
  }

  function saveState() {
    try {
      localStorage.setItem(`${STORAGE_NS}:state`, JSON.stringify(state));
    } catch (e) {
      notify('保存失败：当前更改仅本次演示有效，未写入本机');
    }
  }

  function getUserName(userId) {
    const bot = BOTS.find(b => b.id === userId);
    return bot ? bot.name : userId;
  }

  function getUserAvatar(userId) {
    const bot = BOTS.find(b => b.id === userId);
    return bot ? bot.avatar : 'assets/avatar-whale.webp';
  }

  function isBotId(userId) {
    return BOTS.some(b => b.id === userId);
  }

  function isBlocked(userId) {
    return state.blocked.includes(userId);
  }

  function isFriend(userId) {
    return state.friends.some(f => f.id === userId);
  }

  function hasPendingRequest(userId) {
    return state.requests.some(r => r.id === userId && r.direction === 'incoming');
  }

  function hasSentRequest(userId) {
    return state.requests.some(r => r.id === userId && r.direction === 'outgoing');
  }

  function searchFriends(query) {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results = [];
    const allIds = new Set([...BOTS.map(b => b.id), state.currentUser]);
    
    for (const id of allIds) {
      if (id === state.currentUser) continue;
      const name = getUserName(id);
      if (name.toLowerCase().includes(q)) {
        const isBotUser = isBotId(id);
        const status = isFriend(id) ? 'friend' : hasPendingRequest(id) ? 'pending' : hasSentRequest(id) ? 'sent' : isBlocked(id) ? 'blocked' : 'none';
        results.push({
          id,
          name,
          avatar: getUserAvatar(id),
          status,
          isBot: isBotUser,
          botLabel: isBotUser ? 'AI 测试机器人' : null,
          online: isBotUser ? '模拟在线' : null
        });
      }
    }
    return results;
  }

  function addFriend(userId) {
    if (!isBotId(userId)||isFriend(userId)||isBlocked(userId)||hasSentRequest(userId)||hasPendingRequest(userId)) return;
    state.requests.push({ id: userId, direction: 'outgoing', timestamp: Date.now() });
    saveState();
    renderFriends();
  }

  function cancelRequest(userId) {
    state.requests = state.requests.filter(r => !(r.id === userId && r.direction === 'outgoing'));
    saveState();
    renderFriends();
  }

  function acceptRequest(userId) {
    const req = state.requests.find(r => r.id === userId && r.direction === 'incoming');
    if (!req || isBlocked(userId)||isFriend(userId)) return;
    state.requests = state.requests.filter(r => !(r.id === userId && r.direction === 'incoming'));
    const bot = BOTS.find(b => b.id === userId);
    if (bot) {
      state.friends.push({ ...bot, addedAt: Date.now() });
    }
    saveState();
    renderFriends();
  }

  function removeFriend(userId) {
    state.friends = state.friends.filter(f => f.id !== userId);state.requests=state.requests.filter(r=>r.id!==userId);
    saveState();
    renderFriends();
  }

  function blockUser(userId) {
    if (state.blocked.includes(userId)) return;
    state.blocked.push(userId);
    state.friends = state.friends.filter(f => f.id !== userId);
    state.requests = state.requests.filter(r => r.id !== userId);
    saveState();
    renderFriends();
  }

  function unblockUser(userId) {
    state.blocked = state.blocked.filter(id => id !== userId);
    saveState();
    renderFriends();
  }

  function renderFriendCard(friend, status) {
    const div = document.createElement('div');
    div.className = 'friend-card';
    div.setAttribute('data-friend-id', friend.id);
    
    let actionBtn = '';
    if (status === 'friend') {
      actionBtn = `
        <button class="btn-action" aria-label="移除好友" onclick="window.communityApp.removeFriendConfirm('${friend.id}')">✕</button>
      `;
    } else if (status === 'pending') {
      actionBtn = `
        <button class="btn-action accept" aria-label="接受" onclick="window.communityApp.acceptRequest('${friend.id}')">✓</button>
        <button class="btn-action" aria-label="拒绝" onclick="window.communityApp.removeFriendConfirm('${friend.id}')">✕</button>
      `;
    } else if (status === 'sent') {
      actionBtn = `
        <button class="btn-action" aria-label="取消请求" onclick="window.communityApp.cancelRequest('${friend.id}')">取消</button>
      `;
    } else if (status === 'blocked') {
      actionBtn = `
        <button class="btn-action" aria-label="解除屏蔽" onclick="window.communityApp.unblockUser('${friend.id}')">解除屏蔽</button>
      `;
    } else {
      actionBtn = `
        <button class="btn-action" aria-label="添加好友" onclick="window.communityApp.addFriend('${friend.id}')">+添加</button>
      `;
    }

    div.innerHTML = `
      <img src="${esc(getUserAvatar(friend.id))}" alt="${esc(friend.name)}" class="friend-avatar">
      <div class="friend-info">
        <div class="friend-name">${esc(friend.name)}</div>
        ${isBotId(friend.id) ? '<div class="bot-label">AI 测试机器人</div><div class="online-label">模拟在线 · 非真实状态</div>' : ''}
        
      </div>
      <div class="friend-actions">
        ${actionBtn}${status!=='blocked'?`<button class="btn-action" onclick="window.communityApp.blockUser('${friend.id}')">屏蔽</button>`:''}${status==='sent'?`<button class="btn-action" onclick="window.communityApp.simulateAccept('${friend.id}')">模拟机器人接受</button>`:''}
      </div>
    `;
    return div;
  }

  function renderFriends() {
    const tabs = document.querySelectorAll('[data-tab]');
    tabs.forEach(tab => {
      if (tab.getAttribute('data-tab') === 'all') {
        const friendsList = document.getElementById('friends-list');
        const friendsEmpty = document.getElementById('friends-empty');
        if (state.friends.length === 0) {
          friendsList.innerHTML = '';
          friendsEmpty.style.display = 'block';
        } else {
          friendsEmpty.style.display = 'none';
          friendsList.innerHTML = '';
          state.friends.forEach(f => {
            friendsList.appendChild(renderFriendCard(f, 'friend'));
          });
        }
      } else if (tab.getAttribute('data-tab') === 'requests') {
        const requestsList = document.getElementById('requests-list');
        const requestsEmpty = document.getElementById('requests-empty');
        const incomingReqs = state.requests.filter(r => r.direction === 'incoming');
        const badge = document.getElementById('request-count');
        badge.textContent = incomingReqs.length > 0 ? incomingReqs.length : '';
        if (incomingReqs.length === 0) {
          requestsList.innerHTML = '';
          requestsEmpty.style.display = 'block';
        } else {
          requestsEmpty.style.display = 'none';
          requestsList.innerHTML = '';
          incomingReqs.forEach(r => {
            const bot = BOTS.find(b => b.id === r.id) || { id: r.id, name: r.id, avatar: 'assets/avatar-whale.webp' };
            requestsList.appendChild(renderFriendCard(bot, 'pending'));
          });
        }
      } else if (tab.getAttribute('data-tab') === 'blocked') {
        const blockedList = document.getElementById('blocked-list');
        const blockedEmpty = document.getElementById('blocked-empty');
        if (state.blocked.length === 0) {
          blockedList.innerHTML = '';
          blockedEmpty.style.display = 'block';
        } else {
          blockedEmpty.style.display = 'none';
          blockedList.innerHTML = '';
          state.blocked.forEach(id => {
            const bot = BOTS.find(b => b.id === id) || { id, name: id, avatar: 'assets/avatar-whale.webp' };
            blockedList.appendChild(renderFriendCard(bot, 'blocked'));
          });
        }
      }
    });
  }

  function renderSearch(results) {
    const searchList = document.getElementById('search-list');
    searchList.innerHTML = '';
    results.forEach(result => {
      searchList.appendChild(renderFriendCard(result, result.status));
    });
  }

  function createGuild(name, desc) {if(typeof name!=='string'||name.trim().length<2||name.trim().length>32||desc.length>200){notify('公会名需2–32字，简介最多200字');return false;}
    if (!name.trim()) return false;
    const guild = {
      id: 'guild-' + Date.now(),
      name: name.trim(),
      description: desc.trim(),
      owner: state.currentUser,
      members: [state.currentUser],
      roles: { [state.currentUser]: 'owner' },
      createdAt: Date.now()
    };
    state.guilds.push(guild);
    saveState();
    return true;
  }

  function joinGuild(guildId) {
    const guild = state.guilds.find(g => g.id === guildId);
    if (!guild || guild.members.includes(state.currentUser)) return false;
    guild.members.push(state.currentUser);
    guild.roles[state.currentUser] = 'member';
    saveState();
    return true;
  }

  function leaveGuild(guildId) {
    const guild = state.guilds.find(g => g.id === guildId);
    if (!guild || !guild.members.includes(state.currentUser)) return false;
    if (guild.roles[state.currentUser] === 'owner') return false;
    guild.members = guild.members.filter(m => m !== state.currentUser);
    delete guild.roles[state.currentUser];
    saveState();
    return true;
  }

  function disbandGuild(guildId) {
    const guild = state.guilds.find(g => g.id === guildId);
    if (!guild || guild.owner !== state.currentUser) return false;
    state.guilds = state.guilds.filter(g => g.id !== guildId);
    saveState();
    return true;
  }

  function transferOwnership(guildId, newOwnerId) {
    const guild = state.guilds.find(g => g.id === guildId);
    if (!guild || guild.owner !== state.currentUser) return false;
    if (!guild.members.includes(newOwnerId)) return false;
    guild.owner = newOwnerId;
    guild.roles[newOwnerId] = 'owner';
    guild.roles[state.currentUser] = 'admin';
    saveState();
    return true;
  }

  function inviteToGuild(guildId, userId) {
    const guild = state.guilds.find(g => g.id === guildId);
    if (!guild) return false;
    const role = guild.roles[state.currentUser];
    if (role !== 'owner' && role !== 'admin') return false;
    if (!isFriend(userId) || isBlocked(userId)) return false;
    if (guild.members.includes(userId)) return false;
    guild.members.push(userId);
    guild.roles[userId] = 'member';
    saveState();
    return true;
  }

  function removeMember(guildId, userId) {
    const guild = state.guilds.find(g => g.id === guildId);
    if (!guild) return false;
    const role = guild.roles[state.currentUser];
    if (role !== 'owner' && role !== 'admin') return false;
    if (guild.roles[userId] === 'owner'||role==='admin'&&guild.roles[userId]!=='member') return false;
    guild.members = guild.members.filter(m => m !== userId);
    delete guild.roles[userId];
    saveState();
    return true;
  }

  function renderGuildCard(guild) {
    const div = document.createElement('div');
    div.className = 'guild-card';
    div.setAttribute('data-guild-id', guild.id);
    const role = guild.roles[state.currentUser];
    const isMember = guild.members.includes(state.currentUser);
    
    let actionBtn = '';
    if (isMember) {
      actionBtn = `<button class="btn btn-small" onclick="window.communityApp.viewGuild('${guild.id}')">查看</button>`;
    } else {
      actionBtn = `<button class="btn btn-small" onclick="window.communityApp.joinGuild('${guild.id}')">加入</button>`;
    }

    div.innerHTML = `
      <div class="guild-info">
        <h3>${esc(guild.name)}</h3>
        <p>${esc(guild.description)}</p>
        <p class="guild-meta">${guild.members.length} 成员</p>
      </div>
      <div>${actionBtn}</div>
    `;
    return div;
  }

  function renderGuilds() {
    const myGuildsList = document.getElementById('my-guilds-list');
    const myGuildsEmpty = document.getElementById('my-guilds-empty');
    const myGuilds = state.guilds.filter(g => g.members.includes(state.currentUser));
    
    if (myGuilds.length === 0) {
      myGuildsList.innerHTML = '';
      myGuildsEmpty.style.display = 'block';
    } else {
      myGuildsEmpty.style.display = 'none';
      myGuildsList.innerHTML = '';
      myGuilds.forEach(g => {
        myGuildsList.appendChild(renderGuildCard(g));
      });
    }

    const directoryList = document.getElementById('directory-list');
    const directoryEmpty = document.getElementById('directory-empty');
    if (state.guilds.length === 0) {
      directoryList.innerHTML = '';
      directoryEmpty.style.display = 'block';
    } else {
      directoryEmpty.style.display = 'none';
      directoryList.innerHTML = '';
      state.guilds.forEach(g => {
        directoryList.appendChild(renderGuildCard(g));
      });
    }
  }

  function renderGuildDetail(guildId) {
    const guild = state.guilds.find(g => g.id === guildId);
    if (!guild) return;
    
    state.currentGuild = guild;
    const detail = document.getElementById('guild-detail');detail.dataset.guildId=guildId;
    const listSection = document.querySelector('.guilds-section');
    
    listSection.style.display = 'none';
    detail.style.display = 'block';
    
    document.getElementById('detail-guild-name').textContent = guild.name;
    document.getElementById('detail-guild-desc').textContent = guild.description;
    document.getElementById('detail-member-count').textContent = `${guild.members.length} 成员`;
    
    const userRole = guild.roles[state.currentUser];
    document.getElementById('detail-guild-role').textContent = `角色: ${userRole || 'N/A'}`;
    
    const actions = document.getElementById('guild-actions');
    actions.innerHTML = '';
    
    if (guild.members.includes(state.currentUser)) {
      if (userRole === 'owner') {
        actions.innerHTML += `<button class="btn btn-small" onclick="window.communityApp.showInviteDialog('${guildId}')">邀请成员</button>`;
        actions.innerHTML += `<button class="btn btn-small" onclick="window.communityApp.showTransferDialog('${guildId}')">转移所有权</button>`;
        actions.innerHTML += `<button class="btn btn-small danger" onclick="window.communityApp.disbandGuildConfirm('${guildId}')">解散公会</button>`;
      } else if (userRole === 'admin') {
        actions.innerHTML += `<button class="btn btn-small" onclick="window.communityApp.showInviteDialog('${guildId}')">邀请成员</button>`;
        actions.innerHTML += `<button class="btn btn-small" onclick="window.communityApp.leaveGuildConfirm('${guildId}')">退出</button>`;
      } else {
        actions.innerHTML += `<button class="btn btn-small" onclick="window.communityApp.leaveGuildConfirm('${guildId}')">退出</button>`;
      }
    } else {
      actions.innerHTML += `<button class="btn btn-small" onclick="window.communityApp.joinGuild('${guildId}')">加入</button>`;
    }
    
    const membersList = document.getElementById('guild-members-list');
    membersList.innerHTML = '';
    document.getElementById('member-list-count').textContent = guild.members.length;
    
    guild.members.forEach(memberId => {
      const memberDiv = document.createElement('div');
      memberDiv.className = 'member-item';
      const memberRole = guild.roles[memberId];
      const memberName = getUserName(memberId);
      const memberAvatar = getUserAvatar(memberId);
      const isBotMember = isBotId(memberId);
      
      let removeBtn = '';
      if ((userRole === 'owner' || userRole === 'admin') && memberId !== state.currentUser && memberRole !== 'owner') {
        removeBtn = `<button class="btn-action" onclick="window.communityApp.removeMember('${guildId}', '${memberId}')">移除</button>`;
      }
      
      memberDiv.innerHTML = `
        <img src="${memberAvatar}" alt="${esc(memberName)}" class="member-avatar">
        <div class="member-info">
          <div class="member-name">${esc(memberName)}</div>
          <div class="member-role">${memberRole}</div>
          ${isBotMember ? `<div class="bot-label">AI 测试机器人</div>` : ''}
        </div>
        ${removeBtn}${userRole==='owner'&&memberRole!=='owner'?`<button class="btn-action" onclick="window.communityApp.setRole('${guildId}','${memberId}','${memberRole==='admin'?'member':'admin'}')">${memberRole==='admin'?'撤销管理':'设为管理'}</button>`:''}
      `;
      membersList.appendChild(memberDiv);
    });
  }

  function setupEventListeners() {
    // Friends tab switching
    document.querySelectorAll('.section-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const tabId = this.getAttribute('data-tab');
        document.querySelectorAll('.section-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
        this.classList.add('active');
        document.getElementById(`${tabId}-tab`).style.display = 'block';
      });
    });

    // Friend search
    const searchBtn = document.getElementById('search-btn');
    const friendSearch = document.getElementById('friend-search');
    if (searchBtn && friendSearch) {
      searchBtn.addEventListener('click', () => {
        const query = friendSearch.value;
        const results = searchFriends(query);
        renderSearch(results);
        document.getElementById('search-results').style.display = 'block';
      });
      friendSearch.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
          searchBtn.click();
        }
      });
    }

    const backSearch = document.getElementById('back-search');
    if (backSearch) {
      backSearch.addEventListener('click', () => {
        document.getElementById('search-results').style.display = 'none';
        friendSearch.value = '';
      });
    }

    // Guild creation
    const createGuildBtn = document.getElementById('create-guild-btn');
    const createGuildDialog = document.getElementById('create-guild-dialog');
    const createGuildForm = document.getElementById('create-guild-form');
    if (createGuildBtn && createGuildDialog && createGuildForm) {
      createGuildBtn.addEventListener('click', () => {
        createGuildDialog.showModal();
      });
      createGuildForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('guild-name').value;
        const desc = document.getElementById('guild-desc').value;
        if (createGuild(name, desc)) {
          createGuildDialog.close();
          document.getElementById('guild-name').value = '';
          document.getElementById('guild-desc').value = '';
          renderGuilds();
        }
      });
    }

    // Guild search
    const guildSearch = document.getElementById('guild-search');
    if (guildSearch) {
      guildSearch.addEventListener('input', () => {
        const query = guildSearch.value.toLowerCase();
        const filtered = state.guilds.filter(g => g.name.toLowerCase().includes(query));
        const directoryList = document.getElementById('directory-list');
        directoryList.innerHTML = '';
        filtered.forEach(g => directoryList.appendChild(renderGuildCard(g)));
      });
    }

    // Back button from guild detail
    const backGuild = document.getElementById('back-guild');
    if (backGuild) {
      backGuild.addEventListener('click', () => {
        document.getElementById('guild-detail').style.display = 'none';
        document.querySelector('.guilds-section').style.display = 'block';
        state.currentGuild = null;
        state.chatMessages = [];
      });
    }

    // Chat demo
    const openChatBtn = document.getElementById('open-chat-btn');
    const chatDemo = document.getElementById('chat-demo');
    const generateReplyBtn = document.getElementById('generate-reply-btn');
    if (openChatBtn && chatDemo && generateReplyBtn) {
      openChatBtn.addEventListener('click', () => {
        chatDemo.style.display = 'block';
        openChatBtn.style.display = 'none';
        state.chatMessages = [{
          sender: state.currentUser,
          text: '大家好！',
          isLocal: true,
          timestamp: Date.now()
        }];
        renderChatMessages();
      });
      generateReplyBtn.addEventListener('click', async () => {
        const responses = [
          '你好！欢迎来到公会',
          '很高兴认识你',
          '我也在这里',
          '让我们一起探险'
        ];
        let apiSample='';try{const response=await fetch('community-ai-reply.json');if(response.ok){const d=await response.json();if(typeof d.reply==='string')apiSample=d.reply.slice(0,500)}}catch{}const randomBot = BOTS[Math.floor(Math.random() * BOTS.length)];
        state.chatMessages.push({
          sender: randomBot.id,
          senderName: randomBot.name,
          text: apiSample?apiSample+'（minimax API 预生成测试样例，非实时）':responses[Math.floor(Math.random() * responses.length)],
          isLocal: true,
          timestamp: Date.now()
        });
        renderChatMessages();
      });
    }
  }

  function renderChatMessages() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    chatMessages.innerHTML = '';
    state.chatMessages.forEach(msg => {
      const div = document.createElement('div');
      div.className = `chat-message ${msg.sender === state.currentUser ? 'own' : 'other'}`;
      div.innerHTML = `
        <div class="chat-sender">${esc(msg.senderName || getUserName(msg.sender))}</div>
        <div class="chat-text">${esc(msg.text)}</div>
        <div class="chat-meta">${isBotId(msg.sender)?'AI 测试机器人 · ':''}本地模拟</div>
      `;
      chatMessages.appendChild(div);
    });
  }

  window.communityApp = {
    loadState,
    simulateAccept(userId){if(!isBotId(userId)||isBlocked(userId)||!hasSentRequest(userId))return;state.requests=state.requests.filter(r=>r.id!==userId);state.friends.push(BOTS.find(b=>b.id===userId));saveState();renderFriends();notify('AI 测试机器人已模拟接受好友请求（仅本机）');},
    setRole(gid,uid,role){const g=state.guilds.find(v=>v.id===gid);if(!g||g.owner!==state.currentUser||g.roles[uid]==='owner'||!['admin','member'].includes(role))return;g.roles[uid]=role;saveState();renderGuildDetail(gid);},
    renderFriends,
    addFriend(userId) {
      addFriend(userId);
    },
    cancelRequest(userId) {
      cancelRequest(userId);
    },
    acceptRequest(userId) {
      acceptRequest(userId);
    },
    removeFriendConfirm(userId) {
      if (confirm(`确定要移除此好友吗？`)) {
        removeFriend(userId);
      }
    },
    blockUser(userId) {
      blockUser(userId);
    },
    unblockUser(userId) {
      unblockUser(userId);
    },
    createGuild,
    joinGuild(guildId) {
      if (joinGuild(guildId)) {
        renderGuilds();
        alert('加入成功');
      }
    },
    leaveGuildConfirm(guildId) {
      if (confirm('确定要退出此公会吗？')) {
        leaveGuild(guildId);
        renderGuilds();
        state.currentGuild = null;
        document.getElementById('guild-detail').style.display = 'none';
        document.querySelector('.guilds-section').style.display = 'block';
      }
    },
    disbandGuildConfirm(guildId) {
      if (confirm('确定要解散此公会吗？此操作不可撤销。')) {
        disbandGuild(guildId);
        renderGuilds();
        state.currentGuild = null;
        document.getElementById('guild-detail').style.display = 'none';
        document.querySelector('.guilds-section').style.display = 'block';
      }
    },
    viewGuild(guildId) {
      renderGuildDetail(guildId);
    },
    showInviteDialog(guildId) {
      const dialog = document.getElementById('invite-members-dialog');
      const list = document.getElementById('invite-friends-list');
      list.innerHTML = '';
      const guild = state.guilds.find(g => g.id === guildId);
      if (!guild) return;
      
      state.friends.forEach(friend => {
        if (!guild.members.includes(friend.id) && !isBlocked(friend.id)) {
          const div = document.createElement('div');
          div.className = 'invite-item';
          div.innerHTML = `
            <img src="${esc(getUserAvatar(friend.id))}" alt="${esc(friend.name)}">
            <span>${esc(friend.name)}</span>
            <button class="btn btn-small" onclick="window.communityApp.inviteToGuild('${guildId}', '${friend.id}')">邀请</button>
          `;
          list.appendChild(div);
        }
      });
      
      dialog.showModal();
    },
    inviteToGuild(guildId, userId) {
      if (inviteToGuild(guildId, userId)) {
        renderGuildDetail(guildId);
        alert('AI 测试机器人已模拟加入，未发送真实邀请');document.getElementById('invite-members-dialog').close();
      }
    },
    removeMember(guildId, userId) {
      if (confirm('确定要移除此成员吗？')) {
        removeMember(guildId, userId);
        renderGuildDetail(guildId);
      }
    },
    showTransferDialog(guildId) {
      const guild = state.guilds.find(g => g.id === guildId);
      if (!guild) return;
      const membersList = guild.members.filter(m => m !== state.currentUser);
      const dialog=document.createElement('dialog');const h=document.createElement('h3');h.textContent='选择新的群主（本地演示）';dialog.append(h);for(const uid of membersList){const button=document.createElement('button');button.textContent=getUserName(uid)+' · AI 测试机器人';button.onclick=()=>{if(transferOwnership(guildId,uid)){renderGuildDetail(guildId);dialog.close();dialog.remove();notify('已转移本地公会所有权')}};dialog.append(button)}const close=document.createElement('button');close.textContent='取消';close.onclick=()=>{dialog.close();dialog.remove()};dialog.append(close);document.body.append(dialog);dialog.showModal();
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    setupEventListeners();
    renderFriends();
    if (document.querySelector('.guilds-section')) {
      renderGuilds();
    }
  });
})();