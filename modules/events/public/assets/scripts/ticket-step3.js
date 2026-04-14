/**
 * Ticket Step 3 — Payment
 * Restores state from sessionStorage, handles credit card selection,
 * creates order + tickets, redirects to /ticket-allocate.
 */

// ============================================================================
// RESTORE STATE FROM SESSION STORAGE
// ============================================================================

const _saved = JSON.parse(sessionStorage.getItem('purchaseTicketData') || '{}');
let ticketsData = _saved.ticketsData || [];
let selectedTickets = _saved.selectedTickets || [];
let userPayload = _saved.userPayload || {};
let billingPayload = _saved.billingPayload || {};
// Determine isGuest from server-rendered DOM — stripe-modal is only rendered
// for logged-in members (server-side has_profile = true), so its presence is
// the authoritative signal. This is more reliable than sessionStorage, which
// may be missing (direct navigation) or contain a wrong value from the API.
const isGuest = !document.getElementById('stripe-modal');

const ticketPurchaseData = {
  tickets: ticketsData,
  order: {},
  createdTickets: []
};

if (_saved.orderTotals) window.orderTotals = _saved.orderTotals;


// ============================================================================
// DOM ELEMENTS
// ============================================================================

const DOM = {
  stepper: document.getElementById("ticket-purchase-stepper"),

  // Payment form
  step3: document.getElementById("checkout-ticket-submit-btn"),
  step3Container: document.getElementById("ticket-payment-step"),

  // Order summary
  breakdownContainer: document.getElementById('payment-breakdown'),
  subtotalElem: document.getElementById('subtotal-price'),
  taxElem: document.getElementById('tax-price'),
  processingElem: document.getElementById('proccessing-price'),
  totalElem: document.getElementById('total-price'),
  mobileTotalElem: document.getElementById('mobile-total-price'),

  // Payment fields
  stripeField: document.getElementById('stripe-card'),
  contactPaymentUuid: document.getElementById("contact_uuid"),


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
  }
};


// ============================================================================
// PAYMENT BREAKDOWN MANAGER — renders order summary from sessionStorage data
// ============================================================================

const PaymentBreakdownManager = {
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
  },

  renderEmpty() {
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
      if (!ticketCount[key]) ticketCount[key] = { ...ticket, quantity: 0 };
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
        if (!venueCount[key]) venueCount[key] = { ...ticket, quantity: 0 };
        venueCount[key].quantity++;
      });
      for (const [, info] of Object.entries(venueCount)) {
        const capacityType = info.capacity_type.charAt(0).toUpperCase() + info.capacity_type.slice(1);
        const formattedPrice = parseFloat(info.price).toFixed(2);
        const totalPrice = info.quantity * parseFloat(info.price);
        subtotal += totalPrice;
        orderSummaryHTML += `
          <div class="payment-break-down-tier-container">
            <div class="payment-break-down-tier-name">${capacityType} - ${info.name}</div>
            <div class="payment-break-down-tier-price"><p>${info.quantity} x </p> $${formattedPrice}</div>
          </div>`;
      }
      orderSummaryHTML += `</div></div>`;
    }
    return { orderSummaryHTML, subtotal };
  },

  calculateTotals(subtotal, ticketCount) {
    let totalTax = 0;
    for (const [, info] of Object.entries(ticketCount)) {
      const itemSubtotal = info.price * info.quantity;
      const taxValue = parseFloat(info.tax) || 0;
      if (info.tax_type === 'percentage') {
        totalTax += (itemSubtotal * taxValue) / 100;
      } else {
        totalTax += taxValue * (info.quantity || 1);
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
  }
};


// ============================================================================
// ORDER PROCESSOR — order creation and ticket provisioning
// ============================================================================

const OrderProcessor = {
  async saveOrder(orderPayload) {
    try {
      const response = await orderServices.addOrder(orderPayload);
      if (response.data) return response;
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
        baseTicket.group_id = `GROUP-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
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
      if (response.data) return response;
    } catch (error) {
      console.error("Ticket creation error:", error);
    }
    return false;
  },

  async buildOrderPayload(selectedTickets) {
    const eventUuid = DOM.eventUuidHidden?.value;
    const stripeCreditCard = DOM.stripeField?.value || "";
    return {
      event_uuid: eventUuid,
      order_company_name: userPayload.company_name,
      order_company_uuid: userPayload.company_uuid,
      order_contact_first_name: userPayload.first_name,
      order_contact_last_name: userPayload.last_name,
      order_contact_email: userPayload.email,
      order_contact_phone_country_code: userPayload.mobile_phone_country_code,
      order_contact_phone_number: userPayload.mobile_phone_number,
      stripe_credit_card: stripeCreditCard,
      selectedTickets: selectedTickets
    };
  }
};


// ============================================================================
// STEP 3 HANDLER
// ============================================================================

const StepHandlers = {
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

      const orderPayload = await OrderProcessor.buildOrderPayload(selectedTickets);
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
        if (confirm) window.location.reload();
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
              window.location.href = `/ticket-allocate?event=${eventParam}&order_id=${orderResponse.data.data.id}`;
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
  }
};


// ============================================================================
// INITIALIZATION
// ============================================================================

window.addEventListener("load", () => {
  if (DOM.stepper && typeof DOM.stepper.setStep === "function") {
    setTimeout(() => DOM.stepper.setStep(3), 300);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  // Show payment container
  if (DOM.step3Container) DOM.step3Container.classList.remove("hide");

  // Restore order summary from sessionStorage
  if (ticketsData.length > 0) {
    PaymentBreakdownManager.render(ticketsData);
  }

  // Load saved credit cards (function defined in ticket-payment.js)
  if (typeof loadCards === "function") {
    loadCards(isGuest);
  }

  StepHandlers.handleStep3();
});
