// Select all `.event-card-wrap div`s
const allDivs = document.querySelectorAll('.event-card-wrap div:not(.wrap)');
cards = Array.from(allDivs);

cards.forEach(function(element) {
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
