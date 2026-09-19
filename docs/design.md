# MindBop design foundations

## Direction

A warm, social game night with a mischievous edge. The main visual is a pair of oversized illustrated game cards. This communicates what people can play without fabricating an active lobby, testimonials, or player counts.

## Tokens

| Role | Value |
| --- | --- |
| Brand violet | `#7657FF` |
| Deep ink | `#211D35` |
| Warm paper | `#F8F7FC` |
| Coral | `#FF8B83` |
| Mint | `#A9E8CB` |
| Yellow | `#FFDC81` |

Plus Jakarta Sans carries the wordmark, headings, and game titles. DM Sans carries descriptions, forms, and gameplay controls. Both are packaged and served locally.

The landing hero is left-aligned on desktop with game art on the right; mobile stacks and centers the introduction. Browsing uses a four-column desktop/two-column mobile library. Gameplay becomes a single-column question-and-answer interface on mobile, with the player list below it. Spacing, surfaces, typography, and controls are defined in `src/app/globals.css`.

The sticky navigation and small crew illustration use restrained translucency. Main content uses opaque, readable surfaces. Motion is limited to an initial hero entrance, user-triggered dialog transitions, and button feedback. Reduced-motion preferences disable decorative movement.

## Engineering choices

- Next.js App Router, React, and TypeScript; shared CSS tokens instead of a separate component framework.
- A custom long-running Node server shares a single origin between Next.js and Socket.IO. This follows the integration shape in the [Next.js custom-server guide](https://nextjs.org/docs/app/guides/custom-server). Hosting must support persistent WebSocket connections.
- Socket.IO handles transport/reconnect attempts. Application sessions, room reattachment, permissions, and host transfer live in the engine, so a new socket does not become a duplicate player.
- One complete launch game establishes the module boundary. Bluff Club, Odd One In, and Hot Take remain explicitly unavailable until their rules and full loops are implemented and tested.
