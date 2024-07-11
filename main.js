// DOM Elements
const canvas = document.getElementById("migraineCanvas");
const ctx = canvas.getContext("2d");
const controlPanel = document.getElementById("controlPanel");
const sessionsPanel = document.getElementById("sessionsPanel");
const menuToggle = document.getElementById("menuToggle");
const resetButton = document.getElementById("resetButton");
const recordButton = document.getElementById("recordButton");
const playButton = document.getElementById("playButton");
const exportButton = document.getElementById("exportButton");
const importButton = document.getElementById("importButton");
const fileInput = document.getElementById("fileInput");
const speedSlider = document.getElementById("speedSlider");
const speedValue = document.getElementById("speedValue");
const stopRecordingButton = document.getElementById("stopRecordingButton");
const currentSessionInfo = document.getElementById("currentSessionInfo");
const sessionsTable = document.getElementById("sessionsTable").getElementsByTagName("tbody")[0];

// const splashScreen = document.getElementById("splashScreen");
// const startButton = document.getElementById("startButton");

const titleBar = document.getElementById("titleBar");
const titleBarHeader = titleBar.querySelector("h1");
const fullscreenPrompt = document.getElementById("fullscreenPrompt");
const enterFullscreenButton = document.getElementById("enterFullscreenButton");

// App State
let patterns = [];
let currentPattern = [];
let isRecording = false;
let sessionStartTime;
let currentSessionId = null;
let isDrawing = false;
let animationFrameId = null;

// Constants
const CROSSHAIR_SIZE = 20;
const POINT_DISTANCE = 5;
const ZIGZAG_AMPLITUDE = 0.02;
const TITLE_BAR_THRESHOLD = 150; // pixels from top

// Utility Functions
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

const generateSessionId = () => `session_${Date.now()}`;

const formatDuration = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
};

function enterFullscreenAndRefresh() {
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().then(() => {
            setTimeout(() => {
                window.location.reload();
            }, 100);
        });
    } else if (document.documentElement.mozRequestFullScreen) {
        // Firefox
        document.documentElement.mozRequestFullScreen();
        setTimeout(() => {
            window.location.reload();
        }, 100);
    } else if (document.documentElement.webkitRequestFullscreen) {
        // Chrome, Safari and Opera
        document.documentElement.webkitRequestFullscreen();
        setTimeout(() => {
            window.location.reload();
        }, 100);
    } else if (document.documentElement.msRequestFullscreen) {
        // IE/Edge
        document.documentElement.msRequestFullscreen();
        setTimeout(() => {
            window.location.reload();
        }, 100);
    }
}

// function updateTitleBarVisibility(event) {
//     const mouseY = event.clientY;
//     const opacity = Math.max(0, Math.min(1, 1 - mouseY / TITLE_BAR_THRESHOLD));
//     titleBar.style.opacity = opacity;
// }

// Canvas Functions
const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawCrosshair();
    redrawPatterns();
};
// const resizeCanvas = () => {
//     const containerWidth = window.innerWidth;
//     const containerHeight = window.innerHeight;
//     const scale = Math.min(containerWidth / canvas.width, containerHeight / canvas.height);

//     canvas.style.transformOrigin = "top left";
//     canvas.style.transform = `scale(${scale})`;
//     canvas.style.left = `${(containerWidth - canvas.width * scale) / 2}px`;
//     canvas.style.top = `${(containerHeight - canvas.height * scale) / 2}px`;

//     drawCrosshair();
//     redrawPatterns();
// };

const drawCrosshair = () => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    ctx.beginPath();
    ctx.moveTo(centerX - CROSSHAIR_SIZE, centerY);
    ctx.lineTo(centerX + CROSSHAIR_SIZE, centerY);
    ctx.moveTo(centerX, centerY - CROSSHAIR_SIZE);
    ctx.lineTo(centerX, centerY + CROSSHAIR_SIZE);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = "14px Roboto, sans-serif";
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.textAlign = "center";
    ctx.fillText("Focus on the crosshair 👀 and trace your migraine aura 😵‍💫", centerX, centerY - 40);
};

const getRelativePoint = (e) => {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) / canvas.width - 0.5,
        y: (e.clientY - rect.top) / canvas.height - 0.5,
        time: Date.now() - sessionStartTime,
    };
};

