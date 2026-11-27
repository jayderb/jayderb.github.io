#!/usr/bin/env node
/* ============================================================
   KRINT TUFWALE — generate SEO / answer-engine files

   Reads site.config.json and products.js (checked against
   src/products-catalog.js) and writes:

   - robots.txt, sitemap.xml, llms.txt, site.webmanifest
   - static product pages in pieces/<id>.html
   - per-page <title>, canonical, Open Graph, Twitter, JSON-LD
   - a crawlable shop grid, home selection, header and FAQ

   Re-run after a price, product or domain change:

     npm run seo

   Host note: canonical URLs are absolute, from site.config.json
   siteUrl. Page assets use root paths (/style.css), so the site
   is expected at the domain root (Firebase Hosting today, or
   S3/CloudFront later). Change siteUrl and run this again when
   the domain moves. Do not edit robots.txt, sitemap.xml,
   llms.txt, site.webmanifest or pieces/*.html by hand.
   ============================================================ */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const config = JSON.parse(fs.readFileSync(path.join(root, "site.config.json"), "utf8"));
const SITE = config.siteUrl.replace(/\/$/, "");

const CATEGORY_LABEL = {
    shirts: "Shirts",
    trousers: "Trousers",
    outerwear: "Outerwear",
    knitwear: "Knitwear",
    accessories: "Accessories",
};

const PRIVATE_PATHS = [
    "/admin.html",
    "/cart.html",
    "/login.html",
    "/signup.html",
    "/forgot-password.html",
    "/reset-password.html",
    "/order-confirmation.html",
    "/product.html",
];

const AI_AGENTS = ["GPTBot", "OAI-SearchBot", "PerplexityBot", "ClaudeBot", "Google-Extended"];

const PAGES = [
    {
        file: "index.html",
        path: "/",
        title: "Krint Tufwale | Contemporary Clothing Designed in Lusaka",
        description: "Krint Tufwale designs contemporary everyday clothing in Lusaka, Zambia. Shop shirts, trousers, outerwear, knitwear and accessories, priced in Zambian kwacha (ZMW).",
        robots: "index, follow, max-image-preview:large",
        schemaType: "WebPage",
        preloadImage: "/images/banner.jpg",
        sitemap: { priority: "1.0", changefreq: "weekly" },
        crumbs: [{ name: "Home", path: "/" }],
    },
    {
        file: "shop.html",
        path: "/shop.html",
        title: "Shop Contemporary Essentials | Krint Tufwale",
        description: "Shop Krint Tufwale: shirts, trousers, outerwear, knitwear and accessories designed in Lusaka, Zambia. Prices are in Zambian kwacha (ZMW).",
        robots: "index, follow, max-image-preview:large",
        schemaType: "CollectionPage",
        sitemap: { priority: "0.9", changefreq: "weekly" },
        crumbs: [
            { name: "Home", path: "/" },
            { name: "Shop", path: "/shop.html" },
        ],
    },
    {
        file: "collections.html",
        path: "/collections.html",
        title: "Collections — Everyday, Tailored, Essentials | Krint Tufwale",
        description: "Everyday, Tailored and Essentials: the Krint Tufwale collections of contemporary clothing designed in Zambia.",
        robots: "index, follow, max-image-preview:large",
        schemaType: "CollectionPage",
        sitemap: { priority: "0.8", changefreq: "monthly" },
        crumbs: [
            { name: "Home", path: "/" },
            { name: "Collections", path: "/collections.html" },
        ],
    },
    {
        file: "journal.html",
        path: "/journal.html",
        title: "Journal | Krint Tufwale",
        description: "The Krint Tufwale journal: notes on design, craft and everyday life behind the collections, from Lusaka, Zambia.",
        robots: "index, follow, max-image-preview:large",
        schemaType: "WebPage",
        sitemap: { priority: "0.6", changefreq: "monthly" },
        crumbs: [
            { name: "Home", path: "/" },
            { name: "Journal", path: "/journal.html" },
        ],
    },
    {
        file: "our-story.html",
        path: "/our-story.html",
        title: "Our Story | Krint Tufwale",
        description: "Krint Tufwale is a clothing brand designed in Lusaka, Zambia. Read why the label began, and the idea of quiet confidence.",
        robots: "index, follow, max-image-preview:large",
        schemaType: "AboutPage",
        sitemap: { priority: "0.7", changefreq: "monthly" },
        crumbs: [
            { name: "Home", path: "/" },
            { name: "Our Story", path: "/our-story.html" },
        ],
    },
    {
        file: "contact.html",
        path: "/contact.html",
        title: "Contact Krint Tufwale | Lusaka, Zambia",
        description: "Contact Krint Tufwale in Lusaka, Zambia. The published email is hello@krinttufwale.com for orders, collaborations, wholesale and press.",
        robots: "index, follow, max-image-preview:large",
        schemaType: "ContactPage",
        sitemap: { priority: "0.6", changefreq: "yearly" },
        crumbs: [
            { name: "Home", path: "/" },
            { name: "Contact", path: "/contact.html" },
        ],
    },
    {
        file: "faq.html",
        path: "/faq.html",
        title: "Questions | Krint Tufwale",
        description: "Where Krint Tufwale is based, what it sells, how ZMW prices work, and how to order. Policies that are not published yet are marked on this page.",
        robots: "index, follow, max-image-preview:large",
        schemaType: "FAQPage",
        sitemap: { priority: "0.5", changefreq: "monthly" },
        crumbs: [
            { name: "Home", path: "/" },
            { name: "Questions", path: "/faq.html" },
        ],
    },
    {
        file: "product.html",
        path: "/product.html",
        title: "Pieces | Krint Tufwale",
        description: "Index of Krint Tufwale pieces. Open a piece for its price, size and colour. This shell is not the canonical product URL.",
        robots: "noindex, follow",
        private: true,
    },
    {
        file: "cart.html",
        path: "/cart.html",
        title: "Your Bag | Krint Tufwale",
        description: "Your Krint Tufwale bag. This page is private to the shopper.",
        robots: "noindex, nofollow",
        private: true,
    },
    {
        file: "login.html",
        path: "/login.html",
        title: "Sign In | Krint Tufwale",
        description: "Sign in to a Krint Tufwale account.",
        robots: "noindex, nofollow",
        private: true,
    },
    {
        file: "signup.html",
        path: "/signup.html",
        title: "Create Account | Krint Tufwale",
        description: "Create a Krint Tufwale account.",
        robots: "noindex, nofollow",
        private: true,
    },
    {
        file: "forgot-password.html",
        path: "/forgot-password.html",
        title: "Reset Your Password | Krint Tufwale",
        description: "Request a password reset for a Krint Tufwale account.",
        robots: "noindex, nofollow",
        private: true,
    },
    {
        file: "reset-password.html",
        path: "/reset-password.html",
        title: "Choose a New Password | Krint Tufwale",
        description: "Choose a new password for a Krint Tufwale account.",
        robots: "noindex, nofollow",
        private: true,
    },
    {
        file: "order-confirmation.html",
        path: "/order-confirmation.html",
        title: "Order Confirmed | Krint Tufwale",
        description: "Krint Tufwale order confirmation. This page is private to the shopper.",
        robots: "noindex, nofollow",
        private: true,
    },
    {
        file: "admin.html",
        path: "/admin.html",
        title: "Orders | Krint Tufwale",
        description: "Krint Tufwale seller orders. Not for public search.",
        robots: "noindex, nofollow",
        private: true,
    },
];

