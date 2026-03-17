export const formatDateTime = (iso: string): string =>
  new Intl.DateTimeFormat('de-CH', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));

export const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat('de-CH', { dateStyle: 'short' }).format(new Date(iso));
