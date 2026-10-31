// Google Maps browser key (optional). Leave empty and the map is hidden, while
// "Use my current location" keeps working. A browser key is public by design,
// so restrict it in Google Cloud to this site's addresses and to the Maps
// JavaScript API + Places API only.
const GOOGLE_MAPS_API_KEY = '';
const API_BASE = ['localhost', '127.0.0.1'].includes(location.hostname)
    ? 'http://localhost:4000/api'
    : 'https://jayderb-github-io.onrender.com/api';
    
// soon as any page opens so it's up by the time they sign in.
(() => {
    if (API_BASE.startsWith('http://localhost')) return;
    try {
        const last = Number(sessionStorage.getItem('kt_warm') || 0);
        if (Date.now() - last < 10 * 60 * 1000) return;
        sessionStorage.setItem('kt_warm', String(Date.now()));
    } catch (err) { /* storage blocked: ping anyway */ }
    fetch(API_BASE.replace(/\/api$/, '/health')).catch(() => {});
})();