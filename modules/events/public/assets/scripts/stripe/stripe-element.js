let stripeCard = document.getElementById('stripe-card');
let stripeCardModal = document.getElementById('stripe-modal');
let cardOptionsList = document.getElementById('card-options-list');
let noCardNotif = document.getElementById('no-card');
let cardHolder = document.getElementById('add-credit-card-button-holder');
let cardFields = document.getElementById('credit-card-fields');
let guestAddCardForm = document.getElementById("guest-add-card-form")
let paymentNavigationButtons = document.getElementById("payment-navigation-button")
let paymentNavigationWButtons = document.getElementById("payment-navigation-button-w-cards")


let checkoutBtnEl = document.getElementById("checkout-ticket-submit-btn");


// Defaul size of the ins-credit-card component once it is created.
// Ecommerce is using different layout size
let cardLayout = 'large-4 medium-12 small-12'; 

// Create an instance of Elements.
let elements = stripe.elements();
let card;
// Custom styling can be passed to options when creating an Element.
// (Note that this demo uses a wider set of styles than the guide below.)
let style = {
    base: {
        color: '#404040',
        fontFamily: '"Work Sans", sans-serif', '-webkit-font-smoothing': 'antialiased',
        fontWeight: '400',
        fontSize: '14px',
        '::placeholder': {
            color: '#8C94A4'
        }
    },
    invalid: {
        color: '#F27474',
        iconColor: '#F27474'
    }
};
// Handle Form Elements.
let stripeBtn = document.querySelectorAll('.card-form-submit');
let stripeCancelBtn = document.querySelectorAll('.card-form-cancel');
let errorElement = document.getElementById('card-errors');

