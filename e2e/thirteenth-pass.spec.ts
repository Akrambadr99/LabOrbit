import { expect, test } from '@playwright/test'

test('zone-qualified manager claims storage review after custody and QC', async ({ page }) => {
  await page.goto('/samples/B-91/storage/FRZ-02/move?aliquots=4')
  await page.getByRole('button', { name: 'Reserve FRZ-02 for B-91' }).click()
  await page.goto('/samples/SMP-2048/lineage')
  await page.getByLabel('Receiving witness').fill('K. Lin')
  await page.getByRole('button', { name: 'Record transfer to Assay' }).click()
  await page.getByRole('button', { name: 'Record QC pass' }).click()
  await page.goto('/samples/B-91/storage/FRZ-02/move?aliquots=4')
  await page.getByRole('button', { name: 'Request storage review' }).click()
  await page.getByLabel('Qualified storage manager').selectOption('manager-aya')
  await page.getByRole('button', { name: 'Claim storage review' }).click()
  await expect(page.getByLabel('Storage review inbox')).toContainText('manager-aya · open')
  await page.reload()
  await page.getByLabel('Decision authority').selectOption('lab manager')
  await page.getByRole('button', { name: 'Authorize custody move' }).click()
  await expect(page.getByText('Move authorized')).toBeVisible()
})
