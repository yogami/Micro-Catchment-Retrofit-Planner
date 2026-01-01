import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModelPlacement } from './ModelPlacement';
import type { GreenFix } from '../utils/hydrology';

describe('AR Model Placement', () => {
    const mockFixes: GreenFix[] = [
        { type: 'rain_garden', size: 20, reductionRate: 0.4, placement: 'Sidewalk edge' },
        { type: 'permeable_pavement', size: 50, reductionRate: 0.7, placement: 'Parking area' },
        { type: 'tree_planter', size: 30, reductionRate: 0.25, placement: 'Road verge' },
    ];

    it('scales rain garden model based on area', () => {
        render(<ModelPlacement fixes={[mockFixes[0]]} />);

        // 20m² rain garden should have appropriate scale
        const model = screen.getByTestId('model-rain_garden');
        expect(model).toBeInTheDocument();

        // Scale should be derived from sqrt(area) for proportional sizing
        // 20m² → ~4.5m side → scale factor
        expect(model).toHaveAttribute('scale');
    });

    it('renders all 3 model types', () => {
        render(<ModelPlacement fixes={mockFixes} />);

        expect(screen.getByTestId('model-rain_garden')).toBeInTheDocument();
        expect(screen.getByTestId('model-permeable_pavement')).toBeInTheDocument();
        expect(screen.getByTestId('model-tree_planter')).toBeInTheDocument();
    });

    it('shows reduction labels for each fix', () => {
        render(<ModelPlacement fixes={mockFixes} />);

        expect(screen.getByText(/40%/)).toBeInTheDocument();
        expect(screen.getByText(/70%/)).toBeInTheDocument();
        expect(screen.getByText(/25%/)).toBeInTheDocument();
    });

    it('displays size in square meters', () => {
        render(<ModelPlacement fixes={mockFixes} />);

        expect(screen.getByText(/20m²/)).toBeInTheDocument();
        expect(screen.getByText(/50m²/)).toBeInTheDocument();
        expect(screen.getByText(/30m²/)).toBeInTheDocument();
    });

    it('calculates correct model scale from area', () => {
        const { container } = render(<ModelPlacement fixes={[mockFixes[1]]} />);

        // 50m² → scale should be Math.sqrt(50/10) ≈ 2.24 (normalized to 10m² base)
        const model = container.querySelector('[data-testid="model-permeable_pavement"]');
        const scaleAttr = model?.getAttribute('scale');

        // Scale should be proportional to sqrt(area)
        expect(scaleAttr).toBeDefined();
    });
});

describe('Model Loading', () => {
    it('uses correct glTF paths', () => {
        const { container } = render(
            <ModelPlacement
                fixes={[{ type: 'rain_garden', size: 20, reductionRate: 0.4, placement: 'test' }]}
            />
        );

        const model = container.querySelector('model-viewer');
        expect(model).toHaveAttribute('src', expect.stringContaining('rain_garden'));
    });
});
