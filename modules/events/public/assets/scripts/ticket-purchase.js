 
// Stepper Elements
const ticketPurchaseStepper = document.getElementById("ticket-purchase-stepper");
const ticketPurchaseStepperContainer = document.getElementById("purchase-ticket-stepper-wrapper");
const ticketPurchaseStepperMessage = document.getElementById("purchase-ticket-confirmation-message");

// Check if required elements exist
if (!ticketPurchaseStepper || !ticketPurchaseStepperContainer || !ticketPurchaseStepperMessage) {
  console.warn("Required stepper elements not found. Some functionality may not work properly.");
}

const step1 = document.getElementById("submit-purchase");
const step2 = document.getElementById("submit-billing-info");
const step3 = document.getElementById("checkout-ticket-submit-btn");
const step4 = document.getElementById("submit-ticket-allocation");
const step5 = document.getElementById("submit-ticket-confirmation");

const step1Container = document.getElementById("ticket-selection-step");
const step1Header = document.getElementById("ticket-purchase-header");
const step2Container = document.getElementById("ticket-billing-step");
const step3Container = document.getElementById("ticket-payment-step");
const step4Container = document.getElementById("ticket-allocation-step");
const step5Container = document.getElementById("ticket-confirmation-step");

const step1button = document.getElementById("purchase-ticket-button-step-1");
const step2button = document.getElementById("purchase-ticket-button-step-2");
const step3button = document.getElementById("purchase-ticket-button-step-3");
const step4button = document.getElementById("purchase-ticket-button-step-4");
const step5button = document.getElementById("purchase-ticket-button-step-5");

const checkbox = document.getElementById("billing-same-with-contact");
const billingInputs = document.querySelector("#billing-contact-inputs");
let isChecked = false;

//Ticket Summary
const breakdownContainer = document.getElementById('payment-breakdown');
const subtotalElem = document.getElementById('subtotal-price');
const taxElem = document.getElementById('tax-price'); 
const processingElem = document.getElementById('proccessing-price');
const totalElem = document.getElementById('total-price');

let ticketsData = [];
let ticketPurchaseData = {
    // Step 1: Ticket Selection
    tickets: [],
    
    // Step 2: Billing Information
    billing: {},
    contact: {},
    
    // Step 3: Payment Information
    payment: {},
    orderTotals: {},
    
    // Step 4: Order & Ticket Creation
    order: {},
    createdTickets: []
};

// Function to update ticket data (Step 1)
function updateTicketData() {
    ticketPurchaseData.tickets = [...ticketsData];
}

// Function to update billing data (Step 2)
function updateBillingData() {
    const billingFields = document.querySelectorAll(
        "#billing-details ins-input, #billing-details input, #billing-details ins-input-tel, #billing-address-fields ins-input"
    );
    
    ticketPurchaseData.billing = {};
    billingFields.forEach(field => {
        const key = field.id.replace(/-/g, "_"); 
        const value = field.value || field.getAttribute("value") || "";
        ticketPurchaseData.billing[key] = value;
    });
}

// Function to update contact data (Step 2)
function updateContactData() {
    const orderContactFields = document.querySelectorAll(
        "#account-details ins-input, #account-details input, #account-details ins-input-tel"
    );
    
    ticketPurchaseData.contact = {};
    orderContactFields.forEach(field => {
        const key = (field.name || field.id || "").replace(/-/g, "_");
        const value = field.value || field.getAttribute("value") || "";
        ticketPurchaseData.contact[key] = value;
    });
}

// Function to update payment data (Step 3)
function updatePaymentData() {
    ticketPurchaseData.payment = {
        orderTotals: window.orderTotals || {}
    };
}

// AMOUNT DETAILS
let subTotalFormEl = document.getElementById('bill-order-value')
let taxFormEl = document.getElementById('tax-amount')
let totalFormEl = document.getElementById('bill-total-amount')
let totalDiscountFormEl = document.getElementById('total-discount-amount')

let ticketNameEl = document.getElementById('ticket-type-name')
let stripeField = document.getElementById('stripe-card')



// DISCOUNT CODES
let event_uuid_hidden = document.getElementById("event_uuid_hidden");
let apply_discount_code = document.getElementById("apply-discount-code");
let discount_code_value = document.getElementById("discount-code-value");

// Check if discount elements exist
if (!apply_discount_code || !discount_code_value) {
  console.warn("Discount code elements not found. Discount functionality may not work properly.");
}


const summaryContainer = document.querySelector('.discount-summary');
const cardContainer = document.querySelector('.discount-summary-card');
let appliedDiscounts = []; // store multiple discount objects


// DISPLAY
let display_discount_value_summary = document.getElementById("display-discount-value-summary");
let display_discount_summary = document.querySelectorAll(".discount-summary");
let display_discount_summary_card = document.querySelectorAll(".discount-summary-card");

let discount_id = document.getElementById("discount-id");
let discount_name = document.getElementById("discount-name");
let discount_usage_count = document.getElementById("discount-usage-count");

let priceWithoutDiscount = '';

//Ticket payment 
const contact_payment_uuid = document.getElementById("contact_uuid");
const emailpayment_field = document.getElementById("card_email");

/**
 * Discount Code functionality
 */
