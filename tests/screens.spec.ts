// `npm run shots` saves every screen to test-results/shots/, on a phone and a desktop, in
// both finishes, so a change can be looked at in one pass.

import { type Page, test } from '@playwright/test'

const SCREENS: [string, string[]][] = [
  ['home', []],
  ['settings', ['ArrowDown', 'ArrowDown', 'Enter']],
  ['orbit', ['Enter', 'wait:900']],
  ['orbit-paused', ['Enter', 'wait:600', 'Escape']],
  ['quiz-modes', ['ArrowDown', 'Enter']],
  ['quiz-question', ['ArrowDown', 'Enter', 'Enter', 'ArrowDown']],
  ['quiz-reveal', ['ArrowDown', 'Enter', 'Enter', 'Enter']],
  ['quiz-lobby', ['ArrowDown', 'Enter', 'ArrowDown', 'Enter', 'wait:600']],
  ['quiz-join', ['ArrowDown', 'Enter', 'ArrowDown', 'ArrowDown', 'Enter', 'ArrowDown']],
]

async function run(page: Page, steps: string[]) {
  for (const step of steps) {
    if (step.startsWith('wait:')) await page.waitForTimeout(Number(step.slice(5)))
    else await page.keyboard.press(step)
    await page.waitForTimeout(280)
  }
  await page.waitForTimeout(400)
}

for (const scheme of ['light', 'dark'] as const) {
  for (const [name, steps] of SCREENS) {
    test(`${name} ${scheme}`, async ({ page }, info) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto('/')
      await page.locator('.rows li.on').first().waitFor()
      await run(page, steps)
      await page.screenshot({
        path: `test-results/shots/${info.project.name}-${scheme}-${name}.png`,
      })
    })
  }
}
