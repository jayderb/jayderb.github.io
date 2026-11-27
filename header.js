/* ============================================================
   KRINT TUFWale — SHARED STOREFRONT HEADER
   Layer 1: presentation-only component.

   Compatibility contract:
   - Preserves .navbar, header nav, .menu-toggle, .icons,
     .cart-count and account aria-label hooks.
   - Does not call the API or touch authentication/cart storage.
   - Loaded before auth.js and script.js on storefront pages.

   If the page already includes the header (written by
   npm run seo so crawlers see the links), this only marks the
   current page. There is no catalogue search: the magnifying
   glass goes to the shop.
   ============================================================ */

(() => {
    const mount = document.querySelector("[data-kt-header]");
    if (!mount) return;

    const path = window.location.pathname;
    const file = path.split("/").pop() || "index.html";
    const inPieces = path.includes("/pieces/");
    const activePage = (file === "product.html" || inPieces) ? "shop.html" : file;

    function markActive(nav) {
        nav.querySelectorAll("a").forEach((link) => {
            const hrefFile = (link.getAttribute("href") || "").split("/").pop();
            const active = hrefFile === activePage;
            link.classList.toggle("active", active);
            if (active) link.setAttribute("aria-current", "page");
            else link.removeAttribute("aria-current");
        });
    }

    const existing = mount.querySelector("header");
    if (existing) {
        const nav = existing.querySelector("nav");
        if (nav) markActive(nav);
        return;
    }

    const links = [
        ["/index.html", "Home"],
        ["/shop.html", "Shop"],
        ["/collections.html", "Collections"],
        ["/journal.html", "Journal"],
        ["/our-story.html", "Our Story"],
        ["/contact.html", "Contact"]
    ];

    const navigation = links.map(([href, label]) => {
        const hrefFile = href.split("/").pop();
        const active = activePage === hrefFile ? ' class="active" aria-current="page"' : "";
        return `<li><a href="${href}"${active}>${label}</a></li>`;
    }).join("");

    mount.innerHTML = `
        <header>
            <section class="navbar">
                <div class="brand">
                    <div class="logo">
                        <a href="/index.html" aria-label="Krint Tufwale home">
                            <img src="/images/logo.png" alt="Krint Tufwale logo">
                        </a>
                    </div>
                    <div class="brand-name">
                        <span>Krint Tufwale</span>
                        <small>Tufwale Nokusansamuka</small>
                    </div>
                </div>

                <nav aria-label="Main navigation">
                    <ul>${navigation}</ul>
                </nav>

                <button
                    class="menu-toggle"
                    type="button"
                    aria-label="Toggle menu"
                    aria-expanded="false"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                <div class="icons">
                    <a href="/shop.html" aria-label="Shop the collection">
                        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                    </a>
                    <a href="/cart.html" aria-label="Shopping bag">
                        <i class="fa-solid fa-bag-shopping" aria-hidden="true"></i>
                        <span class="cart-count"></span>
                    </a>
                    <a href="/login.html" aria-label="User account">
                        <i class="fa-solid fa-user" aria-hidden="true"></i>
                    </a>
                </div>
            </section>
        </header>
    `;
})();