const drawLine = (from, to) => {
    ctx.beginPath();
    ctx.moveTo((from.x + 0.5) * canvas.width, (from.y + 0.5) * canvas.height);
    ctx.lineTo((to.x + 0.5) * canvas.width, (to.y + 0.5) * canvas.height);
    ctx.strokeStyle = `hsl(${Math.random() * 360}, 100%, 50%)`;
    ctx.lineWidth = 2;
    ctx.stroke();
};

const redrawPatterns = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCrosshair();
    patterns.forEach((pattern, patternIndex) => {
        const opacity = (patternIndex + 1) / patterns.length;
        ctx.beginPath();
        pattern.forEach((point, index) => {
            const x = (point.x + 0.5) * canvas.width;
            const y = (point.y + 0.5) * canvas.height;
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.strokeStyle = `hsla(${Math.random() * 360}, 100%, 50%, ${opacity})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        if (pattern.length > 0) {
            const highestPoint = pattern.reduce((max, p) => (p.y < max.y ? p : max));
            const x = (highestPoint.x + 0.5) * canvas.width;
            const y = (highestPoint.y + 0.5) * canvas.height;
            ctx.font = "12px Roboto, sans-serif";
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.textAlign = "center";
            ctx.fillText(`+${Math.floor(highestPoint.time / 1000)}s`, x, y - 20);
        }
    });
};

function toggleMenu() {
    controlPanel.classList.toggle("visible");
    sessionsPanel.classList.toggle("expanded");
    menuToggle.classList.toggle("menu-open");
    titleBarHeader.classList.toggle("hidden");
}

function checkFullscreen() {
    if (!document.fullscreenElement) {
        fullscreenPrompt.classList.remove("hidden");
        return false;
    }
    fullscreenPrompt.classList.add("hidden");
    return true;
}

function enterFullscreen() {
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
        document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) {
        document.documentElement.msRequestFullscreen();
    }
}

// Recording Functions
const startDrawing = (e) => {
    if (!checkFullscreen()) return;
    if (!isRecording) {
        toggleRecording();
    }
    isDrawing = true;
    const point = getRelativePoint(e);
    currentPattern.push(point);
};

const draw = (e) => {
    if (!isRecording || !isDrawing) return;
    const point = getRelativePoint(e);

    const lastPoint = currentPattern[currentPattern.length - 1];
    const dx = point.x - lastPoint.x;
    const dy = point.y - lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(Math.floor(distance / POINT_DISTANCE), 1);

    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const zigzagX = lastPoint.x + dx * t + (Math.random() - 0.5) * ZIGZAG_AMPLITUDE;
        const zigzagY = lastPoint.y + dy * t + (Math.random() - 0.5) * ZIGZAG_AMPLITUDE;

        drawLine(lastPoint, { x: zigzagX, y: zigzagY });
        currentPattern.push({ x: zigzagX, y: zigzagY, time: Date.now() - sessionStartTime });
    }
};

const stopDrawing = () => {
    if (!isRecording || !isDrawing) return;
    isDrawing = false;

    if (currentPattern.length < 20) {
        // Assume it's a misclick and reset the canvas
        // resetCanvas();
        currentPattern = [];
        return;
    }

    patterns.push(currentPattern);
    currentPattern = [];
    redrawPatterns();
    saveToLocalStorage();
    updateSessionsTable();
    updateCurrentSessionInfo();
};

const toggleRecording = () => {
    if (!checkFullscreen()) return;
    isRecording = !isRecording;
    if (isRecording) {
        currentPattern = [];
        sessionStartTime = Date.now();
        currentSessionId = generateSessionId();
        recordButton.textContent = "Recording...";
        stopRecordingButton.classList.add("visible");
    } else {
        console.log("isRecording :>> ", isRecording);
        recordButton.textContent = "Start Recording";
        stopRecordingButton.classList.remove("visible");
        controlPanel.classList.add("visible");
    }
    updateButtonStates();
};

// Playback Functions
const playAnimationWithSpeed = (speed) => {
    let startTime = Date.now();
    let frame = 0;

    const animate = () => {
        const currentTime = (Date.now() - startTime) * speed;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawCrosshair();

        for (let i = 0; i <= frame; i++) {
            if (i >= patterns.length) break;
            const pattern = patterns[i];
            ctx.beginPath();
            pattern.forEach((point, index) => {
                if (point.time <= currentTime) {
                    const x = (point.x + 0.5) * canvas.width;
                    const y = (point.y + 0.5) * canvas.height;
                    if (index === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
            });
            ctx.strokeStyle = `hsla(${Math.random() * 360}, 100%, 50%, ${(i + 1) / patterns.length})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        if (frame < patterns.length && patterns[frame][patterns[frame].length - 1].time <= currentTime) {
            frame++;
        }

        if (frame < patterns.length) {
            animationFrameId = requestAnimationFrame(animate);
        } else {
            playButton.textContent = "Replay Animation";
        }
    };

    animate();
};

// Session Management Functions
const resetCanvas = () => {
    cancelAnimationFrame(animationFrameId);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCrosshair();
    patterns = [];
    currentPattern = [];
    sessionStartTime = null;
    currentSessionId = null;
    isRecording = false;
    recordButton.textContent = "Start Recording";
    stopRecordingButton.classList.remove("visible");
    updateButtonStates();
    updateCurrentSessionInfo();
};

const saveToLocalStorage = () => {
    if (currentSessionId && patterns.length > 0) {
        const totalDuration = patterns.reduce((sum, pattern) => {
            return sum + (pattern[pattern.length - 1]?.time || 0);
        }, 0);

        const totalPoints = patterns.reduce((sum, pattern) => sum + pattern.length, 0);

        if (totalDuration === 0 && patterns.length === 0 && totalPoints === 0) {
            return; // Discard empty sessions
        }

        localStorage.setItem(
            currentSessionId,
            JSON.stringify({
                patterns: patterns,
                sessionStartTime: sessionStartTime,
            })
        );
    }
};

const loadFromLocalStorage = (sessionId) => {
    const savedSession = localStorage.getItem(sessionId);
    if (savedSession) {
        const parsedSession = JSON.parse(savedSession);
        patterns = parsedSession.patterns;
        sessionStartTime = parsedSession.sessionStartTime;
        currentSessionId = sessionId;
        redrawPatterns();
        updateCurrentSessionInfo();
        return true;
    }
    return false;
};

const updateSessionsTable = () => {
    sessionsTable.innerHTML = "";
    const sessions = Object.keys(localStorage)
        .filter((key) => key.startsWith("session_"))
        .sort((a, b) => parseInt(b.split("_")[1]) - parseInt(a.split("_")[1]));

    sessions.forEach((sessionId, index) => {
        const session = JSON.parse(localStorage.getItem(sessionId));
        const row = sessionsTable.insertRow();
        const startTime = new Date(parseInt(sessionId.split("_")[1]));
        const duration =
            session.patterns.reduce((sum, pattern) => {
                return sum + (pattern[pattern.length - 1]?.time || 0);
            }, 0) / 1000;
        const auraCount = session.patterns.length;
        const avgAuraSize = session.patterns.reduce((sum, pattern) => sum + pattern.length, 0) / auraCount || 0;

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${startTime.toLocaleString()}</td>
            <td>${formatDuration(duration * 1000)}</td>
            <td>${auraCount}</td>
            <td>${avgAuraSize.toFixed(2)} points</td>
            <td class="session-actions">
                <button class="btn btn-secondary download-session">Download</button>
                <button class="btn btn-secondary delete-session">Delete</button>
            </td>
        `;
        row.addEventListener("click", () => {
            loadFromLocalStorage(sessionId);
            showFlashTooltip(`Session loaded with ${session.patterns.length} Auras`, event.clientX, event.clientY);
        });
        row.querySelector(".download-session").addEventListener("click", (e) => {
            e.stopPropagation();
            downloadSession(sessionId);
        });
        row.querySelector(".delete-session").addEventListener("click", (e) => {
            e.stopPropagation();
            deleteSession(sessionId);
        });
    });
};

const updateCurrentSessionInfo = () => {
    if (currentSessionId) {
        const startTime = new Date(parseInt(currentSessionId.split("_")[1]));
        const duration =
            patterns.reduce((sum, pattern) => {
                return sum + (pattern[pattern.length - 1]?.time || 0);
            }, 0) / 1000;
        currentSessionInfo.textContent = `Current Session: Started ${startTime.toLocaleString()}, Duration: ${formatDuration(
            duration * 1000
        )}, Auras: ${patterns.length}`;
    } else {
        currentSessionInfo.textContent = "No active session";
    }
};

const updateButtonStates = () => {
    recordButton.disabled = false;
    playButton.disabled = patterns.length === 0;
    speedSlider.disabled = patterns.length === 0;
    exportButton.disabled = patterns.length === 0;
};

// File Management Functions
const exportToFile = () => {
    const data = JSON.stringify({
        patterns: patterns,
        sessionStartTime: sessionStartTime,
    });
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `migraine_session_${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const importFromFile = (file) => {
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const contents = e.target.result;
            const parsedData = JSON.parse(contents);
            patterns = parsedData.patterns;
            sessionStartTime = parsedData.sessionStartTime;
            currentSessionId = generateSessionId();
            saveToLocalStorage();
            redrawPatterns();
            updateButtonStates();
            updateSessionsTable();
            updateCurrentSessionInfo();
            showFlashTooltip("Session imported successfully", canvas.width / 2, canvas.height / 2);
        } catch (error) {
            console.error("Error parsing file:", error);
            showFlashTooltip("Error importing session", canvas.width / 2, canvas.height / 2);
        }
    };
    reader.readAsText(file);
};

const downloadSession = (sessionId) => {
    const session = localStorage.getItem(sessionId);
    const blob = new Blob([session], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `migraine_session_${sessionId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const deleteSession = (sessionId) => {
    if (confirm("Are you sure you want to delete this session?")) {
        localStorage.removeItem(sessionId);
        updateSessionsTable();
        if (currentSessionId === sessionId) {
            resetCanvas();
        }
    }
};

// UI Helper Functions
const showFlashTooltip = (message, x, y) => {
    const tooltip = document.createElement("div");
    tooltip.className = "flash-tooltip";
    tooltip.textContent = message;
    document.body.appendChild(tooltip);

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;

    requestAnimationFrame(() => {
        tooltip.style.opacity = 1;
    });

    setTimeout(() => {
        tooltip.style.opacity = 0;
        tooltip.addEventListener("transitionend", () => {
            document.body.removeChild(tooltip);
        });
    }, 2000);
};

// Event Listeners
window.addEventListener("resize", debounce(resizeCanvas, 250));
canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseout", (e) => {
    if (isDrawing) {
        const rect = canvas.getBoundingClientRect();
        let x = Math.max(0, Math.min(e.clientX - rect.left, canvas.width));
        let y = Math.max(0, Math.min(e.clientY - rect.top, canvas.height));
        draw({ clientX: x + rect.left, clientY: y + rect.top });
    }
});

menuToggle.addEventListener("click", toggleMenu);

enterFullscreenButton.addEventListener("click", enterFullscreen);

document.addEventListener("fullscreenchange", checkFullscreen);

resetButton.addEventListener("click", resetCanvas);

recordButton.addEventListener("click", toggleRecording);

stopRecordingButton.addEventListener("click", () => {
    controlPanel.classList.toggle("visible");
    sessionsPanel.classList.toggle("expanded");
    menuToggle.classList.toggle("menu-open");
    toggleRecording();
});

playButton.addEventListener("click", () => {
    const speed = parseFloat(speedSlider.value);
    cancelAnimationFrame(animationFrameId);
    playButton.textContent = "Playing...";
    playAnimationWithSpeed(speed);
});

speedSlider.addEventListener("input", () => {
    speedValue.textContent = `${speedSlider.value}x`;
});

exportButton.addEventListener("click", exportToFile);

importButton.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
        importFromFile(e.target.files[0]);
    }
});

document.addEventListener("mousedown", (e) => {
    if (
        !sessionsPanel.contains(e.target) &&
        !controlPanel.contains(e.target) &&
        !menuToggle.contains(e.target) &&
        !stopRecordingButton.contains(e.target)
    ) {
        sessionsPanel.classList.remove("expanded");
        controlPanel.classList.remove("visible");
        menuToggle.classList.remove("menu-open");
    }
});

// document.addEventListener("mousemove", updateTitleBarVisibility);

// startButton.addEventListener("click", () => {
//     enterFullscreenAndRefresh();
// });

// Initialize the app
const init = () => {
    resizeCanvas();
    updateSessionsTable();
    updateCurrentSessionInfo();

    const sessions = Object.keys(localStorage).filter((key) => key.startsWith("session_"));
    if (sessions.length > 0) {
        const lastSessionId = sessions.sort().pop();
        if (loadFromLocalStorage(lastSessionId)) {
            updateButtonStates();
        }
    }

    checkFullscreen();
    resetCanvas();
};

init();
