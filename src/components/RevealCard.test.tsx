import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { sinkDurationMs } from '../features/dive/diveMotion'
import { RevealCard } from './RevealCard'
import type { RevealData } from '../features/dive/diveMachine'

const landed: RevealData = {
  round: 2,
  accepted: true,
  answer: 'ANSWER_PLACEHOLDER',
  yourInput: 'answr_placeholder',
  tier: 'deep_cut',
  tierLabel: 'Deep Cut',
  tierDescription: 'Seriously deep in the docs.',
  points: 85,
  depthM: 850,
}

describe('RevealCard', () => {
  it('shows the tier word, points, pan distance and the typo the server forgave', () => {
    render(<RevealCard reveal={landed} roundCount={5} promptText="PROMPT_PLACEHOLDER" />)
    expect(screen.getByRole('heading', { name: 'deep cut' })).toBeInTheDocument()
    expect(screen.getByText(/\+85 pts/i)).toBeInTheDocument()
    expect(screen.getByText(/pan 850 px/)).toBeInTheDocument()
    expect(screen.getByText('Seriously deep in the docs.')).toBeInTheDocument()
    expect(screen.getByText(/Autocorrected from/)).toHaveTextContent('answr_placeholder')
  })

  it('autocorrects the typed text into the accepted answer on the chip', () => {
    const { container } = render(<RevealCard reveal={landed} roundCount={5} promptText={null} />)
    expect(container.querySelector('.chip-autocorrect__typed')?.textContent).toBe('answr_placeholder')
    expect(container.querySelector('.chip-autocorrect__fixed')?.textContent).toBe('ANSWER_PLACEHOLDER')
    expect(screen.getByText(/Autocorrected from/)).toBeInTheDocument()
  })

  it('does not autocorrect when only the letter case differs', () => {
    const { container } = render(<RevealCard reveal={{ ...landed, yourInput: 'answer_placeholder' }} roundCount={5} promptText={null} />)
    expect(container.querySelector('.chip-autocorrect')).toBeNull()
    expect(screen.queryByText(/Autocorrected from/)).toBeNull()
  })

  it('announces a landed verdict when the chip lands, not while it falls', () => {
    vi.useFakeTimers()
    try {
      const { container } = render(<RevealCard reveal={landed} roundCount={5} promptText={null} />)
      const live = container.querySelector('[aria-live="polite"]')
      expect(live?.textContent).toBe('')
      act(() => {
        vi.advanceTimersByTime(sinkDurationMs('deep_cut'))
      })
      expect(live?.textContent).toMatch(/Landed deep cut\. 85 points/)
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows "nothing landed" when the clock won', () => {
    render(
      <RevealCard
        reveal={{ ...landed, accepted: false, answer: null, tier: null, tierLabel: null, tierDescription: null, points: 0, depthM: 0 }}
        roundCount={5}
        promptText={null}
      />,
    )
    expect(screen.getByRole('heading', { name: 'nothing landed' })).toBeInTheDocument()
    expect(screen.getByText(/the clock beat you to it/)).toBeInTheDocument()
  })
})
