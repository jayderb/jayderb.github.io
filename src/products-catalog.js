/* ============================================================
   KRINT TUFWALE — src/products-catalog.js
   Server-side copy of the product catalog.

   This is the price anchor for order totals: POST /api/orders
   recalculates every order from THIS list, never from prices
   sent by the browser, so a tampered client cannot pay ZMW 1
   for a Structured Jacket.

   Keep in sync with /products.js on the frontend (same 8
   products, same ids, same prices).
   ============================================================ */

const PRODUCTS = [
    { id: "cotton-overshirt", name: "Cotton Overshirt", category: "shirts", priceZmw: 1250, sizes: ["S", "M", "L", "XL"], colors: ["Cream", "Green", "Black"] },
    { id: "straight-leg-trouser", name: "Straight Leg Trouser", category: "trousers", priceZmw: 980, sizes: ["S", "M", "L", "XL"], colors: ["Black", "Brown", "Grey"] },
    { id: "classic-cotton-shirt", name: "Classic Cotton Shirt", category: "shirts", priceZmw: 1100, sizes: ["S", "M", "L", "XL"], colors: ["Cream", "Black", "Green"] },
    { id: "fine-knit-polo", name: "Fine Knit Polo", category: "knitwear", priceZmw: 850, sizes: ["S", "M", "L", "XL"], colors: ["Black", "Cream", "Brown"] },
    { id: "structured-jacket", name: "Structured Jacket", category: "outerwear", priceZmw: 1850, sizes: ["S", "M", "L", "XL"], colors: ["Black", "Brown", "Grey"] },
    { id: "everyday-polo", name: "Everyday Polo", category: "shirts", priceZmw: 650, sizes: ["S", "M", "L", "XL"], colors: ["Black", "Cream", "Green"] },
    { id: "leather-belt", name: "Leather Belt", category: "accessories", priceZmw: 480, sizes: ["One Size"], colors: ["Black", "Brown"] },
    { id: "relaxed-pleated-trouser", name: "Relaxed Pleated Trouser", category: "trousers", priceZmw: 1150, sizes: ["S", "M", "L", "XL"], colors: ["Black", "Grey", "Brown"] },
];

function getProductById(id) {
    return PRODUCTS.find((product) => product.id === id);
}

module.exports = { PRODUCTS, getProductById };