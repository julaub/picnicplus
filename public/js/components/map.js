export const initializeMap = (containerId) => {
    const map = L.map(containerId, {
        zoomControl: false // We will add it manually for positioning
    }).setView([46.5197, 6.6323], 13); // Default: Lausanne

    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    // Custom "My Location" Control
    const LocateControl = L.Control.extend({
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-locate');
            const button = L.DomUtil.create('a', '', container);
            button.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
                </svg>
            `;
            button.href = '#';
            button.title = 'My Location';
            button.id = 'map-my-location-button';

            L.DomEvent.disableClickPropagation(container);

            return container;
        }
    });
    new LocateControl({ position: 'topright' }).addTo(map);

    const highlightLayer = L.layerGroup().addTo(map);
    const emojiMarkerLayer = L.layerGroup().addTo(map);
    const userMarkerLayer = L.layerGroup().addTo(map);

    return { map, highlightLayer, emojiMarkerLayer, userMarkerLayer };
};

// Per-render bookkeeping so selectClusterPin() can find markers by cluster index.
let _markerIndex = []; // [{ clusterIdx, markerEl, circle }]

export const renderClusters = (clusters, radius, { map, highlightLayer, emojiMarkerLayer }, { onClusterClick } = {}) => {
    highlightLayer.clearLayers();
    emojiMarkerLayer.clearLayers();
    _markerIndex = [];

    clusters.forEach((cluster, clusterIdx) => {
        // Cluster outline circle
        const circle = L.circle(cluster.center, {
            radius,
            color: '#0E7A4D',
            fillColor: 'rgba(14,122,77,0.18)',
            fillOpacity: 0.5,
            weight: 2,
            dashArray: '5, 5'
        }).addTo(highlightLayer);

        cluster.items.forEach(item => {
            const markerDiv = document.createElement('div');
            markerDiv.className = 'custom-cluster-marker';
            markerDiv.dataset.clusterIdx = String(clusterIdx);
            markerDiv.innerHTML = `<span class="amenity-emoji-marker">${item.typeInfo.emoji}</span>`;
            markerDiv.style.borderColor = item.typeInfo.color;

            const icon = L.divIcon({
                html: markerDiv,
                className: '',
                iconSize: [36, 36],
                iconAnchor: [18, 18]
            });

            const marker = L.marker([item.lat, item.lon], { icon }).addTo(emojiMarkerLayer);
            marker.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                onClusterClick?.(clusterIdx, cluster);
            });

            _markerIndex.push({ clusterIdx, markerEl: markerDiv, circle });
        });
    });

    if (clusters.length > 0) {
        const bounds = L.featureGroup(highlightLayer.getLayers()).getBounds();
        map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1 });
    }
};

// Apply visual "selected" state to all markers belonging to a cluster index.
// Pass null to clear selection.
export const selectClusterPin = (clusterIdx) => {
    _markerIndex.forEach(({ clusterIdx: ci, markerEl }) => {
        markerEl.classList.toggle('is-selected', ci === clusterIdx);
    });
};

// Fly the map to a cluster's center and select its pin.
export const focusCluster = (map, clusters, clusterIdx) => {
    const c = clusters[clusterIdx];
    if (!c) return;
    map.flyTo(c.center, Math.max(map.getZoom(), 16), { duration: 0.6 });
    selectClusterPin(clusterIdx);
};
