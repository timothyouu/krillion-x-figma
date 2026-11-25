# Figillion: design system

Source of truth: Oscar's section in Figma file `QLmoeEgdhjwgqjQhcbopeq` (home 106:9171, figpal selection 10:8249, questions 108:12887, assets 119:2557) and the Figma for Edu Brand Book page. Tokens live in `src/index.css` (`@theme`).

## The world in one line

The game is played **on a Figma canvas**: light gray grid, white frames with nametag tabs, FigJam stamps stuck on top, the blue selection box marking whatever is active, and a ruler down the right edge that measures how deep you are.

## Color

Restrained: neutrals plus one interactive accent; tier colors appear only where a tier is being shown.

| Token | Value | Use |
|---|---|---|
| `canvas` | `#f5f5f5` + grid PNG | page ground (Oscar's grid tile, 1280 px scale) |
| `paper` | `#ffffff` | cards, inputs, timer |
| `line` | `#e5e5e5` | card borders, timer ghost digits, bar tracks |
| `mute` | `#7b7b7b` | ruler, time bar fill, small labels |
| `ink-soft` | `#3f3f3f` | secondary copy |
| `ink` / `ink-strong` | `#000` / `#161616` | text, lit timer digits |
| `select` | `#009cff` | buttons, selection frames, YOU marker, focus ring |
| `select-deep` | `#00609c` | button edge and arrow glyphs |
| `select-ice` | `#e6f6ff` | button label, text selection |

### Tier system

Each tier is a **stamp plus a lowercase word-mark** (Oscar's assets section), never color alone.

| Tier | Points | Depth | Stamp | Color |
|---|---:|---:|---|---|
| common | 10 | -100 m | Dot (pink) | `#ffa5dc` |
| overplayed | 15 | -150 m | Two FigPal Cursors | `#ff9e42` |
| uncommon | 30 | -300 m | Thumbs up | `#14ae5c` |
| rare | 60 | -600 m | Heart | `#ff7262` |
| deep cut | 85 | -850 m | +1 | `#9747ff` |
| figlion | 100 | -1,000 m | Star | `#ffc700` |
| no echo (rejection, not a tier) | 0 | | Thumbs down | `#0d99ff` |

Overplayed uses two copies of the FigPal Cursor from Oscar’s assets, with an orange fill and a white sticker outline.

## Type

Oscar uses Figma Sans VF and Figma Mono VF, which are not licensed for the web. Closest Google Fonts stand-ins: **Instrument Sans** and **IBM Plex Mono**, loaded in `index.html`. The 1280 × 832 comparisons favored Instrument Sans for body width and stroke weight and IBM Plex Mono for prompt width and letter height. The timer's "Digital Numbers" face is replaced by an SVG seven-segment component (`SevenSegment`) with ghosted "00" segments, matching his look without a font.

| Role | Face | Size (desktop) |
|---|---|---|
| Game title | mono 400 | 80 px |
| Prompt | mono 500 | 50 px (40 tablet, 32 phone) |
| Kicker line ("Figma for Edu") | sans 400 | 40 px |
| Body / sub-line | sans 400 | 20 px, `ink-soft` |
| Nametag | sans 500 | 15 px |
| Button | mono 400 caps | 20 px |
| Ruler labels | mono 400 | 10 px, rotated -90° |

## Components (Figma node → code)

- **Nametag** (83:5286) → `Nametag`: white tab with 1 px `line` border, 5 px radius; `select` tone is the blue FigPal name chip.
- **Card**: nametag tab, 5 px gap, white frame with 1 px `line` border, square corners, generous padding (64 px desktop).
- **Button** (116:2294) → `FigButton`: `select` fill, `select-deep` edge, 8 px radius, 12 px padding, mono caps; arrows both sides (Begin Descent / Descend / Surface) or trailing enter glyph (Enter).
- **Selection frame** → `SelectionFrame`: 2 px `select` border with four 8 px square handles. Marks the one active thing: the answer box, the name box, the chosen FigPal, your row in the Catch, your row on the leaderboard.
- **Timer** (108:12992) → `Timer`: white pill, seven-segment digits. Blue during the 3 s countdown, orange in the last 5 s.
- **Answer box + progress** (108:11973, 108:11975) → `AnswerInput`.
- **Milestones + marker** (116:2482, 106:9000) → `DepthGauge`: tick every 22 px (100 m), medium every 5, labelled every 10 (1,000 m). The ruler slides up as you sink; YOU stays put.
- **charaSelect + figpal** (83:12724, 83:5336) → `FigPalPicker`: 5-up grid, selected = selection frame + blue name chip, hover = frame only.
- **Stamps** → `Stamp`: tier stamps and decoration. Decorative stamps are `aria-hidden`.

## Screens Oscar did not draw

- **Reveal** (`RevealCard`, `TierLadder`): same card as the prompt. Left, a ladder of the six tiers (stamp + word + points + depth) under a "surface" line; the answer rides down in a selection frame and stops on its tier, which tints with the tier color. Right, the tier stamp presses on beside the word-mark, `+N PTS · sink N m`, the description, and "You typed …" when the server forgave a typo. A miss keeps the chip at the surface: "nothing landed · +0 PTS · the clock beat you to it."
- **No echo**: thumbs-down stamp pressed beside `"input": no echo. try again`, directly above the answer box.
- **Results**: nametagged cards on the canvas. Surfaced (score/500, depth, The Bearing with its tier stamp, rank, percentile, Copy result), Everyone's dive (20-bucket histogram, your bar in `select` under a YOU tag), Dive log (each prompt is a line dropped from the surface to its depth, ending in its stamp), The Catch (accordion; every accepted answer, figlion first with its fun fact; yours in a selection frame with a "you" chip).
- **Leaderboard**: projector scale. Big mono title, three counters (divers, surfaced, still diving with a live dot), white rows: rank (top three on star / heart / thumbs-up stamps), FigPal, name, surfaced or "diving 3/5", depth bar, big mono score.
- **Closed / upcoming / error / config / 404**: one `StatusPanel`: a FigPal off its spotlight, a nametagged card, a mono headline, a plain next step.

## Layout

- Wide layout starts at 1280 px. The centered dive and status columns use Oscar’s 882 px card width. Results are capped at 1120 px and leaderboard at 1200 px. On tall displays, the dive stays within a 950 px play area and the ruler stays beside the centered composition.
- Tablet and narrow laptop: the picker opens as its own view, and the HUD carries depth until the wide layout has room for the ruler.
- Phone: the Change FigPal button sits beside its preview. The reveal keeps the compact tier track above the verdict so the fall is visible immediately. Below 360 px, Submit uses its own row to leave room for the answer field. Short landscape screens use a compact prompt so the field and timer stay in view.

## Motion

The main reveal is a descent through the Figma canvas. The paper frames and selection handles keep the same visual language throughout the dive.

- **Sink**: the selected answer and FigPal accelerate down the tier track and settle over 690–1,315 ms, depending on rarity. Crossed rows flash as the chip passes them. On tall screens, the full FigPal follows the fall below the paper frame. The final row holds its tint and the verdict stamp presses when the chip lands.
- **Ruler and HUD**: grid and ruler travel up while the answer falls. Selection guides pass at a different speed, and a light blue tint builds with depth. The HUD ticks through intermediate totals and announces the final totals immediately.
- **Dive**: canvas guides sweep by during the countdown, the FigPal drops into place, and the next paper frame slides up into view. The scoring window stays server-controlled.
- **Results**: the canvas travels back to the surface while the page rises into place, histogram bars grow from their baselines, and dive-log lines drop from the surface. Catch contents expand from the top of the opened row.
- **Stamp hover**: on pointer devices, large decorative stamps lift inside a blue selection frame and settle back down on exit. Touch has no hover state, and reduced motion keeps only the frame cue.
- **Canvas cameos**: the home screen and dive include scripted team cursors, brief typed chat bubbles, and notes that settle at the edges before a stamp lands. Smaller screens use the open FigPal stage. Cameos pause in hidden tabs, and reduced motion shows static name tags and notes.
- **Leaderboard**: existing rows glide to their new rank using the stable per-game row identity.
- **Rare reveals**: a blue connector is dragged from the landed answer toward its depth on the tier ladder. It snaps into place after the stamp press.
- **Surface recap**: the existing score, depth and rank settle into three grouped sticky notes. The totals are readable during the move.
- **Reduced motion**: all changes take effect immediately, with the same verdict, controls, text, and charts.

## Browser surfaces

Text selection in `select-ice`, caret and focus ring in `select`, thin gray scrollbars, tabular numerals for scores and depths.
