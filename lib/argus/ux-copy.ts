/** User-facing copy only — internal types (case, evidence) unchanged in data model. */

export const ARGUS_PRODUCT_NAME = "ARGUS";
export const ARGUS_TAGLINE = "Work Tracker";
export const ARGUS_SUBTITLE = "Track items, documents, and follow-ups.";

export const ACTIVITY_EDIT = {
  title: "Edit & organize",
  relationships: "Relationships",
  newProject: "New project",
  newTopic: "New topic",
  linkTo: "Link to",
  tags: "Tags",
  date: "Date",
  reminder: "Reminder",
  save: "Save",
  cancel: "Cancel",
  linkedLabel: "Linked to",
  attachments: "Attachments",
  fromInbox: "From inbox",
  viewOriginal: "view original",
  rawPreserved: "raw email preserved unchanged",
} as const;

export const CAPTURE = {
  fab: "Capture",
  title: "Capture",
  titlePlaceholder: "Title (optional)",
  bodyPlaceholder: "What do you need to remember?",
  reference: "Link to",
  date: "Date",
  reminder: "Reminder",
  attachment: "Attachment",
  tags: "Tags",
  cancel: "Cancel",
  save: "Save",
  done: "Done",
} as const;

export const ADD_MENU = {
  fab: "Add",
  title: "Add",
  captureNote: "Capture note",
  captureHint: "Quick journal entry — link it later",
  newKind: (label: string) => `New ${label}`,
  kindHint: {
    person: "A contact — can link to anything",
    organization: "A company — links people, no date limit",
    project: "Work in a start–end date range",
    topic: "Ongoing theme — links people and events",
    event: "One dated moment — can attach emails",
  },
} as const;

export const BOTTOM_NAV = {
  home: "Home",
  network: "Network",
  inbox: "Inbox",
  search: "Search",
} as const;

export const ACTIVITY_SORT = {
  newest: "Newest first",
  oldest: "Oldest first",
  toggleLabel: "Sort",
} as const;

export const TAGS = {
  title: "Tags",
  linkLabel: "Tagged",
  createNew: "Create new tag",
  namePlaceholder: "Tag name",
  searchPlaceholder: "Search tags…",
  recent: "Recent",
  all: "All tags",
  empty: "No tags yet.",
  emptyHint: "Create a tag to relate notes.",
  noResults: "No matching tags.",
  selected: (n: number, names: string) => `${n} tagged · ${names}`,
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
  title: "Nothing needs attention yet.",
  hint: "Incoming items appear in Inbox. Tap + to capture a note or create a person, project, topic, or event.",
} as const;

export const HOME_SECTIONS = {
  recentActivity: "Recent activity",
  upcomingFollowUps: "Pending follow-ups",
  recentReferences: "Recent networking",
  inbox: "Inbox",
  projects: "Projects",
  recentDocuments: "Recent documents",
  openItems: "Open items",
  needsReview: "Needs review",
  references: "Networking",
} as const;

export const HOME_NAV = {
  activity: "Activity",
  followUps: "Follow-ups",
  inbox: "Inbox",
  projects: "Projects",
  network: "Network",
  documents: "Documents",
} as const;

export const HOME_DETAIL = {
  sectionsLabel: "Sections",
  inboxPending: (n: number) => (n === 1 ? "1 pending email" : `${n} pending emails`),
  followUpPending: (n: number) => (n === 1 ? "1 pending follow-up" : `${n} pending follow-ups`),
  projectCount: (n: number) => (n === 1 ? "1 project" : `${n} projects`),
  linkedItems: (n: number) => (n === 1 ? "1 linked item" : `${n} linked items`),
  activityCount: (n: number) => (n === 1 ? "1 recent update" : `${n} recent updates`),
  documentCount: (n: number) => (n === 1 ? "1 document" : `${n} documents`),
} as const;

export const HOME_INBOX_ACTIONS = {
  assignProject: "Assign to Project",
  linkContact: "Link Contact",
  createFollowUp: "Create Follow-up",
  downloadOriginal: "Download Original",
  openFullViewer: "Open Full Viewer",
} as const;

export const ENTITY_CREATE = {
  fab: "Create",
  title: "Create",
  save: "Create",
  emptyProjects: "No projects yet. Tap Create to add one.",
  emptyNetwork: "Nothing here yet. Tap Create to add a person, organization, topic, or event.",
  emptySearch: "No records yet. Tap Create to add one.",
} as const;

