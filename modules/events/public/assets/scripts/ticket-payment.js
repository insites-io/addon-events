/**
 * Ticket Payment Page
 * Handles Stripe card loading, order creation, ticket provisioning,
 * and redirects to /ticket-allocate.
 */

// ============================================================================
// STRIPE PATCH — guest checkout
// stripe-element.js (portal module) sets stripe-card to tok_... (the raw
// Stripe token) in both createStripeCardModel and setStripeCardField.
// The order API expects the stored card ID (card_...) from the
// create-credit-card response. Patch both methods after stripe-ready fires.
// ============================================================================

document.addEventListener("stripe-ready", () => {
    if (!window.StripeElement || !window.StripeModel) return;

    // Override createStripeCardModel: call the API and set stripe-card to
    // the returned card ID (response.data.stripe_id) not the raw token.
    StripeElement.methods.createStripeCardModel = async function(token) {
        const data = {
            email: document.getElementById('card_email')?.value || "",
            first_name: document.getElementById('card_first_name')?.value || "",
            last_name: document.getElementById('card_last_name')?.value || "",
            creditcard: token.id,
            card_brand: token.card?.brand || ""
        };
        const response = await window.StripeModel.creditcard.createCreditCard(data);
        if (response.state) {
            const cardId = response.data?.stripe_id;
            const field = document.getElementById('stripe-card');
            if (field && cardId) field.setAttribute('value', cardId);
        }
        return response;
    };

    // setStripeCardField is called immediately after createStripeCardModel
    // in tokenizedStripeCC and would overwrite card_... back to tok_...
    // Neutralise it — the value is already correctly set above.
    StripeElement.methods.setStripeCardField = function() {};
});


// isGuest: stripe-modal is only rendered for logged-in members (server-side
// has_profile = true), so its presence is the authoritative signal.
const isGuest = !document.getElementById('stripe-modal');

const ticketPurchaseData = {
  order: {},
  createdTickets: []
};


// ============================================================================
// DOM ELEMENTS
// ============================================================================

const cardList = document.getElementById("card-options-list");
const noCardBox = document.getElementById("no-card");
const addCardBtnHolder = document.getElementById("add-credit-card-button-holder");
const stripeModal = document.getElementById("stripe-modal");
const paymentNavigationButtons = document.querySelectorAll("#payment-navigation-buttons ins-button");
const cardLayouts = cardList?.getAttribute('data-card-grid') || "large-6 medium-12 small-12";

const DOM = {
  stepper: document.getElementById("ticket-purchase-stepper"),

  // Payment form
  step3: document.getElementById("checkout-ticket-submit-btn"),
  step3Container: document.getElementById("ticket-payment-step"),

  // Payment fields
  stripeField: document.getElementById('stripe-card'),
  contactPaymentUuid: document.getElementById("contact_uuid"),

  // Event UUID
  eventUuidHidden: document.getElementById("event_uuid_hidden"),

  // Loading overlay
  loadingOverlay: document.getElementById('loadingOverlay')
};


// ============================================================================
// CARD MANAGEMENT
// ============================================================================

// Handle Add Card button clicks.
// ins-button fires 'insClick' (not native click). Mirror checkout.js: attach
// insClick directly on each button and use modal.open() — not setAttribute.
function handleAddCardClick() {
    // Use stripeModal existence (server-rendered only for logged-in members) as the
    // authoritative check. In the new multi-page flow, contact_uuid is populated for
    // guests too (session is set after billing), so contact_Uuid?.value is truthy for
    // guests — using it crashes with TypeError when stripeModal is null.
    if (stripeModal) {
        stripeModal.open(); // modal for logged-in users
    } else {
        const guestForm = document.getElementById("guest-add-card-form");
        if (guestForm) guestForm.classList.remove("hide"); // show guest form
        if (noCardBox) noCardBox.classList.add("hide"); // hide no-card for guest
        if (DOM.step3) DOM.step3.classList.remove("hide"); // show 'Pay now' button
    }
}

