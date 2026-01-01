Feature: AR Street Scanner with Surface Detection
  As a city staff member
  I want to scan streets with my phone camera
  So that I can identify impervious surfaces and plan green infrastructure

  Background:
    Given I am logged in and on the AR scanner page

  Scenario: Basic street scan shows impervious areas
    Given the phone camera is viewing a test street image "parking_lot.png"
    When the AR session initializes
    Then 8th Wall detects hard surfaces via plane detection
    And impervious areas are highlighted in red (runoff zones)
    And the detected area size is displayed in square meters

  Scenario: Scan suggests green infrastructure fixes with sizing
    Given I have detected an impervious area of 100 square meters
    And Berlin average rainfall is 50 mm/hr
    When I request green fix suggestions
    Then the system overlays the following fixes:
      | Type            | Size   | Placement      | Reduction |
      | Rain garden     | 20m²   | Sidewalk edge  | 40%       |
      | Permeable pave  | 50m²   | Parking area   | 70%       |
      | Tree planter    | 10m² x3| Road verge     | 25%       |
    And total runoff reduction is greater than 30%

  Scenario: Multiple surface types detected
    Given the camera scans a mixed surface area
    When analysis completes
    Then I see roads highlighted in dark red (coeff 0.9)
    And sidewalks in orange (coeff 0.8) 
    And green areas in green (coeff 0.3)
    And total runoff is calculated as weighted sum

  Scenario: Low light fallback to photo upload
    Given ambient light is below threshold
    When AR initialization fails
    Then I see option to "Upload Street Photo"
    And uploaded photos are processed for surface detection

  Scenario: Test images work correctly
    Given I load test image "sidewalk.png" from /public/test/
    When surface detection runs
    Then at least one impervious plane is detected
    And the image dimensions match expected 1920x1080
