import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { cleanDisplayName } from '../lib/names'
import { HighFiveHand } from './HighFiveHand'

const SHAKE_DISTANCE = 9
const SHAKE_REVERSALS = 3
const SHAKE_WINDOW = 700
const PARTNER_RADIUS = 96
const TOUCH_PARTNER_RADIUS = 56
const CONTACT_RADIUS = 29
/** After a high five, pull apart this far before the same pair can slap again. */
const REARM_DISTANCE = 48
const HAND_SETTLE_MS = 115
const READY_MS = 2100
const HAND_LOWER_MS = 260
/** The merged palms play for 480 ms; the cursor hands return under each pointer at 360 ms. */
const RETURN_MS = 360
const IMPACT_MS = 700
const REDUCED_IMPACT_MS = 400
const TOUCH_HOLD_MS = 350
const TOUCH_SLOP = 10
const TOUCH_RAISE_MS = 140
const CONTROL = 'button, a, input, textarea, select, label, [contenteditable], [role="button"], [role="radio"], [data-no-player-cursor]'

interface Point {
  x: number
  y: number
}

interface Partner extends Point {
  element: HTMLElement
  distance: number
}

interface ImpactHand {
  from: Point
  angle: number
  color?: string
  /** Mirror the outline so the palm faces the other hand. */
  facesRight: boolean
}

interface Impact {
  id: number
  center: Point
  /** The player's hand draws in front, as in FigJam. */
  front: ImpactHand
  back: ImpactHand
}

