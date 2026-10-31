/* ============================================================
   KRINT TUFWALE — products.js
   Canonical product catalog for the whole frontend.

   shop.html (grid), product.html (detail page) and cart.html
   (line items + totals) all read from this one list, so names,
   prices and images only ever need to be updated here.

   NOTE FOR THE FUTURE: the backend keeps its own copy of the
   prices (src/products-catalog.js) so order totals can be
   verified server-side. If you change a price here, update it
   there too.
   ============================================================ */

const KT_PRODUCTS = [
    {
        id: "cotton-overshirt",
        sizes: ["S","M","L","XL"],
        colors: ["Cream","Green","Black"],
        name: "Cotton Overshirt",
        category: "shirts",
        price: 1250,
        image: "images/products/overshirt.jpg",
        fit: "Relaxed Fit",
        badge: "New",
        order: 1,
    },
    {
        id: "straight-leg-trouser",
        sizes: ["S","M","L","XL"],
        colors: ["Black","Brown","Grey"],
        name: "Straight Leg Trouser",
        category: "trousers",
        price: 980,
        image: "images/products/trousers.jpg",
        fit: "Tailored Fit",
        badge: null,
        order: 2,
    },
    {
        id: "classic-cotton-shirt",
        sizes: ["S","M","L","XL"],
        colors: ["Cream","Black","Green"],
        name: "Classic Cotton Shirt",
        category: "shirts",
        price: 1100,
        image: "images/products/shirt.jpg",
        fit: "Regular Fit",
        badge: null,
        order: 3,
    },
    {
        id: "fine-knit-polo",
        sizes: ["S","M","L","XL"],
        colors: ["Black","Cream","Brown"],
        name: "Fine Knit Polo",
        category: "knitwear",
        price: 850,
        image: "images/products/knit.jpg",
        fit: "Soft Knit",
        badge: null,
        order: 4,
    },
    {
        id: "structured-jacket",
        sizes: ["S","M","L","XL"],
        colors: ["Black","Brown","Grey"],
        name: "Structured Jacket",
        category: "outerwear",
        price: 1850,
        image: "images/products/jacket.png",
        fit: "Relaxed Tailoring",
        badge: "Featured",
        order: 5,
    },
    {
        id: "everyday-polo",
        sizes: ["S","M","L","XL"],
        colors: ["Black","Cream","Green"],
        name: "Everyday Polo",
        category: "shirts",
        price: 650,
        image: "images/products/polo.jpg",
        fit: "Classic Fit",
        badge: null,
        order: 6,
    },
    {
        id: "leather-belt",
        sizes: ["One Size"],
        colors: ["Black","Brown"],
        name: "Leather Belt",
        category: "accessories",
        price: 480,
        image: "images/products/belt.jpg",
        fit: "Full Grain Leather",
        badge: null,
        order: 7,
    },
    {
        id: "relaxed-pleated-trouser",
        sizes: ["S","M","L","XL"],
        colors: ["Black","Grey","Brown"],
        name: "Relaxed Pleated Trouser",
        category: "trousers",
        price: 1150,
        image: "images/products/trouser-2.jpg",
        fit: "Wide Leg",
        badge: null,
        order: 8,
    },
];


/* Look up a single product by its id (returns undefined if unknown) */

function getProductById(id) {
    return KT_PRODUCTS.find((product) => product.id === id);
}


/* Money helper — every price on the site renders through this.
   Prices are plain numbers (ZMW), formatted with thousands separators. */

function formatZMW(amount) {
    return `ZMW ${Number(amount).toLocaleString("en-US")}`;
}

/* Exposed on window so the catalog is inspectable in devtools
   and available to any script on the page */
window.KT_PRODUCTS = KT_PRODUCTS;