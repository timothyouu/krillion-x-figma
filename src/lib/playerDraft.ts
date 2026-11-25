// Remembers the last name and FigPal typed on this device, as a convenience only.
// The server's player row is the record; this can be empty or unavailable at any time.

const KEY = 'figillion-draft'

export interface PlayerDraft {
  name: string
  figpal: string | null
}

export function loadDraft(): PlayerDraft {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return { name: '', figpal: null }
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return { name: '', figpal: null }
    const { name, figpal } = parsed as Record<string, unknown>
    return { name: typeof name === 'string' ? name : '', figpal: typeof figpal === 'string' ? figpal : null }
  } catch {
    return { name: '', figpal: null }
  }
}

export function saveDraft(draft: PlayerDraft): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    // storage blocked: nothing to do
  }
}