if (apply_discount_code) {
  apply_discount_code.addEventListener('insClick', async (event) => {
  apply_discount_code.loading = true;

  // --- Check if there are selected tickets ---
  if (!ticketsData || ticketsData.length === 0) {
    setTimeout(() => {
      App.events.notyf('error', "Please select ticket first, before applying discount code.");  
    }, 100); 
    apply_discount_code.loading = false;
    return;
  }

  // --- Check if discount code input is empty ---
  const code = discount_code_value.value.trim();
  if (!code) {
    setTimeout(() => {
      App.events.notyf('error', "Please enter discount code.");  
    }, 100); 
    apply_discount_code.loading = false;
    return;
  }

  // --- Check for duplicates ---
  const isDuplicate = appliedDiscounts.some(d => d.code.toLowerCase() === code.toLowerCase());
  if (isDuplicate) {
    setTimeout(() => {
      App.events.notyf('error', "This discount code is already applied.");  
    }, 100); 
    apply_discount_code.loading = false;
    return;
  }

  // --- Validate the code from the server ---
  checkIfCodeIsValid();
  });
}

if (cardContainer) {
  cardContainer.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.remove-discount');
    if (!removeBtn) return; // Click wasn't on a remove button

    const codeToRemove = removeBtn.dataset.code;

    // Remove the discount from appliedDiscounts array
    appliedDiscounts = appliedDiscounts.filter(d => d.code !== codeToRemove);

    // Re-render the discount cards
    renderDiscountsUI();

    // Recalculate totals
    renderPaymentBreakdown(ticketsData);

    // Notify user
    App.events.notyf('success', `Discount code "${codeToRemove}" removed.`);
  });
}

async function getDiscountCodeDetails(){
  let url = '/get-discount-code?'+ 'discountCode='+ discount_code_value.value;
  let response = await apiServices.processRequest('get', url);
  console.log(response)
  return response
}

async function checkIfCodeIsValid(){
  let response = await getDiscountCodeDetails();
  
  if(response.data.discount_code != undefined){
    checkIfCodeIsLimit();
    
  }else{
    
    errorDiscountCode();
  }
}

async function checkIfCodeIsLimit(){
  let response = await getDiscountCodeDetails();

  if(response.data.usage_count == response.data.usage_limit){
    setTimeout(() => {
      App.events.notyf('error', "Discount code has reached the limit.");  
    }, 100);
    apply_discount_code.loading = false; 
  }else{
    checkIfApplicableToAllEvents();
  }
}

async function checkIfApplicableToAllEvents(){
  let response = await getDiscountCodeDetails();
  if(response.data.is_applicable_to_all_events == "true" || response.data.is_applicable_to_all_events == null){
    discountCodeApplied();
  }else{
    if(response.data.event_uuids.includes(event_uuid_hidden.value)){
      discountCodeApplied();
    }else{
      errorDiscountCode();
    }
  }
}



async function discountCodeApplied() {
  let response = await getDiscountCodeDetails();
  let discount = response.data;

  // Check if already applied
  if (appliedDiscounts.some(d => d.code === discount.discount_code)) {
    setTimeout(() => {
      App.events.notyf('error', "This discount code is already applied.");
    }, 100);
    apply_discount_code.loading = false;
    return;
  }

  // Build discount object
  let discountObj = {
    id: discount.id,
    code: discount.discount_code,
    name: discount.discount_name,
    type: discount.discount_type,
    value: parseFloat(discount.discount_value)
  };

  // Add to applied discounts
  appliedDiscounts.push(discountObj);

  // Update UI
  renderDiscountsUI();

  setTimeout(() => {
    App.events.notyf('success', "Discount code applied.");
    renderPaymentBreakdown(ticketsData);
    apply_discount_code.loading = false;
    discount_code_value.value = ""
  }, 200);
}

function renderDiscountsUI() {
  // Show sections if there are discounts
  if (appliedDiscounts.length > 0) {
    summaryContainer.classList.remove('is_not_visible');
    cardContainer.classList.remove('is_not_visible');
  } else {
    summaryContainer.classList.add('is_not_visible');
    cardContainer.classList.add('is_not_visible');
    return;
  }

  // Update discount summary value
  let totalDiscount = 0;
  let subtotal = calculateSubtotal(ticketsData);

  let discountedSubtotal = subtotal;
  appliedDiscounts.forEach(d => {
    if (d.type === "percentage") {
      totalDiscount += (discountedSubtotal * d.value) / 100;
      discountedSubtotal -= (discountedSubtotal * d.value) / 100;
    } else {
      totalDiscount += d.value;
      discountedSubtotal -= d.value;
    }
  });

  document.getElementById('display-discount-value-summary').textContent =
    "-$" + totalDiscount.toFixed(2);

  // Render all discount cards
  cardContainer.innerHTML = '';
  appliedDiscounts.forEach(d => {
    let card = document.createElement('div');
    card.classList.add('discount-summary-details');
    card.innerHTML = `
      <div>
        <p class="body-x-small-bold">
          ${d.type === "percentage" ? d.value + "% Off" : "$" + d.value + " Off"}
        </p>
        <p class="body-x-small">${d.name}</p>
      </div>
      <div>
        <button type="button" class="remove-discount" data-code="${d.code}">
          <i class="icon-close-1"></i>
        </button>
      </div>
    `;
    cardContainer.appendChild(card);
  });

  // Remove handlers are already attached via cardContainer event delegation
}

