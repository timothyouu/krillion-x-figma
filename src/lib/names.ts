export const DISPLAY_NAME_MAX = 24

/** Same normalisation join_game applies: collapse whitespace, trim. */
export function cleanDisplayName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}

export function isValidDisplayName(raw: string): boolean {
  const name = cleanDisplayName(raw)
  return name.length >= 1 && name.length <= DISPLAY_NAME_MAX
}
