export const isMobileWeb = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const ua =
    navigator.userAgent || navigator.vendor || (typeof window !== 'undefined' ? (window as any).opera : '') || '';
  return /iphone|ipad|ipod|android|mobile/i.test(ua);
};

export const isMobileIOSWeb = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const ua =
    navigator.userAgent || navigator.vendor || (typeof window !== 'undefined' ? (window as any).opera : '') || '';
  return /iphone|ipad|ipod/i.test(ua);
};
