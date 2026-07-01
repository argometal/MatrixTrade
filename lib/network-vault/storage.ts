import { SEED_CONTACTS, SEED_CONVERSATIONS } from "./seed";
import type {
  Contact,
  ContactInput,
  Conversation,
  ConversationInput,
  VaultData,
} from "./types";

const STORAGE_KEY = "network-vault-data";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyData(): VaultData {
  return { contacts: [], conversations: [], seeded: false };
}

export function loadData(): VaultData {
  if (typeof window === "undefined") {
    return { contacts: SEED_CONTACTS, conversations: SEED_CONVERSATIONS, seeded: true };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded: VaultData = {
        contacts: SEED_CONTACTS,
        conversations: SEED_CONVERSATIONS,
        seeded: true,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as VaultData;
  } catch {
    return emptyData();
  }
}

function saveData(data: VaultData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getContacts(): Contact[] {
  return loadData().contacts.sort((a, b) => a.name.localeCompare(b.name));
}

export function getContact(id: string): Contact | undefined {
  return loadData().contacts.find((c) => c.id === id);
}

export function createContact(input: ContactInput): Contact {
  const data = loadData();
  const now = new Date().toISOString();
  const contact: Contact = {
    ...input,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  data.contacts.push(contact);
  saveData(data);
  return contact;
}

export function updateContact(id: string, input: Partial<ContactInput>): Contact | undefined {
  const data = loadData();
  const index = data.contacts.findIndex((c) => c.id === id);
  if (index === -1) return undefined;

  const updated: Contact = {
    ...data.contacts[index],
    ...input,
    updatedAt: new Date().toISOString(),
  };
  data.contacts[index] = updated;
  saveData(data);
  return updated;
}

export function getConversations(contactId?: string): Conversation[] {
  const conversations = loadData().conversations;
  const filtered = contactId
    ? conversations.filter((c) => c.contactId === contactId)
    : conversations;
  return filtered.sort((a, b) => b.date.localeCompare(a.date));
}

export function createConversation(input: ConversationInput): Conversation {
  const data = loadData();
  const conversation: Conversation = {
    ...input,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  data.conversations.push(conversation);
  saveData(data);
  return conversation;
}

export function getFollowUps(): Array<Conversation & { contact: Contact }> {
  const data = loadData();

  return data.conversations
    .filter((c) => c.followUpDate)
    .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate))
    .map((c) => {
      const contact = data.contacts.find((ct) => ct.id === c.contactId);
      return contact ? { ...c, contact } : null;
    })
    .filter((x): x is Conversation & { contact: Contact } => x !== null);
}

export function getDueFollowUps(): Array<Conversation & { contact: Contact }> {
  const data = loadData();
  const today = new Date().toISOString().slice(0, 10);

  return data.conversations
    .filter((c) => c.followUpDate && c.followUpDate <= today)
    .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate))
    .map((c) => {
      const contact = data.contacts.find((ct) => ct.id === c.contactId);
      return contact ? { ...c, contact } : null;
    })
    .filter((x): x is Conversation & { contact: Contact } => x !== null);
}

export function markFollowUpDone(conversationId: string): void {
  const data = loadData();
  const index = data.conversations.findIndex((c) => c.id === conversationId);
  if (index === -1) return;
  data.conversations[index].followUpDate = "";
  saveData(data);
}

export function searchContacts(query: string): Contact[] {
  const q = query.toLowerCase().trim();
  if (!q) return getContacts();

  return getContacts().filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q)
  );
}

export function getRecentConversations(limit = 5): Array<Conversation & { contact: Contact }> {
  const data = loadData();
  return data.conversations
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
    .map((c) => {
      const contact = data.contacts.find((ct) => ct.id === c.contactId);
      return contact ? { ...c, contact } : null;
    })
    .filter((x): x is Conversation & { contact: Contact } => x !== null);
}

export function getLatestConversation(contactId: string): Conversation | undefined {
  return getConversations(contactId)[0];
}
