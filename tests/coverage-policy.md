# Code Coverage Policy

## Standards

| Layer | Statements | Branches | Functions | Lines |
|-------|------------|----------|-----------|-------|
| **Domain (`lib/`)** | 100% | 95% | 100% | 100% |
| **Utils/Services** | 95% | 90% | 95% | 95% |
| **Global Minimum** | 95% | 90% | 95% | 95% |

## Exclusions

The following files are excluded from coverage requirements:

- `src/main.tsx` - React entry point (no testable logic)
- `src/App.tsx` - Routing shell (tested via E2E)
- `src/**/*.d.ts` - Type declarations

## Rationale

### Why 100% for Domain Layer?
Domain services contain pure business logic with no external dependencies. They are:
- Easy to test (pure functions, no mocks needed)
- Critical to correctness (core calculations, compliance checks)
- Stable APIs (changes require careful review)

### Why 95% for Services/Utils?
These layers may have:
- External API calls (mocked, but edge cases hard to cover)
- Browser-specific code paths
- Error handling for unlikely scenarios

### Why 90% for Branches?
Branch coverage is harder to achieve due to:
- Null checks and early returns
- Error handling paths
- Platform-specific conditionals

## Review Process

1. **New Code**: Must meet layer-specific thresholds before merge
2. **Existing Code**: Coverage must not decrease
3. **Exclusions**: Require documented justification in PR

## Enforcement

- Jest `coverageThreshold` blocks failing builds
- Per-file thresholds prevent "coverage averaging"
- CI/CD gate on all PRs
