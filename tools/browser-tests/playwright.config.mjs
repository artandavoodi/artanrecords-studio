import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
  testDir:'.',testMatch:'account.spec.mjs',workers:2,timeout:30000,
  expect:{timeout:10000},
  use:{baseURL:process.env.STUDIO_TEST_URL||'http://127.0.0.1:9038',reducedMotion:'reduce',trace:'retain-on-failure'},
  projects:[
    {name:'chromium-desktop',use:{...devices['Desktop Chrome']}},
    {name:'webkit-desktop',use:{...devices['Desktop Safari']}},
    {name:'chromium-tablet',use:{browserName:'chromium',viewport:{width:820,height:1180}}},
    {name:'webkit-tablet',use:{browserName:'webkit',viewport:{width:820,height:1180}}},
    {name:'chromium-mobile',use:{...devices['Pixel 5']}},
    {name:'webkit-mobile',use:{...devices['iPhone 13']}}
  ]
});
