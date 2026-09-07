/* ============================================================
   KRINT TUFWALE — auth.js (frontend)
   Authentication helper, loaded on every page before script.js.

   Architecture: the backend (Render/Railway) and this static
   site (GitHub Pages) are different origins, so auth uses JWTs
   instead of cookies:
   - signup/login respond with { token, user }
   - the token is kept in sessionStorage (per tab, gone when the
     tab closes — passwords/tokens are never in localStorage)
   - authenticated calls go through authFetch(), which attaches
     `Authorization: Bearer <token>` and clears the token on 401
   - on page load, GET /api/auth/me checks whether the stored
     token is still valid and updates the navbar account icon

   Exposed as window.KTAuth:
     KTAuth.getToken()      KTAuth.setUser(user)
     KTAuth.setToken(t)     KTAuth.getUser()
     KTAuth.clearToken()    KTAuth.isLoggedIn()
     KTAuth.authFetch(url, opts)
     KTAuth.ready           (promise → user or null)
   ============================================================ */

/* API base: same-origin /api by default (serve.dev.js proxies it
   to the Node backend in development).
   Deploying the static site to GitHub Pages with the API hosted
   separately (Render/Railway)? Swap in your backend URL:
   e.g. 'https://your-backend.example.com/api' */
const API_BASE = '/api';

