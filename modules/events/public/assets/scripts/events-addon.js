document.querySelectorAll('.event-card-wrap div:not(#main-event.event-card-wrap div)').forEach(function(card) {
     card.addEventListener('click', function(e) {
          // Prevent clicks on links inside from double-firing
          if (!e.target.closest('a')) {
               const link = card.querySelector('a');
               if (link) {
                    link.click();
               }
          }
     });
});