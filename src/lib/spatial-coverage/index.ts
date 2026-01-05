/**
 * spatial-coverage - Reusable DDD microservice for spatial area measurement
 * 
 * This bounded context provides grid-based coverage tracking with optional
 * boundary detection and guided navigation. Use cases include:
 * - AR catchment area measurement
 * - Floor plan scanning
 * - Agricultural field surveying
 * - Construction site measurement
 * 
 * @example
 * ```typescript
 * import { createCoverageService, Boundary } from './lib/spatial-coverage';
 * 
 * const service = createCoverageService();
 * service.createSession(0.05); // 5cm grid
 * 
 * // Paint points as user scans
 * const result = service.paint(1.5, 2.3);
 * if (result?.isNew) console.log('New area covered!');
 * 
 * // Get coverage stats
 * const stats = service.getStats();
 * console.log(`Covered: ${stats?.coveredAreaM2}m²`);
 * ```
 */

// Domain - Value Objects
export { Voxel } from './domain/valueObjects/Voxel';
export { Boundary, type Point } from './domain/valueObjects/Boundary';
export {
    type CoverageStats,
    createCoverageStats
} from './domain/valueObjects/CoverageStats';

// Domain - Entities
export {
    CoverageSession,
    type PaintResult
} from './domain/entities/CoverageSession';

// Domain - Services
export {
    CoverageAnalyzer,
    type GapInfo
} from './domain/services/CoverageAnalyzer';

// Ports
export { type CoverageSessionPort } from './ports/CoverageSessionPort';

// Adapters
export { InMemoryCoverageAdapter } from './adapters/InMemoryCoverageAdapter';

// Config
export {
    DEFAULT_VOXEL_SIZE,
    AUTO_COMPLETE_THRESHOLD,
    MIN_BOUNDARY_POINTS
} from './config/defaults';

// Factory function for easy initialization
import { InMemoryCoverageAdapter } from './adapters/InMemoryCoverageAdapter';
import type { CoverageSessionPort } from './ports/CoverageSessionPort';

/**
 * Create a coverage service with the default in-memory adapter.
 * 
 * @param voxelSize - Size of each grid cell in meters (default: 0.05m = 5cm)
 * @returns A CoverageSessionPort ready for use
 */
export function createCoverageService(voxelSize?: number): CoverageSessionPort {
    const adapter = new InMemoryCoverageAdapter();
    adapter.createSession(voxelSize);
    return adapter;
}