function abs(urlPath) {
    if (!urlPath || urlPath === "/") return `${SITE}/`;
    return SITE + (urlPath.startsWith("/") ? urlPath : `/${urlPath}`);
}

function esc(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    }[ch]));
}

function xml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
    }[ch]));
}

function jsonScript(data) {
    const json = JSON.stringify(data, null, 2).replace(/</g, "\\u003c");
    return `<script type="application/ld+json">\n${json}\n</script>`;
}

function formatPrice(amount) {
    return `ZMW ${Number(amount).toLocaleString("en-US")}`;
}

function imageSize(urlPath) {
    const file = path.join(root, urlPath.replace(/^\//, ""));
    if (!fs.existsSync(file)) return null;
    const buf = fs.readFileSync(file);
    if (buf.length > 24 && buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") {
        return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
        let i = 2;
        while (i < buf.length - 9) {
            if (buf[i] !== 0xff) {
                i += 1;
                continue;
            }
            const marker = buf[i + 1];
            if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
                return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
            }
            if (marker === 0xd8 || marker === 0x01) {
                i += 2;
                continue;
            }
            if (i + 4 > buf.length) break;
            const seg = buf.readUInt16BE(i + 2);
            if (seg < 2) break;
            i += 2 + seg;
        }
    }
    return null;
}

function loadProducts() {
    const code = fs.readFileSync(path.join(root, "products.js"), "utf8");
    const sandbox = { console };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);
    const products = sandbox.KT_PRODUCTS;
    if (!Array.isArray(products) || products.length === 0) {
        throw new Error("products.js did not expose KT_PRODUCTS");
    }
    const server = require(path.join(root, "src/products-catalog.js"));
    if (server.PRODUCTS.length !== products.length) {
        throw new Error("products.js and src/products-catalog.js list different products");
    }
    const byId = new Map(server.PRODUCTS.map((product) => [product.id, product]));
    for (const product of products) {
        const match = byId.get(product.id);
        if (!match) throw new Error(`${product.id} is missing from src/products-catalog.js`);
        if (match.priceZmw !== product.price) {
            throw new Error(`${product.id} price is ${product.price} in products.js and ${match.priceZmw} on the server`);
        }
        if (match.name !== product.name) {
            throw new Error(`${product.id} name differs between products.js and the server catalogue`);
        }
    }
    return products.slice().sort((a, b) => a.order - b.order);
}

function categoryLabel(product) {
    return CATEGORY_LABEL[product.category] || product.category;
}

function productBlurb(product) {
    const colours = product.colors.join(", ");
    const sizes = product.sizes.join(", ");
    return `${product.name} by Krint Tufwale. ${product.fit}. ${formatPrice(product.price)}. Colours: ${colours}. Sizes: ${sizes}. Designed in Lusaka, Zambia.`;
}

function productMetaDescription(product) {
    const text = `${product.name} by Krint Tufwale. ${product.fit}. ${formatPrice(product.price)}. Designed in Lusaka, Zambia.`;
    return text.length <= 160 ? text : `${text.slice(0, 157).trimEnd()}...`;
}

function sizeAnswer(products) {
    const oneSize = products.filter((product) => product.sizes.length === 1 && product.sizes[0] === "One Size");
    const sized = products.filter((product) => !oneSize.includes(product));
    const labels = [...new Set(sized.flatMap((product) => product.sizes))];
    const oneSizeNames = oneSize.map((product) => product.name).join(" and ");
    return `${sized.map((product) => product.name).join(", ")} are listed in ${labels.join(", ")}. ${oneSizeNames} is One Size. A body-measurement chart is not published yet.`;
}

function answeredFaqs(products) {
    return config.faqs.concat([{
        id: "sizes",
        question: "What sizes are available?",
        answer: sizeAnswer(products),
    }]);
}

function publicPlaceholders() {
    return config.placeholders.filter((item) => item.public);
}

