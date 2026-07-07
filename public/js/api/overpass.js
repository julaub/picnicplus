import { amenityDefinitions, amenityGroupDefinitions } from '../utils/amenities.js';
import { conditionDefinitions, calculateDistance } from '../utils/conditions.js';

// Max distance (metres) between a nearWaterTags object (e.g. a bare sand or
// shingle bank) and water for it to count as a potential natural beach.
const NEAR_WATER_RADIUS = 30;

export const buildOverpassQuery = (effectiveAmenities, bbox) => {
    const defs = effectiveAmenities.map(key => amenityDefinitions[key]).filter(Boolean);
    // Definitions with nearWaterTags need a set of water geometries to
    // measure proximity against (around.water below).
    const needsWater = defs.some(def => def.nearWaterTags?.length);

    let query = `[out:json][timeout:90];\n`;
    if (needsWater) {
        query += `(\n  way["natural"="water"](${bbox});\n  relation["natural"="water"](${bbox});\n)->.water;\n`;
    }
    query += `(\n`;
    defs.forEach(def => {
        if (def.queryTags) {
            def.queryTags.forEach(tag => {
                const [k, v] = tag.split('=');
                query += `  node["${k}"="${v}"](${bbox});\n`;
                if (def.canBeArea) {
                    query += `  way["${k}"="${v}"](${bbox});\n  relation["${k}"="${v}"](${bbox});\n`;
                }
            });
        }
        def.nearWaterTags?.forEach(tag => {
            const [k, v] = tag.split('=');
            query += `  node["${k}"="${v}"](around.water:${NEAR_WATER_RADIUS})(${bbox});\n`;
            if (def.canBeArea) {
                query += `  way["${k}"="${v}"](around.water:${NEAR_WATER_RADIUS})(${bbox});\n  relation["${k}"="${v}"](around.water:${NEAR_WATER_RADIUS})(${bbox});\n`;
            }
        });
    });
    query += `); out center;\n\n`;
    return query;
};

// overpass.osm.ch is a Swiss-only mirror (fast, but 404s outside CH).
// For queries inside CH we prefer it; elsewhere we fall back to the
// generic mirrors.
const MIRRORS_CH = [
    'https://overpass.osm.ch/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
];
const MIRRORS_GLOBAL = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
];

// Rough Swiss bounding box (with small tolerance so border edges still route
// to the Swiss mirror). Lat: 45.8–47.9, Lon: 5.9–10.5.
const CH_BBOX = { south: 45.7, west: 5.8, north: 47.9, east: 10.6 };
const inCH = (lat, lon) =>
    lat >= CH_BBOX.south && lat <= CH_BBOX.north &&
    lon >= CH_BBOX.west  && lon <= CH_BBOX.east;

// Inspect a query string and decide whether it targets Switzerland.
// Supports both bbox queries `(s,w,n,e)` and proximity queries `(around:r,lat,lon)`.
const queryIsSwiss = (query) => {
    const around = query.match(/around:\d+(?:\.\d+)?,(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (around) return inCH(parseFloat(around[1]), parseFloat(around[2]));
    const bbox = query.match(/\((-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\)/);
    if (bbox) {
        const s = parseFloat(bbox[1]), w = parseFloat(bbox[2]);
        const n = parseFloat(bbox[3]), e = parseFloat(bbox[4]);
        // Require the whole bbox to be inside CH.
        return inCH(s, w) && inCH(n, e);
    }
    return false;
};

const pickMirrors = (query) => queryIsSwiss(query) ? MIRRORS_CH : MIRRORS_GLOBAL;

// Per-mirror retry (1 retry after a short backoff) before advancing the chain.
const MIRROR_RETRIES = 1;
const RETRY_BASE_MS = 500;
// Per-request timeout — stops a slow mirror from blocking the fallback chain.
// Server-side Overpass timeout is 90s, but we cap client-side at 25s.
const REQUEST_TIMEOUT_MS = 25_000;
// LRU cache for identical queries (helps when user pans back to same area).
const CACHE_MAX = 24;
const _cache = new Map(); // insertion-order = recency

const cacheGet = (key) => {
    if (!_cache.has(key)) return undefined;
    const val = _cache.get(key);
    _cache.delete(key);
    _cache.set(key, val); // bump recency
    return val;
};
const cacheSet = (key, val) => {
    if (_cache.has(key)) _cache.delete(key);
    _cache.set(key, val);
    if (_cache.size > CACHE_MAX) _cache.delete(_cache.keys().next().value);
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Combines the per-request timeout with an optional caller-supplied abort
// signal (e.g. the user pressing Stop).
const postWithTimeout = async (url, body, signal) => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);
    const onAbort = () => ac.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
        return await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
            signal: ac.signal,
        });
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
    }
};

