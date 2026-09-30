import { expect, test } from '@playwright/test'

const workspace = '/laboratory/sample-workspace'

test('triage URL preserves search, lifecycle, sorting and browser history', async ({ page }) => {
  await page.goto(workspace + '?sample=B-93&q=cold&show=all&state=review-open&sort=id-desc&size=5')
  await expect(page.getByRole('textbox', { name: 'Search samples' })).toHaveValue('cold')
  await expect(page.getByRole('combobox', { name: 'Show', exact: true })).toHaveValue('all')
  await expect(page.getByRole('combobox', { name: 'Work state', exact: true })).toHaveValue('review-open')
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Sort samples' })).toHaveValue('id-desc')
  await page.getByRole('combobox', { name: 'Sort samples' }).selectOption('id-asc')
  await expect(page).not.toHaveURL(/sort=id-desc/)
  await page.goBack()
  await expect(page.getByRole('combobox', { name: 'Sort samples' })).toHaveValue('id-desc')
  await page.goForward()
  await expect(page.getByRole('combobox', { name: 'Sort samples' })).toHaveValue('id-asc')
  await expect(page.getByLabel('Selected sample', { exact: true })).toContainText('B-93')
})

test('detail and decision round trips restore the complete triage context', async ({ page }) => {
  await page.goto(workspace + '?sample=B-93&q=cold&show=all&state=review-open&sort=revision-desc&size=5')
  for (const name of ['Open record details', 'Open decision workflow']) {
    await page.getByRole('link', { name, exact: true }).click()
    await expect(page.getByLabel('Selected record context')).toContainText('B-93')
    await page.reload()
    await page.getByRole('link', { name: 'Back to workspace' }).click()
    await expect(page.getByRole('textbox', { name: 'Search samples' })).toHaveValue('cold')
    await expect(page.getByRole('combobox', { name: 'Show', exact: true })).toHaveValue('all')
    await expect(page.getByRole('combobox', { name: 'Work state', exact: true })).toHaveValue('review-open')
    await expect(page.getByRole('combobox', { name: 'Sort samples' })).toHaveValue('revision-desc')
    await expect(page).toHaveURL(/size=5/)
  }
})

test('bulk selection explains hidden records without silently changing the working record', async ({ page }) => {
  await page.goto(workspace + '?sample=B-91&show=all&size=5')
  await page.getByRole('checkbox', { name: 'Select B-91', exact: true }).check()
  await page.getByRole('textbox', { name: 'Search samples' }).fill('B-94')
  await expect(page.getByRole('group', { name: 'Bulk selection' })).toContainText('1 samples selected · 1 outside this page.')
  await expect(page.getByLabel('Selected sample', { exact: true })).toContainText('Detail actions still apply to B-91')
  await page.getByRole('button', { name: 'Clear selection', exact: true }).click()
  await page.getByRole('button', { name: 'Select this page', exact: true }).click()
  await expect(page.getByRole('group', { name: 'Bulk selection' })).toContainText('1 samples selected · 0 outside this page.')
  await page.getByRole('button', { name: 'Show selected record', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Search samples' })).toHaveValue('B-91')
  await expect(page.getByRole('group', { name: 'Bulk selection' })).toContainText('1 samples selected · 1 outside this page.')
})

test('bounded pages and empty recovery remain usable at tablet width', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  await page.goto(workspace + '?sample=B-93&show=all&size=5&page=99999')
  await expect(page.getByRole('navigation', { name: 'Collection pages' })).toContainText('Page 1 of 1')
  await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled()
  await page.getByRole('textbox', { name: 'Search samples' }).fill('NO-MATCH-RECORD')
  await expect(page.getByRole('navigation', { name: 'Collection pages' })).toContainText('0 matching records · Page 1 of 1')
  await expect(page.getByRole('button', { name: 'Select this page', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Reset view', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Search samples' })).toHaveValue('')
  await expect(page.getByRole('combobox', { name: 'Show', exact: true })).toHaveValue('active')
  await expect(page.getByRole('checkbox', { name: 'Select B-91', exact: true })).toBeVisible()
  await page.screenshot({ path: '../UI_SCREENSHOTS/sixteenth-LabOrbit-triage.png', fullPage: true })
})
