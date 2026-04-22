// Slide-up bottom sheet (mobile) / right panel (desktop) shown when a spot
// pin or results-list card is selected. Single shared instance.
import { amenityDefinitions, amenityGroupDefinitions } from '../utils/amenities.js';
import { calculateDistance, conditionDefinitions } from '../utils/conditions.js';

let _root = null;
let _api = null;
let _onCreateEvent = null;
let _onClose = null;
let _currentCluster = null;

const pickClusterName = (cluster) => {
    for (const it of cluster.items) {
        if (it.tags?.name) return it.tags.name;
    }
    // Fall back to a friendly coord-derived label.
    return `Picnic spot · ${cluster.center[0].toFixed(4)}, ${cluster.center[1].toFixed(4)}`;
};

const buildAmenityChips = (cluster, selectedKeys) => {
    if (!selectedKeys || !selectedKeys.length) return '';
    // selectedKeys may include group ids. Render one chip per top-level selection.
    const chips = selectedKeys.map(key => {
        const group = amenityGroupDefinitions[key];
        const def = amenityDefinitions[key];
        const title = group?.title || def?.title || key;
        const emoji = def?.emoji || '✓';
        // matched if any of the cluster's types satisfy this selection
        const matched = group
            ? group.includes.some(inc => cluster.types.includes(inc))
            : cluster.types.includes(key);
        return `<span class="pp-spot-chip ${matched ? 'on' : 'off'}">
            <span class="pp-spot-chip-icon">${emoji}</span>${title}
        </span>`;
    });
    return `<div class="pp-spot-chips">${chips.join('')}</div>`;
};

const buildProximityRows = (cluster, conditions) => {
    if (!conditions || !conditions.length) return '';
    const rows = conditions.map(cond => {
        const def = conditionDefinitions[cond.type];
        const title = def?.title || cond.type;
        // We don't know the exact distance to the matched element — clusters
        // were filtered to satisfy ≤ cond.distance, so report the bound.
        return `<div class="pp-spot-prox">
            <span class="pp-spot-prox-dot"></span>
            <span>${title}</span>
            <span class="pp-spot-prox-dist">≤ ${cond.distance}m</span>
        </div>`;
    });
    return `<div class="pp-spot-prox-list">${rows.join('')}</div>`;
};

const render = (cluster, ctx = {}) => {
    if (!_root) return;
    const { selectedAmenities = [], conditions = [], mapCenter = null } = ctx;
    const name = pickClusterName(cluster);
    const distFromCenter = mapCenter
        ? `${Math.round(calculateDistance(mapCenter[0], mapCenter[1], cluster.center[0], cluster.center[1]))}m from map center`
        : '';
    const itemCount = cluster.items.length;

    _root.querySelector('.pp-spot-content').innerHTML = `
        <div class="pp-spot-handle" aria-hidden="true"></div>
        <div class="pp-spot-head">
            <div>
                <div class="pp-spot-eyebrow">Spot detail</div>
                <h3 class="pp-spot-title">${name}</h3>
                <div class="pp-spot-meta">${itemCount} amenit${itemCount === 1 ? 'y' : 'ies'} · ${distFromCenter}</div>
            </div>
            <button type="button" class="pp-spot-close" aria-label="Close">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        </div>
        ${buildAmenityChips(cluster, selectedAmenities)}
        ${buildProximityRows(cluster, conditions)}
        <div class="pp-spot-actions">
            <button type="button" class="pp-cta" id="pp-spot-use">
                Use this spot for my event
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-left:6px"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
            <a class="pp-link-btn pp-spot-directions" id="pp-spot-directions"
               href="https://www.openstreetmap.org/directions?to=${cluster.center[0]},${cluster.center[1]}"
               target="_blank" rel="noopener">Get directions ↗</a>
        </div>
    `;

    _root.querySelector('.pp-spot-close').addEventListener('click', hide);
    _root.querySelector('#pp-spot-use').addEventListener('click', () => {
        _onCreateEvent?.(cluster.center[0], cluster.center[1], name);
    });
};

export const showSpot = (cluster, ctx) => {
    _currentCluster = cluster;
    render(cluster, ctx);
    _root.classList.add('open');
};

export const hide = () => {
    if (!_root) return;
    _root.classList.remove('open');
    _currentCluster = null;
    _onClose?.();
};

export const isOpen = () => !!_root?.classList.contains('open');
export const getCurrentCluster = () => _currentCluster;

export const initSpotDetail = ({ onCreateEvent, onClose } = {}) => {
    _onCreateEvent = onCreateEvent;
    _onClose = onClose;
    if (_root) return _api;
    _root = document.createElement('aside');
    _root.className = 'pp-spot-detail';
    _root.setAttribute('role', 'dialog');
    _root.setAttribute('aria-label', 'Spot detail');
    _root.innerHTML = '<div class="pp-spot-content"></div>';
    document.body.appendChild(_root);
    _api = { showSpot, hide, isOpen, getCurrentCluster };
    return _api;
};
