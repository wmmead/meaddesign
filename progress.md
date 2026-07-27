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
- **Remix button** (`#remix` in `index.html`, starts hidden/`opacity:0`/
  `pointer-events:none` in CSS):
  - Revealed by the `audio-btn` click handler's `onComplete`, once the mute
    button finishes animating into its corner — positioned immediately to
    its right (`top:20`, `left` = mute button's right edge + 10px) and
    faded in.
  - Click → `remixOneTrack()`: if more than one track is currently playing,
    fades out + removes one random track (`REMIX_FADE_DURATION` = 2s);
    if only one track is playing, it *skips* the removal and just adds a
    second (never drops to zero via remix). Either way, a new random track
    is always added with a 2s fade-in.
  - While running, the button is disabled, dimmed to 0.5 opacity (via GSAP,
    not a raw style set — see gotcha below), and counts down
    "20 seconds" → "0 seconds" (`REMIX_COOLDOWN`), then re-enables and
    restores its idle label.
  - **Gotcha already hit once**: don't use a plain `el.style.opacity = ...`
    for the disabled-dim state if GSAP might still be animating that same
    element's opacity (e.g. its own reveal fade). GSAP will keep overwriting
    a raw style write on every tick until its tween finishes. Route it
    through `gsap.to(...)` instead so GSAP's own overwrite management
    handles the conflict correctly regardless of click timing.
- **Concurrency management** (a `setInterval` every `PRUNE_CHECK_INTERVAL`
  = 60s):
  - If more than `MAX_CONCURRENT_TRACKS` (3) tracks are playing (the
    cascade can drift upward over time), randomly removes one via the same
    fade-out helper (`fadeOutAndRemoveTrack`, shared with the remix logic).
  - If *zero* tracks are playing (can happen if tracks end faster than the
    cascade replaces them) **and** playback has been started at least once
    (`audioStarted`), starts a new random track. The `audioStarted` guard
    just prevents this from kicking off playback before the user has ever
    clicked the start button.
- **Parental controls toggle** (`#parental` in `index.html`, top-right
  corner, a checkbox styled as an ON/OFF pill switch):
  - Purely cosmetic on the remix button so far: toggling it swaps the
    button's idle label between `"fuck with the audio"` (off) and
    `"mess with the audio"` (on) via `currentRemixLabel()`.
  - Toggling while the remix button is idle updates the label immediately;
    toggling mid-countdown does *not* interrupt the "N seconds" display —
    the countdown's completion handler calls `currentRemixLabel()` fresh
    (not a value captured at click time), so it always reflects whatever
    the toggle's current state is when the countdown ends, however many
    times it was flipped in between.
  - No other behavior is wired to this toggle yet — actual "parental
    controls" content-gating logic (if any) is still unimplemented.
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

**Testing notes** (for verifying audio.js changes without real mp3 files
or real wall-clock waits):
- Mock `window.Audio` via Playwright's `page.addInitScript` (before
  navigation) with a small class exposing `volume`/`duration`/`currentTime`
  and firing `timeupdate`/`ended` listeners on demand — lets you drive the
  cascade/selection/pool logic deterministically and instantly.
- For the 60s concurrency check specifically, `page.clock.install()` +
  `page.clock.fastForward(61000)` reliably fires the `setInterval` without
  a real 60s wait. Caveat: fast-forwarding while a *GSAP* tween is also
  active on the same element can produce weird/unreliable intermediate
  values (GSAP's rAF-driven ticker doesn't play cleanly with Playwright's
  fake clock) — trust the discrete state transitions (Set sizes, DOM
  counts) over exact volume readings taken mid-fastForward.
- `REMIX_COOLDOWN` can be overridden live via `page.evaluate(() => {
  window.REMIX_COOLDOWN = 3; })` *after* page load to speed up the
  20s-countdown tests, since the click handler reads it fresh each click.
  This trick does NOT work for `PRUNE_CHECK_INTERVAL`, since that value is
  baked into the `setInterval(...)` call once at script load — use the
  Clock API for that one instead.

## Repo / tooling notes

- Git repo initialized locally, pushed to
  `https://github.com/wmmead/meaddesign.git` on `main`. Local git identity
  (this repo only, not global) is set to Bill Mead / bill@meaddesign.net.
- `.gitignore` excludes: `.DS_Store`, `.claude/settings.local.json`, and
  `audio/`.
- No build step — plain static HTML/CSS/JS, open `index.html` via a static
  server (e.g. `python3 -m http.server`) to test locally.
