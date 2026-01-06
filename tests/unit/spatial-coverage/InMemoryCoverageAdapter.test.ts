import { InMemoryCoverageAdapter } from '../../../src/lib/spatial-coverage/adapters/InMemoryCoverageAdapter';

describe('InMemoryCoverageAdapter', () => {
    let adapter: InMemoryCoverageAdapter;

    beforeEach(() => {
        adapter = new InMemoryCoverageAdapter();
    });

    it('creates a new session', () => {
        const session = adapter.createSession();
        expect(session).toBeDefined();
    });

    it('paint returns null when no session exists', () => {
        const result = adapter.paint(0, 0);
        expect(result).toBeNull();
    });

    it('paint returns result when session exists', () => {
        adapter.createSession();
        const result = adapter.paint(0.1, 0.1);
        expect(result).not.toBeNull();
        expect(result!.isNew).toBe(true);
    });

    it('getStats returns null when no session exists', () => {
        expect(adapter.getStats()).toBeNull();
    });

    it('getStats returns stats when session exists', () => {
        adapter.createSession();
        adapter.paint(0.1, 0.1);
        const stats = adapter.getStats();
        expect(stats).not.toBeNull();
        expect(stats!.voxelCount).toBe(1);
    });

    it('setBoundary does not throw when session exists', () => {
        adapter.createSession();
        expect(() => adapter.setBoundary([
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
            { x: 0, y: 1 }
        ])).not.toThrow();
    });

    it('reset clears the session voxels', () => {
        adapter.createSession();
        adapter.paint(0.1, 0.1);
        adapter.reset();
        // Reset clears voxels but keeps session active with empty data
        const stats = adapter.getStats();
        expect(stats?.voxelCount).toBe(0);
    });

    it('getVoxels returns empty when no session', () => {
        expect(adapter.getVoxels()).toEqual([]);
    });

    it('getVoxels returns voxels when session has data', () => {
        adapter.createSession();
        adapter.paint(0.1, 0.1);
        expect(adapter.getVoxels().length).toBe(1);
    });
    it('setBoundary does nothing if no session', () => {
        expect(() => adapter.setBoundary([])).not.toThrow();
    });

    it('clearBoundary does nothing if no session', () => {
        expect(() => adapter.clearBoundary()).not.toThrow();
    });

    it('clearBoundary removes boundary', () => {
        adapter.createSession();
        adapter.setBoundary([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]);
        adapter.clearBoundary();
        expect(adapter.getBoundary()).toBeNull();
    });

    it('getBoundary returns null if no session', () => {
        expect(adapter.getBoundary()).toBeNull();
    });

    it('getBoundary returns session boundary', () => {
        adapter.createSession();
        adapter.setBoundary([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]);
        expect(adapter.getBoundary()).not.toBeNull();
    });

    it('reset does nothing if no session', () => {
        expect(() => adapter.reset()).not.toThrow();
    });

    it('isInsideBoundary returns true if no session', () => {
        expect(adapter.isInsideBoundary(10, 10)).toBe(true);
    });

    it('isInsideBoundary delegates to session', () => {
        adapter.createSession();
        // default no boundary -> true
        expect(adapter.isInsideBoundary(10, 10)).toBe(true);
    });

    it('getCurrentSession returns null or session', () => {
        expect(adapter.getCurrentSession()).toBeNull();
        const s = adapter.createSession();
        expect(adapter.getCurrentSession()).toBe(s);
    });
});
