/**
 * Ticket Payment Page
 * Handles Stripe card loading, order creation, ticket provisioning,
 * and redirects to /ticket-allocate.
 */

// ============================================================================
// STRIPE PATCH
// stripe-element.js (portal module) sets stripe-card to tok_... (the raw
// Stripe token) in setStripeCardField, and makeCardElement seeds the new
// ins-credit-card with token.card.id and auto-clicks it. The order API needs
// the persisted card ID from /payment-methods (the customer-linked source).
// Poll for the StripeElement global rather than relying on load order, so the
// patch is robust even if the script include order changes.
// ============================================================================

function applyStripePatches() {
    // createStripeCardModel: save the card and set stripe-card to the returned
    // stripe_card_id (the customer-linked source) rather than the raw token.
    StripeElement.methods.createStripeCardModel = async function(token) {
        const data = {
            email: document.getElementById('card_email')?.value || "",
            first_name: document.getElementById('card_first_name')?.value || "",
            last_name: document.getElementById('card_last_name')?.value || "",
            creditcard: token.id,
            card_brand: token.card?.brand || ""
        };
        const response = await window.StripeModel.creditcard.createCreditCard(data);
        const cardId = response?.data?.stripe_card_id;
        if (cardId) {
            const field = document.getElementById('stripe-card');
            if (field) field.setAttribute('value', cardId);
        }
        return response;
    };

    // setStripeCardField would overwrite the field with token.id (tok_...).
    StripeElement.methods.setStripeCardField = function() {};

    // makeCardElement seeds value=token.card.id and auto-clicks the new card,
    // which would re-set stripe-card to a card object not linked to the
    // customer. Refresh from /payment-methods instead — DB has the correct
    // payment_method_token (the customer-linked source).
    StripeElement.methods.makeCardElement = function() {
        if (typeof loadCards === 'function') loadCards();
    };
}

// stripe-element.js declares `StripeElement` with `let` at top level, which
// creates a global lexical binding but NOT a window property — so reference
// it by name, not via window.StripeElement (which is always undefined).
(function waitForStripeElement() {
    if (typeof StripeElement !== 'undefined' && window.StripeModel) {
        applyStripePatches();
        return;
    }
    setTimeout(waitForStripeElement, 50);
})();


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

  // Wire up guest "Back" button (multi-page flow: navigate to /ticket-billing)
  document.querySelectorAll(".back-step-3-billing").forEach(btn => {
    btn.addEventListener("insClick", () => {
      const eventParam = new URLSearchParams(window.location.search).get("event");
      window.location.href = `/ticket-billing?event=${eventParam}`;
    });
  });

  // Show payment container
  if (DOM.step3Container) DOM.step3Container.classList.remove("hide");

  loadCards();
  StepHandlers.handleStep3();
});
