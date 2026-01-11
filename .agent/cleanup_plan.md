# Codebase Cleanup and ATDD Alignment Plan

## Objective
Thoroughly analyze the codebase, align with ATDD (Feature files as source of requirements), remove redundancy in tests/scripts/code, and ensure comprehensive test coverage for all code changes.

## 1. Requirement Analysis (ATDD Alignment)
- **Source of Truth**: All `.feature` files in `tests/acceptance/` are the single source of requirements.
- **Audit**:
    - `ar-scanner.feature`: Basic functionality. (Implemented: partial)
    - `auth.feature`: (Implemented: Yes)
    - `export.feature`: PDF/Data export. (Implemented: partial)
    - `grants.feature`: Grant matching. (Implemented: partial)
    - `hydrology.feature`: (Implemented: Yes)
    - `pinn.feature`: PINN predictions. (Implemented: No/Partial)
    - `validation.feature`: HEC-RAS validation. (Implemented: No)
- **Action**: Keep all features that define core requirements. Delete only if truly "legacy" (e.g., if a feature was completely replaced by another).

## 2. Test Redundancy & Consolidation
- **Consolidate Unit Tests**: Move all `*.test.ts*` and `*.spec.ts*` from `src/` to `tests/unit/`.
- **Delete Duplicates**:
    - Delete `src/utils/hydrology.test.ts` (Redundant with `tests/unit/utils/hydrology.test.ts`).
    - Delete `src/services/openMeteoClient.test.ts` (Redundant with `tests/unit/services/openMeteoClient.test.ts`).
- **Standardize Naming**: Rename files in `tests/unit/` to match their source files (e.g., `SomeComponent.test.tsx`).

## 3. Code Cleanup & Duplication Removal
- **Hydrology Logic**: Check for duplication between `src/utils/hydrology.ts` and `src/lib/env-calculator/`.
- **Unused Files**:
    - Identify and remove unused components/hooks.
    - Clean up `scripts/` folder if any are purely legacy.

## 4. Execution Plan
1. **Infrastructure Check**: Run all tests to establish baseline.
2. **Move/Delete Tests**: Relocate and merge tests.
3. **Refactor Code**: Remove duplication.
4. **Scaffolding**: Add missing step definitions for core requirements if necessary to provide "confidence".
5. **Verify**: Run build and full test suite.
