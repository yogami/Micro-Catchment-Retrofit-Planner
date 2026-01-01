# Micro-Catchment Retrofit Planner

> **AR web app for city staff to scan streets and visualize green infrastructure fixes with precise rainfall-based sizing.**

🌧️ "IKEA Kitchen Planner for flood fixes — AR street scan → grant-ready concepts"

## Quick Demo

Scan this QR code or visit: `[Railway URL after deploy]`

## Features

- **AR Street Scanning**: Use your phone camera to scan streets and detect impervious surfaces
- **Smart Sizing**: Green infrastructure sized to Berlin rainfall data (Open-Meteo API)
- **Visual Overlays**: See rain gardens, permeable pavement, and tree planters in AR
- **PDF Export**: Generate grant-ready concept reports with impact metrics
- **Share Projects**: Save and share street retrofit concepts with colleagues

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Vite + React 18 + TypeScript |
| Styling | TailwindCSS v4 |
| AR | 8th Wall WebAR |
| Auth/Storage | Supabase |
| Rainfall Data | Open-Meteo API |
| PDF Export | html2canvas + jsPDF |
| Testing | Jest + Cucumber (ATDD) + Playwright |
| Deploy | Railway |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests (ATDD)
npm test

# Run E2E tests on mobile viewport
npm run test:e2e:mobile
```

## Project Structure

```
├── tests/
│   ├── acceptance/     # Gherkin feature files (SINGLE SOURCE OF TRUTH)
│   ├── step-definitions/
│   └── e2e/           # Playwright E2E tests
├── public/test/       # Sample street images
├── src/
│   ├── components/    # React components
│   ├── hooks/         # Custom hooks
│   ├── services/      # API clients
│   └── utils/         # Hydrology calculations
└── ...
```

## Environment Variables

```bash
# .env.local
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_8THWALL_APP_KEY=your_8thwall_key
```

## ATDD Workflow

This project follows **Acceptance Test-Driven Development**:

1. Requirements defined as Gherkin `.feature` files
2. Tests written BEFORE implementation
3. Code only written to make tests pass
4. Green tests = feature complete

```bash
# Run acceptance tests
npm run test:acceptance
```

## License

MIT
