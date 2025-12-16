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

// Listen for updates
socket.on('receive_location', (data) => {
    // Hide searching overlay once we get data
    const overlay = document.getElementById('searching-overlay');
    if (overlay) overlay.style.display = 'none';

    const { latitude, longitude } = data;

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
        circle = L.circle([latitude, longitude], { radius: data.accuracy || 50, color: '#007bff', opacity: 0.3, fillOpacity: 0.1 }).addTo(map);

        // Zoom in on first acquire
        map.setView([latitude, longitude], 16);
    }

    // Update Circle with new position and accuracy
    if (circle) {
        circle.setLatLng([latitude, longitude]);
        circle.setRadius(data.accuracy || 50);
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
