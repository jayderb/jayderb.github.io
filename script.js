/* ============================================================
   KRINT TUFWALE — script.js
   ============================================================ */


/* ------------------------------------------------------------
   1. NAVBAR — sticky scroll behaviour
   ------------------------------------------------------------ */
const header = document.querySelector('header');

window.addEventListener('scroll', () => {
    if (window.scrollY > 80) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});


/* ------------------------------------------------------------
   2. SCROLL REVEAL — fade + slide up on scroll
   ------------------------------------------------------------ */
const revealElements = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target); // animate once only
        }
    });
}, {
    threshold: 0.15
});

revealElements.forEach(el => revealObserver.observe(el));


/* ------------------------------------------------------------
   3. CAMPAIGN BANNER — parallax background
   ------------------------------------------------------------ */
const campaign = document.querySelector('.campaign');

window.addEventListener('scroll', () => {
    if (!campaign) return;

    const rect = campaign.getBoundingClientRect();
    const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

    if (isVisible) {
        const scrolled = window.scrollY - campaign.offsetTop;
        const rate = scrolled * 0.3;
        campaign.style.backgroundPositionY = `calc(center + ${rate}px)`;
    }
});


/* ------------------------------------------------------------
   4. COLLECTION CARDS — 3D tilt on mouse move
   ------------------------------------------------------------ */
const tiltCards = document.querySelectorAll('.collection-card');

tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();

        // Cursor position relative to card center
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        // Convert to degrees — max 8deg tilt
        const rotateX = -(y / rect.height) * 8;
        const rotateY = (x / rect.width) * 8;

        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = `perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)`;
    });
});


/* ------------------------------------------------------------
   5. ADD TO CART — click feedback
   ------------------------------------------------------------ */
const cartButtons = document.querySelectorAll('.add-to-cart');

cartButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();

        if (btn.classList.contains('added')) return; // prevent double click

        const original = btn.textContent;

        btn.textContent = '✓ ADDED';
        btn.classList.add('added');

        setTimeout(() => {
            btn.textContent = original;
            btn.classList.remove('added');
        }, 2000);
    });
});


/* ------------------------------------------------------------
   6. NEWSLETTER FORM — validation + success state
   ------------------------------------------------------------ */
const newsletterForm = document.querySelector('.newsletter-form');

if (newsletterForm) {
    const emailInput = newsletterForm.querySelector('input[type="email"]');
    const subscribeBtn = newsletterForm.querySelector('button');

    subscribeBtn.addEventListener('click', (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();

        // Clear previous error state
        emailInput.classList.remove('input-error');

        if (!email) {
            emailInput.classList.add('input-error');
            emailInput.placeholder = 'Please enter your email';
            return;
        }

        if (!isValidEmail(email)) {
            emailInput.classList.add('input-error');
            emailInput.placeholder = 'Please enter a valid email';
            emailInput.value = '';
            return;
        }

        // Success — replace form with confirmation
        newsletterForm.innerHTML = `
            <div class="newsletter-success">
                <span>✓</span>
                <p>You're on the list. Welcome to Krint Tufwale.</p>
            </div>
        `;
    });
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}