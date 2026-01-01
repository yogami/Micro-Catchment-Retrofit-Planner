# 🌧️ Micro-Catchment Retrofit Planner

**AR web app for city staff to scan streets and visualize green infrastructure fixes for flood resilience.**

[![Railway](https://railway.app/button.svg)](https://railway.app/new/template)

## 🎯 Quick Start

**Scan this QR code on your phone:**

```
┌─────────────────────────────────┐
│                                 │
│   [QR Code - Add your Railway   │
│    URL here after deployment]   │
│                                 │
│   microcatchment-planner.up.    │
│   railway.app                   │
│                                 │
└─────────────────────────────────┘
```

Or visit: **https://your-app.up.railway.app**

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📱 **AR Street Scanning** | Point camera at streets to detect impervious surfaces |
| 🌧️ **Real Rainfall Data** | Berlin hourly precipitation from Open-Meteo API |
| 🌿 **Smart Sizing** | Auto-calculated rain gardens, permeable pavement, tree planters |
| 📊 **Hydrology Engine** | Peak runoff, reduction percentages, all client-side |
| 📄 **PDF Export** | Grant-ready reports with cost estimates |
| 🔗 **Share URLs** | Shareable project links for collaboration |
| 🔐 **Supabase Auth** | Magic link email login |

---

## 🛠️ Tech Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** TailwindCSS v4
- **AR:** @google/model-viewer (WebXR)
- **Backend:** Supabase (Auth + PostgreSQL)
- **PDF:** html2canvas + jsPDF
- **Testing:** Jest (34 unit tests) + Playwright (E2E)
- **Deploy:** Railway

---

## 📐 Hydrology Formulas

```
Peak Runoff (L/s) = (rainfall_mm_hr × area_m² × coeff) / 3600

Rain Garden Size = runoff × duration × retention_factor

Reduction % = Σ(fix_area × fix_rate) / total_area × 100
```

**Coefficients:**
- Impervious (asphalt): 0.9
- Semi-pervious (gravel): 0.6
- Permeable (grass): 0.3

---

## 💰 Cost Estimates (Berlin Market)

| Fix Type | €/m² | Reduction Rate |
|----------|------|----------------|
| Rain Garden | €800 | 40% |
| Permeable Pavement | €120 | 70% |
| Tree Planter | €500 | 25% |

---

## 🏃 Local Development

```bash
# Install
npm install

# Dev server
npm run dev

# Run tests
npm test

# Build
npm run build
```

---

## 🌍 Environment Variables

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## 📋 Grant Eligibility

Projects qualify for:
- 🇪🇺 EU Horizon Europe (climate adaptation)
- 🚀 EIC Accelerator (green tech innovation)
- 🏦 German KfW (sustainable development)
- 🏛️ Berlin Senate (municipal resilience)

---

## 👨‍👩‍👧‍👦 Team

Built for civil engineers and city planners by [Your Name].

**Domain Expert:** [Brother's Name] - Civil Engineer

---

## 📄 License

MIT

---

*"IKEA Kitchen Planner for flood fixes"* - Berlin Climate Innovation Center 2026
