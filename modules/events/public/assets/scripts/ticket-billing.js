/**
 * Ticket Step 2 — Billing
 * Restores ticket selection from the server-side session, handles billing form,
 * saves contact via API, then redirects to /ticket-payment.
 */

let isBillingSameAsContact = false;
let userPayload = {};
let billingPayload = {};


// ============================================================================
// DOM ELEMENTS
// ============================================================================

const DOM = {
  stepper: document.getElementById("ticket-purchase-stepper"),

  // Billing form
  step2: document.getElementById("submit-billing-info"),
  step2Container: document.getElementById("ticket-billing-step"),
  billingCheckbox: document.getElementById("billing-same-with-order"),
  billingInputs: document.querySelector("#billing-contact-inputs"),

  // Event UUID
  eventUuidHidden: document.getElementById("event_uuid_hidden"),

  // Loading overlay
  loadingOverlay: document.getElementById('loadingOverlay')
};


// ============================================================================
// UTILITIES
// ============================================================================

const Utils = {
  showLoading() {
    if (DOM.loadingOverlay) DOM.loadingOverlay.classList.remove("hide");
  },

  hideLoading() {
    if (DOM.loadingOverlay) DOM.loadingOverlay.classList.add("hide");
  },

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  async extractPhoneNumbers(phoneElement) {
    let phoneValues = await phoneElement.getValues();
    return {
      countryCode: phoneValues?.country_code.replace("+", "") || "",
      phoneNumber: phoneValues?.phone_number || ""
    };
  }
};


// ============================================================================
// ORDER PROCESSOR — contact save only
// ============================================================================

const OrderProcessor = {
  async saveContact(billingPayload) {
    if (DOM.step2) DOM.step2.loading = true;

    let result = null;
    try {
      const response = await contactServices.validateEmail(billingPayload.email);
      const validateEmail = response.data;

      const contactEmailEl = document.getElementById('contact-email');
      const contactEmailErrorMessageEl = document.getElementById('contact-email-error-message');

      if (contactEmailEl) contactEmailEl.hasError = false;
      if (contactEmailErrorMessageEl) contactEmailErrorMessageEl.classList.add("hide");

      if (validateEmail.is_guest === false) {
        result = (await contactServices.updateContact(billingPayload)).data;
      } else if (validateEmail.is_guest === true && validateEmail.form_type === 'edit' &&
                 validateEmail.is_guest_editable === true) {
        result = (await contactServices.updateContact(billingPayload)).data;
      } else if (validateEmail.is_guest === true && validateEmail.form_type === 'add') {
        result = (await contactServices.addContact(billingPayload)).data;
      } else {
        if (contactEmailEl) contactEmailEl.hasError = true;
        if (contactEmailErrorMessageEl) contactEmailErrorMessageEl.classList.remove("hide");
        const target = document.getElementById("account-details");
        if (target) target.scrollIntoView({ behavior: "smooth" });
      }

      if (result) {
        const fullName = `${result.first_name || ""} ${result.last_name || ""}`.trim();
        const profileDiv = document.querySelector(".profileNav");
        if (profileDiv) profileDiv.setAttribute("label", fullName);
      }
    } catch (error) {
      console.error("Contact API error:", error);
    }

    if (DOM.step2) DOM.step2.loading = false;

    return result;
  },

  async buildUserPayload() {
    const phoneNumber = await Utils.extractPhoneNumbers(document.getElementById('contact-phone'));
    return {
      first_name: document.getElementById('contact-first-name')?.value || "",
      last_name: document.getElementById('contact-last-name')?.value || "",
      email: document.getElementById('contact-email')?.value || "",
      company_name: document.getElementById('contact-company-name')?.value || "",
      company_uuid: document.getElementById('contact-company-uuid')?.value || "",
      mobile_phone_country_code: phoneNumber.countryCode,
      mobile_phone_number: phoneNumber.phoneNumber
    };
  },

  async buildBillingPayload() {
    const phoneNumber = await Utils.extractPhoneNumbers(document.getElementById('billing-phone'));
    let billing_company_name, billing_company_uuid, billing_first_name,
        billing_last_name, billing_email, billing_phone_country_code, billing_phone_number;

    if (isBillingSameAsContact) {
      billing_company_name = userPayload.company_name;
      billing_company_uuid = userPayload.company_uuid;
      billing_first_name = userPayload.first_name;
      billing_last_name = userPayload.last_name;
      billing_email = userPayload.email;
      billing_phone_country_code = userPayload.mobile_phone_country_code;
      billing_phone_number = userPayload.mobile_phone_number;
    } else {
      billing_company_name = document.getElementById('billing-company-name')?.value;
      billing_company_uuid = null;
      billing_first_name = document.getElementById('billing-first-name')?.value;
      billing_last_name = document.getElementById('billing-last-name')?.value;
      billing_email = document.getElementById('billing-email')?.value;
      billing_phone_country_code = phoneNumber.countryCode;
      billing_phone_number = phoneNumber.phoneNumber;
    }

    const billingAddressUuidEl = document.getElementById('billing-address-uuid');

    return {
      billing_address_uuid: billingAddressUuidEl?.value || "",
      is_billing_same_with_contact: isBillingSameAsContact || false,
      billing_company_name,
      billing_company_uuid,
      billing_contact_first_name: billing_first_name,
      billing_contact_last_name: billing_last_name,
      billing_contact_email: billing_email,
      billing_contact_phone_country_code: billing_phone_country_code,
      billing_contact_phone_number: billing_phone_number,
      billing_address_1: document.getElementById('billing_address_1')?.value || (typeof selectedAddress !== 'undefined' ? selectedAddress.address_1 : ""),
      billing_address_2: document.getElementById('billing_address_2')?.value || (typeof selectedAddress !== 'undefined' ? selectedAddress.address_2 : ""),
      billing_suburb: document.getElementById('billing_suburb')?.value || (typeof selectedAddress !== 'undefined' ? selectedAddress.suburb : ""),
      billing_state: document.getElementById('billing_state')?.value || (typeof selectedAddress !== 'undefined' ? selectedAddress.state : ""),
      billing_postcode: document.getElementById('billing_postcode')?.value || (typeof selectedAddress !== 'undefined' ? selectedAddress.postcode : ""),
      billing_country: document.getElementById('billing_country')?.value || (typeof selectedAddress !== 'undefined' ? selectedAddress.country : "")
    };
  }
};


