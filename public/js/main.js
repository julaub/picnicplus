import { uiSections, amenityDefinitions, amenityGroupDefinitions } from './utils/amenities.js';
import { conditionDefinitions } from './utils/conditions.js';
import { searchLocation } from './api/search.js';
import { buildOverpassQuery, fetchAmenities, clusterAmenities, filterByConditions } from './api/overpass.js';
import { initializeMap, renderClusters, selectClusterPin, focusCluster } from './components/map.js';
import { initSpotDetail, showSpot as showSpotDetail, hide as hideSpotDetail, isOpen as isSpotDetailOpen } from './components/spot-detail.js';
import { initResultsList, updateResults, clearResults } from './components/results-list.js';
import { initializeNavigation } from './components/navigation.js';
import { initParticipants } from './components/participants.js';
import { initPotluck } from './components/potluck.js';
import { initPicnicTab } from './components/picnic-tab.js';
import { checkUrlForPicnic, createPicnic, joinPicnic, state } from './state.js';
import { requestDateAndTime } from './components/date-picker.js';

document.addEventListener('DOMContentLoaded', async () => {
    // UI Elements
    const elements = {
        locationInput: document.getElementById('location-input'),
        searchButton: document.getElementById('search-button'),
        myLocationButton: document.getElementById('my-location-button'),
        amenitySection: document.getElementById('amenity-section'),
        conditionType: document.getElementById('condition-type'),
        conditionDistance: document.getElementById('condition-distance'),
        addConditionBtn: document.getElementById('add-condition-button'),
        addedConditionsList: document.getElementById('added-conditions-list'),
        distanceSlider: document.getElementById('distance-slider'),
        distanceValue: document.getElementById('distance-value'),
        requireAllCheckbox: document.getElementById('require-all-groups-checkbox'),
        findButton: document.getElementById('find-button'),
        statusBox: document.getElementById('status'),
        statusIcon: document.querySelector('.status-icon'),
        statusText: document.querySelector('.status-text'),
        mobileToggle: document.getElementById('mobile-toggle'),
        mobileOpen: document.getElementById('mobile-open'),
        sidebar: document.querySelector('.sidebar')
    };

    // State
    const mapState = initializeMap('map');
    const { map } = mapState;
    window.mapObj = map; // For global access if needed

    initializeNavigation();
    initParticipants('participants-container');
    initPotluck('potluck-container');
    initPicnicTab('picnic-dashboard-container');

    let addedConditions = [];
    let currentClusters = [];
    let proxLogicMode = 'AND'; // 'AND' (all must match) | 'OR' (at least one)

    // Helper: current effective amenity selections (keys or group ids).
    const currentSelectedIds = () =>
        Array.from(document.querySelectorAll('.amenity-cb:checked')).map(cb => cb.id.replace('-checkbox', ''));

    // Select a cluster (from pin click OR results-list card click).
    const selectCluster = (idx, cluster, { fly = false } = {}) => {
        selectClusterPin(idx);
        if (fly) focusCluster(map, currentClusters, idx);
        showSpotDetail(cluster, {
            selectedAmenities: currentSelectedIds(),
            conditions: addedConditions,
            mapCenter: [map.getCenter().lat, map.getCenter().lng]
        });
    };

    // Spot-detail sheet init: "Use this spot" creates the event at the cluster's coords.
    initSpotDetail({
        onCreateEvent: (lat, lon) => {
            window.createPicnicPrompt?.(lat, lon);
            hideSpotDetail();
            selectClusterPin(null);
        },
        onClose: () => selectClusterPin(null)
    });

    // Results list init.
    initResultsList({
        container: document.getElementById('results-list'),
        onSelect: (idx, cluster) => selectCluster(idx, cluster, { fly: true })
    });

    // --- Bootstrapping UI ---
    const updateStatus = (text, type = 'neutral') => {
        // Rebuild status box content so we can append action links for empty states.
        elements.statusBox.className = `pp-info pp-info-${type}`;
        const icon = { loading: '⏳', error: '⚠️', success: '✅', empty: '🔍' }[type] || 'ℹ️';
        elements.statusBox.innerHTML = `
            <span class="status-icon">${icon}</span>
            <span class="status-text">${text}</span>
            ${type === 'empty' ? '<button type="button" class="pp-link-btn" id="status-reset-link">Reset filters</button>' : ''}
        `;
        // Re-cache references that may be re-queried elsewhere.
        elements.statusIcon = elements.statusBox.querySelector('.status-icon');
        elements.statusText = elements.statusBox.querySelector('.status-text');
        const resetLink = elements.statusBox.querySelector('#status-reset-link');
        if (resetLink) resetLink.addEventListener('click', resetAllFilters);
    };

    // Reset all amenity selections, proximity filters, and require-all toggle.
    const resetAllFilters = () => {
        document.querySelectorAll('.amenity-cb').forEach(cb => { cb.checked = false; });
        document.querySelectorAll('.pp-amenity-card.on').forEach(c => c.classList.remove('on'));
        addedConditions = [];
        renderAddedConditions();
        if (elements.requireAllCheckbox) {
            elements.requireAllCheckbox.checked = false;
            document.getElementById('require-all-toggle')?.classList.remove('on');
        }
        updateAmenityCount();
        updateStatus("Filters cleared. Pick amenities and tap Find.", "neutral");
    };

    const updateAmenityCount = () => {
        const n = document.querySelectorAll('.amenity-cb:checked').length;
        const el = document.getElementById('amenity-count');
        if (el) el.textContent = `${n} selected`;
    };

    const buildAmenitiesUI = () => {
        const items = [];
        uiSections.forEach(section => {
            section.items.forEach(item => {
                if (item.type === 'group') {
                    const g = amenityGroupDefinitions[item.id];
                    if (!g) return;
                    const firstEmoji = amenityDefinitions[g.includes[0]]?.emoji || '📍';
                    items.push({ id: item.id, title: g.title.replace(/ \(Any\)$/, ''), emoji: firstEmoji, defaultOn: ['fire_place_group','water_source_group'].includes(item.id) });
                } else {
                    const a = amenityDefinitions[item.id];
                    if (!a) return;
                    items.push({ id: item.id, title: a.title, emoji: a.emoji, defaultOn: false });
                }
            });
        });

        elements.amenitySection.innerHTML = items.map(it => `
            <button type="button" class="pp-amenity-card${it.defaultOn ? ' on' : ''}" data-id="${it.id}">
                <input type="checkbox" class="amenity-cb" id="${it.id}-checkbox"${it.defaultOn ? ' checked' : ''} style="display:none;">
                <div class="pp-amenity-icon">${it.emoji}</div>
                <div class="pp-amenity-label">${it.title}</div>
                <div class="pp-amenity-check">
                    <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
            </button>
        `).join('');

        elements.amenitySection.querySelectorAll('.pp-amenity-card').forEach(card => {
            card.addEventListener('click', () => {
                const cb = card.querySelector('.amenity-cb');
                cb.checked = !cb.checked;
                card.classList.toggle('on', cb.checked);
                updateAmenityCount();
            });
        });

        updateAmenityCount();
    };

    const PROX_EMOJI = { bus_stop: '🚌', supermarket: '🛒', convenience: '🏪', parking: '🅿️' };

    const renderAddedConditions = (newlyAddedType = null) => {
        elements.addedConditionsList.innerHTML = '';
        addedConditions.forEach((cond, index) => {
            const def = conditionDefinitions[cond.type];
            const div = document.createElement('div');
            div.className = 'pp-filter';
            if (cond.type === newlyAddedType) div.classList.add('pp-filter--enter');
            div.style.marginBottom = '8px';
            div.innerHTML = `
                <div class="pp-filter-icon">${PROX_EMOJI[cond.type] || '📍'}</div>
                <div class="pp-filter-body">
                    <div class="pp-filter-name">${def.title}</div>
                    <div class="pp-filter-meta">
                        <div class="pp-stepper">
                            <button type="button" data-act="dec">−</button>
                            <span class="val">&lt; ${cond.distance}m</span>
                            <button type="button" data-act="inc">+</button>
                        </div>
                    </div>
                </div>
                <button type="button" class="pp-remove" aria-label="Remove">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                </button>
            `;
            div.querySelector('[data-act="dec"]').addEventListener('click', () => {
                addedConditions[index].distance = Math.max(50, cond.distance - 50);
                renderAddedConditions();
            });
            div.querySelector('[data-act="inc"]').addEventListener('click', () => {
                addedConditions[index].distance = Math.min(2000, cond.distance + 50);
                renderAddedConditions();
            });
            div.querySelector('.pp-remove').addEventListener('click', () => {
                addedConditions.splice(index, 1);
                renderAddedConditions();
            });
            elements.addedConditionsList.appendChild(div);
        });
    };

    buildAmenitiesUI();

    // --- Event Listeners ---
    elements.searchButton.addEventListener('click', () => searchLocation(elements.locationInput.value, map, updateStatus));
    elements.locationInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchLocation(elements.locationInput.value, map, updateStatus) });

    const handleMyLocation = (e) => {
        if (e) e.preventDefault();

        if (!navigator.geolocation) {
            updateStatus('Geolocation is not supported by your browser.', 'error');
            return;
        }

        updateStatus('Finding your location...', 'loading');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                map.setView([lat, lon], 14, {
                    animate: true,
                    duration: 1.5
                });

                // Add pulsating marker
                mapState.userMarkerLayer.clearLayers();
                const userIcon = L.divIcon({
                    className: 'user-location-marker',
                    iconSize: [16, 16]
                });
                L.marker([lat, lon], { icon: userIcon }).addTo(mapState.userMarkerLayer);

                // Fill input with "My Location"
                elements.locationInput.value = "My Location";

                updateStatus('Found your location.', 'success');
            },
            (error) => {
                let errorMessage = 'Unable to retrieve your location.';
                if (error.code === error.PERMISSION_DENIED) {
                    errorMessage = 'Location access denied by user.';
                }
                updateStatus(errorMessage, 'error');
                console.error('Geolocation error:', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    elements.myLocationButton.addEventListener('click', handleMyLocation);

    // Bind the new map button as well
    const mapMyLocationBtn = document.getElementById('map-my-location-button');
    if (mapMyLocationBtn) {
        mapMyLocationBtn.addEventListener('click', handleMyLocation);
    }

    elements.distanceSlider.addEventListener('input', (e) => elements.distanceValue.textContent = e.target.value);

    // Add-filter modal: pick a proximity filter type from a grid of cards.
    const PROX_ALL_TYPES = ['bus_stop', 'supermarket', 'convenience', 'parking'];
    const openAddFilterModal = () => {
        const used = new Set(addedConditions.map(c => c.type));
        const available = PROX_ALL_TYPES.filter(t => !used.has(t));
        if (!available.length) {
            updateStatus('All proximity filters are already added.', 'neutral');
            return;
        }
        const modal = document.createElement('div');
        modal.className = 'pp-modal-scrim';
        modal.innerHTML = `
            <div class="pp-modal-sheet" role="dialog" aria-label="Add proximity filter">
                <div class="pp-modal-handle" aria-hidden="true"></div>
                <div class="pp-modal-title">Add proximity filter</div>
                <div class="pp-modal-grid">
                    ${available.map(t => `
                        <button type="button" class="pp-modal-card" data-type="${t}">
                            <span class="pp-modal-emoji">${PROX_EMOJI[t] || '📍'}</span>
                            <span class="pp-modal-label">${conditionDefinitions[t].title}</span>
                        </button>
                    `).join('')}
                </div>
                <button type="button" class="pp-link-btn pp-modal-cancel">Cancel</button>
            </div>
        `;
        document.body.appendChild(modal);
        // Animate in next tick.
        requestAnimationFrame(() => modal.classList.add('open'));

        const close = () => {
            modal.classList.remove('open');
            setTimeout(() => modal.remove(), 280);
        };
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        modal.querySelector('.pp-modal-cancel').addEventListener('click', close);
        modal.querySelectorAll('.pp-modal-card').forEach(card => {
            card.addEventListener('click', () => {
                const type = card.dataset.type;
                addedConditions.push({ type, distance: 200 });
                renderAddedConditions(type);
                close();
            });
        });
    };
    elements.addConditionBtn.addEventListener('click', openAddFilterModal);

    // Pre-populate 2 useful defaults on first load (unless the user has already
    // configured something in this session).
    if (addedConditions.length === 0) {
        addedConditions.push({ type: 'bus_stop', distance: 200 });
        addedConditions.push({ type: 'parking', distance: 300 });
        renderAddedConditions();
    }

    // Toggle row for require-all
    const toggleRow = document.getElementById('require-all-toggle-row');
    const toggleEl = document.getElementById('require-all-toggle');
    toggleRow?.addEventListener('click', () => {
        const cb = elements.requireAllCheckbox;
        cb.checked = !cb.checked;
        toggleEl.classList.toggle('on', cb.checked);
    });

    // Sidebar visibility helpers — works on both mobile and desktop.
    // Mobile: visible iff .open. Desktop: visible by default, hidden iff .closed.
    const isMobileViewport = () => window.matchMedia('(max-width: 768px)').matches;
    const isSidebarOpen = () => isMobileViewport()
        ? elements.sidebar.classList.contains('open')
        : !elements.sidebar.classList.contains('closed');
    const openSidebar = () => {
        elements.sidebar.classList.remove('closed');
        elements.sidebar.classList.add('open');
    };
    const closeSidebar = () => {
        elements.sidebar.classList.remove('open');
        elements.sidebar.classList.add('closed');
    };
    const toggleSidebar = () => { isSidebarOpen() ? closeSidebar() : openSidebar(); };

    elements.mobileToggle?.addEventListener('click', closeSidebar);
    elements.mobileOpen?.addEventListener('click', toggleSidebar);
    document.getElementById('reset-all-filters')?.addEventListener('click', resetAllFilters);

    // Proximity logic toggle (AND ↔ OR).
    const proxLogicBtn = document.getElementById('prox-logic-toggle');
    proxLogicBtn?.addEventListener('click', () => {
        proxLogicMode = proxLogicMode === 'AND' ? 'OR' : 'AND';
        proxLogicBtn.querySelector('.pp-logic-label').textContent = proxLogicMode;
        proxLogicBtn.setAttribute('aria-pressed', String(proxLogicMode === 'AND'));
        proxLogicBtn.classList.toggle('is-or', proxLogicMode === 'OR');
    });

    // Desktop sidebar collapse handle + reopen FAB, with localStorage persistence.
    const SIDEBAR_COLLAPSED_KEY = 'pp-sidebar-collapsed';
    const applyPersistedSidebarState = () => {
        if (!window.matchMedia('(min-width: 769px)').matches) return;
        try {
            if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1') {
                elements.sidebar.classList.add('closed');
            }
        } catch (_) { /* localStorage may be unavailable */ }
    };
    applyPersistedSidebarState();
    document.getElementById('sidebar-collapse')?.addEventListener('click', () => {
        elements.sidebar.classList.add('closed');
        try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, '1'); } catch (_) {}
    });
    document.getElementById('sidebar-reopen')?.addEventListener('click', () => {
        elements.sidebar.classList.remove('closed');
        try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, '0'); } catch (_) {}
    });

    // Bottom-nav 🔍 Find: switches to Map view, opens the sidebar if closed,
    // or triggers Find Amenity Clusters if already open.
    document.getElementById('nav-btn-find')?.addEventListener('click', (e) => {
        e.preventDefault();
        const mapBtn = document.querySelector('.pp-nav-item[data-target="view-map"]');
        const onMap = document.getElementById('view-map')?.classList.contains('active');
        if (!onMap) mapBtn?.click();
        if (isSidebarOpen()) {
            elements.findButton?.click();
        } else {
            openSidebar();
        }
    });
    map.on('click', (e) => {
        elements.sidebar.classList.remove('open'); // Close on map click on mobile
        // Deselect any selected pin and dismiss the spot detail sheet.
        if (isSpotDetailOpen()) hideSpotDetail();
        selectClusterPin(null);
        
        // Show "Create Picnic" popup if we are not currently viewing a specific picnic
        if (!state.picnicId) {
            const popupContent = `
                <div class="popup-inner">
                    <h4 style="margin: 0 0 5px 0;">Create an Event Here?</h4>
                    <p style="color:var(--text-muted); font-size:12px; margin-bottom: 8px;">
                        Custom Location
                    </p>
                    <button class="btn-primary" style="padding: 8px 12px; font-size: 13px;"
                        onclick="window.createPicnicPrompt(${e.latlng.lat}, ${e.latlng.lng})">
                        Create Event Here
                    </button>
                </div>
            `;
            
            L.popup()
                .setLatLng(e.latlng)
                .setContent(popupContent)
                .openOn(map);
        }
    });

    // Feature selection exposing to global for the popup button
    window.createPicnicPrompt = async (lat, lon) => {
        map.closePopup();
        const picnicName = prompt("What is the event? (e.g. Alex's Birthday)");
        if (!picnicName) return;
        const organizerName = prompt("What is your name?");
        if (!organizerName) return;

        const dateResult = await requestDateAndTime();
        if (!dateResult) return; // User cancelled
        const { dateText, timeText } = dateResult;

        updateStatus(`Creating Event...`, 'loading');
        await createPicnic(picnicName, lat, lon, organizerName, dateText, timeText);
        updateStatus(`Event created! Share the URL with friends.`, 'success');

        // Switch to Picnic tab to show creation success and the dashboard
        document.querySelector('.pp-nav-item[data-target="view-picnic"]').click();
    };

    // --- Orchestration Logic ---
    const getSelectedAmenities = () => {
        const selected = new Set();
        document.querySelectorAll('.amenity-cb:checked').forEach(cb => {
            const id = cb.id.replace('-checkbox', '');
            if (amenityDefinitions[id]) {
                selected.add(id);
            } else if (amenityGroupDefinitions[id]) {
                amenityGroupDefinitions[id].includes.forEach(inc => {
                    if (amenityDefinitions[inc]) selected.add(inc);
                });
            }
        });
        return Array.from(selected);
    };

    // Cache the find-button's resting label so we can swap it during search.
    const findBtnDefaultHTML = elements.findButton.innerHTML;
    const setFindLoading = (loading) => {
        elements.findButton.disabled = loading;
        elements.findButton.classList.toggle('is-loading', loading);
        elements.findButton.innerHTML = loading
            ? '<span class="pp-spinner" aria-hidden="true"></span> Searching…'
            : findBtnDefaultHTML;
    };

    elements.findButton.addEventListener('click', async () => {
        updateStatus("Clearing map...", "loading");
        setFindLoading(true);

        // Hide sidebar on mobile after clicking find
        if (window.innerWidth <= 768) {
            elements.sidebar.classList.remove('open');
        }

        const effectiveAmenities = getSelectedAmenities();
        if (effectiveAmenities.length === 0) {
            updateStatus("Please select at least one amenity.", "error");
            setFindLoading(false);
            return;
        }

        const bounds = map.getBounds();
        const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
        const radius = parseInt(elements.distanceSlider.value, 10);

        try {
            updateStatus(`Querying Overpass API for ${effectiveAmenities.length} amenity types...`, 'loading');

            const query = buildOverpassQuery(effectiveAmenities, bbox);
            console.log("Query:\n", query);
            const data = await fetchAmenities(query);

            if (!data || !data.elements || data.elements.length === 0) {
                updateStatus("No spots found — try relaxing your filters.", "empty");
                renderClusters([], radius, mapState);
                clearResults();
                return;
            }

            updateStatus("Clustering amenities...", "loading");

            const { clusters } = clusterAmenities(data.elements, effectiveAmenities, radius);

            // Require all selected groups
            let finalClusters = clusters;
            if (elements.requireAllCheckbox.checked) {
                // Get the exact IDs configured in UI (groups and singles)
                const requiredGroupsOrSingles = Array.from(document.querySelectorAll('.amenity-cb:checked')).map(cb => cb.id.replace('-checkbox', ''));

                finalClusters = clusters.filter(c => {
                    return requiredGroupsOrSingles.every(reqId => {
                        if (amenityDefinitions[reqId]) {
                            return c.types.includes(reqId);
                        } else if (amenityGroupDefinitions[reqId]) {
                            return amenityGroupDefinitions[reqId].includes.some(inc => c.types.includes(inc));
                        }
                        return false;
                    });
                });
            }

            if (addedConditions.length > 0 && finalClusters.length > 0) {
                updateStatus(`Checking proximity conditions for ${finalClusters.length} clusters...`, 'loading');
                finalClusters = await filterByConditions(finalClusters, addedConditions, radius, proxLogicMode);
            }

            renderClusters(finalClusters, radius, mapState, {
                onClusterClick: (idx, cluster) => selectCluster(idx, cluster, { fly: false })
            });
            currentClusters = finalClusters;

            updateResults(finalClusters, {
                selectedAmenities: currentSelectedIds(),
                mapCenter: [map.getCenter().lat, map.getCenter().lng]
            });

            if (finalClusters.length > 0) {
                updateStatus(`Found ${finalClusters.length} beautiful picnic spot(s)!`, 'success');
            } else {
                updateStatus("No spots matched all your criteria. Try relaxing your filters.", "empty");
            }

        } catch (error) {
            updateStatus(`Error executing search: ${error.message}`, "error");
            console.error(error);
        } finally {
            setFindLoading(false);
        }
    });

    // --- App Init ---
    const isPicnicActive = await checkUrlForPicnic();

    if (isPicnicActive) {
        updateStatus(`Welcome to the event!`, 'success');
        elements.sidebar.classList.remove('open'); // Close sidebar on mobile

        // Show join dialog if not logged in
        if (!state.currentUser) {
            setTimeout(async () => {
                const name = prompt("You've been invited to an event! What's your name?");
                if (name) {
                    await joinPicnic(name);
                }
            }, 500);
        }

        // Move view to picnic location
        if (state.picnicDetails) {
            map.setView([state.picnicDetails.lat, state.picnicDetails.lon], 16);
            L.marker([state.picnicDetails.lat, state.picnicDetails.lon]).addTo(map).bindPopup(`<b>${state.picnicDetails.name}</b>`).openPopup();
        }

        // Switch to the picnic tab when joining via URL
        setTimeout(() => {
            const picnicBtn = document.querySelector('.pp-nav-item[data-target="view-picnic"]');
            if (picnicBtn) {
                picnicBtn.style.display = 'flex'; // Ensure it's visible before clicking
                picnicBtn.click();
            }
        }, 100);

    } else {
        updateStatus("Welcome! Select amenities and click 'Find Amenity Clusters'.");
    }
});
