# Events Addon

The Event Add-on is a powerful solution that enables you to create, manage, and promote events directly within your website and portal. It provides two key components: a public-facing Website where users can explore and purchase tickets, and a secure Portal that serves as your central hub for managing events, attendees, and orders.

Current version: **v1.1.1** — see [CHANGELOG.md](CHANGELOG.md).

---

## What it is

`addon-events` is an **Insites Marketplace addon**. It is not a standalone app — it ships a `modules/events/` folder that gets deployed on top of an existing Insites instance running the Website & Portal app. Once deployed, the host site gains:

- Public **upcoming** and **previous** event pages (list + detail)
- A multi-step **ticket purchase** flow (guest and signed-in member)
- **Ticket allocation** for multi-ticket orders
- **My events** itinerary pages inside the member portal
- Backing **GraphQL** queries/mutations, JSON **API endpoints**, and **migrations** that seed the underlying data models (events, venues, speakers, sponsors, FAQs, pricing tiers, pricing divisions)

The entire module is Liquid + GraphQL + vanilla JS — no build step, no framework.

---

## How it works

### Stack
- **Liquid templates** for page rendering and server-side logic
- **GraphQL** queries and mutations for data access
- **Insites** — the host environment that provides the Website, Portal, CRM, CMS, Ecommerce, and Events base modules this addon plugs into
- **Stripe** — payment gateway (configured at the portal level, consumed by this addon)

### Request flow
1. A request hits a Liquid page under `modules/events/public/views/pages/**` — the file path becomes the route (e.g. `pages/events/upcoming-events.liquid` → `/upcoming-events`).
2. The page pulls data via `.graphql` files under `modules/events/public/graphql/**`.
3. Partials under `modules/events/public/views/partials/**` render the UI fragments (event cards, stepper, order summary, etc.).
4. The ticket purchase flow uses session-backed state (see `partials/ticket/ticket_purchase_sessions.liquid`) so each step can re-enter cleanly without losing selections.
5. Checkout actions are POSTed to JSON endpoints under `pages/api/**`, which revalidate availability server-side, compute totals from database pricing (not client input), create the order, and trigger the Stripe payment + post-payment callbacks.

### Why server-side pricing & guards
Pricing is recomputed in `partials/ticket/compute_prices.liquid` (server-side, from DB pricing) when the order is created — the client never sets totals. Page-level access guards are written in Liquid (not JS) so an unauthenticated or out-of-order request is rejected before the page renders. Post-payment re-entry into earlier steps is blocked to prevent double-charges.

API endpoints derive the acting identity (contact/order/ticket) from `current_user` or the server session — never from the request body — so a caller cannot act on another user's records. 

---

## Repository layout

```
modules/events/public/
├── assets/                JS + CSS bundled with the module
├── authorization_policies/  Authorization policies
├── emails/                Order/ticket email templates
├── forms/                 Form objects
├── graphql/               Queries + mutations grouped by domain
│   ├── account/  address/  attachments/  event_custom_fields/
│   ├── event_tickets/  events/  migrations/  orders/
│   ├── payment_method/  system/
├── migrations/            Seed data + schema migrations (run in filename order)
└── views/
    ├── pages/             File-based routes
    │   ├── api/           JSON endpoints (contacts / events / orders)
    │   ├── events/        upcoming-events, previous-events (list + detail)
    │   ├── ticket/        ticket-purchase / -billing / -payment / -confirmation / -allocate, account-created
    │   ├── portal/        itinerary-upcoming, itinerary-previous (members)
    │   ├── account/       Account-related event pages
    └── partials/          Reusable Liquid fragments (events, ticket steps, orders, stripe, emails)
```

---

## Public routes

### Event pages
| Route | Description |
|---|---|
| `/upcoming-events` | List of upcoming events with filtering, search, AJAX pagination |
| `/upcoming-events/<slug>` | Event detail page (via `slug2`) |
| `/previous-events` | List of past events |
| `/previous-events/<slug>` | Past event detail page |

### Ticket purchase flow
| Route | Step |
|---|---|
| `/ticket-purchase?event=<EVENT_UUID>` | Step 1 — ticket selection |
| `/ticket-billing` | Step 2 — billing details |
| `/ticket-payment` | Step 3 — Stripe payment |
| `/ticket-confirmation` | Step 4 — confirmation |
| `/ticket-allocate` | Allocate purchased tickets to attendees |
| `/event-account-created` | Guest "account created" confirmation |

### Portal (member-only)
| Route | Description |
|---|---|
| `/itinerary-upcoming` | Logged-in member's upcoming events |
| `/itinerary-previous` | Logged-in member's past events |

