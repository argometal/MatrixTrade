/** User-facing copy only — internal types (case, evidence) unchanged in data model. */

export const ARGUS_PRODUCT_NAME = "ARGUS";
export const ARGUS_TAGLINE = "Work Tracker";
export const ARGUS_SUBTITLE = "Track items, documents, and follow-ups.";

export const CAPTURE = {
  fab: "Capture",
  title: "Capture",
  titlePlaceholder: "Title (optional)",
  bodyPlaceholder: "What do you need to remember?",
  reference: "Reference",
  date: "Date",
  reminder: "Reminder",
  attachment: "Attachment",
  cancel: "Cancel",
  save: "Save",
  done: "Done",
} as const;

/** @deprecated capture-first home — no workflow menu */
export const HOME_PROMPT = "What do you want to add?";

/** @deprecated use + Capture */
export const HOME_ACTIONS = {
  newItem: "New item",
  recordUpdate: "Record update",
  addDocument: "Add document",
  reviewPending: "Review pending",
} as const;

export const HOME_EMPTY = {
  title: "Nothing captured yet.",
  hint: "Tap + Capture to write your first note.",
} as const;

export const HOME_SECTIONS = {
  recentActivity: "Recent activity",
  upcomingFollowUps: "Pending follow-ups",
  recentReferences: "Recent references",
  inbox: "Inbox",
  recentDocuments: "Recent documents",
  openItems: "Open items",
  needsReview: "Needs review",
  references: "References",
} as const;

export const REFERENCES = {
  createFirst: "Create first reference",
  createPerson: "Create person",
  createOrganization: "Create organization",
  search: "Search references",
  link: "Link",
  linkLabel: "Linked",
  createNew: "Create new",
  hideCreate: "Hide",
  select: "Select",
  cancel: "Cancel",
  save: "Save",
  empty: "No references yet.",
  emptyHint: "Create your first reference.",
  emptyPicker: "No references yet.",
  emptySearch: "Type to search references",
  emptyFavorites: "Star references to pin them here",
  emptyNetwork: "No references yet.",
  emptyNetworkHint: "Create your first reference from Home.",
  emptyActivity: "No notes or documents linked yet.",
  addDocumentFor: (name: string) => `Add document for ${name}`,
  pendingNew: (name: string) => `New: ${name}`,
} as const;

/** @deprecated use REFERENCES */
export const CONTACTS = REFERENCES;

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
  recentActivity: "No activity yet.",
  recentActivityHint: "Captured notes appear here.",
  openItems: "No active items yet.",
  openItemsHint: "Use + Capture on Home.",
  needsReview: "Nothing needs review.",
  documents: "No documents yet.",
  documentsHint: "Attach files from Capture.",
  reminders: "No pending follow-ups.",
  remindersHint: "Set a reminder when capturing.",
  inbox: "Inbox is empty.",
  inboxHint: "Incoming items appear here.",
} as const;

export const REFERENCE_PICKER = {
  searchPlaceholder: "Search…",
  typeToSearch: "Type to search references",
  starToPin: "Star references to pin them here",
  noReferences: "No references yet.",
  selected: (n: number, names: string) => `${n} selected · ${names}`,
  recent: "Recent",
  favorites: "Favorites",
} as const;

/** @deprecated use REFERENCE_PICKER */
export const ENTITY_PICKER = REFERENCE_PICKER;

export const ENTITY_PAGE = {
  linkedDocuments: "Linked documents",
  notes: "Notes",
  recentActivity: "Recent activity",
  addDocumentFor: (name: string) => `Add document for ${name}`,
} as const;

export const NETWORK = {
  title: "References",
  subtitle: "People, organizations, and topics you track",
  searchPlaceholder: "Search references…",
} as const;

export const SEARCH = {
  title: "Search",
  subtitle: "References and notes",
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