// ============================================================================
// BILLING CHECKBOX HANDLER
// ============================================================================

const BillingCheckboxHandler = {
  setup() {
    if (!DOM.billingCheckbox || !DOM.billingInputs) return;

    DOM.billingCheckbox.addEventListener("insCheck", function () {
      const fields = DOM.billingInputs.querySelectorAll(".required-billing-contact");
      if (this.checked) {
        isBillingSameAsContact = true;
        DOM.billingInputs.classList.add("hide");
        fields.forEach(field => {
          field.removeAttribute("validate");
          field.removeAttribute("has-error");
          field.classList.remove("has-error");
        });
      } else {
        isBillingSameAsContact = false;
        DOM.billingInputs.classList.remove("hide");
        fields.forEach(field => field.setAttribute("validate", "true"));
      }
    });
  }
};


// ============================================================================
// STEP 2 HANDLER
// ============================================================================

const StepHandlers = {
  async handleStep2() {
    if (!DOM.step2) return;

    DOM.step2.addEventListener("insClick", async function (event) {
      const contactEmailEl = document.getElementById('contact-email');
      if (contactEmailEl) {
        contactEmailEl.hasError = false;
        contactEmailEl.errorMessage = "";
      }

      Utils.showLoading();
      const steps = await DOM.stepper.getAllSteps();
      const secondStep = steps[1];
      secondStep.loading = true;

      const isValid = await TicketScript.methods.validateForm(event, DOM.step2Container);
      if (!isValid) {
        secondStep.loading = false;
        secondStep.hasError = true;
        secondStep.setAttribute("has-error", true);
        Utils.hideLoading();
        return;
      }

      userPayload = await OrderProcessor.buildUserPayload();
      billingPayload = await OrderProcessor.buildBillingPayload();

      const data = await OrderProcessor.saveContact({ ...userPayload, ...billingPayload });

      if (data?.uuid) {
        secondStep.hasError = false;

        const urlParams = new URLSearchParams(window.location.search);
        const eventParam = urlParams.get("event");
        window.location.href = `/ticket-payment?event=${eventParam}`;
      } else {
        console.error("An error occurred, Please try again.");
      }
      Utils.hideLoading();
    });
  }
};


// ============================================================================
// INITIALIZATION
// ============================================================================

window.addEventListener("load", () => {
  if (DOM.stepper && typeof DOM.stepper.setStep === "function") {
    setTimeout(() => DOM.stepper.setStep(2), 300);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  // Show billing container
  if (DOM.step2Container) DOM.step2Container.classList.remove("hide");

  // Billing checkbox state on load
  if (DOM.billingCheckbox) {
    isBillingSameAsContact = DOM.billingCheckbox.checked || DOM.billingCheckbox.value === 'true';
  }
  if (DOM.billingCheckbox && DOM.billingInputs && DOM.billingCheckbox.checked) {
    isBillingSameAsContact = true;
    DOM.billingInputs.classList.add("hide");
    const fields = DOM.billingInputs.querySelectorAll(".required-billing-contact");
    fields.forEach(field => {
      field.removeAttribute("validate");
      field.removeAttribute("has-error");
      field.classList.remove("has-error");
    });
  }

  BillingCheckboxHandler.setup();
  StepHandlers.handleStep2();
});