function showDiscountDetails(){
  display_discount_summary[0].classList.remove('is_not_visible');
  display_discount_summary_card[0].classList.remove('is_not_visible');
}

function hideDiscountDetails(){
  display_discount_summary[0].classList.add('is_not_visible');
  display_discount_summary_card[0].classList.add('is_not_visible');
  discount_code_value.value = '';

  totalDiscountFormEl.setAttribute('value', 0);
  apply_discount_code.loading = false;

  // remove discount details
  discount_id.setAttribute('value', '');
  discount_name.setAttribute('value', '');
  discount_usage_count.setAttribute('value', '');
}

function errorDiscountCode(){
  setTimeout(() => {
      App.events.notyf('error', "Sorry, the discount code you entered is invalid. Please ensure that you have entered the code correctly.");  
  }, 100); 
  apply_discount_code.loading = false;
}

function resetValue(){
  //Set form value
  subTotalFormEl.setAttribute('value', "")
  totalFormEl.setAttribute('value', "")
  apply_discount_code.loading = false;
}

function pricify(number) {
    return number 
        ? number.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})
        : "0.00";
}







/**
 * Step functionality
 */
const stepMap = {
    selection: { index: 1, container: step1Container, button: step1button, header: "Ticket Selection", urlParam: "selection" },
    billing: { index: 2, container: step2Container, button: step2button, header: "Contact & Billing", urlParam: "billing" },
    payment: { index: 3, container: step3Container, button: step3button, header: "Payment", urlParam: "payment" },
    allocation: { index: 4, container: step4Container, button: step4button, header: "Ticket Allocation", urlParam: "allocation" },
    confirmation: { index: 5, container: step5Container, button: step5button, header: "", urlParam: "confirmation" }
};

// Helpers
function showLoading(step) {
  const overlay = document.getElementById('loadingOverlay');
  const message = document.getElementById('loadingMessage');
 
  if (overlay) {
    if (step === 1 && message) {
      message.style.display = 'block';
    } else if (message) {
      message.style.display = 'none'; 
    }
    overlay.classList.add("active");
  }
}
function hideLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) {
        overlay.classList.remove("active");
    }
}
function scrollToTop() {
    const container = document.getElementById("purchase-ticket-container");
    if (container && container.scrollHeight > container.clientHeight) {
        container.scrollTo({ top: 0, behavior: "smooth" });
    } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}



function toKebabCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphen
    .replace(/(^-|-$)/g, '');    // Remove leading/trailing hyphens
}


// Back navigation logic
const backStep2 = document.getElementById('back-step-2');
const backStep3 = document.getElementById('back-step-3');

if (backStep2) {
  backStep2.addEventListener('click', () => {
    showStep("selection");
    if (ticketPurchaseStepper) {
      ticketPurchaseStepper.setStep(1);
    }
  });
}

if (backStep3) {
  backStep3.addEventListener('click', () => {
    showStep("billing");
    if (ticketPurchaseStepper) {
      ticketPurchaseStepper.setStep(2);
    }
  });
}



function showStep(stepKey) {
    Object.keys(stepMap).forEach(key => {
        const { container, button, header } = stepMap[key];

        if (stepKey == 'confirmation') {
            ticketPurchaseStepperContainer.classList.add("hide");
            ticketPurchaseStepperMessage.classList.remove("hide")
        }

        if (key === stepKey) {
            if (container) container.classList.remove("hide");
            if (button) button.classList.remove("hide");
            if (header) {
                step1Header.innerText = header;
                step1Header.classList.remove("hide");
            } else {
                step1Header.classList.add("hide");
            }
        } else {
            if (container) container.classList.add("hide");
            if (button) button.classList.add("hide");
        }
    });
}

//  Helper to get field value safely
function getFieldValue(obj, key) {
    return obj?.[key] || "";
}



function initializeStep() {
  showLoading();
  showStep("selection");
  
  // Initialize stepper UI
  setTimeout(async () => {
      if (typeof ticketPurchaseStepper !== "undefined") {
          const steps = await ticketPurchaseStepper.getAllSteps();
          if (!steps || steps.length === 0) return;
          
          // Set to first step
          ticketPurchaseStepper.setStep(1);
          hideLoading();
          scrollToTop();
      }
  }, 200);
}

let currentStep = initializeStep();

// Billing Checkbox Sync
if (checkbox && billingInputs) {
  checkbox.addEventListener("insCheck", function () {
      const fields = billingInputs.querySelectorAll("[validate]");
      if (this.checked) {
          isChecked = true;
          billingInputs.classList.add("hide");
          fields.forEach(field => {
              field.removeAttribute("validate");
              field.classList.remove("has-error");
          });
      } else {
          isChecked = false;
          billingInputs.classList.remove("hide");
          fields.forEach(field => {
              field.setAttribute("validate", "true");
          });
      }
  });
}

