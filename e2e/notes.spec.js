import { $, browser, expect } from '@wdio/globals'

describe('gestione note', () => {
  it('crea, rinomina, modifica e cestina una nota', async () => {
    await browser.tauri.switchWindow('main')

    const firstTitle = `E2E ${Date.now()}`
    const title = `${firstTitle} header`
    const body = 'Contenuto scritto dal test E2E'

    await $('[data-testid="create-note"]').click()

    // Rinomina dalla lista: menu azioni della nota, prima voce ("Rinomina").
    await $('.note-item.active .kebab').click()
    await $('.p-menu .menu-row').click()
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

  it('mostra un header non sticky e permette di uscire da righe con molti spazi', async () => {
    await browser.tauri.switchWindow('main')
    await $('[data-testid="create-note"]').click()

    const editor = $('.ql-editor')
    const code = Array.from({ length: 80 }, (_, index) => `const value${index} = ${index};`).join('\n')
    await editor.setValue(code)
    await editor.click()
    await browser.keys([process.platform === 'darwin' ? 'Meta' : 'Control', 'a'])
    await $('button.ql-code-block').click()

    const header = $('.ql-code-block-container .code-block-header')
    await expect(header).toExist()
    expect((await header.getCSSProperty('position')).value).toBe('static')
    await expect($('.code-block-header .code-block-language')).toBeDisplayed()
    await expect($('.code-block-header .code-block-copy')).toBeDisplayed()
    await expect($('.code-block-header .code-block-expand')).toBeDisplayed()

    const headerLayout = await browser.execute(() => {
      const block = document.querySelector('.ql-code-block-container')
      const stickyHeader = block.querySelector('.code-block-header')
      const background = getComputedStyle(stickyHeader).backgroundColor
      const components = background.match(/[\d.]+/g)?.map(Number) ?? []
      return {
        isFirstElement: block.firstElementChild === stickyHeader,
        backgroundAlpha: components.length === 4 ? components[3] : 1,
        blockHeight: block.getBoundingClientRect().height,
        viewportHeight: window.innerHeight,
        overflowY: getComputedStyle(block).overflowY
      }
    })
    expect(headerLayout.isFirstElement).toBe(true)
    expect(headerLayout.backgroundAlpha).toBe(1)
    expect(headerLayout.overflowY).toBe('visible')
    expect(headerLayout.blockHeight).toBeGreaterThan(headerLayout.viewportHeight * 0.3)

    await browser.execute(() => {
      const lines = [...document.querySelectorAll('.ql-code-block-container .ql-code-block')]
      const lastLine = lines.findLast((line) => line.textContent.length > 0)
      const walker = document.createTreeWalker(lastLine, NodeFilter.SHOW_TEXT)
      let lastText = null
      while (walker.nextNode()) lastText = walker.currentNode
      const range = document.createRange()
      range.setStart(lastText, lastText.textContent.length)
      range.collapse(true)
      const selection = window.getSelection()
      selection.removeAllRanges()
      selection.addRange(range)
      lastLine.closest('.ql-editor').focus()
    })
    await browser.keys('Enter')
    expect(await browser.execute(() => {
      const node = window.getSelection().anchorNode
      return (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement)
        .closest('.ql-code-block-container') !== null
    })).toBe(true)
    await browser.keys(' '.repeat(1000))
    await browser.keys('Enter')
    expect(await browser.execute(() => {
      const node = window.getSelection().anchorNode
      return (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement)
        .closest('.ql-code-block-container') === null
    })).toBe(true)

    await $('[data-testid="trash-note"]').click()
  })
})
