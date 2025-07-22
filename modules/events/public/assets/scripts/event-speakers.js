const dataElement = document.getElementById('speakers-data');
const evntImages = document.querySelectorAll('.event-speakers img');
const speakerModal = document.getElementById('speaker-modal');
const speakerContent = document.getElementById('speaker-content');

if (dataElement) {
     const mapData = JSON.parse(dataElement.textContent);
     const { speakers } = mapData;

     evntImages.forEach(evntImage => {
          evntImage.addEventListener('click', () => {
               const speaker = speakers.find(item => item.id === evntImage.dataset.id);
               if (!speaker) return;

               speakerModal.heading = `${speaker.first_name} ${speaker.last_name}`;
               speakerContent.innerHTML = speaker.content;

               // Remove any existing sub-heading
               const oldSubHeading = document.querySelector('#speaker-modal .sub-heading');
               if (oldSubHeading) oldSubHeading.remove();

               const subHeadingHtml = `
               <div class="sub-heading">
               <div class="spacer x-small"></div>
               <p id="speaker-job-title">${speaker.job_title}</p>
               <div class="spacer small"></div>
               <div class="event-card-wrap">
                    <div class="grid-x">
                    <i class="icon-email-1"></i>
                    <span id="speaker-email">${speaker.contact.email}</span>
                    </div>
               </div>
               </div>
               `;

               document.querySelector('#speaker-modal .icon-close-1').insertAdjacentHTML('afterend', subHeadingHtml);
               speakerModal.open();
          });
     });
}