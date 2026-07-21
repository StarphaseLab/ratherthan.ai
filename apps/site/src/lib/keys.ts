/** True when a key event targets a text field, so window-level shortcut
    handlers can bow out and let the user type. */
export function isTypingTarget(event: KeyboardEvent): boolean {
  return (
    event.target instanceof HTMLElement && /^(input|textarea|select)$/i.test(event.target.tagName)
  )
}