async function saveContact(billing_payload) {
    let result = null;
    try {
        if (billing_payload.uuid) {
            // Update existing contact
            const response = await contactServices.updateContact(billing_payload);
            result = response.data;
        } else {
            // Add new contact
            const response = await contactServices.addContact(billing_payload);
            result = response.data;
        }

        if (result) {
            // Update profile label if available
            const fullName = `${result.first_name || ""} ${result.last_name || ""}`.trim();
            const profileDiv = document.querySelector(".profileNav");
            if (profileDiv) {
                profileDiv.setAttribute("label", fullName);
            }
        }

        return result;
    } catch (error) {
        console.error("Contact API error:", error);
        return false;
    }
}

// Save order data to API
async function saveOrder(orderPayload) {
    try {
        const response = await orderServices.addOrder(orderPayload);
        if (response.data) {
            return response;
        }
    } catch (error) {
        console.error("Order API error:", error);
    }
    return false;
}

// Transform ticket data into correct payload format
function transformTicketData(ticketsData, orderNumber) {
    const ticketPayload = [];
    const groupTickets = {}; // Track group tickets by tier
    
    ticketsData.forEach(ticket => {
        const baseTicket = {
            ticket_type: ticket.capacity_type,
            venue_area_name: ticket.ticket_venue_name,
            "venue.uuid": ticket.venue_uuid,
            "event_venue_area.uuid": ticket.event_venue_area_uuid,
            "event_pricing_tier.uuid": ticket["event_pricing_tier.uuid"],
            price: parseFloat(ticket.price),
            tax: ticket.tax || null,
            tax_type: ticket.tax_type || null,
            venue_name: ticket.venue_name || null,
            "purchased_by.uuid": ticketPurchaseData.billing.user_uuid || null,
            order_number: parseInt(orderNumber)
        };

        if (ticket.capacity_type === "group") {
            // Create group ID for tickets with same tier
            const tierKey = `${ticket.event_venue_area_uuid}-${ticket["event_pricing_tier.uuid"]}`;
            
            if (!groupTickets[tierKey]) {
                groupTickets[tierKey] = {
                    groupId: `GROUP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    referenceCode: `REF-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
                };
            }
            
            baseTicket.group_id = groupTickets[tierKey].groupId;
            baseTicket.reference_code = groupTickets[tierKey].referenceCode;
            baseTicket.allocation = null;
            baseTicket.price_includes_tax = null;
        }

        ticketPayload.push(baseTicket);
    });

    return ticketPayload;
}

// Create ticket
async function createTickets(ticketPayload) {
    const urlParams = new URLSearchParams(window.location.search);
    const eventParam = urlParams.get("event");
    const queryString = encodeURIComponent(JSON.stringify(ticketPayload));

    try {
        // Use the appropriate API endpoint for creating tickets
        const response = await ticketServices.createTickets(eventParam,queryString);
        if (response.data) {
            return response;
        }
    } catch (error) {
        console.error("Ticket creation error:", error);
    }
    return false;
}

async function checkAvailableTickets(ticketData) {
  const urlParams = new URLSearchParams(window.location.search);
  const eventParam = urlParams.get("event");
  const queryString = encodeURIComponent(JSON.stringify(ticketData));

  try {
    const response = await ticketServices.checkTicketAvailability(eventParam,queryString)
    return response
  } catch (error) {
     console.error("Ticket availability error:", error);
    return false
  }


}

// STEP 1
if (step1) {
    step1.addEventListener("insClick", async function (event) {
        showLoading(1);
        const steps = await ticketPurchaseStepper.getAllSteps();
        const firstStep = steps[0];
        let isValid = true
        console.log(ticketsData)
        if (!ticketsData || ticketsData.length === 0) {
          isValid = false
        } 

        if (isValid) {
        setTimeout (async() => {
          let ticketAvailabaility = await checkAvailableTickets(ticketsData)
          if(ticketAvailabaility.data.has_error ) {
              firstStep.hasError = true;
              firstStep.setAttribute("has-error", true);
              hideLoading();
              scrollToTop();
              App.events.notyf('error', "Your selected tickets are either sold out or no longer available. Please choose another option to proceed.");  
          }else {
            setTimeout(() => {
              hideLoading();
              firstStep.hasError = false;
              updateTicketData(); // Store ticket data
              ticketPurchaseStepper.next();
              showStep("billing");
              scrollToTop();
            }, 500);
          }
        },1000)
       


        } else {
            showLoading();
            hideLoading();
            scrollToTop();
            App.events.notyf('error', "Please select a ticket in order to proceed.");  
            firstStep.hasError = true;
            firstStep.setAttribute("has-error", true);
        }
    });
}

