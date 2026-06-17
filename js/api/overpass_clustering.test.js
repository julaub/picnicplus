import { clusterAmenities } from './overpass.js';
import assert from 'node:assert';
import { describe, it } from 'node:test';

describe('clusterAmenities clustering logic', () => {
    it('should cluster items within radius', () => {
        const elements = [
            { id: 1, lat: 0, lon: 0, tags: { amenity: 'drinking_water' } },
            { id: 2, lat: 0.0001, lon: 0.0001, tags: { amenity: 'drinking_water' } }, // Very close
            { id: 3, lat: 1, lon: 1, tags: { amenity: 'drinking_water' } } // Far away
        ];
        const { clusters } = clusterAmenities(elements, ['drinking_water'], 1000); // 1km radius

        assert.strictEqual(clusters.length, 2);
        assert.strictEqual(clusters[0].items.length, 2);
        assert.strictEqual(clusters[1].items.length, 1);
    });

    it('should correctly filter by effectiveAmenities', () => {
        const elements = [
            { id: 1, lat: 0, lon: 0, tags: { amenity: 'drinking_water' } },
            { id: 2, lat: 0, lon: 0, tags: { amenity: 'bbq' } }
        ];
        const { allItems } = clusterAmenities(elements, ['drinking_water'], 1000);

        assert.strictEqual(allItems.length, 1);
        assert.strictEqual(allItems[0].typeInfo.key, 'drinking_water');
    });
});
