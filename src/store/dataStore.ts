import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createSeedDatabase, SCHEMA_VERSION, type Database } from '@/mock/seed';
import { storageKey } from '@/utils/storage';

/**
 * localStorage throws once the origin's quota is exhausted, and in private
 * windows it can throw on the very first write. Either way the app must keep
 * working in memory rather than dying mid-transaction, so every access is
 * wrapped and the failure is surfaced once instead of on every keystroke.
 */
let quotaWarningShown = false;

const guardedLocalStorage: Storage = {
  get length() {
    try {
      return window.localStorage.length;
    } catch {
      return 0;
    }
  },
  key(index) {
    try {
      return window.localStorage.key(index);
    } catch {
      return null;
    }
  },
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      if (!quotaWarningShown) {
        quotaWarningShown = true;
        console.warn(
          '[Lumière] Could not save to localStorage — the browser refused the write ' +
            '(storage full, or site data blocked). The app still works, but changes ' +
            'will not survive a refresh.',
        );
      }
    }
  },
  removeItem(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* nothing useful to do */
    }
  },
  clear() {
    try {
      window.localStorage.clear();
    } catch {
      /* nothing useful to do */
    }
  },
};

/**
 * The single in-memory database. Every service reads and writes through here,
 * and the whole thing is mirrored to localStorage so a refresh keeps the
 * demo's state. When a real backend arrives this store shrinks to a cache and
 * the services in `src/services/` talk to the network instead.
 */
interface DataState {
  db: Database;
  /** Applies a change and stamps nothing else — services own their own timestamps. */
  mutate: (recipe: (db: Database) => void) => void;
  /** Replaces the whole database, e.g. on "Reset demo data". */
  replace: (db: Database) => void;
  resetDemoData: () => void;
}

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      db: createSeedDatabase(),

      mutate: (recipe) => {
        // Shallow-clone the table map, then let the recipe swap in new arrays.
        const next: Database = { ...get().db };
        recipe(next);
        set({ db: next });
      },

      replace: (db) => set({ db }),

      resetDemoData: () => set({ db: createSeedDatabase() }),
    }),
    {
      name: storageKey('database'),
      storage: createJSONStorage(() => guardedLocalStorage),
      version: SCHEMA_VERSION,
      // A shape change makes old saves unreadable; start fresh rather than crash.
      migrate: () => ({ db: createSeedDatabase() }),
      partialize: (state) => ({ db: state.db }),
    },
  ),
);

/** Read the current database outside React (services, calculations). */
export function getDb(): Database {
  return useDataStore.getState().db;
}

/** Write to the database outside React. */
export function mutateDb(recipe: (db: Database) => void): void {
  useDataStore.getState().mutate(recipe);
}
