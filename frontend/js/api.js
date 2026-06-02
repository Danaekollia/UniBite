const API = {
  async request(method, url, data, isFormData = false) {
    const opts = {
      method,
      credentials: 'include',
      headers: isFormData ? {} : { 'Content-Type': 'application/json' },
      body: data ? (isFormData ? data : JSON.stringify(data)) : undefined
    };
    const res = await fetch(url, opts);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Σφάλμα server');
    return json;
  },
  get: (url) => API.request('GET', url),
  post: (url, data) => API.request('POST', url, data),
  postForm: (url, formData) => API.request('POST', url, formData, true),
  put: (url, data) => API.request('PUT', url, data),
  putForm: (url, formData) => API.request('PUT', url, formData, true),
  delete: (url) => API.request('DELETE', url)
};

function showAlert(container, message, type = 'error') {
  const div = document.createElement('div');
  div.className = `alert alert-${type}`;
  div.textContent = message;
  container.innerHTML = '';
  container.appendChild(div);
  if (type === 'success') setTimeout(() => div.remove(), 4000);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('el-GR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusLabel(status) {
  const map = { active: 'Ενεργή', inactive: 'Ανενεργή', expired: 'Έληξε', pending: 'Εκκρεμεί', approved: 'Εγκρίθηκε', rejected: 'Απορρίφθηκε', picked_up: 'Παρελήφθη', no_show: 'No-show' };
  return map[status] || status;
}

function allergenName(key) {
  const map = { gluten: 'Γλουτένη', crustaceans: 'Καρκινοειδή', eggs: 'Αυγά', fish: 'Ψάρι', peanuts: 'Φιστίκια', soybeans: 'Σόγια', milk: 'Γάλα', nuts: 'Ξηροί καρποί', celery: 'Σέλινο', mustard: 'Μουστάρδα', sesame: 'Σουσάμι', sulphites: 'Θειώδη', lupin: 'Λούπινο', molluscs: 'Μαλάκια' };
  return map[key] || key;
}

async function getUser() {
  try {
    return await API.get('/api/users/me');
  } catch { return null; }
}

function redirectByRole(role) {
  if (role === 'cook') location.href = '/cook-dashboard.html';
  else if (role === 'admin') location.href = '/admin.html';
  else location.href = '/feed.html';
}

// ── Toast Notification System ──

function createToastContainer() {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    document.body.appendChild(c);
  }
  return c;
}

function showToast(message, type = 'success') {
  const container = createToastContainer();
  const icons = { success: ICO.check, warning: ICO.warning, danger: ICO.xmark, info: ICO.info };
  const classMap = { success: '', warning: 'toast-warning', danger: 'toast-danger', info: '' };

  const toast = document.createElement('div');
  toast.className = `toast ${classMap[type] || ''}`.trim();
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || ICO.info}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" title="Κλείσιμο">✕</button>`;

  container.appendChild(toast);

  const dismiss = () => {
    toast.style.animation = 'fadeOut .3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  };
  toast.querySelector('.toast-close').addEventListener('click', dismiss);
  // Auto-dismiss after 6 seconds
  setTimeout(dismiss, 6000);
}

function toastType(message) {
  if (message.startsWith('⚠️') || message.startsWith('⏰')) return 'warning';
  if (message.startsWith('❌')) return 'danger';
  return 'success';
}

// ── SVG Icon Library ──
const ICO = (() => {
  const i = (p, x = '', vb = '0 0 24 24') => `<svg class="ico${x ? ' ' + x : ''}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${p}</svg>`;
  return {
    logo:     i('<circle cx="50" cy="42" r="30"/><ellipse cx="38" cy="31" rx="4" ry="5" fill="currentColor" stroke="none"/><ellipse cx="62" cy="31" rx="4" ry="5" fill="currentColor" stroke="none"/><path d="M34 49 Q50 63 66 49"/><line x1="6" y1="25" x2="6" y2="46"/><line x1="13" y1="22" x2="13" y2="46"/><line x1="20" y1="25" x2="20" y2="46"/><line x1="6" y1="46" x2="20" y2="46"/><line x1="13" y1="46" x2="11" y2="88"/><ellipse cx="87" cy="38" rx="8" ry="13"/><line x1="87" y1="51" x2="89" y2="88"/>', 'ico-logo', '0 0 100 100'),
    star:     i('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'),
    edit:     i('<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>'),
    trash:    i('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>'),
    check:    i('<polyline points="20 6 9 17 4 12"/>'),
    xmark:    i('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
    box:      i('<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>'),
    ban:      i('<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>'),
    fork:     i('<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>'),
    pin:      i('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'),
    clock:    i('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
    user:     i('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
    warning:  i('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'),
    inbox:    i('<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>'),
    award:    i('<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>'),
    calendar: i('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
    map:      i('<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>'),
    menu:     i('<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>'),
    gift:     i('<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>'),
    info:     i('<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'),
    // XL variants for empty states (40 px, centered block)
    forkXl:   i('<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>', 'ico-xl'),
    inboxXl:  i('<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>', 'ico-xl'),
    starXl:   i('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>', 'ico-xl'),
    awardXl:  i('<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>', 'ico-xl'),
  };
})();

async function loadNotifications() {
  try {
    const notes = await API.get('/api/notifications');
    if (notes.length === 0) return;
    // Show with small delay between each
    notes.forEach((n, i) => {
      setTimeout(() => showToast(n.message, toastType(n.message)), i * 400);
    });
    // Mark all as read
    await API.post('/api/notifications/read-all');
  } catch { /* silent */ }
}
