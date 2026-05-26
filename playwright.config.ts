import { defineConfig, devices } from '@playwright/test';

const PORT = 5180;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/*.smoke.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // Validation runner (tsc/vitest) 가 자식 프로세스를 spawn 하므로 worker
  // 수가 너무 많으면 CPU/disk 가 saturate 되어 flake 가 발생한다.
  //   - 로컬 (8+ vCPU): 4 worker 가 안정성/속도 sweet spot
  //   - CI (ubuntu-latest, 2 vCPU): worker 당 CPU 가 0.5 미만으로 떨어져
  //     tsc/vitest spawn 이 30 초 이상 걸리는 케이스 발생. 2 worker 로
  //     낮추고, expect/test timeout 도 CI 수준에 맞게 늘린다.
  workers: process.env.CI ? 2 : 4,
  // Per-assertion timeout — `toBeVisible({timeout:6000})` 같은 inline
  // 값이 없을 때 default. CI 에서는 validation runner 가 30s+ 도 가능.
  expect: {
    timeout: process.env.CI ? 30_000 : 5_000,
  },
  // Per-test wall clock — validation 까지 포함하는 가장 느린 spec 도
  // 안전하게 끝나야 함.
  timeout: process.env.CI ? 120_000 : 30_000,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    // 각 action (click, fill) 의 timeout. CI 에선 페이지 hydration 이
    // 늦을 수 있어 늘림.
    actionTimeout: process.env.CI ? 30_000 : 5_000,
    navigationTimeout: process.env.CI ? 30_000 : 10_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // VAPOR_VALIDATION_MAX_CONCURRENT: E2E 가 fullyParallel 로 다수의 validation
    // 요청을 동시 발사하므로, production default (3) 보다 충분히 높은 값으로
    // 둬야 429 backpressure 가 flake 를 일으키지 않는다. production 운영
    // boundary 는 환경변수로 별도 관리한다 (docs/operations.md §4.2).
    command: `VAPOR_VALIDATION_MAX_CONCURRENT=50 VITE_AGENT_CLIENT=mock npm run dev -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
