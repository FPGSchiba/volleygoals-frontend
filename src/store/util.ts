// Add simple session storage helpers used by the stores

export const setSessionItem = (key: string, value: string | null): void => {
  try {
    if (value === null || value === undefined) {
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
    }
  } catch (e) {
    // ignore session storage errors (e.g. SSR or blocked storage)
    // console.warn('setSessionItem error', e);
  }
};

export const getSessionItem = (key: string): string | undefined => {
  try {
    const v = sessionStorage.getItem(key);
    return v ?? undefined;
  } catch (e) {
    // ignore session storage errors
    return undefined;
  }
};

export const removeSessionItem = (key: string): void => {
  try {
    sessionStorage.removeItem(key);
  } catch (e) {
    // ignore
  }
};

