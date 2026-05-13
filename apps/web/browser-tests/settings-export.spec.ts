import { readFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { strFromU8, unzipSync } from 'fflate'
import { expect, test } from '@playwright/test'
import { loginAsVerificationUser } from './helpers/auth'

test.describe('settings export', () => {
  test('downloads a zip archive with the server training payload @smoke', async ({ page }) => {
    await loginAsVerificationUser(page)
    await page.goto('/settings')

    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await expect(page.getByText('Export Data', { exact: true })).toBeVisible()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download Export' }).click()

    const download = await downloadPromise
    const archivePath = join(tmpdir(), `plateiq-settings-export-${Date.now()}.zip`)

    await download.saveAs(archivePath)

    const zipEntries = unzipSync(await readFile(archivePath))
    const manifest = JSON.parse(strFromU8(zipEntries['manifest.json'])) as Record<string, unknown>
    const serverPayload = JSON.parse(strFromU8(zipEntries['server/account-data.json'])) as Record<string, unknown>

    expect(download.suggestedFilename()).toMatch(/^plateiq-export-\d{8}T\d{6}Z\.zip$/)
    expect(Object.keys(zipEntries).sort()).toEqual([
      'manifest.json',
      'server/account-data.json',
    ])
    expect(manifest).toEqual(expect.objectContaining({
      archiveSchemaVersion: 'plateiq-archive-v1',
      serverPayloadSchemaVersion: 'plateiq-training-graph-v1',
    }))
    expect(serverPayload).toEqual(expect.objectContaining({
      schemaVersion: 'plateiq-training-graph-v1',
      ownerUserId: manifest.ownerUserId,
    }))
    expect(Array.isArray(serverPayload.training_programs)).toBe(true)
    expect(Array.isArray(serverPayload.cycles)).toBe(true)
    expect(Array.isArray(serverPayload.workouts)).toBe(true)
    expect(Array.isArray(serverPayload.workout_sets)).toBe(true)
    expect(Array.isArray(serverPayload.exercises)).toBe(true)

    await unlink(archivePath).catch(() => undefined)
  })
})