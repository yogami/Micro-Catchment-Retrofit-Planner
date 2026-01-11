import { render, screen } from '@testing-library/react';
import { CoverageMap } from '../../../../src/components/scanner/coverage/ui/CoverageMap';
import { Voxel } from '../../../../src/lib/spatial-coverage';
import { describe, it, expect } from '@jest/globals';

describe('CoverageMap', () => {
    const defaultProps = {
        voxels: [] as Voxel[],
        cameraPosition: { x: 0, y: 0 },
        isOutOfBounds: false,
        size: 200,
        boundary: null
    };

    it('renders a canvas element', () => {
        render(<CoverageMap {...defaultProps} />);
        const canvas = screen.getByTestId('covered-area-overlay');
        expect(canvas).toBeTruthy();
        expect(canvas.getAttribute('width')).toBe('200');
        expect(canvas.getAttribute('height')).toBe('200');
    });

    it('re-renders when voxels change', () => {
        const { rerender } = render(<CoverageMap {...defaultProps} />);
        const voxel = new Voxel(1, 1, 0.05);

        // This validates it doesn't crash on update
        rerender(<CoverageMap {...defaultProps} voxels={[voxel]} />);
        expect(screen.getByTestId('covered-area-overlay')).toBeTruthy();
    });
});
