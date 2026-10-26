import { expect, test } from '@playwright/test'

// The whole customer flow against a real API with the demo data (#35):
// search, profile, slot, login, confirmation, account and cancellation.
test('a customer books and cancels an appointment', async ({ page }) => {
  await page.goto('/search?q=Elvin')
  await page.getByRole('link', { name: 'Elvin Məmmədov' }).first().click()
  await expect(
    page.getByRole('heading', { name: 'Elvin Məmmədov' }),
  ).toBeVisible()

  await page.goto('/book/elvin-barber')
  await page.getByRole('button', { name: /Saç kəsimi/ }).click()

  // The second free day, never today: a slot a few minutes away falls inside
  // the provider's cancellation window and the card has no "Ləğv et" then.
  // The next month when this one has fewer than two free days left.
  const freeDays = page.locator('[role=grid] button:enabled')
  await expect(page.locator('[role=grid]')).toBeVisible()
  if ((await freeDays.count()) < 2) {
    await page.getByRole('button', { name: 'Növbəti ay' }).click()
    await freeDays.first().click()
  } else {
    await freeDays.nth(1).click()
  }

  const slot = page.getByRole('button', { name: /^\d{2}:\d{2}$/ }).first()
  const time = (await slot.textContent())!.trim()
  await slot.click()

  await page.getByRole('link', { name: 'Daxil olub təsdiqləyin' }).click()
  await page.getByLabel('E-poçt').fill('musteri@planera.az')
  await page.getByLabel('Şifrə').fill('Planera123')
  await page.getByRole('button', { name: 'Daxil ol' }).click()

  await page.getByRole('button', { name: 'Randevunu təsdiqlə' }).click()
  await expect(page.getByText('Randevunuz qəbul olundu')).toBeVisible()
  await expect(page.getByText(/RV-\d{4}-\d{6}/)).toBeVisible()

  await page.goto('/account')
  const card = page
    .getByRole('listitem')
    .filter({ hasText: 'Saç kəsimi' })
    .filter({ hasText: time })
    .first()
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Ləğv et' }).click()
  await page.getByRole('button', { name: 'Bəli, ləğv et' }).click()
  await expect(card).toBeHidden()

  await page.getByRole('tab', { name: 'Ləğv edilmiş' }).click()
  await expect(page.getByText('Ləğv edilib').first()).toBeVisible()
})