function nearbyPartner({ x, y }: Point, radius = PARTNER_RADIUS): Partner | undefined {
  let nearest: Partner | undefined
  for (const element of document.querySelectorAll<HTMLElement>('.canvas-cursors__cursor')) {
    const rect = element.getBoundingClientRect()
    if (!rect.width) continue
    const tip = { x: rect.left + 2, y: rect.top + 2 }
    const distance = Math.hypot(x - tip.x, y - tip.y)
    if (distance > radius || distance >= (nearest?.distance ?? Infinity)) continue
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

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/** Pointer decoration only. The browser still handles the underlying input and clicks. */
export function CanvasPlayerCursor({ nickname }: { nickname: string }) {
  const pointerRef = useRef<HTMLDivElement>(null)
  const [impact, setImpact] = useState<Impact | null>(null)

  useEffect(() => {
    const pointer = pointerRef.current
    if (!pointer) return
    const root = document.documentElement
    const timers = new Set<number>()
    let frame = 0
    let readyTimer = 0
    let settleTimer = 0
    let event: PointerEvent | null = null
    let gesture: { time: number; x: number; direction: number; reversals: number } | null = null
    let raisedHand: { element: HTMLElement; since: number } | null = null
    let slapping: HTMLElement | null = null
    let needsSeparation: HTMLElement | null = null
    let hold: { id: number; start: Point; timer: number } | null = null
    let impactId = 0

    function later(callback: () => void, ms: number): number {
      const id = window.setTimeout(() => {
        timers.delete(id)
        callback()
      }, ms)
      timers.add(id)
      return id
    }

    /** A partner's hand waves once more on its way down, then the arrow comes back. */
    function lowerHandOf(element: HTMLElement) {
      if (!element.hasAttribute('data-hand-ready') || element.hasAttribute('data-hand-lowering')) return
      element.setAttribute('data-hand-lowering', '')
      later(() => {
        if (!element.hasAttribute('data-hand-lowering')) return
        element.removeAttribute('data-hand-lowering')
        element.removeAttribute('data-hand-ready')
        element.removeAttribute('data-hand-return')
        element.removeAttribute('data-face-right')
      }, prefersReducedMotion() ? 0 : HAND_LOWER_MS)
    }

    function raiseHandOf(element: HTMLElement) {
      element.removeAttribute('data-hand-lowering')
      element.setAttribute('data-hand-ready', '')
    }

    function lowerPartnerHand() {
      window.clearTimeout(settleTimer)
      if (raisedHand && raisedHand.element !== slapping) lowerHandOf(raisedHand.element)
      raisedHand = null
    }

    function lowerHands() {
      window.clearTimeout(readyTimer)
      pointer?.removeAttribute('data-ready')
      pointer?.removeAttribute('data-face-right')
      pointer?.removeAttribute('data-hand-return')
      lowerPartnerHand()
      needsSeparation = null
      if (root.getAttribute('data-figillion-pointer') === 'hand') {
        root.setAttribute('data-figillion-pointer', 'arrow')
      }
    }

    function keepHandRaised() {
      window.clearTimeout(readyTimer)
      readyTimer = window.setTimeout(lowerHands, READY_MS)
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
      if (!pointer || pointer.hasAttribute('data-ready')) return
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
        keepHandRaised()
      }
    }

    /**
     * Contact. Like FigJam, both palms merge at the midpoint and grow for a moment, then shrink back
     * to each cursor. Both cursors stay in hand mode, so the pair can high five again.
     */
    function slap(player: Point, partner: Partner, playerAngle: number) {
      const partnerAngle = handAngle(partner.element.querySelector('.canvas-cursors__hand'))
      const playerOnLeft = player.x < partner.x
      const reduced = prefersReducedMotion()
      slapping = partner.element
      needsSeparation = partner.element
      partner.element.setAttribute('data-high-five', '')
      pointer?.setAttribute('data-slapping', '')
      const id = ++impactId
      setImpact({
        id,
        center: { x: (player.x + partner.x) / 2, y: (player.y + partner.y) / 2 },
        front: { from: player, angle: playerAngle, facesRight: playerOnLeft },
        back: { from: { x: partner.x, y: partner.y }, angle: partnerAngle, color: partner.element.style.color, facesRight: !playerOnLeft },
      })

      const returnAt = reduced ? REDUCED_IMPACT_MS : RETURN_MS
      later(() => {
        if (impactId !== id) return
        slapping = null
        pointer?.removeAttribute('data-slapping')
        partner.element.removeAttribute('data-high-five')
        if (pointer?.hasAttribute('data-ready')) pointer.setAttribute('data-hand-return', '')
        raiseHandOf(partner.element)
        partner.element.setAttribute('data-hand-return', '')
        raisedHand = { element: partner.element, since: performance.now() }
      }, returnAt)
      later(() => {
        if (impactId === id) setImpact(null)
      }, reduced ? REDUCED_IMPACT_MS : IMPACT_MS)
    }

    function answerWithHand(player: Point, now: number) {
      if (slapping) return
      const hit = nearbyPartner(player)
      if (!hit) {
        lowerPartnerHand()
        needsSeparation = null
        return
      }

      const playerOnLeft = player.x < hit.x
      pointer?.toggleAttribute('data-face-right', playerOnLeft)
      if (needsSeparation === hit.element && hit.distance >= REARM_DISTANCE) needsSeparation = null

      if (hit.element !== raisedHand?.element) {
        lowerPartnerHand()
        raisedHand = { element: hit.element, since: now }
        raiseHandOf(hit.element)
        settleTimer = window.setTimeout(scheduleUpdate, HAND_SETTLE_MS)
      } else if (hit.distance <= CONTACT_RADIUS && now - raisedHand.since >= HAND_SETTLE_MS && needsSeparation !== hit.element) {
        slap(player, hit, handAngle(pointer?.querySelector('.canvas-player-cursor__ready')))
        keepHandRaised()
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

      const mode = pointer.hasAttribute('data-ready') ? 'hand' : 'arrow'
      if (root.getAttribute('data-figillion-pointer') !== mode) root.setAttribute('data-figillion-pointer', mode)
    }

    function cancelHold() {
      if (!hold) return
      window.clearTimeout(hold.timer)
      hold = null
    }

    /** Touch has no hover pointer: press and hold a roaming cursor to high five it. */
    function startHold(down: PointerEvent) {
      cancelHold()
      if (slapping || !(down.target instanceof Element) || down.target.closest(CONTROL)) return
      const start = { x: down.clientX, y: down.clientY }
      if (!nearbyPartner(start, TOUCH_PARTNER_RADIUS)) return
      hold = {
        id: down.pointerId,
        start,
        timer: later(() => {
          hold = null
          const partner = nearbyPartner(start, TOUCH_PARTNER_RADIUS)
          if (!partner || slapping) return
          raiseHandOf(partner.element)
          partner.element.toggleAttribute('data-face-right', start.x > partner.x)
          later(() => {
            const target = nearbyPartner(start, TOUCH_PARTNER_RADIUS + 24)
            if (!target) {
              lowerHandOf(partner.element)
              return
            }
            slap(start, target, 0)
            later(() => lowerHandOf(target.element), READY_MS)
          }, TOUCH_RAISE_MS)
        }, TOUCH_HOLD_MS),
      }
    }

    function moveHold(next: PointerEvent) {
      if (hold && next.pointerId === hold.id && Math.hypot(next.clientX - hold.start.x, next.clientY - hold.start.y) > TOUCH_SLOP) cancelHold()
    }

    function move(next: PointerEvent) {
      if (next.pointerType !== 'mouse') {
        moveHold(next)
        return
      }
      if (next.buttons) {
        hidePointer()
        return
      }
      event = next
      scheduleUpdate()
    }

    function down(next: PointerEvent) {
      if (next.pointerType === 'mouse') hidePointer()
      else startHold(next)
    }

    function leave(event: PointerEvent) {
      if (event.pointerType === 'mouse' && !event.relatedTarget) hidePointer()
    }

    function hideAll() {
      cancelHold()
      hidePointer()
    }

    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerout', leave)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', cancelHold)
    window.addEventListener('pointercancel', cancelHold)
    window.addEventListener('blur', hideAll)
    document.addEventListener('visibilitychange', hideAll)

    return () => {
      hideAll()
      timers.forEach((id) => window.clearTimeout(id))
      if (slapping) slapping.removeAttribute('data-high-five')
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerout', leave)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', cancelHold)
      window.removeEventListener('pointercancel', cancelHold)
      window.removeEventListener('blur', hideAll)
      document.removeEventListener('visibilitychange', hideAll)
    }
  }, [])

  return (
    <>
      <div aria-hidden="true" className="canvas-player-cursor" ref={pointerRef}>
        <span className="canvas-player-cursor__ready"><HighFiveHand /></span>
        {nickname.trim() ? <span className="canvas-player-cursor__name" dir="auto">{cleanDisplayName(nickname)}</span> : null}
      </div>
      {impact ? <HighFiveImpact key={impact.id} impact={impact} /> : null}
    </>
  )
}

