import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
  it('shows the tier word, points, sink depth and the typo the server forgave', () => {
    render(<RevealCard reveal={landed} roundCount={5} promptText="PROMPT_PLACEHOLDER" />)
    expect(screen.getByRole('heading', { name: 'deep cut' })).toBeInTheDocument()
    expect(screen.getByText(/\+85 pts/i)).toBeInTheDocument()
    expect(screen.getByText(/sink 850 m/)).toBeInTheDocument()
    expect(screen.getByText('Seriously deep in the docs.')).toBeInTheDocument()
    expect(screen.getByText(/answr_placeholder/)).toBeInTheDocument()
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
