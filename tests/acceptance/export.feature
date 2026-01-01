Feature: Export and Pitch Deck Generation
  As a city staff member
  I want to export my project as a professional PDF
  So that I can present it for grant applications

  Background:
    Given I have a scanned project with green infrastructure fixes

  Scenario: PDF export with visuals and impact
    When I click "Export PDF"
    Then a PDF is downloaded containing:
      | Section               | Content                              |
      | Header                | Project name and date                |
      | AR Screenshot         | Captured street view with overlays   |
      | Feature Map           | Table of fixes with sizes            |
      | Impact Summary        | "30% flood reduction" metric         |
      | Grant Summary         | Cost estimate and benefits           |
    And file size is under 5MB

  Scenario: Screenshot capture includes overlays
    Given AR overlays are visible on screen
    When PDF generation captures screenshot
    Then screenshot includes all green infrastructure overlays
    And resolution is at least 1920x1080

  Scenario: Grant-ready summary generation
    Given project has the following fixes:
      | Type          | Size  | Cost Est | Reduction |
      | Rain garden   | 20m²  | €8,000   | 40%       |
      | Permeable     | 50m²  | €15,000  | 70%       |
    When summary is generated
    Then total cost estimate is €23,000
    And ROI statement shows "Prevents €X flood damage annually"
    And environmental benefits are listed

  Scenario: Share URL generation
    Given project is saved to Supabase
    When I click "Share"
    Then a unique URL is generated like "/project/{id}"
    And URL can be opened by anyone (public viewing)
    And URL includes read-only project preview

  Scenario: 1-minute demo flow completes successfully
    Given I am on the landing page
    When I complete the full demo flow:
      | Step | Action                          | Max Time |
      | 1    | Enter email and signup          | 10s      |
      | 2    | Load AR scanner                 | 10s      |
      | 3    | Scan test image                 | 15s      |
      | 4    | View overlays and suggestions   | 10s      |
      | 5    | Save project                    | 5s       |
      | 6    | Export PDF                      | 10s      |
    Then total time is under 60 seconds
    And no errors or crashes occur
    And PDF is successfully generated