async function loadCards() {
    cardList.innerHTML = "";

    try {
        const url = `/payment-methods`;
        const response = await apiServices.processRequest("get", url);
        const cards = response.data || [];

        if (cards.length) {
            renderCards(cards);

            if (isGuest) {
                addCardBtnHolder?.classList.add("hide");
            } else {
                addCardBtnHolder?.classList.remove("hide");
            }
            noCardBox?.classList.add("hide");

            if (paymentNavigationButtons) {
                paymentNavigationButtons.forEach(btn => {
                    btn.classList.remove('hide');
                });
            }
        } else {
            noCardBox?.classList.remove("hide");
            if (DOM.step3) DOM.step3.classList.add("hide"); // hide 'Pay now' button

            if (isGuest) {
                const guestForm = document.getElementById("guest-add-card-form");
                if (guestForm) guestForm.classList.remove("hide");
                addCardBtnHolder?.classList.add("hide");
                noCardBox?.classList.add("hide");
            }
        }
    } catch (err) {
        console.error("Error fetching cards:", err);
        noCardBox?.classList.remove("hide");
        if (DOM.step3) DOM.step3.classList.add("hide"); // hide 'Pay now' button
    }
}

function renderCards(cards) {
    cards.forEach((card, idx) => {
        const divEl = document.createElement("div");
        divEl.className = `${cardLayouts} cell card-options`;
        const insCardEl = document.createElement("ins-credit-card");
        insCardEl.setAttribute("full-year", "");
        insCardEl.setAttribute("brand", card.card_brand);
        insCardEl.setAttribute("last-four", card.card_last_four_digits);
        insCardEl.setAttribute("expiry-month", card.card_expiry_month);
        insCardEl.setAttribute("expiry-year", card.card_expiry_year);
        insCardEl.setAttribute("compact", "");
        insCardEl.setAttribute("data-id", card.id);
        insCardEl.value = card.payment_method_token;
        insCardEl.addEventListener('insClick', () => {
            StripeElement.events.selectCard(insCardEl);
        });
        insCardEl.addEventListener('insClose', () => {
            StripeElement.events.removeCard(insCardEl);
        });

        if (idx === 0 && DOM.stripeField) {
            insCardEl.setAttribute("active", "");
            DOM.stripeField.value = card.payment_method_token;
        }

        divEl.appendChild(insCardEl);
        cardList.appendChild(divEl);

        if (DOM.step3) DOM.step3.classList.remove("hide"); // show 'Pay now' button
    });
}


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

  async retryPayment(orderPayload) {
    try {
      const response = await orderServices.updateOrder(orderPayload);
      if (response.data) return response;
    } catch (error) {
      console.error("Update order error:", error);
    }
    return false;
  },

  async createTickets() {
    const urlParams = new URLSearchParams(window.location.search);
    const eventParam = urlParams.get("event");
    try {
      const response = await ticketServices.createTickets(eventParam);
      if (response.data) return response;
    } catch (error) {
      console.error("Ticket creation error:", error);
    }
    return false;
  },

  async buildOrderPayload() {
    return {
      event_uuid: DOM.eventUuidHidden?.value,
      stripe_credit_card: DOM.stripeField?.value || ""
    };
  }
};


// ============================================================================
// STEP HANDLER
// ============================================================================