let StripeElement = (() => {
    return {
        methods: {
            makeCardElement(token) {
                if (cardOptionsList && token) {
                    let grid = cardOptionsList.getAttribute('card-grid') || cardLayout;
                    let divEl = document.createElement("div");
                        divEl.className = `${grid} cell card-options`;
                    let insCardEl = document.createElement("ins-credit-card");
                        insCardEl.setAttribute('full-year', true);
                        insCardEl.setAttribute('brand', token.card.brand);
                        insCardEl.setAttribute('last-four', token.card.last4);
                        insCardEl.setAttribute('expiry-month', token.card.exp_month);
                        insCardEl.setAttribute('expiry-year', token.card.exp_year);
                        insCardEl.setAttribute('compact', '');
                        insCardEl.setAttribute('active', true);
                        insCardEl.value = token.card.id;
                    divEl.appendChild(insCardEl);
                    cardOptionsList.appendChild(divEl);
                    StripeElement.init.dynamicCCEventListener(insCardEl, true);
                    StripeElement.methods.checkCardCount();
                }
            },
            validateStripeRequirements() {
                if (emailField && emailField.value) {
                    this.setButtonLoading(true);
                    this.tokenizedStripeCC();
                } else {
                    App.events.notyf('error', "Email is required.");
                }
            },
            async tokenizedStripeCC() {
                stripe.createToken(card).then(async(result) => {
                    if (errorElement && result.error) {
                        // Inform the user if there was an error.
                        errorElement.textContent = result.error.message;
                        this.setButtonLoading(false);
                    } else {
                        // Send the token to your server.
                        let response = await this.createStripeCardModel(result.token);
                        // set stripe card token to form for payment
                        this.setStripeCardField(result.token);
                        this.setButtonLoading(false);
                        App.events.notyf('success', "Credit card has been added.");
                        this.makeCardElement(result.token);
                        card.clear();
                        
                        if (stripeCardModal) {
                            stripeCardModal.close();
                        }

                        //toggle guest card form
                        StripeElement.events.toggleGuestCard('add');
                    }
                });
            },
            setButtonLoading(state) {
                stripeCancelBtn.forEach(el => {
                    el.disabled = state;
                });
                stripeBtn.forEach(el => {
                    el.loading = state;
                });
            },
            // AXIOS Create credit card model
            async createStripeCardModel(token) {
                let data = {
                    "email": emailField.value,
                    "first_name": stripeFirstName.value,
                    "last_name": stripeLastName.value,
                    "creditcard": token.id,
                    "card_brand": token.card.brand
                }
                let response = await StripeModel.creditcard.createCreditCard(data);
                // Insert the token ID into the form checkout - Optional if no element / not checkout form
                if (response.state && payByCardField)
                    payByCardField.setAttribute('value', token.id);

                return response
            },
            // Set checkout form with the token ID.
            setStripeCardField(token) {
                // Set token ID into the card field - Optional if no element / not checkout form
                if (payByCardField)
                    payByCardField.setAttribute('value', token.id);
            },
            checkCardCount() {
                let cards = cardFields.querySelectorAll('.card-options');
                if (cards.length <= 0){
                    if(noCardNotif) noCardNotif.classList.remove('hide'); 
                    if(cardHolder) cardHolder.classList.add('hide');
                }
                else{
                    if(noCardNotif) noCardNotif.classList.add('hide');
                    if(cardHolder) cardHolder.classList.remove('hide');  
                }
            }
        },
        events: {
            selectCard(selectedEl) {
                let cards = Array.from(document.getElementsByTagName('ins-credit-card'));
                if (cards) {
                    // remove error state of credit cards
                    cards.forEach(element => {
                        element.classList.remove('is-invalid');
                        element.active = false
                    });
                }
                // set selected state
                selectedEl.active = true;
                if (stripeCard)
                    stripeCard.value = selectedEl.value;
                stripeCard.setAttribute('value', selectedEl.value)
            },
            async removeCard(selectedEl) {
                let confirm = await App.events.swal('warning',
                    'Remove card?',
                    'Are you sure you want to remove this credit card?',
                    'Remove',
                    true,
                    'icon-trash',
                    'remove-card-swal');
                if (confirm) {
                    if (selectedEl.dataset.id) {
                        let response = await StripeModel.creditcard.removeCreditCard(selectedEl.dataset.id);
                        if (response.state && response.data.items) {
                            // API successfully removed card
                        }
                    }
                    if (selectedEl.active && stripeCard)
                        stripeCard.value = "";
                    selectedEl.parentNode.remove();
                    App.events.notyf('success', "Credit card has been removed.");
                    StripeElement.methods.checkCardCount();
                    StripeElement.events.toggleGuestCard('remove');
                    
                }
            },
            toggleGuestCard(state){ 
                if(state === 'remove'){
                    if(cardOptionsList.querySelectorAll('ins-credit-card').length < 1){
                        if(isGuestUser) {
                            if(guestAddCardForm){
                                guestAddCardForm.classList.remove("hide");
                                noCardBox.classList.add("hide")
                            }
                            if(paymentNavigationButtons){
                                paymentNavigationButtons.classList.add("hide");
                            }
                        }else {
                             guestAddCardForm.classList.add("hide");
                             noCardBox.classList.remove("hide") 
                             paymentNavigationButtons.classList.add("hide");
                        }
                    }
                }
                else{
                    if(isGuestUser) { 
                        paymentNavigationWButtons.classList.remove("hide")
                    }
                    if(guestAddCardForm){
                        guestAddCardForm.classList.add("hide");
                    }
                    if(paymentNavigationButtons){
                        checkoutBtnEl.classList.remove('hide')
                        paymentNavigationButtons.classList.remove("hide");
                    }
                }
            }
        },
        init: {
            dynamicCCEventListener(element, click = false) {
                setTimeout(() => {
                    element.addEventListener('insClick', () => {
                        StripeElement.events.selectCard(element);
                    });
                    element.addEventListener('insClose', () => {
                        StripeElement.events.removeCard(element);
                    });
                    if (click && element && element.querySelector('.ins-credit-card-wrap'))
                        element.querySelector('.ins-credit-card-wrap').click();
                }, 500);
            },
            eventListeners() {
                stripeCancelBtn.forEach(el => {
                    el.addEventListener('insClick', () => cardModal.close());
                })
                // Handle real-time validation errors from the card Element.
                card.on('change', function(event) {
                    if (errorElement && event.error) {
                        errorElement.textContent = event.error.message;
                    } else {
                        errorElement.textContent = '';
                    }
                });
                stripeBtn.forEach(el => {
                    el.addEventListener('insClick', (event) => {
                        //Check if a layout is passed. The layout must be in the following format: 'large-6 medium-4 small-12'.
                        const isValidLayout = /^large-\d+\s+medium-\d+\s+small-\d+$/.test(event.detail.data);
                        cardLayout = isValidLayout? event.detail.data : cardLayout;

                        StripeElement.methods.validateStripeRequirements();
                    });
                })
            },
            stripeElements(isGuest = false) {
                const containerId = isGuest ? 'card-element' : 'card-element-2';
                if (!card) card = elements.create('card', { style });
                card.unmount(); // prevent duplicate mount
                card.mount(`#${containerId}`);

                card.on('change', function(event) {
                    const errorElement = document.getElementById('card-errors') || document.getElementById('card-errorss');
                    errorElement.textContent = event.error ? event.error.message : '';
                });

                StripeElement.init.eventListeners();
            }
        }
    }
})();
// Make sure component rendered
// setTimeout(() => {
//     // StripeElement.init.initializeExistingCards();
// }, 500);