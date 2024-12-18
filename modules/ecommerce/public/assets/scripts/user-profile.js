const phoneFields = {
    inputTel: document.getElementById('mobile-phone'),
    mobile_phone: document.getElementById('mobile_phone_number'),
    country_code: document.getElementById('mobile_phone_country_code')
}

let addressForm = {
    deletBtn: document.getElementById('deleteAddressBtn-main'),
    deleteBtnTrigger: document.getElementById('deleteAddressBtn2'),
    saveAddressBtn: document.querySelectorAll('.save-address-btn')
}

let customerProfileForm = {
    updateProfileBtn: document.getElementById('sign-up-btn'),
    updatePasswordBtn: document.getElementById('save-password-btn')
}

let tmpUserPayload = {
    'first_name': "",
    'last_name': "",
    'email': ""
}

/* Variable that handles the credit card elements */
let addCardBtn = document.getElementById('add-credit-card');
let cardModal = document.getElementById('stripe-modal');




let UserProfileScript = (function () {
    return {
        methods: {
            pricify(number) {
                return number.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});            },
            disableFormButtons(formElem, state = true) {
                let buttons = formElem.querySelectorAll('ins-button');
                    buttons.forEach(btn => btn.disabled = state);
            },
            validateTelField() {
                /* Validation for the telephone field */
                let isTel = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/g;
                let telFields = document.querySelectorAll("[field='tel']");
                telFields.forEach(field => {
                    if (field.required) {
                        if (field.value && isTel.test(field.value) === true) {
                            field.hasError = false;
                        } else
                            field.hasError = true;
                    } else {
                        if (field.value.trim() === "") {
                            field.hasError = false;
                        } else {
                            field.hasError = !isTel.test(field.value) === true;
                        }
                    }
                });
            },
            validatePasswordField(field){
                if (field.value) {
                    if((field.value.length >= 6)){
                        field.hasError = false;
                    } else {
                        field.hasError = true;
                        field.errorMessage = "Minimum of 6 characters";
                    }
                } else {
                    field.hasError = true;
                    field.errorMessage = "Password is required";
                }
            },
            validatePasswordConfirm(field){
                let passFields = document.getElementById('password');
                if(passFields){
                    if(passFields.value === field.value){
                        field.hasError = false;
                    } else {                        
                        field.hasError = true;
                        field.errorMessage = "Password doesn't match";
                    }
                } 
            },
            async validationForm(containerEl) {
                for (let index = 0; index < containerEl.querySelectorAll('[validate]').length; index++) {
                    let field = containerEl.querySelectorAll('[validate]')[index];
                    let type = field.tagName.toLowerCase();
                    switch (type) {
                        case 'div':
                            App.validation.validateRadio(field);
                            break;
                        case 'ins-input-file':
                            App.validation.validateFile(field);
                            break;
                        case 'ins-textarea':
                            App.validation.validateInput(field.querySelector('textarea'));
                            break
                        case 'ins-input':
                        default:
                            if(field.field === 'password'){
                                if(field.id === 'password_confirmation'){
                                    this.validatePasswordConfirm(field);
                                } else {
                                    this.validatePasswordField(field);
                                }
                            } else if(field.field === 'email'){
                                App.validation.validateEmail(field);
                            } else{
                                App.validation.validateInput(field);
                            }
                            break;
                    }
                }
                return App.validation.checkInvalidFields(containerEl);
            },
            async validateForm(event) {
                /* Validation and scripts done before submission of forms */
                /* Attached on the on-submit event of the form */
                /* Can identify form submitted by using their id */
                event ? event.preventDefault(): '';
                //Get id and element to identify the kind of form submitted
                let formId = event.target.id;
                let formElem = document.getElementById(formId);
                // Check what form is being validated...
                if(formId == 'user-profile-form'){
                    //Validation for User profile
                    this.validateTelField();
                    if(await App.validation.validateForm(formElem)){
                        let values = await phoneFields.inputTel.getValues();
                        phoneFields.country_code.value = values.country_code;
                        phoneFields.mobile_phone.value = values.phone_number;
                        
                        this.disableFormButtons(formElem);
                        customerProfileForm.updateProfileBtn.loading = true;
                        formElem.submit();
                    }
                } else if (formId == 'user-password-form'){
                    // Validation and function for update of password
                    if(await this.validationForm(formElem)){
                        let confirm = await App.events.swal('warning', 
                            'Warning',
                            'You will be logged out after changing password.');
                        if(confirm) {
                            this.disableFormButtons(formElem);
                            customerProfileForm.updatePasswordBtn.loading = true;
                            formElem.submit(); 
                        }
                    }
                } else if(formId == 'delete-address'){
                    // Validation and function for the deletion of address
                    if(await App.validation.validateForm(formElem)){
                        let confirm =  await App.events.swal('warning', 
                            'Are you sure?',
                            'This will delete this address.',
                            'Delete');
                        if(confirm) {
                            this.disableFormButtons(formElem);
                            addressForm.deletBtn.loading = true;
                            addressForm.deleteBtnTrigger.loading = true;
                            formElem.submit(); 
                        }
                    }
                } else if(formId == 'update-address-form'){
                    // Validation for updating and addition of address
                    if(await App.validation.validateForm(formElem)){
                        this.disableFormButtons(formElem);
                        addressForm.saveAddressBtn.forEach(btn => btn.loading = true);
                        formElem.submit();
                    }
                } else {
                    //Validation for other (account type) forms
                    if(await App.validation.validateForm(formElem)){
                        formElem.submit();
                    }
                }
            },
            checkCardCount() {
                let cards = cardFields.querySelectorAll('.card-options');
                if(cards.length === 0)
                    noCardNotif.classList.remove('hide');
                else 
                    noCardNotif.classList.add('hide');
            }
        },
        events: {
            async removeCard(selectedEl) {
                let confirm = await App.events.swal('warning', 
                    'Are you sure?',
                    'This will delete this address.',
                    'Delete');
                if (confirm) {
                    if (selectedEl.dataset.id) {
                        let response = await StripeModel.creditcard.removeCreditCard(selectedEl.dataset.id);
                        if (response.state && response.data.items) {
                            // API successfully removed card
                        }
                    } 
                    selectedEl.parentNode.remove();
                    App.events.notyf('success', "Credit card has been removed");
                    UserProfileScript.methods.checkCardCount();
                }
            }
        },
        init: {
            initEventListener(){
                if(addCardBtn){
                    addCardBtn.addEventListener('insClick',() => cardModal.open());
                }
                this.initCardsEventListener();
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
                                UserProfileScript.events.removeCard(element);
                            });
                        });
                            clearInterval(setStateInterval);
                    } else {
                        iterations++;
                        if(iterations > 5)
                            clearInterval(setStateInterval);
                    }
                }, 300);
            }
        }
    }
})();


setTimeout(() => {
    UserProfileScript.init.initEventListener();
}, 200);

