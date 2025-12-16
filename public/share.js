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

    // Watch position for real-time updates
    const watchId = navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude, accuracy, speed, heading } = position.coords;

            statusP.innerHTML = `
                Broadcasting Location...<br>
                Lat: ${latitude.toFixed(5)}<br>
                Lon: ${longitude.toFixed(5)}<br>
                Accuracy: Within ${Math.round(accuracy)}m
            `;

            // Emit to server
            socket.emit('update_location', {
                room: myId,
                latitude,
                longitude,
                accuracy,
                timestamp: new Date().getTime()
            });
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

window.location.href = 'index.html';
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
