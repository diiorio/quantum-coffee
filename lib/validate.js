/* eslint-env webextensions */
/* exported validate */
/**
* @typedef {Object} ValidationResult
* @property {boolean} valid - Whether the URL checked is valid.
* @property {string} message - A message describing why validation failed, or `null` if it passed.
*/
/**
* Validate that a URL can be opened by `tabs.create`.
* @param {Page}
* @returns {ValidationResult}
*/
function validate (page) {
  'use strict'
  const disallowed = /^(?:about|chrome|data|file|javascript):/
  const test = disallowed.exec(page)
  return {
    valid: !test,
    message: test ? browser.i18n.getMessage('invalidScheme', test[0]) : null
  }
}
