const speakersDataEl = document.getElementById('speakers-data');
const speakerItems = document.querySelectorAll('.event-speakers .cell');
const speakerModal = document.getElementById('speaker-modal');
const speakerContent = document.getElementById('speaker-content');

if (speakersDataEl) {
     const mapData = JSON.parse(speakersDataEl.textContent);
     const { speakers } = mapData;

     speakerItems.forEach(speakerItem => {
          speakerItem.addEventListener('click', () => {
               const speaker = speakers.find(item => item.id === speakerItem.dataset.id);
               if (!speaker) return;

               speakerModal.heading = `${speaker.first_name} ${speaker.last_name}`;
               speakerContent.innerHTML = speaker.content;

               // Remove any existing sub-heading
               const oldSubHeading = document.querySelector('#speaker-modal .sub-heading');
               if (oldSubHeading) oldSubHeading.remove();

               const jobTitleText = speaker.company_name
               ? `${speaker.job_title} at ${speaker.company_name}`
               : speaker.job_title;

               const subHeadingHtml = `
                    <div class="sub-heading">
                    <div class="spacer x-small"></div>
                    <p id="speaker-job-title">${jobTitleText}</p>
                    <div class="spacer small"></div>
                    <div class="event-card-wrap">
                         <div class="grid-x">
                         <i class="icon-email-1"></i>
                         <span id="speaker-email">${speaker.contact.email}</span>
                         </div>
                    </div>
                    <div class="spacer"></div>
                    <hr>
                    </div>
                    `;

               document.querySelector('#speaker-modal .icon-close-1').insertAdjacentHTML('afterend', subHeadingHtml);
               speakerModal.open();
          });
     });
}