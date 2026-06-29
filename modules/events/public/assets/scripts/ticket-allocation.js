let allocateTicket = document.getElementById("allocate-ticket");
let allocateTicketUUID = document.getElementById("allocate-ticket-uuid")
let allocateButton = document.getElementById("submit-btn");
let cancelAllocateModal = document.getElementById("cancel")
let allocationModalButton = document.querySelectorAll(".ticket-allocation-modal-button");
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
const allocatePhoneDefaultCountryCode = (allocatePhone?.getAttribute("country-code") || mobileAreaCode || "61").toString().replace(/^\+/, "");
const allocatePhoneDefaultPhoneNumber = (allocatePhone?.getAttribute("phonenum-value") || "").toString().trim();
mobileAreaCode = allocatePhoneDefaultCountryCode || mobileAreaCode;
if (allocatePhoneDefaultPhoneNumber) {
  mobilePhone = allocatePhoneDefaultPhoneNumber;
}

function validateField(inputEl, errorEl, type = "text") {
  const value = inputEl.value.trim();

  if (!value) {
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
  // Keyboard support: role="button" divs don't fire click on Enter/Space natively
  btn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      btn.click();
    }
  });
  btn.addEventListener("click", () => {
    let id = btn.getAttribute("data-ticket-id");
    allocateTicket.value = id;
    allocateTicketUUID.value = btn.getAttribute("data-uuid")

    const prefillFirstName = btn.dataset.contactFirstName || "";
    const prefillLastName = btn.dataset.contactLastName || "";
    const prefillEmail = btn.dataset.contactEmail || "";
    const prefillPhoneCountryCodeRaw = btn.dataset.contactPhoneCountryCode || "";
    const prefillPhoneNumber = (btn.dataset.contactPhoneNumber || "").trim();
    const sanitizedPhoneCountryCode = prefillPhoneCountryCodeRaw
      ? prefillPhoneCountryCodeRaw.toString().replace(/^\+/, "").trim()
      : "";
    const nextPhoneCountryCode = sanitizedPhoneCountryCode || allocatePhoneDefaultCountryCode || "61";

    allocateFirstName.value = prefillFirstName;
    allocateLastName.value = prefillLastName;
    allocateEmail.value = prefillEmail;

    if (allocatePhone) {
      allocatePhone.setAttribute("country-code", nextPhoneCountryCode);
      allocatePhone.setAttribute("phonenum-value", prefillPhoneNumber);
      allocatePhone.removeAttribute("has-error");
    }

    mobileAreaCode = nextPhoneCountryCode;
    mobilePhone = prefillPhoneNumber;

    // reset validation state whenever modal opens
    [allocateFirstName, allocateLastName, allocateEmail].forEach((input) => {
      input.removeAttribute("has-error");
    });
    [
      requiredFirstName,
      requiredLastName,
      requiredEmail
    ].forEach((errorEl) => {
      errorEl.classList.remove("is_visible");
      errorEl.classList.add("is_not_visible");
      // restore default message in case email error text was customised
      if (errorEl === requiredEmail) {
        errorEl.textContent = "Email is required.";
      }
    });

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
    
  const ticketButton = document.querySelector(
    `.ticket-allocation-modal-button[data-uuid="${payload.event.ticketuuid}"]`
  );
  const ticketDetailsEl = ticketButton
    ?.closest(".ticket-card-container")
    ?.querySelector(`#ticket-allocated-details-${payload.event.ticketuuid}`);


    if (ticketDetailsEl) {
      ticketDetailsEl.innerHTML = `
        <p class="attendee-name">${payload.ticketData.contact_first_name} ${payload.ticketData.contact_last_name}</p>
        <p>${payload.ticketData.contact_email}</p>
      `;
    }

    if (ticketButton) {
      ticketButton.dataset.contactFirstName = payload.ticketData.contact_first_name || "";
      ticketButton.dataset.contactLastName = payload.ticketData.contact_last_name || "";
      ticketButton.dataset.contactEmail = payload.ticketData.contact_email || "";
      ticketButton.dataset.contactPhoneCountryCode = payload.ticketData.contact_phone_country_code || "";
      ticketButton.dataset.contactPhoneNumber = payload.ticketData.contact_phone_number || "";
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