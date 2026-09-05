/* ============================================================
   KRINT TUFWALE — cart.js
   Shopping cart module. No dependencies, no frameworks.

   The cart lives in localStorage as [{ id, qty }] pairs only —
   never full product objects. Prices, names and images are
   always joined fresh from products.js when totals are needed,
   so a price change in the catalog is reflected immediately
   for every open bag.

   Exposed API (used by script.js and the cart page):
     Cart.addToCart(id, qty)
     Cart.removeFromCart(id)
     Cart.updateQuantity(id, qty)
     Cart.getCart()
     Cart.getCartCount()
     Cart.getCartTotal()
     Cart.getCartLines()
     Cart.renderCartBadge()
   ============================================================ */

const CART_STORAGE_KEY = "kt_cart";

const Cart = (() => {

    /* --------------------------------------------------------
       STORAGE — read/write the { id, qty } pairs
    -------------------------------------------------------- */

    function read() {
        try {
            const raw = localStorage.getItem(CART_STORAGE_KEY);
            if (!raw) return [];

            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];

            // Keep only well-formed entries; drop anything corrupted
            return parsed
                .filter((entry) => entry && typeof entry.id === "string")
                .map((entry) => ({
                    id: entry.id,
                    qty: Number.isInteger(entry.qty) && entry.qty > 0 ? entry.qty : 1,
                }));
        } catch (err) {
            // Private browsing / corrupted data — start with an empty bag
            return [];
        }
    }

    function write(cart) {
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        } catch (err) {
            console.error("Krint Tufwale: could not save cart.", err);
        }
    }


    /* --------------------------------------------------------
       ACTIONS
    -------------------------------------------------------- */

    function addToCart(id, qty = 1) {
        if (typeof getProductById !== "function" || !getProductById(id)) {
            console.error(`Krint Tufwale: unknown product "${id}" — not added.`);
            return false;
        }

        const cart = read();
        const amount = Number.isInteger(qty) && qty > 0 ? qty : 1;
        const existing = cart.find((entry) => entry.id === id);

        if (existing) {
            existing.qty += amount;
        } else {
            cart.push({ id, qty: amount });
        }

        write(cart);
        renderCartBadge();
        return true;
    }

    function removeFromCart(id) {
        const cart = read().filter((entry) => entry.id !== id);
        write(cart);
        renderCartBadge();
    }

    /* Setting a quantity of 0 or less removes the line */
    function updateQuantity(id, qty) {
        const cart = read();
        const entry = cart.find((line) => line.id === id);
        if (!entry) return;

        if (!Number.isInteger(qty) || qty <= 0) {
            removeFromCart(id);
            return;
        }

        entry.qty = Math.min(qty, 99); // sane upper bound per line
        write(cart);
        renderCartBadge();
    }


    /* --------------------------------------------------------
       READ-ONLY HELPERS — joined against products.js
    -------------------------------------------------------- */

    function getCart() {
        return read();
    }

    /* Total number of units across all lines (what the badge shows) */
    function getCartCount() {
        return read().reduce((sum, entry) => sum + entry.qty, 0);
    }

    /* Lines enriched with the live product data, for the cart page.
       Unknown ids (e.g. a product removed from the catalog) are dropped. */
    function getCartLines() {
        if (typeof getProductById !== "function") return [];

        return read()
            .map((entry) => {
                const product = getProductById(entry.id);
                if (!product) return null;
                return {
                    product,
                    qty: entry.qty,
                    lineTotal: product.price * entry.qty,
                };
            })
            .filter(Boolean);
    }

    /* Subtotal in ZMW, computed from the current catalog prices */
    function getCartTotal() {
        return getCartLines().reduce((sum, line) => sum + line.lineTotal, 0);
    }


    /* --------------------------------------------------------
       BADGE — the .cart-count element in the navbar bag icon
    -------------------------------------------------------- */

    function renderCartBadge() {
        if (typeof document === "undefined") return;

        const badges = document.querySelectorAll(".cart-count");
        const count = getCartCount();

        badges.forEach((badge) => {
            badge.textContent = count > 99 ? "99+" : String(count);
            badge.classList.toggle("has-items", count > 0);
        });
    }


    return {
        addToCart,
        removeFromCart,
        updateQuantity,
        getCart,
        getCartCount,
        getCartTotal,
        getCartLines,
        renderCartBadge,
    };
})();

/* Exposed on window so the cart is inspectable in devtools
   and available to any script on the page */
window.Cart = Cart;


/* Paint the badge as soon as the module loads (script tag sits
   at the end of <body>, so the navbar already exists) */
if (typeof document !== "undefined") {
    Cart.renderCartBadge();
}