## Changelog
All notable changes to the Events Addon are documented here.

## [v1.1.1] - 2026-04-24
### Added
- Skeleton loading states for event list pagination, filtering, and search
- Automatic thumbnail image generation for events
- AJAX loading on the upcoming and previous itinerary pages

### Changed
- Pagination and filtering on event lists now fetch only the list items via AJAX instead of reloading the full page
- Category and location filter options are now scoped to only show values that have associated events
- Ticket purchase flow restructured for improved reliability and maintainability
- Ticket confirmation page restructured for improved reliability and maintainability
- Ecommerce and events modules brought up to date

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