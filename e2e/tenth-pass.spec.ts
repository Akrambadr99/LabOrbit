import { expect, test } from '@playwright/test'

test('competing freezer reservation blocks the move until the slot is released', async ({ page }) => {
  await page.goto('/samples/B-91/storage/FRZ-02/move?aliquots=4')
  await page.getByRole('button', { name: 'Reserve FRZ-02 for another sample' }).click()
  await expect(page.getByRole('alert').last()).toContainText('reserved for SMP-OTHER')
  await page.getByRole('button', { name: 'Reserve FRZ-02 for B-91' }).click()
  await expect(page.getByRole('status')).toContainText('conflicts with SMP-OTHER')
  await page.getByRole('button', { name: 'Release freezer reservation' }).click()
  await page.getByRole('button', { name: 'Reserve FRZ-02 for B-91' }).click()
  await page.goto('/samples/SMP-2048/lineage')
  await page.getByLabel('Receiving witness').fill('K. Lin')
  await page.getByRole('button', { name: 'Record transfer to Assay' }).click()
  await page.getByRole('button', { name: 'Record QC pass' }).click()
  await page.goto('/samples/B-91/storage/FRZ-02/move?aliquots=4')
  await page.getByLabel('Decision authority').selectOption('lab manager')
  await page.getByRole('button', { name: 'Authorize custody move' }).click()
  await expect(page.getByText('Move authorized')).toBeVisible()
})
