// Storage helpers — use localStorage so data persists across browser sessions.

export const setStorageItem = (key: string, value: string | null): void => {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch {
    // ignore storage errors (e.g. private browsing with full storage)
  }
};

export const getStorageItem = (key: string): string | undefined => {
  try {
    const v = localStorage.getItem(key);
    return v ?? undefined;
  } catch {
    return undefined;
  }
};

export const removeStorageItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
};
