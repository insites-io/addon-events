/**
 * Ticket Purchase Module
 * Handles the multi-step ticket purchase flow including ticket selection,
 * billing information, payment processing, and order creation.
 */

// ============================================================================
// DOM ELEMENTS - Organized by category
// ============================================================================

const DOM = {
  // Stepper Elements
  stepper: document.getElementById("ticket-purchase-stepper"),
  stepperContainer: document.getElementById("purchase-ticket-stepper-wrapper"),
  stepperMessage: document.getElementById("purchase-ticket-confirmation-message"),
  
  // Step Buttons
  step1: document.getElementById("submit-purchase"),
  step2: document.getElementById("submit-billing-info"),
  step3: document.getElementById("checkout-ticket-submit-btn"),
  step4: document.getElementById("submit-ticket-allocation"),
  step5: document.getElementById("submit-ticket-confirmation"),
  
  // Step Containers
  step1Container: document.getElementById("ticket-selection-step"),
  step1Header: document.getElementById("ticket-purchase-header"),
  step2Container: document.getElementById("ticket-billing-step"),
  step3Container: document.getElementById("ticket-payment-step"),
  step4Container: document.getElementById("ticket-allocation-step"),
  step5Container: document.getElementById("ticket-confirmation-step"),
  
  // Step Indicator Buttons
  step1Button: document.getElementById("purchase-ticket-button-step-1"),
  step2Button: document.getElementById("purchase-ticket-button-step-2"),
  step3Button: document.getElementById("purchase-ticket-button-step-3"),
  step4Button: document.getElementById("purchase-ticket-button-step-4"),
  step5Button: document.getElementById("purchase-ticket-button-step-5"),
  
  // Back Navigation Buttons
  backStep2: document.getElementById('back-step-2'),
  backStep3: document.getElementById('back-step-3'),
  backStep31: document.getElementById('back-step-3-1'),
  backStep3Billing: document.querySelectorAll('.back-step-3-billing'),
  
  // Billing
  billingCheckbox: document.getElementById("billing-same-with-order"),
  billingInputs: document.querySelector("#billing-contact-inputs"),
  
  // Payment Summary
  breakdownContainer: document.getElementById('payment-breakdown'),
  subtotalElem: document.getElementById('subtotal-price'),
  taxElem: document.getElementById('tax-price'),
  processingElem: document.getElementById('proccessing-price'),
  totalElem: document.getElementById('total-price'),
  mobileTotalElem: document.getElementById('mobile-total-price'),
  
  // Form Fields
  subTotalFormEl: document.getElementById('bill-order-value'),
  taxFormEl: document.getElementById('tax-amount'),
  totalFormEl: document.getElementById('bill-total-amount'),
  stripeField: document.getElementById('stripe-card'),
  
  // Event UUID
  eventUuidHidden: document.getElementById("event_uuid_hidden"),
  
  // Payment Fields
  contactPaymentUuid: document.getElementById("contact_uuid"),
  emailPaymentField: document.getElementById("card_email"),
  
  // Loading Overlay
  loadingOverlay: document.getElementById('loadingOverlay'),
  
  // Accordion Items
  accordionItems: document.querySelectorAll(".item"),
  
  // Ticket Steppers
  ticketSteppers: document.querySelectorAll('.number-input'),
  ticketCategoryContainers: document.querySelectorAll('.ticket-category-container')
};

// Validate critical DOM elements
if (!DOM.stepper || !DOM.stepperContainer || !DOM.stepperMessage) {
  console.warn("Required stepper elements not found. Some functionality may not work properly.");
}


// ============================================================================
// GLOBAL STATE
// ============================================================================

let ticketsData = [];
let isBillingSameAsContact = false;
let ticketCounter = 0;
let selectedTickets = [];
const venueCapacityState = {};

const ticketPurchaseData = {
  tickets: [],
  billing: {},
  contact: {},
  payment: {},
  orderTotals: {},
  order: {},
  createdTickets: []
};

let userPayload = {};
let billingPayload = {};
let orderPayload = {};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const Utils = {
  toKebabCase(str) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  },

  getFieldValue(obj, key) {
    return obj?.[key] || "";
  },

  pricify(number) {
    return number
      ? number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "0.00";
  },

  showLoading(step) {
    if (step === 1 && DOM.loadingOverlay) {
      DOM.loadingOverlay.classList.remove("hide");
    } else if (DOM.loadingOverlay) {
      DOM.loadingOverlay.classList.add("hide");
    }
  },

  hideLoading() {
    if (DOM.loadingOverlay) {
      DOM.loadingOverlay.classList.add("hide");
    }
  },

  scrollToTop() {
    const container = document.getElementById("purchase-ticket-container");
    if (container && container.scrollHeight > container.clientHeight) {
      container.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  },

  async extractPhoneNumbers(phoneElement){
    let phoneValues = await phoneElement.getValues();
    return {
      countryCode: phoneValues?.country_code.replace("+", "") || "",
      phoneNumber: phoneValues?.phone_number || ""
    };
  }
};

