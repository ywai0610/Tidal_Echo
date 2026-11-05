const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const views = $$('.view');
const tabs = $$('.tab');
const toast = $('#toast');

let saved = {};
try {
  saved = JSON.parse(localStorage.getItem('little-phone-state') || '{}');
} catch (_) {
  saved = {};
}

const state = {
  tone: saved.tone || '温柔但不纵容',
  memories: saved.memories || ['你喜欢下雨天，尤其是傍晚。', '你最近在准备一个很重要的考试。', '你不喜欢别人用“应该”来催你。'],
  human: saved.human ?? true,
  api: saved.api || { base: 'https://api.openai.com/v1', model: 'gpt-4o-mini', key: '', enabled: false }
};

function persist() {
  localStorage.setItem('little-phone-state', JSON.stringify({ tone: state.tone, memories: state.memories, human: state.human, api: state.api }));
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function showView(id) {
  views.forEach(view => view.classList.toggle('active', view.id === id));
  tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.view === id));
  if (id === 'chatView') setTimeout(() => $('#messageInput').focus(), 180);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function renderMemories() {
  const grid = $('#memoryGrid');
  const add = $('#addMemory');
  grid.querySelectorAll('.memory-chip:not(.add-chip)').forEach(chip => chip.remove());
  state.memories.forEach(text => {
    const button = document.createElement('button');
    button.className = 'memory-chip';
    button.dataset.memory = text;
    button.innerHTML = '<span>✦</span> ' + escapeHtml(text);
    button.addEventListener('click', () => notify(`已查看：${text}`));
    grid.insertBefore(button, add);
  });
  $('#memoryCount').textContent = String(state.memories.length).padStart(2, '0');
}

function openDrawer() {
  const drawer = $('#settingsDrawer');
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
}

function closeDrawer() {
  const drawer = $('#settingsDrawer');
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
}

function addMessage(text, who = 'me') {
  const wrap = document.createElement('div');
  const safeText = escapeHtml(text).replace(/\n/g, '<br/>');
  wrap.className = `msg-row ${who}`;
  if (who === 'them') {
    wrap.innerHTML = `<div class="mini-portrait">陆</div><div><div class="bubble">${safeText}</div><span class="msg-time">刚刚</span></div>`;
  } else {
    wrap.innerHTML = `<div><div class="bubble">${safeText}</div><span class="msg-time">刚刚 · 已读</span></div>`;
  }
  $('#messages').append(wrap);
  $('#messages').scrollTop = $('#messages').scrollHeight;
}

const replies = {
  '我有点累': '那就先别装作没事。今天的电量只够做一件小事的话，你想把它留给什么？',
  '夸我一下': '好。你已经在很累的时候还把话说出来了，这算一种诚实，也算一种往前走。',
  '帮我拆任务': '可以。把任务丢给我，先不用整理。我来负责把它拆成今天能碰到的三小块。'
};

function normalizeApiUrl(base) {
  const clean = String(base || '').trim().replace(/\/+$/, '');
  return /\/chat\/completions$/i.test(clean) ? clean : `${clean}/chat/completions`;
}

function readApiForm() {
  return { base: $('#apiBase').value.trim(), model: $('#apiModel').value.trim(), key: $('#apiKey').value.trim() };
}

function updateApiStatus() {
  const enabled = Boolean(state.api?.enabled);
  $('#apiModeLabel').textContent = enabled ? '已启用真实 API' : '当前使用本地演示回复';
  $('#apiModePill').textContent = enabled ? 'API' : 'DEMO';
  $('#apiBase').value = state.api?.base || '';
  $('#apiModel').value = state.api?.model || '';
  $('#apiKey').value = state.api?.key || '';
}

async function requestApi(text) {
  if (!state.api?.enabled) return null;
  const config = state.api;
  try {
    const response = await fetch(normalizeApiUrl(config.base), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(config.key ? { Authorization: `Bearer ${config.key}` } : {}) },
      body: JSON.stringify({ model: config.model, messages: [{ role: 'system', content: $('#personaPrompt').value.trim() }, { role: 'user', content: text }], temperature: 0.8 })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new Error('API 返回内容为空');
    return answer;
  } catch (_) {
    notify('API 暂时不可用，已切回演示回复');
    return null;
  }
}

