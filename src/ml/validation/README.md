# Validation Data Directory

This directory is used for Model Validation (Week 4).

## Instructions for HEC-RAS Comparison

1. Export HEC-RAS simulation results as CSV.
2. Required columns:
    - `Time` (minutes)
    - `Flow_In` (input hydrograph)
    - `Flow_Out` (output at catchment outlet)
    - `Stage_Max` (max water depth)
3. Place the CSV file in this directory (e.g., `fairfax_hec_ras.csv`).
4. Run the validation script:
    ```bash
    npx tsx src/ml/validation/compareHecRas.ts
    ```

## Validation Plan

We will validate the PINN model by comparing:
- **Peak Discharge (Q_peak)**: Should be within 5% of HEC-RAS.
- **Time to Peak (t_p)**: Should be within 2 minutes.
- **Total Volume**: Should match (mass conservation).