// ============================================================================
// STEP NAVIGATION MANAGER
// ============================================================================

const StepManager = {
  stepMap: {
    selection: {
      index: 1,
      container: DOM.step1Container,
      button: DOM.step1Button,
      header: "Ticket purchase",
      urlParam: "selection"
    },
    billing: {
      index: 2,
      container: DOM.step2Container,
      button: DOM.step2Button,
      header: "Contact & billing",
      urlParam: "billing"
    },
    payment: {
      index: 3,
      container: DOM.step3Container,
      button: DOM.step3Button,
      header: "Payment",
      urlParam: "payment"
    },
    allocation: {
      index: 4,
      container: DOM.step4Container,
      button: DOM.step4Button,
      header: "Ticket Allocation",
      urlParam: "allocation"
    },
    confirmation: {
      index: 5,
      container: DOM.step5Container,
      button: DOM.step5Button,
      header: "",
      urlParam: "confirmation"
    }
  },

  showStep(stepKey) {
    Object.keys(this.stepMap).forEach(key => {
      const { container, button, header } = this.stepMap[key];

      if (stepKey === 'confirmation') {
        DOM.stepperContainer.classList.add("hide");
        DOM.stepperMessage.classList.remove("hide");
      }

      if (key === stepKey) {
        if (container) container.classList.remove("hide");
        if (button) button.classList.remove("hide");
        if (header && DOM.step1Header) {
          DOM.step1Header.innerText = header;
          DOM.step1Header.classList.remove("hide");
        } else if (DOM.step1Header) {
          DOM.step1Header.classList.add("hide");
        }
      } else {
        if (container) container.classList.add("hide");
        if (button) button.classList.add("hide");
      }
    });
  },

  async initialize() {
    Utils.showLoading();
    this.showStep("selection");

    setTimeout(async () => {
      if (DOM.stepper && typeof DOM.stepper.getAllSteps === "function") {
        const steps = await DOM.stepper.getAllSteps();
        if (steps && steps.length > 0) {
          DOM.stepper.setStep(1);
          Utils.hideLoading();
          Utils.scrollToTop();
        }
      }
    }, 500);
  },

  setupBackNavigation() {
    if (DOM.backStep2) {
      DOM.backStep2.addEventListener('click', () => {
        this.showStep("selection");
        if (DOM.stepper) DOM.stepper.setStep(1);
      });
    }

    if (DOM.backStep3) {
      DOM.backStep3.addEventListener('click', () => {
        this.showStep("billing");
        if (DOM.stepper) DOM.stepper.setStep(2);
      });
    }

    if (DOM.backStep31) {
      DOM.backStep31.addEventListener('click', () => {
        this.showStep("billing");
        if (DOM.stepper) DOM.stepper.setStep(2);
      });
    }

    if (DOM.backStep3Billing && DOM.backStep3Billing.length > 0) {
      DOM.backStep3Billing.forEach(btn => {
        btn.addEventListener('click', () => {
          this.showStep("billing");
          if (DOM.stepper) DOM.stepper.setStep(2);
        });
      });
    }
  }
};


// ============================================================================
// DATA MANAGER
// ============================================================================

const DataManager = {
  updateTicketData() {
    ticketPurchaseData.tickets = [...ticketsData];
  },

  updatePaymentData() {
    ticketPurchaseData.payment = {
      orderTotals: window.orderTotals || {}
    };
  }
};

// ============================================================================
// PAYMENT BREAKDOWN MANAGER
// ============================================================================

