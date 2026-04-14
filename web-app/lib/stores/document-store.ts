import { create } from "zustand";

import type { Document } from "@/types";

interface DocumentStore {
  documents: Document[];
  currentDocumentId: string | null;
  isLoading: boolean;
  error: string | null;
  setCurrentDocument: (documentId: string | null) => void;
  fetchDocuments: () => Promise<void>;
  addDocument: (document: Document) => void;
  updateDocument: (documentId: string, updates: Partial<Document>) => void;
  removeDocument: (documentId: string) => void;
}

export const useDocumentStore = create<DocumentStore>((set) => ({
  documents: [],
  currentDocumentId: null,
  isLoading: false,
  error: null,

  setCurrentDocument: (documentId) => {
    set({ currentDocumentId: documentId });
  },

  fetchDocuments: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/documents", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch documents (${response.status})`);
      }

      const documents = (await response.json()) as Document[];
      set({ documents, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch documents",
      });
    }
  },

  addDocument: (document) => {
    set((state) => ({ documents: [document, ...state.documents] }));
  },

  updateDocument: (documentId, updates) => {
    set((state) => ({
      documents: state.documents.map((document) =>
        document.id === documentId ? { ...document, ...updates } : document,
      ),
    }));
  },

  removeDocument: (documentId) => {
    set((state) => ({
      documents: state.documents.filter((document) => document.id !== documentId),
      currentDocumentId:
        state.currentDocumentId === documentId ? null : state.currentDocumentId,
    }));
  },
}));
