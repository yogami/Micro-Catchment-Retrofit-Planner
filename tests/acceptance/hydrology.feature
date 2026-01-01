Feature: Hydrology Calculations for Green Infrastructure Sizing
  As a city staff member
  I want accurate sizing for green infrastructure based on local rainfall
  So that I can propose effective flood mitigation solutions

  Background:
    Given the Berlin rainfall API endpoint is "https://api.open-meteo.com/v1/forecast"
    And latitude is 52.52 and longitude is 13.405

  Scenario: Fetch Berlin rainfall data
    When I request hourly precipitation data from Open-Meteo
    Then I receive valid JSON with hourly precipitation array
    And units are in millimeters per hour

  Scenario: Accurate peak runoff calculation for Berlin rain event
    Given rainfall_intensity is 50 mm/hr
    And impervious_area is 100 m²
    And runoff_coefficient is 0.9
    When I compute peak runoff using formula: rainfall * area * coeff / 3600
    Then peak_runoff equals 1.25 L/s (liters per second)

  Scenario: Rain garden volume sizing
    Given peak_runoff is 1.25 L/s
    And storm_duration is 1 hour
    And retention_factor is 0.8
    When I compute rain garden volume
    Then required_volume equals 3600 liters
    And display shows "Handles 80L/min storm"

  Scenario: Permeable pavement sizing
    Given impervious_area to convert is 50 m²
    And design_storm is 50 mm/hr
    And infiltration_rate is 100 mm/hr
    When I compute permeable pavement capacity
    Then capacity handles the design storm with 100% safety margin

  Scenario: Tree planter sizing
    Given available_verge_length is 30 meters
    And minimum_tree_spacing is 10 meters
    When I compute optimal planter count
    Then recommended_count is 3 planters
    And each planter handles 10 m² runoff capture

  Scenario: Total reduction percentage calculation
    Given the following installed fixes:
      | Type            | Size  | Reduction Rate |
      | Rain garden     | 20m²  | 0.8            |
      | Permeable pave  | 50m²  | 0.7            |
      | Tree planter x3 | 30m²  | 0.5            |
    And total impervious area is 100 m²
    When I calculate total reduction
    Then weighted reduction is greater than 30%
    And display shows exact percentage

  Scenario: Offline mode uses cached rainfall
    Given I have cached Berlin rainfall data from last fetch
    When network is unavailable
    Then calculations use cached_precipitation value
    And UI shows "Using cached data (24h old)"