function organizationNode() {
    return {
        "@type": "Organization",
        "@id": `${SITE}/#organization`,
        name: config.siteName,
        alternateName: config.alternateName,
        url: abs("/"),
        logo: {
            "@type": "ImageObject",
            url: abs(config.logo),
        },
        image: abs(config.defaultOgImage),
        description: config.description,
        slogan: config.motto,
        email: config.email,
        founder: {
            "@type": "Person",
            name: config.founder,
            alternateName: config.founderAlternateName,
        },
        address: {
            "@type": "PostalAddress",
            addressLocality: config.addressLocality,
            addressCountry: config.addressCountry,
        },
    };
}

function brandNode() {
    return {
        "@type": "Brand",
        "@id": `${SITE}/#brand`,
        name: config.siteName,
        alternateName: config.alternateName,
        slogan: config.motto,
        logo: abs(config.logo),
        url: abs("/"),
    };
}

function websiteNode() {
    return {
        "@type": "WebSite",
        "@id": `${SITE}/#website`,
        name: config.siteName,
        url: abs("/"),
        inLanguage: config.locale,
        description: config.description,
        publisher: { "@id": `${SITE}/#organization` },
    };
}

function breadcrumbNode(page) {
    return {
        "@type": "BreadcrumbList",
        "@id": `${abs(page.path)}#breadcrumb`,
        itemListElement: page.crumbs.map((crumb, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: crumb.name,
            item: abs(crumb.path),
        })),
    };
}

function webPageNode(page) {
    const node = {
        "@type": page.schemaType || "WebPage",
        "@id": `${abs(page.path)}#webpage`,
        url: abs(page.path),
        name: page.title,
        description: page.description,
        isPartOf: { "@id": `${SITE}/#website` },
        about: { "@id": `${SITE}/#organization` },
        inLanguage: config.locale,
        primaryImageOfPage: abs(page.image || config.defaultOgImage),
    };
    if (page.crumbs) node.breadcrumb = { "@id": `${abs(page.path)}#breadcrumb` };
    if (page.schemaType === "FAQPage") {
        node.mainEntity = page.faqs.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: item.answer,
            },
        }));
    }
    return node;
}

function itemListNode(products, name) {
    return {
        "@type": "ItemList",
        name,
        itemListOrder: "https://schema.org/ItemListOrderAscending",
        numberOfItems: products.length,
        itemListElement: products.map((product, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: product.name,
            url: abs(`/pieces/${product.id}.html`),
        })),
    };
}

function productNode(product) {
    const url = abs(`/pieces/${product.id}.html`);
    return {
        "@type": "Product",
        "@id": `${url}#product`,
        name: product.name,
        description: productBlurb(product),
        sku: product.id,
        category: categoryLabel(product),
        color: product.colors,
        size: product.sizes,
        image: abs(`/${product.image.replace(/^\.\//, "")}`),
        brand: { "@id": `${SITE}/#brand` },
        url,
        offers: {
            "@type": "Offer",
            url,
            priceCurrency: config.currency,
            price: String(product.price),
            availability: "https://schema.org/InStock",
            itemCondition: "https://schema.org/NewCondition",
            seller: {
                "@type": "Organization",
                name: config.siteName,
                url: abs("/"),
            },
        },
    };
}

function graph(nodes) {
    return { "@context": "https://schema.org", "@graph": nodes.filter(Boolean) };
}

function jsonLdForPage(page, products) {
    if (page.private) return "";
    const faqs = answeredFaqs(products);
    const withFaqs = page.schemaType === "FAQPage" ? { ...page, faqs } : page;
    const nodes = [organizationNode(), brandNode()];
    if (page.file === "index.html") nodes.push(websiteNode());
    nodes.push(webPageNode(withFaqs));
    if (page.crumbs) nodes.push(breadcrumbNode(page));
    if (page.file === "index.html") nodes.push(itemListNode(products.slice(0, 4), "Selected Krint Tufwale pieces"));
    if (page.file === "shop.html") nodes.push(itemListNode(products, "Krint Tufwale shop"));
    return jsonScript(graph(nodes));
}

function jsonLdForProduct(product) {
    const page = {
        path: `/pieces/${product.id}.html`,
        title: `${product.name} | Krint Tufwale`,
        description: productMetaDescription(product),
        schemaType: "ItemPage",
        image: `/${product.image.replace(/^\.\//, "")}`,
        crumbs: [
            { name: "Home", path: "/" },
            { name: "Shop", path: "/shop.html" },
            { name: product.name, path: `/pieces/${product.id}.html` },
        ],
    };
    return jsonScript(graph([
        organizationNode(),
        brandNode(),
        webPageNode(page),
        breadcrumbNode(page),
        productNode(product),
    ]));
}

