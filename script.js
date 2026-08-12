/* ============================================================
   KRINT TUFWALE — script.js
   ============================================================ */

const API_BASE = 'https://q9bqt8rn-4000.uks1.devtunnels.ms/api'; // ← swap for your deployed backend URL

/* 1. NAVBAR — sticky scroll behaviour */
const header = document.querySelector('header');
window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 80);
});

/* 0. MOBILE NAV — hamburger toggle */
const menuToggle = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('header nav');

if (menuToggle && mobileNav) {
    menuToggle.addEventListener('click', () => {
        mobileNav.classList.toggle('nav-open');
        menuToggle.classList.toggle('active');
    });
}


/* 2. SCROLL REVEAL */
const revealElements = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.15 });
revealElements.forEach(el => revealObserver.observe(el));

// Section 3: CAMPAIGN BANNER — Optimized Parallax
const campaign = document.querySelector('.campaign');

if (campaign) {
    let ticking = false;

    // 1. Separate calculation logic
    const updateParallax = () => {
        const scrolled = window.scrollY - campaign.offsetTop;
        campaign.style.backgroundPositionY = `calc(50% + ${scrolled * 0.3}px)`;
        ticking = false;
    };

    // 2. Frame-throttled scroll handler
    const onScroll = () => {
        if (!ticking) {
            window.requestAnimationFrame(updateParallax);
            ticking = true;
        }
    };

    // 3. IntersectionObserver toggles the listener on/off
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                // Attach scroll listener ONLY when banner enters viewport
                window.addEventListener('scroll', onScroll, { passive: true });
                onScroll(); // Run once immediately upon entry
            } else {
                // Remove scroll listener completely when banner leaves viewport
                window.removeEventListener('scroll', onScroll);
            }
        });
    }, {
        threshold: 0 // Fires as soon as 1px enters or leaves the screen
    });

    observer.observe(campaign);
}

const campaignBg = document.querySelector('.campaign-bg');

const updateParallax = () => {
    const scrolled = window.scrollY - campaign.offsetTop;
    // Hardware accelerated translation along the Y-axis
    campaignBg.style.transform = `translate3d(0, ${scrolled * 0.3}px, 0)`;
    ticking = false;
};


/* 4. COLLECTION CARDS — 3D tilt */
document.querySelectorAll('.collection-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const rotateX = -(y / rect.height) * 8;
        const rotateY = (x / rect.width) * 8;
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    });
    card.addEventListener('mouseleave', () => {
        card.style.transform = `perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)`;
    });
});

/* 5. ADD TO CART — click feedback */
document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (btn.classList.contains('added')) return;
        const original = btn.textContent;
        btn.textContent = '✓ ADDED';
        btn.classList.add('added');
        setTimeout(() => {
            btn.textContent = original;
            btn.classList.remove('added');
        }, 2000);
    });
});

/* 6. NEWSLETTER FORMS — validation + success state
   Covers every newsletter block on the site: the footer's
   .newsletter-form (a plain <div>, no <form> tag) as well as
   the in-page <form> sections (.newsletter, .journal-newsletter,
   .newsletter-content). */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function initNewsletterForm(container) {
    const emailInput = container.querySelector('input[type="email"]');
    const subscribeBtn = container.querySelector('button');
    if (!emailInput || !subscribeBtn) return;

    const isForm = container.tagName === 'FORM';
    const eventName = isForm ? 'submit' : 'click';
    const eventTarget = isForm ? container : subscribeBtn;

    eventTarget.addEventListener(eventName, (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
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

        container.innerHTML = `
            <div class="newsletter-success">
                <span>✓</span>
                <p>You're on the list. Welcome to Krint Tufwale.</p>
            </div>
        `;
    });
}

document.querySelectorAll(
    '.newsletter-form, .newsletter form, .journal-newsletter form, .newsletter-content form'
).forEach(initNewsletterForm);

/* 7. CONTACT FORM — submit to backend */
const contactForm = document.querySelector('.contact-form form');
const statusDiv = document.getElementById('form-status');

if (contactForm && statusDiv) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
            name: contactForm.querySelector('[name="name"]').value.trim(),
            email: contactForm.querySelector('[name="email"]').value.trim(),
            subject: contactForm.querySelector('[name="subject"]').value.trim(),
            message: contactForm.querySelector('[name="message"]').value.trim(),
        };

        try {
            const res = await fetch(`${API_BASE}/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (!res.ok) {
                statusDiv.textContent = data.error || 'Submission failed';
                statusDiv.style.color = 'red';
                return;
            }

            statusDiv.textContent = "Thanks — we've received your message.";
            statusDiv.style.color = 'green';
            contactForm.reset();
        } catch (err) {
            statusDiv.textContent = 'Network error. Please try again.';
            statusDiv.style.color = 'red';
            console.error(err);
        }
    });
}

/* =========================================================
   PRODUCTS PAGE
========================================================= */


/* =========================================================
   PRODUCT FILTERING
========================================================= */

const filterButtons = document.querySelectorAll(".filter-btn");
const productCards = document.querySelectorAll(".product-card");
const productCount = document.getElementById("productCount");


filterButtons.forEach(button => {

    button.addEventListener("click", () => {

        const filter = button.dataset.filter;


        /* Remove active state */

        filterButtons.forEach(btn => {
            btn.classList.remove("active");
        });


        /* Activate selected filter */

        button.classList.add("active");


        let visibleProducts = 0;


        productCards.forEach(card => {

            const category = card.dataset.category;


            if (
                filter === "all" ||
                category === filter
            ) {

                card.style.display = "";

                visibleProducts++;

            } else {

                card.style.display = "none";

            }

        });


        /* Update count */

        productCount.textContent =
            `${visibleProducts} ${visibleProducts === 1 ? "Piece" : "Pieces"}`;

    });

});



/* =========================================================
   PRODUCT SORTING
========================================================= */

const sortSelect =
    document.getElementById("sortProducts");

const productsGrid =
    document.querySelector(".products-grid");


sortSelect.addEventListener("change", () => {

    const products =
        Array.from(
            productsGrid.querySelectorAll(".product-card")
        );


    const sortValue =
        sortSelect.value;


    products.sort((a, b) => {

        const priceA =
            Number(a.dataset.price);

        const priceB =
            Number(b.dataset.price);


        const orderA =
            Number(a.dataset.order);

        const orderB =
            Number(b.dataset.order);


        if (sortValue === "price-low") {

            return priceA - priceB;

        }


        if (sortValue === "price-high") {

            return priceB - priceA;

        }


        if (sortValue === "newest") {

            return orderB - orderA;

        }


        return orderA - orderB;

    });


    products.forEach(product => {

        productsGrid.appendChild(product);

    });

});