/* ============================================================
   KRINT TUFWale — SHARED STOREFRONT HEADER
   Layer 1: presentation-only component.

   Compatibility contract:
   - Preserves .navbar, header nav, .menu-toggle, .icons,
     .cart-count and account aria-label hooks.
   - Does not call the API or touch authentication/cart storage.
   - Loaded before auth.js and script.js on storefront pages.
   ============================================================ */

(() => {
    const mount = document.querySelector("[data-kt-header]");
    if (!mount) return;

    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    const activePage = currentPage === "product.html" ? "shop.html" : currentPage;

    const links = [
        ["index.html", "Home"],
        ["shop.html", "Shop"],
        ["collections.html", "Collections"],
        ["journal.html", "Journal"],
        ["our-story.html", "Our Story"],
        ["contact.html", "Contact"]
    ];

    const navigation = links.map(([href, label]) => {
        const active = activePage === href ? ' class="active" aria-current="page"' : "";
        return `<li><a href="${href}"${active}>${label}</a></li>`;
    }).join("");

    mount.innerHTML = `
        <header>
            <section class="navbar">
                <div class="brand">
                    <div class="logo">
                        <a href="index.html" aria-label="Krint Tufwale home">
                            <img src="images/logo.png" alt="Krint Tufwale">
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
                    <a href="#" aria-label="Search">
                        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                    </a>
                    <a href="cart.html" aria-label="Shopping bag">
                        <i class="fa-solid fa-bag-shopping" aria-hidden="true"></i>
                        <span class="cart-count"></span>
                    </a>
                    <a href="login.html" aria-label="User account">
                        <i class="fa-solid fa-user" aria-hidden="true"></i>
                    </a>
                </div>
            </section>
        </header>
    `;
})();
