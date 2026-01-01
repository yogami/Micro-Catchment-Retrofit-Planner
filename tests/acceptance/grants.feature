Feature: Grant Eligibility Matching
  As a city planner
  I want to see which grants my retrofit project qualifies for
  So that I can maximize funding for green infrastructure

  Background:
    Given I have a retrofit project with green fixes

  Scenario: Berlin project qualifies for BENE2
    Given my project is located in Berlin (52.52, 13.405)
    And the total project cost is €15,000
    When I check grant eligibility
    Then I should see "BENE2 Berliner Programm" as eligible
    And the max funding should be "50%"
    And the max amount should be "€7,500"

  Scenario: Berlin project qualifies for KfW 432
    Given my project is located in Berlin
    And the project includes rain gardens over 20m²
    When I check grant eligibility
    Then I should see "KfW 432 Energetische Stadtsanierung" as eligible

  Scenario: Large Berlin project qualifies for EU Horizon
    Given my project is located in Berlin
    And the total project cost exceeds €50,000
    When I check grant eligibility
    Then I should see "EU Horizon Europe" as eligible
    And the funding type should be "Innovation Action"

  Scenario: US project shows FEMA eligibility
    Given my project is located in Fairfax, VA (38.8462, -77.3064)
    And the project addresses flood mitigation
    When I check grant eligibility
    Then I should see "FEMA BRIC" as eligible
    And I should see "FEMA FMA" as eligible
    And I should NOT see any Berlin grants

  Scenario: PDF export includes matched grants
    Given my Berlin project qualifies for BENE2 and KfW
    When I export the project as PDF
    Then the PDF should include a "Matched Funding Programs" section
    And it should list each grant with eligibility percentage
