import type { GeocodingPort } from '../../../../src/lib/geo-regulatory/ports/GeocodingPort';
import type { JurisdictionChain } from '../../../../src/lib/geo-regulatory/domain/valueObjects/JurisdictionChain';

/**
 * Mock adapter for testing - allows setting predefined jurisdiction chains
 */
export class MockGeocodingAdapter implements GeocodingPort {
    private mockChain: JurisdictionChain | null = null;

    setMockChain(chain: JurisdictionChain): void {
        this.mockChain = chain;
    }

    async reverseGeocode(_lat: number, _lon: number): Promise<JurisdictionChain> {
        if (!this.mockChain) {
            throw new Error('MockGeocodingAdapter: No mock chain set');
        }
        return this.mockChain;
    }
}
