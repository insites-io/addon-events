const sponsorsDataEl = document.getElementById('sponsors-data');
const sponsorItems = document.querySelectorAll('.event-sponsors .event-grid-x .wrap');
const sponsorModal = document.getElementById('sponsor-modal');
const sponsorContent = document.getElementById('sponsor-content');

if (sponsorsDataEl) {
     const mapData = JSON.parse(sponsorsDataEl.textContent);
     const { sponsors } = mapData;

     sponsorItems.forEach(sponsorItem => {
          // Keyboard support: role="button" divs don't fire click on Enter/Space natively
          sponsorItem.addEventListener('keydown', (e) => {
               if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    sponsorItem.click();
               }
          });
          sponsorItem.addEventListener('click', () => {
               const sponsor = sponsors.find(item => item.id === sponsorItem.dataset.id);
               if (!sponsor) return;

               sponsorModal.heading = sponsor.company_name;
               sponsorContent.innerHTML = sponsor.content;

               // Remove any existing sub-heading
               const oldSubHeading = document.querySelector('#sponsor-modal .sub-heading');
               if (oldSubHeading) oldSubHeading.remove();

               // link
               const link = sponsor.link
                    ? `<a href="${sponsor.link}" target="_blank" rel="noopener noreferrer" aria-label="${sponsor.link} (opens in new tab)">${sponsor.link}</a>`
                    : '';

               const subHeadingHtml = `
               <div class="sub-heading">
                    <div class="spacer x-small"></div>
                    <div class="event-card-wrap">
                         <div class="grid-x">
                         <i class="icon-globals" aria-hidden="true"></i>
                         <span id="sponsor-link">${link}</span>
                         </div>
                    </div>
                    <div class="spacer"></div>
                    <hr>
               </div>
               `;

               document.querySelector('#sponsor-modal .icon-close-1').insertAdjacentHTML('afterend', subHeadingHtml);
               sponsorModal.open();
          });
     });
}