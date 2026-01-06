import { create, type StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UnitSystem } from '../utils/units';

interface UnitState {
    unitSystem: UnitSystem;
    setUnitSystem: (system: UnitSystem) => void;
    toggleUnitSystem: () => void;
}

const createUnitSlice: StateCreator<
    UnitState,
    [['zustand/persist', unknown]],
    [],
    UnitState
> = (set) => ({
    unitSystem: 'metric',
    setUnitSystem: (system) => set({ unitSystem: system }),
    toggleUnitSystem: () => set((state) => ({
        unitSystem: state.unitSystem === 'metric' ? 'imperial' : 'metric'
    })),
});

export const useUnitStore = create<UnitState>()(
    persist(
        createUnitSlice,
        {
            name: 'unit-settings',
        }
    )
);
