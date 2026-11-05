import { expect, type Page, test } from '@playwright/test'

const selected = (page: Page) => page.locator('.view:not([hidden]) .rows li.on').first()

async function press(page: Page, ...keys: string[]) {
  for (const key of keys) await page.keyboard.press(key)
}

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (e) => {
    throw e
  })
  await page.goto('/')
  await expect(selected(page)).toHaveText('Orbit')
})

test('the wheel steps through the home menu and Menu goes back', async ({ page }) => {
  await press(page, 'ArrowDown', 'ArrowDown')
  await expect(selected(page)).toHaveText('Settings')
  await press(page, 'ArrowDown')
  await expect(selected(page)).toHaveText('Settings')
  await press(page, 'Enter')
  await expect(page.locator('.title span').last()).toHaveText('Settings')
  await expect(selected(page)).toContainText('Clicker')
  await expect(selected(page).locator('.value')).toHaveText('On')
  await press(page, 'Enter')
  await expect(selected(page).locator('.value')).toHaveText('Off')
  await press(page, 'Escape')
  await expect(page.locator('.title span').last()).toHaveText('Classic')
  await expect(selected(page)).toHaveText('Settings')
})

test('Orbit runs and Menu pauses it', async ({ page }) => {
  await press(page, 'Enter')
  await expect(page.locator('.play canvas')).toBeVisible()
  await press(page, ' ')
  await page.waitForTimeout(300)
  await press(page, 'Escape')
  await expect(selected(page)).toHaveText('Resume')
  await press(page, 'ArrowDown', 'ArrowDown', 'Enter')
  await expect(selected(page)).toHaveText('Orbit')
})

test('a solo quiz plays ten questions to a final score', async ({ page }) => {
  await press(page, 'ArrowDown', 'Enter', 'Enter')
  for (let i = 1; i <= 10; i++) {
    await expect(page.locator('.bar span').first()).toHaveText(`${i}/10`)
    await press(page, 'Enter')
    await expect(page.locator('.rows li.right')).toBeVisible()
    await press(page, 'Enter')
  }
  await expect(page.locator('.final .big')).toBeVisible()
  await expect(page.locator('.final .sub').first()).toHaveText(/^\d+\/10$/)
})

test('two players share a room', async ({ page, browser }) => {
  await press(page, 'ArrowDown', 'Enter', 'ArrowDown', 'Enter')
  const code = (await page.locator('.code').textContent()) ?? ''
  expect(code).toMatch(/^[A-Z]{4}$/)

  const guest = await (await browser.newContext()).newPage()
  await guest.goto(`/?room=${code}`)
  await expect(guest.locator('.code')).toHaveText(code)
  await expect(page.locator('.names')).toContainText('·')

  await press(page, 'Enter')
  await expect(guest.locator('.ask')).toHaveText((await page.locator('.ask').textContent()) ?? '')
  await guest.keyboard.press('Enter')
  await press(page, 'Enter')
  await expect(page.locator('.rows li.right')).toBeVisible()
  await expect(guest.locator('.rows li.right')).toBeVisible()
  await expect(guest.locator('.bar span').first()).toHaveText('2/10', { timeout: 6000 })
})

test('joining an unknown room shakes the code and lets you retry', async ({ page }) => {
  await page.goto('/?room=ZZZZ')
  await expect(page.locator('.letters .slot.on')).toBeVisible()
  await expect(page.locator('.bar')).toHaveText('Join')
})

test('the host keeps the game when its connection drops and returns', async ({ page, browser }) => {
  // Keep hold of every socket the page opens, to cut them like a sleeping phone does.
  await page.addInitScript(() => {
    const Native = WebSocket
    const sockets: WebSocket[] = []
    Object.assign(window, { __sockets: sockets })
    window.WebSocket = class extends Native {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols)
        if (String(url).endsWith('/ws')) sockets.push(this)
      }
    }
  })
  await page.reload()
  await expect(selected(page)).toHaveText('Orbit')
  await press(page, 'ArrowDown', 'Enter', 'ArrowDown', 'Enter')
  const code = (await page.locator('.code').textContent()) ?? ''
  const guest = await (await browser.newContext()).newPage()
  await guest.goto(`/?room=${code}`)
  await expect(page.locator('.names')).toContainText('·')
  await press(page, 'Enter')
  await expect(page.locator('.bar span').first()).toHaveText('1/10')
  await page.evaluate(() => {
    for (const ws of (window as unknown as { __sockets: WebSocket[] }).__sockets) ws.close()
  })
  await page.waitForTimeout(1500)
  await expect(page.locator('.ask')).toBeVisible()
  await expect(page.locator('.lobby')).toHaveCount(0)
  await expect(guest.locator('.ask')).toBeVisible()
  await expect(guest.locator('.lobby')).toHaveCount(0)
})

test('a guest who joins mid-question sees only the time that is left', async ({
  page,
  browser,
}) => {
  await press(page, 'ArrowDown', 'Enter', 'ArrowDown', 'Enter')
  const code = (await page.locator('.code').textContent()) ?? ''
  const early = await (await browser.newContext()).newPage()
  await early.goto(`/?room=${code}`)
  await expect(page.locator('.names')).toContainText('·')
  await press(page, 'Enter')
  await page.waitForTimeout(6000)
  const late = await (await browser.newContext()).newPage()
  await late.goto(`/?room=${code}`)
  await expect(late.locator('.ask')).toBeVisible()
  const share = await late.locator('.fill').evaluate((el) => {
    const m = getComputedStyle(el).transform.match(/matrix\(([^,]+)/)
    return m ? Number(m[1]) : 1
  })
  expect(share).toBeLessThan(0.7)
})

test('the screen fits again after the window gets smaller', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 })
  await page.waitForTimeout(200)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(300)
  const screen = await page.locator('.screen').boundingBox()
  const stage = await page.locator('.stage').boundingBox()
  if (!screen || !stage) throw new Error('no screen')
  expect(screen.x + screen.width).toBeLessThanOrEqual(390)
  expect(stage.x + stage.width).toBeLessThanOrEqual(screen.x + screen.width + 1)
})

test('Back acts as Menu at every level, and leaves from home', async ({ page }) => {
  await press(page, 'ArrowDown', 'ArrowDown', 'Enter')
  await press(page, 'ArrowDown', 'Enter')
  await expect(page.locator('.title span').last()).toHaveText('Name')
  await page.goBack()
  await expect(page.locator('.title span').last()).toHaveText('Settings')
  await page.goBack()
  await expect(page.locator('.title span').last()).toHaveText('Classic')
  expect(page.url()).toContain('localhost')
})
