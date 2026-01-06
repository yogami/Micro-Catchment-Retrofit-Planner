/**
 * Depth Sensing - Public API
 * 
 * Hardware-agnostic depth sensing microservice.
 * Automatically selects LIDAR or Visual SLAM based on device capabilities.
 * 
 * @domain depth-sensing
 * @layer public
 */

// Ports
export type {
    DepthSensingPort,
    DepthPoint,
    DepthFrame,
    DepthCapabilities
} from './ports/DepthSensingPort';

// Adapters
export { LidarDepthAdapter } from './adapters/LidarDepthAdapter';
export { VisualSlamAdapter } from './adapters/VisualSlamAdapter';

// Services
export {
    DepthSensingService,
    createDepthSensingService,
    type DepthMode
} from './services/DepthSensingService';