// STEP 2
if (step2) {
    step2.addEventListener("insClick", async function (event) {
        showLoading();
        const steps = await ticketPurchaseStepper.getAllSteps();
        const secondStep = steps[1];
        secondStep.loading = true;

        const isValid = await TicketScript.methods.validateForm(event, step2Container);
        if (!isValid) {
            secondStep.loading = false;
            secondStep.hasError = true;
            secondStep.setAttribute("has-error", true);
            hideLoading();
            return;
        }


        //Save to API
        // Update global data
        updateContactData();
        updateBillingData();
        
        // Get contact data for API call
        const orderContactData = ticketPurchaseData.contact;

        if (isChecked) {
            Object.keys(orderContactData).forEach(key => {
                const billingKey = key.replace(/^contact_/, "billing_"); 
                ticketPurchaseData.billing[billingKey] = orderContactData[key];
            });

            const contactPhoneEl = document.getElementById("contact-phone");
            if (contactPhoneEl) {
                const contactPhoneCountryData = await contactPhoneEl.getCountryData();
                const contactPhoneFullValue = await contactPhoneEl.getValue();
                const contact_country_code = "+" + contactPhoneCountryData.dialCode;
                const contact_phone_number = contactPhoneFullValue.replace(contact_country_code, "");

                ticketPurchaseData.billing.mobile_phone_country_code = contact_country_code.replace("+", "");
                ticketPurchaseData.billing.mobile_phone_number = contact_phone_number;
            }
        }

        const contactPhoneEl = document.getElementById("contact-phone");
        const contactPhoneCountryData = await contactPhoneEl.getCountryData();
        const contactPhoneFullValue = await contactPhoneEl.getValue();
        const contact_country_code = "+" + contactPhoneCountryData.dialCode;
        const contact_phone_number = contactPhoneFullValue.replace(contact_country_code, "");

        const sourceData = isChecked ? orderContactData : ticketPurchaseData.billing;
        ticketPurchaseData.billing.company_name = getFieldValue(sourceData, isChecked ? (getFieldValue(sourceData, "user_uuid") ? "temp_company_name" : "company_name") : "billing_company_name") || ticketPurchaseData.billing.billing_company_name || "";


        const billing_payload = {
            temp_billing_address_id: getFieldValue(sourceData, "billing_address_id") || "",
            prefix: getFieldValue(sourceData, "prefix") || "",
            first_name: getFieldValue(sourceData, isChecked ? "contact_first_name" : "billing_first_name") || getFieldValue(billingData, "billing_first_name"),
            last_name: getFieldValue(sourceData, isChecked ? "contact_last_name" : "billing_last_name") || getFieldValue(billingData, "billing_last_name"),
            email: getFieldValue(sourceData, isChecked ? "contact_email" : "billing_email") || getFieldValue(billingData, "billing_email"),
            company_name: getFieldValue(sourceData, isChecked ? (getFieldValue(sourceData, "user_uuid") ? "temp_company_name" : "company_name") : "billing_company_name") || billingData.billing_company_name || "",                
            mobile_phone_country_code: (contact_country_code || "").replace("+", ""),
            mobile_phone_number: contact_phone_number || "",
            uuid: getFieldValue(sourceData, "user_uuid") || ""
        };

        const data = await saveContact(billing_payload);

        if (data.uuid) {
            secondStep.hasError = false;
            ticketPurchaseStepper.next();
            showStep("payment");
            contact_payment_uuid.value = data.uuid
            emailpayment_field.value = data.email
            if(data.guest) {
                loadCards(true);
                window.isGuestStep2 = true;
            }else {
                loadCards(false);
            }
        
            
        } else {
            console.error("An error occurred, Please try again.");
        }
        hideLoading();
    });
}

    // STEP 3