const BURST_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]
const STARS = [
  { x: -62, y: -30, delay: 40 },
  { x: -44, y: 38, delay: 90 },
  { x: -8, y: -64, delay: 60 },
  { x: 30, y: 52, delay: 110 },
  { x: 58, y: -36, delay: 50 },
  { x: 70, y: 18, delay: 100 },
]

function palmStyle(hand: ImpactHand, center: Point, restX: number, restAngle: number): CSSProperties {
  return {
    '--from-x': hand.from.x - center.x + 'px',
    '--from-y': hand.from.y - center.y + 'px',
    '--from-angle': hand.angle + 'deg',
    '--rest-x': restX + 'px',
    '--rest-angle': restAngle + 'deg',
    '--hand-fill': hand.color ? undefined : '#fff',
    color: hand.color,
  } as CSSProperties
}

function HighFiveImpact({ impact: { center, front, back } }: { impact: Impact }) {
  // The front (player) palm sits on its own side of the contact point; the back palm overlaps it.
  const frontSide = front.facesRight ? -1 : 1
  return (
    <div aria-hidden="true" className="canvas-high-five" style={{ left: center.x, top: center.y }}>
      <span className="canvas-high-five__halo" />
      <span className="canvas-high-five__burst">
        {BURST_ANGLES.map((angle) => (
          <i key={angle} style={{ '--tick-angle': angle + 'deg' } as CSSProperties} />
        ))}
      </span>
      <span
        className={'canvas-high-five__palm canvas-high-five__palm--back' + (back.facesRight ? ' canvas-high-five__palm--mirror' : '')}
        style={palmStyle(back, center, -frontSide * 13, -frontSide * 8)}
      >
        <HighFiveHand />
      </span>
      <span
        className={'canvas-high-five__palm canvas-high-five__palm--front' + (front.facesRight ? ' canvas-high-five__palm--mirror' : '')}
        style={palmStyle(front, center, frontSide * 13, frontSide * 8)}
      >
        <HighFiveHand />
      </span>
      {STARS.map((star, index) => (
        <span
          key={index}
          className="canvas-high-five__star"
          style={{ '--star-x': star.x + 'px', '--star-y': star.y + 'px', '--star-delay': star.delay + 'ms' } as CSSProperties}
        />
      ))}
    </div>
  )
}
