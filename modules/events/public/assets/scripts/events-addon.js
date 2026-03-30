// Use event delegation on the persistent grid container so clicks work
// after AJAX replaces the card HTML.
const cardGrid = document.getElementById('events-card-grid') || document;

cardGrid.addEventListener('click', function(e) {
  // Do nothing if the click was on (or inside) an <a>
  if (e.target.closest('a')) return;

  // Only act when the click lands inside a .event-card-wrap descendant
  const cardDiv = e.target.closest('.event-card-wrap div:not(.wrap)');
  if (!cardDiv) return;

  const link = cardDiv.closest('.event-card-wrap')?.querySelector('a');
  if (link) {
    link.click();
  }
});
