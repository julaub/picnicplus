// Results list rendered in the sidebar after Find Amenity Clusters succeeds.
import { amenityDefinitions, amenityGroupDefinitions } from '../utils/amenities.js';
import { calculateDistance } from '../utils/conditions.js';
import { t, tp } from '../i18n.js';

const pickName = (cluster) => {
    for (const it of cluster.items) {
        if (it.tags?.name) return it.tags.name;
    }
    return t('spot.fallback_name', {
        lat: cluster.center[0].toFixed(4),
        lon: cluster.center[1].toFixed(4)
    });
};

const matchedCount = (cluster, selectedKeys) => {
    let n = 0;
    for (const key of selectedKeys) {
        const group = amenityGroupDefinitions[key];
        if (group) {
            if (group.includes.some(inc => cluster.types.includes(inc))) n++;
        } else if (cluster.types.includes(key)) n++;
    }
    return n;
};

const iconRow = (cluster, selectedKeys) => {
    const icons = selectedKeys.map(key => {
        const group = amenityGroupDefinitions[key];
        const def = amenityDefinitions[key];
        const matched = group
            ? group.includes.some(inc => cluster.types.includes(inc))
            : cluster.types.includes(key);
        const emoji = group
            ? (amenityDefinitions[group.includes[0]]?.emoji || '✓')
            : (def?.emoji || '✓');
        const title = group
            ? t(`group.${key.replace(/_group$/, '')}_full`)
            : (def ? t(`amenity.${key}`) : key);
        return `<span class="pp-result-ico ${matched ? 'on' : 'off'}" title="${title}">${emoji}</span>`;
    });
    return `<div class="pp-result-icons">${icons.join('')}</div>`;
};

let _container = null;
let _onSelect = null;

export const initResultsList = ({ container, onSelect }) => {
    _container = container;
    _onSelect = onSelect;
};

export const updateResults = (clusters, ctx = {}) => {
    if (!_container) return;
    const { selectedAmenities = [], mapCenter = null } = ctx;
    if (!clusters.length) {
        _container.innerHTML = '';
        _container.classList.remove('has-results');
        return;
    }
    const total = selectedAmenities.length || 1;
    _container.classList.add('has-results');
    _container.innerHTML = `
        <div class="pp-results-head">
            <span>${tp('results.spots_found', clusters.length)}</span>
        </div>
        <div class="pp-results-list">
            ${clusters.map((c, i) => {
                const score = matchedCount(c, selectedAmenities);
                const dist = mapCenter
                    ? t('results.distance_away', { n: Math.round(calculateDistance(mapCenter[0], mapCenter[1], c.center[0], c.center[1])) })
                    : '';
                return `<button type="button" class="pp-result-card" data-idx="${i}">
                    <div class="pp-result-row1">
                        <span class="pp-result-name">${pickName(c)}</span>
                        <span class="pp-result-score">${score}/${total}</span>
                    </div>
                    <div class="pp-result-row2">
                        ${iconRow(c, selectedAmenities)}
                        <span class="pp-result-dist">${dist}</span>
                    </div>
                </button>`;
            }).join('')}
        </div>
    `;
    _container.querySelectorAll('.pp-result-card').forEach(card => {
        card.addEventListener('click', () => {
            const idx = parseInt(card.dataset.idx, 10);
            _onSelect?.(idx, clusters[idx]);
        });
    });
};

export const clearResults = () => {
    if (!_container) return;
    _container.innerHTML = '';
    _container.classList.remove('has-results');
};
