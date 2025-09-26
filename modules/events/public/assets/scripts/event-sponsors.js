const sponsorsDataEl = document.getElementById('sponsors-data');
const sponsorItems = document.querySelectorAll('.event-sponsors .event-grid-x .wrap');
const sponsorModal = document.getElementById('sponsor-modal');
const sponsorContent = document.getElementById('sponsor-content');

if (sponsorsDataEl) {
     const mapData = JSON.parse(sponsorsDataEl.textContent);
     const { sponsors } = mapData;

     sponsorItems.forEach(sponsorItem => {
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
                    ? `<a href="${sponsor.link}" target="_blank">${sponsor.link}</a>` 
                    : '';

               const subHeadingHtml = `
               <div class="sub-heading">
                    <div class="spacer x-small"></div>
                    <div class="event-card-wrap">
                         <div class="grid-x">
                         <i class="icon-globals"></i>
                         <span id="sponsor-email">${link}</span>
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