const PaymentBreakdownManager = {
  calculateSubtotal(ticketsData) {
    return ticketsData.reduce((sum, ticket) => sum + parseFloat(ticket.price || 0), 0);
  },

  render(ticketsData) {
    if (!ticketsData || ticketsData.length === 0) {
      this.renderEmpty();
      return;
    }

    const venueMap = this.groupTicketsByVenue(ticketsData);
    const ticketCount = this.aggregateTickets(ticketsData);
    
    const { orderSummaryHTML, subtotal } = this.buildOrderSummaryHTML(venueMap);
    const { subtotal: calculatedSubtotal, totalTax, processingFee, total } = 
      this.calculateTotals(subtotal, ticketCount);

    this.updateDOM(orderSummaryHTML, calculatedSubtotal, totalTax, processingFee, total);
    this.saveTotals(calculatedSubtotal, totalTax, processingFee, total);
  },

  renderEmpty() {
    if (DOM.breakdownContainer) DOM.breakdownContainer.style.display = 'none';
    if (DOM.subtotalElem) DOM.subtotalElem.textContent = '$0.00';
    if (DOM.taxElem) DOM.taxElem.textContent = '$0.00';
    if (DOM.processingElem) DOM.processingElem.textContent = '$0.00';
    if (DOM.totalElem) DOM.totalElem.textContent = '$0.00';
    if (DOM.mobileTotalElem) DOM.mobileTotalElem.textContent = '$0.00';
  },

  groupTicketsByVenue(ticketsData) {
    const venueMap = {};
    ticketsData.forEach(ticket => {
      const venue = ticket.ticket_venue_name || 'No Venue';
      if (!venueMap[venue]) venueMap[venue] = [];
      venueMap[venue].push(ticket);
    });
    return venueMap;
  },

  aggregateTickets(ticketsData) {
    const ticketCount = {};
    ticketsData.forEach(ticket => {
      const key = `${ticket.ticket_venue_name || 'No Venue'}-${ticket.name}-${ticket.capacity_type}`;
      if (!ticketCount[key]) {
        ticketCount[key] = { ...ticket, quantity: 0 };
      }
      ticketCount[key].quantity++;
    });
    return ticketCount;
  },

  buildOrderSummaryHTML(venueMap) {
    let orderSummaryHTML = '';
    let subtotal = 0;

    for (const [venue, tickets] of Object.entries(venueMap)) {
      orderSummaryHTML += `<div class="payment-break-downs"><p class="payment-breakdown-venue-name">${venue}</p><div>`;

      const venueCount = {};
      tickets.forEach(ticket => {
        const key = `${ticket.name}-${ticket.capacity_type}`;
        if (!venueCount[key]) {
          venueCount[key] = { ...ticket, quantity: 0 };
        }
        venueCount[key].quantity++;
      });

      for (const [key, info] of Object.entries(venueCount)) {
        const capacityType = info.capacity_type.charAt(0).toUpperCase() + info.capacity_type.slice(1);
        const displayQty = info.quantity;
        const formattedPrice = parseFloat(info.price).toFixed(2);
        const totalPrice = displayQty * parseFloat(info.price);
        subtotal += totalPrice;

        orderSummaryHTML += `
          <div class="payment-break-down-tier-container">
            <div class="payment-break-down-tier-name">${capacityType} - ${info.name}</div>
            <div class="payment-break-down-tier-price"><p>${displayQty} x </p> $${formattedPrice}</div>
          </div>
        `;
      }

      orderSummaryHTML += `</div></div>`;
    }

    return { orderSummaryHTML, subtotal };
  },

  calculateTotals(subtotal, ticketCount) {
    let totalTax = 0;
    selectedTickets = []; // Reset selectedTickets array
    for (const [key, info] of Object.entries(ticketCount)) {
      selectedTickets.push(info);
      const itemSubtotal = info.price * info.quantity;
      const taxValue = parseFloat(info.tax) || 0;
      const quantity = info.quantity || 1;

      if (info.tax_type === 'percentage') {
        totalTax += (itemSubtotal * taxValue) / 100;
      } else {
        totalTax += taxValue * quantity;
      }
    }

    const tempTotal = subtotal + totalTax;
    const processingFee = tempTotal * 0.017;
    const total = tempTotal + processingFee;

    return { subtotal, totalTax, processingFee, total };
  },

  updateDOM(orderSummaryHTML, subtotal, totalTax, processingFee, total) {
    if (DOM.breakdownContainer) {
      DOM.breakdownContainer.innerHTML = orderSummaryHTML;
      DOM.breakdownContainer.style.display = 'flex';
    }
    if (DOM.subtotalElem) DOM.subtotalElem.textContent = `$${subtotal.toFixed(2)}`;
    if (DOM.taxElem) DOM.taxElem.textContent = `$${totalTax.toFixed(2)}`;
    if (DOM.processingElem) DOM.processingElem.textContent = `$${processingFee.toFixed(2)}`;
    if (DOM.totalElem) DOM.totalElem.textContent = `$${total.toFixed(2)}`;
    if (DOM.mobileTotalElem) DOM.mobileTotalElem.textContent = `$${total.toFixed(2)}`;
  },

  saveTotals(subtotal, tax, processing, total) {
    const totals = {
      subtotal,
      tax,
      processing,
      total
    };

    window.orderTotals = totals;
    ticketPurchaseData.orderTotals = totals;
  }
};

// ============================================================================
// ORDER PROCESSOR
// ============================================================================

