<div align="center">

# 🧠🎮 MINDBOP GAMING

### **Play together. Build together. Ship games together.**

**An open, browser-first multiplayer gaming platform for friends, communities, and game developers.**

[![Play MindBop](https://img.shields.io/badge/PLAY-MINDBOP-7C3AED?style=for-the-badge&logo=googlechrome&logoColor=white)](https://mindbop-gaming.onrender.com/)
[![Open Source](https://img.shields.io/badge/OPEN%20SOURCE-WELCOME-16A34A?style=for-the-badge&logo=github&logoColor=white)](https://github.com/pranavv1210/mindbop-gaming)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Babylon.js](https://img.shields.io/badge/Babylon.js-EF2D5E?style=for-the-badge)](https://www.babylonjs.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](LICENSE)

**Live Platform** · [mindbop-gaming.onrender.com](https://mindbop-gaming.onrender.com/) · **Source** · [GitHub](https://github.com/pranavv1210/mindbop-gaming)

</div>

---

## 🌐 The MindBop Mission

MindBop is being built around a simple idea:

> **If your friends can open a link, they should be able to play together.**

No giant launcher. No mandatory download. No complicated setup.

Create a room. Share a code or link. Pick a game. Play.

MindBop is designed for:

- 🏠 Friends playing from home
- 🏢 Office groups looking for a quick multiplayer break
- 🎓 College communities and student groups
- 🎉 Parties and social gatherings
- 🌎 Communities spread across cities and countries
- 🎮 Developers who want to build browser games
- 🧪 Indie creators experimenting with new multiplayer ideas

The bigger ambition is to build a **living game ecosystem** where players discover games and developers have a place to build, test, publish, and improve them.

---

## 🧭 What MindBop Is Becoming

MindBop is not intended to be a single game.

It is a platform with a growing catalog of experiences:

| 🎮 Category | Examples | Experience |
|---|---|---|
| 🕵️ Mystery | Murder investigations, cold cases | Co-op, story-driven |
| 🎭 Social Deduction | Mafia, hidden roles | Bluffing, discussion, betrayal |
| 🎉 Party | Comedy, voting, social games | Fast, chaotic, replayable |
| 🎨 Creative | Drawing, captions, collaborative games | Player-generated fun |
| 🏃 Arcade | Mini-games, obstacles, races | Fast competitive sessions |
| 🌌 Experimental | Strange multiplayer ideas | Anything goes |
| 🌍 3D Worlds | Adventures, arenas, interactive spaces | Immersive browser play |

We want games that make people say:

> **"Wait… we have to play that again."**

---

# ✨ Why MindBop?

### ⚡ Instant

Open the website and start playing. The browser is the launcher.

### 👥 Social

The people in the room are part of the experience — not an afterthought.

### 🎨 Creative

Mysteries, party games, drawing games, competitive games, 3D experiments and ideas that don't fit neatly into a genre.

### 🌍 Open

The platform is being developed with an open-source mindset. Developers can inspect the code, contribute improvements, propose games, and help shape the ecosystem.

### 📱 Device-friendly

Games are designed for the realities of the web: desktops, laptops, tablets and phones where the game supports them.

---

# 🎮 The Game Philosophy

We care about **playability before complexity**.

A game does not need 400 mechanics to be great.

A MindBop game should aim for:

```text
OPEN
  ↓
JOIN
  ↓
UNDERSTAND
  ↓
PLAY
  ↓
LAUGH / COMPETE / INVESTIGATE
  ↓
REPLAY
```

Every multiplayer game should think about the things real players actually do:

- Someone joins late.
- Someone disconnects.
- Someone refreshes the page.
- Someone is on a phone.
- Someone has terrible Wi-Fi.
- Someone doesn't understand the rules.
- Someone wants to play another round immediately.

**The edge cases are part of the game.**

---

# 🕹️ Current Platform Foundation

The repository already contains the foundation of a real multiplayer browser-game platform.

### Platform capabilities

- 🔐 Guest-first player identity
- 🚪 Private multiplayer rooms
- 🔗 Shareable room codes and links
- 👑 Host management and transfer
- 🔄 Reconnect handling
- 🌐 Real-time Socket.IO communication
- 🛡️ Server-authoritative multiplayer state
- 🧊 Babylon.js browser 3D rendering
- 📱 Responsive interfaces
- 👆 Touch-oriented interaction support
- 🗂️ Game catalog and categories
- 🔎 Game discovery/search
- 🎮 Solo and multiplayer game routes
- 💬 Player feedback collection
- 🗄️ Optional Supabase persistence
- 🧪 Automated tests
- 🌐 Browser E2E testing
- 📊 Multiplayer load-testing infrastructure

The architecture is intentionally moving toward **independent game modules on top of shared platform infrastructure**.

---

# 🧩 Platform Architecture

```text
                              ┌──────────────────────┐
                              │       MINDBOP        │
                              │    GAMING PLATFORM   │
                              └───────────┬──────────┘
                                          │
              ┌───────────────────────────┼──────────────────────────┐
              │                           │                          │
          LANDING PAGE                 GAME HUB                 COMMUNITY
              │                           │                          │
              │                 ┌─────────┼─────────┐                │
              │                 │         │         │                │
              │              SOCIAL    MYSTERY   ARCADE              │
              │                 │         │         │                │
              └─────────────────┴─────────┴─────────┴────────────────┘
                                          │
                                   CREATE / JOIN
                                          │
                                        ROOM
                                          │
                         ┌────────────────┴────────────────┐
                         │                                 │
                    PLAYER CLIENT                     GAME SERVER
                         │                                 │
                  UI / INPUT / RENDER               RULES / STATE
                         │                                 │
                         └────────────────┬────────────────┘
                                          │
                                  SHARED SERVICES
                                          │
                              ┌───────────┴───────────┐
                              │                       │
                           Supabase              Future Scale Layer
                                                 Redis / routing / etc.
```

The client presents the game and collects input.

The server owns the rules that matter.

That distinction is fundamental to multiplayer integrity: **never trust the browser to declare its own score, position, victory, damage, or privileged game state.**

---

# 🧑‍💻 Build Games for MindBop

**Developers are welcome.**

If you have an original game idea, the long-term goal is for you to be able to:

1. Clone the repository.
2. Understand the platform architecture.
3. Build your game as an isolated module.
4. Reuse MindBop room/session infrastructure.
5. Test the game locally.
6. Submit it for review.
7. Ship it to real players.

We're especially interested in:

- Multiplayer party games
- Social deduction
- Murder mysteries
- Co-op investigations
- Drawing games
- Comedy/voting games
- Competitive mini-games
- Physics games
- Browser-first 3D games
- Strategy games
- Mobile-first games
- Weird experimental multiplayer games

### 🧠 Have a ridiculous idea?

Good.

Tell us.

The next great MindBop game might start as a sentence nobody has built before.

Use a [game proposal](.github/ISSUE_TEMPLATE/game_proposal.md), open a discussion, or contribute directly when the change is small and well understood.

---

# 📦 Publishing a Game

MindBop is open to contributions, but publishing a game is more than adding a folder and hoping for the best.

A production candidate should be:

- Original or properly licensed
- Safe for its intended audience
- Playable in supported browsers
- Responsive on supported devices
- Reasonably performant
- Clear about supported player count
- Tested across room lifecycle states
- Designed for reconnect/disconnect behavior when multiplayer
- Free of embedded secrets
- Respectful of privacy
- Documented for future maintainers

Read:

- [`CONTRIBUTING.md`](CONTRIBUTING.md)
- [`docs/game-publishing.md`](docs/game-publishing.md)
- [`docs/third-party-games.md`](docs/third-party-games.md)

---

# 🎨 Design Language

MindBop should feel **playful, premium, modern and alive**.

Our visual direction favors:

- 🫧 Tasteful glass surfaces
- ✨ Fluid motion
- 🎨 Bold but controlled color
- 🧊 Polished 3D presentation
- 🎮 Playful interactions
- 📐 Clean layouts
- 📱 Responsive composition
- 🔊 Purposeful sound and feedback

But there is one rule above all of them:

> **If an effect looks cool but makes the game harder to use or slower to run, remove it.**

Performance is part of design.

---

# 🧑‍🎨 Originality & Game Rights

MindBop encourages genre inspiration, not cloning protected creative expression.

Contributors must not submit copied:

- Characters
- Logos
- Maps
- UI artwork
- Text
- Code
- Music
- Sound effects
- Proprietary models
- Branding
- Distinctive protected game content

Third-party assets must have appropriate rights and attribution.

See [`docs/third-party-games.md`](docs/third-party-games.md).

**Inspired by a genre? Great. Copying another game's protected content? No.**

---

# 🧪 Quality Engineering

We don't want a museum of pretty demos.

A MindBop game should be tested like software people are actually going to use.

### Functional

- Room creation
- Room joining
- Player leaving
- Host disconnect
- Reconnect
- Match start
- Match completion
- Correct scoring
- Correct results

### Multiplayer

- Server authority
- Input validation
- Duplicate-action safety
- Room isolation
- Stale input handling
- Connection loss
- Recovery paths

### Performance

- Client frame rate
- Server tick time
- Bandwidth
- Memory stability
- Active room count
- Concurrent player load

### Responsive

- Desktop
- Laptop
- Tablet
- Mobile
- Touch
- Keyboard
- Multiple viewport sizes

### Failure states

- Slow connection
- Lost connection
- Refresh during match
- Browser suspension
- Invalid room
- Full room
- Unexpected disconnect
- Server restart

---

# 🔬 Developer Commands

```bash
npm ci
npm run dev
```

Quality checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Browser testing:

```bash
npx playwright install chromium
npm run test:e2e
```

Load testing:

```bash
npm run test:load
```

> Load-test results are measurements, not marketing claims. Real capacity depends on the game, room size, server hardware, network conditions, deployment architecture and client devices.

---

# 📈 Scaling MindBop

The platform is being designed to grow beyond a single game-server process.

The long-term direction is:

```text
                              INTERNET
                                  │
                           LOAD BALANCER
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
              GAME SERVER A               GAME SERVER B
                    │                           │
             ┌──────┼──────┐            ┌──────┼──────┐
             │      │      │            │      │      │
           Room   Room   Room          Room   Room   Room
             │      │      │            │      │      │
             └──────┴──────┴────────────┬──────┴──────┘
                                        │
                                 SHARED SERVICES
                                        │
                              ┌─────────┴─────────┐
                              │                   │
                            Redis              Supabase
```

Potential production infrastructure includes:

- Multiple game-server instances
- Room-aware routing
- Horizontal scaling
- Shared coordination where required
- Dedicated game-server processes
- Metrics and observability
- Rate limiting
- Connection management
- Graceful deployments
- Per-game capacity testing

**We measure before we promise.**

MindBop will not claim a player capacity simply because a large number looks impressive in a README.

---

# 🤝 Open Source

MindBop is being built with the goal of becoming a welcoming open-source game platform.

Contributions can include:

- 🐛 Bug fixes
- 🎮 New games
- 🧩 New mechanics
- 🎨 UI/UX
- ✨ Animation
- ⚡ Performance
- 🌐 Accessibility
- 📱 Mobile improvements
- 🔌 Multiplayer infrastructure
- 🧪 Testing
- 📚 Documentation
- 🎵 Audio
- 🗺️ Maps and environments
- 🛠️ Developer tooling

Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) before starting substantial work.

---

# 🛡️ Security

Security matters especially for multiplayer software.

Contributors must:

- Never commit API keys or secrets.
- Validate user-controlled input.
- Validate server-bound game actions.
- Never trust client-reported scores or privileged state.
- Keep server-only credentials out of browser bundles.
- Rate-limit abuse-prone endpoints/actions.

Security vulnerabilities should be reported privately according to [`SECURITY.md`](SECURITY.md), not published as public exploit issues.

---

# ♿ Accessibility

MindBop aims to make the platform usable by as many players as reasonably possible.

We care about:

- Keyboard navigation
- Visible focus states
- Readable contrast
- Reduced-motion preferences
- Non-color-only status indicators
- Touch usability
- Clear loading and error states

See [`ACCESSIBILITY.md`](ACCESSIBILITY.md).

---

# 📚 Project Governance & Community Files

MindBop includes the foundation expected from a serious open-source project:

| File | Purpose |
|---|---|
| [`LICENSE`](LICENSE) | Open-source software license |
| [`NOTICE`](NOTICE) | Copyright and third-party rights notice |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Contributor workflow and standards |
| [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) | Community behavior standards |
| [`SECURITY.md`](SECURITY.md) | Vulnerability reporting guidance |
| [`SUPPORT.md`](SUPPORT.md) | Player/developer support |
| [`ACCESSIBILITY.md`](ACCESSIBILITY.md) | Accessibility goals |
| [`CITATION.cff`](CITATION.cff) | Software citation metadata |
| [`docs/game-publishing.md`](docs/game-publishing.md) | Game submission standards |
| [`docs/third-party-games.md`](docs/third-party-games.md) | External game/asset rights |
| [`.github/`](.github/) | CI, Dependabot, issue and PR workflows |

These files are intended to make MindBop easier to understand, contribute to, secure, and maintain.

---

# 🗺️ Roadmap

- [x] Browser-first game platform
- [x] Private multiplayer rooms
- [x] Guest-first play
- [x] Game catalog
- [x] 3D game foundation
- [x] Reconnect handling
- [x] Browser E2E testing foundation
- [x] Multiplayer load-testing foundation
- [x] Open-source contribution foundation
- [ ] Expand the game catalog
- [ ] More social and party games
- [ ] More 3D games
- [ ] Developer-facing game SDK/contracts
- [ ] Improved game publishing tooling
- [ ] Production observability
- [ ] Multi-instance room routing
- [ ] Horizontal game-server scaling
- [ ] Developer profiles
- [ ] Game ratings and discovery
- [ ] Featured-game system
- [ ] More accessibility tooling
- [ ] Community-driven game publishing

---

# 🏗️ Repository Structure

```text
mindbop-gaming/
│
├── src/
│   ├── app/                 # Next.js routes and pages
│   ├── components/          # Shared UI components
│   ├── games/               # Client-side game implementations
│   └── lib/                 # Platform utilities and integrations
│
├── server/
│   ├── games/               # Server-side game rules
│   ├── engine.ts            # Room/game engine
│   └── index.ts             # HTTP + real-time server
│
├── docs/                    # Architecture and publishing docs
├── tests/                   # Automated tests
├── public/                  # Public assets
├── scripts/                 # Tooling and load tests
├── .github/                 # CI, Dependabot and contribution templates
│
├── LICENSE
├── NOTICE
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── SUPPORT.md
├── ACCESSIBILITY.md
├── CITATION.cff
└── README.md
```

---

# ⭐ Support MindBop

If you believe browser gaming can be more social, more creative, and easier to build for:

- ⭐ Star the repository
- 🐛 Report bugs
- 💡 Propose games
- 🧑‍💻 Contribute code
- 🎨 Contribute design/art
- 🧪 Test games
- 📚 Improve documentation
- 📢 Share MindBop with your friends
- 🎮 Build something for the platform

The easiest contribution is also the most useful:

> **Play something. Break something. Tell us what should exist next.**

---

# 🚀 Play MindBop

<div align="center">

## **Create a room. Send the code. Start playing.**

### 🎮 [PLAY MINDBOP](https://mindbop-gaming.onrender.com/)

</div>

---

<div align="center">

### 🧠 MindBop Gaming

**Games for friends. Games by developers. Games for the web.**

Built with curiosity, multiplayer chaos, and an unreasonable number of ideas. 🧠🎮

</div>
