import { expect, test } from '@playwright/test'

test('storage claim and freezer outage remain scoped across navigation', async ({ page }) => {
  await page.goto('/laboratory/sample-workspace?sample=B-92')
  await expect(page.getByLabel('Storage queue')).toContainText('B-92')
  await page.getByRole('button', { name: 'Claim selected storage review', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('claimed')
  await page.goto('/operations')
  await page.goto('/laboratory/sample-workspace?sample=B-92')
  await expect(page.getByLabel('Selected sample')).toContainText('manager-aya')
  await page.getByRole('button', { name: 'Toggle linked freezer availability' }).click()
  await expect(page.getByRole('status')).toContainText('related samples updated')
  await expect(page.getByLabel('Selected sample')).toContainText('Reservation none')
  await page.reload()
  await expect(page.getByLabel('Selected sample')).toContainText('Reservation none')
  await page.getByLabel('Sample collection').getByRole('button', { name: /B-93/ }).click()
  await expect(page.getByLabel('Selected sample')).toContainText('Reservation FRZ-09')
})
