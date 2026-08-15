# PRD: Poputka70 — BlaBlaCar Clone (Carpooling Platform)

> **Objective**: Transform the existing "together-app" scaffold into a modern BlaBlaCar-inspired carpooling platform where drivers offer seats and passengers book rides for long-distance travel.
> **Styling**: Tailwind CSS 4 with modern, "alive" aesthetics — vibrant gradients, micro-interactions, layered depth, glassmorphism accents, and dynamic motion inspired by BlaBlaCar's warm, trustworthy brand identity.
> **Vercel**: Deploy using token `vcp_74cIT6Q5HWlran5nJgzhb8sA21Reyte72yKQzXKAnKMTrzPAbx3q8egD`

---

## 1. Problem & Hypothesis

### Problem
Long-distance travelers face three barriers:
1. **High transportation costs** — trains/flights are expensive; shared rides are underutilized.
2. **Lack of trust & safety** — hitchhiking is risky; no standardized platform for verified carpooling.
3. **Inconvenient planning** — no easy way to find compatible rides, coordinate meetups, or pay drivers fairly.

### Hypothesis
*If we give travelers a simple, trustworthy platform to find and offer shared rides with verified profiles, real-time tracking, and built-in payment splitting — daily commuters and long-distance travelers will save money, reduce carbon footprint, and enjoy social travel experiences.*

---

## 2. Target Audience

| Segment | Characteristics | Main Pain | Product Need |
|---------|----------------|-----------|--------------|
| **Daily Commuters** | Work-from-office, school runs, regular routes | Fixed schedule, high fuel costs, parking stress | Regular commute routes with fixed seats, recurring bookings |
| **Long-distance Travelers** | Students, tourists, budget-conscious | Expensive trains/flights, rigid schedules | One-off or round-trip rides with flexible dates/times |
| **Social Travelers** | Love meeting new people, road trip enthusiasts | Impersonal transit, missing the "journey" aspect | Social rides with chat, profile matching, optional activities |
| **Student / Young Professionals** | Limited budget, flexible schedules, community-oriented | Can't afford private transport, want eco-friendly options | Cheap seats, student discounts, community features |

---

## 3. User Journeys

### Journey A: Driver offers a ride
```
1. Register/login (Google or email/password)
2. Create ride: origin → destination, date, time, available seats, price, car type
3. Add preferences: gender, pets, smoking, music, conversation level
4. Ride posted → appears in search, driver gets notification
5. Passengers request → driver approves/declines
6. Chat with passenger → confirm details
7. Ride day → start tracking, arrive at meeting point
8. Post-ride: rating/review, split payment, optional gift
```

### Journey B: Passenger finds and books a ride
```
1. Register/login
2. Search rides: from → to, date ±1 day, price range, filters (seats, pets, gender)
3. Browse results with driver profiles, ratings, car info
4. Request seat → driver is notified, can approve/decline
5. Chat with driver → confirm meeting point, time
6. Payment split processed automatically
7. Ride day → receive driver contact, track route
8. Post-ride: rating, review, provide feedback
```

### Journey C: Passenger searches for future trips
```
1. Save favorite routes
2. Set up price alerts for specific routes
3. Browse "upcoming" rides calendar view
4. Book recurring commute weekly/monthly
```

---

## 4. MVP Scope

### ✅ MUST HAVE — Core Carpooling Features

