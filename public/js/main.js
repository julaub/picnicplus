import { uiSections, amenityDefinitions, amenityGroupDefinitions } from './utils/amenities.js';
import { conditionDefinitions } from './utils/conditions.js';
import { searchLocation } from './api/search.js';
import { buildOverpassQuery, fetchAmenities, clusterAmenities, filterByConditions } from './api/overpass.js';
import { initializeMap, renderClusters } from './components/map.js';
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

    // --- Bootstrapping UI ---
    const updateStatus = (text, type = 'neutral') => {
        elements.statusText.textContent = text;
        elements.statusBox.className = `status-bar ${type}`;
        if (type === 'loading') elements.statusIcon.textContent = '⏳';
        else if (type === 'error') elements.statusIcon.textContent = '⚠️';
        else if (type === 'success') elements.statusIcon.textContent = '✅';
        else elements.statusIcon.textContent = 'ℹ️';
    };

    const buildAmenitiesUI = () => {
        let html = '';
        uiSections.forEach(section => {
            html += `
                <details class="filter-group" open>
                    <summary><h4>${section.title}</h4></summary>
                    <div class="group-content">
            `;
            section.items.forEach(item => {
                if (item.type === 'group') {
                    const group = amenityGroupDefinitions[item.id];
                    if (!group) return;
                    html += `
                        <label class="custom-checkbox modern-toggle" title="${group.subtext || ''}">
                            <input type="checkbox" class="amenity-cb" id="${item.id}-checkbox" checked>
                            <span class="checkmark"></span>
                            <div>
                                <span class="label-text"><strong>${group.title}</strong></span>
                                <span class="amenity-details">${group.subtext || ''}</span>
                            </div>
                        </label>
                    `;
                } else if (item.type === 'single') {
                    const am = amenityDefinitions[item.id];
                    if (!am) return;
                    html += `
                        <label class="custom-checkbox modern-toggle">
                            <input type="checkbox" class="amenity-cb" id="${item.id}-checkbox">
                            <span class="checkmark" style="border-color:${am.color}66"></span>
                            <span class="label-text"><span class="amenity-emoji">${am.emoji}</span> ${am.title}</span>
                        </label>
                    `;
                }
            });
            html += `</div></details>`;
        });
        elements.amenitySection.innerHTML = html;
    };

    const renderAddedConditions = () => {
        elements.addedConditionsList.innerHTML = '';
        addedConditions.forEach((cond, index) => {
            const def = conditionDefinitions[cond.type];
            const div = document.createElement('div');
            div.className = 'added-condition';
            div.innerHTML = `
                <span><strong>${def.title}</strong> < ${cond.distance}m</span>
                <button type="button" aria-label="Remove" data-index="${index}">&times;</button>
            `;
            div.querySelector('button').addEventListener('click', (e) => {
                addedConditions.splice(parseInt(e.target.dataset.index), 1);
                renderAddedConditions();
            });
            elements.addedConditionsList.appendChild(div);
        });
    };

    buildAmenitiesUI();

    // --- Event Listeners ---
    elements.searchButton.addEventListener('click', () => searchLocation(elements.locationInput.value, map, updateStatus));
    elements.locationInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchLocation(elements.locationInput.value, map, updateStatus) });

    elements.myLocationButton.addEventListener('click', () => {
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
    });

    elements.distanceSlider.addEventListener('input', (e) => elements.distanceValue.textContent = e.target.value);

    elements.addConditionBtn.addEventListener('click', () => {
        const type = elements.conditionType.value;
        const distance = parseInt(elements.conditionDistance.value, 10);
        if (type && distance > 0) {
            addedConditions.push({ type, distance });
            renderAddedConditions();
        }
    });

    // Mobile Sidebar Toggle
    const toggleSidebar = () => {
        elements.sidebar.classList.toggle('open');
    };
    elements.mobileToggle.addEventListener('click', toggleSidebar);
    elements.mobileOpen.addEventListener('click', toggleSidebar);
    map.on('click', (e) => {
        elements.sidebar.classList.remove('open'); // Close on map click on mobile
        
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
        document.querySelector('.nav-btn[data-target="view-picnic"]').click();
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

    elements.findButton.addEventListener('click', async () => {
        updateStatus("Clearing map...", "loading");

        // Hide sidebar on mobile after clicking find
        if (window.innerWidth <= 768) {
            elements.sidebar.classList.remove('open');
        }

        const effectiveAmenities = getSelectedAmenities();
        if (effectiveAmenities.length === 0) {
            updateStatus("Please select at least one amenity.", "error");
            return;
        }

        const bounds = map.getBounds();
        const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
        const radius = parseInt(elements.distanceSlider.value, 10);

        try {
            updateStatus(`Querying Overpass API for ${effectiveAmenities.length} amenity types...`, 'loading');
            elements.findButton.disabled = true;

            const query = buildOverpassQuery(effectiveAmenities, bbox);
            console.log("Query:\n", query);
            const data = await fetchAmenities(query);

            if (!data || !data.elements || data.elements.length === 0) {
                updateStatus("No selected amenities found in this area.", "error");
                renderClusters([], radius, mapState);
                elements.findButton.disabled = false;
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
                finalClusters = await filterByConditions(finalClusters, addedConditions, radius);
            }

            renderClusters(finalClusters, radius, mapState);
            currentClusters = finalClusters;

            if (finalClusters.length > 0) {
                updateStatus(`Found ${finalClusters.length} beautiful picnic spot(s)!`, 'success');
            } else {
                updateStatus("No spots matched all your criteria. Try adjusting filters.", "error");
            }

        } catch (error) {
            updateStatus(`Error executing search: ${error.message}`, "error");
            console.error(error);
        } finally {
            elements.findButton.disabled = false;
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
            const picnicBtn = document.querySelector('.nav-btn[data-target="view-picnic"]');
            if (picnicBtn) {
                picnicBtn.style.display = 'flex'; // Ensure it's visible before clicking
                picnicBtn.click();
            }
        }, 100);

    } else {
        updateStatus("Welcome! Select amenities and click 'Find Amenity Clusters'.");
    }
});