function headTags(page, extras = {}) {
    const title = extras.title || page.title;
    const description = extras.description || page.description;
    const imagePath = extras.image || page.image || config.defaultOgImage;
    const imageAlt = extras.imageAlt || config.defaultImageAlt;
    const canonical = abs(extras.path || page.path);
    const dims = imageSize(imagePath);
    const lines = [
        `<title>${esc(title)}</title>`,
        `<meta name="description" content="${esc(description)}">`,
        `<meta name="robots" content="${esc(page.robots)}">`,
        `<meta name="author" content="${esc(config.siteName)}">`,
        `<meta name="theme-color" content="${esc(config.themeColor)}">`,
        `<link rel="canonical" href="${esc(canonical)}">`,
        `<meta property="og:type" content="${esc(extras.ogType || "website")}">`,
        `<meta property="og:site_name" content="${esc(config.siteName)}">`,
        `<meta property="og:locale" content="${esc(config.ogLocale)}">`,
        `<meta property="og:title" content="${esc(title)}">`,
        `<meta property="og:description" content="${esc(description)}">`,
        `<meta property="og:url" content="${esc(canonical)}">`,
        `<meta property="og:image" content="${esc(abs(imagePath))}">`,
        `<meta property="og:image:alt" content="${esc(imageAlt)}">`,
    ];
    if (dims) {
        lines.push(`<meta property="og:image:width" content="${dims.width}">`);
        lines.push(`<meta property="og:image:height" content="${dims.height}">`);
    }
    if (extras.price != null) {
        lines.push(`<meta property="product:price:amount" content="${esc(extras.price)}">`);
        lines.push(`<meta property="product:price:currency" content="${esc(config.currency)}">`);
    }
    lines.push(
        `<meta name="twitter:card" content="summary_large_image">`,
        `<meta name="twitter:title" content="${esc(title)}">`,
        `<meta name="twitter:description" content="${esc(description)}">`,
        `<meta name="twitter:image" content="${esc(abs(imagePath))}">`,
        `<link rel="icon" href="/images/logo.png" type="image/png">`,
        `<link rel="apple-touch-icon" href="/images/logo.png">`,
        `<link rel="manifest" href="/site.webmanifest">`,
        `<link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>`,
    );
    if (page.preloadImage) {
        lines.push(`<link rel="preload" as="image" href="${esc(page.preloadImage)}" fetchpriority="high">`);
    }
    if (page.file === "index.html") {
        lines.push("<!-- TODO: Google Search Console. Uncomment and paste the token. -->");
        lines.push('<!-- <meta name="google-site-verification" content="PASTE_TOKEN_HERE"> -->');
        lines.push("<!-- TODO: Bing Webmaster Tools. Uncomment and paste the token. -->");
        lines.push('<!-- <meta name="msvalidate.01" content="PASTE_TOKEN_HERE"> -->');
    }
    if (page.file === "product.html") {
        lines.push(productRedirectScript(extras.products || []));
    }
    return lines.join("\n");
}

function productRedirectScript(products) {
    const ids = JSON.stringify(products.map((product) => product.id));
    return `<script>
(function () {
  var ids = ${ids};
  var id = new URLSearchParams(location.search).get("id");
  if (!id || ids.indexOf(id) === -1) return;
  if (!/\\/product\\.html$/.test(location.pathname)) return;
  location.replace("/pieces/" + encodeURIComponent(id) + ".html");
})();
</script>`;
}

function headerHtml(activeFile) {
    const links = [
        ["/index.html", "Home", "index.html"],
        ["/shop.html", "Shop", "shop.html"],
        ["/collections.html", "Collections", "collections.html"],
        ["/journal.html", "Journal", "journal.html"],
        ["/our-story.html", "Our Story", "our-story.html"],
        ["/contact.html", "Contact", "contact.html"],
    ];
    const items = links.map(([href, label, file]) => {
        const active = file === activeFile ? ' class="active" aria-current="page"' : "";
        return `<li><a href="${href}"${active}>${label}</a></li>`;
    }).join("");
    return `<header>
            <section class="navbar">
                <div class="brand">
                    <div class="logo">
                        <a href="/index.html" aria-label="Krint Tufwale home">
                            <img src="/images/logo.png" alt="Krint Tufwale logo" width="1500" height="2100">
                        </a>
                    </div>
                    <div class="brand-name">
                        <span>Krint Tufwale</span>
                        <small>${esc(config.motto)}</small>
                    </div>
                </div>
                <nav aria-label="Main navigation">
                    <ul>${items}</ul>
                </nav>
                <button class="menu-toggle" type="button" aria-label="Toggle menu" aria-expanded="false">
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
        </header>`;
}

function activeFileFor(page, product) {
    if (product) return "shop.html";
    if (page.file === "product.html") return "shop.html";
    return page.file;
}

function shopCard(product) {
    const dims = imageSize(`/${product.image.replace(/^\.\//, "")}`) || {};
    const sizeAttrs = dims.width ? ` width="${dims.width}" height="${dims.height}"` : "";
    const badge = product.badge ? `<span class="product-badge">${esc(product.badge)}</span>` : "";
    return `<article class="product-card" data-category="${esc(product.category)}" data-price="${product.price}" data-order="${product.order}" data-product-id="${esc(product.id)}">
            <a href="/pieces/${esc(product.id)}.html" class="product-link">
                <div class="product-image">
                    <img src="/${esc(product.image.replace(/^\.\//, ""))}" alt="${esc(product.name)}" loading="lazy" decoding="async"${sizeAttrs}>
                    ${badge}
                    <span class="quick-view">View Piece <span>→</span></span>
                </div>
            </a>
            <div class="product-details">
                <div>
                    <h2>${esc(product.name)}</h2>
                    <p>${esc(product.fit)}</p>
                </div>
                <div class="product-details-side">
                    <span class="product-price">${esc(formatPrice(product.price))}</span>
                    <button type="button" class="add-to-cart" data-product-id="${esc(product.id)}" aria-label="Choose options for ${esc(product.name)}">Choose Options</button>
                </div>
            </div>
        </article>`;
}

function homeCard(product) {
    const dims = imageSize(`/${product.image.replace(/^\.\//, "")}`) || {};
    const sizeAttrs = dims.width ? ` width="${dims.width}" height="${dims.height}"` : "";
    const badge = product.badge ? `<span class="home-product-badge">${esc(product.badge)}</span>` : "";
    return `<article class="home-product-card">
            <a class="home-product-image" href="/pieces/${esc(product.id)}.html" aria-label="View ${esc(product.name)}">
                <img src="/${esc(product.image.replace(/^\.\//, ""))}" alt="${esc(product.name)}" loading="lazy" decoding="async"${sizeAttrs}>
                ${badge}
            </a>
            <div class="home-product-info">
                <div>
                    <h3>${esc(product.name)}</h3>
                    <p>${esc(product.fit)}</p>
                </div>
                <span>${esc(formatPrice(product.price))}</span>
            </div>
            <a class="home-product-link" href="/pieces/${esc(product.id)}.html">View Piece <span aria-hidden="true">→</span></a>
        </article>`;
}

