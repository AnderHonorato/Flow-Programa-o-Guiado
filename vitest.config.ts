import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['aplicativos/web/src/**/*.test.{ts,tsx}'],testTimeout:25000,hookTimeout:30000,fileParallelism:false}});
