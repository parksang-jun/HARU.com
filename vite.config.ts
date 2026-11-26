/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Vite 빌드 + Vitest 단위 테스트 설정
export default defineConfig({
  base: './',
  plugins: [react()],
  // 테스트 베드용 artifact/index.html 은 앱 진입점이 아니므로 의존성 검사에서 뺀다
  optimizeDeps: { entries: ['index.html'] },
  build: {
    target: 'es2020',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
