import { getFigPal } from '../lib/figpals'

interface FigPalAvatarProps {
  slug: string | null | undefined
  /** Width in px; height follows the 768:880 artboard. */
  width: number
  className?: string
  decorative?: boolean
}

export const FIGPAL_ASPECT = 880 / 768

export function FigPalAvatar({ slug, width, className = '', decorative = false }: FigPalAvatarProps) {
  const figpal = getFigPal(slug)
  return (
    <img
      src={figpal.src}
      alt={decorative ? '' : figpal.name}
      aria-hidden={decorative ? true : undefined}
      width={width}
      height={Math.round(width * FIGPAL_ASPECT)}
      draggable={false}
      className={`select-none ${className}`}
      style={{ width, height: Math.round(width * FIGPAL_ASPECT) }}
    />
  )
}
