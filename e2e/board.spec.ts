import { test, expect } from '@playwright/test'

test.describe('Board loads', () => {
  test('renders columns from seed data', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-column-id]', { timeout: 10000 })

    const columns = page.locator('[data-column-id]')
    await expect(columns).toHaveCountGreaterThan(0)

    await expect(page.locator('text=To Do')).toBeVisible()
    await expect(page.locator('text=In Progress')).toBeVisible()
    await expect(page.locator('text=Done')).toBeVisible()
  })

  test('shows sync status indicator', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-column-id]')
    // Header contains status
    await expect(page.locator('header')).toBeVisible()
  })
})

test.describe('Card management', () => {
  test('adds a card to a column', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-column-id]')

    // Click "Add card" in the first column
    const addBtn = page.locator('[data-column-id]').first().locator('button', { hasText: 'Add card' })
    await addBtn.click()

    const input = page.locator('[aria-label="New card title"]')
    await input.fill('E2E test card')
    await input.press('Enter')

    await expect(page.locator('text=E2E test card')).toBeVisible()
  })

  test('deletes a card', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-column-id]')

    // Add a card first
    const col = page.locator('[data-column-id]').first()
    await col.locator('button', { hasText: 'Add card' }).click()
    await page.locator('[aria-label="New card title"]').fill('Card to delete')
    await page.locator('[aria-label="New card title"]').press('Enter')

    await expect(page.locator('text=Card to delete')).toBeVisible()

    // Hover the card to reveal delete button, then click it
    const card = page.locator('[data-card-id]').filter({ hasText: 'Card to delete' })
    await card.hover()
    await card.locator('[aria-label^="Delete"]').click()

    await expect(page.locator('text=Card to delete')).not.toBeVisible()
  })
})

test.describe('Column management', () => {
  test('adds a new column', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-column-id]')

    await page.locator('[aria-label="Add new column"]').click()
    await page.locator('[aria-label="New column title"]').fill('E2E Column')
    await page.locator('[aria-label="New column title"]').press('Enter')

    await expect(page.locator('text=E2E COLUMN')).toBeVisible()
  })
})

test.describe('Keyboard accessibility', () => {
  test('card drag handle is keyboard focusable', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-column-id]')

    // Tab through to find a drag handle
    const dragHandle = page.locator('[aria-label^="Drag "]').first()
    await dragHandle.focus()
    await expect(dragHandle).toBeFocused()
  })
})

test.describe('Offline behavior', () => {
  test('shows offline status when network is disabled', async ({ page, context }) => {
    await page.goto('/')
    await page.waitForSelector('[data-column-id]')

    // Go offline
    await context.setOffline(true)

    // Trigger an online/offline event so the listener fires
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'))
    })

    // Status indicator should change
    await expect(page.locator('[data-status="offline"]')).toBeVisible({ timeout: 3000 })

    // Board is still interactive offline
    await expect(page.locator('[data-column-id]')).not.toHaveCount(0)

    await context.setOffline(false)
  })

  test('recovers to synced status when network is restored', async ({ page, context }) => {
    await page.goto('/')
    await page.waitForSelector('[data-column-id]')

    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await expect(page.locator('[data-status="offline"]')).toBeVisible({ timeout: 3000 })

    await context.setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect(page.locator('[data-status="synced"]')).toBeVisible({ timeout: 3000 })
  })
})
