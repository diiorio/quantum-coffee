/* eslint-env webextensions */
/* exported validate */

const validate = (() => {
  'use strict'
  /**
   * @typedef {Object} ValidationResult
   * @property {boolean} valid - Whether the URL checked is valid.
   * @property {string} [message] - A message describing why validation failed.
   */

  /**
   * Validate that a URL can be opened by `tabs.create`.
   * @param {Page}
   * @returns {ValidationResult}
   */
  function validate (page) {
    const fail = (i18nKey, i18nFiller) => ({
      valid: false,
      message: browser.i18n.getMessage(i18nKey, i18nFiller)
    })
    const schemeTest = /^[\w-]+?:/.exec(page)
    // URL scheme must be specified
    if (!schemeTest) {
      return fail('errorNoScheme', page)
    }
    const scheme = schemeTest[0]
    // URL scheme cannot be one that `browser.tabs.create` cannot open
    const disallowed = ['about:', 'chrome:', 'data:', 'file:', 'javascript:']
    if (disallowed.indexOf(scheme) > -1) {
      return fail('errorInvalidScheme', scheme)
    }
    // URL must be a properly formed URL
    try {
      new window.URL(page) // eslint-disable-line no-new
    } catch (err) {
      return fail('errorInvalidUrl', page)
    }

    return {valid: true}
  }

  /**
   * Get the translated version of an error message, if available.
   * @param {Error} err - The error object containing a message to translate.
   * @returns {string} The translated error message, or original if no translation available.
   */
  validate.translateError = function translateError (err) {
    const msg = err.message || ''
    function check (regex, i18nKey) {
      const test = regex.exec(msg)
      // Return null if test failed, else the translated message if found, else the original message
      return test && (browser.i18n.getMessage(i18nKey, test.slice(1)) || msg)
    }
    const knownErrors = [
      [/^(.+?) is not a valid URL\.$/, 'errorInvalidUrl'],
      [/^Illegal URL: (.+?)$/, 'errorIllegalUrl']
    ]
    for (const [regex, key] of knownErrors) {
      const result = check(regex, key)
      if (result) return result
    }
    // No translated messages found, return the original error message
    return msg
  }

  return validate
})()
