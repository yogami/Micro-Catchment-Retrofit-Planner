import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UnitSystem } from '../utils/units';

interface UnitState {
    unitSystem: UnitSystem;
    setUnitSystem: (system: UnitSystem) => void;
    toggleUnitSystem: () => void;
}

export const useUnitStore = create<UnitState>()(
    persist(
        (set) => ({
            unitSystem: 'metric',
            setUnitSystem: (system) => set({ unitSystem: system }),
            toggleUnitSystem: () => set((state) => ({
                unitSystem: state.unitSystem === 'metric' ? 'imperial' : 'metric'
            })),
        }),
        {
            name: 'unit-settings',
        }
    )
);
