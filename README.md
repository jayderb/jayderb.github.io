# Krint Tufwale Clothing

> **Designed Here. Worn Anywhere.**

**Live site:** [https://krinttufwale-001.web.app](https://krinttufwale-001.web.app)

Krint Tufwale is a contemporary African fashion brand that blends timeless design with modern simplicity. This project is the official website for the brand, built to showcase collections, tell the story behind the label, and create an editorial-inspired shopping experience.

Rather than functioning as a traditional e-commerce website, the goal is to create a digital experience that reflects the identity, craftsmanship, and confidence of the brand.

---

## Deployment

The storefront is hosted on Firebase Hosting. Accounts, the contact form, and orders are served by a Node API on Render’s free tier ([jayderb-github-io.onrender.com](https://jayderb-github-io.onrender.com)). The site used to live only on GitHub Pages (`jayderb.github.io`); the pages now ship from Firebase, and GitHub remains the source of the code.

On the free tier the API sleeps when it is quiet. The first request after that pause can be slow while the service wakes. Each page pings the API health check as it opens so sign-in and checkout are more likely to find it already up.

---

## Vision

Krint Tufwale aims to represent a new generation of African fashion—one that is modern, intentional, and globally relevant while remaining rooted in its heritage.

Every design decision throughout the website prioritizes:

- Editorial storytelling
- Minimalist design
- Premium user experience
- Contemporary African identity
- Responsive and accessible layouts

---

## Project Features

- Editorial-style landing page
- Responsive navigation
- Campaign hero section
- Featured Collections
- Brand Story section
- Latest Arrivals showcase
- Journal & Editorial section
- Newsletter subscription
- Responsive footer
- Smooth animations and transitions

---

## Technologies Used

**Storefront** — static HTML, CSS, and JavaScript, published with Firebase Hosting.

**API** (`src/`)

- Node.js 22 or 23 (`>=22 <25`)
- Express
- SQLite through `better-sqlite3`, with Node’s built-in `node:sqlite` when that native module is unavailable
- JSON Web Tokens (`jsonwebtoken`, HS256) for customer sessions and the seller page
- `bcryptjs` for password hashes
- Nodemailer over Gmail for contact messages, order notices, and password-reset mail
- `express-rate-limit`, `cors`, and `dotenv`
- The Have I Been Pwned range API, used when someone chooses a password

An optional delivery pin can use the browser’s geolocation on its own. Choosing a point on a map also uses the Google Maps JavaScript API when `GOOGLE_MAPS_API_KEY` is set in `config.js`.

Git and GitHub hold the source.

---

## Project Structure

```text
.
├── index.html                 Landing page
├── shop.html                  Catalogue, filtering, and sorting
├── product.html               Product detail
├── collections.html
├── cart.html                  Account-gated bag and checkout
├── order-confirmation.html
├── contact.html
├── journal.html
├── our-story.html
├── login.html
├── signup.html
├── forgot-password.html
├── reset-password.html
├── admin.html                 Seller orders (off until ADMIN_PASSWORD is set)
│
├── style.css
├── products.css
├── storefront-redesign.css
├── script.js
├── products.js
├── cart.js
├── auth.js                    Customer session in the browser
├── admin.js
├── header.js
├── config.js                  API base URL
├── delivery-map.js
├── password-rules.js
├── password-reset.js
│
├── firebase.json              Firebase Hosting config
├── .firebaserc
├── package.json
├── .env.example
├── serve.dev.js               Local site server and /api proxy
│
├── src/
│   ├── index.js               Express app
│   ├── auth.js                Sign and verify JWTs
│   ├── mailer.js
│   ├── notifications.js
│   ├── passwordPolicy.js
│   ├── products-catalog.js    Prices used when an order is placed
│   ├── db/database.js         SQLite (users, orders, messages, resets)
│   ├── middleware/
│   │   ├── requireAuth.js
│   │   └── requireAdmin.js
│   └── routes/
│       ├── auth.js            Signup, login, password reset
│       ├── orders.js          Place and read your own orders
│       ├── contact.js
│       └── admin.js
│
└── images/
    └── products/
```

---

## Local setup

You need Node.js 22 or 23. From the repo root:

```bash
npm install
cp .env.example .env
npm run dev
```

`npm run dev` runs the API (port 4000 unless `PORT` is set). In a second terminal:

```bash
node serve.dev.js
```

Open [http://localhost:8000](http://localhost:8000). That process serves the HTML and forwards `/api` to the API. On localhost, `config.js` already calls `http://localhost:4000/api`.

The SQLite file is created at `DATABASE_PATH` (default `./data/krint.db`). The `data/` folder and `.env` are gitignored.

Set these names in `.env`. Keep the values on your machine.

| Name | Purpose |
| --- | --- |
| `PORT` | API port |
| `WEB_PORT` | Port for `serve.dev.js` |
| `ALLOWED_ORIGINS` | Comma-separated front-end origins allowed by CORS |
| `NODE_ENV` | In production, `ALLOWED_ORIGINS` must be set |
| `DATABASE_PATH` | SQLite file path |
| `JWT_SECRET` | Signs customer and seller tokens |
| `ADMIN_PASSWORD` | Seller orders page. Leave it unset and that page stays off |
| `EMAIL_USER` | Gmail address mail is sent from |
| `EMAIL_PASS` | Gmail app password |
| `CONTACT_TO_EMAIL` | Inbox for the contact form |
| `ORDER_NOTIFY_EMAIL` | Inbox for new orders |
| `EMAIL_DISABLED` | Skip SMTP when the host blocks it |
| `FRONTEND_URL` | Site address used in password-reset links |
| `PASSWORD_BREACH_CHECK` | Set to `off` to skip the breach check |

---

## Design Philosophy

This website follows a quiet editorial approach inspired by leading fashion houses while establishing its own identity.

Core principles include:

- Less clutter, more focus
- Photography before decoration
- Story before commerce
- Whitespace as a design element
- Subtle interactions over excessive animations
- Consistent typography and spacing

---

## Brand Philosophy

Krint Tufwale believes clothing should feel effortless, timeless, and thoughtfully made.

Inspired by the rhythm of modern African life, every collection is designed for people who appreciate confidence, simplicity, and quality.

---

## Current Progress

- [x] Navigation
- [x] Hero Section
- [x] Campaign Banner
- [x] Collection Section
- [x] Our Story
- [x] Latest Arrivals
- [x] Journal
- [x] Contact
- [x] Newsletter
- [x] Footer
- [x] Responsive Mobile Layout
- [x] JavaScript Interactions
- [x] Shop catalogue with filtering & sorting
- [x] Product detail pages
- [x] Shopping cart (account-gated)
- [x] User authentication (signup/login, JWT)
- [x] Orders backend with server-side price validation
- [ ] Payment integration (Flutterwave — mobile money + cards)
- [x] Deployed to production

---

## Future Improvements

- Flutterwave payment integration
- Wishlist
- CMS integration
- Dark mode
- Performance optimization
