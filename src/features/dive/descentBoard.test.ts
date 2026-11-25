import { describe, expect, it } from 'vitest'
import { CREW } from '../../lib/crew'
import { buildDescentBoard, type BoardItem, type DescentBoardInput } from './descentBoard'

// Synthetic fixtures only: answers here are placeholders, not game content.
function board(overrides: Partial<DescentBoardInput> = {}) {
  return buildDescentBoard({ round: 2, roundCount: 5, playerName: 'Ada', previous: null, depthM: 0, ...overrides })
}

function texts(items: BoardItem[]): string[] {
  return items.flatMap((item) => ('text' in item ? [item.text] : []))
}

describe('buildDescentBoard', () => {
  it('shows the last catch, its stamp and its theme on the near group', () => {
    const { near } = board({ previous: { round: 1, theme: 'THEME_PLACEHOLDER', answer: 'ANSWER_PLACEHOLDER', tier: 'deep_cut' } })
    expect(near).toContainEqual({ kind: 'sticky', text: 'ANSWER_PLACEHOLDER', note: 'THEME_PLACEHOLDER', tone: 'blue' })
    expect(near).toContainEqual({ kind: 'stamp', tier: 'deep_cut' })
  })

  it('says nothing landed after a timeout, and opens the first dive without a catch', () => {
    const timedOut = board({ previous: { round: 1, theme: '', answer: null, tier: null } })
    expect(texts(timedOut.near)).toContain('nothing landed')
    expect(texts(board({ round: 1 }).near)).toContain('First dive')
  })

  it('puts progress and depth on the far group', () => {
    const { far } = board({ round: 3, depthM: 850 })
    expect(texts(far)).toEqual(expect.arrayContaining(['Prompt 3 of 5', '-850 m']))
  })

  it('signs comments with the crew whose cursors roam the canvas', () => {
    for (let round = 1; round <= 5; round++) {
      const comments = [...board({ round }).near, ...board({ round }).far].filter((item) => item.kind === 'comment')
      expect(comments.length).toBeGreaterThan(0)
      for (const comment of comments) expect(CREW).toContainEqual(comment.author)
    }
  })

  it('uses every arrangement once per dive, near and far chosen independently', () => {
    for (const name of ['Ada', 'Review Desk', 'Phone Review', 'Sample Tester']) {
      const dive = [1, 2, 3, 4, 5].map((round) => board({ round, playerName: name }))
      expect(new Set(dive.map((b) => b.nearLayout)).size).toBe(5)
      expect(new Set(dive.map((b) => b.farLayout)).size).toBe(5)
      // The pairing shifts from round to round instead of being locked.
      expect(new Set(dive.map((b) => (b.farLayout - b.nearLayout + 5) % 5)).size).toBeGreaterThan(1)
    }
  })

  it('rebuilds the same board for the same player and round', () => {
    expect(board({ round: 4, playerName: 'Ada' })).toEqual(board({ round: 4, playerName: 'Ada' }))
  })
})
