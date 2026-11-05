import { expect, type Page, test } from '@playwright/test'

const selected = (page: Page) => page.locator('.view:not([hidden]) .rows li.on').first()

/** Drags one finger around the wheel through `degrees`, starting at the top. */
async function spin(page: Page, degrees: number) {
  const box = await page.locator('.wheel').boundingBox()
  if (!box) throw new Error('no wheel')
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  const r = box.width * 0.35
  const cdp = await page.context().newCDPSession(page)
  const at = (deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180
    return [{ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }]
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0) })
  const step = Math.sign(degrees) * 3
  for (let d = step; Math.abs(d) <= Math.abs(degrees); d += step) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(d) })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

test('a thumb running around the wheel scrolls, and the center selects', async ({ page }) => {
  await page.goto('/')
  await expect(selected(page)).toHaveText('Orbit')
  await spin(page, 32)
  await expect(selected(page)).toHaveText('Settings')
  await spin(page, -16)
  await expect(selected(page)).toHaveText('Quiz')
  const box = await page.locator('.wheel').boundingBox()
  if (!box) throw new Error('no wheel')
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  await expect(page.locator('.title span').last()).toHaveText('Quiz')
  // Tapping MENU at the top of the ring goes back.
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.12)
  await expect(page.locator('.title span').last()).toHaveText('Classic')
})

test('the phone becomes the device: no page scroll, the wheel fills the lower half', async ({
  page,
}) => {
  await page.goto('/')
  const viewport = page.viewportSize()
  const wheel = await page.locator('.wheel').boundingBox()
  if (!viewport || !wheel) throw new Error('missing layout')
  expect(wheel.width).toBeGreaterThan(viewport.width * 0.8)
  expect(wheel.y).toBeGreaterThan(viewport.height * 0.4)
  expect(await page.evaluate(() => document.scrollingElement?.scrollHeight)).toBeLessThanOrEqual(
    viewport.height,
  )
})
