export const initializeMap = (containerId) => {
    const map = L.map(containerId, {
        zoomControl: false // We will add it manually for positioning
    }).setView([46.5197, 6.6323], 13); // Default: Lausanne

    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    const highlightLayer = L.layerGroup().addTo(map);
    const emojiMarkerLayer = L.layerGroup().addTo(map);

    return { map, highlightLayer, emojiMarkerLayer };
};

export const renderClusters = (clusters, radius, { map, highlightLayer, emojiMarkerLayer }) => {
    highlightLayer.clearLayers();
    emojiMarkerLayer.clearLayers();

    clusters.forEach((cluster, index) => {
        // Outline Circle
        L.circle(cluster.center, {
            radius: radius,
            color: 'var(--primary)',
            fillColor: 'rgba(0, 210, 255, 0.2)',
            fillOpacity: 0.5,
            weight: 2,
            dashArray: '5, 5'
        }).addTo(highlightLayer);

        // Map amenities
        cluster.items.forEach(item => {
            const markerDiv = document.createElement('div');
            markerDiv.className = 'custom-cluster-marker';
            markerDiv.innerHTML = `<span class="amenity-emoji-marker">${item.typeInfo.emoji}</span>`;
            markerDiv.style.borderColor = item.typeInfo.color;
            markerDiv.style.boxShadow = `0 0 10px ${item.typeInfo.color}66`;

            const icon = L.divIcon({
                html: markerDiv,
                className: '',
                iconSize: [36, 36],
                iconAnchor: [18, 18],
                popupAnchor: [0, -18]
            });

            const popupContent = `
                <div class="popup-inner">
                    <h4>${item.typeInfo.title}</h4>
                    <p style="color:var(--text-muted); font-size:12px; margin-bottom: 8px;">
                        Found near cluster center.
                    </p>
                    <button class="btn-primary" style="padding: 8px 12px; font-size: 13px;"
                        onclick="window.createPicnicPrompt(${item.lat}, ${item.lon})">
                        Create Picnic Here
                    </button>
                </div>
            `;

            L.marker([item.lat, item.lon], { icon })
                .bindPopup(popupContent)
                .addTo(emojiMarkerLayer);
        });
    });

    if (clusters.length > 0) {
        const bounds = L.featureGroup(highlightLayer.getLayers()).getBounds();
        map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1 });
    }
};
