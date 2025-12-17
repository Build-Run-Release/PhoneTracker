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

            // Signal Quality Classification
            let signalQuality = "Unknown";
            let signalColor = "gray";

            if (accuracy <= 10) {
                signalQuality = "Pinpoint";
                signalColor = "#28a745"; // Green
            } else if (accuracy <= 30) {
                signalQuality = "Good";
                signalColor = "#007bff"; // Blue
            } else if (accuracy <= 100) {
                signalQuality = "Fair";
                signalColor = "#ffc107"; // Yellow
            } else {
                signalQuality = "Poor";
                signalColor = "#dc3545"; // Red
            }

            // Update UI immediately for user feedback
            statusP.innerHTML = `
                Broadcasting Location...<br>
                <strong style="color: ${signalColor}">Signal: ${signalQuality} (±${Math.round(accuracy)}m)</strong><br>
                Lat: ${latitude.toFixed(5)}<br>
                Lon: ${longitude.toFixed(5)}<br>
                Speed: ${speed ? (speed * 3.6).toFixed(1) + ' km/h' : '0 km/h'}
            `;

            // Strict Filtering: Skip updates with very poor accuracy (> 100m)
            // unless it's the very first update (to ensure we at least get on the map)
            if (accuracy > 100) {
                statusP.innerHTML += `<br><span style="color:orange">⚠ Filtering poor signal (Acc: ${Math.round(accuracy)}m)</span>`;
                // We still let it pass if we haven't sent anything yet, so they know it's working
                if (lastSent !== 0) return;
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
                    statusP.innerText = "Error: GPS Timeout. Move outdoors for better signal.";
                    break;
                default:
                    statusP.innerText = "Error: Unknown GPS Error.";
            }
        },
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 30000
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
