import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const binaryName = process.platform === 'win32' ? 'rustnotes.exe' : 'rustnotes'
const appBinaryPath = path.join(root, 'src-tauri', 'target', 'debug', binaryName)
const isWindows = process.platform === 'win32'

export const config = {
  runner: 'local',
  specs: ['./e2e/**/*.spec.js'],
  maxInstances: 1,
  services: [
    [
      'tauri',
      {
        appBinaryPath,
        driverProvider: isWindows ? 'official' : 'embedded',
        autoInstallTauriDriver: isWindows,
        autoDownloadEdgeDriver: isWindows,
        clearMocks: false,
        resetMocks: false,
        restoreMocks: false
      }
    ]
  ],
  capabilities: [
    {
      browserName: 'tauri',
      'tauri:options': { application: appBinaryPath }
    }
  ],
  logLevel: 'warn',
  waitforTimeout: 15_000,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 2,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 60_000
  }
}
