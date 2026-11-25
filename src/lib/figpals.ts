// FigPals exported from Figma "ALL FIGPALS" (73:804), in the order Oscar's picker shows them.
// The slug is what players.figpal_slug stores; it must match /^[a-z0-9-]{1,40}$/.

const modules = import.meta.glob<string>('../assets/figpals/*.svg', { eager: true, import: 'default' })

export interface FigPal {
  slug: string
  name: string
  src: string
}

const ORDER: readonly [slug: string, name: string][] = [
  ['figgy', 'Figgy'],
  ['pufferfish', 'Pufferfish'],
  ['pencil', 'Pencil'],
  ['rock', 'Rock'],
  ['rainbow', 'Rainbow'],
  ['mug', 'Mug'],
  ['dumpling', 'Dumpling'],
  ['bird', 'Bird'],
  ['elephant', 'Elephant'],
  ['dog', 'Dog'],
  ['duck', 'Duck'],
  ['capybara', 'Capybara'],
  ['frog', 'Frog'],
  ['bread', 'Bread'],
  ['boba', 'Boba'],
  ['cloud', 'Cloud'],
  ['fruit', 'Blueberry'],
  ['cursor', 'Cursor'],
  ['cat', 'Cat'],
  ['flower', 'Sunflower'],
  ['mushroom', 'Mushroom'],
  ['caterpillar', 'Caterpillar'],
  ['star', 'Star'],
  ['bok-choy', 'Bok Choy'],
  ['fish', 'Fish'],
]

function srcFor(slug: string): string | undefined {
  return modules[`../assets/figpals/${slug}.svg`]
}

export const FIGPALS: readonly FigPal[] = ORDER.flatMap(([slug, name]) => {
  const src = srcFor(slug)
  return src ? [{ slug, name, src }] : []
})

export const DEFAULT_FIGPAL = 'figgy'

/** Unknown slugs (e.g. from an older build) fall back to Figgy. */
export function getFigPal(slug: string | null | undefined): FigPal {
  const found = FIGPALS.find((f) => f.slug === slug)
  const fallback = FIGPALS[0]
  if (found) return found
  if (!fallback) throw new Error('No FigPal assets found')
  return fallback
}