const StepHandlers = {
  async handleStep3() {
    if (!DOM.step3) return;

    const isRetryMode = !!document.getElementById('ticket_retry_mode');
    let isPaymentRetryMode = !!document.getElementById('payment_retry_mode');

    DOM.step3.addEventListener("insClick", async function (event) {
      Utils.showLoading();
      DOM.step3.loading = true;
      const steps = await DOM.stepper.getAllSteps();
      const thirdStep = steps[2];

      // Ticket retry mode: payment already processed, just re-run ticket creation.
      if (isRetryMode) {
        thirdStep.hasError = false;
        DOM.stepper.next();
        const ticketResponse = await OrderProcessor.createTickets();
        const orderId = document.getElementById('pending_order_id')?.value;
        if (!ticketResponse || ticketResponse.data?.has_error) {
          DOM.step3.loading = false;
          thirdStep.hasError = true;
          thirdStep.setAttribute("has-error", true);
          Utils.scrollToTop();
          Utils.hideLoading();
          App.events.notyf('error', "Failed to create tickets. Please try again or contact support.");
        } else {
          ticketPurchaseData.createdTickets = ticketResponse.data;
          Utils.scrollToTop();
          Utils.hideLoading();
          App.events.notyf('success', "Thank you! We've received your payment and your order is complete.");
          setTimeout(() => {
            const urlParams = new URLSearchParams(window.location.search);
            const eventParam = urlParams.get("event");
            window.location.href = `/ticket-allocate?event=${eventParam}&order_id=${orderId}`;
          }, 300);
        }
        return;
      }

      // Payment retry mode: order exists but payment failed, retry with current card.
      if (isPaymentRetryMode) {
        const orderPayload = await OrderProcessor.buildOrderPayload();
        const orderResponse = await OrderProcessor.retryPayment(orderPayload);
        if (!orderResponse || orderResponse.data?.has_error) {
          DOM.step3.loading = false;
          thirdStep.hasError = true;
          thirdStep.setAttribute("has-error", true);
          Utils.scrollToTop();
          Utils.hideLoading();
          const retryStripeMsg = orderResponse?.data?.message?.stripe?.error?.message;
          App.events.swal("error", "Payment Failed", retryStripeMsg || "Your payment failed. Please check the details and try again.", "OK", false);
          return;
        }
        ticketPurchaseData.order = orderResponse.data;
        thirdStep.hasError = false;
        DOM.stepper.next();
        const ticketResponse = await OrderProcessor.createTickets();
        if (!ticketResponse || ticketResponse.data?.has_error) {
          DOM.step3.loading = false;
          thirdStep.hasError = true;
          thirdStep.setAttribute("has-error", true);
          Utils.scrollToTop();
          Utils.hideLoading();
          App.events.notyf('error', "Failed to create tickets. Please try again.");
        } else {
          ticketPurchaseData.createdTickets = ticketResponse.data;
          Utils.scrollToTop();
          Utils.hideLoading();
          App.events.notyf('success', "Thank you! We've received your payment and your order is complete.");
          setTimeout(() => {
            const urlParams = new URLSearchParams(window.location.search);
            const eventParam = urlParams.get("event");
            window.location.href = `/ticket-allocate?event=${eventParam}&order_id=${orderResponse.data.data.id}`;
          }, 300);
        }
        return;
      }

      const isValid = await TicketScript.methods.validateForm(event, DOM.step3Container);
      if (!isValid) {
        thirdStep.loading = false;
        thirdStep.hasError = true;
        thirdStep.setAttribute("has-error", true);
        Utils.hideLoading();
        return;
      }

      const orderPayload = await OrderProcessor.buildOrderPayload();
      const orderResponse = await OrderProcessor.saveOrder(orderPayload);

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

        thirdStep.hasError = false;
        DOM.stepper.next();

        const ticketResponse = await OrderProcessor.createTickets();

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
          DOM.step3.loading = false;
          thirdStep.hasError = true;
          thirdStep.setAttribute("has-error", true);
          Utils.scrollToTop();
          Utils.hideLoading();
          App.events.notyf('error', "Failed to create tickets. Please try again.");
        }
      } else {
        if (orderResponse.data.has_payment_error) {
          isPaymentRetryMode = true;
        }
        const stripeMsg = orderResponse.data?.message?.stripe?.error?.message;
        App.events.swal("error", "Payment Failed", stripeMsg || "Your payment failed. Please check the details and try again.", "OK", false);
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
  // Wire up add-card buttons
  document.querySelectorAll(".add-card-btn").forEach(btn => {
    btn.addEventListener("insClick", handleAddCardClick);
  });

  // Show payment container
  if (DOM.step3Container) DOM.step3Container.classList.remove("hide");

  loadCards();
  StepHandlers.handleStep3();
});
