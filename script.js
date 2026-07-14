// Navbar scroll behaviour
const navbar = document.querySelector('.navbar');
const header = document.querySelector('header');

window.addEventListener('scroll', () => {
    if (window.scrollY > 80) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});
// Scroll reveal
const revealElements = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target); // animate once
        }
    });
}, {
    threshold: 0.15
});

revealElements.forEach(el => revealObserver.observe(el));

// Campaign parallax
const campaign = document.querySelector('.campaign');

window.addEventListener('scroll', () => {
    if (!campaign) return;

    const rect = campaign.getBoundingClientRect();
    const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

    if (isVisible) {
        const scrolled = window.scrollY - campaign.offsetTop;
        const rate = scrolled * 0.3;
        campaign.style.backgroundPositionY = `calc(center + ${rate}px)`;
    }
});

// Card tilt effect
const tiltCards = document.querySelectorAll('.collection-card');

tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();

        // Cursor position relative to card center
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        // Convert to degrees — max 8deg tilt
        const rotateX = -(y / rect.height) * 8;
        const rotateY = (x / rect.width) * 8;

        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = `perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)`;
    });
});