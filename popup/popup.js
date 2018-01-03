/* eslint-env webextensions */
;(async () => {
  'use strict'
  // Fill popup with message text
  const stored = await browser.storage.local.get({errors: []})
  const main = document.getElementById('main')
  for (const msg of stored.errors) {
    main.appendChild(document.createElement('div')).textContent = msg
  }
  // Add `Edit Preferences` action
  const prefsBtn = document.getElementById('editPrefs')
  prefsBtn.addEventListener('click', e => browser.runtime.openOptionsPage())
  // Add `Close Warning` action
  const ignoreBtn = document.getElementById('ignoreWarning')
  ignoreBtn.addEventListener('click', async e => {
    // Trigger all three actions in parallel, then wait for all to finish before continuing
    await Promise.all([
      browser.browserAction.setBadgeText({text: ''}),
      browser.browserAction.setPopup({popup: ''}),
      browser.storage.local.remove('errors')
    ])
    window.close()
  })
})()
