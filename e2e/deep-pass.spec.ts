import { expect, test } from '@playwright/test'
test('custody and quality gates both precede sample release', async ({ page }) => {
  await page.goto('/samples/SMP-2048/lineage')
  await expect(page.getByText('B-91 has no custody evidence.')).toBeVisible()
  await page.getByLabel('Receiving witness').fill('K. Lin')
  await page.getByRole('button', { name: 'Record transfer to Assay' }).click()
  await page.getByRole('button', { name: 'Record QC pass' }).click()
  await expect(page.getByText('Release gates pass.')).toBeVisible()
})
