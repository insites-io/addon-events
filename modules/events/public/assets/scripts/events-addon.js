// Select all `.event-card-wrap div`s excluding those inside #main-event
const cards = Array.from(document.querySelectorAll('.event-card-wrap div'))
  .filter(el => !document.getElementById('main-event').contains(el));

// Explicitly select the img and h4 inside #main-event
const extras = document.querySelectorAll('#main-event img, #main-event h4');

// Combine into one list
const finalTargets = [...cards, ...extras];

finalTargets.forEach(function(element) {
  element.addEventListener('click', function(e) {
    // Prevent clicks on <a> itself
    if (!e.target.closest('a')) {
      // Look for nearest parent that contains an <a>
      let parent = element;
      while (parent && !parent.querySelector('a')) {
        parent = parent.parentElement;
      }

      const link = parent?.querySelector('a');
      if (link) {
        link.click();
      }
    }
  });
});
