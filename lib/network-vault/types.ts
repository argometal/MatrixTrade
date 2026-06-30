export interface Contact {
  id: string;
  name: string;
  company: string;
  role: string;
  location: string;
  phone: string;
  email: string;
  linkedin: string;
  category: string;
  status: string;
  whereMet: string;
  dateMet: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  contactId: string;
  date: string;
  context: string;
  notes: string;
  interests: string;
  problems: string;
  opportunities: string;
  promises: string;
  nextStep: string;
  followUpDate: string;
  createdAt: string;
}

export interface VaultData {
  contacts: Contact[];
  conversations: Conversation[];
  seeded: boolean;
}

export type ContactInput = Omit<Contact, "id" | "createdAt" | "updatedAt">;

export type ConversationInput = Omit<Conversation, "id" | "createdAt">;
