/**
 * Ticket Step 1 — Ticket Selection
 * Handles ticket selection, order summary, and redirects to /ticket-billing.
 */

// ============================================================================
// DOM ELEMENTS
// ============================================================================

const DOM = {
  stepper: document.getElementById("ticket-purchase-stepper"),
  stepperContainer: document.getElementById("purchase-ticket-stepper-wrapper"),

  // Step 1 elements
  step1: document.getElementById("submit-purchase"),
  step1Container: document.getElementById("ticket-selection-step"),
  step1Button: document.getElementById("purchase-ticket-button-step-1"),

  // Order summary
  breakdownContainer: document.getElementById('payment-breakdown'),
  subtotalElem: document.getElementById('subtotal-price'),
  taxElem: document.getElementById('tax-price'),
  processingElem: document.getElementById('proccessing-price'),
  totalElem: document.getElementById('total-price'),
  mobileTotalElem: document.getElementById('mobile-total-price'),

  // Event UUID
  eventUuidHidden: document.getElementById("event_uuid_hidden"),

  // Loading overlay
  loadingOverlay: document.getElementById('loadingOverlay'),

  // Ticket UI
  accordionItems: document.querySelectorAll(".item"),
  ticketSteppers: document.querySelectorAll('.number-input'),
  ticketCategoryContainers: document.querySelectorAll('.ticket-category-container')
};


// ============================================================================
// GLOBAL STATE
// ============================================================================

let ticketsData = [];
let ticketCounter = 0;
let selectedTickets = [];
const venueCapacityState = {};

const ticketPurchaseData = {
  tickets: []
};


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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};


// ============================================================================
// PAYMENT BREAKDOWN MANAGER
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
    selectedTickets = [];
    for (const [, info] of Object.entries(ticketCount)) {
      selectedTickets.push(info);
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
  },

  saveTotals(subtotal, tax, processing, total) {
    window.orderTotals = { subtotal, tax, processing, total };
  }
};


// ============================================================================
// ORDER PROCESSOR — Step 1 only needs ticket availability check
// ============================================================================

