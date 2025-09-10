// Payment Elements
const contact_Uuid = document.getElementById("contact_uuid");
const cardList = document.getElementById("card-options-list");
const noCardBox = document.getElementById("no-card");
const addCardBtnHolder = document.getElementById("add-credit-card-button-holder");
const checkoutBtn = document.getElementById("checkout-ticket-submit-btn");
const stripeModal = document.getElementById("stripe-modal");
const paymentNavigationButton = document.getElementById("payment-navigation-button")

let isGuestUser = false

// Layout for ins-credit-card
const cardLayouts = "large-4 medium-12 small-12";
// When add-card is clicked:
document.addEventListener("click", (e) => {
    if (e.target.closest(".add-card-btn")) {
        if (!isGuestUser) {
            stripeModal.setAttribute("open", "");
        } else {
            guestAddCardForm.classList.remove('hide');
            noCardBox?.classList.add('hide');
        }

        // Mount the Stripe Element into the correct container
    }
});

// Handle Add Card button clicks
document.addEventListener("click", (e) => {
    if (e.target.closest(".add-card-btn")) {
        if (contact_Uuid?.value) {
            stripeModal.setAttribute("open", ""); // modal for logged-in users
        } else {
            const guestForm = document.getElementById("guest-add-card-form");
            if (guestForm) guestForm.classList.remove("hide"); // show guest form
            if (noCardBox) noCardBox.classList.add("hide"); // hide no-card for guest
        }
    }
});

/**
 * Load saved cards
 * @param {boolean} isGuest - true if this is a guest checkout
 * @param {string} guestUuid - optional UUID for guest to fetch saved cards
 */
async function loadCards(isGuest = false, guestUuid = null) {
    if(isGuest) {
        isGuestUser = true
        paymentNavigationButton.classList.add('hide')
    }

    // Mount the Stripe Element into the correct container
    StripeElement.init.stripeElements(isGuestUser);

    cardList.innerHTML = "";

    const hiddenField = document.getElementById("stripe-card");
    const uuidToUse = guestUuid || contact_Uuid?.value;

    try {
        // Always call the API to check if there are cards
        const url = `/payment-methods?contact_uuid=${contact_Uuid.value}&size=50`;
        const response = await apiServices.processRequest("get", url);
        const cards = response.data || [];

        if (cards.length) {
            renderCards(cards);
            checkoutBtn?.classList.remove("hide");

            // Guests can only have 1 card
            if (isGuest) {
                addCardBtnHolder?.classList.add("hide");
                paymentNavigationButton.classList.remove('hide')
            } else {
                addCardBtnHolder?.classList.remove("hide");
            }
            noCardBox?.classList.add("hide");
        } else {
            // No cards found
            noCardBox?.classList.remove("hide");

            // If guest, show inline form
            if (isGuest) {
                const guestForm = document.getElementById("guest-add-card-form");
                if (guestForm) guestForm.classList.remove("hide");
                addCardBtnHolder?.classList.add("hide"); // guest cannot add more than 1 card
                noCardBox?.classList.add("hide");
            }
        }
    } catch (err) {
        console.error("Error fetching cards:", err);
        noCardBox?.classList.remove("hide");
    }
}

// Render cards function
function renderCards(cards) {
    const hiddenField = document.getElementById("stripe-card");

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

        // Select the first card as active
        if (idx === 0 && hiddenField) {
            insCardEl.setAttribute("active", "");
            hiddenField.value = card.payment_method_token;
        }

        // Allow clicking to change active card
        insCardEl.addEventListener("insClick", () => {
            document.querySelectorAll("ins-credit-card[active]").forEach(el => {
                el.removeAttribute("active");
            });
            insCardEl.setAttribute("active", "");
            if (hiddenField) hiddenField.value = insCardEl.value;
        });

        divEl.appendChild(insCardEl);
        cardList.appendChild(divEl);
    });
}