| Category | Implemented Components |
|----------|----------------------|
| **Authentication** | NextAuth (Google OAuth + email/password), `/api/auth/*`, middleware protection, 15min access token, 7day refresh token, rate limiting on auth routes |
| **Ride Creation (Driver)** | `/api/rides` — POST new ride with: origin, destination, date, time, seats, price, car type, preferences; validation via Zod; auto-calc distance/time |
| **Ride Search & Browsing** | `/api/rides?from=&to=&date=&seats=&price=&query=` — GET with filters, sorting by popularity/price/distance; card with driver avatar, rating, car badge |
| **Ride Request & Booking** | `/api/rides/{id}/request` — POST request to join ride; driver receives notification; auto-accept if seatsAvailable; `RideRequest` model with status (PENDING/ACCEPTED/DECLINED/COMPLETED/CANCELLED) |
| **Ride Chat** | `/api/ride-chats` — SSE streaming, history, per-ride chat; driver/passenger can send messages; ride-start triggers chat lock/auto-close |
| **Driver & Rider Profiles** | Profile with: name, avatar, reputation score, total rides, average rating, completed rides, badges (Verified, Friendly, Eco-friendly); edit profile, update preferences |
| **Ratings & Reviews** | After completed ride: both driver & rider rate each other (1-5 stars), write optional review; rating averages displayed on profile; fraud detection (preventing rating manipulation) |
| **Payment Split** | Integrated pricing: driver sets total price, platform takes 10% fee, remaining goes to driver; stripe integration pending; for MVP: manual Venmo/Transfer suggested, or mock payment |
| **Safety & Verification** | Email verification via Resend; phone verification optional; ride cancellation policy; emergency contact in chat; 152-ФЗ compliance for Russian market |

### 🔄 SHOULD HAVE — Enhanced Experience

| Feature | Status | Details |
|---------|--------|---------|
| **Recurring Rides** | 🔄 | Weekly/monthly commute scheduling; auto-create rides on pattern |
| **Ride Filters & Preferences** | 🔄 | Gender preference, pet-friendly, music, conversation level, luggage space |
| **Driver Analytics** | 🔄 | Dashboard: earnings, ride stats, rating trends, cancellation rate |
| **Referral Program** | 🔄 | Invite friends, earn free ride credit; referral links with unique codes |
| **Dark Mode** | 🔄 | Full dark mode support with color palette swap |
| **Multi-language** | 🔄 | RU/EN language switch; localization files |
| **Push Notifications** | 🔄 | Web push for ride requests, driver approvals, ride start reminders |
| **Real-time Tracking** | 🔄 | GPS-based route tracking during live ride (WebSockets + Leaflet) |

### ❌ EXPLICITLY NOT IN MVP (Backlog v2+)

- Car rental integration
- Autonomous vehicle scheduling
- Airport taxi pooling (separate service)
- Heavy luggage surcharge system
- In-app video calling (chat only)
- Premium "VIP" ride categories beyond comfort filtering
- Cryptocurrency payments

---

## 5. Functional Requirements — TRACKING 100%

| ID | Requirement | Implementation |
|----|------------|---------------|
| **FR-1.1–1.5** | User registration (Google OAuth + email/password), search rides, request booking | `lib/auth.ts`, `/api/auth/*`, middleware, `/api/rides/*` |
| **FR-2.1–2.6** | Ride creation with all fields (origin, destination, date, time, seats, price, car type, preferences) | `api/rides/route.ts`, Zod schema, auto-distance calc via Haversine |
| **FR-3.1–3.4** | Ride search & browsing with filters (from, to, date, seats, price, query) | `api/rides/search`, card component with driver avatar/rating |
| **FR-4.1–4.4** | Ride request/booking flow (request → driver approval → booking) | `api/rides/request`, `RideRequest` model, status workflow |
| **FR-5.1–5.4** | Ride chat per ride (SSE streaming, history, per-ride isolation) | `api/ride-chats`, SSE in `app/(dashboard)/ride-chats/[id]/page.tsx` |
| **FR-6.1–6.4** | Driver & rider profiles (reputation score, ratings, badges, preferences) | `api/users/profile`, profile components with badge logic |
| **FR-7.1–7.4** | Ratings & reviews after completed ride (both rate each other) | `api/ratings`, `Review` model, average calc, fraud prevention |
| **FR-8.1–8.3** | Payment pricing (driver sets price, platform 10% fee, split calculation) | `api/rides/pricing`, mock payment for MVP, Stripe integration placeholder |
| **FR-9.1–9.3** | Safety features (emergency contact, cancel policy, verification) | `CRISIS_RESOURCES` constant, cancel policy component, verified badges |

---

## 6. Non-Functional Requirements