const throwIfAborted = (signal) => {
    if (signal?.aborted) throw new DOMException('Search cancelled', 'AbortError');
};

export const fetchAmenities = async (query, { signal } = {}) => {
    const cached = cacheGet(query);
    if (cached) return cached;

    const body = `data=${encodeURIComponent(query)}`;
    let lastError;
    const mirrors = pickMirrors(query);

    for (const url of mirrors) {
        for (let attempt = 0; attempt <= MIRROR_RETRIES; attempt++) {
            throwIfAborted(signal);
            try {
                const response = await postWithTimeout(url, body, signal);
                if (response.ok) {
                    const json = await response.json();
                    cacheSet(query, json);
                    return json;
                }
                lastError = new Error(`Overpass ${response.status} from ${new URL(url).host}`);
                // 504/502/429 are transient → retry then fall through to next mirror.
                // Other statuses (4xx) are fatal for this mirror — don't retry, skip ahead.
                const transient = response.status === 504 || response.status === 502 || response.status === 429;
                if (!transient) break;
            } catch (err) {
                // Caller cancelled: stop the whole chain, don't fall back.
                throwIfAborted(signal);
                // Network / timeout errors are transient — retry once on same mirror.
                lastError = err;
            }
            if (attempt < MIRROR_RETRIES) {
                await sleep(RETRY_BASE_MS * Math.pow(2, attempt) + Math.random() * 200);
            }
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
            // nearWaterTags results were already filtered to water proximity
            // by the Overpass query itself, so a plain tag match suffices here.
            const matchesNearWaterTag = def.nearWaterTags?.some(nw => {
                const [k, v] = nw.split('=');
                return el.tags && el.tags[k] === v;
            });
            if (matchesQueryTag || matchesAttributeTag || matchesNearWaterTag) {
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

export const filterByConditions = async (clusters, conditions, logic = 'AND', { signal } = {}) => {
    const knownConditions = conditions.filter(cond => conditionDefinitions[cond.type]);
    if (knownConditions.length === 0 || clusters.length === 0) return clusters;

    // One bbox query per condition covering all clusters, instead of 3
    // around-statements per cluster×condition — that older form grew to
    // thousands of statements on large result sets and made Overpass time
    // out. The exact per-cluster distance check happens client-side below,
    // so a bbox superset is all we need from the server.
    let s = Infinity, w = Infinity, n = -Infinity, e = -Infinity;
    clusters.forEach(c => {
        s = Math.min(s, c.center[0]); n = Math.max(n, c.center[0]);
        w = Math.min(w, c.center[1]); e = Math.max(e, c.center[1]);
    });
    // Expand by the largest condition distance (metres → degrees).
    const maxDist = Math.max(...knownConditions.map(c => c.distance));
    const dLat = maxDist / 111320;
    const cosLat = Math.max(0.1, Math.cos(((s + n) / 2) * Math.PI / 180));
    const dLon = maxDist / (111320 * cosLat);
    const bbox = `${s - dLat},${w - dLon},${n + dLat},${e + dLon}`;

    let query = `[out:json][timeout:90];\n(\n`;
    knownConditions.forEach(cond => {
        const [k, v] = conditionDefinitions[cond.type].queryTag.split('=');
        query += `  node["${k}"="${v}"](${bbox});\n`;
        query += `  way["${k}"="${v}"](${bbox});\n`;
        query += `  relation["${k}"="${v}"](${bbox});\n`;
    });
    query += `); out center;\n\n`;

    const conditionData = await fetchAmenities(query, { signal });
    const condElements = conditionData.elements || [];

    // Pre-bucket elements per condition once, rather than re-scanning the
    // full element list for every cluster.
    const condBuckets = knownConditions.map(cond => {
        const [k, v] = conditionDefinitions[cond.type].queryTag.split('=');
        const els = condElements
            .filter(el => el.tags && el.tags[k] === v)
            .map(el => ({ lat: el.lat || (el.center && el.center.lat), lon: el.lon || (el.center && el.center.lon) }))
            .filter(el => el.lat && el.lon);
        return { distance: cond.distance, els };
    });

    return clusters.filter(cluster => {
        const [lat, lon] = cluster.center;
        const matches = b => b.els.some(el => calculateDistance(lat, lon, el.lat, el.lon) <= b.distance);
        return logic === 'OR' ? condBuckets.some(matches) : condBuckets.every(matches);
    });
};
