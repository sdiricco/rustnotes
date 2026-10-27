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
    const code = Array.from({ length: 80 }, (_, index) => `const value${index} = ${index};`).join(
      '\n'
    )
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

    await $('.code-block-header .code-block-expand').click()
    await expect($('.code-editor-page')).toBeDisplayed()
    const codeLayout = await browser.execute(() => {
      const overlay = document.querySelector('.code-editor-page')
      const pane = document.querySelector('.note-editor')
      const rect = overlay.getBoundingClientRect()
      const parent = pane.getBoundingClientRect()
      return {
        attachedToPane: overlay.parentElement === pane,
        top: rect.top,
        paneTop: parent.top,
        bottom: rect.bottom,
        paneBottom: parent.bottom,
        headerBottom: document.querySelector('.app-header').getBoundingClientRect().bottom
      }
    })
    expect(codeLayout.attachedToPane).toBe(true)
    expect(codeLayout.top).toBeCloseTo(codeLayout.paneTop, 0)
    expect(codeLayout.bottom).toBeCloseTo(codeLayout.paneBottom, 0)
    expect(codeLayout.top).toBeGreaterThanOrEqual(codeLayout.headerBottom)
    await $('.code-editor-close').click()
    await expect($('.code-editor-page')).not.toExist()

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
    expect(
      await browser.execute(() => {
        const node = window.getSelection().anchorNode
        return (
          (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement).closest(
            '.ql-code-block-container'
          ) !== null
        )
      })
    ).toBe(true)
    await editor.addValue(' '.repeat(1000))
    await browser.keys('Enter')
    expect(
      await browser.execute(() => {
        const node = window.getSelection().anchorNode
        return (
          (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement).closest(
            '.ql-code-block-container'
          ) === null
        )
      })
    ).toBe(true)

    await $('[data-testid="trash-note"]').click()
  })

  it('mantiene visibile il titolo mentre il contenuto cresce e scorre', async () => {
    await browser.tauri.switchWindow('main')
    await $('[data-testid="create-note"]').click()

    const title = `Scroll ${Date.now()}`
    const headerTitle = $('[data-testid="header-title"]')
    await headerTitle.click()
    await $('[data-testid="header-title-input"]').setValue(title)
    await browser.keys('Enter')

    const editor = $('.ql-editor')
    // Invio deve passare da Quill: assegnare una stringa multilinea al
    // contenteditable nel driver non equivale a creare paragrafi nel modello.
    await editor.setValue('Riga 1')
    await editor.click()
    for (let line = 2; line <= 120; line++) {
      await browser.keys('Enter')
      await editor.addValue(`Riga ${line}`)
    }
    await expect(editor).toHaveText(expect.stringContaining('Riga 120'))
    await browser.keys('Enter')

    const layout = await browser.execute(() => {
      const header = document.querySelector('.app-header')
      const main = document.querySelector('.main-col')
      const pane = document.querySelector('.note-editor')
      const editorBody = document.querySelector('.ql-editor')
      const rect = header.getBoundingClientRect()
      return {
        headerTop: rect.top,
        headerVisible: rect.bottom > 0,
        mainScrollTop: main.scrollTop,
        paneScrollTop: pane.scrollTop,
        editorScrollTop: editorBody.scrollTop,
        editorHeight: editorBody.clientHeight,
        viewportHeight: window.innerHeight
      }
    })

    await expect(headerTitle).toHaveText(title)
    expect(layout.headerVisible).toBe(true)
    expect(layout.headerTop).toBeGreaterThanOrEqual(0)
    expect(layout.mainScrollTop).toBe(0)
    expect(layout.paneScrollTop).toBe(0)
    expect(layout.editorScrollTop).toBeGreaterThan(0)
    expect(layout.editorHeight).toBeLessThan(layout.viewportHeight)

    // La distanza sotto il cursore deve seguire la digitazione, senza scroll
    // manuale per mostrare il padding finale.
    for (let line = 0; line < 8; line++) {
      await browser.keys('Enter')
      const typing = await browser.execute(() => {
        const viewport = document.querySelector('.ql-editor')
        const selection = window.getSelection()
        const node = selection.anchorNode
        const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
        const caret = selection.getRangeAt(0).getBoundingClientRect()
        const line = element.closest('p').getBoundingClientRect()
        const caretBottom = caret.height ? caret.bottom : line.bottom
        const style = getComputedStyle(viewport)
        return {
          gap: viewport.getBoundingClientRect().bottom - caretBottom,
          padding: parseFloat(style.paddingBottom),
          lineHeight: parseFloat(style.lineHeight)
        }
      })
      expect(typing.gap).toBeGreaterThanOrEqual(typing.padding - typing.lineHeight / 3)
    }

    const top = await browser.execute(() => {
      const editorBody = document.querySelector('.ql-editor')
      editorBody.scrollTop = 0
      const first = editorBody.firstElementChild.getBoundingClientRect()
      const viewport = editorBody.getBoundingClientRect()
      return { scrollTop: editorBody.scrollTop, firstTop: first.top, viewportTop: viewport.top }
    })
    expect(top.scrollTop).toBe(0)
    expect(top.firstTop).toBeGreaterThanOrEqual(top.viewportTop)

    const originalSize = await browser.getWindowSize()
    try {
      for (const [width, height] of [
        [1200, 800],
        [760, 520],
        [560, 520]
      ]) {
        await browser.setWindowSize(width, height)
        await browser.waitUntil(
          async () => (await browser.execute(() => window.innerWidth)) <= width
        )
        if (width < 640) {
          await browser.waitUntil(
            async () =>
              (await browser.execute(
                () => document.querySelector('.main-col').getBoundingClientRect().left
              )) === 0
          )
        }
        const geometry = await browser.execute(() => {
          const editorBody = document.querySelector('.ql-editor')
          editorBody.scrollTop = editorBody.scrollHeight
          const rect = editorBody.getBoundingClientRect()
          const toolbar = document.querySelector('.editor-header').getBoundingClientRect()
          const header = document.querySelector('.app-header').getBoundingClientRect()
          const ancestors = []
          for (let el = editorBody.parentElement; el; el = el.parentElement) {
            ancestors.push({ scrollTop: el.scrollTop, overflow: el.scrollHeight - el.clientHeight })
          }
          return {
            headerTop: header.top,
            headerBottom: header.bottom,
            headerRight: header.right,
            headerLeft: header.left,
            toolbarTop: toolbar.top,
            toolbarBottom: toolbar.bottom,
            bodyTop: rect.top,
            bodyBottom: rect.bottom,
            viewportHeight: window.innerHeight,
            viewportWidth: window.innerWidth,
            scrollTop: editorBody.scrollTop,
            ancestors
          }
        })
        expect(geometry.headerTop).toBeGreaterThanOrEqual(0)
        expect(geometry.headerRight).toBeLessThanOrEqual(geometry.viewportWidth + 1)
        if (width < 640) expect(geometry.headerLeft).toBe(0)
        expect(geometry.toolbarTop).toBeGreaterThanOrEqual(geometry.headerBottom)
        expect(geometry.bodyTop).toBeGreaterThanOrEqual(geometry.toolbarBottom)
        expect(geometry.bodyBottom).toBeLessThanOrEqual(geometry.viewportHeight + 1)
        expect(geometry.scrollTop).toBeGreaterThan(0)
        for (const ancestor of geometry.ancestors) {
          expect(ancestor.scrollTop).toBe(0)
          expect(ancestor.overflow).toBeLessThanOrEqual(1)
        }
        if (process.env.LAYOUT_SCREENSHOT_DIR) {
          await browser.saveScreenshot(`${process.env.LAYOUT_SCREENSHOT_DIR}/editor-${width}.png`)
        }
      }
    } finally {
      await browser.setWindowSize(originalSize.width, originalSize.height)
    }

    // Ricerca e rimontaggio della nota devono usare la stessa viewport.
    await browser.execute(() => {
      document.querySelector('.ql-editor').scrollTop = 0
    })
    await $('.header-note-actions .action-card > button').click()
    await $('.find-bar input').setValue('Riga 120')
    await browser.waitUntil(
      async () =>
        (await browser.execute(() => document.querySelector('.ql-editor').scrollTop)) > 500
    )
    await $('.find-bar input').click()
    await browser.keys('Escape')

    await $('[data-testid="create-note"]').click()
    await $('.ql-editor').setValue('Nota corta')
    await $(`.note-title[data-note-title="${title}"]`).click()
    await expect($('.ql-editor')).toHaveText(expect.stringContaining('Riga 120'))
    expect(
      await browser.execute(() => document.querySelectorAll('.floating-toolbar.ql-toolbar').length)
    ).toBe(1)
    expect(
      await browser.execute(
        () => document.querySelectorAll('.header-note-actions .action-card').length
      )
    ).toBe(1)

    await $('[data-testid="trash-note"]').click()
  })

  it('mantiene le barre visibili con molte cartelle e nelle impostazioni', async () => {
    const originalSize = await browser.getWindowSize()
    const prefix = `Layout ${Date.now()}`
    try {
      await browser.setWindowSize(760, 520)
      for (let index = 0; index < 20; index++) {
        await $('.note-list-topbar .back-btn').click()
        await $('.sidebar-topbar .create-btn').click()
        await $('.folder-item input').setValue(`${prefix} ${index}`)
        await browser.keys('Enter')
      }
      await $('.note-list-topbar .back-btn').click()
      const folders = await browser.execute(() => {
        const sidebar = document.querySelector('.sidebar')
        const list = document.querySelector('.folders')
        list.scrollTop = list.scrollHeight
        return {
          sidebarScrollTop: sidebar.scrollTop,
          scrollTop: list.scrollTop,
          headerTop: document.querySelector('.sidebar-topbar').getBoundingClientRect().top,
          listBottom: list.getBoundingClientRect().bottom,
          lastBottom: list.lastElementChild.getBoundingClientRect().bottom,
          viewportHeight: window.innerHeight
        }
      })
      expect(folders.scrollTop).toBeGreaterThan(0)
      expect(folders.sidebarScrollTop).toBe(0)
      expect(folders.headerTop).toBeGreaterThanOrEqual(0)
      expect(folders.lastBottom).toBeLessThanOrEqual(folders.listBottom + 1)
      expect(folders.listBottom).toBeLessThanOrEqual(folders.viewportHeight)

      await $('.header-settings button').click()
      await $('[aria-controls="settings-panel-shortcuts"]').click()
      const settings = await browser.execute(() => {
        const page = document.querySelector('.settings-page')
        const content = document.querySelector('.settings-content')
        content.scrollTop = content.scrollHeight
        return {
          pageScrollTop: page.scrollTop,
          contentScrollTop: content.scrollTop,
          topbarTop: document.querySelector('.settings-topbar').getBoundingClientRect().top,
          contentBottom: content.getBoundingClientRect().bottom,
          viewportHeight: window.innerHeight
        }
      })
      expect(settings.contentScrollTop).toBeGreaterThan(0)
      expect(settings.pageScrollTop).toBe(0)
      expect(settings.topbarTop).toBeGreaterThanOrEqual(0)
      expect(settings.contentBottom).toBeLessThanOrEqual(settings.viewportHeight + 1)
      await $('.settings-topbar button').click()
      await $('.sidebar-topbar .global-search button').click()
      await expect($('.search-panel')).toBeDisplayed()
      const search = await browser.execute(() => {
        const rect = document.querySelector('.search-panel').getBoundingClientRect()
        return { top: rect.top, bottom: rect.bottom, viewportHeight: window.innerHeight }
      })
      expect(search.top).toBeGreaterThanOrEqual(0)
      expect(search.bottom).toBeLessThanOrEqual(search.viewportHeight + 1)
      await $('.search-panel input').click()
      await browser.keys('Escape')
      await expect($('.search-panel')).not.toExist()
    } finally {
      await browser.setWindowSize(originalSize.width, originalSize.height)
    }
  })
})
