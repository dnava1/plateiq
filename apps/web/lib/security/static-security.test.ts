import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = resolve(process.cwd(), '..', '..')
const migrationsDir = resolve(repoRoot, 'supabase/migrations')
const appRoot = resolve(repoRoot, 'apps/web')

function listFiles(root: string, predicate: (path: string) => boolean) {
  const results: string[] = []
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory)) {
      if (entry === 'node_modules' || entry === '.next') {
        continue
      }

      const path = join(directory, entry)
      const stats = statSync(path)

      if (stats.isDirectory()) {
        visit(path)
      } else if (predicate(path)) {
        results.push(path)
      }
    }
  }

  visit(root)
  return results
}

describe('static security guardrails', () => {
  it('keeps create-function SECURITY DEFINER blocks pinned to an explicit search_path', () => {
    const findings: string[] = []

    for (const file of listFiles(migrationsDir, (path) => path.endsWith('.sql'))) {
      const sql = readFileSync(file, 'utf8')
      const functionBlocks = sql.match(/create\s+(?:or\s+replace\s+)?function[\s\S]*?\$\$;/gi) ?? []

      for (const block of functionBlocks) {
        if (/security\s+definer/i.test(block) && !/set\s+search_path\s*=/i.test(block)) {
          findings.push(relative(repoRoot, file))
        }
      }
    }

    expect(findings).toEqual([])
  })

  it('keeps the Supabase secret key out of client and route code outside the admin factory', () => {
    const allowedPaths = new Set([
      'apps/web/lib/supabase/admin.ts',
    ])
    const ignoredPathPrefixes = [
      'apps/web/browser-tests/',
      'apps/web/scripts/',
    ]
    const secretEnvName = ['SUPABASE', 'SECRET', 'KEY'].join('_')
    const findings = listFiles(appRoot, (path) => /\.(ts|tsx|js|mjs)$/.test(path))
      .filter((path) => {
        const relativePath = relative(repoRoot, path).replaceAll('\\', '/')
        return !allowedPaths.has(relativePath)
          && ignoredPathPrefixes.every((prefix) => !relativePath.startsWith(prefix))
      })
      .filter((path) => readFileSync(path, 'utf8').includes(secretEnvName))
      .map((path) => relative(repoRoot, path).replaceAll('\\', '/'))

    expect(findings).toEqual([])
  })
})
