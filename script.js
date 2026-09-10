/* ============================================================
   KRINT TUFWALE — script.js
   ============================================================ */

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

/* Authentication + the API base live in config.js/auth.js
   (loaded before this file): JWT in sessionStorage,
   Authorization: Bearer — see window.KTAuth. Add to Cart is
   gated on sign-in: signed-out visitors go to login.html
   (with a ?next= hop back). */

function navigateTo(url) {
    // Test seam — in the browser this is a plain navigation
    if (typeof window.__ktTestNavigate === 'function') {
        window.__ktTestNavigate(url);
        return;
    }
    window.location.href = url;
}

function currentRelativeUrl() {
    return location.pathname.split('/').pop() + location.search;
}

function requireLoginBeforeAction() {
    navigateTo(`login.html?next=${encodeURIComponent(currentRelativeUrl())}`);
}

/* =========================================================
   3. CAMPAIGN BANNER — Optimized Parallax
   ========================================================= */

const campaign = document.querySelector('.campaign');

if (campaign) {
    let ticking = false;

    const updateParallax = () => {
        const scrolled = window.scrollY - campaign.offsetTop;

        campaign.style.backgroundPositionY =
            `calc(50% + ${scrolled * 0.3}px)`;

        ticking = false;
    };

    const onScroll = () => {
        if (!ticking) {
            window.requestAnimationFrame(updateParallax);
        }
    };

    const campaignObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {

            if (entry.isIntersecting) {
                window.addEventListener(
                    'scroll',
                    onScroll,
                    { passive: true }
                );

                onScroll();

            } else {
                window.removeEventListener('scroll', onScroll);
            }

        });
    }, {
        threshold: 0
    });

    campaignObserver.observe(campaign);
}
/* =========================================================
   4b. PAGE RENDERING — shop grid, product detail, cart page
   These run before the Add to Cart bindings below, so
   buttons created here are picked up by section 5.
   ========================================================= */

/* SHOP GRID (shop.html) — rendered from products.js so the
   catalog file stays the single source of truth */
const shopGrid = document.getElementById("shopGrid");

if (shopGrid && typeof KT_PRODUCTS !== "undefined") {

    shopGrid.innerHTML = KT_PRODUCTS
        .slice() // keep the canonical array untouched
        .sort((a, b) => a.order - b.order)
        .map(product => `
            <article
                class="product-card"
                data-category="${product.category}"
                data-price="${product.price}"
                data-order="${product.order}"
                data-product-id="${product.id}"
            >

                <a
                    href="product.html?id=${product.id}"
                    class="product-link"
                >

                    <div class="product-image">

                        <img
                            src="${product.image}"
                            alt="${product.name}"
                            loading="lazy"
                        >

                        ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ""}

                        <span class="quick-view">
                            View Piece
                            <span>→</span>
                        </span>

                    </div>

                </a>


                <div class="product-details">

                    <div>

                        <h2>
                            ${product.name}
                        </h2>

                        <p>
                            ${product.fit}
                        </p>

                    </div>


                    <div class="product-details-side">

                        <span class="product-price">
                            ${formatZMW(product.price)}
                        </span>


                        <button
                            type="button"
                            class="add-to-cart"
                            data-product-id="${product.id}"
                            aria-label="Add ${product.name} to cart"
                        >
                            Add to Cart
                        </button>

                    </div>

                </div>

            </article>
        `)
        .join("");
}


/* PRODUCT DETAIL (product.html) — reads ?id= and renders
   that piece from products.js */
const productDetail = document.getElementById("productDetail");

if (productDetail && typeof KT_PRODUCTS !== "undefined") {

    const productId =
        new URLSearchParams(window.location.search).get("id");

    const product = getProductById(productId);
    const notFound = document.getElementById("productNotFound");

    if (product) {

        document.title = `${product.name} | Krint Tufwale`;

        document.getElementById("breadcrumbName").textContent =
            product.name;

        const productImage = document.getElementById("productImage");
        productImage.src = product.image;
        productImage.alt = product.name;

        document.getElementById("productCategory").textContent =
            product.category;

        document.getElementById("productName").textContent =
            product.name;

        document.getElementById("productFit").textContent =
            product.fit;

        document.getElementById("productPrice").textContent =
            formatZMW(product.price);

        document.getElementById("detailAddToCart").dataset.productId =
            product.id;

        productDetail.hidden = false;

    } else if (notFound) {

        notFound.hidden = false;
    }


    /* Quantity selector — the − / + buttons step the input
       between 1 and 10 */
    const qtyInput = document.getElementById("productQty");

    document.querySelectorAll(".qty-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (!qtyInput) return;

            const step = Number(btn.dataset.step);
            const current = parseInt(qtyInput.value, 10) || 1;
            const next = Math.min(10, Math.max(1, current + step));

            qtyInput.value = next;
        });
    });

    if (qtyInput) {
        qtyInput.addEventListener("change", () => {
            const current = parseInt(qtyInput.value, 10) || 1;
            qtyInput.value = Math.min(10, Math.max(1, current));
        });
    }
}


