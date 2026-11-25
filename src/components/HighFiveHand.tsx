const HAND_OUTLINE = 'M13 29C8.5 27 5.4 23.5 4.5 19.5L3.2 14.8a2.2 2.2 0 0 1 4.2-1.3l1.8 4.1V7.4a2.05 2.05 0 0 1 4.1 0v5.7-8.3a2.08 2.08 0 0 1 4.16 0v8.1-6.8a2.05 2.05 0 0 1 4.1 0v8.5-5.2a2 2 0 0 1 4 0v10.2c0 6-3.5 10-8.5 10-1.3 0-2.8-.2-4.1-.6Z'

export function HighFiveHand() {
  return (
    <svg aria-hidden="true" width="34" height="34" viewBox="0 0 34 34" fill="none">
      <g transform="rotate(-25 17 18)">
        <path
          d={HAND_OUTLINE}
          stroke="white"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />
        <path
          d={HAND_OUTLINE}
          fill="var(--hand-fill, color-mix(in srgb, currentColor 24%, white))"
          stroke="#24272e"
          strokeWidth="1.65"
          strokeLinejoin="round"
        />
        <path d="M10 20c2.6-1.7 5.8-1 7.2 1.6" stroke="#24272e" strokeWidth="1.45" strokeLinecap="round" />
      </g>
    </svg>
  )
}