if (step3) {
    step3.addEventListener("insClick", async function (event) {
        showLoading();
        step3.loading = true;
        const steps = await ticketPurchaseStepper.getAllSteps();
        const thirdStep = steps[2];

        const isValid = await TicketScript.methods.validateForm(event, step3Container);
        if (!isValid) {
            thirdStep.loading = false;
            thirdStep.hasError = true;
            thirdStep.setAttribute("has-error", true);
            hideLoading();
            return;
        }

        //Save to API
        let totals = window.orderTotals || {};

        const subtotal = totals.subtotalWithDiscount || 0;
        const subtotalWithoutDiscount = totals.subtotalWithoutDiscount || subtotal;
        const tax = totals.tax || 0;
        const total = totals.total || subtotal;
        const discount = totals.discount || (subtotalWithoutDiscount - subtotal);
        const stripe_credit_card = stripeField.value

        // Update payment data and use global ticketPurchaseData
        updatePaymentData();
        
        console.log(ticketPurchaseData)

        const orderPayload = {
            order_number: crypto.randomUUID(),
            billing_address_1: getFieldValue(ticketPurchaseData.billing, "billing_address_1"),
            billing_city: getFieldValue(ticketPurchaseData.billing, "billing_suburb"),
            billing_postcode: getFieldValue(ticketPurchaseData.billing, "billing_postcode"),

            "billing_company.uuid": getFieldValue(ticketPurchaseData.billing, "company_uuid") || "",
            billing_company_name: getFieldValue(ticketPurchaseData.billing, "company_name") || "",
            billing_company_email: getFieldValue(ticketPurchaseData.billing, "company_email") || "",

            "billing_contact.uuid":  getFieldValue(ticketPurchaseData.billing, "user_uuid") || "",
            billing_contact_first_name: getFieldValue(ticketPurchaseData.billing, "billing_first_name") || "",
            billing_contact_last_name: getFieldValue(ticketPurchaseData.billing, "billing_last_name") || "",
            billing_contact_email: getFieldValue(ticketPurchaseData.billing, "billing_email") || "",
            billing_contact_phone_country_code: getFieldValue(ticketPurchaseData.billing, "mobile_phone_country_code") || "",
            billing_contact_phone_number:  getFieldValue(ticketPurchaseData.billing, "mobile_phone_number") || "",
            order_reference: crypto.randomUUID(),
            order_status: "placed",
            order_payment_status: "unpaid",

            "order_company.uuid": getFieldValue(ticketPurchaseData.billing, "company_uuid") || "",
            order_company_name: getFieldValue(ticketPurchaseData.billing, "company_name") || "",
            order_company_email: getFieldValue(ticketPurchaseData.billing, "company_email") || "",

            "order_contact.uuid": getFieldValue(ticketPurchaseData.billing, "user_uuid") || "",
            order_contact_first_name: getFieldValue(ticketPurchaseData.billing, "billing_first_name") || "",
            order_contact_last_name: getFieldValue(ticketPurchaseData.billing, "billing_last_name") || "",
            order_contact_email: getFieldValue(ticketPurchaseData.billing, "billing_email") || "",
            order_contact_phone_country_code: getFieldValue(ticketPurchaseData.billing, "mobile_phone_country_code") || "",
            order_contact_phone_number: getFieldValue(ticketPurchaseData.billing, "mobile_phone_number") || "",

            date_time: new Date().toISOString(),
            currency: "AUD",

            // Dynamic amounts
            subtotal_amount: subtotal,
            total_tax_amount: tax,
            total_discount_amount: discount > 0 ? discount : 0,
            total_amount: total,
            total_amount_paid: total,

            mobile_phone_number: getFieldValue(ticketPurchaseData.billing, "mobile_phone_number") || "",
            mobile_phone_country_code: getFieldValue(ticketPurchaseData.billing, "mobile_phone_country_code") || "",
            stripe_credit_card: stripe_credit_card || ""
        };

        const orderResponse = await saveOrder(orderPayload);
        if (!orderResponse.data.has_error) {
            // Store order data
            ticketPurchaseData.order = orderResponse.data;
            
            setTimeout( async () => {
                thirdStep.hasError = false;
                ticketPurchaseStepper.next();
                
                // Only create tickets if order was successful
                const ticketPayload = transformTicketData(ticketPurchaseData.tickets, orderResponse.data.data.id);
                const ticketResponse = await createTickets(ticketPayload);

                if (!ticketResponse.data.has_error) {
                    // Store created tickets data
                    ticketPurchaseData.createdTickets = ticketResponse.data;
                    scrollToTop();
                    hideLoading();
                    App.events.notyf('success', "Thank you! We’ve received your payment and your order is complete.");
                    setTimeout(() => {
                        showStep("allocation");
                    },300)
                } else {
                    App.events.notyf('error', "Failed to create tickets. Please try again.");
                    thirdStep.hasError = true;
                    thirdStep.setAttribute("has-error", true);
                }
            }, 500);

        } else {
            App.events.notyf('error', "Your payment failed. Please check the details and try again.");  
            step3.loading = false;
            thirdStep.hasError = true;
            thirdStep.setAttribute("has-error", true);
            scrollToTop();
            hideLoading();
        }

    });
}

if (step4) {
    step4.addEventListener("insClick", async function () {
        ticketPurchaseStepperContainer.classList.add("hide");
        ticketPurchaseStepperMessage.classList.remove("hide")
        showLoading();
        hideLoading();
        scrollToTop();
        ticketPurchaseStepper.next();
        showStep("confirmation");
        step1Header.classList.add("hide");
    });
}



/**
 * Ticket Accordion functionality
**/

const items = document.querySelectorAll(".item");

if (items.length > 0) {
  items.forEach((item) => {
  const title = item.querySelector(".title");
  const content = item.querySelector(".content");

  title.addEventListener("click", () => {
    const isOpen = item.classList.contains("open");

    if (isOpen) {
      // Closing
      const contentHeight = content.scrollHeight;

      content.style.height = contentHeight + "px"; // set current height to trigger transition
      content.offsetHeight; // force reflow
      content.style.height = "0";

      item.classList.remove("open");
    } else {
      // Opening
      content.style.display = "block"; // make sure visible to measure
      const contentHeight = content.scrollHeight;

      content.style.height = "0"; // reset before expanding
      content.offsetHeight; // force reflow
      content.style.height = contentHeight + "px";

      item.classList.add("open");
    }
  });

  // INITIAL STATE: fix default open to avoid cut off
  if (item.classList.contains("open")) {
    content.style.display = "block";
    content.style.height = "auto";  // <-- use auto height for open by default
  } else {
    content.style.height = "0";
    content.style.display = "none";
  }

  content.addEventListener("transitionend", () => {
    if (item.classList.contains("open")) {
      content.style.height = "auto";  // allow content to resize naturally after expand
    } else {
      content.style.display = "none"; // hide after collapse
    }
  });
  });
}



/**
 * Order summary and computation functionality
**/
const venueCapacityState = {}; // Stores venue-level capacities

/** Initialize venue states from DOM **/
const containers = document.querySelectorAll('.ticket-category-container');

