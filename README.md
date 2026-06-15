<div align="center">

<img src="./frontend/logo_dark.svg" alt="Konvo Logo" width="120" />

# Konvo

### Meet your match before you ever say hello.

**Konvo is an AI-powered social connection platform where your digital twin speaks first — so you only connect with people you already vibe with.**

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](./LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

[Live Demo](https://konvo.social) · [Report a Bug](https://github.com/rotric04/Konvo/issues) · [Request a Feature](https://github.com/rotric04/Konvo/issues) · [Join the Community](https://github.com/rotric04/Konvo/discussions)

</div>

---

## Table of Contents

1. [Why Konvo Exists](#1-why-konvo-exists)
2. [The Motive](#2-the-motive)
3. [Product Market Fit](#3-product-market-fit)
4. [How the Agent System Works](#4-how-the-agent-system-works)
5. [The Virtual Date Experience](#5-the-virtual-date-experience)
6. [MBTI at the Core](#6-mbti-at-the-core)
7. [Tech Stack](#7-tech-stack)
8. [System Architecture](#8-system-architecture)
9. [Project Structure](#9-project-structure)
10. [Microservices Overview](#10-microservices-overview)
11. [Core Algorithms](#11-core-algorithms)
12. [Getting Started](#12-getting-started)
13. [Environment Variables](#13-environment-variables)
14. [API Reference](#14-api-reference)
15. [How to Index This Repo on GitHub](#15-how-to-index-this-repo-on-github)
16. [What is Coming Next](#16-what-is-coming-next)
17. [How to Collaborate](#17-how-to-collaborate)
18. [License](#18-license)

---

## 1. Why Konvo Exists

We have all been there. You open an app, scroll through a hundred profiles, swipe right on someone who looks interesting, and then spend two weeks texting back and forth only to realize you have nothing in common. That whole process is exhausting. It is also kind of backwards.

**Konvo flips the whole thing around.**

Instead of showing you a photo and hoping for the best, Konvo creates a digital twin of you — an AI agent that actually knows how you think, what you value, how you communicate, and what kind of person complements you. That twin then has a conversation with another person's twin inside a private sandbox. No humans involved yet.

After the conversation, both of you get a full report. You see the dialogue. You see a compatibility score. You see a breakdown of how well your values, humor, and communication styles lined up. Then — and only then — you decide whether you want to actually meet the human behind the agent.

This means by the time you send your first real message, you already know it is going somewhere good.

---

## 2. The Motive

The creator of Konvo got tired of seeing two problems play out over and over again.

**Problem one:** People are really bad at knowing what they actually want in another person until they experience it. A profile bio cannot tell you whether someone is thoughtful under pressure or whether their sense of humor makes you laugh out loud.

**Problem two:** Most apps are built around attention, not connection. They are optimized to keep you swiping, not to help you find someone real. The longer you stay single and confused, the better it is for their business model.

Konvo was built with one goal. Not to match you with the most popular person nearby. Not to show you who swiped right on you first. But to help you find someone where the connection is already there before the conversation even starts.

It is built by a student who has spent more time thinking about why connections fail than celebrating when they succeed. The platform is a reflection of that obsession.

---

## 3. Product Market Fit

| Who it is for | What they get |
|---|---|
| Young adults tired of shallow swiping | Deep compatibility before any conversation |
| Introverts who find cold chatting exhausting | Your twin does the hard part first |
| People who care about personality over looks | MBTI + behavioral + astrological matching |
| Those burned by bad matches | A compatibility preview so you go in informed |
| Privacy-conscious users | No photo feed, no follower counts, no algorithmic pressure |

### The Market in Plain Language

Dating apps are a $10 billion industry and most people still find them frustrating. AI assistant apps are exploding. The idea of an AI that represents *you* and acts on *your behalf* is something people are already getting comfortable with.

Konvo sits at the intersection of those two things. It is not a dating app with an AI feature bolted on. It is an AI-first platform where connection is the output, not the product.

The people who love this the most tend to be:
- Students in college who want something more meaningful than casual swiping
- Young professionals who do not have time to waste on bad first dates
- Anyone who has ever thought "I wish I knew if we were compatible before I got my hopes up"

---

## 4. How the Agent System Works

![Konvo Agent Flow](./docs/konvo_agent_flow.png)

Here is the exact journey from joining Konvo to getting a compatible match.

```
You sign up
    ↓
You take a behavioral quiz (not a personality test — it watches how you answer, not what you answer)
    ↓
MBTI Engine processes your responses
    ↓
Your AI Twin is born  ← given a name, voice style, emoji style, role archetype
    ↓
Gale-Shapley algorithm finds compatible users
    ↓
Your Twin meets their Twin in a virtual environment
    ↓
They have a real conversation (you watch the transcript)
    ↓
Compatibility score is generated with breakdowns
    ↓
You decide: Approve or Decline
    ↓
If both approve → Human chat is unlocked
```

Your twin is not a chatbot pretending to be you. It is built from your quiz results, your behavioral fingerprint, your communication style, your MBTI type, and your stated values. It represents the parts of you that matter most for a connection.

---

## 5. The Virtual Date Experience

![Virtual Date Scenario](./docs/konvo_virtual_date.png)

When two twins are matched, they do not just exchange messages. They go on a **virtual date**.

There are multiple environments available:

| Environment | Vibe |
|---|---|
| Virtual Coffee Shop | Casual, getting to know each other |
| Bookstore | Thoughtful, intellectual |
| Rooftop at Night | Open, reflective, deeper questions |
| Art Gallery | Creative, expressive |
| Park Walk | Relaxed, natural flow |

The twins converse naturally inside one of these environments. The dialogue is stored as a log. After it finishes, you get:

- The full conversation transcript
- An overall compatibility score (0 to 100)
- A breakdown by category: Humor, Values, Chemistry, Communication
- The option to approve or decline connecting with the real person

If both people approve, the chat unlocks. If one person declines, no hard feelings and no embarrassment — the other person never even knows who initiated.

---

## 6. MBTI at the Core

Konvo does not just ask you what your MBTI type is and call it a day. It actually *calculates* your MBTI type from scratch using a behavioral quiz engine built in-house.

The MBTI engine (`mbti_engine.py`) analyzes:

- **Scenario choices** — how you respond to social and ethical dilemmas
- **Trade-off decisions** — what you prioritize when you cannot have everything
- **Open-ended responses** — the vocabulary and structure of your writing
- **Response latency** — how long you pause before answering certain questions

The output is not just a four-letter type. It is a full profile that includes:

```
MBTI Type: INFJ
Confidence: 91%
Communication Style: Warm, measured, conceptual
Relationship Style: Deep commitment, needs emotional safety
Friendship Style: Few but very loyal connections
Growth Areas: Setting limits with others, not over-explaining
```

### MBTI Compatibility Table

| Your Type | Strong Matches | Works With Some Effort | Challenging |
|---|---|---|---|
| INTJ | ENFP, ENTP | INFJ, ENTJ | ESFJ, ISFJ |
| INFP | ENFJ, ENTJ | INFJ, ENFP | ESTJ, ESTP |
| ENFJ | INFP, ISFP | ENFP, INFJ | ISTP, ESTP |
| ENTP | INFJ, INTJ | ENFJ, ENTJ | ISFJ, ESFJ |
| ISFJ | ESFP, ESTP | ISFP, ISTJ | ENTP, INTP |
| ESTP | ISFJ, ISTJ | ESFJ, ESTJ | INFP, INFJ |

> These are tendencies, not rules. Konvo uses MBTI as one signal among many — not the only one.

The compatibility algorithm also accounts for:

- **Sun sign** (astrology, calculated from birth date)
- **Moon sign and ascendant** (calculated from birth time and location)
- **Konvo DNA Indexes** — nine behavioral dimensions scored 0 to 100
- **Interest clusters** — how much your hobby universes overlap
- **Communication vectors** — how similar your conversational patterns are

---

## 7. Tech Stack

### Backend

| Technology | Purpose |
|---|---|
| **Python 3.11** | Core language |
| **FastAPI 0.110** | API framework for all services |
| **SQLAlchemy 2.0** | ORM for database models |
| **PostgreSQL 15** | Primary relational database |
| **Redis 7** | Caching, pub/sub, rate limiter storage |
| **Celery + Redis** | Background job queue for async tasks |
| **MeiliSearch** | Full-text search engine for users and posts |
| **gRPC** | Internal high-speed communication between services |
| **Argon2** | Password hashing |
| **JWT (PyJWT)** | Access and refresh token authentication |
| **Cryptography (AES-CBC)** | Encrypted admin data routing |
| **Sentry SDK** | Error tracking and observability |
| **Prometheus** | Metrics instrumentation |
| **SlowAPI** | Route-level rate limiting |
| **uvicorn** | ASGI server |

### Frontend

| Technology | Purpose |
|---|---|
| **Vanilla JS** | Core interactivity (no framework overhead) |
| **Three.js** | 3D WebGL environments for virtual dates |
| **MapLibre GL** | Privacy-first location grid rendering |
| **GSAP** | Page transition animations |
| **Anime.js** | Micro UI animations and feedback |
| **Web Audio API** | Ambient soundscapes without external files |
| **BroadcastChannel API** | Cross-tab state sync |
| **Intersection Observer API** | Viewport-triggered animations |
| **Service Worker** | Offline caching and PWA support |
| **Outfit Font** | Display typography via Google Fonts |

### Infrastructure

| Technology | Purpose |
|---|---|
| **Docker + Compose** | Full containerized local development |
| **Nginx** | Reverse proxy and static file serving |
| **Render.yaml** | Cloud deployment spec |
| **Flower** | Celery task monitoring dashboard |

---

## 8. System Architecture

![System Architecture](./docs/konvo_architecture.png)

```
                        ┌─────────────────────────────────┐
                        │  Browser Client (Vanilla JS)    │
                        │  Three.js · MapLibre · GSAP     │
                        └────────────────┬────────────────┘
                                         │ HTTP / WebSocket
                        ┌────────────────▼────────────────┐
                        │      FastAPI Gateway             │
                        │   gateway.py  ·  Port 8000      │
                        │  Rate Limiting · CSP Headers     │
                        │  Prometheus · Sentry · CORS      │
                        └────┬──────────────────────┬──────┘
                             │ Dynamic route loading │
          ┌──────────────────▼──────┐   ┌───────────▼──────────────┐
          │  Auth Service  :8001    │   │  User Service  :8002      │
          │  Messaging     :8009    │   │  Behavior Engine :8003    │
          │  AI Agent      :8005    │   │  Sentiment Engine :8004   │
          │  Graph         :8008    │   │  Community  :8006         │
          │  Search        :8010    │   │  Feedback   :8007         │
          └──────────────────┬──────┘   └───────────┬──────────────┘
                             │                       │
                    ┌────────▼───────────────────────▼──────┐
                    │              Data Layer                │
                    │  PostgreSQL · Redis · MeiliSearch      │
                    └────────────────────────────────────────┘
                             │
                    ┌────────▼──────────────────────┐
                    │     Background Workers         │
                    │  Celery Worker · Celery Beat   │
                    │  Flower Dashboard  :5555       │
                    └────────────────────────────────┘
```

The gateway does not use traditional microservice mounting (no ASGI sub-mounts). Instead it dynamically loads each service module and copies all routes directly into the main app. This means one unified API surface, one set of middleware, and zero issues with hot reload.

---

## 9. Project Structure

```
Konvo/
│
├── gateway.py                   ← Main entry point. Loads all services.
├── schema.sql                   ← Full database schema definition
├── seeder.py                    ← Database seed script for development
├── requirements.txt             ← All Python dependencies
├── Dockerfile                   ← Container definition
├── docker-compose.yml           ← Full local dev stack
├── render.yaml                  ← Cloud deployment config
├── Makefile                     ← Helpful dev shortcuts
│
├── frontend/                    ← Static client app
│   ├── index.html               ← Landing page
│   ├── style.css                ← Global stylesheet (12,000+ lines)
│   ├── theme.css                ← Theme tokens (light/dark)
│   ├── sw.js                    ← Service Worker for PWA
│   ├── sitemap.xml              ← SEO sitemap
│   ├── pages/                   ← Individual HTML pages
│   │   ├── app.html             ← Main SPA shell
│   │   ├── login.html           ← Auth page
│   │   ├── onboarding.html      ← Quiz and twin creation
│   │   ├── blog.html            ← Blog page
│   │   ├── feedback.html        ← Feedback form
│   │   └── admin_dashboard.html ← Encrypted admin portal
│   ├── src/                     ← JavaScript source files
│   └── txt/                     ← SEO and security text files
│       ├── robots.txt
│       ├── security.txt
│       ├── agents.json          ← AI agent discovery spec
│       └── llms.txt             ← LLM-readable documentation
│
├── packages/
│   ├── shared-utils/            ← Core logic shared by all services
│   │   ├── models.py            ← SQLAlchemy ORM models
│   │   ├── crud.py              ← All database operations
│   │   ├── database.py          ← DB connection and migration
│   │   ├── auth_helper.py       ← JWT token verification
│   │   ├── redis_client.py      ← Redis connection wrapper
│   │   ├── websocket_manager.py ← WebSocket channel manager
│   │   ├── sentiment_helper.py  ← Live sentiment calculations
│   │   ├── vector_store.py      ← Embedding vector utilities
│   │   ├── neo4j_client.py      ← Graph database client
│   │   └── algorithms/
│   │       ├── mbti_engine.py       ← MBTI type calculator
│   │       ├── compatibility.py     ← Multi-dimensional match scoring
│   │       ├── matching_dsa.py      ← Gale-Shapley stable matching
│   │       ├── date_simulator.py    ← Twin conversation engine
│   │       ├── onboarding_engine.py ← Quiz processing pipeline
│   │       ├── sentiment.py         ← Post/comment sentiment analysis
│   │       ├── astrology.py         ← Sun/moon/ascendant calculator
│   │       ├── fingerprint.py       ← Behavioral fingerprint builder
│   │       └── digipin.py           ← Privacy-safe location encoder
│   └── shared-schemas/          ← Pydantic request/response models
│
├── services/
│   ├── auth-service/            ← Register, login, OTP, JWT
│   ├── user-service/            ← Profiles, twins, notifications
│   ├── behavior-engine/         ← Compatibility, discovery, swipes
│   ├── sentiment-engine/        ← Real-time sentiment websocket
│   ├── ai-agent-service/        ← Twin management, simulations
│   ├── messaging-service/       ← Chat messages, reactions
│   ├── community-service/       ← Forums, posts, comments
│   ├── graph-service/           ← Social graph and connections
│   ├── search-service/          ← MeiliSearch powered user search
│   ├── feedback-service/        ← User feedback collection
│   ├── worker_service/          ← Celery tasks (avatar generation, etc.)
│   ├── grpc_compatibility/      ← gRPC server for fast compatibility calls
│   └── grpc_twin/               ← gRPC twin communication service
│
├── infrastructure/
│   └── nginx/
│       └── nginx.conf           ← Nginx reverse proxy config
│
├── data/                        ← Seed data files
├── tests/                       ← Unit test suites
└── docs/                        ← Visual documentation assets
```

---

## 10. Microservices Overview

| Service | Port | What It Does |
|---|---|---|
| **Auth Service** | 8001 | Register, login, OTP verification, JWT tokens, refresh token rotation |
| **User Service** | 8002 | User profiles, twin updates, behavioral fingerprint, notifications |
| **Behavior Engine** | 8003 | Compatibility calculation, discovery feed (Gale-Shapley), swipe logic |
| **Sentiment Engine** | 8004 | Real-time sentiment analysis of posts and comments via WebSocket |
| **AI Agent Service** | 8005 | Twin retrieval, avatar generation (Celery), date simulations |
| **Community Service** | 8006 | Communities, posts, comments, health scores |
| **Feedback Service** | 8007 | User feedback and flagging |
| **Graph Service** | 8008 | Social graph, mutual connections, relationship mapping |
| **Search Service** | 8010 | Full-text search powered by MeiliSearch |

All services share the same database models and utils from `packages/shared-utils`. The gateway loads them all and merges their routes into one unified API at startup.

---

## 11. Core Algorithms

### Gale-Shapley Stable Matching

Used in the discovery feed to produce a stable set of matches — meaning no two people would both prefer to be matched with each other over their current matches. This is the same algorithm used in medical residency placements. It removes bias toward whoever signed up first or has the most activity.

### MBTI Behavioral Engine

Does not ask "are you more introverted or extroverted?" — that is too easy to game. Instead it watches *how* you respond. Are your answers fast or slow? Do you hedge or commit? Do you pick the logical option or the emotionally safe one? The engine builds a behavioral fingerprint from that data and maps it to MBTI dimensions.

### Konvo DNA Indexes

Nine dimensions scored from 0 to 100 that measure who you are across:
`Behavior · Personality · Communication · Relationship · Emotional · Lifestyle · Interest · Trust · Values`

These get calculated from your quiz results and your activity on the platform. They evolve over time. Two users whose DNA indexes are close across most dimensions will have high compatibility.

### Compatibility Engine

The compatibility score between two users is calculated from a weighted combination of:
- MBTI type compatibility matrix
- Astrology alignment (sun, moon, ascendant)
- Konvo DNA dimension distance
- Interest cluster overlap
- Communication and social vector similarity
- Behavioral fingerprint cosine similarity

The final score produces a tier label: `Rare Connection · Strong Match · Compatible · Possible · Low Alignment`

### Date Simulator

The twin conversation engine generates a dialogue log between two agents. It uses each twin's `prompt_template` (built from their personality profile) to drive distinct speaking styles. The dialogue is scored on humor resonance, values alignment, and conversational chemistry.

### Sentiment Analysis

Every post and comment on the community feed gets scored across multiple dimensions in real time: positive/neutral/negative sentiment, trait signals (supportive, curious, aggressive, constructive), toxicity risk, fact density, and constructiveness score. This keeps the community quality high automatically.

---

## 12. Getting Started

### Local Development with Docker (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/rotric04/Konvo.git
cd Konvo

# 2. Copy environment variables
cp .env.example .env
# Fill in your values (see Environment Variables section)

# 3. Start the full stack
docker compose up --build

# 4. Seed the database with example data
python seeder.py
```

The app will be available at `http://localhost:8000`
Celery flower dashboard at `http://localhost:5555`
API docs at `http://localhost:8000/docs`

### Running Without Docker

```bash
# Create a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run migrations and start
python gateway.py
```

> You will need PostgreSQL, Redis, and MeiliSearch running locally for full functionality. Without them, the app falls back to SQLite and in-memory storage automatically.

### Running Tests

```bash
pytest tests/ -v
```

---

## 13. Environment Variables

Copy `.env.example` to `.env` and fill in the following.

```env
# Database
DATABASE_URL=postgresql://konvo_user:konvo_password@localhost:5432/konvodb

# Redis
REDIS_URL=redis://localhost:6379/0

# Celery
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# Authentication
JWT_SECRET_KEY=your_super_secret_key_here
JWT_ALGORITHM=HS256

# Search
MEILISEARCH_URL=http://localhost:7700
MEILISEARCH_MASTER_KEY=your_meili_key

# Error tracking (optional)
SENTRY_DSN=

# Admin portal
ADMIN_PASSPHRASE=your_admin_passphrase
ADMIN_ROUTE_PATH=your-secret-admin-path

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
```

---

## 14. API Reference

The full interactive API documentation is auto-generated and available at `/docs` (Swagger UI) or `/redoc` when the server is running.

### Key Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/register` | POST | Create a new account |
| `/api/auth/login` | POST | Login and receive JWT tokens |
| `/api/auth/verify-otp` | POST | Verify OTP for account activation |
| `/api/agents/twin` | GET | Get your AI twin profile |
| `/api/agents/twin` | PUT | Update your twin's style and preferences |
| `/api/agents/twin/avatar/generate` | POST | Generate a visual avatar (async) |
| `/api/agents/simulations` | GET | List all your virtual date simulations |
| `/api/agents/simulations/{id}` | GET | Get a specific simulation transcript |
| `/api/agents/simulations/{id}/approve` | POST | Approve or decline a match |
| `/api/compatibility/discovery` | GET | Get your sorted discovery feed |
| `/api/compatibility/calculate/{id}` | GET | Calculate compatibility with a user |
| `/api/compatibility/swipe` | POST | Swipe pass or interest on a user |
| `/api/chat/messages` | GET | Get chat messages with a user |
| `/api/sentiment/live-ratios` | GET | Get platform-wide sentiment stats |
| `/api/search` | GET | Full-text search for users |
| `/api/health` | GET | Service health check |

WebSocket endpoints:

| Endpoint | Description |
|---|---|
| `/ws/realtime` | Real-time notifications and presence |
| `/api/sentiment/ws/live-sentiment` | Live sentiment stream |

---

## 15. How to Index This Repo on GitHub

If you want GitHub search, topic filtering, and the GitHub explore algorithm to find this repo more easily, here are the steps to do it properly.

### Step 1: Add Repository Topics

Go to your repo page → click the gear icon next to "About" → add these topics:

```
ai-agent  mbti  compatibility  social-platform  fastapi  python  
dating-app  personality  digital-twin  microservices  websockets  
three-js  redis  postgresql  gale-shapley  sentiment-analysis
```

### Step 2: Set the About Description

Keep it under 350 characters. Something like:

> AI-powered social platform where digital twin agents converse to preview compatibility before humans connect. Built with FastAPI microservices, MBTI engine, Gale-Shapley matching, and Three.js virtual environments.

### Step 3: Enable Features

In Settings, make sure these are enabled:
- Issues (so people can report bugs)
- Discussions (for community questions)
- Projects (if you want a public roadmap)
- Wikis (optional, for extended documentation)

### Step 4: Add a License

```bash
# Add MIT license
# Create a file called LICENSE in the root with MIT text
```

### Step 5: Pin this Repo on Your Profile

Go to your GitHub profile → click "Customize your pins" → add this repo.

### Step 6: Create a GitHub Social Preview Image

Go to repo Settings → Social preview → upload the `docs/konvo_architecture.png`. This image appears when someone shares your repo link on Twitter, Discord, etc.

### Step 7: Add Issue Templates

Create `.github/ISSUE_TEMPLATE/bug_report.md` and `feature_request.md` so contribution feels welcoming and organized.

### Step 8: Cross-Link and Share

- Post on r/Python, r/webdev, r/MachineLearning with a short write-up
- Share on Hacker News under "Show HN"
- Add to awesome lists (awesome-python, awesome-fastapi)
- Link in your portfolio and LinkedIn

---

## 16. What is Coming Next

Here is what the roadmap looks like. If any of these excite you, jump into the issues tab and claim one.

### Near Term

- [ ] **Voice Twin** — Your agent speaks using your voice style with text-to-speech
- [ ] **MBTI Growth Mode** — Weekly challenges based on your type's growth areas
- [ ] **Compatibility Timeline** — See how your compatibility with matched users changes over time
- [ ] **Mobile PWA Polish** — Full offline capability and push notification support
- [ ] **Mutual Friend Graph** — See how you are connected through shared communities

### Medium Term

- [ ] **Twin vs Twin Debate Mode** — Structured debates between agents on topics you both pick
- [ ] **Konvo Circles** — Small group experiences (3 to 5 people) for friendships, study groups, or team matching
- [ ] **AI Relationship Coach** — Post-match insights about what made connections work or not
- [ ] **Multi-language Support** — Agents that converse in the user's native language

### Long Term

- [ ] **Open Twin Protocol** — Let other apps request a Konvo twin for compatibility checking
- [ ] **B2B Integration** — Team compatibility for hiring and co-founder matching
- [ ] **Privacy-preserving ML** — Train personalization models without ever seeing raw user data

---

## 17. How to Collaborate

Konvo is built in public and welcomes contributors at every skill level.

### Ways to Contribute

**If you are a developer:**
- Pick an open issue labeled `good first issue` or `help wanted`
- Submit a PR with your fix or feature
- Review someone else's PR — it helps more than you think

**If you are good at design:**
- Suggest UI improvements via the Discussions tab
- Create visual assets for the docs folder
- Help design the mobile experience

**If you understand personality psychology or astrology:**
- Improve the MBTI type compatibility matrix in `matching_dsa.py`
- Enhance the astrology compatibility weights in `compatibility.py`
- Review the MBTI engine logic in `mbti_engine.py`

**If you are a writer:**
- Improve this README
- Write a blog post explaining how the twin agent system works
- Create onboarding copy that feels human and warm

### Getting Started as a Contributor

```bash
# 1. Fork the repo on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR-USERNAME/Konvo.git

# 3. Create a feature branch
git checkout -b feature/your-feature-name

# 4. Make your changes and commit
git commit -m "Add: description of what you did"

# 5. Push and open a pull request
git push origin feature/your-feature-name
```

### Code Standards

- Python: follow PEP 8, use type hints where possible
- Keep functions focused — one function does one thing
- Write a docstring for any new function that is not obvious
- Add a test in `tests/` for any new behavior you introduce

### Communication

- Questions go in [GitHub Discussions](https://github.com/rotric04/Konvo/discussions)
- Bugs go in [GitHub Issues](https://github.com/rotric04/Konvo/issues)
- Feature ideas can go in either depending on how formed the idea is

Every contribution gets credited. If you significantly improve a module, your name goes in it.

---

## 18. License

MIT License — do whatever you want with it, just keep the attribution.

```
Copyright (c) 2026 Konvo Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

<div align="center">

Built with curiosity, a lot of patience, and the honest belief that technology can help people find real connections.

**If you made it to the bottom of this README, you already understand Konvo better than most people. That probably means this is your kind of project.**

[Star this repo](https://github.com/rotric04/Konvo) · [Open an issue](https://github.com/rotric04/Konvo/issues) · [Start a discussion](https://github.com/rotric04/Konvo/discussions)

</div>
