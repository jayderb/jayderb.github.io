/* ============================================================
   KRINT TUFWALE — password-reset.js
   forgot-password.html : ask for a reset link
   reset-password.html  : choose a new password from that link
   ============================================================ */
(() => {
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Same status-line pattern as the sign-in and contact forms
    function showStatus(form, message, isError) {
        const status = form.querySelector('.form-status');
        if (!status) return;
        status.textContent = message;
        status.style.color = isError ? 'red' : 'green';
        status.hidden = !message;
    }

    function markInvalid(input, invalid) {
        if (input) input.classList.toggle('input-error', invalid);
    }

    async function postJson(path, body) {
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        let data = {};
        try { data = await res.json(); } catch (err) { /* empty body */ }

        return { ok: res.ok, data };
    }

    function messageFrom(data) {
        return (data.details && Object.values(data.details)[0])
            || data.error
            || 'Something went wrong. Please try again.';
    }

    /* ---------- forgot-password.html ---------- */

    const forgotForm = document.getElementById('forgotForm');

    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = forgotForm.querySelector('[name="email"]');
            const button = forgotForm.querySelector('button[type="submit"]');

            markInvalid(email, false);
            showStatus(forgotForm, '', false);

            if (!EMAIL_REGEX.test(email.value.trim())) {
                markInvalid(email, true);
                showStatus(forgotForm, 'Please enter a valid email address.', true);
                return;
            }

            button.disabled = true;

            try {
                const { ok, data } = await postJson('/auth/forgot-password', {
                    email: email.value.trim(),
                });

                if (!ok) {
                    showStatus(forgotForm, messageFrom(data), true);
                    return;
                }

                // The server words this the same whether or not the account exists
                showStatus(forgotForm, data.message, false);
                forgotForm.reset();
            } catch (err) {
                showStatus(forgotForm, 'Could not reach the server. Please try again in a moment.', true);
            } finally {
                button.disabled = false;
            }
        });
    }

    /* ---------- reset-password.html ---------- */

    const resetForm = document.getElementById('resetForm');

    if (resetForm) {
        // The token rides in the #fragment, which browsers never send to a
        // server, so it stays out of hosting logs and Referer headers.
        const token = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token') || '';

        // Keep it only in memory from here: out of the address bar and history
        if (token) history.replaceState(null, '', window.location.pathname);

        if (!/^[a-f0-9]{64}$/.test(token)) {
            resetForm.hidden = true;
            document.getElementById('resetNoLink').hidden = false;
        }

        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const password = resetForm.querySelector('[name="password"]');
            const confirm = resetForm.querySelector('[name="confirm"]');
            const button = resetForm.querySelector('button[type="submit"]');

            markInvalid(password, false);
            markInvalid(confirm, false);
            showStatus(resetForm, '', false);

            const passwordOk = window.KTPassword
                ? KTPassword.isAcceptable(password.value)
                : password.value.length >= 10;

            if (!passwordOk) {
                markInvalid(password, true);
                showStatus(resetForm, 'Password needs 10+ characters, with a letter and a number.', true);
                return;
            }

            if (password.value !== confirm.value) {
                markInvalid(confirm, true);
                showStatus(resetForm, 'The two passwords do not match.', true);
                return;
            }

            button.disabled = true;

            try {
                const { ok, data } = await postJson('/auth/reset-password', {
                    token,
                    password: password.value,
                });

                if (!ok) {
                    showStatus(resetForm, messageFrom(data), true);
                    return;
                }

                resetForm.hidden = true;
                document.getElementById('resetDone').hidden = false;
            } catch (err) {
                showStatus(resetForm, 'Could not reach the server. Please try again in a moment.', true);
            } finally {
                button.disabled = false;
            }
        });
    }
})();