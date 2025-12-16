const socket = io();
const statusP = document.getElementById('status');
const idDisplay = document.getElementById('displayId');
const myId = localStorage.getItem('device_id');

if (idDisplay) idDisplay.innerText = `ID: ${myId}`;

if (!myId) {
    alert("No ID found. Please go back to home page.");
    window.location.href = 'index.html';
}

// Join the "room" for this device ID
socket.emit('join', myId);

if (navigator.geolocation) {
    statusP.innerText = `Connecting to satellite...`;

    // Throttling: Send update max once per 2 seconds
    let lastSent = 0;

    // Watch position for real-time updates
    window.watchId = navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude, accuracy, speed, heading } = position.coords;
            const now = Date.now();

            // Update UI immediately for user feedback
            statusP.innerHTML = `
                Broadcasting Location...<br>
                Lat: ${latitude.toFixed(5)}<br>
                Lon: ${longitude.toFixed(5)}<br>
                Accuracy: Within ${Math.round(accuracy)}m
            `;

            // Start basic filtering: if accuracy is too low (>150m), skip it
            // (Unless it's the very first reading, but for now we filter strictly)
            // Note: 150m is a "city block" margin.
            if (accuracy > 150) {
                statusP.innerHTML += `<br><span style="color:orange">Skipping poor signal (${Math.round(accuracy)}m)</span>`;
                return;
            }

            // Throttle Network usage
            if (now - lastSent > 2000) {
                socket.emit('update_location', {
                    room: myId,
                    latitude,
                    longitude,
                    accuracy,
                    timestamp: now
                });
                lastSent = now;
            }
        },
        (error) => {
            console.error(error);
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    statusP.innerText = "Error: Permission Denied. Please enable GPS.";
                    break;
                case error.POSITION_UNAVAILABLE:
                    statusP.innerText = "Error: Signal Unavailable.";
                    break;
                case error.TIMEOUT:
                    statusP.innerText = "Error: Timeout.";
                    break;
                default:
                    statusP.innerText = "Error: Unknown GPS Error.";
            }
        },
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
        }
    );
} else {
    statusP.innerText = "Error: GPS not supported on this browser.";
}



// --- Wake Lock API to prevent screen sleep ---
let wakeLock = null;

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock is active');
        }
    } catch (err) {
        console.error(`Wake Lock Error: ${err.name}, ${err.message}`);
    }
}

// Request lock on load
requestWakeLock();

// Re-acquire lock if the app comes back to foreground
document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
    }
});

function stopSharing() {
    // 1. Stop GPS Watch
    if (window.watchId !== undefined) {
        navigator.geolocation.clearWatch(window.watchId);
        window.watchId = undefined;
    }

    // 2. Notify Server
    if (myId) {
        socket.emit('stop_sharing', myId);
    }

    // 3. Update UI
    const statusP = document.getElementById('status');
    if (statusP) {
        statusP.innerHTML = `<span style="color: red; font-weight: bold;">Sharing Stopped.</span><br>Reload page to restart.`;
    }

    // 4. Release Wake Lock
    if (wakeLock) {
        wakeLock.release()
            .then(() => {
                wakeLock = null;
                console.log('Wake Lock released');
            });
    }

    // 5. Disable Stop Button (optional visual cue)
    const btn = document.querySelector('.mode-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Stopped";
        btn.style.backgroundColor = "#ccc";
    }
}

// Explicitly export to window to avoid ReferenceError
window.stopSharing = stopSharing;
