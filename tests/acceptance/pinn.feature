Feature: Physics-Informed Neural Network Runoff Simulation
  As a city planner
  I want physics-based runoff predictions
  So that grant reviewers trust my engineering calculations

  Background:
    Given the PINN model is loaded

  Scenario: PINN predicts runoff within 10% of analytical solution
    Given a 100m² impervious catchment
    And rainfall intensity of 50mm/hr
    And Manning's n of 0.015 (asphalt)
    And bed slope of 0.02
    When I run the PINN prediction
    Then the peak runoff should be within 10% of kinematic wave solution
    And the time to peak should be within 20% of analytical

  Scenario: PINN handles slope variations correctly
    Given catchments with slopes [0.01, 0.05, 0.10]
    And constant rainfall of 50mm/hr
    When I run PINN predictions for each slope
    Then steeper slopes should produce faster peak times
    And steeper slopes should produce higher peak discharge

  Scenario: PINN respects mass conservation
    Given total rainfall volume of 5000 liters
    When I run the PINN prediction
    Then total predicted runoff should not exceed rainfall volume
    And mass balance error should be less than 5%

  Scenario: PINN runs on-device in acceptable time
    Given a pre-trained PINN model
    And a standard mobile device
    When I run inference 10 times
    Then average prediction time should be less than 100ms
    And 95th percentile should be less than 200ms

  Scenario: PINN gracefully degrades without WebGL
    Given WebGL is not available
    When I run the PINN prediction
    Then it should fall back to CPU inference
    And still produce valid results within 500ms

  Scenario: PINN output integrates with green fix sizing
    Given PINN predicts peak runoff of 2.5 L/s
    When I calculate rain garden sizing
    Then the size should be based on PINN prediction
    And the size should be larger than rational method estimate
