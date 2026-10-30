import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
  testDir: './testes/ponta-a-ponta',
  use: {baseURL: process.env.FLOW_URL || 'http://127.0.0.1:4173', trace: 'retain-on-failure'},
  projects: [{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'celular',use:{...devices['Pixel 7']}}],
  reporter: [['list'],['html',{open:'never'}]],
});
