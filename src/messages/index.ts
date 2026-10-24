// Every piece of repeated user-facing text lives here, once: action labels,
// shared error messages, empty states, field names. Screens import `messages`
// instead of typing the string, so wording changes in one place, the same
// phrase never drifts into two spellings, and a translation layer can be added
// later without touching components (swap this object for one keyed by locale).
//
// Rule of thumb: text used in more than one place, or text that is part of the
// app's vocabulary (what an action is called), belongs here. One-off prose
// inside a single screen can stay next to the code that shows it.

export const messages = {
  common: {
    previousPage: "Previous page",
    nextPage: "Next page",
    noOptions: "No options",
    areYouSure: "Are you sure?",
    pleaseConfirm: "Please confirm your action.",
  },

  errors: {
    generic: "Something went wrong. Please try again.",
    passwordsDontMatch: "Passwords don't match.",
    uploadsPending: "Please wait for all files to finish uploading before submitting.",
    itemCatalogLoad: "Failed to load item type catalog",
    addAtLeastOneItem: "Add at least one item with standard dimensions and a rate.",
  },

  // What each action is called, wherever it appears (button, tooltip, menu).
  actions: {
    invoice: {
      view: "View Invoice",
      shareWhatsApp: "Share to WhatsApp",
      markPaid: "Mark as Paid",
      cancel: "Cancel Invoice",
      recordPayment: "Record Payment",
      onlyPendingPayments: "Only pending invoices can take payments",
      onlyPendingCancel: "Only pending invoices can be cancelled",
    },
    quotation: {
      accept: "Mark Accepted",
      reject: "Mark Rejected",
      onlyPendingAccept: "Only pending quotations can be accepted",
      onlyPendingReject: "Only pending quotations can be rejected",
    },
    document: {
      download: "Download PDF",
      preparing: "Preparing PDF…",
    },
    customer: {
      view: "View Customer",
      sendPortalInvite: "Send Portal Invite",
    },
    company: {
      view: "View Company",
    },
  },

  empty: {
    invoices: "No invoices raised yet.",
    quotations: "No quotations raised yet.",
    orders: "No orders placed yet.",
  },

  loadFailed: {
    customerInvoices: "Couldn't load invoices for this customer.",
    customerQuotations: "Couldn't load quotations for this customer.",
  },

  // Names of the things the shop tracks - table headers, filters, form labels.
  fields: {
    printStatus: "Print Status",
    clientStatus: "Client Status",
    projectType: "Project Type",
    billedTo: "Billed To",
    discountAmount: "Discount Amount",
    startDate: "Start Date",
  },

  placeholders: {
    searchCustomers: "Search customers...",
  },
} as const;
