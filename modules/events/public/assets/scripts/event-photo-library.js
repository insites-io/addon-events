const GalleriesModule = {
     init() {
         const galleriesDataEl = document.getElementById('galleries-data');
         if (!galleriesDataEl) return;

         const mapData = JSON.parse(galleriesDataEl.textContent);
         const { perPage, totalCount } = mapData;

         this.setupPagination(perPage, totalCount);
         this.setupModal();
         this.setupClickHandlers();
     },

     setupPagination(perPage, totalCount) {
         const galleriesPagination = document.getElementById('event-galleries-pagination');
         galleriesPagination.pageSizeOptions = [12, 20, 40];
         galleriesPagination.totalCount = totalCount;
         galleriesPagination.pageSize = perPage;
         galleriesPagination.paginationText = "Items per page";
         galleriesPagination.addEventListener('insPaginationChange', this.paginationHandler);

         // ins-table renders its <select> asynchronously — wait for it to appear
         // then add aria-label to fix "Select has no associated label" Lighthouse audit.
         const labelSelect = () => {
             const select = galleriesPagination.querySelector('select');
             if (!select) return false;
             select.setAttribute('aria-label', galleriesPagination.paginationText);
             return true;
         };
         if (!labelSelect()) {
             const observer = new MutationObserver(() => {
                 if (labelSelect()) observer.disconnect();
             });
             observer.observe(galleriesPagination, { childList: true, subtree: true });
         }
     },

     setupModal() {
         this.galleriesModal = document.getElementById('galleries-modal');
         this.galleriesModalBackdrop = this.galleriesModal.querySelector('.ins-backdrop-wrap');
         this.galleriesCarousel = document.getElementById('galleries-carousel');
         this.currentSlideIndex = 0;
         this.totalSlides = document.querySelectorAll('#galleries-carousel-img .img-wrap').length;

         // ins-carousel renders its nav buttons asynchronously — wait for them to appear
         // then label them so screen readers can announce "Previous slide" / "Next slide".
         const labelCarouselButtons = () => {
             const prevBtn = this.galleriesCarousel.querySelector('button:has(.icon-angle-left)');
             const nextBtn = this.galleriesCarousel.querySelector('button:has(.icon-angle-right)');
             if (!prevBtn || !nextBtn) return false;
             prevBtn.setAttribute('aria-label', 'Previous slide');
             nextBtn.setAttribute('aria-label', 'Next slide');
             return true;
         };
         if (!labelCarouselButtons()) {
             const observer = new MutationObserver(() => {
                 if (labelCarouselButtons()) observer.disconnect();
             });
             observer.observe(this.galleriesCarousel, { childList: true, subtree: true });
         }

         const galleryItems = document.querySelectorAll('#event-galleries .pagination-item');
         galleryItems.forEach(galleryItem => {
             // Keyboard support: role="button" divs don't fire click on Enter/Space natively
             galleryItem.addEventListener('keydown', (e) => {
                 if (e.key === 'Enter' || e.key === ' ') {
                     e.preventDefault();
                     galleryItem.click();
                 }
             });
             galleryItem.addEventListener('click', () => {
                 this.currentSlideIndex = parseInt(galleryItem.dataset.item, 10) - 1;
                 this.galleriesCarousel.goTo(this.currentSlideIndex);
                 this.galleriesModalBackdrop.classList.remove('hide');
                 this.galleriesModal.style.height = 'calc(100vh)';
                 this.updateCarouselNav();
             });
         });

         this.galleriesCarousel.addEventListener('click', (event) => {
             const btn = event.target.closest('button');
             if (!btn) return;

             const rect = btn.getBoundingClientRect();
             const btnCenterX = rect.left + rect.width / 2;

             if (btnCenterX < window.innerWidth / 2) {
                 this.currentSlideIndex = Math.max(0, this.currentSlideIndex - 1);
             } else {
                 this.currentSlideIndex = Math.min(this.totalSlides - 1, this.currentSlideIndex + 1);
             }
             this.updateCarouselNav();
         });
     },

     updateCarouselNav() {
         const prevBtn = this.galleriesCarousel.querySelector('button:has(.icon-angle-left)');
         const nextBtn = this.galleriesCarousel.querySelector('button:has(.icon-angle-right)');
         if (!prevBtn || !nextBtn) return;

         prevBtn.style.visibility = this.currentSlideIndex === 0 ? 'hidden' : '';
         nextBtn.style.visibility = this.currentSlideIndex >= this.totalSlides - 1 ? 'hidden' : '';
     },

     setupClickHandlers() {
          // Keyboard support for the close button
          const closeBtn = document.querySelector('#galleries-modal .icon-close-1');
          if (closeBtn) {
              closeBtn.addEventListener('keydown', (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      closeBtn.click();
                  }
              });
          }

          // When the carousel gallery is open and the user clicks anywhere other than on an image or a button, the modal carousel should close.

         // Prevent propagation from buttons and images
         document.querySelectorAll('#galleries-modal *').forEach(el => {
             el.addEventListener('click', event => {
                 const isInsideButtonOrImage = event.target.closest('button') || event.target.closest('img');
                 if (isInsideButtonOrImage) {
                     event.stopPropagation();
                 }
             });
         });

         const allElements = document.querySelectorAll('#galleries-modal *');
         const filteredElements = Array.from(allElements).filter(el => {
             return !el.closest('button') && !el.closest('img');
         });

         filteredElements.forEach(el => {
             el.addEventListener('click', event => {
                 if (event.target.closest('button') || event.target.closest('img')) return;
                 this.galleriesModalBackdrop.classList.add('hide');
                 // Use height: 0px instead of display: none to allow <ins-carousel> to generate the images properly.
                 this.galleriesModal.style.height = '0px';
             });
         });
     },

     showPaginatedItems(page, perPage) {
         const cells = document.querySelectorAll('.pagination-item');
         const start = (page - 1) * perPage + 1;
         const end = page * perPage;

         cells.forEach(cell => {
             const itemNumber = parseInt(cell.dataset.item, 10);
             if (itemNumber >= start && itemNumber <= end) {
                 cell.classList.remove('hide');
             } else {
                 cell.classList.add('hide');
             }
         });
     },

     paginationHandler(event) {
         GalleriesModule.showPaginatedItems(event.detail.pageNumber, event.detail.pageSize);
         document.getElementById('event-galleries').scrollIntoView({ behavior: 'smooth' });
     }
 };

 window.GalleriesModule = GalleriesModule;

 document.addEventListener('DOMContentLoaded', () => {
     GalleriesModule.init();
 });
