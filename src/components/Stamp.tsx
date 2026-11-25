import type { CSSProperties } from 'react'
import { NO_ECHO, getTier } from '../lib/tiers'
import type { TierKey } from '../lib/types'
import starStamp from '../assets/stamps/star.png'
import heartStamp from '../assets/stamps/heart.png'
import dotStamp from '../assets/stamps/dot.png'
import plusOneStamp from '../assets/stamps/plus-one.png'
import thumbsUpStamp from '../assets/stamps/thumbs-up.png'
import thumbsDownStamp from '../assets/stamps/thumbs-down.png'
import questionStamp from '../assets/stamps/question.png'
import { SelectionFrame } from './SelectionFrame'

export type StampKind = 'star' | 'heart' | 'dot' | 'plus-one' | 'thumbs-up' | 'thumbs-down' | 'question'

const STAMP_SRC: Record<StampKind, string> = {
  star: starStamp,
  heart: heartStamp,
  dot: dotStamp,
  'plus-one': plusOneStamp,
  'thumbs-up': thumbsUpStamp,
  'thumbs-down': thumbsDownStamp,
  question: questionStamp,
}

interface StampProps {
  /** A tier's stamp, "no_echo", or a decorative stamp kind. */
  tier?: TierKey | 'no_echo'
  kind?: StampKind
  size: number
  rotate?: number
  /** Play the "pressed onto the canvas" entrance. */
  press?: boolean
  /** Preview this canvas stamp on hover. It remains decorative, with no click action. */
  hoverable?: boolean
  label?: string
  className?: string
  style?: CSSProperties
}

/** Oscar's FigJam-style stamps. Decorative unless given a label. */
export function Stamp({ tier, kind, size, rotate = 0, press = false, hoverable = false, label, className = '', style }: StampProps) {
  let src = kind ? STAMP_SRC[kind] : STAMP_SRC.star
  if (tier === 'no_echo') src = NO_ECHO.stamp
  else if (tier) src = getTier(tier).stamp
  const rotation = rotate + 'deg'
  const image = (
    <img
      src={src}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      width={size}
      height={size}
      draggable={false}
      className={`pointer-events-none select-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.12)] ${press ? 'animate-stamp' : ''} ${hoverable ? 'block size-full' : className}`}
      style={hoverable ? { rotate: rotation } : { width: size, height: size, rotate: rotation, ...style }}
    />
  )
  if (!hoverable) return image

  return (
    <div className={`stamp-preview ${className}`} style={{ width: size, height: size, ...style }}>
      <div className="stamp-preview__art">
        {image}
        <SelectionFrame className="stamp-preview__frame">
          <span aria-hidden="true" />
        </SelectionFrame>
      </div>
    </div>
  )
}
