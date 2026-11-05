import { defineConfig, devices } from '@playwright/test'

const port = 5199

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  use: { baseURL: `http://localhost:${port}` },
  webServer: {
    command: `npx vite --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /touch/ },
    { name: 'phone', use: { ...devices['Pixel 7'] }, testMatch: /touch/ },
  ],
})