const KTAuth = (() => {

    const TOKEN_KEY = 'kt_token';
    const USER_KEY = 'kt_user';

    /* --------------------------------------------------------
       Token + user storage (sessionStorage)
    -------------------------------------------------------- */

    function getToken() {
        try {
            return sessionStorage.getItem(TOKEN_KEY);
        } catch (err) {
            return null; // storage unavailable (private mode etc.)
        }
    }

    function setToken(token) {
        try {
            sessionStorage.setItem(TOKEN_KEY, token);
        } catch (err) {
            console.error('Krint Tufwale: could not save session.', err);
        }
    }

    function clearToken() {
        try {
            sessionStorage.removeItem(TOKEN_KEY);
            sessionStorage.removeItem(USER_KEY);
        } catch (err) {
            /* nothing to clear */
        }
        user = null;
        window.KT_USER = null;
        renderAccountArea();
    }

    function cacheUser(user) {
        try {
            if (user) {
                sessionStorage.setItem(USER_KEY, JSON.stringify(user));
            } else {
                sessionStorage.removeItem(USER_KEY);
            }
        } catch (err) {
            /* non-fatal */
        }
    }

    function getCachedUser() {
        try {
            const raw = sessionStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (err) {
            return null;
        }
    }

    /* --------------------------------------------------------
       State
    -------------------------------------------------------- */

    let user = getCachedUser(); // optimistic; verified via /me below
    window.KT_USER = user;

    function getUser() {
        return user;
    }

    function setUser(nextUser) {
        user = nextUser || null;
        window.KT_USER = user;
        cacheUser(user);
        renderAccountArea();
    }

    function isLoggedIn() {
        return Boolean(user && getToken());
    }

    /* --------------------------------------------------------
       Fetch helper — attaches the Bearer token
    -------------------------------------------------------- */

    async function authFetch(url, options = {}) {
        const headers = Object.assign({}, options.headers || {});
        const token = getToken();

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const res = await fetch(url, Object.assign({}, options, { headers }));

        // A rejected/expired token means this session is over
        if (res.status === 401) {
            clearToken();
        }

        return res;
    }

    /* --------------------------------------------------------
       Session check on page load — verifies the token and
       refreshes the cached user
    -------------------------------------------------------- */

    async function checkSession() {
        const token = getToken();

        if (!token) {
            setUser(null);
            return null;
        }

        try {
            const res = await authFetch(`${API_BASE}/auth/me`);

            if (res.ok) {
                const data = await res.json();
                setUser(data.user || null);
                return user;
            }
        } catch (err) {
            // Backend unreachable — keep optimistic cached state,
            // but treat requests needing auth as signed out
            return user && getToken() ? user : null;
        }

        setUser(null);
        return null;
    }

    /* --------------------------------------------------------
       NAVBAR — the account icon on every page

       Signed out:  icon links to login.html
       Signed in:   icon toggles a small panel (name + sign out)
       -------------------------------------------------------- */

    function initials(name) {
        return (name || '?')
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join('');
    }

    function firstName(name) {
        return (name || '').trim().split(/\s+/)[0] || 'Account';
    }

    function renderAccountArea() {
        // Robust lookup: the label changes with auth state
        // ("Account", "Account — Chanda", or the original
        // "User account" on the older pages)
        const link = document.querySelector(
            '.icons a[aria-label^="Account"], .icons a[aria-label="User account"], .icons a.account-active'
        );

        if (!link) return;

        // Back to the plain signed-out icon (also re-runs cleanly)
        if (!isLoggedIn()) {
            link.innerHTML = '<i class="fa-solid fa-user" aria-hidden="true"></i>';
            link.href = 'login.html';
            link.setAttribute('aria-label', 'Account');
            link.classList.remove('account-active');
            const panel = document.getElementById('accountPanel');
            if (panel) panel.remove();
            return;
        }

        link.href = '#';
        link.classList.add('account-active');
        link.setAttribute('aria-label', `Account — ${firstName(user.name)}`);
        link.innerHTML = `
            <span class="account-initials">${initials(user.name)}</span>
            <i class="fa-solid fa-user" aria-hidden="true"></i>
        `;

        let panel = document.getElementById('accountPanel');

        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'accountPanel';
            panel.className = 'account-panel';
            panel.hidden = true;
            link.closest('.icons').appendChild(panel);

            link.addEventListener('click', (e) => {
                if (!isLoggedIn()) return; // normal navigation to login.html
                e.preventDefault();
                panel.hidden = !panel.hidden;
            });

            document.addEventListener('click', (e) => {
                if (!panel.hidden && !panel.contains(e.target) && !link.contains(e.target)) {
                    panel.hidden = true;
                }
            });

            panel.addEventListener('click', (e) => {
                const action = e.target.closest('[data-account-action]');
                if (!action) return;

                if (action.dataset.accountAction === 'logout') {
                    // JWT logout is client-side: drop the token and the
                    // server simply stops accepting it after expiry.
                    // (No server session to revoke.)
                    clearToken();
                }
            });
        }

        panel.innerHTML = `
            <p class="account-panel-name">${firstName(user.name)}</p>
            <p class="account-panel-email">${user.email || ''}</p>
            <button type="button" class="account-panel-signout" data-account-action="logout">
                Sign Out
            </button>
        `;
    }

    /* --------------------------------------------------------
       LOGIN / SIGNUP PAGES — form handling
       Validation errors follow the site's existing pattern:
       .input-error on the offending input + a status message,
       like the contact form and newsletter inputs.
       -------------------------------------------------------- */

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function currentRelativeUrl() {
        return location.pathname.split('/').pop() + location.search;
    }

    /* Only ever hop back to a path on THIS site (open-redirect protection) */
    function safeNextPath(rawNext) {
        try {
            const url = new URL(rawNext, location.href);
            if (url.origin !== location.origin) return 'shop.html';
            return url.pathname.split('/').pop() + url.search;
        } catch (err) {
            return 'shop.html';
        }
    }

    function nextPageAfterAuth() {
        return safeNextPath(new URLSearchParams(location.search).get('next') || 'shop.html');
    }

    function fieldStatus(input, hasError) {
        if (input) input.classList.toggle('input-error', hasError);
    }

    function showFormStatus(form, message, isError) {
        const status = form.querySelector('.form-status');
        if (!status) return;
        status.textContent = message;
        status.style.color = isError ? 'red' : 'green';
        status.hidden = !message;
    }

    function clearErrors(form) {
        form.querySelectorAll('.input-error').forEach((input) => {
            input.classList.remove('input-error');
        });
        showFormStatus(form, '', false);
    }

    function validateLoginForm(form) {
        const email = form.querySelector('[name="email"]');
        const password = form.querySelector('[name="password"]');
        let ok = true;

        if (!EMAIL_REGEX.test(email.value.trim())) {
            fieldStatus(email, true);
            ok = false;
        }
        if (!password.value) {
            fieldStatus(password, true);
            ok = false;
        }
        if (!ok) showFormStatus(form, 'Please enter a valid email and password.', true);
        return ok;
    }

    function validateSignupForm(form) {
        const name = form.querySelector('[name="name"]');
        const email = form.querySelector('[name="email"]');
        const phone = form.querySelector('[name="phone"]');
        const password = form.querySelector('[name="password"]');
        const confirm = form.querySelector('[name="confirm"]');
        let ok = true;

        if (name.value.trim().length < 2) {
            fieldStatus(name, true);
            ok = false;
        }
        if (!EMAIL_REGEX.test(email.value.trim())) {
            fieldStatus(email, true);
            ok = false;
        }
        if (phone.value.trim() && !/^[+\d][\d\s\-()]{6,19}$/.test(phone.value.trim())) {
            fieldStatus(phone, true);
            ok = false;
        }
        if (password.value.length < 8) {
            fieldStatus(password, true);
            ok = false;
        }
        if (password.value !== confirm.value) {
            fieldStatus(confirm, true);
            ok = false;
        }

        if (!ok) {
            showFormStatus(
                form,
                password.value !== confirm.value
                    ? 'Passwords do not match.'
                    : 'Please check the highlighted fields (password needs 8+ characters).',
                true
            );
        }
        return ok;
    }

    async function submitAuthForm(form, endpoint) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const payload = {};
        form.querySelectorAll('input').forEach((input) => {
            if (input.name && input.name !== 'confirm') payload[input.name] = input.value;
        });

        if (submitBtn) submitBtn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/auth/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (!res.ok) {
                const detail = data.details ? Object.values(data.details)[0] : data.error;
                showFormStatus(form, detail || 'Something went wrong. Please try again.', true);
                return;
            }

            // Signed in — keep the token + user, then hop back
            setToken(data.token);
            setUser(data.user);

            const target = nextPageAfterAuth();
            if (typeof window.__ktTestNavigate === 'function') {
                window.__ktTestNavigate(target);
            } else {
                window.location.href = target;
            }
        } catch (err) {
            showFormStatus(form, 'Network error. Is the backend running?', true);
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    function initAuthForms() {
        const loginForm = document.getElementById('loginForm');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                clearErrors(loginForm);
                if (validateLoginForm(loginForm)) submitAuthForm(loginForm, 'login');
            });
        }

        const signupForm = document.getElementById('signupForm');

        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                clearErrors(signupForm);
                if (validateSignupForm(signupForm)) submitAuthForm(signupForm, 'signup');
            });
        }

        // Keep the ?next= hop when switching between the two pages
        const next = new URLSearchParams(location.search).get('next');
        const crossLink = document.getElementById('signupLink') ||
            document.getElementById('loginLink');

        if (next && crossLink) {
            crossLink.href = `${crossLink.href.split('?')[0]}?next=${encodeURIComponent(next)}`;
        }
    }

    /* --------------------------------------------------------
       Boot
    -------------------------------------------------------- */

    renderAccountArea();
    initAuthForms();

    const ready = checkSession();

    return {
        getToken,
        setToken,
        clearToken,
        getUser,
        setUser,
        isLoggedIn,
        authFetch,
        ready,
        safeNextPath,
    };
})();

window.KTAuth = KTAuth;