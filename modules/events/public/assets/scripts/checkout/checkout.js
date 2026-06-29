// Address Modal Form
const addressFormModal = document.getElementById('address-form-modal');
const addAddressBtn = document.getElementById('add-address-btn');
const addressSubmitBtn = document.getElementById('address-submit-btn');
const addressCancelBtn = document.getElementById('address-cancel-btn');

// Modal Address
const modalLongitudeEl = document.getElementById('modal_longitude');
const modalLatitudeEl = document.getElementById('modal_latitude');
const modalAddress1El = document.getElementById('modal_address_1');
const modalAddress2El = document.getElementById('modal_address_2');
const modalSuburbEl = document.getElementById('modal_suburb');
const modalStateEl = document.getElementById('modal_state');
const modalPostcodeEl = document.getElementById('modal_postcode');
const modalCountryEl = document.getElementById('modal_country');

// Addresses
const addressCards = document.getElementById('address-cards');
let selectedAddress = {
    "uuid": "",
    "address_1": "",
    "address_2": "",
    "suburb": "",
    "state": "",
    "postcode": "",
    "country": ""
}


// Billing 
const billingAddressUuidEl = document.getElementById('billing-address-uuid');

// Payment Information
let addCardBtns = document.querySelectorAll('.add-card-btn');
let cardModal = document.getElementById('stripe-modal');


let Checkout = (function () {
    return {
        methods: {
            createAddressCard(data) {
                const suburbState = [data.suburb, data.state].filter(Boolean).join(' ');
                let cardHtml = `
                <div class="large-6 medium-6 small-12 cell">
                    <ins-checkbox-card data-equalizer-watch="" name="billing-address-cards" selected-color="blue" value="${data.id}" data-uuid="${data.uuid}" data-address="${data.address_1}" data-address_1="${data.address_1}" data-address_2="${data.address_2}" data-suburb="${data.suburb}" data-state="${data.state}" data-postcode="${data.postcode}" data-country="${data.country}">                    
                        <div>
                            <p class="form-label">${data.address_1}${data.address_2 ? `, ${data.address_2}` : ''}</p>
                            <div class="spacer small"></div>
                            <p>${[suburbState, data.postcode].filter(Boolean).join(', ')}</p>
                            <p>${data.country}</p>
                        </div>
                    </ins-checkbox-card>                       
                </div>            
                `;
                return cardHtml;
            },                 
        },
        events: {
            selectAddressCard(addressCard) {
                let name = addressCard.getAttribute('name');
      
                // Remove State of address field cards
                document.getElementsByName(name).forEach(el => {
                    el.classList.remove('is-invalid');
                    el.removeAttribute('selected');
                    el.selected = false;
                });
                // set selected state
                addressCard.setAttribute('selected', true);
                addressCard.selected = true;
                //selectedAddressId = addressCard.value;

                selectedAddress = {
                    "address_1": addressCard.getAttribute('data-address_1'),
                    "address_2": addressCard.getAttribute('data-address_2'),
                    "suburb": addressCard.getAttribute('data-suburb'),
                    "state": addressCard.getAttribute('data-state'),
                    "postcode": addressCard.getAttribute('data-postcode'),
                    "country": addressCard.getAttribute('data-country')   
                };                

                if(billingAddressUuidEl){
                    billingAddressUuidEl.setValue(addressCard.getAttribute('data-uuid'));
                }                
            },      
            async addressSubmit() {
                let isValid = await App.validation.validateForm(addressFormModal);
                if(isValid){
                    let url = '/create-contact-address.json' ;
                    let payload = {
                            "address_label": modalAddress1El.value, //REQUIRED
                            "default_address": false,
                            "address_1": modalAddress1El.value,
                            "address_2": modalAddress2El.value,
                            "suburb": modalSuburbEl.value,
                            "state": modalStateEl.value,
                            "country": modalCountryEl.value,
                            "postcode": modalPostcodeEl.value,
                            "geojson": {
                                "type": "Point",
                                "coordinates": [parseFloat(modalLatitudeEl.value), parseFloat(modalLongitudeEl.value)]
                            },
                            "latitude": modalLatitudeEl.value,
                            "longitude": modalLongitudeEl.value
                        }
                    let response = await apiServices.processRequest('post',url,payload);
                    if(response.state && response.data.id) {            
                        addressFormModal.close();
                        App.events.notyf("success", "Address added successfully.");                        
                        addressCards.insertAdjacentHTML('afterbegin', Checkout.methods.createAddressCard(response.data));

                        //Select the newly added card                        
                        Checkout.events.selectAddressCard(
                            document.querySelector(`ins-checkbox-card[value="${response.data.id}"]`)
                        );                          

                        // Reset value to blank
                        [
                            'modal_search',
                            'modal_longitude',
                            'modal_latitude',
                            'modal_address_1',
                            'modal_address_2',
                            'modal_suburb',
                            'modal_state',
                            'modal_postcode',
                            'modal_country'
                        ].forEach(id => {
                            const el = document.getElementById(id);
                            if (el) el.value = '';
                        });
                    } else {
                        App.events.notyf("error", "Something went wrong. Please try again.");
                    }
                }
            }          
        },
        init: {
            initEventListener() {
                this.initAddressCardListener();
                this.initCardsEventListener();
                this.initCheckNavigation();
                this.initAddressListener();    
                if(addCardBtns) {
                    addCardBtns.forEach(btn => {
                        btn.addEventListener('insClick',() => cardModal.open());
                    });
                }            
            },
            initAddressListener() {
                if(addAddressBtn && addressCancelBtn && addressSubmitBtn) {
                    addAddressBtn.addEventListener('insClick', () => {        
                        addressFormModal.open(); 
                    });
            
                    addressCancelBtn.addEventListener('insClick', () => {        
                        addressFormModal.close(); 
                    });     

                    addressSubmitBtn.addEventListener('insClick', () => {
                        Checkout.events.addressSubmit();
                    });
                }
            },           
            initAddressCardListener() {
                if(addressCards){
                    addressCards.addEventListener('click', function (e) {
                        if (e.target.closest('ins-checkbox-card')) {                      
                            Checkout.events.selectAddressCard(e.target.closest('ins-checkbox-card'));
                        }
                    });
                }                  
            },
            initCardsEventListener() {
                let iterations = 5;
                let setStateInterval = setInterval(() => {
                    let cards = Array.from(document.getElementsByTagName('ins-credit-card'));
                    if(cards) {
                        cards.forEach(element => {
                            element.addEventListener('insClick', () => {
                                StripeElement.events.selectCard(element);
                            });
                            element.addEventListener('insClose', () => {
                                StripeElement.events.removeCard(element);
                            });
                        });
                            clearInterval(setStateInterval);
                    } else {
                        iterations++;
                        if(iterations > 5)
                            clearInterval(setStateInterval);
                    }
                }, 300);
            },
            initCheckNavigation(){
                let navigation_list = performance.getEntriesByType("navigation");
                if(navigation_list.length > 0){
                    if(navigation_list[0].type == "back_forward"){
                        window.location.reload();
                    }
                }
            }
        }
    }
})();

setTimeout(() => {
    Checkout.init.initEventListener();
}, 200);
