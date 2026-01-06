import { act, renderHook } from '@testing-library/react';
import { useUnitStore } from '../../../src/store/useUnitStore';

describe('useUnitStore', () => {
    beforeEach(() => {
        // Reset store
        act(() => {
            useUnitStore.setState({ unitSystem: 'metric' });
        });
    });

    it('defaults to metric', () => {
        const { result } = renderHook(() => useUnitStore());
        expect(result.current.unitSystem).toBe('metric');
    });

    it('sets unit system', () => {
        const { result } = renderHook(() => useUnitStore());
        act(() => {
            result.current.setUnitSystem('imperial');
        });
        expect(result.current.unitSystem).toBe('imperial');
    });

    it('toggles unit system', () => {
        const { result } = renderHook(() => useUnitStore());
        act(() => {
            result.current.toggleUnitSystem();
        });
        expect(result.current.unitSystem).toBe('imperial');
        act(() => {
            result.current.toggleUnitSystem();
        });
        expect(result.current.unitSystem).toBe('metric');
    });
});