function productIndexHtml(products) {
    const items = products.map((product) =>
        `<li><a href="/pieces/${esc(product.id)}.html">${esc(product.name)}</a> — ${esc(formatPrice(product.price))}, ${esc(product.fit)}</li>`
    ).join("\n");
    return `<nav class="product-index" aria-label="All pieces">
        <h2>All pieces</h2>
        <ul>
            ${items}
        </ul>
    </nav>`;
}

function faqBody(products) {
    const faqs = answeredFaqs(products).map((item) => `<article id="${esc(item.id)}">
            <h2>${esc(item.question)}</h2>
            <p>${esc(item.answer)}</p>
        </article>`).join("\n");
    const todos = publicPlaceholders().map((item) => `<article id="${esc(item.id)}" class="seo-todo">
            <h2>${esc(item.title)}</h2>
            <p><strong>TODO:</strong> ${esc(item.detail)}</p>
        </article>`).join("\n");
    return `<section class="contact-hero">
        <span class="section-tag">QUESTIONS</span>
        <h1>Answers from the work we have published.</h1>
        <p>Prices, place and how to order are below. Anything we do not know is marked TODO and left blank on purpose.</p>
    </section>
    <section class="faq-list" aria-label="Published answers">
        ${faqs}
    </section>
    <section class="faq-list" aria-label="Not published yet">
        <h2>Not published yet</h2>
        ${todos}
    </section>`;
}

function footerHtml() {
    return `<footer>
        <div class="footer-top">
            <div class="footer-brand">
                <div class="footer-logo">
                    <img src="/images/logo.png" alt="Krint Tufwale logo" width="1500" height="2100">
                    <span>Krint Tufwale</span>
                </div>
                <p class="footer-tagline">${esc(config.motto)}</p>
                <p class="footer-blurb">${esc(config.description)}</p>
            </div>
            <div class="footer-col">
                <h4>Explore</h4>
                <ul>
                    <li><a href="/index.html">Home</a></li>
                    <li><a href="/shop.html">Shop</a></li>
                    <li><a href="/collections.html">Collections</a></li>
                    <li><a href="/journal.html">Journal</a></li>
                    <li><a href="/our-story.html">Our Story</a></li>
                    <li><a href="/contact.html">Contact</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <h4>Help</h4>
                <ul>
                    <li><a href="/faq.html#shipping">Shipping &amp; Delivery</a></li>
                    <li><a href="/faq.html#returns">Returns &amp; Exchanges</a></li>
                    <li><a href="/faq.html#sizes">Size Guide</a></li>
                    <li><a href="/faq.html">FAQs</a></li>
                    <li><a href="/faq.html#privacy">Privacy Policy</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <h4>Contact</h4>
                <ul class="footer-contact">
                    <li>Lusaka, Zambia</li>
                    <li><a href="mailto:hello@krinttufwale.com">hello@krinttufwale.com</a></li>
                </ul>
                <div class="footer-socials">
                    <a href="/contact.html#instagram">IG</a>
                    <span>FB</span>
                    <span>TT</span>
                    <span>X</span>
                </div>
            </div>
        </div>
        <div class="footer-bottom">
            <p>© 2026 Krint Tufwale. All rights reserved.</p>
            <p>Designed by <span>The Architect</span></p>
        </div>
    </footer>`;
}