/* CART PAGE (cart.html) — renders the bag's line items and
   subtotal from cart.js */
const cartItemsEl = document.getElementById("cartItems");

function renderCartPage() {

    if (!cartItemsEl || typeof Cart === "undefined") return;

    const lines = Cart.getCartLines();
    const summary = document.getElementById("cartSummary");
    const emptyState = document.getElementById("cartEmpty");

    if (lines.length === 0) {

        cartItemsEl.innerHTML = "";
        if (summary) summary.hidden = true;
        if (emptyState) emptyState.hidden = false;
        return;
    }

    if (summary) summary.hidden = false;
    if (emptyState) emptyState.hidden = true;

    cartItemsEl.innerHTML = lines.map(({ product, qty, lineTotal }) => `

        <article class="cart-line" data-id="${product.id}">

            <a
                class="cart-line-image"
                href="product.html?id=${product.id}"
            >
                <img
                    src="${product.image}"
                    alt="${product.name}"
                >
            </a>


            <div class="cart-line-info">

                <h3>
                    <a href="product.html?id=${product.id}">
                        ${product.name}
                    </a>
                </h3>

                <p>
                    ${product.fit} — ${formatZMW(product.price)}
                </p>


                <div class="qty-selector cart-qty">

                    <button
                        type="button"
                        class="qty-btn"
                        data-cart-action="decrease"
                        data-id="${product.id}"
                        aria-label="Decrease quantity"
                    >
                        −
                    </button>


                    <input
                        type="number"
                        value="${qty}"
                        min="1"
                        max="10"
                        data-id="${product.id}"
                        aria-label="Quantity for ${product.name}"
                    >


                    <button
                        type="button"
                        class="qty-btn"
                        data-cart-action="increase"
                        data-id="${product.id}"
                        aria-label="Increase quantity"
                    >
                        +
                    </button>

                </div>

            </div>


            <div class="cart-line-side">

                <span class="cart-line-total">
                    ${formatZMW(lineTotal)}
                </span>


                <button
                    type="button"
                    class="cart-remove"
                    data-cart-action="remove"
                    data-id="${product.id}"
                >
                    Remove
                </button>

            </div>

        </article>
    `).join("");

    const subtotal = document.getElementById("cartSubtotal");

    if (subtotal) {
        subtotal.textContent = formatZMW(Cart.getCartTotal());
    }
}

if (cartItemsEl && typeof Cart !== "undefined") {

    renderCartPage();

    // One delegated listener covers every stepper and remove
    // button, including buttons in later re-renders
    cartItemsEl.addEventListener("click", (e) => {

        const actionBtn = e.target.closest("[data-cart-action]");
        if (!actionBtn) return;

        const id = actionBtn.dataset.id;
        const action = actionBtn.dataset.cartAction;
        const line = Cart.getCart().find((entry) => entry.id === id);

        if (action === "remove") {

            Cart.removeFromCart(id);

        } else if (action === "increase") {

            Cart.updateQuantity(id, (line ? line.qty : 0) + 1);

        } else if (action === "decrease") {

            Cart.updateQuantity(id, (line ? line.qty : 1) - 1);
        }

        renderCartPage();
    });

    // Typing a quantity straight into the input
    cartItemsEl.addEventListener("change", (e) => {

        if (!e.target.matches("input[type='number']")) return;

        const qty = parseInt(e.target.value, 10) || 1;
        Cart.updateQuantity(e.target.dataset.id, Math.min(10, Math.max(1, qty)));

        renderCartPage();
    });
}


/* CHECKOUT (cart.html) — demo stage. Places the order through
   POST /api/orders (which re-prices everything server-side from
   products-catalog), clears the bag and hops to the
   confirmation page. Name/email are NOT asked for: they come
   from the signed-in account (KTAuth) on the server. */
const checkoutForm = document.getElementById("checkoutForm");

