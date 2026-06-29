# addon-events

Insites events addon — event creation, ticketing, registration, Stripe payment, and Google Maps integration. Adds public event listing and detail pages, a multi-step ticket purchase flow (guest and member), ticket allocation, and supporting API endpoints and migrations. Active at `v1.1.0` (see `CHANGELOG.md`).

## Stack

- **Platform**: Insites (PlatformOS-based)
- **Templating**: Liquid
- **Data**: GraphQL queries and mutations
- **Payments**: Stripe
- **Maps**: Google Maps
- **Frontend assets**: JS and CSS bundled under `modules/events/public/assets/`

## Prerequisites

- **Website & Portal**: `>= v1.3.0`
- **Payment gateway**: Stripe, configured in the Insites instance
- **Module dependencies**: API, CMS, CRM, Ecommerce, Events
- **Application dependency**: Website & Portal (install first)

## Installation

### 1. Install the addon

Will be available via the Insites Console marketplace, or install directly from this repository.

Ensure the dependency modules (Website & Portal, Ecommerce, CRM, Events, CMS, API) are installed and enabled before activating the addon.

### 2. Run migrations and seed data

Migrations and seed data live under `modules/events/public/migrations/**` and cover events, venues, speakers, sponsors, FAQs, pricing tiers, and pricing divisions.

If upgrading, review `CHANGELOG.md` for migration notes (for example, pricing divisions introduced in `v1.1.0`).

## Configuration

### Stripe payments

The ticket purchase flow requires Stripe settings to be present in the portal template:

- **Stripe settings** are loaded via `modules/portal/stripe/get_stripe_settings` and used in `modules/events/public/views/partials/purchase_ticket/payment_step/payment_step.liquid`.
- **Gateway selection** is read from `modules/portal/pay_bills/get_settings` and used in `modules/events/public/views/partials/orders/callback_init.liquid`.

If Stripe is not configured, the UI shows: "Payment settings not configured, please contact website administrator."

### Local development

Insites instance settings are typically stored in `.insites`. Treat this file as sensitive (it contains tokens and keys) and never commit it to a public repository.

## What gets installed

Most of the addon lives under `modules/events/public/`:

- **Pages (routes)**: `modules/events/public/views/pages/**`
- **Partials**: `modules/events/public/views/partials/**`
- **GraphQL**: `modules/events/public/graphql/**`
- **Migrations / seed data**: `modules/events/public/migrations/**`
- **Assets**: `modules/events/public/assets/**`

## Key routes

### Public event pages

- **Upcoming events**: `/upcoming-events` (detail at `/upcoming-events/<event-slug>`)
- **Previous events**: `/previous-events` (detail at `/previous-events/<event-slug>`)

### Ticket purchase flow

- **Purchase ticket**: `/purchase-ticket?event=<EVENT_UUID>`
- **Allocate ticket**: `/allocate-ticket`
- **Purchase confirmation**: `/purchase-ticket-confirmation`

### JSON API endpoints

Routes live under `modules/events/public/views/pages/api/**`:

- `POST /api/create-order` — revalidates availability, computes totals, creates the order, triggers payment and callbacks
- `/api/events/tickets/*` — availability checks, allocation
- `/api/contacts/*` — guest and member contact operations

## Features

- Upcoming events list and detail pages
- Previous events list and detail pages
- Multi-step ticket purchase (member and guest)
- Ticket allocation
- My events and itinerary pages under `modules/events/public/views/pages/portal/**`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Contributions are accepted under the Developer Certificate of Origin (DCO); commits must be signed off with `git commit -s`.

## Licence

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
