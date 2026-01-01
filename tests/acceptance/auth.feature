Feature: User Authentication & Project Management
  As a city staff member
  I want to save and share flood resilience projects
  So that I can collaborate with colleagues and apply for grants

  Scenario: Quick signup and project creation
    Given I am on the landing page
    When I click "Start Scan" and enter my email "test@berlin.de"
    Then Supabase creates a user session
    And I am redirected to the AR scanner

  Scenario: Save project with street name
    Given I am logged in
    And I have scanned a street with impervious surfaces
    When I enter project name "Kreuzberg Flood Fix"
    And I click "Save Project"
    Then the project saves to Supabase with:
      | field        | value                           |
      | street_name  | Kreuzberg Flood Fix             |
      | screenshot   | base64 encoded image            |
      | features     | JSON array of green fixes       |
    And a shareable URL is generated

  Scenario: Load existing project
    Given I have a saved project with URL "/project/abc123"
    When I navigate to that URL
    Then I see the project details and AR screenshot
    And I can export or continue editing
