/* eslint-env webextensions */
/* global Settings, DAYS, NAMES, ANY, DAILY, validate */
/**
 * Load the saved preferences and add event listeners to the page.
 */
;(async function initialize () {
  'use strict'
  // Interface elements to be listened / manipulated
  const daysViewBtn = document.getElementById('days-view-btn')
  const pagesViewBtn = document.getElementById('pages-view-btn')
  const daysView = document.getElementById('days-view')
  const dayMenu = document.getElementById('day-menu')
  const dayPageList = document.getElementById('day-page-list')
  const dayUpBtn = document.getElementById('day-up')
  const dayDownBtn = document.getElementById('day-down')
  const dayEditLoader = document.getElementById('day-edit-loader')
  const dayDeleteBtn = document.getElementById('day-delete')
  const dayAddInput = document.getElementById('day-add-input')
  const dayAddBtn = document.getElementById('day-add-btn')
  const dayEditInput = document.getElementById('day-edit-input')
  const dayEditSave = document.getElementById('day-edit-save')
  const pagesView = document.getElementById('pages-view')
  const pageAddBtn = document.getElementById('page-add-btn')
  const pageTable = pagesView.querySelector('.table')
  const randomizeBox = document.getElementById('randomize')
  const closeTabsBox = document.getElementById('close-tabs')
  const bookmarksInput = document.getElementById('bookmarks-folder')
  const bookmarksImportBtn = document.getElementById('bookmarks-import')
  const bookmarksExportBtn = document.getElementById('bookmarks-export')
  const bookmarksMessage = document.getElementById('bookmarks-message')
  const bookmarksHelpBtn = document.getElementById('bookmarks-help')

  /**
   * Disable an element and styles it as such.
   * @param {HTMLElement}
   */
  function disable (elt) {
    elt.disabled = true
    elt.classList.add('disabled')
    if (elt.tagName === 'INPUT' && elt.type === 'text') elt.value = ''
  }

  /**
   * Enable an element and remove disabled styling.
   * @param {HTMLElement}
   * @param {string} [txt] - Optional text to enter into a text input.
   */
  function enable (elt, txt) {
    elt.disabled = false
    elt.classList.remove('disabled')
    if (typeof txt === 'string' && elt.tagName === 'INPUT' && elt.type === 'text') elt.value = txt
  }

  /**
   * Save a value to sync storage.
   * @param {string} key - The lookup key to associate with the value.
   * @param {*} value - The value to save.
   */
  function save (key, value) {
    return browser.storage.sync.set({[key]: value}).catch(console.error)
  }

  /**
   * Show the Days view of the preferences manager (and hide the Pages view).
   */
  function showDaysView () {
    loadDay(+dayMenu.value)
    daysView.classList.remove('hidden')
    pagesView.classList.add('hidden')
    daysViewBtn.classList.add('default', 'pressed')
    pagesViewBtn.classList.remove('default', 'pressed')
    dayAddInput.value = ''
    daysViewBtn.disabled = true // Don't call function because we don't want to add 'disabled' class
    pagesViewBtn.disabled = false
    disable(dayAddBtn)
    disable(dayEditInput)
    disable(dayEditSave)
    save('view', 'days')
  }

  /**
   * Load the pages corresponding to the given day flag into the Days view.
   * @param {Days}
   */
  function loadDay (day) {
    const list = settings.getPages(+day).filter(Boolean) // Remove empty string from list
    const options = dayPageList.children
    // Check existing options to remove those that aren't needed and save those that are
    const extant = new Map()
    for (let i = options.length - 1; i >= 0; i -= 1) {
      const opt = options[i]
      const page = opt.value
      let idx = list.indexOf(page)
      if (idx === -1) {
        dayPageList.removeChild(opt)
      } else {
        extant.set(page, opt)
      }
    }
    // For each page to be shown, get reference to existing opt or create new, then append in order
    for (const page of list) {
      if (extant.has(page)) {
        dayPageList.appendChild(extant.get(page))
      } else {
        const opt = document.createElement('option')
        opt.textContent = page
        dayPageList.appendChild(opt)
      }
    }
    toggleSidebar()
  }

  /**
   * Show the Pages view of the preferences manager.
   */
  function showPagesView () {
    daysView.classList.add('hidden')
    pagesView.classList.remove('hidden')
    daysViewBtn.classList.remove('default', 'pressed')
    pagesViewBtn.classList.add('default', 'pressed')
    daysViewBtn.disabled = false // Don't call function because we don't want 'disabled' class
    pagesViewBtn.disabled = true
    const extant = new Map()
    const list = settings.getPages(ANY)
    if (list.indexOf('') > -1 && list.length > 1) {
      // If a blank entry is the only entry, we should keep it, otherwise remove it
      list.splice(list.indexOf(''), 1)
    }
    // Check existing rows to remove unneeded and save reference to those to keep
    for (const row of Array.prototype.slice.call(pageTable.children, 1)) { // Skip header row
      const input = row.querySelector('.page')
      const page = input.value
      if (list.indexOf(page) > -1) {
        extant.set(page, row)
      } else {
        pageTable.removeChild(row)
      }
    }
    if (list.length) {
      // For each page, add existing one or create new one.
      let id = 0
      for (const page of list) {
        if (extant.has(page)) {
          const row = extant.get(page)
          for (const checkbox of row.querySelectorAll('.checkbox')) {
            checkbox.checked = settings.pageOnDay(page, +checkbox.value)
          }
          pageTable.appendChild(row)
        } else {
          // Because browser-style is dumb, all checkboxes must have an ID
          while (document.getElementById('r' + id)) id += 1
          pageTable.appendChild(createRow(page, id))
          id += 1
        }
      }
    } else {
      // If no pages have been saved, add a blank row
      addNewRow()
    }
    disableEndRows()
    save('view', 'pages')
  }

  /**
   * Disable the buttons to shift the first row up and last row down in the Pages view.
   */
  function disableEndRows () {
    if (pageTable.children.length === 1) return // Nothing to disable
    disable(pageTable.children[1].querySelector('.pg-up'))
    disable(pageTable.lastElementChild.querySelector('.pg-down'))
  }

  /**
   * Create a new Pages view row for a given page.
   * @param {Page}
   * @param {number} rowId - The ID to give to the row/cells to make checkbox labels function
   * @returns {HTMLDivElement} The newly created row.
   */
  function createRow (page, rowId) {
    const row = document.createElement('div')
    row.className = 'row'
    row.id = 'r' + rowId
    const upDown = row.appendChild(document.createElement('div'))
    upDown.className = 'up-down cell'
    const up = upDown.appendChild(document.createElement('button'))
    up.className = 'pg-up block browser-style'
    up.innerHTML = '&#x25B2;'
    const down = upDown.appendChild(document.createElement('button'))
    down.className = 'pg-down block browser-style'
    down.innerHTML = '&#x25BC;'
    const wide = row.appendChild(document.createElement('div'))
    wide.className = 'browser-style wide cell'
    const input = wide.appendChild(document.createElement('input'))
    input.className = 'page'
    input.type = 'text'
    input.value = page
    input.saved = page
    input.placeholder = browser.i18n.getMessage('rowPlaceholder')
    const del = wide.appendChild(document.createElement('button'))
    del.className = 'browser-style delete'
    del.innerHTML = '&#xD7;'
    for (let i = 0; i < DAYS.length; i += 1) {
      const cellId = `r${rowId}c${i}`
      const wrapper = row.appendChild(document.createElement('div'))
      wrapper.className = 'browser-style cell'
      if (i === 7) wrapper.classList.add('divider') // Single day / multi day split
      const checkbox = wrapper.appendChild(document.createElement('input'))
      checkbox.type = 'checkbox'
      checkbox.className = 'checkbox'
      checkbox.id = cellId
      checkbox.value = DAYS[i]
      checkbox.checked = settings.pageOnDay(page, DAYS[i])
      const label = wrapper.appendChild(document.createElement('label'))
      label.htmlFor = cellId
    }
    row.addEventListener('change', onRowChange)
    up.addEventListener('click', onRowUp)
    down.addEventListener('click', onRowDown)
    del.addEventListener('click', onRowDelete)
    return row
  }

  /**
   * Determine if text was changed or a checkbox checked and call the corresponding function.
   * @param {Event}
   */
  function onRowChange (e) {
    if (e.target.type === 'text') return onRowText(e)
    else if (e.target.type === 'checkbox') return onRowChecked(e)
    else console.log('Something broke.')
  }

  /**
   * Validate changes to a row's text and propagate changes.
   * @param {Event}
   */
  function onRowText (e) {
    const input = e.target
    const curr = input.value
    const prev = input.saved
    if (prev === curr) return // Nothing actually changed
    const check = validate(curr)
    if (!check.valid) {
      window.alert(check.message)
      input.value = input.saved
      return
    }
    if (settings.has(curr)) {
      if (curr) window.alert(browser.i18n.getMessage('extantEntry', curr))
      else window.alert(browser.i18n.getMessage('singleBlank'))
      input.value = prev
    } else {
      input.saved = curr
      settings.replace(prev, curr)
      if (prev === '') enable(pageAddBtn) // If we filled the blank row, allow new rows to be added
      if (curr === '') disable(pageAddBtn) // If we blanked out a row, disallow new rows
      settings.save()
    }
  }

  /**
   * Toggle the settings for the days checked or unchecked.
   * @param {Event}
   */
  function onRowChecked (e) {
    const input = e.target
    const row = input.parentNode.parentNode
    const page = row.querySelector('.page').value
    const day = +input.value
    if (input.checked) settings.addDay(page, day)
    else settings.removeDay(page, day)
    for (const checkbox of row.querySelectorAll('.checkbox')) {
      checkbox.checked = settings.pageOnDay(page, +checkbox.value)
    }
    settings.save()
  }

  /**
   * Swap a row with the row above it.
   * @param {Event}
   */
  function onRowUp (e) {
    const row = e.target.parentNode.parentNode
    const other = row.previousElementSibling
    return swapRows(other, row)
  }

  /**
   * Swap a row with the row below it.
   * @param {Event}
   */
  function onRowDown (e) {
    const row = e.target.parentNode.parentNode
    const other = row.nextElementSibling
    return swapRows(row, other)
  }

  /**
   * Swap two rows in the Pages view and propagate changes.
   * @param {HTMLDivElement} first - The row that starts higher.
   * @param {HTMLDivElement} second - The row that starts lower.
   */
  function swapRows (first, second) {
    // Swap order of rows
    pageTable.insertBefore(second, first)
    // Toggle buttons as needed
    const up = first.querySelector('.pg-up.disabled')
    const down = second.querySelector('.pg-down.disabled')
    if (up) enable(up)
    if (down) enable(down)
    if (up || down) disableEndRows()
    // Change settings to match
    settings.swap(first.querySelector('.page').value, second.querySelector('.page').value)
    settings.save()
  }

  /**
   * Delete a row and propagate changes.
   * @param {Event}
   */
  function onRowDelete (e) {
    const btn = e.target
    const input = btn.previousElementSibling
    const page = input.value
    const row = btn.parentNode.parentNode
    if (pageTable.children.length > 2) {
      // Multiple existing rows - just delete the row
      const isEndRow = row === pageTable.lastElementChild || row === pageTable.children[1]
      pageTable.removeChild(row)
      settings.deletePage(page)
      if (page === '') {
        enable(pageAddBtn) // Deleted blank, can allow new one
      }
      if (isEndRow) {
        // Deleted an end row, need to disable new end row
        disableEndRows()
      }
    } else {
      // When we delete the last row, it's replaced with a blank row. So instead of deleting, we can
      // just blank out the inputs and checkboxes.
      input.value = ''
      input.saved = ''
      const checkboxes = row.querySelectorAll('.checkbox')
      for (const checkbox of checkboxes) {
        checkbox.checked = false
      }
      settings.insert('')
    }
    settings.deletePage(page)
    settings.save()
  }

  /**
   * Add a new row to the Pages view.
   * @param {Event}
   */
  function addNewRow (e) {
    if (settings.has('')) return // Only allow on blank row at a time
    const page = ''
    let id = 0
    while (document.getElementById('r' + id)) id += 1
    const row = createRow(page, id)
    // Newest row is bottom row, so disable down button
    disable(row.querySelector('.pg-down'))
    if (pageTable.children.length === 1) {
      // If newest row is first row, disable up button
      disable(row.querySelector('.pg-up'))
    } else {
      // If other rows exist, enable the previously bottom row
      enable(pageTable.lastElementChild.querySelector('.pg-down'))
    }
    pageTable.appendChild(row)
    settings.insert(page)
    disable(pageAddBtn) // Only allow one blank row at a time
    // Don't need to save settings, since we only added a blank row which doesn't get saved
    return row
  }

  /**
   * Toggle the Days view Add Page button depending on whether the add page input has text.
   * @param {Event}
   */
  function toggleDayAddButton (e) {
    if (dayAddInput.value) {
      if (dayAddBtn.disabled) {
        return enable(dayAddBtn)
      }
    } else if (!dayAddBtn.disabled) {
      return disable(dayAddBtn)
    }
  }

  /**
   * Add a page to the day shown in the current Days view.
   * @param {Event}
   */
  function addDayOption (e) {
    const page = dayAddInput.value
    const check = validate(page)
    if (!check.valid) {
      window.alert(check.message)
      return
    }
    const day = +dayMenu.value
    if (!page || settings.pageOnDay(page, day)) return // Don't add a blank or duplicate value
    const opt = document.createElement('option')
    opt.textContent = page
    dayPageList.appendChild(opt)
    dayAddInput.value = ''
    dayAddInput.focus()
    settings.addDay(page, day)
    if (settings.getIndex(page) === -1) settings.insert(page)
    settings.save()
  }

  /**
   * Toggle Days view sidebar buttons based on which pages have been selected.
   * @param {Event}
   */
  function toggleSidebar (e) {
    if (dayPageList.value) {
      // If first option is selected, we can't move it upwards
      if (dayPageList.firstElementChild.selected) disable(dayUpBtn)
      else enable(dayUpBtn)
      // If last option is selected, we can't move it downwards
      if (dayPageList.lastElementChild.selected) disable(dayDownBtn)
      else enable(dayDownBtn)
      // If more than one option is selected, we can't edit multiple
      if (dayPageList.selectedOptions.length === 1) enable(dayEditLoader)
      else disable(dayEditLoader)
      // We can always delete anything selected
      enable(dayDeleteBtn)
    } else {
      // Nothing is selected, disable all buttons
      disable(dayUpBtn)
      disable(dayDownBtn)
      disable(dayEditLoader)
      disable(dayDeleteBtn)
    }
  }

  /**
   * Remove selected pages from the day loaded in the Days view and propagate changes.
   * @param {Event}
   */
  function deletePagesFromDay (e) {
    const day = +dayMenu.value
    for (const opt of [...dayPageList.selectedOptions]) {
      // Splat changes from dynamic HTMLCollection to static Array
      settings.removeDay(opt.value, day)
      dayPageList.removeChild(opt)
    }
    settings.save()
  }

  /**
   * Load the selected page into the Days view page editor.
   * @param {Event}
   */
  function loadEdit (e) {
    const old = dayPageList.value
    dayEditInput.prev = old
    enable(dayEditInput, old)
    dayEditInput.focus()
  }

  /**
   * Toggle the save edit button in the days view based on whether a change has been made.
   */
  function toggleEditBtn (e) {
    if (!dayEditInput.value || dayEditInput.value === dayEditInput.prev) disable(dayEditSave)
    else enable(dayEditSave)
  }

  /**
   * Save the changes made in the Days view edit field and propagate changes.
   */
  function saveEdit (e) {
    const curr = dayEditInput.value
    const prev = dayEditInput.prev
    const check = validate(curr)
    if (!check.valid) {
      window.alert(check.message)
      return
    }
    if (settings.has(curr)) {
      window.alert(browser.i18n.getMessage('extantEntry', curr))
    } else {
      settings.replace(prev, curr)
      for (const opt of dayPageList.children) {
        // Search for matching option in list to change its value
        if (opt.value === prev) {
          opt.textContent = curr
          break
        }
      }
    }
    dayEditInput.prev = ''
    disable(dayEditInput)
    disable(dayEditSave)
    settings.save()
  }

  /**
   * Move the selected pages up in the Days view.
   * @param {Event}
   */
  function shiftPagesUp (e) {
    for (const opt of [...dayPageList.selectedOptions]) {
      swapDays(opt, opt.previousElementSibling)
    }
    toggleSidebar()
  }

  /**
   * Move the selected pages down in the Days view.
   * @param {Event}
   */
  function shiftPagesDown (e) {
    for (const opt of [...dayPageList.selectedOptions].reverse()) {
      swapDays(opt.nextElementSibling, opt)
    }
    toggleSidebar()
  }

  /**
   * Swaps the order of two page options and their corresponding settings.
   * @param {HTMLOptionElement} first - The option that will be first.
   * @param {HTMLOptionElement} second - The option that will be second.
   */
  function swapDays (first, second) {
    dayPageList.insertBefore(first, second)
    settings.swap(first.value, second.value)
    settings.save()
  }

  /**
   * Toggle bookmark import/export buttons based on whether a bookmark folder name has been entered.
   * @param {Event}
   */
  function toggleBookmarkButtons (e) {
    if (bookmarksInput.value) {
      if (bookmarksImportBtn.disabled) {
        enable(bookmarksImportBtn)
        enable(bookmarksExportBtn)
      }
    } else {
      if (!bookmarksImportBtn.disabled) {
        disable(bookmarksImportBtn)
        disable(bookmarksExportBtn)
      }
    }
  }

  /**
   * Import bookmarks from the set bookmarks folder.
   * @param {Event}
   */
  async function importBookmarks (e) {
    const name = bookmarksInput.value
    const search = await browser.bookmarks.search({title: name})
    if (search.length === 0) {
      bookmarksMessage.textContent = browser.i18n.getMessage('bookmarksFolderNotFound', name)
      return
    }
    if (search.length > 1) {
      bookmarksMessage.textContent = browser.i18n.getMessage('bookmarksFolderNotUnique', name)
      return
    }
    const folder = search[0]
    if (folder.type !== 'folder') {
      bookmarksMessage.textContent = browser.i18n.getMessage('bookmarksFolderNotFolder', name)
      return
    }
    const bookmarks = await browser.bookmarks.getChildren(folder.id)
    let dayNum = 0
    let invalidMessages = []
    // Add a bookmark to the list on a given day or add the reason it's invalid to the saved list
    const checkBookmark = (page, day) => {
      const validation = validate(page)
      if (validation.valid) {
        if (settings.getIndex(page) === -1) settings.insert(page)
        settings.addDay(page, day)
      } else {
        invalidMessages.push(validation.message)
      }
    }
    for (const entry of bookmarks) {
      if (entry.type !== 'folder') {
        checkBookmark(entry.url, DAILY)
      } else if (entry.type === 'folder' && dayNum <= 6) {
        // For the first seven subfolders in the given folder, add bookmarks to the matching day
        const day = 1 << dayNum
        const children = await browser.bookmarks.getChildren(entry.id)
        for (const bookmark of children) {
          // For each entry in the subfolder, only add it if it's actually a bookmark
          if (bookmark.type === 'bookmark') {
            checkBookmark(bookmark.url, day)
          }
        }
        dayNum += 1
      }
    }
    // Reload the appropriate preferences view
    if (daysView.classList.contains('hidden')) showPagesView()
    else showDaysView()
    settings.save()
    // Show failure messages last so accepted changes are already shown
    if (invalidMessages.length) {
      bookmarksMessage.innerHTML = ''
      for (const message of invalidMessages) {
        bookmarksMessage.appendChild(document.createElement('div')).textContent = message
      }
    }
  }

  /**
   * Export bookmarks to the set bookmarks folder. Pages are added to a subfolder for each day of
   * the week that they are due to be opened on.
   * @param {Event}
   */
  async function exportBookmarks (e) {
    const name = bookmarksInput.value
    const parentId = 'toolbar_____'
    const folder = await browser.bookmarks.create({
      title: name,
      type: 'folder',
      parentId: parentId
    })
    const days = NAMES.slice(0, 7).map(day => browser.i18n.getMessage('bookmarks' + day))
    for (let dayNum = 0; dayNum <= 6; dayNum += 1) {
      const day = 1 << dayNum
      const dayName = days[dayNum]
      const dayFolder = await browser.bookmarks.create({
        title: dayName,
        type: 'folder',
        parentId: folder.id
      })
      for (const page of settings.getPages(day)) {
        browser.bookmarks.create({
          url: page,
          type: 'bookmark',
          parentId: dayFolder.id
        })
      }
    }
  }

  /**
   * Toggle the visibility of the bookmarks help messages.
   * @param {Event}
   */
  function toggleBookmarksHelp (e) {
    const importHelp = browser.i18n.getMessage('bookmarksImportHelp')
    const exportHelp = browser.i18n.getMessage('bookmarksExportHelp')
    if (bookmarksMessage.textContent === importHelp + exportHelp) {
      // The text content of two <p> elements is just their text concatenated, no spaces or tags
      bookmarksMessage.textContent = ''
    } else {
      bookmarksMessage.textContent = ''
      bookmarksMessage.appendChild(document.createElement('p')).textContent = importHelp
      bookmarksMessage.appendChild(document.createElement('p')).textContent = exportHelp
    }
  }

  /**
   * Handle a runtime message event.
   */
  function onMessage (message, sender, sendResponse) {
    if (message.message === 'save' && message.settings) {
      return settingsChanged(message.settings)
    }
  }

  /**
   * Replace the settings object with updated version from a different frame.
   * @param {Object} message - Plain object version of the new settings.
   */
  function settingsChanged (newSettings) {
    // Replace old settings object
    settings = new Settings(newSettings.pages, newSettings.order)
    // Reload the appropriate preferences view
    if (daysView.classList.contains('hidden')) showPagesView()
    else showDaysView()
  }

  // Finally, the actual execution

  const stored = await browser.storage.sync.get({
    order: [],
    pages: {},
    randomize: false,
    closeTabs: false,
    view: 'days'
  })

  let settings = new Settings(stored.pages, stored.order)

  if (stored.randomize) {
    randomizeBox.checked = true
  }

  if (stored.closeTabs) {
    closeTabsBox.checked = true
  }

  if (stored.view === 'days') {
    showDaysView()
  } else {
    showPagesView()
  }

  // Page event listeners
  daysViewBtn.addEventListener('click', showDaysView)
  pagesViewBtn.addEventListener('click', showPagesView)
  pageAddBtn.addEventListener('click', addNewRow)
  dayMenu.addEventListener('change', e => loadDay(+dayMenu.value))
  dayAddInput.addEventListener('keyup', toggleDayAddButton)
  dayAddBtn.addEventListener('click', addDayOption)
  dayPageList.addEventListener('change', toggleSidebar)
  dayDeleteBtn.addEventListener('click', deletePagesFromDay)
  dayEditLoader.addEventListener('click', loadEdit)
  dayEditInput.addEventListener('keyup', toggleEditBtn)
  dayEditSave.addEventListener('click', saveEdit)
  dayUpBtn.addEventListener('click', shiftPagesUp)
  dayDownBtn.addEventListener('click', shiftPagesDown)
  randomizeBox.addEventListener('change', e => save('randomize', randomizeBox.checked))
  closeTabsBox.addEventListener('change', e => save('closeTabs', closeTabsBox.checked))
  bookmarksInput.addEventListener('keyup', toggleBookmarkButtons)
  bookmarksImportBtn.addEventListener('click', importBookmarks)
  bookmarksExportBtn.addEventListener('click', exportBookmarks)
  bookmarksHelpBtn.addEventListener('click', toggleBookmarksHelp)
  // Extension event listeners
  browser.runtime.onMessage.addListener(onMessage)
})().catch(console.error)
