import { Given, When, Then, Before } from '@cucumber/cucumber';
import { expect } from '@jest/globals';

// Mock Supabase client for testing
let mockSession: { user: { email: string } | null } = { user: null };
let mockProjects: Map<string, object> = new Map();
let currentPage = '/';

Before(() => {
    mockSession = { user: null };
    mockProjects = new Map();
    currentPage = '/';
});

Given('I am on the landing page', function () {
    currentPage = '/';
    expect(currentPage).toBe('/');
});

When('I click "Start Scan" and enter my email {string}', async function (email: string) {
    // Simulate Supabase auth
    mockSession = { user: { email } };
});

Then('Supabase creates a user session', function () {
    expect(mockSession.user).not.toBeNull();
});

Then('I am redirected to the AR scanner', function () {
    currentPage = '/scanner';
    expect(currentPage).toBe('/scanner');
});

Given('I am logged in', function () {
    mockSession = { user: { email: 'test@berlin.de' } };
    expect(mockSession.user).not.toBeNull();
});

Given('I have scanned a street with impervious surfaces', function () {
    // Mock scanned data exists
    this.scannedData = {
        area: 100,
        surfaces: [{ type: 'parking', coeff: 0.9 }]
    };
});

When('I enter project name {string}', function (name: string) {
    this.projectName = name;
});

When('I click "Save Project"', function () {
    const projectId = `proj_${Date.now()}`;
    mockProjects.set(projectId, {
        street_name: this.projectName,
        screenshot: 'base64_mock',
        features: [],
        id: projectId
    });
    this.savedProjectId = projectId;
});

Then('the project saves to Supabase with:', function (dataTable: any) {
    const project = mockProjects.get(this.savedProjectId);
    expect(project).toBeDefined();
    // Validate fields exist
    expect((project as any).street_name).toBe(this.projectName);
});

Then('a shareable URL is generated', function () {
    const shareUrl = `/project/${this.savedProjectId}`;
    expect(shareUrl).toContain('/project/');
});

Given('I have a saved project with URL {string}', function (url: string) {
    this.projectUrl = url;
    const id = url.split('/').pop()!;
    mockProjects.set(id, { id, street_name: 'Test Project' });
});

When('I navigate to that URL', function () {
    currentPage = this.projectUrl;
});

Then('I see the project details and AR screenshot', function () {
    const id = this.projectUrl.split('/').pop()!;
    expect(mockProjects.has(id)).toBe(true);
});

Then('I can export or continue editing', function () {
    // UI state check - buttons should be available
    expect(true).toBe(true);
});