const OrderProcessor = {
  async checkAvailableTickets(ticketData) {
    const urlParams = new URLSearchParams(window.location.search);
    const eventParam = urlParams.get("event");
    const trimmed = ticketData.map(ticket => ({
      'event_pricing_tier.uuid': ticket['event_pricing_tier.uuid'],
      event_pricing_division_uuid: ticket.event_pricing_division_uuid,
      capacity_type: ticket.capacity_type
    }));
    const queryString = encodeURIComponent(JSON.stringify(trimmed));
    try {
      const response = await ticketServices.checkTicketAvailability(eventParam, queryString);
      return response;
    } catch (error) {
      console.error("Ticket availability error:", error);
      return false;
    }
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
      return sum + (ticket.capacity_type === type ? 1 : 0);
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
      const isTypeFull = type === "group"
        ? selectedGroupSets >= maxGroupSets
        : selectedIndividual >= maxIndividual;

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
        try { data = JSON.parse(input.getAttribute('data')); }
        catch (e) { console.error('Invalid JSON data on stepper:', e); return; }

        if (data && data.capacity_type === "group") {
          const venue = venueCapacityState[data.event_pricing_division_uuid];
          if (!venue) return;
          const previous = parseInt(input.dataset.previousCount) || 0;
          const selectedSets = this.countSelected(venue.uuid, "group");
          const allowedMax = venue.number_of_group - (selectedSets - previous);
          const newValue = Math.min(value + 1, max, allowedMax);
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
        try { data = JSON.parse(input.getAttribute('data')); }
        catch (error) { console.error('Invalid JSON in data attribute:', error); input.value = previousCount; return; }

        const venueState = venueCapacityState[data.event_pricing_division_uuid];
        if (!venueState) { input.value = previousCount; return; }

        let ticketChange = currentCount - previousCount;

        if (data.capacity_type === "group") {
          const maxSets = venueState.number_of_group;
          const selectedSets = this.countSelected(data.event_pricing_division_uuid, "group");
          const otherSets = selectedSets - previousCount;
          const allowedMax = maxSets - otherSets;
          if (currentCount > allowedMax) {
            input.value = previousCount;
            App.events.notyf('error', 'Not enough group sets left for this venue.');
            return;
          }
        } else {
          if (ticketChange > venueState.individual_remaining) {
            input.value = previousCount;
            App.events.notyf('error', 'Not enough individual tickets remaining for this tier.');
            return;
          }
        }

        const uniqueKey = `${Utils.toKebabCase(data.ticket_venue_name)}-${Utils.toKebabCase(data.name)}-${Utils.toKebabCase(data.capacity_type)}`;
        if (ticketChange > 0) {
          for (let i = 0; i < ticketChange; i++) {
            ticketsData.push({ ...data, ticketId: ++ticketCounter, uniqueKey });
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
// STEP 1 HANDLER
// ============================================================================

const StepHandlers = {
  async handleStep1() {
    if (!DOM.step1) return;

    DOM.step1.addEventListener("insClick", async () => {
      Utils.showLoading(1);
      const steps = await DOM.stepper.getAllSteps();
      const firstStep = steps[0];

      if (!ticketsData || ticketsData.length === 0) {
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
          if (confirm) window.location.reload();
        } else {
          setTimeout(() => {
            Utils.hideLoading();
            firstStep.hasError = false;

            // Save selection to sessionStorage and proceed to billing
            const urlParams = new URLSearchParams(window.location.search);
            const eventParam = urlParams.get("event");

              window.location.href = `/ticket-billing?event=${eventParam}`;
          }, 500);
        }
      }, 1000);
    });
  }
};


// ============================================================================
// SELECTION RESTORER — repopulate steppers from a saved session selection
// (e.g. when the user clicks Back from /ticket-billing)
// ============================================================================

const SelectionRestorer = {
  restore() {
    const el = document.getElementById("saved-ticket-selection");
    if (!el || DOM.ticketSteppers.length === 0) return;

    let saved;
    try {
      saved = JSON.parse(el.getAttribute("data-saved-selection") || "[]");
    } catch (e) {
      console.error("Invalid saved ticket selection:", e);
      return;
    }
    if (!Array.isArray(saved) || saved.length === 0) return;

    // Count saved tickets per tier + division + capacity_type.
    const counts = {};
    saved.forEach(ticket => {
      const key = `${ticket["event_pricing_tier.uuid"]}|${ticket.event_pricing_division_uuid}|${ticket.capacity_type}`;
      counts[key] = (counts[key] || 0) + 1;
    });

    // Apply counts to matching steppers; dispatching 'input' rebuilds
    // ticketsData and re-renders the order summary via the existing listener.
    DOM.ticketSteppers.forEach(stepper => {
      const input = stepper.querySelector(".input-stepper");
      if (!input) return;
      let data;
      try {
        data = JSON.parse(input.getAttribute("data"));
      } catch (e) {
        return;
      }
      const key = `${data["event_pricing_tier.uuid"]}|${data.event_pricing_division_uuid}|${data.capacity_type}`;
      const count = counts[key];
      if (count > 0) {
        input.value = String(count);
        input.dispatchEvent(new Event("input"));
      }
    });
  }
};


// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

window.renderPaymentBreakdown = (data) => PaymentBreakdownManager.render(data);
window.calculateSubtotal = (data) => PaymentBreakdownManager.calculateSubtotal
  ? PaymentBreakdownManager.calculateSubtotal(data)
  : 0;


// ============================================================================
// INITIALIZATION
// ============================================================================

window.addEventListener("load", () => {
  // Show ticket selection step and initialise stepper at step 1
  if (DOM.step1Container) DOM.step1Container.classList.remove("hide");
  if (DOM.step1Button) DOM.step1Button.classList.remove("hide");

  if (DOM.stepper && typeof DOM.stepper.setStep === "function") {
    setTimeout(() => DOM.stepper.setStep(1), 300);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  TicketManager.initializeVenueStates();
  TicketManager.setupSteppers();
  AccordionManager.setup();
  StepHandlers.handleStep1();
  SelectionRestorer.restore();
});
