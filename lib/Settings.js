/* eslint-env webextensions */
/* global ALL */
/* exported Settings */

/**
 * The URL of a page the user wants to use.
 * @typedef {string} Page
 */
/**
 * A bit flag representing the days on which a page should be opened. Sunday is in the least
 * signficant position (1) and Saturday is in the greatest (64).
 * @typedef {number} Days
 */
/**
 * Class for managing the user's page preferences.
 */
const Settings = (() => {
  // Detect if script is running in background
  const isBackground = browser.runtime.getBackgroundPage().then(bgWindow => bgWindow === window)
  return class Settings {
    /**
     * Create a new settings manager.
     * @param {Object.<Page, Days>} pages - An object representing the collection of pages to be
     * managed and their corresponding day flags.
     * days on which to load the key URL.
     * @param {Array.Page} order - An array representing the order in which URLs should be opened.
     */
    constructor (pages, order) {
      if (pages instanceof Map) {
        this.pages = pages
      } else {
        // Convert plain object into a map
        const map = new Map()
        Object.keys(pages || {}).forEach(page => {
          map.set(page, pages[page] & ALL)
        })
        this.pages = map
      }
      this.order = order || []
    }
    /**
     * Retrieve the days that a page is set to be open on.
     * @param {Page}
     * @returns {Days}
     */
    getDays (page) {
      return this.pages.get(page) & ALL
    }
    /**
     * Retrieve the index of a page from the order in which they are opened.
     * @param {Page}
     * @returns {number}
     */
    getIndex (page) {
      return this.order.indexOf(page)
    }
    /**
     * Retrieve the pages to be opened on a given set of days.
     * @param {Days}
     * @returns {Array.Page}
     */
    getPages (day) {
      return this.order.filter(page => this.pageOnDay(page, day))
    }
    /**
     * Check whether a page is opened on each of a given set of days.
     * @param {Page}
     * @param {Days}
     * @returns {Boolean}
     */
    pageOnDay (page, day) {
      day &= ALL
      return (this.pages.get(page) & day) === day
    }
    /**
     * Add a set of days to the days on which a page should be opened.
     * @param {Page}
     * @param {Days}
     */
    addDay (page, day) {
      const pages = this.pages
      pages.set(page, pages.get(page) | day & ALL)
    }
    /**
     * Remove a set of days from the days on which a page should be opened.
     * @param {Page}
     * @param {Days}
     */
    removeDay (page, day) {
      const pages = this.pages
      pages.set(page, pages.get(page) & ~(day & ALL))
    }
    /**
     * Completely delete all references to a page.
     * @param {Page}
     */
    deletePage (page) {
      const order = this.order
      const idx = order.indexOf(page)
      if (idx > -1) order.splice(idx, 1)
      this.pages.delete(page)
    }
    /**
     * Insert a page or move it to a given index in the order in which pages are opened.
     * @param {Page}
     * @param {number} [idx] - The index at which to insert the page. Defaults to the end of the list.
     */
    insert (page, idx) {
      const order = this.order
      if (typeof idx === 'undefined') idx = order.length
      const prev = order.indexOf(page)
      if (prev === idx) return // Nothing to change
      if (prev > -1) order.splice(prev, 1)
      order.splice(idx, 0, page)
    }
    /**
     * Swap the order in which two pages are set to be opened.
     * @param {Page}
     * @param {Page}
     */
    swap (a, b) {
      const order = this.order
      const ia = order.indexOf(a)
      const ib = order.indexOf(b)
      if (ia === -1 || ib === -1) {
        throw new Error('Cannot swap page that does not exist.')
      }
      order[ia] = b
      order[ib] = a
    }
    /**
     * Check whether a page has been set with both a day flag and an opening index.
     * @returns {Boolean}
     */
    has (page) {
      return this.pages.has(page) && this.order.indexOf(page) > -1
    }
    /**
     * Replace all references to one page with another.
     * @param {Page}
     * @param {Page}
     */
    replace (prev, curr) {
      if (prev === curr) return // Nothing to change.
      const pages = this.pages
      const order = this.order
      pages.set(curr, pages.get(prev) & ALL)
      pages.delete(prev)
      order[order.indexOf(prev)] = curr
    }
    /**
     * Save the managed settings to sync storage. Ignores the empty string as a page and any pages
     * that are not set to be opened on any days.
     */
    async save () {
      const order = this.order
      const pages = this.pages
      const saveOrder = []
      const savePages = {}
      const saveObj = {
        order: saveOrder,
        pages: savePages
      }
      for (const page of order) {
        // If page is not empty string and has at least one page set, save it.
        const day = pages.get(page) & ALL
        if (page && day) {
          saveOrder.push(page)
          savePages[page] = day
        }
      }
      browser.storage.sync.set(saveObj).catch(console.error)
      // Send message if necessary (background => options page)
      if (await isBackground) {
        // Detect if about:addons is open (not the options page, but as close as I think we can get)
        // If about:addons is open but the options page isn't, the message will try to send and fail
        const shouldSend = await (async () => {
          const tabs = await browser.tabs.query({}) // Query url option doesn't like about: scheme
          for (const t of tabs) {
            if (t.url === 'about:addons') return true
          }
        })()
        if (shouldSend) {
          browser.runtime.sendMessage({
            message: 'save',
            settings: saveObj
          })
        }
      }
    }
    /**
     * Create a new Settings object without having to first retrieve items from storage. Asynchronous.
     * @returns {Promise} A new Settings object.
     */
    static async load () {
      const stored = await browser.storage.sync.get({pages: {}, order: []})
      return new this(stored.pages, stored.order)
    }
  }
})()
