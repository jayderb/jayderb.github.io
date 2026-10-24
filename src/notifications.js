const { getOrder, markOrderNotified, getUnnotifiedOrderIds } = require('./db/database');
const { sendOrderNotification } = require('./mailer');

const inFlight = new Set();

async function notifySeller(orderId) {
    if (inFlight.has(orderId)) return;   // stops the retry sweep double-sending
    inFlight.add(orderId);
    try {
        await sendOrderNotification(getOrder(orderId));
        markOrderNotified(orderId);
    } catch (err) {
        console.error(`Order ${orderId}: seller email failed, will retry:`, err.message);
    } finally {
        inFlight.delete(orderId);
    }
}

async function retryUnnotifiedOrders() {
    try {
        for (const id of getUnnotifiedOrderIds()) await notifySeller(id);
    } catch (err) {
        console.error('Order notification sweep failed:', err.message);
    }
}

module.exports = { notifySeller, retryUnnotifiedOrders };