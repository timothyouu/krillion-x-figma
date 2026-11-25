import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { cleanDisplayName } from '../lib/names'
import { HighFiveHand } from './HighFiveHand'

const SHAKE_DISTANCE = 9
const SHAKE_REVERSALS = 3
const SHAKE_WINDOW = 700
const PARTNER_RADIUS = 96
const CONTACT_RADIUS = 29
const HAND_SETTLE_MS = 115
const READY_MS = 2100
const HIGH_FIVE_MS = 550
const CONTROL = 'button, a, input, textarea, select, label, [contenteditable], [role="button"], [role="radio"], [data-no-player-cursor]'

interface Point {
  x: number
  y: number
}

interface Partner extends Point {
  element: HTMLElement
  distance: number
}

interface Impact {
  center: Point
  hands: { from: Point; angle: number; color?: string }[]
}

function nearbyPartner({ x, y }: Point): Partner | undefined {
  let nearest: Partner | undefined
  for (const element of document.querySelectorAll<HTMLElement>('.canvas-cursors__cursor')) {
    const rect = element.getBoundingClientRect()
    if (!rect.width) continue
    const tip = { x: rect.left + 2, y: rect.top + 2 }
    const distance = Math.hypot(x - tip.x, y - tip.y)
    if (distance > PARTNER_RADIUS || distance >= (nearest?.distance ?? Infinity)) continue
    if (Number(getComputedStyle(element).opacity) < 0.55) continue
    nearest = { element, ...tip, distance }
  }
  return nearest
}

function handAngle(hand: Element | null | undefined): number {
  if (!hand) return 0
  const transform = getComputedStyle(hand).transform
  if (transform === 'none') return 0
  const matrix = new DOMMatrixReadOnly(transform)
  return Math.atan2(matrix.b, matrix.a) * 180 / Math.PI
}

