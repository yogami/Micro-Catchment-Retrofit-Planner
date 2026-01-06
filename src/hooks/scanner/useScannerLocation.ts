import { useEffect } from 'react';
import { openMeteoClient } from '../../services/openMeteoClient';
import type { UpdateFn, Services } from '../useARScanner';

export function useScannerLocation(
    demo: string | undefined,
    update: UpdateFn,
    loc: { lat: number; lon: number } | null,
    discovery: Services['discovery'],
    setUnits: (u: 'metric' | 'imperial') => void
) {
    // Location Effect - Initialization and Geolocation
    useEffect(() => {
        if (demo) return;

        const init = async () => {
            update({ isLoadingRainfall: true });
            const defaultLat = 52.52, defaultLon = 13.405;

            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                        await handleLocUpdate(pos.coords.latitude, pos.coords.longitude, update);
                    },
                    async () => {
                        await handleLocUpdate(defaultLat, defaultLon, update);
                    }
                );
            } else {
                await handleLocUpdate(defaultLat, defaultLon, update);
            }
        };

        init();
    }, [demo, update]);

    // Profile Effect - Regulatory Discovery based on location
    useEffect(() => {
        if (!loc || demo) return;

        update({ discoveryStatus: 'discovering' });
        discovery.execute({ latitude: loc.lat, longitude: loc.lon, domain: 'stormwater' })
            .then((rawRes: any) => {
                const res = rawRes;
                update({
                    activeProfile: res.profile,
                    jurisdictionChain: res.chain,
                    discoveryResult: res,
                    discoveryStatus: 'ready',
                    manualIntensity: res.profile.parameters.designIntensity_mm_hr,
                    manualDepth: res.profile.parameters.designDepth_mm
                });
                if (res.status !== 'default') {
                    setUnits(res.profile.parameters.units);
                }
            })
            .catch(() => update({ discoveryStatus: 'ready' }));
    }, [loc, demo, discovery, update, setUnits]);
}

async function handleLocUpdate(lat: number, lon: number, update: UpdateFn) {
    const storm = await openMeteoClient.getDesignStorm(lat, lon);
    update({
        location: { lat, lon },
        locationName: 'Current Project', // Reset to default on actual location find
        rainfall: storm,
        isLoadingRainfall: false
    });
}
