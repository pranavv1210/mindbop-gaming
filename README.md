# 🎮 MindBop Gaming

### **Play together. Build together. Ship games together.**

> **MindBop** is an open, social browser-gaming platform built for the games people actually want to play with their friends — instantly, in a browser, with no downloads and no complicated setup.
>
> We build multiplayer experiences, publish our own games, and open the platform to developers who want to create and share original games with players around the world.

[![Live Platform](https://img.shields.io/badge/Play-MindBop-7c3aed?style=for-the-badge&logo=googlechrome&logoColor=white)](https://mindbop-gaming.onrender.com/)
[![Open Source](https://img.shields.io/badge/Open%20Source-Welcome-16a34a?style=for-the-badge&logo=github&logoColor=white)](https://github.com/pranavv1210/mindbop-gaming)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-Platform-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Babylon.js](https://img.shields.io/badge/Babylon.js-3D-EF2D5E?style=for-the-badge)](https://www.babylonjs.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Multiplayer-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)

**Live:** https://mindbop-gaming.onrender.com/

---

## 🧠 What is MindBop?

MindBop is more than a collection of games.

It is a **browser-first gaming platform and open game ecosystem** designed around one simple idea:

> **If your friends can open a link, they should be able to play together.**

No giant launcher.
No mandatory download.
No complicated installation.
No requirement for everyone to be on the same device.

Create a room, share a code or link, invite your friends, choose a game, and play.

MindBop is being built for:

- 🏠 Friends playing from home
- 🏢 Office groups looking for a quick multiplayer break
- 🎓 College communities and student groups
- 🎉 Parties and social gatherings
- 🌎 Online communities spread across different cities or countries
- 🎮 Developers who want somewhere to publish browser games
- 🧪 Indie creators experimenting with new multiplayer ideas

The long-term goal is simple:

**Make multiplayer games feel as easy to start as sending a message.**

---

# 🚀 The MindBop Vision

The web has millions of games.

But there is still room for a platform that puts **instant social play** at the center of everything.

MindBop is being built around four principles:

### 01 — Instant

Open a browser. Create a room. Share the link. Play.

### 02 — Social

The people sitting on the other side of the screen are the game.

### 03 — Creative

We want weird ideas, hilarious mechanics, competitive experiences, mysteries, party games, 3D worlds, experiments and games nobody has seen before.

### 04 — Open

MindBop should not be a closed box. Developers should be able to understand the platform, build games for it, contribute improvements, and eventually publish their own experiences.

---

# 🎮 What We Build

MindBop can host many different kinds of games.

## 🕵️ Mystery & Investigation

Games where communication, exploration and teamwork matter.

Examples:

- **The Last Guest** — investigate a murder together.
- **Signal Lost** — coordinate when players don't have the same information.
- **Cold Case-style investigations** — evidence, suspects, timelines and deductions.

## 🎉 Social & Party Games

Fast games designed for groups of friends.

Examples:

- Mafia
- Two Truths and a Lie
- Comedy / voting games
- Bluffing games
- Hidden-role games
- Trivia and reaction games

## 🎨 Creative Games

Games where players make something rather than simply control a character.

Examples:

- Scribble-style drawing games
- Collaborative creation
- Caption battles
- Improvisation games
- Creative challenges

## 🏃 Arcade & Competitive Games

Short, replayable games that are easy to understand and difficult to master.

Examples:

- Arena games
- Obstacle courses
- Mini-games
- Racing
- Team challenges
- Physics-based chaos

## 🌌 Experimental Games

This is where things get interesting.

If someone has a strange multiplayer game idea that sounds impossible, **we want to hear it.**

---

# 🕹️ Current Platform

The current repository already contains the foundation for a real multiplayer game platform.

### Current capabilities

- Private multiplayer rooms
- Invite codes and room links
- Guest-first identity
- Host management and transfer
- Reconnect handling
- Server-authoritative game state
- Real-time Socket.IO communication
- Browser-based 3D rendering with Babylon.js
- Responsive game interfaces
- Touch-oriented controls
- Game catalog and categories
- Searchable game metadata
- Solo-game routes
- Multiplayer-game routes
- Feedback collection
- Supabase integration for optional persistence
- Automated tests
- Browser end-to-end testing
- Multiplayer load testing

The platform is intentionally being built so that **games can be added independently instead of turning the entire application into one enormous game.**

---

# 🌐 How MindBop Works

At a high level:

```text
                         ┌─────────────────────┐
                         │      MINDBOP        │
                         │   Gaming Platform   │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┼────────────────┐
                    │               │                │
                Landing          Game Hub         Feedback
                    │               │
                    │       ┌───────┼────────┐
                    │       │       │        │
                    │    Social   Mystery   Arcade
                    │       │       │        │
                    └───────┴───────┴────────┘
                                    │
                              Create / Join
                                    │
                                  Room
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                      Players              Game State
                         │                     │
                         └──────────┬──────────┘
                                    │
                              Game Engine
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                    Browser Client        Game Server
                         │                     │
                    Rendering/UI        Authoritative State
```

The browser is responsible for presentation and input.

The server is responsible for the rules that matter.

That distinction is critical for multiplayer games: **players should never be trusted to tell the server that they won, scored, moved somewhere impossible, or hit another player.**

---

# 🧩 Developer-Friendly Game Architecture

MindBop is designed to evolve into a platform where games can be plugged into a common ecosystem.

A game should be able to define things such as:

```text
Game metadata
├── name
├── slug
├── description
├── cover art
├── screenshots
├── categories
├── supported player count
├── multiplayer / solo
└── status

Game runtime
├── lobby
├── room state
├── player state
├── game rules
├── actions
├── scoring
├── timers
├── win conditions
└── results
```

The exact integration contract will continue to evolve as the platform grows. Developers should read the current integration documentation before building a game against the repository.

---

# 🧑‍💻 Build a Game for MindBop

**Yes — we want developers to build here.**

If you are a developer with a game idea, you should be able to clone this repository, understand the architecture, build an original game, test it locally, and submit it for inclusion in the MindBop catalog.

We are especially interested in:

- Multiplayer party games
- Social deduction
- Murder mysteries
- Co-op investigations
- Drawing games
- Competitive mini-games
- Physics games
- Browser-first 3D games
- Strategy games
- Weird experimental multiplayer games
- Games designed specifically for phones
- Games designed specifically for office / friend groups

### The golden rule

**Build something people can understand quickly and want to play again.**

A beautiful game with terrible multiplayer UX isn't enough.
A clever mechanic with a broken room system isn't enough.
A technically impressive game that takes 30 minutes to understand isn't necessarily enough.

MindBop games should feel:

> **Open → Join → Understand → Play → Laugh → Replay**

---

# 📦 Publishing a Game

MindBop supports an open contribution model, but publishing a game is not simply dropping a folder into the repository.

Every submitted game should be:

- Original or properly licensed
- Safe for its intended audience
- Playable in supported browsers
- Responsive on supported screen sizes
- Tested for reconnects and room lifecycle
- Reasonably performant
- Clear about its supported player count
- Free of secrets embedded in client code
- Respectful of user privacy
- Compatible with the platform's multiplayer model
- Documented well enough for another developer to maintain

See:

- [`CONTRIBUTING.md`](CONTRIBUTING.md)
- [`docs/game-publishing.md`](docs/game-publishing.md)
- [`docs/third-party-games.md`](docs/third-party-games.md)

for the contribution and publishing process.

---

# 🛠️ Local Development

## Requirements

- Node.js 22.17+
- npm
- Git
- A modern Chromium-based browser for the easiest development experience

## Install

```bash
npm ci
```

## Start development

```bash
npm run dev
```

Then open:

```text
http://localhost:3000/play
```

Create a room and invite another browser using its room code.

For local phone testing over the same network, configure the development origin appropriately and use the LAN address from the device.

---

# 🧪 Quality First

We don't want MindBop to be a collection of pretty demos.

A game isn't finished because it looks good in one browser tab.

Every meaningful feature should be tested across the things that can actually break multiplayer games:

### Functional

- Can players create rooms?
- Can players join?
- Can players leave?
- Can the host disconnect?
- Can a player reconnect?
- Does the game start correctly?
- Can the match finish?
- Is the result correct?

### Multiplayer

- Is state authoritative?
- Are invalid actions rejected?
- Are duplicate actions safe?
- Are stale inputs handled?
- Are rooms isolated?
- Can one room affect another?

### Performance

- Does the client maintain an acceptable frame rate?
- Does server tick time remain healthy?
- Does bandwidth remain reasonable?
- Does memory remain stable?
- What happens when many rooms are active simultaneously?

### Responsive design

- Desktop
- Laptop
- Tablet
- Mobile
- Touch interaction
- Keyboard interaction
- Different viewport sizes

### Failure cases

- Lost connection
- Slow connection
- Refresh during a match
- Browser tab suspension
- Duplicate clicks
- Invalid room code
- Full room
- Server restart
- Unexpected player disconnect

**A multiplayer game is only as good as its failure handling.**

---

# 🔬 Current Verification Commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:load
```

The repository includes browser and load-test infrastructure. Load tests are useful for measuring the current implementation, but they are **not a claim that MindBop currently supports an arbitrary number of concurrent players**.

Real capacity must be measured against a specific deployment, game, room size, network profile and hardware configuration.

---

# 📈 Scaling MindBop

The long-term platform is intended to scale beyond a single game server.

The target architecture will evolve toward:

```text
                         Internet
                            │
                     Load Balancer
                            │
                ┌───────────┴───────────┐
                │                       │
          Game Server A           Game Server B
                │                       │
          ┌─────┼─────┐           ┌─────┼─────┐
          │     │     │           │     │     │
        Room  Room  Room         Room  Room  Room
          │     │     │           │     │     │
          └─────┴─────┴───────────┴─────┴─────┘
                            │
                       Shared Services
                            │
                    ┌───────┴────────┐
                    │                │
                   Redis          Supabase
```

Potential production infrastructure includes:

- Multiple game-server instances
- Room-aware routing
- Redis for shared coordination where appropriate
- Horizontal scaling
- Dedicated game-server processes
- Metrics and observability
- Rate limiting
- Connection management
- Graceful deployment strategies
- Per-game capacity testing

**We will measure before we promise.**

There will never be a fake "10,000 players supported" badge just because a number was written in a README.

---

# 🎨 Design Philosophy

MindBop should feel like a place people want to stay.

Our visual direction is:

- Playful
- Modern
- Expressive
- Clean
- Colorful
- Slightly chaotic in the fun way
- Smooth rather than overloaded
- Responsive rather than cramped
- Game-like without looking childish

We like:

✨ expressive motion

🪟 tasteful glass surfaces

🎨 bold but controlled color

🫧 fluid transitions

🎮 playful interactions

🧊 polished 3D presentation

📱 layouts that actually work on phones

But visual effects should never sacrifice readability or performance.

**If an animation looks cool but makes the game harder to use, it loses.**

---

# 🧑‍🎨 Game Art & Originality

MindBop encourages original game identities.

A game may have inspiration from an existing genre, but contributors must not copy:

- Characters
- Logos
- Names
- Maps
- UI artwork
- Text
- Code
- Proprietary assets
- Sounds
- Branding
- Distinctive protected game content

If third-party assets are used, contributors must have the necessary rights and document the license and attribution.

**Genre inspiration is welcome. Asset copying is not.**

---

# 🤝 Contributing

MindBop is intended to become a community-driven project.

You can contribute without creating an entire game.

Ideas include:

- 🐛 Bug fixes
- 🎮 New games
- 🧩 New game mechanics
- 🎨 UI improvements
- ✨ Animations
- ⚡ Performance improvements
- 🌐 Accessibility
- 📱 Mobile improvements
- 🔌 Multiplayer infrastructure
- 🧪 Tests
- 📚 Documentation
- 🎵 Audio systems
- 🗺️ Maps and environments
- 🛠️ Developer tooling

Before starting a large feature, open an issue or discussion so the architecture can be reviewed first.

Small improvements are welcome as pull requests.

Large game submissions should follow the game publishing guide.

---

# 💡 Have a Game Idea?

**Tell us.**

Seriously.

Maybe it's:

> "What if six people were trapped in a train and one of them secretly caused the accident?"

or:

> "What if everyone has to build the same ridiculous machine while the physics engine slowly falls apart?"

or:

> "What if Mafia happened inside a 3D spaceship?"

Those are exactly the kinds of conversations that can become MindBop games.

Use the project's feedback system or open an issue with your concept.

We want the catalog to be shaped by **players and developers**, not just by a fixed roadmap.

---

# 🏆 The MindBop Game Standard

Before a game is considered ready for the main catalog, ask:

### 🎮 Is it actually fun?

Not just technically impressive.

### 👥 Is multiplayer actually meaningful?

Would the game still make sense if everyone wasn't in the same room?

### ⚡ Is it responsive?

Actions should feel immediate.

### 🔄 Can it survive real-world multiplayer problems?

Disconnects happen. People refresh pages. Wi-Fi disappears. Design for it.

### 📱 Does it respect the player's device?

A beautiful game that melts a phone is not a good web game.

### 🧠 Can a new player understand it?

The first minute matters.

### 🔁 Is there a reason to play again?

Replayability is part of the design, not an afterthought.

---

# 🗺️ Roadmap

The roadmap will evolve with the community, but the broad direction is:

- [x] Browser-first game platform
- [x] Private multiplayer rooms
- [x] Guest-first play
- [x] Game catalog
- [x] First playable 3D mystery
- [x] Reconnect handling
- [x] Browser E2E testing
- [x] Multiplayer load testing foundation
- [ ] Expand the multiplayer game catalog
- [ ] Improve game publishing tooling
- [ ] More social/party games
- [ ] More 3D games
- [ ] Developer-facing game SDK/contracts
- [ ] Better game analytics
- [ ] Production observability
- [ ] Multi-instance room routing
- [ ] Horizontal game-server scaling
- [ ] Community publishing workflow
- [ ] Developer profiles / publisher pages
- [ ] Game ratings and discovery
- [ ] Curated featured games
- [ ] More accessibility tooling

---

# 🌍 The Bigger Goal

MindBop should eventually feel less like:

> "Here is a website with a few games."

and more like:

> **"This is where my friends and I go when we want to play something."**

And for developers:

> **"This is somewhere I can build a multiplayer game, get it in front of real players, and become part of the platform."**

That's the ecosystem we're aiming for.

---

# 🧑‍💻 Project Structure

A simplified view of the repository:

```text
mindbop-gaming/
│
├── src/
│   ├── app/                 # Next.js routes and pages
│   ├── components/          # Shared UI components
│   ├── games/               # Client-side game implementations
│   └── lib/                 # Shared application utilities
│
├── server/
│   ├── games/               # Server-side game rules
│   ├── engine.ts            # Room/game engine
│   └── index.ts             # HTTP + Socket.IO server
│
├── docs/
│   ├── game-publishing.md   # How to propose/publish a game
│   ├── third-party-games.md  # Third-party integration rules
│   └── ...
│
├── tests/                   # Unit, integration and E2E tests
├── public/                  # Public assets
├── scripts/                 # Development/load tooling
├── CONTRIBUTING.md
├── package.json
└── README.md
```

---

# 🔐 Security & Privacy

MindBop takes multiplayer trust seriously.

The client should never be treated as authoritative for sensitive game state.

Contributors must:

- Never commit API keys or secrets
- Validate server-bound actions
- Validate user-controlled input
- Avoid trusting client-reported scores
- Rate-limit abuse-prone actions
- Keep server-only secrets out of browser bundles
- Follow the repository's privacy/security guidance

If you discover a security issue, please do **not** publish an exploit in a public issue. Contact the project maintainer privately first.

---

# 📜 Licensing

The repository's code, game content, third-party assets and future published games may have different licensing requirements.

**Do not assume that everything in the repository is automatically available for commercial reuse.**

Check the applicable license and each game's asset attribution before redistributing content.

Third-party game submissions must provide clear evidence that the contributor has the necessary rights to distribute the submitted game and its assets.

---

# ⭐ Support the Project

If you like the idea behind MindBop:

- ⭐ Star the repository
- 🐛 Report bugs
- 💡 Suggest games
- 🧑‍💻 Contribute code
- 🎨 Contribute art or design
- 🧪 Help test games
- 📢 Share the platform with your friends
- 🎮 Build a game for MindBop

The easiest way to help is simple:

**Play something. Then tell us what should exist next.**

---

# 🎮 Play MindBop

## **Ready? Create a room. Send the code. Start playing.**

### 👉 https://mindbop-gaming.onrender.com/

---

<p align="center">
  <strong>MindBop Gaming</strong><br/>
  <em>Games for friends. Games by developers. Games for the web.</em>
</p>

<p align="center">
  Built with curiosity, multiplayer chaos, and an unreasonable number of ideas. 🧠🎮
</p>
