/* eslint-env webextensions */
/* global DAYS, NAMES, Settings, validate */
(() => {
  'use strict'
  const CONTEXTS = [
    browser.contextMenus.ContextType.ALL,
    browser.contextMenus.ContextType.BROWSER_ACTION
  ]
  const MENUIDS = {
    top: 'top-menu',
    url: 'url-item',
    options: 'options-item'
  }

  /**
   * Add a checkbox menu item to the extension's context menu.
   * @param {string} id - The ID to give to the menu item and use for i18n lookup.
   * @returns The return value of `browser.contextMenus.create`.
   */
  function createItem (id) {
    return browser.contextMenus.create({
      id: id,
      parentId: MENUIDS.top,
      contexts: CONTEXTS,
      title: browser.i18n.getMessage('contextMenu' + id),
      type: 'checkbox',
      checked: false
    })
  }

  /**
   * Add a separator line to th extension's context menu.
   * @returns The return value of `browser.contextMenus.create`.
   */
  function createSeparator () {
    return browser.contextMenus.create({
      type: 'separator',
      parentId: MENUIDS.top,
      contexts: CONTEXTS
    })
  }

  /**
   * Create all of the browser's context menus.
   */
  async function createMenus () {
    // Top level menu (required to set explicitly because of browser_action context menu limits)
    browser.contextMenus.create({
      id: MENUIDS.top,
      title: browser.i18n.getMessage('contextMenuParent'),
      contexts: CONTEXTS,
      icons: {
        16: 'icons/coffee.svg'
      }
    })
    // URL label item
    browser.contextMenus.create({
      id: MENUIDS.url,
      parentId: MENUIDS.top,
      contexts: CONTEXTS,
      title: '',
      enabled: false
    })
    createSeparator()
    // Single day items
    for (let i = 0; i <= 6; i += 1) {
      createItem(NAMES[i])
    }
    createSeparator()
    // Multi day items
    for (let i = 7; i < NAMES.length; i += 1) {
      createItem(NAMES[i])
    }
    createSeparator()
    // More Options item
    browser.contextMenus.create({
      id: MENUIDS.options,
      parentId: MENUIDS.top,
      contexts: CONTEXTS,
      title: browser.i18n.getMessage('contextMenuOpenOptions')
    })
  }

  /**
   * Update the context menus to reflect the currently active tab.
   * @param {URL} page - The URL of the currently active tab.
   * @param {Settings} [settings] - Optional. The user's page settings, if previously loaded.
   */
  async function updateMenus (page, settings) {
    if (!settings) settings = await Settings.load()
    browser.contextMenus.update(MENUIDS.url, {title: page})
    for (let i = 0; i < DAYS.length; i += 1) {
      browser.contextMenus.update(NAMES[i], {checked: settings.pageOnDay(page, DAYS[i])})
    }
  }

  /**
   * Handle the `tabs.onActivated` event to update the context menus.
   */
  async function onActivated (info) {
    const tab = await browser.tabs.get(info.tabId)
    return updateMenus(tab.url)
  }

  /**
   * Handle the `tabs.onUpdated` event to update the context menus.
   */
  function onUpdated (tabId, changes, tab) {
    return changes.url && updateMenus(changes.url)
  }

  /**
   * Update the user's pages when a menu item is clicked.
   */
  async function onClicked (info, tab) {
    if (info.menuItemId === MENUIDS.options) {
      return browser.runtime.openOptionsPage()
    }
    const page = tab.url
    const validation = validate(page)
    if (!validation.valid) {
      // Notify user of failure
      browser.tabs.executeScript({
        code: `window.alert(${JSON.stringify(validation.message)})`,
        runAt: 'document_start'
      })
      // Revert checked state of menu item
      return browser.contextMenus.update(info.menuItemId, {checked: !info.checked})
    }
    // Update other menu items as appropriate
    const day = DAYS[NAMES.indexOf(info.menuItemId)]
    const settings = await Settings.load()
    if (info.checked) {
      settings.addDay(page, day)
      if (settings.getIndex(page) === -1) settings.insert(page)
    } else {
      settings.removeDay(page, day)
    }
    settings.save()
    updateMenus(page, settings)
  }

  createMenus()
  browser.tabs.onActivated.addListener(onActivated)
  browser.tabs.onUpdated.addListener(onUpdated)
  browser.contextMenus.onClicked.addListener(onClicked)
})()
