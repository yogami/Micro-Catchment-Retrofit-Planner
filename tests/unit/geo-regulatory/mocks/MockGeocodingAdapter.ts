import type { GeocodingPort } from '../../../../src/lib/geo-regulatory/ports/GeocodingPort';
import type { JurisdictionChain } from '../../../../src/lib/geo-regulatory/domain/valueObjects/JurisdictionChain';

export class MockGeocodingAdapter implements GeocodingPort {
    private mockChain: JurisdictionChain | null = null;
    setMockChain(chain: JurisdictionChain): void { this.mockChain = chain; }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async reverseGeocode(_lat: number, _lon: number): Promise<JurisdictionChain> {
        if (!this.mockChain) throw new Error('MockGeocodingAdapter: No mock chain set');
        return this.mockChain;
    }
}
