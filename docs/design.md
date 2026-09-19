# MindBop design foundations

## Direction

MindBop now centers on a cooperative night-time investigation. The public entry point uses the original Last Guest cover; the playable room shifts into a dark navy hotel interface with warm brass, cream, muted violet, and restrained green feedback. No fictional active-lobby counts, testimonials, or unavailable game cards are shown.

Plus Jakarta Sans carries the wordmark and headings. DM Sans carries case text, evidence, forms, and controls. Both fonts are packaged locally.

## Play space

The hotel is a fixed cutaway view on desktop and follows the local investigator on narrow screens. Five color-coded rooms share one physical map. Low walls preserve sight lines; gold rings identify evidence, violet rings identify suspects, and green rings identify collected evidence. Labels, the objective strip, area chip, evidence details and interview transcripts carry information that color or 3D geometry alone cannot.

Desktop places the hotel beside a 360 px investigation panel. Mobile stacks the hotel, touch controls, tabs and content. The direction pad uses at least 44 px targets at phone widths. Reduced graphics lowers resolution and render frequency; canvases pause while a player reads another investigation panel and resume on Inspect. Reduced-motion preferences continue to suppress decorative page motion.

The interface separates four tasks:

1. **Inspect** — nearby objects and suspect questions, gated by real position.
2. **Evidence** — discoveries, interview notes and supported clue connections.
3. **Case** — required progress, accusation form and group vote.
4. **Team** — connected roster and shared text notes.

The reveal states whether the submitted case was proven, then provides the actual culprit, method, motive, timeline, explanation and missed clues. The replay limitation is visible: the current milestone contains one fixed authored case.

## Engineering choices

- Next.js App Router, React and TypeScript; Babylon.js is lazy-loaded only inside active game rooms.
- One long-running Node server shares an origin between Next.js and Socket.IO and requires persistent WebSocket support.
- Public geometry/types are shared. Evidence text, prerequisites and the solution remain in the server-only case module.
- The browser sends direction vectors. The server owns elapsed movement, collisions, proximity, progression and resolution.
- Original procedural geometry and repository-owned SVG art avoid an asset-service dependency for this milestone.