function productPage(product) {
    const meta = {
        file: `pieces/${product.id}.html`,
        path: `/pieces/${product.id}.html`,
        title: `${product.name} | Krint Tufwale`,
        description: productMetaDescription(product),
        robots: "index, follow, max-image-preview:large",
        schemaType: "ItemPage",
    };
    const imagePath = `/${product.image.replace(/^\.\//, "")}`;
    const dims = imageSize(imagePath) || {};
    const sizeAttrs = dims.width ? ` width="${dims.width}" height="${dims.height}"` : "";
    const head = headTags(meta, {
        title: meta.title,
        description: meta.description,
        path: meta.path,
        image: imagePath,
        imageAlt: `${product.name}, ${product.fit}, by Krint Tufwale`,
        ogType: "product",
        price: String(product.price),
    });
    return `<!DOCTYPE html>
<html lang="${esc(config.locale)}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- seo:head:start -->
${head}
    <!-- seo:head:end -->
    <link rel="stylesheet" href="/style.css">
    <link rel="stylesheet" href="/products.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css">
    <link rel="stylesheet" href="/storefront-redesign.css">
    <!-- seo:jsonld:start -->
${jsonLdForProduct(product)}
    <!-- seo:jsonld:end -->
</head>
<body class="products-page" data-product-id="${esc(product.id)}">
    <div data-kt-header>
        <!-- seo:header:start -->
${headerHtml("shop.html")}
        <!-- seo:header:end -->
    </div>
    <main>
        <section class="product-detail-section">
            <nav class="product-breadcrumb" aria-label="Breadcrumb">
                <a href="/index.html">Home</a>
                <span>/</span>
                <a href="/shop.html">Shop</a>
                <span>/</span>
                <span id="breadcrumbName">${esc(product.name)}</span>
            </nav>
            <div class="product-detail" id="productDetail">
                <div class="product-detail-image">
                    <img id="productImage" src="${esc(imagePath)}" alt="${esc(product.name)}" fetchpriority="high" decoding="async"${sizeAttrs}>
                </div>
                <div class="product-detail-info">
                    <span class="product-detail-tag" id="productCategory">${esc(categoryLabel(product))}</span>
                    <h1 id="productName">${esc(product.name)}</h1>
                    <p class="product-detail-fit" id="productFit">${esc(product.fit)}</p>
                    <span class="product-detail-price" id="productPrice">${esc(formatPrice(product.price))}</span>
                    <p id="productFacts">Colours: ${esc(product.colors.join(", "))}. Sizes: ${esc(product.sizes.join(", "))}.</p>
                    <div class="product-variant-options" id="productVariants" aria-live="polite">
                        <fieldset class="variant-group" id="sizeVariantGroup">
                            <legend>Size <span id="selectedSizeLabel"></span></legend>
                            <div class="variant-size-options" id="productSizes"></div>
                        </fieldset>
                        <fieldset class="variant-group" id="colorVariantGroup">
                            <legend>Colour <span id="selectedColorLabel"></span></legend>
                            <div class="variant-color-options" id="productColors"></div>
                        </fieldset>
                        <p class="variant-selection-hint" id="variantSelectionHint">Choose your size and colour to continue.</p>
                    </div>
                    <div class="product-detail-purchase">
                        <div class="qty-selector" aria-label="Quantity">
                            <button type="button" class="qty-btn" data-step="-1" aria-label="Decrease quantity">−</button>
                            <input type="number" id="productQty" value="1" min="1" max="10" aria-label="Quantity">
                            <button type="button" class="qty-btn" data-step="1" aria-label="Increase quantity">+</button>
                        </div>
                        <button type="button" class="add-to-cart detail-add-btn" id="detailAddToCart" data-product-id="${esc(product.id)}">Add to Cart</button>
                    </div>
                    <p class="product-detail-note">Designed in Lusaka, Zambia. Checkout with mobile money is coming soon — for now, orders are placed by email.</p>
                </div>
            </div>
            <div class="product-not-found" id="productNotFound" hidden>
                <span class="section-tag">404</span>
                <h2>This piece could not be found.</h2>
                <p>The full wardrobe lives in the shop.</p>
                <a href="/shop.html" class="text-btn">Back to the Shop <span>→</span></a>
            </div>
        </section>
    </main>
    ${footerHtml()}
    <script src="/header.js"></script>
    <script src="/config.js"></script>
    <script src="/products.js"></script>
    <script src="/cart.js"></script>
    <script src="/auth.js"></script>
    <script src="/script.js"></script>
</body>
</html>
`;
}

function replaceMarked(source, name, content) {
    const start = `<!-- seo:${name}:start -->`;
    const end = `<!-- seo:${name}:end -->`;
    const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);
    if (!pattern.test(source)) {
        throw new Error(`Missing <!-- seo:${name} --> markers`);
    }
    return source.replace(pattern, `${start}\n${content}\n${end}`);
}

function stripLegacyHead(html) {
    return html
        .replace(/\s*<meta\s+name="description"[^>]*>/gi, "")
        .replace(/\s*<meta\s+name="robots"[^>]*>/gi, "")
        .replace(/\s*<meta\s+name="author"[^>]*>/gi, "")
        .replace(/\s*<meta\s+name="theme-color"[^>]*>/gi, "")
        .replace(/\s*<meta\s+property="og:[^"]+"[^>]*>/gi, "")
        .replace(/\s*<meta\s+property="product:[^"]+"[^>]*>/gi, "")
        .replace(/\s*<meta\s+name="twitter:[^"]+"[^>]*>/gi, "")
        .replace(/\s*<link\s+rel="canonical"[^>]*>/gi, "")
        .replace(/\s*<link\s+rel="icon"[^>]*>/gi, "")
        .replace(/\s*<link\s+rel="apple-touch-icon"[^>]*>/gi, "")
        .replace(/\s*<link\s+rel="manifest"[^>]*>/gi, "")
        .replace(/\s*<link\s+rel="preconnect"[^>]*>/gi, "")
        .replace(/\s*<link\s+rel="preload"[^>]*>/gi, "")
        .replace(/\s*<title>[^<]*<\/title>/gi, "");
}

function ensureMarker(html, name, anchorPattern, placement) {
    const start = `<!-- seo:${name}:start -->`;
    if (html.includes(start)) return html;
    if (!anchorPattern.test(html)) {
        throw new Error(`Could not place <!-- seo:${name} --> markers`);
    }
    return html.replace(anchorPattern, placement);
}

function ensureRegions(html, page) {
    let next = html.replace(/<html lang="en">/g, `<html lang="${config.locale}">`);
    next = stripLegacyHead(next);
    next = ensureMarker(
        next,
        "head",
        /<meta\s+name="viewport"[^>]*>/i,
        (match) => `${match}\n    <!-- seo:head:start -->\n    <!-- seo:head:end -->`,
    );
    next = ensureMarker(
        next,
        "jsonld",
        /<\/head>/i,
        `    <!-- seo:jsonld:start -->\n    <!-- seo:jsonld:end -->\n</head>`,
    );
    if (page.file !== "admin.html") {
        next = ensureMarker(
            next,
            "header",
            /<div\s+data-kt-header>\s*<\/div>/i,
            `<div data-kt-header>\n        <!-- seo:header:start -->\n        <!-- seo:header:end -->\n    </div>`,
        );
    }
    if (page.file === "shop.html") {
        next = ensureMarker(
            next,
            "shop-grid",
            /<div\s+class="products-grid"\s+id="shopGrid"\s*>[\s\S]*?<\/div>/i,
            `<div class="products-grid" id="shopGrid">\n        <!-- seo:shop-grid:start -->\n        <!-- seo:shop-grid:end -->\n    </div>`,
        );
    }
    if (page.file === "index.html") {
        next = ensureMarker(
            next,
            "home-featured",
            /<div class="home-featured-grid" id="homeFeaturedGrid"[^>]*>[\s\S]*?<\/div>/i,
            `<div class="home-featured-grid" id="homeFeaturedGrid" aria-live="polite">\n        <!-- seo:home-featured:start -->\n        <!-- seo:home-featured:end -->\n    </div>`,
        );
    }
    if (page.file === "product.html") {
        next = ensureMarker(
            next,
            "product-index",
            /<section class="product-detail-section">/i,
            `<section class="product-detail-section">\n        <!-- seo:product-index:start -->\n        <!-- seo:product-index:end -->`,
        );
    }
    return next;
}

