let timerInterval: ReturnType<typeof setInterval>;
let secondsElapsed = 0;
let isPaused = false;

self.onmessage = (event) => {
    const task = event.data;
    if (task === 'start') {
        startTimer();
    } else if (task === 'pause') {
        togglePause();
    }
};

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!isPaused) {
            secondsElapsed++;
            self.postMessage(secondsElapsed);
        }
    }, 1000);
}

function togglePause() {
    isPaused = !isPaused;
}
