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
  evolveHint: "Add more links anytime — a note can connect to people, projects, topics, events, and organizations.",
  protected: "Protected",
  attachments: "Attachments",
  fromInbox: "From inbox",
  viewOriginal: "view original",
  rawPreserved: "raw email preserved unchanged",
} as const;

/** Note vs Log sequence rules — behavior only, no schema change. */
export const JOURNAL_BEHAVIOR = {
  title: "Journal type",
  noteHint: "Standalone note — event date applies when linked to an event.",
  logHint: "Sequence log — to branch, extract an entry into a standalone note first.",
  eventNoteHint: "Event note — link a topic before converting to a log sequence.",
  convertToLog: "Convert to Log",
  extractToNote: "Extract to Note",
  extractPending: "Extracting…",
  convertModalTitle: "Convert Note to Log",
  convertDate: "Date",
  convertModalHint: "Starts a log sequence on the linked topic. Event notes keep their date.",
  convertConfirm: "Convert to Log",
  convertPending: "Converting…",
  cancel: "Cancel",
  untitled: "Untitled entry",
} as const;

export const CAPTURE = {
  fab: "Register",
  title: "Register",
  titlePlaceholder: "Title (optional)",
  bodyPlaceholder: "What happened?",
  log: "Log",
  note: "Note",
  logHint: "Ongoing sequence on linked people, projects, topics, or events",
  noteHint: "Standalone entry — set a date if needed",
  reference: "Link to",
  date: "Date",
  reminder: "Reminder",
  attachment: "Attachment",
  tags: "Tags",
  protected: "Protected",
  cancel: "Cancel",
  save: "Save",
  done: "Done",
  contextHintDefault: "Link to a topic, event, or project — or save and link later.",
} as const;

export const REGISTER = {
  action: "Create",
  entityCapture: "Create",
  entityCaptureHint: "New person, topic, event, project, or organization",
} as const;

/** Extend the graph — new entity types. */
export const ADD_CONTEXT = {
  action: "Create",
  title: "Create",
  pickKind: "What do you want to create?",
  hint: "Add a person, topic, event, project, or organization to the graph.",
  useRegisterHint: "",
} as const;

