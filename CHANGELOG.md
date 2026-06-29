## Changelog
All notable changes to the Events Addon are documented here.

## [v1.1.1] - 2026-04-24
### Prerequisites
- Website & Portal app: >= v1.3.3

### Added
- Skeleton loading states for event list pagination, filtering, and search
- Automatic thumbnail image generation for events
- AJAX loading on the upcoming and previous itinerary pages
- `is_administrator` authorization policy (`modules/events/public/authorization_policies/is_administrator.liquid`) and supporting `get_current_user_administrator` query, applied to the admin event-thumbnail page and all `admin/api/*` endpoints

### Changed
- Pagination and filtering on event lists now fetch only the list items via AJAX instead of reloading the full page
- Category and location filter options are now scoped to only show values that have associated events
- Ticket purchase flow restructured for improved reliability and maintainability
- Ticket confirmation page restructured for improved reliability and maintainability
- Ecommerce and Events modules brought up to date
- **Renamed the ticket purchase flow** from `purchase_ticket`/`purchase-ticket-*` to `ticket`/`ticket-*` across pages, partials, routes, JS, and session keys (`order_uuid` → `event_order_uuid`). Routes are now `/ticket-purchase`, `/ticket-billing`, `/ticket-payment`, `/ticket-confirmation`, `/ticket-allocate`
- Renamed the `order_created_date_valid` authorization policy to `allocation_confirmed_at`
- Order summary consolidated into a single partial and now uses `order_items` for post-payment display
- Ticket selection repopulates when navigating back to the ticket-purchase step
- `validate-email` converted to a POST endpoint
- Events Stripe charge now uses `sk_key_insites` to match ecommerce
- Ticket checkout uses the shared app-portal address lookup
- Constants consolidated into a single migration; dedicated `events_addon_google_map_id` constant for event maps
- Seed migrations guarded so they do not re-run; added speaker/sponsor image fallbacks
- Increased purchased-ticket fetch limit from 50 to 500
- Added "My" prefix to the upcoming/previous itinerary page titles

### Security
- Fixed account takeover in `add-password`: the target email is derived from the checkout session (`contact_email` / `temp_guest_contact_email`), never the request body
- Fixed insecure direct object references (IDOR) in `update-contact` (guest contact taken from session), `create-contact-address` (contact derived server-side), and `allocate-ticket` (ticket ownership verified against `purchased_by_uuid`)
- Closed unauthenticated order disclosure on the confirmation page: the `allocation_confirmed_at` policy now binds the URL `order_id` to the session's confirmed order, and `set-confirmation-timestamp` only opens the gate for a real pending order
- Guarded blank-identity data exposure in `payment-methods` and the `list-results` itinerary path (a null property filter would otherwise match every user's records)
- Removed contact UUID disclosure from `validate-email`
- Added a server-side duplicate-email guard on `create-contact-company`
- CSRF token now sent on the admin `save-thumbnail` request

### Fixed
- Layout and visual inconsistencies across the homepage, event list, event detail view, and all ticket purchase steps
- Mobile layout issues affecting the homepage, event card image ratio, list filters, event banner height, and navigation menu
- Semantic HTML and markup errors on the upcoming and previous event list pages
- Event list cards were not clickable following an AJAX reload
- Photo gallery navigation arrows now correctly hide when the viewer is at the first or last image
- Incorrect speaker image height
- Mobile view issues with order summary totals, the get-tickets link in the drawer, and menu colour
- WCAG and W3C accessibility violations across multiple event pages
- Clicking an event card sometimes navigated to the wrong event URL
- JavaScript console errors caused by the Google Maps integration
- Lighthouse issues related to ARIA attributes, image accessibility, and forced reflow
- Removed deprecated platformOS log calls
- Ticket creation and ticket allocation bugs
- Payment step back-button navigation
- Ticket-detail items in order emails
- Create the portal profile after setting the password, then clear the guest notes
- Order summary spacing and stepper colour (design QA)

### Removed
- Unused GraphQL queries and partials; dropped over-fetched pagination fields and split the `get_events` count into a separate query

### Documentation
- README updated to match current routes, partial paths, API endpoints, and the admin surface

## [v1.1.0] - 2026-03-17
### Prerequisites
- Portal template/app: >= v1.3.0

### Added
- Event pricing divisions seed/migration: `modules/events/public/migrations/20260218023005_event_pricing_division.liquid`
- Attachments galleries query restored: `modules/events/public/graphql/attachments/get_galleries.graphql`

### Changed
- Venues seed/migration updated to align with removal of `event_venue_area` and addition of pricing divisions: `modules/events/public/migrations/20250916010845_venues.liquid`
- Purchase ticket price computation now pulls tier pricing from the database and deduplicates tier UUIDs before computing totals: `modules/events/public/views/partials/purchase_ticket/compute_prices.liquid`

### Fixed
- Checkout totals computation bug when duplicate `event_pricing_tier` records exist (migration/test): `modules/events/public/views/partials/purchase_ticket/compute_prices.liquid`
- Order update callback controller issues during payment callback processing: `modules/events/public/views/partials/orders/callback_update_models.liquid`

## [v1.0.0] - 2026-02-16
### Added
- Initial release (tagged `v1.0.0`)