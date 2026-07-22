import { SITE } from '$lib/site.ts'

/**
 * One instance per component: hands the visitor a clean deep link — always
 * SITE + a canonical path, never location.href — and flashes `copied` for a
 * beat so the button can confirm without a toast.
 */
export class CopyFeedback {
  copied = $state(false)
  #timer: ReturnType<typeof setTimeout> | undefined

  copy = async (path: string) => {
    try {
      await navigator.clipboard.writeText(SITE + path)
    } catch {
      return // clipboard denied (http, old browser): the permalink is still a click away
    }
    this.copied = true
    clearTimeout(this.#timer)
    this.#timer = setTimeout(() => (this.copied = false), 1500)
  }
}
