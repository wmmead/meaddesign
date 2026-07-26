# MeadDesign — Progress Notes

Landing page at repo root (`index.html`, `styles.css`, `script.js`, `audio.js`).
Repo: https://github.com/wmmead/meaddesign.git

## Layered gradient background (Granim)

Three stacked `<canvas>` elements (`#granim-canvas-1/2/3` in `index.html`),
each its own `Granim` instance (set up in `script.js`), using the local
`granim/dist/granim.min.js` (vendored library, not gitignored).

- Layer 1: diagonal, normal blend, 7s transitions.
- Layer 2: left-right, `mix-blend-mode: screen` @ opacity 0.8, 4.3s transitions.
- Layer 3: radial, `mix-blend-mode: overlay` @ opacity 0.85, 11s transitions.

Different transition speeds are intentional — the phases drift relative to
each other so the composite never repeats.

## Logo animation (GSAP + SplitText, in `script.js`)

- Google Font "Montserrat" loaded via `<link>` in `index.html`.
- `h1` starts at `opacity: 0` (in CSS) and GSAP fades it to 1 after a delay
  (currently `delay: 2, duration: 3` — tune to taste).
- `SplitText` splits `h1` into individual chars (after `document.fonts.ready`
  so metrics are correct). Each char gets two independent GSAP tweens:
  - **Float**: `y` bounces by `-floatAmount`, where `floatAmount` is derived
    from the h1's *rendered* font-size (`fontSize * 0.15`) so the float
    distance scales with viewport width (font-size is `10vw`). Recalculated
    on window resize, debounced 200ms. Applied via `invalidateOnRepeat` so
    each yoyo cycle picks up the latest value without restarting the tween.
  - **Color**: cycles through a soft palette (white/pink/cyan/cream/lavender,
    each darkened 30% via a `darken()` helper), shuffled per letter, using
    GSAP keyframes with `yoyo: true` (not a hard loop) so the color never
    jumps abruptly at the cycle boundary.
  - Both tweens use randomized duration/delay per letter so letters drift
    out of phase with each other.

GSAP core + SplitText are loaded from cdnjs (v3.15.0) in `index.html`. Note:
SplitText used to be a paid Club GreenSock plugin; it's free as of 2025 and
now ships on the public CDN.

## Generative ambient audio player (`audio.js`)

Local mp3s live in `audio/` at the repo root — **gitignored** (~480MB, not in
the repo). If deploying, that folder needs to be uploaded separately.

- `AUDIO_TRACKS` at the top of `audio.js` is the manually-maintained list of
  file paths (`audio/<file>.mp3`). Add/remove entries there when the sound
  set changes — nothing else needs to change.
- Button `#audio-btn` (in `index.html`) starts centered on the page.
  - **First click**: starts the first random track, animates the button
    from its current position to the top-left corner (`top:20,left:20`) via
    GSAP over 1s, and changes its label to "Mute".
  - **Subsequent clicks**: toggle mute — fades every currently-playing
    track's volume to 0 (mute) or 1 (unmute) over `MUTE_FADE_DURATION` (2s),
    rather than an instant on/off. Label toggles "Mute" / "Play". Button
    position never changes again after the first click.
- **Track selection / cascade logic**:
  - `playingTracks` (Set of src strings) tracks what's currently playing;
    `pickRandomTrack()` only picks from files *not* in that set, so the same
    file is never played twice simultaneously.
  - Each track fades in (`volume` 0→1 over `FADE_IN_DURATION` = 5s) via GSAP
    when it starts — unless the site is currently muted, in which case it
    just sits at volume 0 silently until the next unmute (which fades
    *everything* active up together).
  - `TRIGGER_PROGRESS` (currently 0.33) is the fraction of a track's own
    duration at which it triggers the *next* random track to start (via a
    `timeupdate` listener, fires once per track). This cascades indefinitely
    — every playing track can spawn a new layer at its own 33% mark.
  - On `ended`, a track is removed from `playingTracks` (and
    `activeAudioElements`), which returns it to the pool for future random
    selection.
  - If every track happens to be playing already when a trigger fires, it
    just skips that spawn — no error, another track's cascade/ended event
    will eventually free one up.
- **"Playing:" label** (`#playing` paragraph in `index.html`):
  - Built by JS: a static "Playing: " prefix + a `#playing-list` span
    container.
  - Each track gets a `<span>` with its basename (e.g. `13-synthmaster.mp3`)
    appended to the list and faded in (opacity 0→1, `TEXT_FADE_DURATION` =
    1s) when it starts.
  - Comma separators are pure CSS (`#playing-list span:not(:last-child)::after
    { content: ', '; }`) — no JS punctuation bookkeeping needed, stays
    correct as spans are added/removed.
  - On `ended`, the matching span fades out over 1s and is removed from the
    DOM on completion.

Autoplay note: only the *first* track's `.play()` happens inside the
button's click handler (a real user gesture). All subsequent programmatic
`.play()` calls (triggered later via `timeupdate`) rely on Chrome's
per-page "autoplay unlocked after one user gesture" behavior — this has
been verified working in testing.

## Repo / tooling notes

- Git repo initialized locally, pushed to
  `https://github.com/wmmead/meaddesign.git` on `main`. Local git identity
  (this repo only, not global) is set to Bill Mead / bill@meaddesign.net.
- `.gitignore` excludes: `.DS_Store`, `.claude/settings.local.json`, and
  `audio/`.
- No build step — plain static HTML/CSS/JS, open `index.html` via a static
  server (e.g. `python3 -m http.server`) to test locally.