export const ADD_MENU = {
  fab: "Add",
  title: "Add",
  journal: "Journal",
  journalHint: "Start a note from an event · sequence becomes a log on a topic",
  journalHintLong:
    "Log (ongoing) or Note (standalone) — link people, projects, topics, events, and evidence",
  /** @deprecated use journal */
  captureNote: "Journal",
  /** @deprecated use journalHint */
  captureHint: "Log (ongoing) or Note (standalone) — link people, projects, topics, events, and evidence",
  newKind: (label: string) => `New ${label}`,
  kindHint: {
    person: "Add a person",
    organization: "Add an organization",
    project: "Add a project",
    topic: "Add a topic",
    event: "Add an event",
  },
  kindHintLong: {
    person: "A contact — can link to anything",
    organization: "A company — ongoing shell for people; use Projects for bounded work",
    project: "Time-bounded work — links people, topics, events, and project evidence",
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
  hint: "Incoming items appear in Inbox. Tap + for Journal or to create a person, project, topic, or event.",
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
  projectEvidence: (emails: number, records: number) =>
    `${emails} email${emails === 1 ? "" : "s"} · ${records} record${records === 1 ? "" : "s"}`,
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
  fab: "Capture",
  title: "Capture",
  save: "Capture",
  emptyProjects: "No projects yet. Tap Capture to add one.",
  emptyNetwork: "Nothing here yet. Tap Capture to add a person, organization, topic, or event.",
  emptySearch: "No records yet. Tap Capture to add one.",
} as const;

export const NETWORKING = {
  createFirst: "Capture",
  createPerson: "Add person",
  createOrganization: "Add organization",
  search: "Search network",
  link: "Link to",
  linkLabel: "Linked to",
  createNew: "Capture new",
  hideCreate: "Hide",
  select: "Select",
  cancel: "Cancel",
  save: "Save",
  empty: "No records yet.",
  emptyHint: "Tap Capture (+) to add a person, organization, project, topic, or event.",
  emptyPicker: "No records yet.",
  emptySearch: "Type to search",
  emptyFavorites: "Star contacts to pin them here",
  emptyNetwork: "No records yet.",
  emptyNetworkHint: "Tap Capture (+) to add one — no note or inbox item required.",
  emptyActivity: "No evidence linked yet.",
  addDocumentFor: (name: string) => `Attach evidence for ${name}`,
  pendingNew: (name: string) => `New: ${name}`,
} as const;

/** @deprecated use NETWORKING */
export const REFERENCES = NETWORKING;

/** @deprecated use NETWORKING */
export const CONTACTS = NETWORKING;

export const PRIVATE = {
  unlock: "Unlock protected",
  unlockHint: "Enter PIN to show protected emails and records (stays unlocked for 1 hour)",
  visible: "Protected items visible",
  hide: "Hide protected items",
  protectedLabel: "Protected",
  protectItem: "Mark protected",
  unprotectItem: "Remove protection",
  hiddenCount: (n: number) =>
    `${n} protected item${n === 1 ? "" : "s"} hidden — tap the lock to unlock.`,
  protectedHint: "Protected emails and journal records stay hidden until you unlock with PIN.",
} as const;

export const INBOX = {
  title: "Inbox",
  subtitle: "Review, link, and convert incoming items",
  empty: "No inbox items.",
  emptyHint: "Incoming messages appear here for you to review.",
  addDocument: "Add document",
  linkedTo: "Linked to",
  attachments: "Attachments",
  protectEmail: "Mark email protected",
  unprotectEmail: "Remove email protection",
  actions: "Actions",
  linkReference: "Link to reference",
  multiLinkHint: "Select multiple — e.g. link the contact and the project together.",
  tapToRead: "Tap to read email",
  createReference: "Capture reference",
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
  linkEmail: "Link",
  inboxLinkHint: "Link to people, organizations, projects, topics, or events. Create new from inside Link.",
  multiLinkHint: "Link a person and a project together to file email under both.",
} as const;

export const KIND_GUIDE = {
  project:
    "A project is time-bounded work with a start and end. Link people here, then file emails to both the contact and the project to keep evidence inside the project boundary.",
  organization:
    "An organization is the company shell — ongoing, no date range. Link people to it. Use a Project when you need to bundle work, emails, and records for a specific engagement.",
} as const;

export const SECTION_EMPTY = {
  recentActivity: "No activity yet.",
  recentActivityHint: "Captured notes appear here.",
  openItems: "No active items yet.",
  openItemsHint: "Use + Journal on Home.",
  needsReview: "Nothing needs review.",
  documents: "No documents yet.",
  documentsHint: "Attach files from Journal.",
  reminders: "No pending follow-ups.",
  remindersHint: "Set a reminder when capturing.",
  inbox: "Inbox is empty.",
  inboxHint: "Tap an email to read it; use Actions to link.",
} as const;

export const REFERENCE_PICKER = {
  searchPlaceholder: "Search…",
  typeToSearch: "Type to search",
  starToPin: "Star contacts to pin them here",
  noReferences: "No records yet. Capture one first.",
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
  linkedEmails: (n: number) => (n === 1 ? "1 linked email" : `${n} linked emails`),
  linkedRecords: (n: number) => (n === 1 ? "1 journal record" : `${n} journal records`),
  evidenceSummary: (emails: number, records: number) =>
    `${emails} email${emails === 1 ? "" : "s"} · ${records} record${records === 1 ? "" : "s"}`,
  convertedEmailsHint: (n: number) =>
    `${n} linked email${n === 1 ? "" : "s"} converted to journal records — see records below.`,
  expandEmail: "Tap to read full email",
  collapseEmail: "Tap to collapse",
  notes: "Notes",
  recentActivity: "Recent activity",
  addDocumentFor: (name: string) => `Attach evidence for ${name}`,
  eventEvidenceHint:
    "Events should link emails and journal records from Inbox or Capture so the moment is fully documented.",
  projectScopeHint:
    "Project evidence includes emails and records linked to the project, plus items linked to project contacts within the project dates.",
  projectViaContactEmails: (n: number) =>
    n === 1 ? "1 email via project contact" : `${n} emails via project contacts`,
  projectViaContactRecords: (n: number) =>
    n === 1 ? "1 record via project contact" : `${n} records via project contacts`,
  projectViaContactHint: "Linked to a project contact only — also link the project from Inbox for a direct tag.",
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

/** Topic tag aliases — bridge inbox/journal tags to topic entities */
export const TOPIC_ALIASES = {
  heading: "Tag aliases",
  hint: "Synonyms that match this topic in inbox suggestions and filters (e.g. handover for HO).",
  placeholder: "Add alias…",
  add: "Add",
  save: "Save aliases",
  empty: "No aliases yet — add words from emails that should suggest this topic.",
} as const;

export const DELETE_AUTH = {
  deleteInbox: "Delete email",
  deleteInboxConfirm: "Delete this inbox item permanently? Attachments will be removed.",
  deleteLinkedConfirm:
    "This email is linked to a topic, event, or organization. Delete permanently? Recoverable from backup only.",
  unlockCode: "Unlock delete (5 min)",
  unlockAuthenticator: "Unlock with authenticator",
  codeTitle: "Enter deletion code",
  codeHint: "Enter your PIN — delete stays enabled for 5 minutes.",
  codePlaceholder: "PIN",
  authenticatorTitle: "Enter authenticator code",
  authenticatorHint:
    "Linked evidence requires your authenticator app (Google Authenticator / Authy). Valid for 5 minutes.",
  unlockButton: "Unlock",
  wrongCode: "Wrong deletion code",
  wrongAuthenticator: "Wrong authenticator code",
  totpNotConfigured: "Set ARGUS_TOTP_SECRET to delete linked evidence.",
  linkedRequiresAuth: "Linked to topic, event, or organization — authenticator required.",
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
  deleteProject: "Delete project",
  deleteProjectConfirmHint:
    "This removes the project from your knowledge base and unlinks it from journal entries and emails. Evidence is kept.",
  deleteProjectTypeName: "Type the project name to confirm",
  deleteProjectPinHint: "This project includes protected evidence. Enter your PIN to delete.",
  deleteEntityConfirmHint:
    "This removes the record from your knowledge base and unlinks it from evidence. Linked entries and emails are kept.",
  deleteEntityTypeName: "Type the name to confirm",
  deleteEntityPinHint: "This record includes protected evidence. Enter your PIN to delete.",
  clearAll: "Clear all ARGUS data",
  clearAllHint: "Removes all logs, inbox items, references, attachments, and files. For testing only.",
  clearAllConfirm:
    "Delete ALL ARGUS data? This removes every log, email, reference, and attachment. This cannot be undone.",
} as const;
