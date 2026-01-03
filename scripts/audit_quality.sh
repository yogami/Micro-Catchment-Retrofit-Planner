#!/bin/bash

# Project Quality Audit Script
# Validates: Type safety, Complexity, Coverage, Linting.

set -e

echo "🔍 Starting Project-Wide Quality Audit..."

echo "--- 📋 Step 1: Type Check ---"
npx tsc --noEmit || (echo "❌ Type check failed" && exit 1)

echo "--- 🧩 Step 2: Complexity & Linting ---"
npm run lint || (echo "❌ Complexity or Linting failed. Check method sizes and cyclomatic complexity (max 3)." && exit 1)

echo "--- 🧪 Step 3: Test Coverage ---"
npm run test -- --coverage --coverageThreshold='{"global":{"statements":80,"branches":80,"functions":80,"lines":80}}' || (echo "❌ Test coverage threshold (80%) not met." && exit 1)

echo "✅ Audit Passed! Codebase meets quality standards."
