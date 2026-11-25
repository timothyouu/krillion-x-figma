# Figillion: design system

Source of truth: Oscar's section in Figma file `QLmoeEgdhjwgqjQhcbopeq` (home 106:9171, figpal selection 10:8249, questions 108:12887, assets 119:2557) and the Figma for Edu Brand Book page. Tokens live in `src/index.css` (`@theme`).

## The world in one line

The game is played **on a Figma canvas**: light gray grid, white frames with nametag tabs, FigJam stamps stuck on top, the blue selection box marking whatever is active, and a ruler down the right edge that measures how far down the board you have panned.

## Vocabulary

Players pan across a FigJam board, not dive through an ocean. Player-facing copy uses this map; code names (`DiveRoute`, `depth_m`, the `/dive` URL) keep their original names.

| Moment | Copy |
|---|---|
| Start / resume | Start panning / Keep panning |
| Between rounds | Pan deeper |
| Countdown card | Panning… |
| Last round button | Zoom to fit (FigJam's view of the whole board) |
| Finished | zoomed out |
| Distance | canvas pixels, 10 px per point, e.g. `pan 850 px` |
| Wrong answer | "not on the board. try again" |
| All accepted answers | The Board |
| Players in progress | still panning |

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
| common | 10 | 100 px | Dot (pink) | `#ffa5dc` |
| overplayed | 15 | 150 px | Two FigPal Cursors | `#ff9e42` |
| uncommon | 30 | 300 px | Thumbs up | `#14ae5c` |
| rare | 60 | 600 px | Heart | `#ff7262` |
| deep cut | 85 | 850 px | +1 | `#9747ff` |
| figillion (key `figlion`) | 100 | 1,000 px | Star | `#ffc700` |
| not on the board (rejection, not a tier) | 0 | | Thumbs down | `#0d99ff` |

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
- **Button** (116:2294) → `FigButton`: `select` fill, `select-deep` edge, 8 px radius, 12 px padding, mono caps; arrows both sides (Start Panning / Pan Deeper / Zoom to Fit) or trailing enter glyph (Enter).
- **Selection frame** → `SelectionFrame`: 2 px `select` border with four 8 px square handles. Marks the one active thing: the answer box, the name box, the chosen FigPal, your row in the Catch, your row on the leaderboard.
- **Timer** (108:12992) → `Timer`: white pill, seven-segment digits. Blue during the 3 s countdown, orange in the last 5 s.
- **Answer box + progress** (108:11973, 108:11975) → `AnswerInput`.
- **Milestones + marker** (116:2482, 106:9000) → `DepthGauge`: tick every 22 px (100 m), medium every 5, labelled every 10 (1,000 m). The right-hand ruler sits in a light strip. It slides up as you sink, while a blue selection range runs from the surface to the fixed YOU depth guide.
- **charaSelect + figpal** (83:12724, 83:5336) → `FigPalPicker`: 5-up grid, selected = selection frame + blue name chip, hover = frame only.
- **Stamps** → `Stamp`: tier stamps and decoration. Decorative stamps are `aria-hidden`.

## Screens Oscar did not draw

- **Reveal** (`RevealCard`, `TierLadder`): same card as the prompt. Left, a ladder of the six tiers (stamp + word + points + depth) under a "surface" line; the answer rides down in a selection frame and stops on its tier, which tints with the tier color. Right, the tier stamp presses on beside the word-mark, `+N PTS · sink N m`, the description, and "Autocorrected from …" when the server matched a different spelling. As in Krillion, the answer chip first shows exactly what you typed with a red squiggle, then corrects itself into the accepted answer as it reaches the surface row (reduced motion shows the corrected answer straight away). A miss keeps the chip at the surface: "nothing landed · +0 PTS · the clock beat you to it."
- **No echo**: thumbs-down stamp pressed beside `"input": not on the board. try again`, directly above the answer box.
- **Results**: nametagged cards on the canvas. Zoomed out (score/500, depth in px, The Bearing with its tier stamp, rank, percentile, Copy result), Everyone's pan (20-bucket histogram, your bar in `select` under a YOU tag), Pan log (each prompt is a line dropped from the top of the board to its depth, ending in its stamp), The Board (accordion; every accepted answer, the Figillion tier first with its fun fact; yours in a selection frame with a "you" chip).
- **Leaderboard**: projector scale. Big mono title, three counters (divers, surfaced, still diving with a live dot), white rows: rank (top three on star / heart / thumbs-up stamps), FigPal, name, surfaced or "diving 3/5", depth bar, big mono score.
- **Closed / upcoming / error / config / 404**: one `StatusPanel`: a FigPal off its spotlight, a nametagged card, a mono headline, a plain next step.

## Layout

- Wide layout starts at 1280 px. The centered dive and status columns use Oscar’s 882 px card width. Results are capped at 1120 px and leaderboard at 1200 px. On tall displays, the dive stays within a 950 px play area and the ruler stays beside the centered composition.
- Tablet and narrow laptop: the picker opens as its own view, and the HUD carries depth until the wide layout has room for the ruler.
- The centered FigPal and its Change FigPal label open the picker on every screen size. The picker has a Done button and returns focus to the avatar.
- Phone: The reveal keeps the compact tier track above the verdict so the fall is visible immediately. Below 360 px, Submit uses its own row to leave room for the answer field. Short landscape screens use a compact prompt so the field and timer stay in view.

## Motion

The main reveal is a descent through the Figma canvas. The paper frames and selection handles keep the same visual language throughout the dive.

- **Answer pickup**: Enter lifts the typed answer out of the box as a selected object (4 px right, 14 px up, -2°, a growing shadow, 160 ms) while the server checks it. An accepted answer flies from there to the surface row of the tier ladder (200–300 ms) as its fall begins. A no-echo answer snaps back into the box with a short shake and fades (260 ms).
- **Sink**: the selected answer and FigPal accelerate down the tier track and settle over 690–1,315 ms, depending on rarity. Crossed rows flash as the chip passes them. On tall screens, the full FigPal follows the fall below the paper frame. The reveal card only fades in, so the chip's small lift before the drop stays visible.
- **Verdict and stamp**: the verdict column shows a dashed "landing…" frame during the fall. When the chip lands, the tier stamp presses: it starts above the canvas at 1.35× with a lifted shadow, accelerates down, makes contact at 110 ms (0.94×, flush shadow, a ring in the tier colour spreads out), and settles by 230 ms. Deep cut and figillion also nudge the card 2 px. The tier word, answer, and points rise in turn from 140 ms after landing. Screen readers hear the verdict at landing. Descend is available throughout.
- **Countdown and clock**: the countdown frame stays on screen until the prompt arrives, then the prompt text wipes in from the top (160 ms) in the same card. In the last 5 seconds the time bar turns orange and the answer box handles pulse once a second. At time up the box deselects (handles fade, gray border) for a short beat before the reveal.
- **Ruler and HUD**: grid and ruler travel up while the answer falls. Selection guides pass at a different speed, and a light blue tint builds with depth. The HUD ticks through intermediate totals and announces the final totals immediately.
- **Dive**: the 760 ms descent pans and zooms the grid while two FigJam groups sweep past. The near group holds your last catch: a sticky with the answer and its theme (or "nothing landed"), that tier's stamp, and a comment signed by one of the crew whose cursors roam the canvas, in that cursor's colour. The far group shows "Prompt N of 5" and your depth so far. The two groups pick their arrangements independently, so each dive sees five layouts of each with a different pairing every round. On phones only the near group shows, centred, drifting through the open band between the card and the answer box; phones shorter than 700 px skip the board. The snap is the main event: the countdown card ("Descending…") slides up, pink alignment guides flash, and the blue selection pops on with its handles and a size badge (for example 882 × 237). The selection holds until the prompt arrives. The answer field reads GET READY. Reduced motion hides the board and guides; the selection and badge fade in over 240 ms and hold. The scoring window stays server-controlled.
- **Results**: the canvas travels back to the surface while the page rises into place (transform only, so the compositor never blends the whole page), histogram bars grow from their baselines, and dive-log lines drop from the surface. The results route, results, and Catch are fetched during the last reveal, so Surface goes straight to the rising page without a loading screen. Catch contents expand from the top of the opened row.
- **Stamp hover**: on pointer devices, large decorative stamps lift inside a blue selection frame and settle back down on exit. Touch has no hover state, and reduced motion keeps only the frame cue.
- **Canvas cursors**: named team cursors follow varied paths in the margins on wide layouts and around the FigPal stage on smaller screens. Each cursor varies its pace and direction independently. Hidden tabs pause the cursors, and reduced motion shows stationary cursors. On home and during a dive, mouse and trackpad pointers show the player’s nickname over the canvas. As in Figma, the arrow and nickname stay over buttons, links and the FigPal instead of turning into a pointing hand, and the hovered object gets a 1 px blue outline 2 px out (keyboard focus keeps its 2 px ring). Text boxes switch to Figma's black I-beam with a white edge and hide the nickname. High fives only start on open canvas. Several quick side-to-side waves switch the player’s arrow to a hand. A nearby roaming cursor responds with its own hand. At contact, as in FigJam, both palms merge at the midpoint and grow to about 2.4× over a white halo with burst lines and stars (90 ms in, held to 330 ms), then shrink back under each cursor by 480 ms. Both cursors stay in hand mode for another high five once they pull apart; the partner lowers its hand with a small wave. On touch, press and hold a roaming cursor for 350 ms to high five it. A nearby cursor also reacts to confirmed guesses with the matching tier stamp, or a small shake and thumbs-down for no echo. During the timed question on tablet and phone, the cursors step out to the edges and return for the reveal. Reduced motion keeps each pose stationary and shows the merged palms as a still badge for 400 ms.
- **Leaderboard**: existing rows glide to their new rank using the stable per-game row identity.
- **Rare reveals**: a blue connector is dragged from the landed answer toward its depth on the tier ladder. It snaps into place after the stamp press.
- **Surface recap**: the existing score, depth and rank settle into three grouped sticky notes. The totals are readable during the move.
- **Reduced motion**: all changes take effect immediately, with the same verdict, controls, text, and charts. The verdict and the no-echo line keep a 150 ms fade so the confirmation still registers; nothing moves.

## Browser surfaces

Text selection in `select-ice`, caret and focus ring in `select`, thin gray scrollbars, tabular numerals for scores and depths.
