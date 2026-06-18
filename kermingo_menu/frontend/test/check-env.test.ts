import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

import { API_URL_REQUIRED_ERROR, assertProductionApiUrl } from '../scripts/env-guard.mjs'

describe('assertProductionApiUrl', () => {
  it('throws in production when NEXT_PUBLIC_API_URL is missing', () => {
    expect(() =>
      assertProductionApiUrl({
        nodeEnv: 'production',
        apiUrl: undefined,
      }),
    ).toThrow(API_URL_REQUIRED_ERROR)
  })

  it('passes in production when NEXT_PUBLIC_API_URL is present', () => {
    expect(() =>
      assertProductionApiUrl({
        nodeEnv: 'production',
        apiUrl: 'http://localhost:3001',
      }),
    ).not.toThrow()
  })
})

describe('scripts/check-env.mjs', () => {
  const scriptPath = path.join(process.cwd(), 'scripts', 'check-env.mjs')

  it('exits with code 1 when NEXT_PUBLIC_API_URL is missing in production', () => {
    const result = spawnSync(process.execPath, [scriptPath], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_URL: '',
      },
      encoding: 'utf8',
    })

    expect(result.status).toBe(1)
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
    expect(output).toContain(API_URL_REQUIRED_ERROR)
  })

  it('exits with code 0 when NEXT_PUBLIC_API_URL is present in production', () => {
    const result = spawnSync(process.execPath, [scriptPath], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_URL: 'http://localhost:3001',
      },
      encoding: 'utf8',
    })

    expect(result.status).toBe(0)
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
    expect(output).toBe('')
  })
})
