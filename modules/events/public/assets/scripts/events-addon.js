// Use event delegation on the persistent grid container so clicks work
// after AJAX replaces the card HTML.
const cardGrid = document.getElementById('events-card-grid') || document;

cardGrid.addEventListener('click', function(e) {
  // Do nothing if the click was on (or inside) an <a>
  if (e.target.closest('a')) return;

  // Find the specific card article containing the click
  const article = e.target.closest('article');
  if (!article) return;

  const link = article.querySelector('a');
  if (link) {
    link.click();
  }
});
