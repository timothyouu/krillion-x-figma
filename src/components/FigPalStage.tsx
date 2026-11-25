import type { ReactNode } from 'react'
import glowLarge from '../assets/brand/glow-large.svg'
import glowShadow from '../assets/brand/glow-shadow.svg'
import { FigPalAvatar } from './FigPalAvatar'

interface FigPalStageProps {
  slug: string
  avatar?: ReactNode
  /** FigPal width; Oscar's frames use 144. */
  width?: number
  /** Show the big soft glow (home and dive); off for compact uses. */
  glow?: boolean
  bob?: boolean
  className?: string
}

/** The FigPal on its spotlight: radial glow behind, soft floor shadow below (106:9172-9175). */
export function FigPalStage({ slug, avatar, width = 144, glow = true, bob = true, className = '' }: FigPalStageProps) {
  const scale = width / 144
  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      {glow ? (
        <img
          src={glowLarge}
          alt=""
          aria-hidden
          // -z-10: the glow sits under the page's text and controls, as in Oscar's frame
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 max-w-none -translate-x-1/2 -translate-y-1/2"
          // never wider than the viewport, so the glow cannot cause sideways scrolling on tablets
          style={{ width: `min(${1068 * scale}px, 100vw)`, height: 657 * scale }}
        />
      ) : null}
      <div className={`relative z-10 ${bob ? 'animate-bob' : ''}`}>
        {avatar ?? <FigPalAvatar slug={slug} width={width} decorative />}
      </div>
      <img
        src={glowShadow}
        alt=""
        aria-hidden
        className="pointer-events-none relative max-w-none"
        style={{ width: 343 * scale, height: 62 * scale, marginTop: -36 * scale }}
      />
    </div>
  )
}
