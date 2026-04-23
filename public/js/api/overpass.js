import { amenityDefinitions, amenityGroupDefinitions } from '../utils/amenities.js';
import { conditionDefinitions, calculateDistance } from '../utils/conditions.js';

export const buildOverpassQuery = (effectiveAmenities, bbox) => {
    let query = `[out:json][timeout:90];\n(\n`;
    effectiveAmenities.forEach(key => {
        const def = amenityDefinitions[key];
        if (def && def.queryTags) {
            def.queryTags.forEach(tag => {
                const [k, v] = tag.split('=');
                query += `  node["${k}"="${v}"](${bbox});\n`;
                if (def.canBeArea) {
                    query += `  way["${k}"="${v}"](${bbox});\n  relation["${k}"="${v}"](${bbox});\n`;
                }
            });
        }
    });
    query += `); out center;\n\n`;
    return query;
};

const OVERPASS_MIRRORS = [
    'https://overpass.osm.ch/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass-api.de/api/interpreter',
];

export const fetchAmenities = async (query) => {
    const body = `data=${encodeURIComponent(query)}`;
    let lastError;
    for (const url of OVERPASS_MIRRORS) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body,
            });
            if (response.ok) return await response.json();
            lastError = new Error(`Overpass ${response.status} from ${new URL(url).host}`);
            if (response.status !== 504 && response.status !== 502 && response.status !== 429) break;
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError || new Error('Overpass: all mirrors failed');
};

export const clusterAmenities = (elements, effectiveAmenities, radius) => {
    const allItems = elements.map(el => {
        const lat = el.lat || (el.center && el.center.lat);
        const lon = el.lon || (el.center && el.center.lon);

        let typeInfo = null;
        for (const [key, def] of Object.entries(amenityDefinitions)) {
            if (!effectiveAmenities.includes(key)) continue;
            const matchesQueryTag = def.queryTags.some(qt => {
                const [k, v] = qt.split('=');
                return el.tags && el.tags[k] === v;
            });
            const matchesAttributeTag = def.attributeTags?.some(at => {
                const [k, v] = at.split('=');
                return el.tags && el.tags[k] === v;
            });
            if (matchesQueryTag || matchesAttributeTag) {
                typeInfo = { key, title: def.title, emoji: def.emoji, color: def.color };
                break;
            }
        }
        return { lat, lon, tags: el.tags, id: el.id, type: el.type, typeInfo };
    }).filter(item => item.lat && item.lon && item.typeInfo);

    const clusters = [];
    const usedIndices = new Set();

    allItems.forEach((item, i) => {
        if (usedIndices.has(i)) return;
        usedIndices.add(i);

        const currentCluster = [item];
        let sums = { lat: item.lat, lon: item.lon };

        for (let j = 0; j < allItems.length; j++) {
            if (i === j || usedIndices.has(j)) continue;

            const other = allItems[j];
            // Instead of comparing to the center repeatedly, simple point-to-point within cluster bounding sphere
            // For true clustering, compare to cluster center
            const dist = calculateDistance(item.lat, item.lon, other.lat, other.lon);
            if (dist <= radius) {
                currentCluster.push(other);
                usedIndices.add(j);
                sums.lat += other.lat;
                sums.lon += other.lon;
            }
        }

        const centerLat = sums.lat / currentCluster.length;
        const centerLon = sums.lon / currentCluster.length;

        // Ensure distinct types
        const typesInCluster = new Set(currentCluster.map(c => c.typeInfo.key));

        clusters.push({
            center: [centerLat, centerLon],
            items: currentCluster,
            types: Array.from(typesInCluster)
        });
    });

    return { clusters, allItems };
};

export const filterByConditions = async (clusters, conditions, bboxRadius, logic = 'AND') => {
    if (conditions.length === 0 || clusters.length === 0) return clusters;

    // We do one big query for conditions around all clusters
    let query = `[out:json][timeout:90];\n(\n`;
    conditions.forEach(cond => {
        const def = conditionDefinitions[cond.type];
        if (!def) return;
        const [k, v] = def.queryTag.split('=');

        clusters.forEach(cluster => {
            const lat = cluster.center[0];
            const lon = cluster.center[1];
            query += `  node["${k}"="${v}"](around:${cond.distance},${lat},${lon});\n`;
            query += `  way["${k}"="${v}"](around:${cond.distance},${lat},${lon});\n`;
            query += `  relation["${k}"="${v}"](around:${cond.distance},${lat},${lon});\n`;
        });
    });
    query += `); out center;\n\n`;

    const conditionData = await fetchAmenities(query);
    const condElements = conditionData.elements || [];

    return clusters.filter(cluster => {
        const lat = cluster.center[0];
        const lon = cluster.center[1];

        const matches = cond => {
            const def = conditionDefinitions[cond.type];
            const [k, v] = def.queryTag.split('=');
            return condElements.some(el => {
                if (!(el.tags && el.tags[k] === v)) return false;
                const elLat = el.lat || (el.center && el.center.lat);
                const elLon = el.lon || (el.center && el.center.lon);
                if (!elLat || !elLon) return false;
                return calculateDistance(lat, lon, elLat, elLon) <= cond.distance;
            });
        };
        return logic === 'OR' ? conditions.some(matches) : conditions.every(matches);
    });
};
