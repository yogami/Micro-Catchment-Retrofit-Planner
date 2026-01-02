/**
 * GeocodingPort - interface for reverse geocoding implementations
 * 
 * This port abstracts the geocoding provider, allowing different adapters:
 * - NominatimGeocodingAdapter (OpenStreetMap, free)
 * - GoogleGeocodingAdapter (Google Maps, commercial)
 * - MockGeocodingAdapter (testing)
 * 
 * @domain geo-regulatory
 * @layer ports
 */

import type { JurisdictionChain } from '../domain/valueObjects/JurisdictionChain';

export interface GeocodingPort {
    /**
     * Convert GPS coordinates to a jurisdiction chain
     * 
     * @param lat - Latitude
     * @param lon - Longitude
     * @returns JurisdictionChain ordered from most specific to broadest
     */
    reverseGeocode(lat: number, lon: number): Promise<JurisdictionChain>;
}
