"use client";

import { useCallback, useEffect, useState } from "react";
import * as storage from "./storage";
import type { Contact, Conversation, ContactInput, ConversationInput } from "./types";

export function useVault() {
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    storage.loadData();
    setReady(true);
  }, []);

  return {
    ready,
    refresh,
    getContacts: storage.getContacts,
    getContact: storage.getContact,
    createContact: (input: ContactInput) => {
      const c = storage.createContact(input);
      refresh();
      return c;
    },
    updateContact: (id: string, input: Partial<ContactInput>) => {
      const c = storage.updateContact(id, input);
      refresh();
      return c;
    },
    getConversations: storage.getConversations,
    createConversation: (input: ConversationInput) => {
      const c = storage.createConversation(input);
      refresh();
      return c;
    },
    getFollowUps: storage.getFollowUps,
    getDueFollowUps: storage.getDueFollowUps,
    getRecentConversations: storage.getRecentConversations,
    markFollowUpDone: (id: string) => {
      storage.markFollowUpDone(id);
      refresh();
    },
    searchContacts: storage.searchContacts,
    getLatestConversation: storage.getLatestConversation,
  };
}

export type { Contact, Conversation, ContactInput, ConversationInput };
