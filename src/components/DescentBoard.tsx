import type { CSSProperties } from 'react'
import bulb from '../assets/emoji/bulb.png'
import eyes from '../assets/emoji/eyes.png'
import flyingSaucer from '../assets/emoji/flying-saucer.png'
import partyPopper from '../assets/emoji/party-popper.png'
import raisedHands from '../assets/emoji/raised-hands.png'
import rocket from '../assets/emoji/rocket.png'
import { buildDescentBoard, type BoardEmoji, type BoardItem, type DescentBoardInput } from '../features/dive/descentBoard'
import { Stamp } from './Stamp'

const EMOJI_SRC: Record<BoardEmoji, string> = {
  bulb,
  eyes,
  'flying-saucer': flyingSaucer,
  'party-popper': partyPopper,
  'raised-hands': raisedHands,
  rocket,
}

/** The FigJam board the canvas pans past on each descent: your last catch, your depth, the crew. */
export function DescentBoard(props: DescentBoardInput) {
  const { near, far, nearLayout, farLayout } = buildDescentBoard(props)

  return (
    <div className="dive-board" aria-hidden="true" data-near={nearLayout} data-far={farLayout}>
      <div className="dive-board__section dive-board__section--far">
        <BoardItems items={far} />
      </div>
      <div className="dive-board__section dive-board__section--near">
        <BoardItems items={near} />
      </div>
    </div>
  )
}

function BoardItems({ items }: { items: readonly BoardItem[] }) {
  return items.map((item, position) => (
    <div className="dive-board__item" key={position}>
      <BoardObject item={item} />
    </div>
  ))
}

function BoardObject({ item }: { item: BoardItem }) {
  switch (item.kind) {
    case 'sticky':
      return (
        <div className="dive-board__sticky" data-tone={item.tone}>
          <span className="dive-board__sticky-text">{item.text}</span>
          <span className="dive-board__sticky-note">{item.note}</span>
        </div>
      )
    case 'stamp':
      return <Stamp tier={item.tier} size={68} rotate={-9} className="dive-board__sticker" style={{ height: 'auto' }} />
    case 'sticker':
      return <Stamp kind={item.stamp} size={68} rotate={-9} className="dive-board__sticker" style={{ height: 'auto' }} />
    case 'emoji':
      return <img className="dive-board__emoji" src={EMOJI_SRC[item.emoji]} alt="" width={72} height={72} draggable={false} />
    case 'comment':
      return (
        <div className="dive-board__comment" style={{ '--author-color': item.author.color } as CSSProperties}>
          <span className="dive-board__avatar">{item.author.name.slice(0, 1)}</span>
          <span className="dive-board__comment-body">
            <span className="dive-board__author">{item.author.name}</span>
            <span>{item.text}</span>
          </span>
        </div>
      )
    case 'connector':
      return <div className="dive-board__connector" />
  }
}
