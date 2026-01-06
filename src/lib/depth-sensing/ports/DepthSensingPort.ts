/**
 * DepthSensingPort - Domain Port for Depth Sensing
 * 
 * Hardware-agnostic interface for depth data acquisition.
 * Implementations: LidarDepthAdapter (WebXR), VisualSlamAdapter (SfM)
 * 
 * @domain depth-sensing
 * @layer ports
 */

export interface DepthPoint {
    /** X coordinate in meters */
    x: number;
    /** Y coordinate in meters */
    y: number;
    /** Depth/Z coordinate in meters */
    z: number;
    /** Confidence score 0-1 */
    confidence: number;
}

export interface DepthFrame {
    /** Timestamp in milliseconds */
    timestamp: number;
    /** Array of depth points */
    points: DepthPoint[];
    /** Source of depth data */
    source: 'lidar' | 'visual-slam';
}

export interface DepthCapabilities {
    /** Whether LIDAR hardware is available */
    hasLidar: boolean;
    /** Whether depth-sensing API is supported */
    hasDepthSensing: boolean;
    /** Maximum depth range in meters */
    maxRange: number;
    /** Expected accuracy percentage */
    accuracyPercent: number;
}

/**
 * Port interface for depth sensing adapters
 */
export interface DepthSensingPort {
    /**
     * Check if depth sensing is available
     */
    isAvailable(): Promise<boolean>;

    /**
     * Request access to depth sensing hardware
     */
    requestAccess(): Promise<boolean>;

    /**
     * Get the current depth frame
     */
    getDepthFrame(): DepthFrame | null;

    /**
     * Get device capabilities
     */
    getCapabilities(): DepthCapabilities;

    /**
     * Get human-readable accuracy label for UI
     */
    getAccuracyLabel(): string;

    /**
     * Clean up resources
     */
    dispose(): void;
}