if (containers.length > 0) {
  containers.forEach(container => {
  const venueState = {
    uuid: container.dataset.venueUuid,
    total_capacity: parseInt(container.dataset.totalCapacity),
    individual_remaining: parseInt(container.dataset.individualRemaining),
    group_remaining: parseInt(container.dataset.groupRemaining),
    capacity_per_group: parseInt(container.dataset.capacityPerGroup)
  };

  venueCapacityState[venueState.uuid] = venueState;
  });
}

/** Initialize steppers **/
const steppers = document.querySelectorAll('.number-input');
let ticketCounter = 0; // Unique ticket ID

if (steppers.length > 0) {
  steppers.forEach(stepper => {
  const input = stepper.querySelector('.input-stepper');
  const decrementBtn = stepper.querySelector('.decrement');
  const incrementBtn = stepper.querySelector('.increment');

  incrementBtn.addEventListener('click', () => {
    let value = parseInt(input.value) || 0;
    const max = parseInt(input.max);
    if (value < max) {
      input.value = value + 1;
      input.dispatchEvent(new Event('input'));
    }
  });

  // Handle decrement
  decrementBtn.addEventListener('click', () => {
    let value = parseInt(input.value) || 0;
    const min = parseInt(input.min);
    if (value > min) {
      input.value = value - 1;
      input.dispatchEvent(new Event('input'));
    }
  });

  let previousCount = 0;

  input.addEventListener('input', event => {
    const currentCount = input.value;
    let data = input.getAttribute('data');

    try {
      data = JSON.parse(data);
    } catch (error) {
      console.error('Invalid JSON in data attribute:', data);
      return;
    }

    const venueState = venueCapacityState[data.event_venue_area_uuid];
    if (!venueState) return;

    // Calculate ticket difference
    let ticketChange = 0;
    if (data.capacity_type === "group") {
      const groupSize = data.capacity_per_group || 1;
      ticketChange = (currentCount - previousCount) * groupSize;
    } else {
      ticketChange = currentCount - previousCount;
    }

    // Check tier capacity
    let remaining = data.capacity_type === "group"
      ? venueState.group_remaining
      : venueState.individual_remaining;

    if (ticketChange > remaining) {
      stepper.querySelectorAll('input')[0].value = previousCount; // revert

      setTimeout(async() => {
      let confirm = await App.events.swal(
          'warning',
          'Ticket Limit Reached',
          'You’ve selected the maximum number of tickets available for this tier. Please reduce your quantity or choose a different tier.',
          'Got it',
          false,
          'icon-check-2',
          '');
      if (confirm) {
        //do nothing
      }
      },100)

      return;
    }

    // Update ticketsData
    const uniqueKey = `${toKebabCase(data.ticket_venue_name)}-${toKebabCase(data.name)}-${toKebabCase(data.capacity_type)}`;

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

    // Update venue remaining
    if (data.capacity_type === "group") {
      venueState.group_remaining -= ticketChange;
    } else {
      venueState.individual_remaining -= ticketChange;
    }

    previousCount = currentCount;
    renderPaymentBreakdown(ticketsData); 

    enforceVenueCapacityLimit(data.event_venue_area_uuid);
  });
  });
}

/**
 * Disable/enable steppers when venue reaches full capacity
 */
function enforceVenueCapacityLimit(venueUuid) {
  const venue = venueCapacityState[venueUuid];
  if (!venue) return;

  // Calculate selected per type
  const selectedIndividual = countSelected(venueUuid, "individual");
  const selectedGroup = countSelected(venueUuid, "group");

  // Compute maxes independently
  const maxIndividual = venue.individual_remaining + selectedIndividual;
  const maxGroup = venue.group_remaining + selectedGroup;



  steppers.forEach(stepper => {
    const input = stepper.querySelector('.input-stepper');
    const decrementBtn = stepper.querySelector('.decrement');
    const incrementBtn = stepper.querySelector('.increment');

    const stepperData = JSON.parse(input.getAttribute('data'));
    if (stepperData.event_venue_area_uuid === venueUuid) {
      const type = stepperData.capacity_type;
      const uniqueKey = `${toKebabCase(stepperData.ticket_venue_name)}-${toKebabCase(stepperData.name)}-${toKebabCase(stepperData.capacity_type)}`;
      const hasSelectedTickets = ticketsData.some(ticket => ticket.uniqueKey === uniqueKey);

      let isTypeFull = false;

      if (type === "group") {
        isTypeFull = selectedGroup >= maxGroup;
      } else {
        isTypeFull = selectedIndividual >= maxIndividual;
      }

      if (isTypeFull && !hasSelectedTickets) {
        input.setAttribute("disabled", true);
        decrementBtn.setAttribute("disabled", true)
        incrementBtn.setAttribute("disabled", true)
      } else {
        input.removeAttribute("disabled");
        decrementBtn.removeAttribute("disabled")
        incrementBtn.removeAttribute("disabled")
      }
    }
  });
}
/**
 * Helper to count selected tickets per type
 */
function countSelected(venueUuid, type) {
  return ticketsData.reduce((sum, ticket) => {
    if (ticket.event_venue_area_uuid === venueUuid && ticket.capacity_type === type) {
      return sum + (type === "group" ? (ticket.capacity_per_group || 1) : 1);
    }
    return sum;
  }, 0);
}
/**
 * Renders payment breakdown based on current ticketsData
 */
