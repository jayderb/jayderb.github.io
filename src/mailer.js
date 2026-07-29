const nodemailer = require('nodemailer');

function escapeHtml(str = '') {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Gmail App Password, not your regular password
    },
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

module.exports = { sendContactNotification };