if (checkoutForm && typeof Cart !== "undefined") {

    const phoneInput = document.getElementById("checkoutPhone");
    const addressInput = document.getElementById("checkoutAddress");
    const checkoutStatus = checkoutForm.querySelector(".form-status");
    const checkoutBtn = document.getElementById("checkoutBtn");

    // Remind the user who is placing the order (name/email come
    // from the account, so the form only asks for the rest)
    function renderOrderingAs() {
        const el = document.getElementById("cartOrderingAs");
        if (!el) return;

        const currentUser = (typeof KTAuth !== "undefined") ? KTAuth.getUser() : null;

        if (currentUser && currentUser.name) {
            el.textContent = `Ordering as ${currentUser.name} (${currentUser.email})`;
            el.hidden = false;
        } else {
            el.hidden = true;
        }
    }
    renderOrderingAs();
    // Re-render when the session check resolves (or the user signs out)
    document.addEventListener("kt:auth", renderOrderingAs);

    function setCheckoutError(message) {
        if (!checkoutStatus) return;
        checkoutStatus.textContent = message;
        checkoutStatus.style.color = message ? "red" : "";
        checkoutStatus.hidden = !message;
    }

    function validateCheckout() {
        let ok = true;

        const phone = phoneInput.value.trim();
        const address = addressInput.value.trim();

        phoneInput.classList.remove("input-error");
        addressInput.classList.remove("input-error");

        // Same loose pattern the backend uses: +260..., 097..., etc.
        if (!/^[+\d][\d\s\-()]{6,19}$/.test(phone)) {
            phoneInput.classList.add("input-error");
            ok = false;
        }

        if (address.length < 5 || address.length > 300) {
            addressInput.classList.add("input-error");
            ok = false;
        }

        if (!ok) {
            setCheckoutError(
                "Please enter a valid phone number and a delivery address (5+ characters)."
            );
        }
        return ok;
    }

    checkoutForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        setCheckoutError("");

        if (Cart.getCartCount() === 0) {
            setCheckoutError("Your bag is empty.");
            return;
        }

        if (typeof KTAuth === "undefined") {
            setCheckoutError("Could not reach the sign-in service. Please refresh and try again.");
            return;
        }

        // Session check first — expired tokens redirect cleanly
        const currentUser = await KTAuth.ready;

        if (!currentUser) {
            requireLoginBeforeAction();
            return;
        }

        if (!validateCheckout()) return;

        // { id, qty } pairs only — the server prices the order
        const items = Cart.getCartLines().map((line) => ({
            id: line.product.id,
            qty: line.qty,
        }));

        const payload = {
            items,
            phone: phoneInput.value.trim(),
            deliveryAddress: addressInput.value.trim(),
        };

        checkoutBtn.disabled = true;

        try {
            const res = await KTAuth.authFetch(`${API_BASE}/orders`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            // Session died mid-checkout — sign in, then come back
            // to the bag to finish the order
            if (res.status === 401) {
                requireLoginBeforeAction();
                return;
            }

            if (!res.ok) {
                const detail = data.details
                    ? Object.values(data.details)[0]
                    : data.error;
                setCheckoutError(detail || "Could not place your order. Please try again.");
                return;
            }

            // Order placed — empty the bag and confirm
            Cart.clear();
            navigateTo(`order-confirmation.html?orderId=${data.orderId}`);

        } catch (err) {
            setCheckoutError("Network error. Is the backend running? Please try again.");
        } finally {
            checkoutBtn.disabled = false;
        }
    });
}


/* ORDER CONFIRMATION (order-confirmation.html?orderId=N) —
   fetches the just-placed order via the authenticated endpoint
   and renders it. Handles signed-out, not-found and backend
   error states. */
const orderContent = document.getElementById("orderContent");

