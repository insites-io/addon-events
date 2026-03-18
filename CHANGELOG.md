## Changelog
All notable changes to the Events Addon are documented here.

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