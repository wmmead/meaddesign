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

gsap.registerPlugin(SplitText);

gsap.to('h1', {
    opacity: 1,
    duration: 3,
    delay: 2
});

document.fonts.ready.then(function () {
    var split = new SplitText('h1', { type: 'chars' });

    function darken(hex, amount) {
        var num = parseInt(hex.slice(1), 16);
        var r = Math.round(((num >> 16) & 255) * (1 - amount));
        var g = Math.round(((num >> 8) & 255) * (1 - amount));
        var b = Math.round((num & 255) * (1 - amount));
        return '#' + [r, g, b].map(function (c) {
            return c.toString(16).padStart(2, '0');
        }).join('');
    }

    var colors = ['#ffffff', '#ffd6f7', '#d6f3ff', '#fff2c2', '#e0d6ff']
        .map(function (hex) { return darken(hex, 0.3); });

    var h1 = document.querySelector('h1');
    var floatAmount = parseFloat(getComputedStyle(h1).fontSize) * 0.15;

    var resizeTimeout;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function () {
            floatAmount = parseFloat(getComputedStyle(h1).fontSize) * 0.15;
        }, 200);
    });

    split.chars.forEach(function (char) {
        gsap.to(char, {
            y: function () { return -floatAmount; },
            invalidateOnRepeat: true,
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
