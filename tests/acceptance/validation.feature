Feature: HEC-RAS Validation
  As an engineer or grant reviewer
  I want to see validation against industry-standard HEC-RAS
  So that I can trust the app's runoff predictions

  Background:
    Given I have activated the Fairfax demo scenario

  Scenario: Validation chart displays for Fairfax scenario
    When the scanner view loads with 120m² detected area
    Then I see a "HEC-RAS Validation" chart
    And the chart shows the HEC-RAS hydrograph (blue line)
    And the chart shows the app prediction marker (green)
    And I see accuracy percentage displayed

  Scenario: App prediction accuracy is within 5% of HEC-RAS peak
    Given HEC-RAS peak discharge is 76 L/s
    When the app calculates peak runoff for 120m² at 50mm/hr
    Then the app prediction should be between 72 L/s and 80 L/s
    And accuracy should be displayed as "95% accurate" or higher

  Scenario: CSV download available for engineers
    When I see the validation chart
    Then I see a download link for "hec-ras-fairfax.csv"
    And clicking the link downloads a CSV file
    And the CSV contains columns: time_min, discharge_m3s

  Scenario: PDF export includes validation section
    Given I have completed a scan with validation data
    When I export the project as PDF
    Then the PDF contains "Validated vs HEC-RAS (industry standard)"
    And the PDF shows accuracy percentage
