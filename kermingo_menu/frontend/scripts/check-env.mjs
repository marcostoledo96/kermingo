#!/usr/bin/env node

import { fileURLToPath } from 'node:url'
import { assertProductionApiUrl } from './env-guard.mjs'

const isExecutedAsScript = process.argv[1] === fileURLToPath(import.meta.url)

if (isExecutedAsScript) {
  try {
    const forceProduction = process.argv.includes('--production')
    assertProductionApiUrl({
      nodeEnv: forceProduction ? 'production' : process.env.NODE_ENV,
    })
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
