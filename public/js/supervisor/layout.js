AOS.init({
    duration: 800,
    easing: 'ease-in-out',
    once: true,
});

document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.querySelector('.loading-overlay');
    overlay.classList.add('active');
    setTimeout(() => {
        overlay.classList.remove('active');
    }, 1000);
});

const cards = document.querySelectorAll('.card');
cards.forEach((card) => {
    card.addEventListener('mouseenter', () => {
        gsap.to(card, {
            y: -10,
            duration: 0.3,
            ease: 'power2.out',
        });
    });
    card.addEventListener('mouseleave', () => {
        gsap.to(card, {
            y: 0,
            duration: 0.3,
            ease: 'power2.out',
        });
    });
});

const dropdowns = document.querySelectorAll('.dropdown');
dropdowns.forEach((dropdown) => {
    dropdown.addEventListener('show.bs.dropdown', () => {
        const menu = dropdown.querySelector('.dropdown-menu');
        gsap.from(menu, {
            y: -20,
            opacity: 0,
            duration: 0.3,
            ease: 'power2.out',
        });
    });
});

const buttons = document.querySelectorAll('.btn');
buttons.forEach((button) => {
    button.addEventListener('mouseenter', () => {
        gsap.to(button, {
            scale: 1.05,
            duration: 0.2,
            ease: 'power2.out',
        });
    });
    button.addEventListener('mouseleave', () => {
        gsap.to(button, {
            scale: 1,
            duration: 0.2,
            ease: 'power2.out',
        });
    });
});
