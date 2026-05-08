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
  const icons = { success: '✅', warning: '⚠️', danger: '❌', info: 'ℹ️' };
  const classMap = { success: '', warning: 'toast-warning', danger: 'toast-danger', info: '' };

  const toast = document.createElement('div');
  toast.className = `toast ${classMap[type] || ''}`.trim();
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || '🔔'}</span>
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