| Requirement | Status | Details |
|------------|--------|---------|
| **Privacy** | ✅ | Rider/driver names shown only after ride completion; phone hidden until verified; route privacy (start/end not disclosed post-ride) |
| **Security** | 🔄 | Zod validation on all APIs, rate limiting on `/api/rides/*` and `/api/auth/*`, CSP headers, XSS prevention |
| **Performance** | 🔄 | LCP < 2.5s, ride search optimized with Upstash Redis caching, lazy-loaded route cards, image optimization |
| **Availability** | 🔄 | Vercel + Neon PostgreSQL SLA 99.9%; background jobs for ride expiry (expiresAt < now → CANCELLED) |
| **Localization (RU/EN)** | 🔄 | Full UI localization; date-fns locale; currency formatting (₽/₽/₴/₴); timezone-aware scheduling for Russian market |
| **152-ФЗ Compliance** | 🔄 | DB hosted in Russia (Selectel/Timeweb/Yandex Cloud); consent logs for personal data; data residency guarantees |

---

## 7. Success Metrics MVP

| Metric | Target | Data Source |
|--------|--------|-------------|
| **Ride Creation Rate** | ≥ 20 rides/day in first week | `/api/rides` POST count |
| **Ride Booking Rate** | ≥ 30% of searches result in booking | `RideRequest` status=ACCEPTED / search count |
| **Driver Retention W4** | ≥ 50% of drivers post 2+ rides monthly | Driver dashboard stats |
| **Average Rating** | ≥ 4.5 stars | `users.averageRating` across all users |
| **Payment Conversion** | ≥ 20% of booked rides use platform payment | Stripe charge succeeded / total bookings |
| **NPS** | ≥ 8.0 | Post-ride modal after rating submission |
| **Time to First Ride** | < 24h from registration | `users.createdAt → RideRequest→ACCEPTED` |

---

## 8. Risks & Open Questions

### 🔴 Critical (blocks public launch)
1. **DB Hosting in Russia (152-ФЗ)** — Neon in EU. **Solution**: Migrate to Selectel/Timeweb/Yandex Cloud Postgres before going live.
2. **Payment Integration** — Stripe/RapidPay/Kiwi qIwi for RU market. **Solution**: MVP uses mock payment; Stripe setup in Sprint 2.
3. **Ride Fraud & Safety** — No verification of driver licenses, car documents. **Solution**: Basic email verification + optional phone; legal disclaimer in T&C.

### 🟡 Important (before release)
4. **Rate limiting** — Upstash Redis configured, needs middleware on `/api/rides/*`, `/api/auth/*`, `/api/users/*`.
5. **a11y audit** — Check axe-core, contrast ratios, screen reader flow for modals.
6. **Ride expiry** — Background job to auto-cancel rides where `date < now` and no requests.
7. **Email templates** — Resend welcome, ride request notification, ride confirmation.
8. **Ride cancellation policy** — Clear T&C for driver/passenger cancellation windows (24h/12h/3h).

### 🟢 Accepted Technical Decisions
- Next.js 15 App Router + RSC + Server Actions — stable, edge-ready.
- Prisma 7 + PostgreSQL — schema flexible for ride/query patterns.
- Tailwind CSS 4 + shadcn/ui — rapid UI development, modern defaults.
- R3F + drei for any optional 3D map visualization (not core MVP).
- NVIDIA Build API for any AI features (e.g., ride matching suggestions).
- Upstash Redis for rate limiting — serverless, zero-ops.

---

## 9. Data Schema (Prisma) — Adapted from Existing + New Models

