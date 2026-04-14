import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildOverpassQuery } from './overpass.js';

describe('buildOverpassQuery', () => {
    const bbox = '-37.8,144.9,-37.7,145.0';

    it('should build a query for a single non-area amenity', () => {
        const query = buildOverpassQuery(['drinking_water'], bbox);
        assert.ok(query.includes('node["amenity"="drinking_water"](' + bbox + ');'));
        assert.ok(query.includes('node["drinking_water"="yes"](' + bbox + ');'));
        assert.strictEqual(query.includes('way'), false);
        assert.strictEqual(query.includes('relation'), false);
    });

    it('should build a query for a single area-capable amenity', () => {
        const query = buildOverpassQuery(['bbq'], bbox);
        assert.ok(query.includes('node["amenity"="bbq"](' + bbox + ');'));
        assert.ok(query.includes('way["amenity"="bbq"](' + bbox + ');'));
        assert.ok(query.includes('relation["amenity"="bbq"](' + bbox + ');'));
    });

    it('should build a query for multiple amenities', () => {
        const query = buildOverpassQuery(['bbq', 'drinking_water'], bbox);
        assert.ok(query.includes('node["amenity"="bbq"]'));
        assert.ok(query.includes('node["amenity"="drinking_water"]'));
    });

    it('should return an empty query skeleton when no amenities are provided', () => {
        const query = buildOverpassQuery([], bbox);
        const expected = `[out:json][timeout:90];\n(\n); out center;\n\n`;
        assert.strictEqual(query, expected);
    });

    it('should ignore unknown amenities', () => {
        const query = buildOverpassQuery(['unknown_thing'], bbox);
        const expected = `[out:json][timeout:90];\n(\n); out center;\n\n`;
        assert.strictEqual(query, expected);
    });

    it('should handle amenities with multiple tags correctly', () => {
        // drinking_water has two tags: amenity=drinking_water, drinking_water=yes
        const query = buildOverpassQuery(['drinking_water'], bbox);
        const occurrences = (query.match(/node/g) || []).length;
        assert.strictEqual(occurrences, 2);
    });
});
