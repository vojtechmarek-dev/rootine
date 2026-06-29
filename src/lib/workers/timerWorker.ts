let timerInterval: ReturnType<typeof setInterval>;
// Wall-clock based so the timer stays correct across background freezes.
// Chromium (Brave/Chrome) freezes a backgrounded PWA and its workers, so
// setInterval ticks stop firing. Counting ticks loses that frozen time;
// deriving elapsed from Date.now() self-corrects on the first tick after resume.
let runStart = 0; // epoch ms when the current running segment began
let bankedMs = 0; // elapsed ms accumulated before the current segment (banked at each pause)
let isPaused = false;
let lastPosted = -1;

self.onmessage = (event) => {
    const task = event.data;
    if (task === 'start') {
        startTimer();
    } else if (task === 'pause') {
        togglePause();
    } else if (task === 'stop') {
        stopTimer();
    }
};

function elapsedSeconds() {
    const ms = isPaused ? bankedMs : bankedMs + (Date.now() - runStart);
    return Math.floor(ms / 1000);
}

function tick() {
    const seconds = elapsedSeconds();
    // Avoid spamming identical values when ticks bunch up after a resume.
    if (seconds !== lastPosted) {
        lastPosted = seconds;
        self.postMessage(seconds);
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    bankedMs = 0;
    runStart = Date.now();
    isPaused = false;
    lastPosted = -1;
    tick();
    // Tick faster than 1s so the visible clock snaps to the right value
    // quickly once the page is foregrounded again.
    timerInterval = setInterval(tick, 250);
}

function togglePause() {
    if (isPaused) {
        // Resume: start a fresh running segment.
        runStart = Date.now();
        isPaused = false;
    } else {
        // Pause: bank the elapsed time of the segment we're closing.
        bankedMs += Date.now() - runStart;
        isPaused = true;
    }
    tick();
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    bankedMs = 0;
    runStart = 0;
    isPaused = false;
    lastPosted = -1;
}