async function respond(text) {
  const remoteReply = await requestApi(text);
  if (remoteReply) {
    addMessage(remoteReply, 'them');
    return;
  }
  const lower = text.toLowerCase();
  const reply = replies[text] || ((lower.includes('难过') || lower.includes('不开心')) ? '我在。你可以不用马上解释得很漂亮，先把最难受的那一小块递给我。' : (lower.includes('开心') || lower.includes('好消息')) ? '那我先替你把这点开心收好。讲给我听，别只发一句“还行”。' : '我听见了。先不用急着给答案，告诉我你现在最想被理解的那一部分。');
  setTimeout(() => addMessage(reply, 'them'), 520);
}

renderMemories();
updateApiStatus();
tabs.forEach(tab => tab.addEventListener('click', () => showView(tab.dataset.view)));
$$('[data-open-chat]').forEach(element => element.addEventListener('click', () => showView('chatView')));
$('#backHome').addEventListener('click', () => showView('homeView'));
$('#openPersona').addEventListener('click', () => showView('personaView'));
$$('[data-back-home]').forEach(element => element.addEventListener('click', () => showView('homeView')));
$('#openSettings').addEventListener('click', openDrawer);
$$('[data-close-drawer]').forEach(element => element.addEventListener('click', closeDrawer));

$('#toneToggle').addEventListener('click', () => {
  const tones = ['温柔但不纵容', '冷静又偏心', '懒散的幽默'];
  state.tone = tones[(tones.indexOf(state.tone) + 1) % tones.length];
  $('#toneLabel').textContent = state.tone;
  persist();
  notify(`语气切换为：${state.tone}`);
});
$$('.dial').forEach(dial => {
  if (dial.dataset.tone === state.tone) dial.classList.add('active');
  dial.addEventListener('click', () => {
    $$('.dial').forEach(item => item.classList.remove('active'));
    dial.classList.add('active');
    state.tone = dial.dataset.tone;
    $('#toneLabel').textContent = state.tone;
    persist();
    notify('语气已更新');
  });
});
$$('.switch').forEach((switchButton, index) => {
  if (index === 0 && !state.human) switchButton.classList.remove('on');
  switchButton.addEventListener('click', () => {
    switchButton.classList.toggle('on');
    if (index === 0) state.human = switchButton.classList.contains('on');
    persist();
  });
});
$$('.memory-chip:not(.add-chip)').forEach(chip => chip.addEventListener('click', () => notify(`已查看：${chip.dataset.memory}`)));
$('#addMemory').addEventListener('click', () => {
  const text = prompt('想让陆沉记住什么？');
  if (!text?.trim()) return;
  state.memories.push(text.trim());
  persist();
  renderMemories();
  notify('这件事会被好好记住');
});

$('#composer').addEventListener('submit', event => {
  event.preventDefault();
  const input = $('#messageInput');
  const text = input.value.trim();
  if (!text) return;
  addMessage(text);
  input.value = '';
  input.style.height = 'auto';
  respond(text);
});
$$('.suggestions button').forEach(button => button.addEventListener('click', () => {
  const text = button.textContent;
  addMessage(text);
  respond(text);
}));
$('#stickerBtn').addEventListener('click', () => {
  addMessage('[表情: 轻轻抱一下]');
  respond('收到一个拥抱。那我也不说教，陪你坐一会儿。');
});
$('#messageInput').addEventListener('input', event => {
  event.target.style.height = 'auto';
  event.target.style.height = `${Math.min(event.target.scrollHeight, 88)}px`;
});
$('#savePersona').addEventListener('click', () => {
  const name = $('#personaName').value.trim() || '陆沉';
  $('#pageTitle').textContent = '今天，也要好好说话';
  notify(`${name} 的人设已保存`);
});
$('#saveApi').addEventListener('click', () => {
  const config = readApiForm();
  if (!config.base || !config.model) {
    notify('请先填写接口地址和模型名称');
    return;
  }
  state.api = { ...config, enabled: true };
  persist();
  updateApiStatus();
  notify('真实 API 已启用');
});
$('#testApi').addEventListener('click', async () => {
  const config = readApiForm();
  if (!config.base || !config.model) {
    notify('请先填写接口地址和模型名称');
    return;
  }
  const previous = state.api;
  state.api = { ...config, enabled: true };
  const result = await requestApi('请只回复：连接成功');
  if (result) {
    persist();
    updateApiStatus();
    notify('连接成功');
  } else {
    state.api = previous;
    updateApiStatus();
  }
});

function tick() {
  const date = new Date();
  $('#clock').textContent = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}
tick();
setInterval(tick, 30000);
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
