const nodemailer = require('nodemailer');

function escapeHtml(str = '') {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Free Render instances block SMTP, so email can be switched off with EMAIL_DISABLED=true
const emailDisabled = process.env.EMAIL_DISABLED === 'true';

const transporter = emailDisabled
    ? {
        // Same shape as nodemailer's transporter. Logs the subject only, so no
        // customer addresses end up in the hosting logs.
        sendMail: async (message) => {
            console.log(`[email disabled] skipped: ${message.subject}`);
        },
    }
    : nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
    });
async function sendContactNotification({ name, email, subject, message }) {
    const to = process.env.CONTACT_TO_EMAIL || process.env.EMAIL_USER;

    const html = `
        <h2>New contact form submission — Krint Tufwale</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(subject || 'General Enquiry')}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
    `;

    await transporter.sendMail({
        from: `"Krint Tufwale Website" <${process.env.EMAIL_USER}>`,
        to,
        replyTo: email,
        subject: `New Contact Form: ${subject || 'General Enquiry'}`,
        html,
    });
}
function formatZMW(n) {
    return `ZMW ${Number(n).toLocaleString('en-US')}`;
}

// 0977123456 or +260 977 123 456 -> https://wa.me/260977123456
function whatsappLink(phone) {
    let digits = String(phone || '').replace(/\D/g, '');
    if (digits.startsWith('0')) digits = '260' + digits.slice(1);
    return digits.length >= 11 ? `https://wa.me/${digits}` : null;
}

async function sendOrderNotification(order) {
    const to = process.env.ORDER_NOTIFY_EMAIL
        || process.env.CONTACT_TO_EMAIL
        || process.env.EMAIL_USER;
    const ref = `KT-${String(order.id).padStart(4, '0')}`;
    const wa = whatsappLink(order.phone);

    const rows = order.items.map((i) => `
        <tr>
            <td style="padding:6px 12px 6px 0">${escapeHtml(i.name)}</td>
            <td style="padding:6px 12px">${i.qty} × ${formatZMW(i.unitPriceZmw)}</td>
            <td style="padding:6px 0;text-align:right">${formatZMW(i.lineTotalZmw)}</td>
        </tr>`).join('');

    const html = `
        <h2 style="margin:0 0 4px">New order ${ref}</h2>
        <p style="margin:0 0 20px;color:#666">
            Payment hasn't been collected yet. Contact the customer to arrange
            MTN / Airtel mobile money and delivery.
        </p>
        <p>
            <strong>Customer:</strong> ${escapeHtml(order.customer_name)}<br>
            <strong>Email:</strong> ${escapeHtml(order.email)}<br>
            <strong>Phone:</strong> ${escapeHtml(order.phone || '—')}${wa ? ` (<a href="${wa}">WhatsApp</a>)` : ''}<br>
            <strong>Deliver to:</strong> ${escapeHtml(order.delivery_address || '—').replace(/\n/g, '<br>')}
        </p>
        <table style="border-collapse:collapse;margin:16px 0">
            ${rows}
            <tr>
                <td colspan="2" style="padding:10px 12px 0 0;border-top:1px solid #ccc"><strong>Total</strong></td>
                <td style="padding:10px 0 0;border-top:1px solid #ccc;text-align:right"><strong>${formatZMW(order.total_zmw)}</strong></td>
            </tr>
        </table>
        <p style="color:#666">Placed ${escapeHtml(order.created_at)} UTC. Reply to this email to reach the customer directly.</p>
    `;

    await transporter.sendMail({
        from: `"Krint Tufwale Orders" <${process.env.EMAIL_USER}>`,
        to,
        replyTo: order.email,
        subject: `New order ${ref} — ${formatZMW(order.total_zmw)}`,
        html,
    });
}

module.exports = { sendContactNotification, sendOrderNotification };