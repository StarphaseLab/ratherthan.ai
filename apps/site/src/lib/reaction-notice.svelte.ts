import type { SubmitFunction } from '@sveltejs/kit'

/**
 * Surfaces react-action failures that bare `use:enhance` swallows: without
 * this, a rate-limited or cookieless click just looks dead — the count never
 * moves and nothing says why. One instance per component; the message clears
 * itself after a beat.
 */
export class ReactionNotice {
  message = $state('')
  #timer: ReturnType<typeof setTimeout> | undefined

  submit: SubmitFunction = () => {
    return async ({ result, update }) => {
      if (result.type === 'failure' || result.type === 'error') {
        const data = result.type === 'failure' ? result.data : undefined
        this.message =
          typeof data?.message === 'string' ? data.message : 'That didn’t land — try again.'
        clearTimeout(this.#timer)
        this.#timer = setTimeout(() => (this.message = ''), 5000)
      } else {
        this.message = ''
        await update()
      }
    }
  }
}
