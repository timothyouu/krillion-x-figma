import bulb from '../assets/emoji/bulb.png'
import eyes from '../assets/emoji/eyes.png'
import flyingSaucer from '../assets/emoji/flying-saucer.png'
import partyPopper from '../assets/emoji/party-popper.png'
import raisedHands from '../assets/emoji/raised-hands.png'
import rocket from '../assets/emoji/rocket.png'
import { Stamp, type StampKind } from './Stamp'

type BoardItem =
  | { kind: 'sticky'; text: string; tone: 'yellow' | 'blue' | 'pink' | 'green' }
  | { kind: 'comment'; text: string; initials: string }
  | { kind: 'emoji'; src: string }
  | { kind: 'sticker'; stamp: StampKind }
  | { kind: 'connector' }

const nearSections = [
  [
    { kind: 'sticky', text: 'Wild ideas', tone: 'yellow' },
    { kind: 'emoji', src: eyes },
    { kind: 'comment', initials: 'A', text: 'Try this one' },
  ],
  [
    { kind: 'sticker', stamp: 'heart' },
    { kind: 'sticky', text: 'Keep exploring', tone: 'pink' },
    { kind: 'sticky', text: 'What if…', tone: 'blue' },
  ],
  [
    { kind: 'sticky', text: 'Vote here', tone: 'green' },
    { kind: 'sticker', stamp: 'plus-one' },
    { kind: 'emoji', src: raisedHands },
  ],
  [
    { kind: 'comment', initials: 'C', text: 'Connect these?' },
    { kind: 'connector' },
    { kind: 'sticky', text: 'Next steps', tone: 'blue' },
  ],
  [
    { kind: 'emoji', src: rocket },
    { kind: 'sticky', text: 'Big swings', tone: 'pink' },
    { kind: 'sticker', stamp: 'star' },
  ],
] as const satisfies readonly (readonly BoardItem[])[]

const farSections = [
  [
    { kind: 'sticker', stamp: 'question' },
    { kind: 'sticky', text: 'Open questions', tone: 'pink' },
    { kind: 'emoji', src: bulb },
  ],
  [
    { kind: 'sticky', text: 'Make it real', tone: 'green' },
    { kind: 'connector' },
    { kind: 'sticker', stamp: 'star' },
  ],
  [
    { kind: 'comment', initials: 'M', text: 'Love this' },
    { kind: 'sticker', stamp: 'thumbs-up' },
    { kind: 'sticky', text: 'Team picks', tone: 'yellow' },
  ],
  [
    { kind: 'sticky', text: 'Parking lot', tone: 'pink' },
    { kind: 'emoji', src: flyingSaucer },
    { kind: 'sticky', text: 'Save for later', tone: 'yellow' },
  ],
  [
    { kind: 'sticky', text: 'Good finds', tone: 'blue' },
    { kind: 'comment', initials: 'J', text: 'More of this!' },
    { kind: 'emoji', src: partyPopper },
  ],
] as const satisfies readonly (readonly BoardItem[])[]

export function DescentBoard({ round, playerName }: { round: number; playerName: string }) {
  // A resumed dive keeps its board sequence even when the canvas remounts.
  let startIndex = 0
  for (const character of playerName) {
    startIndex = (startIndex * 31 + character.charCodeAt(0)) % nearSections.length
  }
  const index = startIndex + round - 1
  const near = nearSections[index % nearSections.length] ?? nearSections[0]
  // Offset the pairing on each lap so longer games continue to see new combinations.
  const far = farSections[(index + Math.floor((round - 1) / nearSections.length)) % farSections.length] ?? farSections[0]

  return (
    <div className="dive-board" aria-hidden="true">
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
      {item.kind === 'sticky' && <div className="dive-board__sticky" data-tone={item.tone}>{item.text}</div>}
      {item.kind === 'sticker' && <Stamp kind={item.stamp} size={68} rotate={-9} className="dive-board__sticker" style={{ height: 'auto' }} />}
      {item.kind === 'emoji' && <img className="dive-board__emoji" src={item.src} alt="" width={72} height={72} draggable={false} />}
      {item.kind === 'comment' && (
        <div className="dive-board__comment">
          <span className="dive-board__avatar">{item.initials}</span>
          <span>{item.text}</span>
        </div>
      )}
      {item.kind === 'connector' && <div className="dive-board__connector" />}
    </div>
  ))
}
