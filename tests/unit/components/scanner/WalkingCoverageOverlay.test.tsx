import { render, screen } from '@testing-library/react';
import { WalkingCoverageOverlay } from '../../../../src/components/scanner/coverage/WalkingCoverageOverlay';
import { GeoPolygon } from '../../../../src/lib/spatial-coverage/domain/valueObjects/GeoPolygon';

// Mock canvas context
const mockContext = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    closePath: jest.fn(),
    setLineDash: jest.fn()
};

jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockContext as any);

describe('WalkingCoverageOverlay', () => {
    const createTestPolygon = () => {
        return GeoPolygon.create([
            { lat: 38.8977, lon: -77.0365 },
            { lat: 38.8987, lon: -77.0365 },
            { lat: 38.8987, lon: -77.0355 },
            { lat: 38.8977, lon: -77.0355 }
        ]);
    };

    const defaultProps = {
        boundary: null,
        currentPosition: null,
        voxels: [],
        isInsideBoundary: true,
        coveragePercent: 0,
        stepCount: 0,
        gpsAccuracy: 0
    };

    describe('Rendering', () => {
        it('should not render when boundary is null', () => {
            const { container } = render(
                <WalkingCoverageOverlay {...defaultProps} boundary={null} />
            );

            expect(container.querySelector('[data-testid="walking-coverage-overlay"]')).toBeNull();
        });

        it('should render overlay when boundary is provided', () => {
            const polygon = createTestPolygon();

            render(
                <WalkingCoverageOverlay
                    {...defaultProps}
                    boundary={polygon}
                />
            );

            expect(screen.getByTestId('walking-coverage-overlay')).toBeInTheDocument();
        });

        it('should render canvas element', () => {
            const polygon = createTestPolygon();

            render(
                <WalkingCoverageOverlay
                    {...defaultProps}
                    boundary={polygon}
                />
            );

            expect(screen.getByTestId('walking-coverage-canvas')).toBeInTheDocument();
        });
    });

    describe('Coverage Display', () => {
        it('should display coverage percentage', () => {
            const polygon = createTestPolygon();

            render(
                <WalkingCoverageOverlay
                    {...defaultProps}
                    boundary={polygon}
                    coveragePercent={45.7}
                />
            );

            expect(screen.getByText('46')).toBeInTheDocument();
            expect(screen.getByText('%')).toBeInTheDocument();
        });

        it('should display step count', () => {
            const polygon = createTestPolygon();

            render(
                <WalkingCoverageOverlay
                    {...defaultProps}
                    boundary={polygon}
                    stepCount={42}
                />
            );

            expect(screen.getByText(/42/)).toBeInTheDocument();
            expect(screen.getByText(/STS/)).toBeInTheDocument();
        });

        it('should display GPS accuracy', () => {
            const polygon = createTestPolygon();

            render(
                <WalkingCoverageOverlay
                    {...defaultProps}
                    boundary={polygon}
                    gpsAccuracy={5.3}
                />
            );

            expect(screen.getByText(/±5.3m/)).toBeInTheDocument();
        });
    });

    describe('Boundary Alert', () => {
        it('should show alert when outside boundary', () => {
            const polygon = createTestPolygon();

            render(
                <WalkingCoverageOverlay
                    {...defaultProps}
                    boundary={polygon}
                    isInsideBoundary={false}
                    currentPosition={{ lat: 40, lon: -75 }}
                />
            );

            expect(screen.getByText(/Out of Bounds Exception/i)).toBeInTheDocument();
        });

        it('should NOT show alert when inside boundary', () => {
            const polygon = createTestPolygon();

            render(
                <WalkingCoverageOverlay
                    {...defaultProps}
                    boundary={polygon}
                    isInsideBoundary={true}
                    currentPosition={{ lat: 38.898, lon: -77.036 }}
                />
            );

            expect(screen.queryByText(/Out of Bounds Exception/i)).not.toBeInTheDocument();
        });

        it('should NOT show alert when no current position', () => {
            const polygon = createTestPolygon();

            render(
                <WalkingCoverageOverlay
                    {...defaultProps}
                    boundary={polygon}
                    isInsideBoundary={false}
                    currentPosition={null}
                />
            );

            expect(screen.queryByText(/Move back inside boundary/i)).not.toBeInTheDocument();
        });
    });

    describe('Canvas Drawing', () => {
        it('should draw voxels on canvas', () => {
            const polygon = createTestPolygon();
            const voxels = [
                { worldX: 0, worldY: 0, visitCount: 1 },
                { worldX: 1, worldY: 1, visitCount: 3 }
            ];

            render(
                <WalkingCoverageOverlay
                    {...defaultProps}
                    boundary={polygon}
                    voxels={voxels}
                />
            );

            // Canvas drawing should have been called
            expect(mockContext.fillRect).toHaveBeenCalled();
        });

        it('should draw boundary polygon on canvas', () => {
            const polygon = createTestPolygon();

            render(
                <WalkingCoverageOverlay
                    {...defaultProps}
                    boundary={polygon}
                />
            );

            expect(mockContext.beginPath).toHaveBeenCalled();
            expect(mockContext.moveTo).toHaveBeenCalled();
            expect(mockContext.lineTo).toHaveBeenCalled();
            expect(mockContext.closePath).toHaveBeenCalled();
            expect(mockContext.stroke).toHaveBeenCalled();
        });

        it('should draw current position marker', () => {
            const polygon = createTestPolygon();

            render(
                <WalkingCoverageOverlay
                    {...defaultProps}
                    boundary={polygon}
                    currentPosition={{ lat: 38.898, lon: -77.036 }}
                />
            );

            // Arc should be drawn for position dot
            expect(mockContext.arc).toHaveBeenCalled();
            expect(mockContext.fill).toHaveBeenCalled();
        });
    });

    describe('Progress Circle', () => {
        it('should render progress circle SVG', () => {
            const polygon = createTestPolygon();

            const { container } = render(
                <WalkingCoverageOverlay
                    {...defaultProps}
                    boundary={polygon}
                    coveragePercent={50}
                />
            );

            expect(container.querySelector('svg')).toBeInTheDocument();
        });
    });
});