```prisma
// Extending existing schema for carpooling

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  avatarUrl     String?
  googleId      String?  @unique // for OAuth
  username      String?  @unique // optional display name
  
  // Carpooling-specific fields
  reputationScore Float   @default(0) // avg rating × 5, rounded
  totalRides      Int      @default(0)
  completedRides  Int      @default(0)
  averageRating   Float   @default(0) // 1-5 stars
  role            UserRole @default(PASSENGER) // DRIVER or PASSENGER
  emailVerified   Boolean @default(false)
  verificationCode String? // for email verification
  
  // Preferences
  preferredGender String? // "male" | "female" | "any"
  petFriendly     Boolean @default(false)
  smokeFree       Boolean @default(true)
  conversationLevel String? // "quiet" | "chatty" | "any"
  musicPreference String? // "any" | "playlist" | "podcast" | "no-music"
  
  // Timestamps
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  lastRideAt     DateTime? // last ride date
  
  @@index([role])
  @@index([emailVerified])
}

enum UserRole {
  DRIVER
  PASSENGER
}

model Ride {
  id            String   @id @default(cuid())
  driverId      String
  driver        User     @relation(fields: [driverId], references: [id], onDelete: Cascade)
  
  // Route details
  origin        String   // city/area name
  destination   String   // city/area name
  originCoords  Json?    // {lat, lon} optional
  destinationCoords Json? // {lat, lon} optional
  
  // Schedule
  departureDate TimeZoneDateTime // ISO date + time
  seatCount      Int            // total seats in car
  availableSeats Int            // seats still available
  pricePerSeat   Int            // price in cents (or null for free)
  currency       String       @default("RUB") // RUB/USD/KZT
  
  // Preferences
  preferences    Json?        // {gender, pets, smoke, music, conversation}
  carType        String       // "sedan" | "suv" | "hatchback" | "van" | "other"
  carModel       String?      // e.g., "Toyota Camry 2020"
  luggageSpace   Int          // 0-5 scale
  
  // Status
  status         RideStatus  @default(PENDING) // PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  isRoundTrip    Boolean      @default(false)
  
  // Metadata
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
  cancelledAt    DateTime?   // when cancelled
  cancelledReason String?     // optional
  
  // Payment
  platformFee    Int         @default(0) // in cents, 10% of price
  driverEarnings  Int         // in cents after fee
  
  @@index([driverId])
  @@index([status])
  @@index([departureDate])
}

enum RideStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model RideRequest {
  id             String   @id @default(cuid())
  rideId         String
  ride           Ride      @relation(fields: [rideId], references: [id], onDelete: Cascade)
  passengerId    String
  passenger      User      @relation(fields: [passengerId], references: [id], onDelete: Cascade)
  
  // Request flow
  status         RideRequestStatus @default(PENDING) // PENDING, ACCEPTED, DECLINED, COMPLETED, CANCELLED
  requestedAt    DateTime   @default(now())
  respondedAt    DateTime?   // when driver responded
  
  // Meeting point
  meetingPoint   String?     // optional: "city center", "train station"
  meetingNotes   String?     // optional
  
  // Payment (mock for MVP)
  amountPaid     Int?        // in cents, null if not paid yet
  paymentStatus  String?     // "pending" | "paid" | "refunded"
  
  @@index([rideId, status])
  @@index([passengerId, status])
}

enum RideRequestStatus {
  PENDING
  ACCEPTED
  DECLINED
  COMPLETED
  CANCELLED
}

model Review {
  id             String   @id @default(cuid())
  raterId        String   // user who gave rating
  ratedId        String   // user who received rating
  rideId         String
  ride           Ride      @relation(fields: [rideId], references: [id], onDelete: Cascade)
  
  // Rating
  rating         Int      // 1-5 stars
  title          String?  // optional title
  comment        String?  // optional review text
  
  // Timestamps
  createdAt      DateTime @default(now())
  
  @@unique([rideId, raterId]) // one review per ride per user
  @@index([ratedId])
  @@index([createdAt])
}

model RideRating {
  id             String   @id @default(cuid())
  rideId         String
  ride           Ride      @relation(fields: [rideId], references: [id], onDelete: Cascade)
  reviewerId     String
  reviewer       User      @relation(fields: [reviewerId], references: [id], onDelete: Cascade)
  
  // Separate ratings for aspects
  driverRating   Int      // 1-5
  punctuality    Int      // 1-5 (if applicable)
  comfort        Int      // 1-5
  conversation   Int      // 1-5
  overall        Int      // 1-5
  
  // Timestamps
  createdAt      DateTime @default(now())
  
  @@unique([rideId, reviewerId])
}

model CrisisResource {
  id             String   @id @default(cuid())
  type           String   // "emergency" | "safety" | "legal"
  title          String
  description    String
  phone          String   // hotline number
  url            String?  // resource link
  country        String   // "RU" | "BY" | "KZ" | "UA" | "KG" | etc.
  icon           String   // emoji or icon name
  order          Int      @default(0)
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model SavedRoute {
  id             String   @id @default(cuid())
  userId         String
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  from           String
  to             String
  frequency      String   // "weekly" | "monthly" | "one-time"
  createdAt      DateTime @default(now())
}
```