### Admin (administrator-only)
Gated by the `modules/events/is_administrator` authorization policy.
| Route | Description |
|---|---|
| `/admin/event-thumbnail` | Bulk event-thumbnail sync tool |

### JSON API endpoints
File-based under `pages/api/**`; each route is the page's `slug`. Used by the checkout JS and async UI. Identity (contact/order/ticket) is always derived server-side, never from the request body.

**Orders**
- `POST /api/create-order` — revalidates availability, computes totals from DB pricing, creates the order, triggers Stripe + callbacks
- `POST /api/update-order` — retries payment on an existing order (order re-read from DB)
- `POST /api/set-confirmation-timestamp` — opens the confirmation page for the session's pending order

**Tickets & events**
- `GET  /api/check-ticket-availability` — validates a ticket selection and stores it in session
- `POST /api/create-tickets` — creates ticket records from the session selection (prices re-fetched from DB)
- `PUT  /api/allocate-ticket` — assigns a purchased ticket to an attendee (ownership-checked)
- `GET  /api/payment-methods` — the caller's own saved cards
- `GET  /api/events/list-results` — paginated/filtered event cards (also backs the member itinerary)

**Contacts**
- `POST /api/create-contact-company` — create guest contact + company
- `PUT  /api/update-contact` — update the caller's own contact
- `POST /api/create-contact-address` — add an address to the caller's own contact
- `POST /api/validate-email` — check whether an email already has an account (routes guest checkout)
- `PUT  /api/add-password` — set a password to convert a guest into a registered account

**Admin (administrator-only)**
- `GET  /admin/api/events-needing-thumbnail`, `GET /admin/api/check-thumbnail`, `GET /admin/api/thumbnail-upload-url`, `POST /admin/api/save-thumbnail` — event-thumbnail sync tooling

---

## Prerequisites

| Requirement | Version |
|---|---|
| **Website & Portal** app | `>= v1.3.3` |
| Payment gateway | **Stripe**, configured in the Insites instance |

### Required base modules
These are installed by Website & Portal — this addon depends on them being present and enabled:
- API
- CMS
- CRM
- Ecommerce
- Events

---

## Installation

### 1. Install via Insites Marketplace
Open [console.insites.io/console#/marketplace](https://console.insites.io/console#/marketplace) and install **Events Addon** onto the target instance. Make sure Website & Portal (and its dependency modules above) are installed first.

### 2. Migrations
Migrations under `modules/events/public/migrations/` seed the underlying records (constants, events, venues, speakers, sponsors, FAQs, pricing tiers, pricing divisions).

These run **once**, automatically, the first time the addon is installed on an instance via the Marketplace — they do not re-run on subsequent deploys or upgrades. Any data changes needed for a later version must ship as a new migration file.

See [CHANGELOG.md](CHANGELOG.md) for what each version added — e.g. v1.1.0 introduced `event_pricing_division` and reworked the venues seed.

### 3. Configure Stripe
The checkout reads Stripe settings from the portal:
- **Stripe keys** — loaded via `modules/portal/stripe/get_stripe_settings` (consumed by `partials/ticket/payment_step/payment_step.liquid`)
- **Gateway selection** — read via `modules/portal/pay_bills/get_settings` (consumed by `partials/orders/callback_init.liquid`)

If Stripe isn't configured, the payment step renders:
> *"Payment settings not configured, please contact website administrator."*

---

## Local development

### Deploying changes
The `.insites` file at the repo root maps environment names to instance URLs / tokens used by the project CLI:

```bash
insites-cli deploy <env>      # e.g. insites-cli deploy dev
insites-cli sync <env>        # live-sync while editing
insites-cli logs <env>        # tail instance logs
```

> ⚠️ `.insites` contains instance tokens — treat as sensitive, do not share publicly, do not commit to forks.

---

## Features

- **Upcoming events** — list with category/location filtering scoped to events that exist, search, AJAX pagination, skeleton loading states, auto-generated thumbnails
- **Previous events** — list + detail
- **Ticket purchase** — multi-step (selection → billing → payment → confirmation), supports both guest and member purchase, session-backed re-entry, server-side price computation
- **Ticket allocation** — assign purchased tickets to named attendees
- **Member itinerary** — upcoming/previous events for the logged-in member
- **Order emails** — confirmation, ticket allocation, and ticket detail emails under `partials/emails/`

---

## Documentation

Internal product/design doc: [Events Addon — Combinate Docs](https://docs.google.com/document/d/1z5RFTcwAnloFi3mjJ2pcdj4HzQix6TUUFqmLoop7JUM/edit?tab=t.0)

For module-level changes and migration notes, see [CHANGELOG.md](CHANGELOG.md).
