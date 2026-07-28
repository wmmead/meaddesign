// ---------------------------------------------------------------------
// Add or remove filenames here to change which tracks are eligible to
// be picked. Paths are relative to this file (i.e. inside the audio/
// folder).
// ---------------------------------------------------------------------
var AUDIO_TRACKS = [
    'audio/07-Fluss.mp3',
    'audio/07-decent-sampler-1.mp3',
    'audio/07-decent-sampler2.mp3',
    'audio/07-ruismaker-noir.mp3',
    'audio/08-decent-sampler-1.mp3',
    'audio/08-decent-sampler-2.mp3',
    'audio/08-ruismaker-noir.mp3',
    'audio/11-animoog-1.mp3',
    'audio/11-animoog-2.mp3',
    'audio/11-decent-sampler.mp3',
    'audio/11-soundbox.mp3',
    'audio/11-synthmaster.mp3',
    'audio/12-decent-sampler.mp3',
    'audio/12-ruismaker-noir.mp3',
    'audio/12-synthmaster-1.mp3',
    'audio/12-synthmaster-2.mp3',
    'audio/13-decent-sampler-2.mp3',
    'audio/13-decentsampler-1.mp3',
    'audio/13-fluss-1.mp3',
    'audio/13-fluss-2.mp3',
    'audio/13-ruismaker-noir.mp3',
    'audio/13-synthmaster.mp3',
    'audio/15-dm10.mp3',
    'audio/15-j6-synth.mp3',
    'audio/16-decent-sampler.mp3',
    'audio/16-dm10.mp3',
    'audio/16-j6-synth.mp3',
    'audio/16-synthmaster.mp3',
    'audio/18-battlestation.mp3',
    'audio/18-decent-sampler.mp3',
    'audio/18-dm10.mp3',
    'audio/18-j6-synth.mp3',
    'audio/20-battlestation.mp3',
    'audio/20-decent-sampler.mp3',
    'audio/20-j6-synth.mp3',
    'audio/20-synthmaster.mp3',
    'audio/21-decent-sampler.mp3',
    'audio/21-dm10.mp3',
    'audio/21-synthmaster.mp3',
    'audio/24-decent-sampler.mp3',
    'audio/24-dm10.mp3',
    'audio/24-j6-synth.mp3',
    'audio/24-wave-cloud.mp3',
    'audio/25-battlestation.mp3',
    'audio/25-decent-sampler.mp3',
    'audio/25-j6-synth.mp3',
    'audio/25-ruismaker-noir.mp3',
    'audio/25-synthmaster.mp3',
    'audio/26-animoog.mp3',
    'audio/26-decent-sampler.mp3',
    'audio/26-dm10.mp3',
    'audio/26-jsynth.mp3',
    'audio/26-reverie.mp3',
    'audio/27-decent-sampler.mp3',
    'audio/27-j6synth.mp3',
    'audio/27-reverie-choral.mp3',
    'audio/27-reverie-frozen-time.mp3',
    'audio/27-ruismaker-noir.mp3',
    'audio/27-synthmaster.mp3',
];

var FADE_IN_DURATION = 5;
var TRIGGER_PROGRESS = 0.33;
var MUTE_FADE_DURATION = 2;
var TEXT_FADE_DURATION = 1;
var REMIX_FADE_DURATION = 2;
var REMIX_COOLDOWN = 20;
var MAX_CONCURRENT_TRACKS = 3;
var PRUNE_FADE_DURATION = 2;
var PRUNE_CHECK_INTERVAL = 60000;

var playingTracks = new Set();
var activeAudioElements = new Set();
var isMuted = false;
var playingLabels = new Map();

// "roundBars + bar-level colorMode" preset from the audioMotion-analyzer
// fluid demo (https://audiomotion.dev/demo/fluid.html).
var audioMotion = new AudioMotionAnalyzer(document.getElementById('visualizer'), {
    mode: 4,
    alphaBars: false,
    ansiBands: false,
    barSpace: 0.20,
    channelLayout: 'single',
    colorMode: 'bar-level',
    frequencyScale: 'log',
    ledBars: false,
    linearAmplitude: true,
    linearBoost: 1.6,
    lumiBars: false,
    maxFreq: 16000,
    minFreq: 30,
    mirror: 0,
    overlay: true,
    radial: false,
    reflexRatio: 0.5,
    reflexAlpha: 1,
    roundBars: true,
    showBgColor: false,
    showPeaks: false,
    showScaleX: false,
    smoothing: 0.7,
    weightingFilter: 'D'
});

// Custom gradient drawn from the Granim background palette (script.js),
// running dark violet -> pink -> orange -> cyan -> near-white as amplitude
// increases, so the loudest peaks stay bright/near-white for contrast
// against whatever the shifting gradient background is doing.
audioMotion.registerGradient('meaddesign', {
    bgColor: '#000',
    colorStops: [
        { color: '#3d0a6e', level: 0.1 },
        { color: '#ff2ea6', level: 0.3 },
        { color: '#ff7a1a', level: 0.5 },
        { color: '#22e6ff', level: 0.7 },
        { color: '#f5feff', level: 0.85 },
        { color: '#ffffff', level: 1 }
    ]
});
audioMotion.gradient = 'meaddesign';

var playingEl = document.getElementById('playing');
playingEl.textContent = 'Playing: ';
var playingList = document.createElement('span');
playingList.id = 'playing-list';
playingEl.appendChild(playingList);

