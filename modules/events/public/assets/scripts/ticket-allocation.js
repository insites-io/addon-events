document.addEventListener("DOMContentLoaded", () => {
  if (window.location.pathname.includes("/allocate-ticket")) {
    const saved = localStorage.getItem("orderSummary");
    if (saved) {
      const data = JSON.parse(saved);

      // Restore breakdown HTML
      const breakdownEl = document.getElementById("payment-breakdown");
      breakdownEl.innerHTML = data.breakdown;
      breakdownEl.style.display = "block"; // force display

      // Restore totals
      document.getElementById("subtotal-price").textContent = data.subtotal;
      document.getElementById("tax-price").textContent = data.tax;
      document.getElementById("proccessing-price").textContent = data.processing;
      document.getElementById("total-price").textContent = data.total;

      // 🔒 Always hide discount section
      document.querySelector(".discount-summary").classList.add("is_not_visible");
      document.querySelector(".discount-summary-card").classList.add("is_not_visible");
    }
  }
});

let allocateTicket = document.getElementById("allocate-ticket");
let allocateTicketUUID = document.getElementById("allocate-ticket-uuid")
let allocateButton = document.getElementById("submit-btn");
let cancelAllocateModal = document.getElementById("cancel")
let allocationModalButton = document.querySelectorAll(".ticket-alloation-modal-button");
const allocationModal = document.getElementById("allocationModal");

let allocateEmail = document.getElementById("allocate-email");
let allocateFirstName = document.getElementById("allocate-first-name");
let allocateLastName = document.getElementById("allocate-last-name");
let allocateExternalId = document.getElementById("allocate-external-id");
let allocateDietary = document.getElementById("allocate-dietary");
let allocatePhone = document.getElementById("allocate-phone");
let eventUUID = document.getElementById("event-uuid")

// Required field labels
let requiredEmail = document.getElementById("emailRequired");
let requiredFirstName = document.getElementById("firstNameRequired");
let requiredLastName = document.getElementById("lastNameRequired");
let mobilePhone = ""
let mobileAreaCode = "61"

function validateField(inputEl, errorEl, type = "text") {
  const value = inputEl.value.trim();

  if (!value) {
    errorEl.textContent = "Required"; // default message
    errorEl.classList.remove("is_not_visible");
    errorEl.classList.add("is_visible");
    inputEl.setAttribute("has-error", "true");
    return false;
  }

  if (type === "email") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      errorEl.textContent = "Please enter a valid email address";
      errorEl.classList.remove("is_not_visible");
      errorEl.classList.add("is_visible");
      inputEl.setAttribute("has-error", "true");
      return false;
    }
  }

  // passed validation
  errorEl.classList.remove("is_visible");
  errorEl.classList.add("is_not_visible");
  inputEl.removeAttribute("has-error");
  return true;
}

function createAllocationPayload() {
  return {
    ticketData: {
      contact_first_name: allocateFirstName.value.trim(),
      contact_last_name: allocateLastName.value.trim(),
      contact_email: allocateEmail.value.trim(),
      contact_phone_country_code: mobileAreaCode?.trim() || "",
      contact_phone_number: mobilePhone?.trim() || "",
      allocation_status: "allocated"
    },
    event: {
      eventuuid: eventUUID.value,
      ticketuuid: allocateTicketUUID.value
    }
  };
}

// Open modal
allocationModalButton.forEach((btn) => {
  btn.addEventListener("click", () => {
    let id = btn.getAttribute("data-ticket-id");
    allocateTicket.value = id;
    allocateTicketUUID.value = btn.getAttribute("data-uuid")
    allocationModal.open(); 
  });
});

cancelAllocateModal.addEventListener("insClick", () => {
  allocationModal.close(); 
})

// Handle allocation
allocateButton.addEventListener("insClick", async () => {
  let isEmailValid = validateField(allocateEmail, requiredEmail, "email");
  let isFirstNameValid = validateField(allocateFirstName, requiredFirstName);
  let isLastNameValid = validateField(allocateLastName, requiredLastName);

  if (!(isEmailValid && isFirstNameValid && isLastNameValid)) {
    allocateButton.loading = false;
    return;
  }

  allocateButton.loading = true;

  const payload = createAllocationPayload();
  const allocateTicket = await ticketServices.allocateTicket(payload.event.eventuuid, payload.event.ticketuuid, JSON.stringify(payload.ticketData));

  if(!allocateTicket.data.has_error) {
    App.events.notyf("success", "Your ticket has been successfully allocated!");
    allocationModal.close(); 
    
  const ticketDetailsEl = document.querySelector(
    `.ticket-alloation-modal-button[data-uuid="${payload.event.ticketuuid}"]`
  )?.closest(".ticket-card-container")
    .querySelector(`#ticket-allocated-details-${payload.event.ticketuuid}`);


    if (ticketDetailsEl) {
      ticketDetailsEl.innerHTML = `
        <p>${payload.ticketData.contact_first_name} ${payload.ticketData.contact_last_name}</p>
        <p>${payload.ticketData.contact_email}</p>
      `;
    }

  }else {
    App.events.notyf("error", "A problem has occured please try again later.");
  }
  allocateButton.loading = false;

});

allocatePhone.addEventListener('insInput', event => {
    if(event.detail.field == "phone_number"){
      mobilePhone = event.detail.value
    }else{
      mobileAreaCode = event.detail.value.dialCode
    }
});