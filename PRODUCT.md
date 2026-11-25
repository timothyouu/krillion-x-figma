# Figillion: product context

**What it is.** A Figma-themed take on Krillion, built as the icebreaker for the Figma Campus Leader Midyear All Hands (Dec 8, 2026). Up to 220 Campus Leaders open one link, dive through 5 prompts, and see where they rank. Rarer correct answers sink you deeper.

**Who uses it, and where.** Campus Leaders on a video call, mostly on laptops (1280 to 1440 wide), some on iPads, a few on phones. The host screen-shares the live leaderboard to the whole call. Sessions are short (about 3 minutes of play) and happen while people are also listening to the call.

**Surfaces and modes.**

| Route | Surface | Mode |
|---|---|---|
| `/` | Name, FigPal pick, Begin Descent | Experience (first impression, playful) |
| `/dive` | Countdown, prompt, answer, reveal | Operate (fast, legible under a 25 s clock) |
| `/results` | Score, curve, dive log, rank title, the Catch | Read |
| `/leaderboard` | Screen-share board | Read, at projector distance |
| `/closed` | Upcoming or closed game | Read |

**What success looks like.** Nobody needs instructions. The timer, the input and the "no echo" retry are obvious within one prompt. The reveal makes a rare answer feel earned. The leaderboard reads from the back of a video grid.

**Hard constraints.**
- Prompts and answers never ship in the frontend. They arrive one at a time from Supabase RPCs (`start_prompt`, `submit_answer`, `get_catch` after finishing).
- The server owns the clock. The client shows `deadline` minus a measured clock offset and calls `finish_prompt` when it runs out. Refresh resumes from `get_my_progress`.
- One dive per player. No accounts: anonymous Supabase sessions.
- Every tier shows a text label, not color alone. `prefers-reduced-motion` skips the sinking animation.

**Design authority.** Oscar's Figma section (`home`, `figpal selection`, `questions`, `assets`) is the approved comp. New screens extend his world; see DESIGN.md.

**Open items** live in specs.md section 13 (game window, round themes, final tier description lines, the Too Clever style).