export const NETWORKING = {
  createFirst: "Create",
  createPerson: "Add person",
  createOrganization: "Add organization",
  search: "Search network",
  link: "Link to",
  linkLabel: "Linked to",
  createNew: "Create new",
  hideCreate: "Hide",
  select: "Select",
  cancel: "Cancel",
  save: "Save",
  empty: "No records yet.",
  emptyHint: "Tap Create (+) to add a person, organization, project, topic, or event.",
  emptyPicker: "No records yet.",
  emptySearch: "Type to search",
  emptyFavorites: "Star contacts to pin them here",
  emptyNetwork: "No records yet.",
  emptyNetworkHint: "Tap Create (+) to add one — no note or inbox item required.",
  emptyActivity: "No evidence linked yet.",
  addDocumentFor: (name: string) => `Attach evidence for ${name}`,
  pendingNew: (name: string) => `New: ${name}`,
} as const;

/** @deprecated use NETWORKING */
export const REFERENCES = NETWORKING;

/** @deprecated use NETWORKING */
export const CONTACTS = NETWORKING;

export const PRIVATE = {
  unlock: "Unlock private",
  unlockHint: "Enter PIN to show private entries",
  visible: "Private entries visible",
  hide: "Hide private entries",
} as const;

export const INBOX = {
  title: "Inbox",
  subtitle: "Review, link, and convert incoming items",
  empty: "No inbox items.",
  emptyHint: "Incoming messages appear here for you to review.",
  addDocument: "Add document",
  linkedTo: "Linked to",
  attachments: "Attachments",
  actions: "Actions",
  linkReference: "Link to reference",
  tapToRead: "Tap to read email",
  createReference: "Create reference",
  createPerson: "+ New Person",
  createProject: "+ New Project",
  convertRecord: "Convert to record",
  archive: "Archive",
  saveLink: "Save link",
  convertHeading: "Convert to record",
  convertHint: "Creates a journal entry. Original email stays in inbox.",
  actionsRemaining: "Actions remaining",
  noActions: "No actions — item is archived or fully converted.",
  fromLabel: "From",
  toLabel: "To",
  receivedLabel: "Received",
  messageBody: "Message",
  htmlBody: "HTML version",
  viewRaw: "View raw",
  noSubject: "(No subject)",
  downloadAttachment: "Download",
} as const;

export const LINK_HIERARCHY = {
  linkedPeople: "Linked people",
  linkedTopics: "Linked topics",
  linkedEvents: "Linked events",
  newPerson: "+ New Person",
  newTopic: "+ New Topic",
  newEvent: "+ New Event",
  eventDate: "Event date",
  eventEndDate: "End date (optional)",
  projectEventsHint: "Only events within the project date range can be linked.",
  topicEventsHint: "Topics can link people and dated events.",
  inboxLinkHint: "Link to people, organizations, projects, topics, or events.",
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
  inboxHint: "Tap an email to read it; use Actions to link.",
} as const;

export const REFERENCE_PICKER = {
  searchPlaceholder: "Search…",
  typeToSearch: "Type to search",
  starToPin: "Star contacts to pin them here",
  noReferences: "No records yet. Create one first.",
  allReferences: "All references",
  inboxBrowseHint: "Projects, topics, events, and organizations appear here — search if the list is long.",
  selected: (n: number, names: string) => `${n} selected · ${names}`,
  recent: "Recent",
  favorites: "Favorites",
} as const;

/** @deprecated use REFERENCE_PICKER */
export const ENTITY_PICKER = REFERENCE_PICKER;

export const ENTITY_PAGE = {
  linkedDocuments: "Linked evidence",
  notes: "Notes",
  recentActivity: "Recent activity",
  addDocumentFor: (name: string) => `Attach evidence for ${name}`,
} as const;

export const NETWORK = {
  title: "Networking",
  subtitle: "People, organizations, topics, and events",
  searchPlaceholder: "Search network…",
} as const;

export const SEARCH = {
  title: "Search",
  subtitle: "Networking and notes",
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

/** Temporary testing controls — protect before production */
export const TESTING = {
  sectionLabel: "Testing",
  delete: "Delete",
  deleteLog: "Delete record",
  deleteLogConfirm: "Delete this record permanently? Attachments will be removed.",
  deleteEntity: "Delete reference",
  deleteEntityConfirm: "Delete this reference permanently? It will be unlinked from all records.",
  deleteInbox: "Delete email",
  deleteInboxConfirm: "Delete this inbox item permanently? Attachments will be removed.",
  clearAll: "Clear all ARGUS data",
  clearAllHint: "Removes all logs, inbox items, references, attachments, and files. For testing only.",
  clearAllConfirm:
    "Delete ALL ARGUS data? This removes every log, email, reference, and attachment. This cannot be undone.",
} as const;
