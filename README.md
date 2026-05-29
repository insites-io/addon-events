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
Pricing is recomputed in `partials/purchase_ticket/compute_prices.liquid` on every step — the client never sets totals. Page-level access guards are written in Liquid (not JS) so an unauthenticated or out-of-order request is rejected before the page renders. Post-payment re-entry into earlier steps is blocked to prevent double-charges.

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
│   ├── payment_method/  system/  venues/
├── migrations/            Seed data + schema migrations (run in filename order)
└── views/
    ├── pages/             File-based routes
    │   ├── api/           JSON endpoints (contacts / events / orders)
    │   ├── events/        upcoming-events, previous-events (list + detail)
    │   ├── ticket/        purchase / billing / payment / confirmation / allocate
    │   ├── portal/        itinerary-upcoming, itinerary-previous (members)
    │   ├── account/       Account-related event pages
    │   └── admin/         Admin-only views
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
| `/purchase-ticket?event=<EVENT_UUID>` | Step 1 — ticket selection |
| `/ticket-billing` | Step 2 — billing details |
| `/ticket-payment` | Step 3 — Stripe payment |
| `/purchase-ticket-confirmation` | Step 4 — confirmation |
| `/allocate-ticket` | Allocate purchased tickets to attendees |

### Portal (member-only)
| Route | Description |
|---|---|
| `/portal/itinerary-upcoming` | Logged-in member's upcoming events |
| `/portal/itinerary-previous` | Logged-in member's past events |

### JSON API endpoints
Defined under `pages/api/**`. Used by the checkout JS and async UI:
- `POST /api/orders/create-order` — revalidates availability, computes totals, creates order, triggers Stripe + callbacks
- `/api/events/tickets/*` — availability checks, ticket lookups
- `/api/contacts/*` — guest/member contact create/update

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
- **Stripe keys** — loaded via `modules/portal/stripe/get_stripe_settings` (consumed by `partials/purchase_ticket/payment_step/payment_step.liquid`)
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

### Conventions
- **Liquid Liquid Liquid** — page logic, guards, and pricing computation live in Liquid, not in client JS
- **GraphQL filenames must match the operation name** inside them (e.g. `get_event.graphql` contains `query get_event`)
- **Integer property filters** in GraphQL use `value_int` (not `value_integer`) with variable type `Int`
- **`record_update` has no `errors` block** — valid return fields are `id`, `table`, `properties`, `created_at`, `updated_at`
- **Do not edit `.min.js` / `.min.css`** — they are regenerated on save by the project's VSCode extension

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
