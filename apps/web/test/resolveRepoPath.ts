import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export function resolveRepoPath(...segments: string[]) {
  let current = process.cwd()

  while (true) {
    if (existsSync(resolve(current, 'apps/web/package.json')) && existsSync(resolve(current, 'supabase'))) {
      return resolve(current, ...segments)
    }

    const parent = dirname(current)

    if (parent === current) {
      throw new Error('Unable to resolve the PlateIQ repository root from the current working directory.')
    }

    current = parent
  }
}