/** Pointer decoration only. The browser still handles the underlying input and clicks. */
export function CanvasPlayerCursor({ nickname }: { nickname: string }) {
  const pointerRef = useRef<HTMLDivElement>(null)
  const [impact, setImpact] = useState<Impact | null>(null)

  useEffect(() => {
    const pointer = pointerRef.current
    if (!pointer) return
    const root = document.documentElement
    let frame = 0
    let readyTimer = 0
    let settleTimer = 0
    let impactTimer = 0
    let event: PointerEvent | null = null
    let gesture: { time: number; x: number; direction: number; reversals: number } | null = null
    let raisedHand: { element: HTMLElement; since: number } | null = null
    let slapping: { element: HTMLElement; origin: Point } | null = null

    function lowerPartnerHand() {
      window.clearTimeout(settleTimer)
      raisedHand?.element.removeAttribute('data-hand-ready')
      raisedHand?.element.removeAttribute('data-face-right')
      raisedHand = null
    }

    function lowerHands() {
      window.clearTimeout(readyTimer)
      pointer?.removeAttribute('data-ready')
      pointer?.removeAttribute('data-face-right')
      lowerPartnerHand()
      if (root.getAttribute('data-figillion-pointer') === 'hand') {
        root.setAttribute('data-figillion-pointer', 'arrow')
      }
    }

    function clearImpact() {
      window.clearTimeout(impactTimer)
      slapping?.element.removeAttribute('data-high-five')
      slapping = null
      if (root.getAttribute('data-figillion-pointer') === 'slap') {
        root.setAttribute('data-figillion-pointer', 'arrow')
      }
    }

    function hidePointer() {
      window.cancelAnimationFrame(frame)
      frame = 0
      event = null
      gesture = null
      lowerHands()
      pointer?.removeAttribute('data-visible')
      root.removeAttribute('data-figillion-pointer')
    }

    function scheduleUpdate() {
      if (event && !frame) frame = window.requestAnimationFrame(update)
    }

    function trackShake(x: number, now: number) {
      if (!pointer || slapping || pointer.hasAttribute('data-ready')) return
      if (!gesture || now - gesture.time > SHAKE_WINDOW) {
        gesture = { time: now, x, direction: 0, reversals: 0 }
        return
      }
      if (Math.abs(x - gesture.x) < SHAKE_DISTANCE) return
      const direction = Math.sign(x - gesture.x)
      if (gesture.direction && direction !== gesture.direction) gesture.reversals++
      gesture.direction = direction
      gesture.x = x

      if (gesture.reversals >= SHAKE_REVERSALS) {
        gesture = null
        pointer.setAttribute('data-ready', '')
        readyTimer = window.setTimeout(lowerHands, READY_MS)
      }
    }

    function slap(player: Point, partner: Partner) {
      const playerAngle = handAngle(pointer?.querySelector('.canvas-player-cursor__ready'))
      const partnerAngle = handAngle(partner.element.querySelector('.canvas-cursors__hand'))
      lowerHands()
      slapping = { element: partner.element, origin: player }
      partner.element.setAttribute('data-high-five', '')
      const center = { x: (player.x + partner.x) / 2, y: (player.y + partner.y) / 2 }
      setImpact({
        center,
        hands: [
          { from: player, angle: playerAngle },
          { from: { x: partner.x, y: partner.y }, angle: partnerAngle, color: partner.element.style.color },
        ].sort((a, b) => a.from.x - b.from.x),
      })
      impactTimer = window.setTimeout(() => {
        clearImpact()
        setImpact(null)
      }, HIGH_FIVE_MS)
    }

    function answerWithHand(player: Point, now: number) {
      const hit = nearbyPartner(player)
      if (!hit) {
        lowerPartnerHand()
        return
      }

      const playerOnLeft = player.x < hit.x
      pointer?.toggleAttribute('data-face-right', playerOnLeft)

      if (hit.element !== raisedHand?.element) {
        lowerPartnerHand()
        raisedHand = { element: hit.element, since: now }
        hit.element.setAttribute('data-hand-ready', '')
        settleTimer = window.setTimeout(scheduleUpdate, HAND_SETTLE_MS)
      } else if (hit.distance <= CONTACT_RADIUS && now - raisedHand.since >= HAND_SETTLE_MS) {
        slap(player, hit)
        return
      }
      hit.element.toggleAttribute('data-face-right', !playerOnLeft)
    }

    function update(now: number) {
      frame = 0
      if (!event || !pointer) return
      const { target, clientX: x, clientY: y } = event
      if (!(target instanceof Element) || target.closest(CONTROL)) {
        hidePointer()
        return
      }

      trackShake(x, now)
      if (pointer.hasAttribute('data-ready')) answerWithHand({ x, y }, now)

      pointer.style.transform = `translate3d(${x}px, ${y}px, 0)`
      pointer.toggleAttribute('data-flip', x > window.innerWidth - 190)
      pointer.setAttribute('data-visible', '')

      const nearImpact = slapping && Math.hypot(x - slapping.origin.x, y - slapping.origin.y) <= 32
      const mode = nearImpact ? 'slap' : pointer.hasAttribute('data-ready') ? 'hand' : 'arrow'
      if (root.getAttribute('data-figillion-pointer') !== mode) root.setAttribute('data-figillion-pointer', mode)
    }

    function move(next: PointerEvent) {
      if (next.pointerType !== 'mouse' || next.buttons) {
        hidePointer()
        return
      }
      event = next
      scheduleUpdate()
    }

    function leave(event: PointerEvent) {
      if (!event.relatedTarget) hidePointer()
    }

    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerout', leave)
    window.addEventListener('pointerdown', hidePointer)
    window.addEventListener('blur', hidePointer)
    document.addEventListener('visibilitychange', hidePointer)

    return () => {
      hidePointer()
      clearImpact()
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerout', leave)
      window.removeEventListener('pointerdown', hidePointer)
      window.removeEventListener('blur', hidePointer)
      document.removeEventListener('visibilitychange', hidePointer)
    }
  }, [])

  return (
    <>
      <div aria-hidden="true" className="canvas-player-cursor" ref={pointerRef}>
        <span className="canvas-player-cursor__ready"><HighFiveHand /></span>
        {nickname.trim() ? <span className="canvas-player-cursor__name" dir="auto">{cleanDisplayName(nickname)}</span> : null}
      </div>
      {impact ? <HighFiveImpact impact={impact} /> : null}
    </>
  )
}

function HighFiveImpact({ impact: { center, hands } }: { impact: Impact }) {
  return (
    <div aria-hidden="true" className="canvas-high-five" style={{ left: center.x, top: center.y }}>
      {hands.map(({ from, angle, color }, index) => (
        <span
          key={index}
          className={'canvas-high-five__hand canvas-high-five__hand--' + (index === 0 ? 'left' : 'right')}
          style={{
            '--hand-start-x': from.x - center.x + 'px',
            '--hand-start-y': from.y - center.y + 'px',
            '--hand-start-angle': angle + 'deg',
            '--hand-fill': color ? undefined : '#fff',
            color,
          } as CSSProperties}
        >
          <HighFiveHand />
        </span>
      ))}
      <span className="canvas-high-five__spark" />
      <span className="canvas-high-five__spark" />
      <span className="canvas-high-five__spark" />
      <span className="canvas-high-five__spark" />
    </div>
  )
}
