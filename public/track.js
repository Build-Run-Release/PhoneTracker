const socket = io();
const targetId = localStorage.getItem('track_target_id');

if (!targetId) {
    alert("No Target ID found. Please enter one.");
    window.location.href = 'index.html';
}

socket.emit('join', targetId);

// Initialize Map
// Default view: Center of the world until we get signal
const map = L.map('map').setView([0, 0], 2);

// Dark Theme Map Tiles (CartoDB Dark Matter)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

// Markers and Paths
let marker = null;
let circle = null;
let path = [];
let polyline = L.polyline([], { color: '#007bff' }).addTo(map);

// "Searching" Overlay or Status
// check if overlay exists, if not create it
let overlay = document.getElementById('searching-overlay');
if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'searching-overlay';
    overlay.style.position = 'absolute';
    overlay.style.top = '10px';
    overlay.style.left = '50%';
    overlay.style.transform = 'translateX(-50%)';
    overlay.style.zIndex = '1000';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
    overlay.style.color = 'white';
    overlay.style.padding = '10px 20px';
    overlay.style.borderRadius = '20px';
    overlay.style.fontFamily = 'sans-serif';
    overlay.innerHTML = 'Searching for device signal...';
    document.body.appendChild(overlay);
}

// Info Panel (Signal, Accuracy, Speed)
let infoPanel = document.getElementById('info-panel');
if (!infoPanel) {
    infoPanel = document.createElement('div');
    infoPanel.id = 'info-panel';
    infoPanel.style.position = 'absolute';
    infoPanel.style.bottom = '20px'; // Bottom left
    infoPanel.style.left = '20px';
    infoPanel.style.zIndex = '1000';
    infoPanel.style.backgroundColor = 'rgba(255,255,255,0.9)';
    infoPanel.style.color = '#333';
    infoPanel.style.padding = '15px';
    infoPanel.style.borderRadius = '10px';
    infoPanel.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
    infoPanel.style.fontFamily = 'sans-serif';
    infoPanel.style.minWidth = '200px';
    infoPanel.style.display = 'none'; // Hidden until we get data
    document.body.appendChild(infoPanel);
}

// Listen for updates
socket.on('receive_location', (data) => {
    // Hide searching overlay once we get data
    const overlay = document.getElementById('searching-overlay');
    if (overlay) overlay.style.display = 'none';

    const { latitude, longitude, accuracy, timestamp } = data;

    // Calculate last updated
    const secondsAgo = Math.floor((Date.now() - timestamp) / 1000);

    // Determines Signal Quality color
    let signalColor = '#007bff'; // Default Blue
    let signalText = 'Good';

    if (accuracy <= 10) { signalColor = '#28a745'; signalText = 'Pinpoint'; } // Green
    else if (accuracy <= 30) { signalColor = '#007bff'; signalText = 'Good'; } // Blue
    else if (accuracy <= 100) { signalColor = '#ffc107'; signalText = 'Fair'; } // Yellow
    else { signalColor = '#dc3545'; signalText = 'Poor'; } // Red

    // Update Info Panel
    if (infoPanel) {
        infoPanel.style.display = 'block';
        infoPanel.innerHTML = `
            <div style="margin-bottom:5px; font-weight:bold; font-size:1.1em;">Target Status</div>
            <div style="display:flex; align-items:center; margin-bottom:5px;">
                <div style="width:10px; height:10px; border-radius:50%; background-color:${signalColor}; margin-right:8px;"></div>
                <span>Signal: <strong>${signalText}</strong></span>
            </div>
            <div style="margin-bottom:5px;">Accuracy: &plusmn;${Math.round(accuracy)}m</div>
            <div style="font-size:0.9em; color:#666;">Updated: ${secondsAgo}s ago</div>
        `;
    }

    // Update or Create Marker
    if (marker) {
        marker.setLatLng([latitude, longitude]);
    } else {
        const customIcon = L.divIcon({
            className: 'custom-pin',
            html: `<div style="background-color: #007bff; width: 15px; height: 15px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px #007bff;"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        marker = L.marker([latitude, longitude], { icon: customIcon }).addTo(map);

        // Add Accuracy Circle
        circle = L.circle([latitude, longitude], { radius: data.accuracy || 50, color: signalColor, opacity: 0.3, fillOpacity: 0.1 }).addTo(map);

        // Zoom in on first acquire
        map.setView([latitude, longitude], 16);
    }

    // Update Circle with new position and accuracy
    if (circle) {
        circle.setLatLng([latitude, longitude]);
        circle.setRadius(data.accuracy || 50);
        circle.setStyle({ color: signalColor });
    }

    // Add to path history
    path.push([latitude, longitude]);
    polyline.setLatLngs(path);

    // Smart Auto-pan: Keep centered unless user drags away
    // (Simple version: always pan for now to ensure tracking is visible)
    // Smart Auto-pan: Keep centered unless user drags away
    // (Simple version: always pan for now to ensure tracking is visible)
    map.flyTo([latitude, longitude], map.getZoom());
});

socket.on('device_stopped', () => {
    alert("The device has stopped sharing its location.");

    // Optional: Visual indication on map
    const overlay = document.getElementById('searching-overlay');
    if (overlay) {
        overlay.style.display = 'block';
        overlay.innerText = "Tracking Session Ended";
        overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
    }
});
