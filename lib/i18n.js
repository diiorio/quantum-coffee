/* eslint-env webextensions */

/**
 * Fill in the page with internationalized text.
 */
;(function internationalize () {
  for (const elt of document.getElementsByClassName('i18n')) {
    const type = elt.dataset.i18nType || 'text'
    const message = browser.i18n.getMessage(elt.dataset.i18nMessage)
    if (type === 'text') {
      elt.textContent = message
    } else if (type === 'placeholder') {
      elt.placeholder = message
    } else {
      throw new Error(`Unrecognized i18n type: ${type}`)
    }
  }
})()
