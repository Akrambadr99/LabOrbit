import { expect, test } from '@playwright/test'

test('detail changes reach the selected workspace record and survive reload', async ({ page }) => {
  await page.goto('/laboratory/sample-workspace?sample=B-91')
  const selected = page.getByLabel('Selected sample', { exact: true })
  const before = await selected.textContent()
  await page.getByRole('link', { name: 'Open record details' }).click()
  await expect(page.getByLabel('Selected record context')).toContainText('B-91')
  await page.getByRole('button', { name: 'Record QC pass' }).click()
  await page.getByRole('link', { name: 'Back to workspace' }).click()
  await expect(selected).not.toHaveText(before ?? '')
  const after = await selected.textContent()
  await page.reload()
  await expect(selected).toHaveText(after ?? '')
  await page.getByRole('link', { name: 'Open record details' }).click()
  await expect(page.getByLabel('Selected record context')).toContainText('B-91')
})

test('secondary record selection and return navigation work at tablet width', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  await page.goto('/laboratory/sample-workspace?sample=B-92')
  await page.getByRole('link', { name: 'Open record details' }).click()
  await expect(page.getByLabel('Selected record context')).toContainText('B-92')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect.poll(() => page.evaluate<number>('window.scrollY')).toBe(0)
  await page.screenshot({ path: '../UI_SCREENSHOTS/fifteenth-LabOrbit-detail.png', fullPage: true })
  await page.reload()
  await expect(page.getByLabel('Selected record context')).toContainText('B-92')
  await page.getByRole('link', { name: 'Back to workspace' }).click()
  await expect(page.getByLabel('Selected sample', { exact: true })).toContainText('B-92')
})

test('unknown record recovery never opens the default record', async ({ page }) => {
  await page.goto('/samples/SMP-2048/lineage?record=MISSING')
  await expect(page.getByRole('alert')).toContainText('not found')
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0)
  await page.getByRole('link', { name: 'Back to workspace' }).click()
  await expect(page.getByRole('button', { name: 'Refresh workspace' })).toBeVisible()
})