function renderPaymentBreakdown(ticketsData) {
  breakdownContainer.innerHTML = '';

  if (!ticketsData.length) {
    breakdownContainer.style.display = 'none';
    subtotalElem.textContent = '$0.00';
    taxElem.textContent = '$0.00';
    processingElem.textContent = '$0.00';
    totalElem.textContent = '$0.00';
    return;
  }

  // --- Group tickets by venue and tier ---
  const venueMap = {};
  ticketsData.forEach(ticket => {
    const venue = ticket.ticket_venue_name || 'No Venue';
    if (!venueMap[venue]) venueMap[venue] = [];
    venueMap[venue].push(ticket);
  });

  // --- Build global ticket count across all venues and tiers ---
  let ticketCount = {};
  ticketsData.forEach(ticket => {
    // Create unique key that includes venue, tier name, and capacity type
    const key = `${ticket.ticket_venue_name || 'No Venue'}-${ticket.name}-${ticket.capacity_type}`;
    if (!ticketCount[key]) {
      ticketCount[key] = { ...ticket, quantity: 0 };
    }
    ticketCount[key].quantity++;
  });

  // --- Render venue breakdown ---
  let orderSummaryEl = '';
  let subtotal = 0;

  for (const [venue, tickets] of Object.entries(venueMap)) {
    orderSummaryEl += `<div class="payment-break-downs"><p class="payment-breakdown-venue-name">${venue}</p><div>`;

    // Count tickets per venue and tier for display
    let venueCount = {};
    tickets.forEach(ticket => {
      // Create unique key that includes tier name and capacity type
      const key = `${ticket.name}-${ticket.capacity_type}`;
      if (!venueCount[key]) {
        venueCount[key] = { ...ticket, quantity: 0 };
      }
      venueCount[key].quantity++;
    });

    for (const [key, info] of Object.entries(venueCount)) {
      const capacityType = info.capacity_type.charAt(0).toUpperCase() + info.capacity_type.slice(1);
      const formattedPrice = parseFloat(info.price).toFixed(2);
      const totalPrice = info.quantity * parseFloat(info.price);
      subtotal += totalPrice;

      orderSummaryEl += `<div class="payment-break-down-tier-container">
        <div class="payment-break-down-tier-name">${capacityType} - ${info.name}</div>
        <div class="payment-break-down-tier-price"><p>${info.quantity} x </p> $${formattedPrice}</div>
      </div>`;
    }

    orderSummaryEl += `</div></div>`;
  }

  // Save base subtotal before discounts
  priceWithoutDiscount = subtotal;

  // --- APPLY MULTIPLE DISCOUNTS ---
  let discountAmount = 0;
  let discountedSubtotal = subtotal;

  appliedDiscounts.forEach(d => {
    if (d.type === "percentage") {
      const discountValue = (discountedSubtotal * d.value) / 100;
      discountAmount += discountValue;
      discountedSubtotal -= discountValue;
    } else {
      const discountValue = d.value;
      discountAmount += discountValue;
      discountedSubtotal -= discountValue;
    }
  });

  discountedSubtotal = Math.max(discountedSubtotal, 0);

  // Update discount summary if there are discounts
  if (appliedDiscounts.length > 0) {
    display_discount_value_summary.innerText = "-$" + pricify(discountAmount);
  } else {
    display_discount_value_summary.innerText = "-$0.00";
  }

  // --- TAX (on discounted subtotal) ---
  let totalTax = 0;
  for (const [key, info] of Object.entries(ticketCount)) {
    const itemSubtotal = info.price * info.quantity;

    // Distribute total discount proportionally
    const itemDiscount = subtotal > 0 ? (discountAmount * itemSubtotal) / subtotal : 0;
    const itemDiscountedSubtotal = Math.max(itemSubtotal - itemDiscount, 0);

    if (info.tax_type === 'percentage') {
      totalTax += (itemDiscountedSubtotal * parseFloat(info.tax)) / 100;
    } else {
      totalTax += parseFloat(info.tax) * info.quantity;
    }
  }

  // --- PROCESSING FEE (1.7% of discounted subtotal) ---
  const processingFee = discountedSubtotal * 0.017;

  // --- TOTAL ---
  const total = discountedSubtotal + totalTax + processingFee;

  // Update breakdown and totals
  breakdownContainer.innerHTML = orderSummaryEl;
  breakdownContainer.style.display = 'flex';
  subtotalElem.textContent = `$${subtotal.toFixed(2)}`;
  taxElem.textContent = `$${totalTax.toFixed(2)}`;
  processingElem.textContent = `$${processingFee.toFixed(2)}`;
  totalElem.textContent = `$${total.toFixed(2)}`;

    const totals = {
    subtotalWithoutDiscount: priceWithoutDiscount, // before discount
    subtotalWithDiscount: discountedSubtotal,      // after discount
    tax: totalTax,
    processing: processingFee,
    total: total,
    discount: discountAmount   
    };

    window.orderTotals = totals;
    ticketPurchaseData.orderTotals = totals; 
}

function calculateSubtotal(ticketsData) {
  return ticketsData.reduce((sum, ticket) => sum + parseFloat(ticket.price), 0);
}

