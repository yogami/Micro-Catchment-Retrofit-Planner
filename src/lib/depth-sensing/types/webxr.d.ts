/**
 * WebXR Type Declarations
 * 
 * Experimental WebXR depth-sensing types for LIDAR support.
 * These are not yet in standard TypeScript lib but are supported in Safari/WebKit.
 */

// Extend Navigator with xr property
declare global {
    interface Navigator {
        xr?: XRSystem;
    }

    interface XRSystem {
        isSessionSupported(mode: XRSessionMode): Promise<boolean>;
        requestSession(mode: XRSessionMode, options?: XRSessionInit): Promise<XRSession>;
    }

    type XRSessionMode = 'inline' | 'immersive-vr' | 'immersive-ar';

    interface XRSessionInit {
        requiredFeatures?: string[];
        optionalFeatures?: string[];
        depthSensing?: {
            usagePreference: string[];
            dataFormatPreference: string[];
        };
    }

    interface XRSession {
        end(): Promise<void>;
        requestReferenceSpace(type: string): Promise<XRReferenceSpace>;
        requestAnimationFrame(callback: XRFrameRequestCallback): number;
    }

    interface XRReferenceSpace {
        // Reference space for tracking
    }

    type XRFrameRequestCallback = (time: DOMHighResTimeStamp, frame: XRFrame) => void;

    interface XRFrame {
        getViewerPose(referenceSpace: XRReferenceSpace): XRViewerPose | null;
        getDepthInformation?(view: XRView): XRDepthInformation | null;
    }

    interface XRViewerPose {
        views: readonly XRView[];
    }

    interface XRView {
        eye: 'left' | 'right' | 'none';
        projectionMatrix: Float32Array;
        transform: XRRigidTransform;
    }

    interface XRRigidTransform {
        position: DOMPointReadOnly;
        orientation: DOMPointReadOnly;
        matrix: Float32Array;
    }

    interface XRDepthInformation {
        width: number;
        height: number;
        rawValueToMeters: number;
        getDepthInMeters(x: number, y: number): number;
    }
}

export { };
