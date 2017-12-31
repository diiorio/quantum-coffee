/* eslint-env webextensions */
/* global Settings */
(() => {
  'use strict'
  /**
  * Open the user's saved pages for the day when the button is clicked.
  */
  async function openPages () {
    // Pages have bit flags set for each day: Sunday = 1 (1 << 0), Saturday = 64 (1 << 6)
    const today = 1 << new Date().getDay()
    const stored = await browser.storage.sync.get({
      pages: {},
      order: [],
      randomize: false,
      closeTabs: false
    })
    const settings = new Settings(stored.pages, stored.order)
    const arr = settings.order
    // Randomize order of pages
    if (stored.randomize) {
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.random() * (i + 1) | 0
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
      }
    }
    // Close open tabs
    if (stored.closeTabs) {
      const openTabs = await browser.tabs.query({currentWindow: true})
      browser.tabs.remove(openTabs.map(tab => tab.id))
    }
    // Open pages
    for (const url of settings.getPages(today)) {
      browser.tabs.create({
        url: url
      })
    }
  }

  browser.browserAction.onClicked.addListener(e => openPages(e).catch(console.error))
})()
