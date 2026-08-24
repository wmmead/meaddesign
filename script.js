/* ---------- Background gradients (Granim) ---------- */
/* Three layered instances at different transition speeds so their
   phases drift relative to each other and the composite never repeats. */

new Granim({
    element: '#granim-canvas-1',
    direction: 'diagonal',
    isPausedWhenNotInView: true,
    states: {
        'default-state': {
            gradients: [
                ['#6a11cb', '#2575fc'],
                ['#ff6a00', '#ee0979'],
                ['#00c9ff', '#92fe9d'],
                ['#f857a6', '#ff5858']
            ],
            transitionSpeed: 7000
        }
    }
});

new Granim({
    element: '#granim-canvas-2',
    direction: 'left-right',
    isPausedWhenNotInView: true,
    states: {
        'default-state': {
            gradients: [
                ['#0f2027', '#2c5364'],
                ['#ff9a00', '#ff165d'],
                ['#43cea2', '#185a9d'],
                ['#eb3349', '#f45c43']
            ],
            transitionSpeed: 4300
        }
    }
});

new Granim({
    element: '#granim-canvas-3',
    direction: 'radial',
    isPausedWhenNotInView: true,
    states: {
        'default-state': {
            gradients: [
                ['#7f00ff', '#e100ff'],
                ['#f2994a', '#f2c94c'],
                ['#00f260', '#0575e6'],
                ['#ff416c', '#ff4b2b']
            ],
            transitionSpeed: 11000
        }
    }
});

/* ---------- Logo animation (GSAP + SplitText) ---------- */

gsap.registerPlugin(SplitText);

gsap.to('h1', {
    opacity: 1,
    duration: 3,
    delay: 2
});

/* Wait for fonts so SplitText measures the final char metrics, not a fallback font. */
document.fonts.ready.then(function () {
    const split = new SplitText('h1', { type: 'chars' });

    function darken(hex, amount) {
        const num = parseInt(hex.slice(1), 16);
        const r = Math.round(((num >> 16) & 255) * (1 - amount));
        const g = Math.round(((num >> 8) & 255) * (1 - amount));
        const b = Math.round((num & 255) * (1 - amount));
        return '#' + [r, g, b].map(function (c) {
            return c.toString(16).padStart(2, '0');
        }).join('');
    }

    const colors = ['#ffffff', '#ffd6f7', '#d6f3ff', '#fff2c2', '#e0d6ff']
        .map(function (hex) { return darken(hex, 0.3); });

    const h1 = document.querySelector('h1');
    /* floatAmount scales with the h1's rendered font-size (10vw), so the
       float distance stays proportional to viewport width. */
    let floatAmount = parseFloat(getComputedStyle(h1).fontSize) * 0.15;

    let resizeTimeout;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function () {
            floatAmount = parseFloat(getComputedStyle(h1).fontSize) * 0.15;
        }, 200);
    });

    split.chars.forEach(function (char) {
        gsap.to(char, {
            y: function () { return -floatAmount; },
            invalidateOnRepeat: true, // picks up the latest floatAmount each yoyo cycle, no restart needed
            duration: 1.2 + Math.random() * 1.2,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            delay: Math.random() * 1
        });

        gsap.to(char, {
            keyframes: {
                color: gsap.utils.shuffle(colors.slice()),
                easeEach: 'sine.inOut'
            },
            duration: 4 + Math.random() * 3,
            repeat: -1,
            yoyo: true,
            delay: Math.random() * 2
        });
    });
});

/* ---------- Hamburger menu ---------- */

const mainNav = document.querySelector('#mainnav');
const hamburgerMenu = document.querySelector('.menu-btn');

hamburgerMenu.addEventListener('click', function () {
    hamburgerMenu.classList.toggle('is-active');
    mainNav.classList.toggle('menu-showing');
    mainNav.classList.toggle('menu-hidden');
});

/* ---------- About panel ---------- */

const about = document.querySelector('#about');
const aboutLink = document.querySelector('#about-link');
const aboutClose = document.querySelector('#about-close');

function isAboutOpen() {
    return about.classList.contains('article-showing');
}

function showAbout() {
    about.classList.remove('article-hidden');
    about.classList.add('article-showing');
}

function hideAbout() {
    about.classList.remove('article-showing');
    about.classList.add('article-hidden');
}

aboutLink.addEventListener('click', function (e) {
    e.preventDefault();
    showAbout();
});

aboutClose.addEventListener('click', hideAbout);

/* Closes on any click outside the panel, except the link that opens it
   (otherwise the click that opens it would immediately close it again). */
document.addEventListener('click', function (e) {
    if (isAboutOpen() && !about.contains(e.target) && e.target !== aboutLink) {
        hideAbout();
    }
});

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isAboutOpen()) {
        hideAbout();
    }
});
