import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateDistance } from './conditions.js';

describe('calculateDistance', () => {
    it('should return 0 for the exact same coordinates', () => {
        const distance = calculateDistance(40.7128, -74.0060, 40.7128, -74.0060);
        assert.strictEqual(distance, 0);
    });

    it('should correctly calculate the distance between Berlin and Paris', () => {
        // Berlin: 52.5200 N, 13.4050 E
        // Paris: 48.8566 N, 2.3522 E
        const distance = calculateDistance(52.5200, 13.4050, 48.8566, 2.3522);
        const expected = 877463;
        assert.ok(Math.abs(distance - expected) < 1000, `Expected ~${expected}, got ${distance}`);
    });

    it('should correctly calculate distance between New York and Los Angeles', () => {
        // NY: 40.7128 N, 74.0060 W
        // LA: 34.0522 N, 118.2437 W
        const distance = calculateDistance(40.7128, -74.0060, 34.0522, -118.2437);
        const expected = 3935746;
        assert.ok(Math.abs(distance - expected) < 1000, `Expected ~${expected}, got ${distance}`);
    });

    it('should correctly calculate distance along the equator', () => {
        // (0, 0) to (0, 90) -> 1/4th of the circumference
        const distance = calculateDistance(0, 0, 0, 90);
        const expected = (Math.PI / 2) * 6371e3;
        assert.ok(Math.abs(distance - expected) < 1, `Expected ~${expected}, got ${distance}`);
    });

    it('should correctly calculate distance between poles', () => {
        // North Pole to South Pole -> 1/2 of the circumference
        const distance = calculateDistance(90, 0, -90, 0);
        const expected = Math.PI * 6371e3;
        assert.ok(Math.abs(distance - expected) < 1, `Expected ~${expected}, got ${distance}`);
    });
});
