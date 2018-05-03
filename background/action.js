/* eslint-env webextensions */
/* global Settings, validate */
;(() => {
  'use strict'
  /**
   * Open the user's saved pages for the day when the button is clicked.
   */
  async function openPages (clickedTab) {
    // Pages have bit flags set for each day: Sunday = 1 (1 << 0), Saturday = 64 (1 << 6)
    const today = 1 << new Date().getDay()
    const stored = await browser.storage.sync.get({
      order: [],
      pages: {},
      view: 'days',
      options: {
        randomize: false,
        shouldCloseTabs: true,
        closeTabs: 'newtab',
        openAsPinned: false,
        skipOpen: false,
        skipWindow: 'active',
        reloadOpen: false,
        reloadTabs: 'all'
      },
      // REMOVE in future - v1.0.1 legacy options
      randomize: null,
      closeTabs: null
    })

    // Redirect to options page if nothing at all configured
    if (stored.order.length === 0) {
      return browser.runtime.openOptionsPage()
    }

    const options = stored.options
    let settings = new Settings(stored.pages, stored.order)
    const toOpen = settings.getPages(today)
    const qcTabs = []

    // Show an error message if no pages configured for today
    if (toOpen.length === 0) {
      return showPopup([browser.i18n.getMessage('errorNoPages')])
    }

    // REMOVE in future - v1.0.1 options compatibility
    if (typeof stored.randomize === 'boolean') {
      options.randomize = stored.randomize
      browser.storage.sync.remove('randomize')
      browser.storage.sync.set({options}).catch(console.error)
    }
    if (typeof stored.closeTabs === 'boolean') {
      options.shouldCloseTabs = stored.closeTabs
      browser.storage.sync.remove('closeTabs')
      browser.storage.sync.set({options}).catch(console.error)
    }

    // Skip opening pages, but maybe reload
    if (options.skipOpen) {
      const search = {
        // `false` triggers filtering, `null` does not
        currentWindow: options.skipWindow === 'active' || null
      }
      const tabs = await browser.tabs.query(search)
      const toReload = []
      for (const tab of tabs) {
        const idx = toOpen.indexOf(tab.url)
        if (idx > -1) {
          toReload.push(tab)
          qcTabs.push(tab.id)
          toOpen.splice(idx, 1)
        }
      }
      if (options.reloadOpen) {
        const o = options.reloadTabs
        for (const tab of toReload) {
          if (o === 'all' || (o === 'pinned' && tab.pinned) || (o === 'unpinned' && !tab.pinned)) {
            browser.tabs.reload(tab.id)
          }
        }
      }
    }

    // Randomize order of pages
    if (options.randomize) {
      for (let i = toOpen.length - 1; i > 0; i -= 1) {
        const j = Math.random() * (i + 1) | 0
        ;[toOpen[i], toOpen[j]] = [toOpen[j], toOpen[i]]
      }
    }

    // Open pages, with error handling only once all tabs are open
    const result = await Promise.all(toOpen.map(page => {
      // Convert rejection errors into resolved objects with `error` property to allow all errors
      // to be seen, instead of just the first one rejected
      return browser.tabs.create({
        url: page,
        active: false,
        pinned: options.openAsPinned
      })
      .then(tab => qcTabs.push(tab.id), e => ({error: e}))
    }))

    const errors = []
    for (const res of result) {
      if (res && res.error) {
        errors.push(res.error)
      }
    }
    if (errors.length) {
      showPopup(errors.map(validate.translateError))
    }

    // Close open tabs
    if (options.shouldCloseTabs) {
      const opt = options.closeTabs
      // `false` triggers filtering, `null` does not
      const search = {
        active: opt === 'active' || opt === 'newtab' || null,
        currentWindow: opt !== 'all' || null,
        pinned: (opt === 'active' || opt === 'unpinned') ? false : null
      }
      const openTabs = await browser.tabs.query(search)
      if (opt === 'newtab') {
        if (openTabs[0].url === 'about:newtab') {
          browser.tabs.remove(openTabs[0].id)
        }
      } else {
        const toClose = []
        for (const tab of openTabs) {
          if (qcTabs.indexOf(tab.id) === -1) {
            toClose.push(tab.id)
          }
        }
        browser.tabs.remove(toClose)
      }
    }
  }

  /**
   * Change the browser action to show previously-generated errors.
   * @param {Array.string} errors - An array of error messages to print.
   */
  function showPopup (errors) {
    browser.browserAction.setPopup({popup: browser.extension.getURL('popup/popup.html')})
    browser.browserAction.setBadgeText({text: '!'})
    browser.storage.local.set({errors})
  }

  browser.browserAction.onClicked.addListener(e => openPages(e).catch(console.error))
})()
