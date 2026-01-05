/**
 * Homography & Ground Projection Utilities
 * Implementation of ASCE-validated Smartphone Photogrammetry methods.
 */

export interface CameraPose {
    pitch: number; // radians
    roll: number;  // radians
    height: number; // meters from ground
}

/**
 * Projects a screen reticle point to the ground plane coordinates.
 * Uses a Flat-Earth Homography assumption (valid for small catchment sweeps).
 */
export function projectToGround(
    pose: CameraPose,
    _fovHorizontal: number = 60,
    _aspectRatio: number = 1.77
): { x: number; y: number } {
    // Trigonometric projection from camera to ground
    // Dist = Height * tan(90 - pitch)
    // This is a simplified projection for the center-point reticle.
    // Future SFM updates will expand this to full-frame homography.

    const groundDistance = pose.height * Math.tan(Math.PI / 2 - pose.pitch);

    // x/y relative to the start position of the sweep
    return {
        x: groundDistance * Math.cos(pose.roll),
        y: groundDistance * Math.sin(pose.roll)
    };
}

/**
 * Calculates the real-world area coverage of the 128px reticle at any given distance.
 */
export function getReticleFootprint(distance: number, fov: number, pxSize: number, totalPx: number): number {
    const worldWidth = 2 * distance * Math.tan((fov / 2) * (Math.PI / 180));
    const realPxWidth = (pxSize / totalPx) * worldWidth;
    return realPxWidth * realPxWidth;
}
