import { $, browser, expect } from '@wdio/globals'

describe('gestione note', () => {
  it('crea, rinomina, modifica e cestina una nota', async () => {
    await browser.tauri.switchWindow('main')

    const firstTitle = `E2E ${Date.now()}`
    const title = `${firstTitle} header`
    const body = 'Contenuto scritto dal test E2E'

    await $('[data-testid="create-note"]').click()

    const listTitle = $('.note-item.active .note-title')
    await listTitle.click()
    const titleInput = $('[data-testid="note-title-input"]')
    await titleInput.setValue(firstTitle)
    await browser.keys('Enter')

    const headerTitle = $('[data-testid="header-title"]')
    await expect(headerTitle).toHaveText(firstTitle)
    await headerTitle.click()
    const headerInput = $('[data-testid="header-title-input"]')
    await headerInput.setValue(title)
    await browser.keys('Enter')
    await expect($(`.note-title[data-note-title="${title}"]`)).toExist()

    const editor = $('.ql-editor')
    await editor.setValue(body)
    await expect(editor).toHaveText(expect.stringContaining(body))

    await $('[data-testid="trash-note"]').click()
    await expect($(`.note-title[data-note-title="${title}"]`)).not.toExist()
  })
})