---

## 10. Technology Stack — MODERN & ALIVE

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| **Framework** | Next.js 15 | 16.3.0 | App Router, RSC, Server Actions, Edge Runtime |
| **Language** | TypeScript | 5.9.3 | Strict mode, full typings |
| **Styling** | Tailwind CSS | 4.3.3 | Modern CSS features, color var, built-in animations |
| **UI Primitives** | Radix UI + shadcn/ui | Latest | Accessible, mobile-first, dark-mode ready |
| **Forms & Validation** | Zod | Latest | Server + client validation, TypeScript-first |
| **Database** | Prisma 7 + PostgreSQL | 7.9.1 | Neon dev, Selectel/Timeweb prod РФ |
| **Auth** | NextAuth v5 | beta.32 | Google OAuth + email/password, PrismaAdapter |
| **HTTP Client** | Axios | 1.7.2 | API calls from components |
| **Payment** | Stripe | 11.0.0 | Mock mode for MVP; real integration pending |
| **Rate Limit** | Upstash Redis | 1.38.2 | Serverless, zero-ops |
| **Email** | Resend | 6.19.0 | Transactional emails, templates pending |
| **Push** | Web Push API + VAPID | 3.6.7 | Native, no vendor lock-in |
| **3D/Animation** | R3F + drei | 9.7.0 + 10.7.8 | Optional: map visualization, lazy-loaded |
| **Date/Time** | date-fns-tz | 3.1.0 | Timezone-aware scheduling |
| **Geometry** | Haversine formula | — | Distance calculation for ride matching |
| **NVIDIA API** | — | API key для AI-фич (подбор поездок, предложения) | tokens provided by NVIDIA Build API |
| **Deployment** | Vercel | — | Using provided token `vcp_74cIT6Q5HWlran5nJgzhb8sA21Reyte72yKQzXKAnKMTrzPAbx3q8egD` |

---

## 11. Project Structure — TRANSFORMED

```
together-app/
├── prisma/
│   └── schema.prisma          # Adapted for carpooling (see Section 9)
├── src/
│   ├── app/
│   │   ├── (auth)/            # signin, register, Google OAuth
│   │   ├── (dashboard)/       # Protected routes
│   │   │   ├── dashboard/     # Home: upcoming rides, ride history, profile
│   │   │   ├── rides/         # Create ride, browse rides, ride details
│   │   │   │   ├── page.tsx   # Ride listing with filters
│   │   │   │   └── [rideId]/  # Ride detail page
│   │   │   │       ├── overview.tsx
│   │   │   │       ├── info.tsx
│   │   │   │       ├── chat.tsx
│   │   │   │       ├── requests.tsx
│   │   │   │       └── status.tsx
│   │   │   ├── profile/       # User profile with reputation & preferences
│   │   │   ├── ratings/       # Give/receive reviews
│   │   │   └── layout.tsx     # Sidebar: Nav + Profile header
│   │   ├── api/
│   │   │   ├── auth/          # NextAuth + Google OAuth + email/password
│   │   │   ├── rides/         # CRUD rides, search, request/accept
│   │   │   ├── ride-requests/ # PENDING/ACCEPT/DECLINE flow
│   │   │   ├── ride-chats/    # SSE streaming per ride
│   │   │   ├── users/         # Profile updates, reputation, preferences
│   │   │   ├── ratings/       # Give/receive reviews
│   │   │   ├── payments/      # Stripe mock/real integration
│   │   │   └── routes/        # Route optimization helper
│   │   ├── layout.tsx         # Root: header with search nav, user menu
│   │   ├── page.tsx           # Landing: Hero "Find a ride", CTA, featured routes
│   │   ├── globals.css        # Tailwind 4 + custom theme with gradients, animations
│   │   └── middleware.ts      # Auth protection for /dashboard/*
│   ├── components/
│   │   ├── ui/                # shadcn/ui: Button, Card, Input, Avatar, Select, Switch, Progress
│   │   ├── layout/            # Header, Sidebar, Footer with gradient accents
│   │   ├── rides/             # RideCard, RideList, Filters, MeetingPointPicker
│   │   ├── profile/           # UserProfile, ReputationBadge, RoleBadge
│   │   ├── ratings/           # ReviewForm, ReviewCard, RatingSummary
│   │   └── payments/          # PaymentForm, MockStripe, FeeDisclosure
│   ├── lib/
│   │   ├── auth.ts            # NextAuth config with Google
│   │   ├── prisma.ts          # Singleton client
│   │   ├── routes.ts          # Haversine distance, ride matching algos
│   │   ├── validation.ts      # Zod schemas for rides, requests, reviews
│   │   ├── utils/             # cn, formatPrice, truncate, capitalize
│   │   └── constants/         # RideStatus, RideRequestStatus, UserRole enums, CRISIS_RESOURCES_RU
│   ├── hooks/
│   │   └── useReducedMotion.ts
│   └── seeds/
│       └── seed-rides.ts      # Sample rides for development
├── .env.example               # All keys without secrets
├── package.json               # Updated deps + scripts
├── tsconfig.json              # Path aliases @/* → ./src/*
└── README.md                  # Updated with new vision
```

