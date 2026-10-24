/* ============================================================
   KRINT TUFWALE: admin.js (seller orders page)
   ============================================================ */
(() => {
    const TOKEN_KEY = 'kt_admin_token';   // separate from customers' kt_token

    const $ = (id) => document.getElementById(id);
    const loginBox = $('adminLogin');
    const loginForm = $('adminLoginForm');
    const loginStatus = $('adminLoginStatus');
    const passwordInput = $('adminPassword');
    const ordersBox = $('adminOrders');
    const actions = $('adminActions');
    const filtersEl = $('adminFilters');
    const listEl = $('adminList');
    const statusEl = $('adminStatus');
    const updatedEl = $('adminUpdated');

    let orders = [];
    let statuses = [];
    let filter = 'all';

    /* ---------- helpers ---------- */

    // Escape anything a customer typed before it goes into innerHTML
    function esc(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    const formatZMW = (n) => `ZMW ${Number(n).toLocaleString('en-US')}`;
    const ref = (id) => `KT-${String(id).padStart(4, '0')}`;
    const label = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    function waLink(phone) {
        let digits = String(phone || '').replace(/\D/g, '');
        if (digits.startsWith('0')) digits = '260' + digits.slice(1);
        return digits.length >= 11 ? `https://wa.me/${digits}` : null;
    }

    // SQLite stores UTC without a marker; show it in the seller's local time
    function fmtDate(sqlDate) {
        const d = new Date(String(sqlDate).replace(' ', 'T') + 'Z');
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleString('en-GB', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        });
    }

    function setText(el, message) {
        el.textContent = message;
        el.hidden = !message;
    }

    /* ---------- api ---------- */

    async function api(path, options = {}) {
        const token = sessionStorage.getItem(TOKEN_KEY);
        let res;
        try {
            res = await fetch(`${API_BASE}${path}`, {
                ...options,
                headers: {
                    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });
        } catch (err) {
            throw new Error('Could not reach the server.');
        }

        let data = {};
        try { data = await res.json(); } catch (err) { /* empty body */ }

        if (res.status === 401 && token) {
            signOut('Your session expired. Please sign in again.');
            throw new Error('Session expired.');
        }
        if (!res.ok) throw new Error(data.error || 'Something went wrong.');
        return data;
    }

    /* ---------- views ---------- */

    function signOut(message = '') {
        sessionStorage.removeItem(TOKEN_KEY);
        orders = [];
        ordersBox.hidden = true;
        actions.hidden = true;
        loginBox.hidden = false;
        document.title = 'Orders | Krint Tufwale';
        setText(loginStatus, message);
    }

    function renderFilters() {
        const tabs = ['all', ...statuses];
        filtersEl.innerHTML = tabs.map((s) => {
            const count = s === 'all' ? orders.length : orders.filter((o) => o.status === s).length;
            return `<button type="button" class="admin-filter${s === filter ? ' active' : ''}" data-filter="${s}">
                        ${label(s)}<span>${count}</span>
                    </button>`;
        }).join('');

        // A pinned tab then shows how many orders are waiting
        const pending = orders.filter((o) => o.status === 'pending').length;
        document.title = pending ? `(${pending}) Orders | Krint Tufwale` : 'Orders | Krint Tufwale';
    }

    function orderCard(o) {
        const wa = waLink(o.phone);
        const lines = o.items.map((i) => `
            <li>
                <span>${esc(i.name)} <em>× ${i.qty}</em></span>
                <span>${formatZMW(i.lineTotalZmw)}</span>
            </li>`).join('');
        const options = statuses.map((s) =>
            `<option value="${s}"${s === o.status ? ' selected' : ''}>${label(s)}</option>`
        ).join('');

        return `
        <article class="admin-order" data-id="${o.id}" data-status="${esc(o.status)}">
            <div class="admin-order-head">
                <div>
                    <h2>${ref(o.id)}</h2>
                    <p class="admin-muted">${esc(fmtDate(o.created_at))}</p>
                </div>
                <select data-action="status" aria-label="Order status">${options}</select>
            </div>
            <div class="admin-order-body">
                <div class="admin-customer">
                    <p><strong>${esc(o.customer_name)}</strong></p>
                    <p><a href="mailto:${esc(o.email)}">${esc(o.email)}</a></p>
                    <p>${esc(o.phone || '—')}${wa ? ` · <a href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</p>
                    <p class="admin-address">${esc(o.delivery_address || 'No address on file')}</p>
                </div>
                <ul class="admin-lines">${lines}</ul>
            </div>
            <div class="admin-order-foot">
                <span>Total</span>
                <strong>${formatZMW(o.total_zmw)}</strong>
            </div>
        </article>`;
    }

    function renderList() {
        const shown = filter === 'all' ? orders : orders.filter((o) => o.status === filter);
        listEl.innerHTML = shown.length
            ? shown.map(orderCard).join('')
            : '<p class="admin-empty">No orders here yet.</p>';
    }

    async function load({ quiet = false } = {}) {
        const data = await api('/admin/orders');
        orders = data.orders;
        statuses = data.statuses;

        // Don't rebuild the list under the seller's cursor while a dropdown is open
        if (quiet && listEl.contains(document.activeElement)) return;

        renderFilters();
        renderList();
        updatedEl.textContent = `Updated ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
        setText(statusEl, '');
    }

    async function start() {
        loginBox.hidden = true;
        ordersBox.hidden = false;
        actions.hidden = false;
        try {
            await load();
        } catch (err) {
            if (!loginBox.hidden) return;   // signOut() already took over
            setText(statusEl, err.message);
        }
    }

    /* ---------- events ---------- */

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setText(loginStatus, '');

        if (!passwordInput.value) {
            setText(loginStatus, 'Enter the password.');
            return;
        }

        try {
            const { token } = await api('/admin/login', {
                method: 'POST',
                body: JSON.stringify({ password: passwordInput.value }),
            });
            sessionStorage.setItem(TOKEN_KEY, token);
            passwordInput.value = '';
            await start();
        } catch (err) {
            setText(loginStatus, err.message);
        }
    });

    filtersEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-filter]');
        if (!btn) return;
        filter = btn.dataset.filter;
        renderFilters();
        renderList();
    });

    listEl.addEventListener('change', async (e) => {
        const select = e.target.closest('select[data-action="status"]');
        if (!select) return;

        const card = select.closest('.admin-order');
        const id = card.dataset.id;
        const previous = card.dataset.status;
        const next = select.value;

        select.disabled = true;
        try {
            await api(`/admin/orders/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: next }),
            });
            card.dataset.status = next;
            const order = orders.find((o) => String(o.id) === id);
            if (order) order.status = next;
            renderFilters();
            if (filter !== 'all' && filter !== next) renderList();   // it no longer belongs in this tab
        } catch (err) {
            select.value = previous;
            setText(statusEl, err.message);
        } finally {
            select.disabled = false;
        }
    });

    $('adminRefresh').addEventListener('click', () => {
        load().catch((err) => setText(statusEl, err.message));
    });

    $('adminSignOut').addEventListener('click', () => signOut());

    // Pick up new orders without a manual refresh
    setInterval(() => {
        if (!document.hidden && sessionStorage.getItem(TOKEN_KEY)) {
            load({ quiet: true }).catch(() => {});
        }
    }, 60 * 1000);

    if (sessionStorage.getItem(TOKEN_KEY)) start();
})();