function patchHelpLinks(html) {
    const help = [
        ["Shipping & Delivery", "/faq.html#shipping"],
        ["Shipping &amp; Delivery", "/faq.html#shipping"],
        ["Returns & Exchanges", "/faq.html#returns"],
        ["Returns &amp; Exchanges", "/faq.html#returns"],
        ["Size Guide", "/faq.html#sizes"],
        ["FAQs", "/faq.html"],
        ["Privacy Policy", "/faq.html#privacy"],
    ];
    let next = html;
    for (const [label, href] of help) {
        const pattern = new RegExp(`<a href=(["'])(?:|#)\\1>(\\s*)${label}(\\s*)</a>`, "g");
        next = next.replace(pattern, `<a href="${href}">$2${label}$3</a>`);
    }
    next = next.replace(/<a href=(["'])(?:|#)\1>(\s*)IG(\s*)<\/a>/g, '<a href="/contact.html#instagram">$2IG$3</a>');
    next = next.replace(/<a href=(["'])(?:|#)\1>(\s*)(FB|TT|X)(\s*)<\/a>/g, "<span>$2$3$4</span>");
    next = next.replace(/<a href=(["'])(?:|#)\1>(\s*)The Architect(\s*)<\/a>/g, "<span>$2The Architect$3</span>");
    next = next.replace(
        /<a href=(["'])tel:\+260000000000\1>(\s*)\+260 970 000 000(\s*)<\/a>/g,
        "<span>$2+260 970 000 000$3</span>",
    );
    return next;
}

function writeProducts(products) {
    const dir = path.join(root, "pieces");
    fs.mkdirSync(dir, { recursive: true });
    const keep = new Set(products.map((product) => `${product.id}.html`));
    for (const name of fs.readdirSync(dir)) {
        if (name.endsWith(".html") && !keep.has(name)) fs.unlinkSync(path.join(dir, name));
    }
    for (const product of products) {
        fs.writeFileSync(path.join(dir, `${product.id}.html`), productPage(product));
    }
}

function writeRobots() {
    const blocks = ["*", ...AI_AGENTS].map((agent) => {
        const lines = [`User-agent: ${agent}`, "Allow: /"];
        for (const disallowed of PRIVATE_PATHS) lines.push(`Disallow: ${disallowed}`);
        return lines.join("\n");
    });
    const text = `# Krint Tufwale
# Public pages are open to search engines and to AI answer engines.
# Generated by npm run seo from site.config.json. Do not edit by hand.

${blocks.join("\n\n")}

Sitemap: ${abs("/sitemap.xml")}
`;
    fs.writeFileSync(path.join(root, "robots.txt"), text);
}

function writeSitemap(products) {
    const lastmod = new Date().toISOString().slice(0, 10);
    const urls = PAGES.filter((page) => page.sitemap).map((page) => ({
        loc: abs(page.path),
        priority: page.sitemap.priority,
        changefreq: page.sitemap.changefreq,
    }));
    for (const product of products) {
        urls.push({
            loc: abs(`/pieces/${product.id}.html`),
            priority: "0.8",
            changefreq: "weekly",
        });
    }
    const body = urls.map((url) => `  <url>
    <loc>${xml(url.loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join("\n");
    const xmlDoc = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
    fs.writeFileSync(path.join(root, "sitemap.xml"), xmlDoc);
}

function writeLlms(products) {
    const faqs = answeredFaqs(products);
    const productLines = products.map((product) =>
        `- [${product.name}](${abs(`/pieces/${product.id}.html`)}): ${formatPrice(product.price)}. ${product.fit}. ${categoryLabel(product)}. Colours: ${product.colors.join(", ")}. Sizes: ${product.sizes.join(", ")}.`
    );
    const faqLines = faqs.map((item) => `### ${item.question}\n\n${item.answer}`);
    const todoLines = config.placeholders.map((item) => `- ${item.title}: ${item.detail}`);
    const text = `# ${config.siteName}

> ${config.siteName} (${config.alternateName}) designs contemporary everyday clothing in ${config.addressLocality}, ${config.addressCountry === "ZM" ? "Zambia" : config.addressCountry}. The line printed on the site is "${config.motto}". Founder: ${config.founder} (${config.founderAlternateName}). Website developer: ${config.developer}. Prices are in ${config.currency} (Zambian kwacha).

The shop catalogue is the source of truth for what can be ordered. There is no separate site search. Do not invent a street address, phone number, review score, stock count, or shipping policy: if it is not written here or on the linked page, it is not published.

## Collections

- [Everyday](${abs("/collections.html#everyday")}): Relaxed essentials made for daily confidence.
- [Tailored](${abs("/collections.html#tailored")}): Refined silhouettes for modern occasions.
- [Essentials](${abs("/collections.html#essentials")}): The foundation of a considered wardrobe.

Shop categories: shirts, trousers, outerwear, knitwear, accessories.

## Products

${productLines.join("\n")}

## Pages

- [Home](${abs("/")}): Introduction to the brand and a selection of pieces.
- [Shop](${abs("/shop.html")}): Full catalogue, with category filters.
- [Collections](${abs("/collections.html")}): Everyday, Tailored and Essentials.
- [Journal](${abs("/journal.html")}): Short notes on design and craft. Individual essays do not have their own URLs.
- [Our Story](${abs("/our-story.html")}): Why the label began. Designed in Lusaka, Zambia.
- [Contact](${abs("/contact.html")}): Lusaka, Zambia. Email ${config.email}. Instagram handle ${config.instagramHandle}.
- [Questions](${abs("/faq.html")}): Answers that can be cited, and a list of policies that are not published yet.

## Answers you can cite

${faqLines.join("\n\n")}

## Not published yet

${todoLines.join("\n")}

## Optional

- Currency: ${config.currency}. Do not convert prices unless the shopper asks, and do not present a converted figure as the shop price.
- Availability on product pages is InStock because the piece is offered for sale. The catalogue has no inventory count.
- No reviews or ratings are published. Do not invent any.
- Sitemap: ${abs("/sitemap.xml")}
- Machine-readable product data is the JSON-LD on each product page (schema.org Product and Offer).
`;
    fs.writeFileSync(path.join(root, "llms.txt"), text);
}

function writeManifest() {
    const logo = imageSize(config.logo) || { width: 1500, height: 2100 };
    const manifest = {
        name: config.siteName,
        short_name: config.siteName,
        description: config.description,
        lang: config.locale,
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: config.backgroundColor,
        theme_color: config.themeColor,
        icons: [
            {
                src: config.logo,
                sizes: `${logo.width}x${logo.height}`,
                type: "image/png",
                purpose: "any",
            },
        ],
    };
    fs.writeFileSync(path.join(root, "site.webmanifest"), `${JSON.stringify(manifest, null, 2)}\n`);
}

function updatePages(products) {
    for (const page of PAGES) {
        const file = path.join(root, page.file);
        if (!fs.existsSync(file)) throw new Error(`Missing ${page.file}`);
        let html = fs.readFileSync(file, "utf8");
        html = ensureRegions(html, page);
        html = replaceMarked(html, "head", headTags(page, { products }));
        html = replaceMarked(html, "jsonld", jsonLdForPage(page, products));
        if (page.file !== "admin.html") {
            html = replaceMarked(html, "header", headerHtml(activeFileFor(page)));
        }
        if (page.file === "shop.html") {
            html = replaceMarked(html, "shop-grid", products.map(shopCard).join("\n"));
        }
        if (page.file === "index.html") {
            html = replaceMarked(html, "home-featured", products.slice(0, 4).map(homeCard).join("\n"));
        }
        if (page.file === "product.html") {
            html = replaceMarked(html, "product-index", productIndexHtml(products));
        }
        if (page.file === "faq.html") {
            html = replaceMarked(html, "faq-body", faqBody(products));
        }
        html = patchHelpLinks(html);
        fs.writeFileSync(file, html);
    }
}

function validate(products) {
    const errors = [];
    const htmlFiles = [];
    function walk(dir) {
        for (const name of fs.readdirSync(dir)) {
            if (name === "node_modules" || name === "src" || name === "images" || name === ".git") continue;
            const full = path.join(dir, name);
            if (fs.statSync(full).isDirectory()) walk(full);
            else if (name.endsWith(".html")) htmlFiles.push(full);
        }
    }
    walk(root);
    for (const file of htmlFiles) {
        const html = fs.readFileSync(file, "utf8");
        const titles = html.match(/<title>[^<]*<\/title>/gi) || [];
        if (titles.length !== 1) errors.push(`${path.relative(root, file)} has ${titles.length} titles`);
        if (!/rel="canonical"/.test(html)) errors.push(`${path.relative(root, file)} has no canonical`);
        if (!/name="description"/.test(html)) errors.push(`${path.relative(root, file)} has no description`);
        const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
        for (const block of blocks) {
            try {
                JSON.parse(block[1]);
            } catch (err) {
                errors.push(`${path.relative(root, file)} has invalid JSON-LD: ${err.message}`);
            }
        }
    }
    const robots = fs.readFileSync(path.join(root, "robots.txt"), "utf8");
    for (const agent of AI_AGENTS) {
        if (!robots.includes(`User-agent: ${agent}`)) errors.push(`robots.txt missing ${agent}`);
    }
    const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
    for (const product of products) {
        const loc = abs(`/pieces/${product.id}.html`);
        if (!sitemap.includes(loc)) errors.push(`sitemap missing ${product.id}`);
        const page = fs.readFileSync(path.join(root, "pieces", `${product.id}.html`), "utf8");
        if (!page.includes(formatPrice(product.price))) errors.push(`${product.id} page missing its price`);
        if (page.includes('id="productDetail" hidden') || page.includes("product-detail\" hidden")) {
            errors.push(`${product.id} detail is hidden from crawlers`);
        }
    }
    const llms = fs.readFileSync(path.join(root, "llms.txt"), "utf8");
    for (const product of products) {
        if (!llms.includes(product.name)) errors.push(`llms.txt missing ${product.name}`);
    }
    if (!llms.includes("Not published yet")) errors.push("llms.txt missing the placeholder section");
    if (errors.length) {
        console.error(errors.join("\n"));
        process.exit(1);
    }
}

function main() {
    const products = loadProducts();
    updatePages(products);
    writeProducts(products);
    writeRobots();
    writeSitemap(products);
    writeLlms(products);
    writeManifest();
    validate(products);
    console.log(`SEO files written for ${products.length} pieces at ${SITE}`);
    console.log("Placeholders still open:");
    for (const item of config.placeholders) {
        console.log(`- ${item.title}`);
    }
}

main();