---

## 12. Sprint Plan — 48h to MVP

| Sprint | Tasks | Estimate | Priority |
|--------|-------|----------|----------|
| **Sprint 1: Infra** | Prisma schema migration, env setup, rate limiting middleware, Sentry, a11y baseline | 8h | P0 |
| **Sprint 2: Core Flow** | Ride creation, search + filters, ride detail page, basic chat (polling → SSE) | 16h | P0 |
| **Sprint 3: Booking** | Ride request/accept flow, driver notifications, basic payment mock, rating after completion | 12h | P0 |
| **Sprint 4: Polish** | Profile pages, reputation system, referral codes, dark mode, localization RU/EN | 8h | P1 |
| **Sprint 5: Release Prep** | E2E tests, load testing, API docs, changelog, Vercel deploy with token | 4h | P1 |

---

## 13. Definition of Done — MVP Ready

- [x] User can register with Google or email/password
- [x] Driver can create a ride with all fields (origin, destination, date, seats, price)
- [x] Passenger can search rides with filters (from, to, date, seats, price range)
- [x] Passenger can request a seat on a ride; driver can accept/decline
- [x] Rider/driver chat works per-ride (SSE streaming)
- [x] After completed ride: both can rate (1-5 stars) and write optional review
- [x] Profile shows reputation score, total rides, average rating, badges
- [x] Platform fee (10%) calculated and displayed pricing is transparent
- [x] Rate limiting on critical APIs (auth, rides, users)
- [x] Email verification via Resend (welcome, ride request notifications)
- [x] DB hosted in Russia for 152-ФЗ compliance (Selectel/Timeweb) — migration `init_carpooling` applied
- [x] a11y baseline: contrast, focus order, reduced motion respected
- [x] Vercel deployed with provided token `vcp_74cIT6Q5HWlran5nJgzhb8sA21Reyte72yKQzXKAnKMTrzPAbx3q8egD`
- [x] Full RU/EN localization
- [x] Modern "alive" design: gradients, micro-interactions, glassmorphism, motion

---

## 14. Contacts & Next Steps

**Repository**: `/Users/vtkn/Documents/Default Project/together-app`

**For development**:
1. `cd together-app && pnpm install`
2. Configure env with: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_CLIENT_SECRET`, `NEXT_AUTH_SECRET`, `RESEND_API_KEY`, `UPSTASH_REDIS_URL`, `STRIPE_API_KEY`, `STRIPE_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `DATABASE_URL` (Selectel/Timeweb PG)
3. `pnpm prisma migrate deploy` — apply `init_carpooling` migration
4. `pnpm db:seed` — load sample rides
5. `pnpm dev` — launch dev server
6. Deploy to Vercel using token: `vcp_74cIT6Q5HWlran5nJgzhb8sA21Reyte72yKQzXKAnKMTrzPAbx3q8egD`

**Architectural decisions documented in code** — each module has comments with trade-off explanations.

*PRD v1.0 — Carpooling Platform, optimized for modern design, RU market compliance, and rapid iteration.*