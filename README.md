# Events Addon

Latest: `v1.1.0` (see `CHANGELOG.md`)

## Overview
The Events Addon is an Insites module that adds event listing + event detail pages, a multi-step ticket purchase flow (guest + member), ticket allocation, and supporting API endpoints and migrations.


## Prerequisites
- **Website & Portal**: `>= v1.3.0` (see `CHANGELOG.md`)
- **Payment gateway**: Stripe (configured in the IIA)

## Dependencies
### Application dependency (Marketplace)
- **Website & Portal** (install first)

### Module dependencies
- **API**
- **CMS**
- **CRM**
- **Ecommerce**
- **Events**

## What gets installed
Most of the addon lives under `modules/events/public/`:
- **Pages (routes)**: `modules/events/public/views/pages/**`
- **Partials**: `modules/events/public/views/partials/**`
- **GraphQL**: `modules/events/public/graphql/**`
- **Migrations / seed data**: `modules/events/public/migrations/**`
- **Assets**: `modules/events/public/assets/**` (JS/CSS)

## Key routes
### Public event pages
- **Upcoming events (list + detail)**: `/upcoming-events`  
  - Detail view: `/upcoming-events/<event-slug>` (uses `slug2`)
- **Previous events (list + detail)**: `/previous-events`  
  - Detail view: `/previous-events/<event-slug>`

### Ticket purchase flow
- **Purchase ticket (multi-step UI)**: `/purchase-ticket?event=<EVENT_UUID>`
- **Allocate ticket**: `/allocate-ticket` (used after purchase / for allocation flows)
- **Purchase confirmation**: `/purchase-ticket-confirmation`

### JSON API endpoints (used by the JS checkout flow)
Routes are defined under `modules/events/public/views/pages/api/**`. Common ones:
- **Create order**: `POST /api/create-order` (revalidates availability, computes totals, creates order, triggers payment + callbacks)
- **Ticket endpoints**: `/api/events/tickets/*` (availability checks, allocation, etc.)
- **Contact endpoints**: `/api/contacts/*` (guest/member contact operations)

## Setup / installation
### 1) Add the module to your Portal Template
- Install Events Add-on via Insites Marketplace (https://console.insites.io/console#/marketplace)
- Ensure the dependency modules (Portal/Website/Ecommerce/CRM/Events) are installed and enabled.

### 2) Run migrations / seed data
This addon includes migrations/seeds under `modules/events/public/migrations/**` (events, venues, speakers, sponsors, FAQs, pricing tiers, pricing divisions).

Notes:
- If you’re upgrading, review `CHANGELOG.md` for migration notes (e.g. pricing divisions introduced in `v1.1.0`).

### 3) Configure payments (Stripe)
The ticket purchase flow requires Stripe settings to be present in the portal template:
- **Stripe settings** are loaded via `modules/portal/stripe/get_stripe_settings` (used in `modules/events/public/views/partials/purchase_ticket/payment_step/payment_step.liquid`).
- **Gateway selection** is read from `modules/portal/pay_bills/get_settings` (used in `modules/events/public/views/partials/orders/callback_init.liquid`).

If Stripe is not configured, the UI will show:
> “Payment settings not configured, please contact website administrator.”

## Development notes
- **Local/dev instance configuration**: Insites instance settings are typically stored in `.insites`. Treat it as **sensitive** (contains tokens/keys) and avoid sharing publicly.
- **Assets**: JS/CSS are included from `modules/events/public/assets/**` and referenced by pages like `purchase-ticket.liquid`.

## Features
- **Upcoming events**: list + details
- **Previous events**: list + details
- **Ticket purchase**: multi-step checkout (member + guest)
- **Ticket allocation**
- **My events / itinerary pages**: under `modules/events/public/views/pages/portal/**`

## Documentation
- Internal doc: [Click Here](https://docs.google.com/document/d/1z5RFTcwAnloFi3mjJ2pcdj4HzQix6TUUFqmLoop7JUM/edit?tab=t.0)