if (orderContent && typeof KTAuth !== "undefined") {

    const stateEls = {
        content: orderContent,
        needsAuth: document.getElementById("orderNeedsAuth"),
        notFound: document.getElementById("orderNotFound"),
        error: document.getElementById("orderError"),
    };

    function showOrderState(name) {
        Object.entries(stateEls).forEach(([key, el]) => {
            if (el) el.hidden = key !== name;
        });
    }

    function formatOrderDate(sqlDate) {
        try {
            // sqlite datetime('now') is 'YYYY-MM-DD HH:MM:SS' (UTC)
            const date = new Date(String(sqlDate).replace(" ", "T") + "Z");
            if (Number.isNaN(date.getTime())) return "";
            return date.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
            });
        } catch (err) {
            return "";
        }
    }

    async function loadOrder() {

        const orderId = Number(
            new URLSearchParams(location.search).get("orderId")
        );

        if (!Number.isInteger(orderId) || orderId < 1) {
            showOrderState("notFound");
            return;
        }

        // Come back here after signing in
        const signInLink = document.getElementById("orderSignInLink");
        if (signInLink) {
            signInLink.href = `login.html?next=${encodeURIComponent(
                currentRelativeUrl()
            )}`;
        }

        try {
            const res = await KTAuth.authFetch(`${API_BASE}/orders/${orderId}`);

            if (res.status === 401) {
                showOrderState("needsAuth");
                return;
            }

            if (res.status === 404) {
                showOrderState("notFound");
                return;
            }

            if (!res.ok) {
                showOrderState("error");
                return;
            }

            const { order } = await res.json();

            document.getElementById("orderNumber").textContent =
                `KT-${String(order.id).padStart(4, "0")}`;

            document.getElementById("orderDate").textContent =
                formatOrderDate(order.created_at);

            document.getElementById("orderDelivery").textContent =
                [order.delivery_address, order.phone]
                    .filter(Boolean)
                    .join(" · ");

            document.getElementById("orderLines").innerHTML = order.items
                .map(
                    (item) => `
                    <article class="cart-line confirmation-line">

                        <div class="cart-line-info">

                            <h3>${item.name}</h3>

                            <p>
                                Qty ${item.qty} × ${formatZMW(item.unitPriceZmw)}
                            </p>

                        </div>


                        <div class="cart-line-side">

                            <span class="cart-line-total">
                                ${formatZMW(item.lineTotalZmw)}
                            </span>

                        </div>

                    </article>
                `
                )
                .join("");

            document.getElementById("orderTotal").textContent =
                formatZMW(order.total_zmw);

            showOrderState("content");

        } catch (err) {
            showOrderState("error");
        }
    }

    const retryBtn = document.getElementById("orderRetryBtn");
    if (retryBtn) {
        retryBtn.addEventListener("click", () => {
            showOrderState("content"); // acts as a brief loading state
            loadOrder();
        });
    }

    loadOrder();
}


/* 5. ADD TO CART — adds to the real cart (see cart.js).
   Every button declares its product with data-product-id.
   On product.html the quantity comes from the #productQty
   selector; catalog cards always add 1. */
document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        e.preventDefault();

        // Wait for the session check, then require sign-in
        const currentUser = (typeof KTAuth !== 'undefined')
            ? await KTAuth.ready
            : null;

        if (!currentUser) {
            requireLoginBeforeAction();
            return;
        }

        const productId = btn.dataset.productId;

        if (!productId || typeof Cart === 'undefined') return;
        if (btn.classList.contains('added')) return;

        const qtyInput = document.getElementById('productQty');
        const qty = qtyInput && btn.id === 'detailAddToCart'
            ? parseInt(qtyInput.value, 10) || 1
            : 1;

        Cart.addToCart(productId, qty);

        // Visual feedback
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
            _honey: contactForm.querySelector('[name="_honey"]').value,
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
   Bound on pages that have the filter toolbar (shop.html).
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

         if (productCount) {

            productCount.textContent =
                `${visibleProducts} ${visibleProducts === 1 ? "Piece" : "Pieces"}`;
        }

    });

});



/* =========================================================
   PRODUCT SORTING
   Only bound on pages that actually have the toolbar
   (shop.html) — guarded so other pages don't error.
========================================================= */

const sortSelect =
    document.querySelector("#sortProducts");
const productsGrid =
    document.querySelector(".products-grid");


if (sortSelect && productsGrid) {

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

}

document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();

        const productId = btn.dataset.productId;

        if (!productId || typeof Cart === 'undefined') return;
        if (btn.classList.contains('added')) return;

        // Require an account before anything goes in the cart
        if (typeof KTAuth === 'undefined' || !KTAuth.isLoggedIn()) {
            window.location.href = `login.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
            return;
        }

        const qtyInput = document.getElementById('productQty');
        const qty = qtyInput && btn.id === 'detailAddToCart'
            ? parseInt(qtyInput.value, 10) || 1
            : 1;

        Cart.addToCart(productId, qty);

        // Visual feedback
        const original = btn.textContent;
        btn.textContent = '✓ ADDED';
        btn.classList.add('added');
        setTimeout(() => {
            btn.textContent = original;
            btn.classList.remove('added');
        }, 2000);
    });
});