const OrderProcessor = {
  async saveContact(billingPayload) {
    if (DOM.step2) DOM.step2.loading = true;
    if (DOM.backStep2) DOM.backStep2.disabled = true;

    let result = null;
    try {
      const response = await contactServices.validateEmail(billingPayload.email);
      const validateEmail = response.data;

      if (typeof contactEmailEl !== 'undefined') {
        contactEmailEl.hasError = false;
      }
      if (typeof contactEmailErrorMessageEl !== 'undefined') {
        contactEmailErrorMessageEl.classList.add("hide");
      }

      if (validateEmail.is_guest === false) {
        const response = await contactServices.updateContact(billingPayload);
        result = response.data;
      } else if (validateEmail.is_guest === true && validateEmail.form_type === 'edit' && 
                 validateEmail.is_guest_editable === true) {
        billingPayload.user_uuid = validateEmail.uuid;
        const response = await contactServices.updateContact(billingPayload);
        result = response.data;
      } else if (validateEmail.is_guest === true && validateEmail.form_type === 'add') {
        const response = await contactServices.addContact(billingPayload);
        result = response.data;
      } else {
        if (typeof contactEmailEl !== 'undefined') {
          contactEmailEl.hasError = true;
        }
        if (typeof contactEmailErrorMessageEl !== 'undefined') {
          contactEmailErrorMessageEl.classList.remove("hide");
        }
        const target = document.getElementById("account-details");
        if (target) {
          target.scrollIntoView({ behavior: "smooth" });
        }
      }

      if (result) {
        const fullName = `${result.first_name || ""} ${result.last_name || ""}`.trim();
        const profileDiv = document.querySelector(".profileNav");
        if (profileDiv) {
          profileDiv.setAttribute("label", fullName);
        }
      }

      if (DOM.step2) DOM.step2.loading = false;
      if (DOM.backStep2) DOM.backStep2.disabled = false;

      return result;
    } catch (error) {
      console.error("Contact API error:", error);
      if (DOM.step2) DOM.step2.loading = false;
      if (DOM.backStep2) DOM.backStep2.disabled = false;
      return false;
    }
  },

  async saveOrder(orderPayload) {
    try {
      const response = await orderServices.addOrder(orderPayload);
      if (response.data) {
        return response;
      }
    } catch (error) {
      console.error("Order API error:", error);
    }
    return false;
  },

  transformTicketData(ticketsData, orderNumber) {
    const ticketPayload = [];
    const eventUuid = DOM.eventUuidHidden?.value;

    ticketsData.forEach(ticket => {
      const baseTicket = {
        ticket_type: ticket.capacity_type,
        venue_area_name: ticket.ticket_venue_name,
        event_uuid: eventUuid,
        "venue.uuid": ticket.venue_uuid,
        "event_pricing_division.uuid": ticket.event_pricing_division_uuid,
        "event_pricing_tier.uuid": ticket["event_pricing_tier.uuid"],
        price: parseFloat(ticket.price),
        tax: ticket.tax || null,
        tax_type: ticket.tax_type || null,
        venue_name: ticket.venue_name || null,
        order_number: parseInt(orderNumber),
        allocation_status: "unallocated"
      };

      if (ticket.capacity_type === "group") {
        baseTicket.group_id = `GROUP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        baseTicket.allocation = "unallocated";
        baseTicket.price_includes_tax = null;
      }

      ticketPayload.push(baseTicket);
    });

    return ticketPayload;
  },

  async createTickets(ticketPayload) {
    const urlParams = new URLSearchParams(window.location.search);
    const eventParam = urlParams.get("event");
    const queryString = encodeURIComponent(JSON.stringify(ticketPayload));

    try {
      const response = await ticketServices.createTickets(eventParam, queryString);
      if (response.data) {
        return response;
      }
    } catch (error) {
      console.error("Ticket creation error:", error);
    }
    return false;
  },

  async checkAvailableTickets(ticketData) {
    const urlParams = new URLSearchParams(window.location.search);
    const eventParam = urlParams.get("event");
    const queryString = encodeURIComponent(JSON.stringify(ticketData));

    try {
      const response = await ticketServices.checkTicketAvailability(eventParam, queryString);
      return response;
    } catch (error) {
      console.error("Ticket availability error:", error);
      return false;
    }
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
      mobile_phone_number: phoneNumber.phoneNumber,
    };
  },

  async buildBillingPayload() {
    const phoneNumber = await Utils.extractPhoneNumbers(document.getElementById('billing-phone'));

    if(isBillingSameAsContact === true){
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

    return {
      // Logge-in user selected address
      billing_address_uuid: typeof billingAddressUuidEl !== 'undefined' ? billingAddressUuidEl?.value : "",      

      // Billing contact
      is_billing_same_with_contact: isBillingSameAsContact || false,
      billing_company_name: billing_company_name,
      billing_company_uuid: billing_company_uuid,
      billing_contact_first_name: billing_first_name,
      billing_contact_last_name: billing_last_name,
      billing_contact_email: billing_email,
      billing_contact_phone_country_code: billing_phone_country_code,
      billing_contact_phone_number: billing_phone_number,      

      // Billing address
      // For guest purchases, use document.getElementById('billing_address_1')?.value
      // For logged-in users, use selectedAddress.address_1
      billing_address_1: document.getElementById('billing_address_1')?.value || selectedAddress.address_1,
      billing_address_2: document.getElementById('billing_address_2')?.value || selectedAddress.address_2,
      billing_suburb: document.getElementById('billing_suburb')?.value || selectedAddress.suburb,
      billing_state: document.getElementById('billing_state')?.value || selectedAddress.state,
      billing_postcode: document.getElementById('billing_postcode')?.value || selectedAddress.postcode,
      billing_country: document.getElementById('billing_country')?.value || selectedAddress.country
    };
  },

  async buildOrderPayload(selectedTickets) {
    const eventUuid = DOM.eventUuidHidden?.value;
    const stripeCreditCard = DOM.stripeField?.value || "";
    
    return {
      event_uuid: eventUuid,
            
      // Order company
      order_company_name: userPayload.company_name,
      order_company_uuid: userPayload.company_uuid,

      // Order contact
      order_contact_first_name: userPayload.first_name,
      order_contact_last_name: userPayload.last_name,
      order_contact_email: userPayload.email,
      order_contact_phone_country_code: userPayload.mobile_phone_country_code,
      order_contact_phone_number: userPayload.mobile_phone_number,    

      // Selected card
      stripe_credit_card: stripeCreditCard,
      
      // Selected Tickets
      selectedTickets: selectedTickets
    };
  }
};

// ============================================================================
// TICKET MANAGER
// ============================================================================

const TicketManager = {
  initializeVenueStates() {
    if (DOM.ticketCategoryContainers.length === 0) return;

    DOM.ticketCategoryContainers.forEach(container => {
      const venueState = {
        uuid: container.dataset.venueUuid,
        total_capacity: parseInt(container.dataset.totalCapacity) || 0,
        individual_remaining: parseInt(container.dataset.individualRemaining) || 0,
        group_remaining: parseInt(container.dataset.groupRemaining) || 0,
        capacity_per_group: parseInt(container.dataset.capacityPerGroup) || 0,
        number_of_group: parseInt(container.dataset.numberOfGroup) || 0
      };
      venueCapacityState[venueState.uuid] = venueState;
    });
  },

  countSelected(venueUuid, type) {
    return ticketsData.reduce((sum, ticket) => {
      if (ticket.event_pricing_division_uuid !== venueUuid) return sum;
      if (type === "group") {
        return sum + (ticket.capacity_type === "group" ? 1 : 0);
      } else {
        return sum + (ticket.capacity_type === "individual" ? 1 : 0);
      }
    }, 0);
  },

  enforceVenueCapacityLimit(venueUuid) {
    const venue = venueCapacityState[venueUuid];
    if (!venue) return;

    const selectedIndividual = this.countSelected(venueUuid, "individual");
    const selectedGroupSets = this.countSelected(venueUuid, "group");
    const maxIndividual = venue.individual_remaining + selectedIndividual;
    const maxGroupSets = venue.number_of_group;

    DOM.ticketSteppers.forEach(stepper => {
      const input = stepper.querySelector('.input-stepper');
      const decrementBtn = stepper.querySelector('.decrement');
      const incrementBtn = stepper.querySelector('.increment');

      let stepperData;
      try {
        stepperData = JSON.parse(input.getAttribute('data'));
      } catch (e) {
        stepperData = null;
      }

      if (!stepperData || stepperData.event_pricing_division_uuid !== venueUuid) return;

      const type = stepperData.capacity_type;
      const uniqueKey = `${Utils.toKebabCase(stepperData.ticket_venue_name)}-${Utils.toKebabCase(stepperData.name)}-${Utils.toKebabCase(stepperData.capacity_type)}`;
      const hasSelectedTickets = ticketsData.some(ticket => ticket.uniqueKey === uniqueKey);

      let isTypeFull = false;
      if (type === "group") {
        isTypeFull = selectedGroupSets >= maxGroupSets;
      } else {
        isTypeFull = selectedIndividual >= maxIndividual;
      }

      if (isTypeFull && !hasSelectedTickets) {
        input.setAttribute("disabled", true);
        decrementBtn.setAttribute("disabled", true);
        incrementBtn.setAttribute("disabled", true);
      } else {
        input.removeAttribute("disabled");
        decrementBtn.removeAttribute("disabled");
        incrementBtn.removeAttribute("disabled");
      }
    });
  },

  setupSteppers() {
    if (DOM.ticketSteppers.length === 0) return;

    DOM.ticketSteppers.forEach(stepper => {
      const input = stepper.querySelector('.input-stepper');
      const decrementBtn = stepper.querySelector('.decrement');
      const incrementBtn = stepper.querySelector('.increment');

      if (!input) return;

      input.dataset.previousCount = String(parseInt(input.value) || 0);

      incrementBtn?.addEventListener('click', () => {
        let value = parseInt(input.value) || 0;
        const max = parseInt(input.max) || Infinity;

        let data;
        try {
          data = JSON.parse(input.getAttribute('data'));
        } catch (e) {
          console.error('Invalid JSON data on stepper:', e);
          return;
        }

        if (data && data.capacity_type === "group") {
          const venue = venueCapacityState[data.event_pricing_division_uuid];
          if (!venue) return;

          const previous = parseInt(input.dataset.previousCount) || 0;
          const selectedSets = this.countSelected(venue.uuid, "group");
          const allowedMaxForThisInput = venue.number_of_group - (selectedSets - previous);

          const newValue = Math.min(value + 1, max, allowedMaxForThisInput);
          if (newValue === value) {
            App.events.notyf('error', 'You have reached the maximum number of tickets available for this selection.');
            return;
          }
          input.value = String(newValue);
          input.dispatchEvent(new Event('input'));
        } else {
          if (value < max) {
            input.value = value + 1;
            input.dispatchEvent(new Event('input'));
          } else {
            App.events.notyf('error', 'You have reached the maximum number of tickets available for this selection.');
          }
        }
      });

      decrementBtn?.addEventListener('click', () => {
        let value = parseInt(input.value) || 0;
        const min = parseInt(input.min) || 0;
        if (value > min) {
          input.value = value - 1;
          input.dispatchEvent(new Event('input'));
        }
      });

      input.addEventListener('input', async () => {
        const previousCount = parseInt(input.dataset.previousCount) || 0;
        const currentCount = parseInt(input.value) || 0;

        let data;
        try {
          data = JSON.parse(input.getAttribute('data'));
        } catch (error) {
          console.error('Invalid JSON in data attribute:', error);
          input.value = previousCount;
          return;
        }

        const venueState = venueCapacityState[data.event_pricing_division_uuid];
        if (!venueState) {
          input.value = previousCount;
          return;
        }

        let ticketChange = currentCount - previousCount;

        if (data.capacity_type === "group") {
          const maxSets = venueState.number_of_group;
          const selectedSets = this.countSelected(data.event_pricing_division_uuid, "group");
          const otherSets = selectedSets - previousCount;
          const allowedMaxForThisInput = maxSets - otherSets;

          if (currentCount > allowedMaxForThisInput) {
            input.value = previousCount;
            App.events.notyf('error', 'Not enough group sets left for this venue.');
            return;
          }
        } else {
          const remainingIndividuals = venueState.individual_remaining;
          if (ticketChange > remainingIndividuals) {
            input.value = previousCount;
            App.events.notyf('error', 'Not enough individual tickets remaining for this tier.');
            return;
          }
        }

        const uniqueKey = `${Utils.toKebabCase(data.ticket_venue_name)}-${Utils.toKebabCase(data.name)}-${Utils.toKebabCase(data.capacity_type)}`;

        if (ticketChange > 0) {
          for (let i = 0; i < ticketChange; i++) {
            const ticket = { ...data, ticketId: ++ticketCounter, uniqueKey };
            ticketsData.push(ticket);
          }
        } else if (ticketChange < 0) {
          for (let i = 0; i < Math.abs(ticketChange); i++) {
            const index = ticketsData.findIndex(ticket => ticket.uniqueKey === uniqueKey);
            if (index !== -1) ticketsData.splice(index, 1);
          }
        }

        if (data.capacity_type === "group") {
          if (typeof venueState.capacity_per_group === 'number') {
            venueState.group_remaining = Math.max(0, venueState.group_remaining - (ticketChange * venueState.capacity_per_group));
          }
        } else {
          venueState.individual_remaining = Math.max(0, venueState.individual_remaining - ticketChange);
        }

        input.dataset.previousCount = String(currentCount);
        PaymentBreakdownManager.render(ticketsData);
        this.enforceVenueCapacityLimit(data.event_pricing_division_uuid);
      });
    });
  }
};

// ============================================================================
// ACCORDION MANAGER
// ============================================================================

const AccordionManager = {
  setup() {
    if (DOM.accordionItems.length === 0) return;

    DOM.accordionItems.forEach(item => {
      const title = item.querySelector(".title");
      const content = item.querySelector(".content");

      if (!title || !content) return;

      title.addEventListener("click", () => {
        const isOpen = item.classList.contains("open");

        if (isOpen) {
          const contentHeight = content.scrollHeight;
          content.style.height = contentHeight + "px";
          content.offsetHeight;
          content.style.height = "0";
          item.classList.remove("open");
        } else {
          content.style.display = "block";
          const contentHeight = content.scrollHeight;
          content.style.height = "0";
          content.offsetHeight;
          content.style.height = contentHeight + "px";
          item.classList.add("open");
        }
      });

      if (item.classList.contains("open")) {
        content.style.display = "block";
        content.style.height = "auto";
      } else {
        content.style.height = "0";
        content.style.display = "none";
      }

      content.addEventListener("transitionend", () => {
        if (item.classList.contains("open")) {
          content.style.height = "auto";
        } else {
          content.style.display = "none";
        }
      });
    });
  }
};

// ============================================================================
// STEP HANDLERS
// ============================================================================

const StepHandlers = {
  async handleStep1() {
    if (!DOM.step1) return;

    DOM.step1.addEventListener("insClick", async () => {
      Utils.showLoading(1);
      const steps = await DOM.stepper.getAllSteps();
      const firstStep = steps[0];

      if (!ticketsData || ticketsData.length === 0) {
        Utils.showLoading();
        Utils.hideLoading();
        Utils.scrollToTop();
        App.events.notyf('error', "Please select a ticket in order to proceed.");
        firstStep.hasError = true;
        firstStep.setAttribute("has-error", true);
        return;
      }

      setTimeout(async () => {
        const ticketAvailability = await OrderProcessor.checkAvailableTickets(ticketsData);
        
        if (ticketAvailability.data.has_error) {
          firstStep.hasError = true;
          firstStep.setAttribute("has-error", true);
          Utils.hideLoading();
          const confirm = await App.events.swal(
            "error",
            "Tickets not available",
            "Your selected tickets are either sold out or no longer available. Please choose another option to proceed.",
            "OK",
            false
          );
          if (confirm) {
            window.location.reload();
          }
        } else {
          setTimeout(() => {
            Utils.hideLoading();
            firstStep.hasError = false;
            DataManager.updateTicketData();
            DOM.stepper.next();
            StepManager.showStep("billing");
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 500);
        }
      }, 1000);
    });
  },

  async handleStep2() {
    if (!DOM.step2) return;

    DOM.step2.addEventListener("insClick", async function (event) {
      if (typeof contactEmailEl !== 'undefined') {
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

      const orderContactData = ticketPurchaseData.contact;

      if (isBillingSameAsContact) {
        Object.keys(orderContactData).forEach(key => {
          const billingKey = key.replace(/^contact_/, "billing_");
          ticketPurchaseData.billing[billingKey] = orderContactData[key];
        });
      }

      // Create or update user; Pass billingPayload to save data in sessions.
      userPayload = await OrderProcessor.buildUserPayload();
      billingPayload = await OrderProcessor.buildBillingPayload();
      const data = await OrderProcessor.saveContact({
          ...userPayload,
          ...billingPayload
        });

      if (data?.uuid) {
        secondStep.hasError = false;
        DOM.stepper.next();
        StepManager.showStep("payment");
        Utils.scrollToTop();
        if (DOM.contactPaymentUuid) DOM.contactPaymentUuid.value = data.uuid;
        if (DOM.emailPaymentField) DOM.emailPaymentField.value = data.email;
        
        if (data.is_guest) {
          loadCards(true);
          window.isGuestStep2 = true;
        } else {
          loadCards(false);
        }
      } else {
        console.error("An error occurred, Please try again.");
      }
      Utils.hideLoading();
    });
  },

  async handleStep3() {
    if (!DOM.step3) return;

    DOM.step3.addEventListener("insClick", async function (event) {
      Utils.showLoading();
      DOM.step3.loading = true;
      const steps = await DOM.stepper.getAllSteps();
      const thirdStep = steps[2];

      const isValid = await TicketScript.methods.validateForm(event, DOM.step3Container);
      if (!isValid) {
        thirdStep.loading = false;
        thirdStep.hasError = true;
        thirdStep.setAttribute("has-error", true);
        Utils.hideLoading();
        return;
      }

      DataManager.updatePaymentData();

      orderPayload = await OrderProcessor.buildOrderPayload(selectedTickets);

      const orderResponse = await OrderProcessor.saveOrder({
        ...orderPayload,
        ...billingPayload,
        tickets: ticketPurchaseData.tickets
      });

      if (orderResponse.data.has_ticket_availability_error === true) {
        const confirm = await App.events.swal(
          "error",
          "Tickets not available",
          "Your selected tickets are either sold out or no longer available. Please choose another option to proceed.",
          "OK",
          false
        );
        if (confirm) {
          window.location.reload();
        }
      }

      if (!orderResponse.data.has_error) {
        ticketPurchaseData.order = orderResponse.data;

        setTimeout(async () => {
          thirdStep.hasError = false;
          DOM.stepper.next();

          const ticketPayload = OrderProcessor.transformTicketData(
            ticketPurchaseData.tickets,
            orderResponse.data.data.id
          );
          const ticketResponse = await OrderProcessor.createTickets(ticketPayload);

          if (!ticketResponse.data.has_error) {
            ticketPurchaseData.createdTickets = ticketResponse.data;
            Utils.scrollToTop();
            Utils.hideLoading();
            App.events.notyf('success', "Thank you! We've received your payment and your order is complete.");
            setTimeout(() => {
              const urlParams = new URLSearchParams(window.location.search);
              const eventParam = urlParams.get("event");
              window.location.href = `/allocate-ticket?event=${eventParam}&order_id=${orderResponse.data.data.id}`;
              OrderSummaryManager.save();
            }, 300);
          } else {
            App.events.notyf('error', "Failed to create tickets. Please try again.");
            thirdStep.hasError = true;
            thirdStep.setAttribute("has-error", true);
          }
        }, 500);
      } else {
        App.events.notyf('error', "Your payment failed. Please check the details and try again.");
        DOM.step3.loading = false;
        thirdStep.hasError = true;
        thirdStep.setAttribute("has-error", true);
        Utils.scrollToTop();
        Utils.hideLoading();
      }
    });
  },

  async handleStep4() {
    if (!DOM.step4) return;

    DOM.step4.addEventListener("insClick", async function () {
      DOM.stepperContainer.classList.add("hide");
      DOM.stepperMessage.classList.remove("hide");
      Utils.showLoading();
      Utils.hideLoading();
      Utils.scrollToTop();
      DOM.stepper.next();
      StepManager.showStep("confirmation");
      if (DOM.step1Header) DOM.step1Header.classList.add("hide");
    });
  }
};

// ============================================================================
// ORDER SUMMARY MANAGER
// ============================================================================

const OrderSummaryManager = {
  save() {
    const summaryData = {
      breakdown: DOM.breakdownContainer?.innerHTML || "",
      subtotal: DOM.subtotalElem?.textContent || "",
      tax: DOM.taxElem?.textContent || "",
      processing: DOM.processingElem?.textContent || "",
      total: DOM.totalElem?.textContent || ""
    };

    localStorage.setItem("orderSummary", JSON.stringify(summaryData));
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
        fields.forEach(field => {
          field.setAttribute("validate", "true");
        });
      }
    });
  }
};

// ============================================================================
// GLOBAL EXPORTS (for backward compatibility)
// ============================================================================

// Expose functions that may be called from other scripts or inline code
window.renderPaymentBreakdown = (ticketsData) => PaymentBreakdownManager.render(ticketsData);
window.calculateSubtotal = (ticketsData) => PaymentBreakdownManager.calculateSubtotal(ticketsData);

// ============================================================================
// INITIALIZATION
// ============================================================================

window.addEventListener("load", () => {
  StepManager.initialize();
});

document.addEventListener("DOMContentLoaded", () => {
  if (window.location.pathname !== "/purchase-ticket") return;

  // Initialize billing checkbox state
  if (DOM.billingCheckbox) {
    isBillingSameAsContact = DOM.billingCheckbox.value === 'true';
  }

  // Setup stepper click navigation
  if (DOM.stepper && typeof DOM.stepper.getAllSteps === "function") {
    DOM.stepper.getAllSteps().then(allSteps => {
      allSteps.forEach((step, index) => {
        step.style.cursor = "pointer";

        step.addEventListener("click", async () => {
          const stepsNow = await DOM.stepper.getAllSteps();
          let currentIndex = -1;
          
          stepsNow.forEach((s, i) => {
            const inner = s.querySelector(".ins-step");
            if (inner && inner.classList.contains("active")) {
              currentIndex = i;
            }
          });

          if (index < currentIndex) {
            DOM.stepper.setStep(index + 1);

            switch (index) {
              case 0:
                StepManager.showStep("selection");
                break;
              case 1:
                StepManager.showStep("billing");
                break;
              case 2:
                StepManager.showStep("payment");
                break;
            }
          }
        });
      });
    });
  }

  // Initialize all modules
  TicketManager.initializeVenueStates();
  TicketManager.setupSteppers();
  StepManager.setupBackNavigation();
  AccordionManager.setup();
  BillingCheckboxHandler.setup();
  
  // Check billing checkbox state on page load
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
  
  StepHandlers.handleStep1();
  StepHandlers.handleStep2();
  StepHandlers.handleStep3();
  StepHandlers.handleStep4();
});