function addPlayingLabel(src) {
    var span = document.createElement('span');
    span.textContent = src.split('/').pop();
    playingList.appendChild(span);
    gsap.to(span, { opacity: 1, duration: TEXT_FADE_DURATION });
    playingLabels.set(src, span);
}

function removePlayingLabel(src) {
    var span = playingLabels.get(src);
    if (!span) {
        return;
    }
    playingLabels.delete(src);
    gsap.to(span, {
        opacity: 0,
        duration: TEXT_FADE_DURATION,
        onComplete: function () {
            span.remove();
        }
    });
}

function pickRandomTrack() {
    var available = AUDIO_TRACKS.filter(function (track) {
        return !playingTracks.has(track);
    });

    if (available.length === 0) {
        return null;
    }

    return available[Math.floor(Math.random() * available.length)];
}

function playTrack(src, fadeInDuration) {
    playingTracks.add(src);

    var audio = new Audio(src);
    audio.trackSrc = src;
    audio.volume = 0;
    activeAudioElements.add(audio);
    addPlayingLabel(src);
    audioMotion.connectInput(audio);

    var triggeredNext = false;

    audio.addEventListener('timeupdate', function () {
        if (!triggeredNext && audio.duration && audio.currentTime / audio.duration >= TRIGGER_PROGRESS) {
            triggeredNext = true;
            startNextTrack();
        }
    });

    audio.addEventListener('ended', function () {
        playingTracks.delete(src);
        activeAudioElements.delete(audio);
        removePlayingLabel(src);
        audioMotion.disconnectInput(audio);
    });

    audio.play().catch(function (err) {
        console.error('Playback failed for ' + src + ':', err);
    });

    if (!isMuted) {
        gsap.to(audio, { volume: 1, duration: fadeInDuration || FADE_IN_DURATION });
    }
}

function startNextTrack() {
    var track = pickRandomTrack();
    if (track) {
        playTrack(track);
    }
}

function fadeOutAndRemoveTrack(audio, duration) {
    var src = audio.trackSrc;

    gsap.to(audio, {
        volume: 0,
        duration: duration,
        onComplete: function () {
            audio.pause();
            playingTracks.delete(src);
            activeAudioElements.delete(audio);
            removePlayingLabel(src);
            audioMotion.disconnectInput(audio);
        }
    });
}

function removeRandomActiveTrack(duration) {
    var activeList = Array.from(activeAudioElements);
    if (activeList.length === 0) {
        return;
    }

    var audioToRemove = activeList[Math.floor(Math.random() * activeList.length)];
    fadeOutAndRemoveTrack(audioToRemove, duration);
}

function remixOneTrack() {
    if (activeAudioElements.size > 1) {
        removeRandomActiveTrack(REMIX_FADE_DURATION);
    }

    var track = pickRandomTrack();
    if (track) {
        playTrack(track, REMIX_FADE_DURATION);
    }
}

setInterval(function () {
    if (activeAudioElements.size > MAX_CONCURRENT_TRACKS) {
        removeRandomActiveTrack(PRUNE_FADE_DURATION);
    } else if (activeAudioElements.size === 0 && audioStarted) {
        startNextTrack();
    }
}, PRUNE_CHECK_INTERVAL);

var audioBtn = document.getElementById('audio-btn');
var audioStarted = false;

var remixBtn = document.getElementById('remix');
var remixLabelOff = remixBtn.textContent;
var remixLabelOn = 'mess with the audio';

var parentalCheckbox = document.querySelector('#parental input[type="checkbox"]');

function currentRemixLabel() {
    return parentalCheckbox.checked ? remixLabelOn : remixLabelOff;
}

parentalCheckbox.addEventListener('change', function () {
    if (!remixBtn.disabled) {
        remixBtn.textContent = currentRemixLabel();
    }
});

audioBtn.addEventListener('click', function () {
    if (!audioStarted) {
        audioStarted = true;
        audioMotion.audioCtx.resume();
        startNextTrack();

        var rect = audioBtn.getBoundingClientRect();
        gsap.set(audioBtn, { top: rect.top, left: rect.left, transform: 'none' });
        gsap.to(audioBtn, {
            top: 20,
            left: 20,
            duration: 1,
            ease: 'power2.inOut',
            onComplete: function () {
                var audioBtnRect = audioBtn.getBoundingClientRect();
                gsap.set(remixBtn, { top: 20, left: audioBtnRect.right + 10 });
                gsap.to(remixBtn, { opacity: 1, duration: 0.5 });
                remixBtn.style.pointerEvents = 'auto';
            }
        });

        audioBtn.textContent = 'Mute';
        return;
    }

    isMuted = !isMuted;
    activeAudioElements.forEach(function (audio) {
        gsap.to(audio, { volume: isMuted ? 0 : 1, duration: MUTE_FADE_DURATION });
    });
    audioBtn.textContent = isMuted ? 'Play' : 'Mute';
});

remixBtn.addEventListener('click', function () {
    remixOneTrack();

    var remaining = REMIX_COOLDOWN;
    remixBtn.disabled = true;
    gsap.to(remixBtn, { opacity: 0.5, duration: 0.3 });
    remixBtn.textContent = remaining + ' seconds';

    var countdown = setInterval(function () {
        remaining -= 1;
        remixBtn.textContent = remaining + ' seconds';

        if (remaining <= 0) {
            clearInterval(countdown);
            remixBtn.disabled = false;
            gsap.to(remixBtn, { opacity: 1, duration: 0.3 });
            remixBtn.textContent = currentRemixLabel();
        }
    }, 1000);
});
