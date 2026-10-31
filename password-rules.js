/* ============================================================
   KRINT TUFWALE — password-rules.js
   Live "what makes a good password" checklist for sign-up and
   password reset. The server is the real gatekeeper (it also
   rejects common and breached passwords); this just saves a
   round trip and shows people what is expected.
   ============================================================ */
window.KTPassword = (() => {
    const MIN_LENGTH = 10;

    function check(password) {
        return {
            length: password.length >= MIN_LENGTH,
            letter: /\p{L}/u.test(password),
            number: /\p{Nd}/u.test(password),
        };
    }

    function isAcceptable(password) {
        const result = check(password);
        return result.length && result.letter && result.number;
    }

    function wire(input, list) {
        const items = {};
        list.querySelectorAll('[data-rule]').forEach((li) => {
            items[li.dataset.rule] = li;
        });

        const update = () => {
            const result = check(input.value);
            Object.keys(items).forEach((rule) => {
                items[rule].classList.toggle('met', Boolean(result[rule]));
            });
        };

        input.addEventListener('input', update);
        update();
    }

    document.addEventListener('DOMContentLoaded', () => {
        const list = document.getElementById('passwordRules');
        const input = document.querySelector('input[autocomplete="new-password"]');
        if (list && input) wire(input, list);
    });

    return { MIN_LENGTH, check, isAcceptable };
})();