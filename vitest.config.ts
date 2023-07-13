import { fileURLToPath } from 'node:url'
import { mergeConfig } from 'vite'
import { UserConfig, configDefaults, defineConfig } from 'vitest/config'
import { devConfig } from './vite.config'

const testConfig = defineConfig({
  test: {
    environment: 'jsdom',
    exclude: [...configDefaults.exclude, 'e2e/*'],
    root: fileURLToPath(new URL('./', import.meta.url)),
    transformMode: {
      web: [/\.[jt]sx$/]
    }
  }
}) as UserConfig

export default mergeConfig(devConfig, testConfig)
