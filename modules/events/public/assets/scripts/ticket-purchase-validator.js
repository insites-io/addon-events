let TicketScript = (function () {
    return {
        methods: {
            validateTelField() {
                //Function to validate telephone input fields
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

            validateCreditCard(currentStep) {
                let cardValid = currentStep.querySelectorAll("#stripe-card[required] .is-invalid");
                let container = currentStep.querySelector('.validate-credit-card');

                if (container) {
                    if (cardValid && cardValid.length > 0) {
                        container.querySelector('.error-message').classList.remove('hide');
                        TicketScript.methods.creditCardsHasError(container, true);
                    } else {
                        container.querySelector('.error-message').classList.add('hide');
                        TicketScript.methods.creditCardsHasError(container, false);
                    }
                }
            },

            creditCardsHasError(step, error) {
                step.querySelectorAll('.card-options ins-credit-card')
                    .forEach(element => {
                        error
                            ? element.classList.add('is-invalid')
                            : element.classList.remove('is-invalid')
                    });
            },


            async validateForm(event, groupElem) {
                event ? event.preventDefault(): '';
                //Get id and element to identify the kind of form submitted
                let formId = event.target.id;
                let formElem = document.getElementById(formId).closest('form'); 
                let form = event.srcElement;
                // Check what form is being validated...
                //Validation for other forms

                if(formId == 'submit-purchase' || formId == 'submit-billing-info' || formId == 'checkout-ticket-submit-btn' ){
                    //Validation for Sign Up Form
                    let isValid = await this.validationForm(groupElem)
                    if (formId == 'submit-purchase' || formId == 'submit-billing-info') {
                        return isValid
                    }
                    let checkCC = false
                    if (formId == 'checkout-ticket-submit-btn') {
                           
                    let subTotalFormEl = document.getElementById('bill-order-value');
                    let totalFormEl = document.getElementById('bill-total-amount');
                    let subTotal = subTotalFormEl ? (subTotalFormEl.value || 0) : 0;
                    let grandTotal = totalFormEl ? (totalFormEl.value || 0) : 0;
                    if (subTotal == 0 && grandTotal == 0 ) { 
                        checkCC = true
                        isValid = true
                    }else {
                        checkCC = await this.validationForm(groupElem)                    
                        TicketScript.methods.validateCreditCard(groupElem)
                    }  
                    }
                    
                    if (isValid && checkCC) {
                        // formElem.submit();
                        return true
                    }
                    
                } else {
                    if(await App.validation.validateForm(formElem)){
                        formElem.submit();
                        return true
                    }
                }
               
                
            },
            

        }
    }
})();