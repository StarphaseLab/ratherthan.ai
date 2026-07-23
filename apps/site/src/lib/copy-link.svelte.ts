import { SITE } from '$lib/site.ts'

/**
 * One instance per component: copies a string to the clipboard and flashes
 * `copied` for a beat so the button can confirm without a toast. `copyLink`
 * is the common case — a clean deep link, always SITE + a canonical path,
 * never location.href.
 */
export class CopyFeedback {
  copied = $state(false)
  #timer: ReturnType<typeof setTimeout> | undefined

  copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      return // clipboard denied (http, old browser): the value is still selectable by hand
    }
    this.copied = true
    clearTimeout(this.#timer)
    this.#timer = setTimeout(() => (this.copied = false), 1500)
  }

  copyLink = (path: string) => this.copy(SITE + path)
}
