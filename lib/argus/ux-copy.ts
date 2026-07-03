/** User-facing copy only — internal types (case, evidence) unchanged in data model. */

export const ARGUS_PRODUCT_NAME = "ARGUS";
export const ARGUS_TAGLINE = "Work Tracker";
export const ARGUS_SUBTITLE = "Track items, documents, and follow-ups.";

export const HOME_PROMPT = "What do you want to add?";

export const HOME_ACTIONS = {
  newItem: "New item",
  recordUpdate: "Record update",
  addDocument: "Add document",
  reviewPending: "Review pending",
} as const;

export const HOME_EMPTY = {
  title: "No active items yet.",
  hint: "Start by adding an item or document.",
} as const;

export const HOME_SECTIONS = {
  openItems: "Open items",
  needsReview: "Needs review",
  recentDocuments: "Recent documents",
  upcomingFollowUps: "Upcoming reminders",
  recentContacts: "Recent contacts",
  contacts: "Contacts",
} as const;

export const CONTACTS = {
  createFirst: "Create first contact",
  createPerson: "Create person",
  createOrganization: "Create organization",
  search: "Search contacts",
  linkContact: "Link contact",
  quickCreate: "Create contact",
  hideQuickCreate: "Hide",
  emptyPicker: "No contacts yet — create one below.",
  emptySearch: "Type to search contacts",
  emptyFavorites: "Star contacts to pin them here",
  emptyNetwork: "No contacts yet.",
  emptyNetworkHint: "Create your first contact from Home.",
  emptyActivity: "No notes or documents linked yet.",
  addDocumentFor: "Add document for",
} as const;

export const PRIVATE = {
  unlock: "Unlock private",
  unlockHint: "Enter PIN to show private entries",
  visible: "Private entries visible",
  hide: "Hide private entries",
} as const;

export const INBOX = {
  title: "Inbox",
  subtitle: "Pending items to review",
  empty: "No pending items.",
  emptyHint: "Incoming messages appear here for you to review.",
  addDocument: "Add document",
} as const;

export const SECTION_EMPTY = {
  openItems: "No active items yet.",
  openItemsHint: "Start with New item on Home.",
  needsReview: "Nothing needs review.",
  documents: "No documents yet.",
  documentsHint: "Attach your first document from Home.",
  reminders: "No pending reminders.",
  remindersHint: "Add a reminder when recording an update.",
} as const;

export const ENTITY_PICKER = {
  searchPlaceholder: "Search contacts…",
  typeToSearch: "Type to search contacts",
  starToPin: "Star contacts to pin them here",
  noContacts: "No contacts yet — create one below.",
  selected: (n: number, names: string) => `${n} selected · ${names}`,
} as const;

export const ENTITY_PAGE = {
  linkedDocuments: "Linked documents",
  notes: "Notes",
  recentActivity: "Recent activity",
  addDocumentFor: (name: string) => `Add document for ${name}`,
} as const;

export const NETWORK = {
  title: "Contacts",
  subtitle: "People and organizations you work with",
  searchPlaceholder: "Search contacts…",
} as const;

export const SEARCH = {
  title: "Search",
  subtitle: "Contacts and notes",
} as const;

export const COMPOSER = {
  case: {
    placeholder: "Describe the item — topic, scope, and what to track…",
    submit: "Add item",
  },
  evidence: {
    placeholder: "Describe the document — source, summary, and why it matters…",
    submit: "Add document",
  },
  event: {
    placeholder: "What happened? Include date, people involved, and outcome…",
    submit: "Record update",
  },
  log: {
    placeholder: "Quick note — observation, update, or reminder…",
    submit: "Save note",
  },
} as const;

export const ENTITY_DETAIL = {
  documentCount: "Linked documents",
  noteCount: "Notes",
} as const;
