# Adding games from other developers

MindBop can carry games made by other people, but a game being public on the web does not make it legal to copy, frame, modify, monetize, or rehost.

## Accepted integration routes

1. **Source license** — the developer grants MindBop written commercial distribution rights, or the repository has an open-source license that permits commercial hosting and modification.
2. **Publisher embed** — the publisher explicitly allows MindBop’s domain to use its official iframe or SDK.
3. **MindBop module** — the developer adapts the game to MindBop’s room, identity, reconnect, and result interfaces.

Do not copy an MSN, Poki, CrazyGames, itch.io, Steam, or independent developer game merely because its page can be opened. Platform terms, the individual game license, art/audio rights, and the developer’s permission all matter.

## Information needed from the user or developer

- Game name, owner, contact details, repository, and playable build.
- Written license or distribution agreement covering commercial and ad-supported use.
- Full asset/source license list, including fonts, music, sound, images, characters, and third-party SDKs.
- Supported browsers, devices, player counts, controls, accessibility, and performance targets.
- Hosting model: source hosted by MindBop, publisher-hosted embed, or external launch link.
- Data collected, analytics, accounts, chat/moderation, purchases, age rating, and regional restrictions.
- Commercial terms: fixed fee, revenue share, attribution, updates, support, and removal rights.

## Technical review

For a source integration, place each game behind its own module/route and keep room authority on the server. Validate all client messages, isolate storage, set a Content Security Policy, inventory network calls, and test mobile performance. For an iframe integration, use a restrictive sandbox, explicit allow permissions, an origin allowlist, and a documented message contract.

Advertising should be added only after the privacy/consent flow, publisher agreements, ad-network approval, legal pages, and production traffic measurement are ready. Ads must never cover game controls or interrupt a live multiplayer decision.
