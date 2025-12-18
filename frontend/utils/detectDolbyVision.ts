const DOLBY_VISION_PATTERNS: RegExp[] = [
  /\bdolby[\s-]?vision\b/i,
  /\bdolbyvision\b/i,
  /(^|[\s.\-_\[\]()])do[\s.-]?vi(?=$|[\s.\-_\[\]()])/i,
  /(^|[\s.\-_\[\]()])dovi(?=$|[\s.\-_\[\]()])/i,
  /(^|[\s.\-_\[\]()])dv(?=$|[\s.\-_\[\]()])/i,
  /\bhdr[^a-z0-9]*dv\b/i,
  /\bdv[^a-z0-9]*hdr\b/i,
];

const ZERO_WIDTH_CHARACTERS = /[\u200B-\u200D\uFEFF]/g;

const normalizeCandidate = (value: string): string => {
  return value.replace(ZERO_WIDTH_CHARACTERS, '').replace(/\s+/g, ' ').trim();
};

const testCandidate = (value: string): boolean => {
  if (!value) {
    return false;
  }

  const normalized = normalizeCandidate(value);

  return DOLBY_VISION_PATTERNS.some((pattern) => {
    if (pattern.test(normalized)) {
      return true;
    }

    const collapsed = normalized.replace(/[._-]+/g, ' ');
    return pattern.test(collapsed);
  });
};

export const hasDolbyVisionTag = (...candidates: Array<string | null | undefined>): boolean => {
  return candidates.some((candidate) => {
    if (typeof candidate !== 'string') {
      return false;
    }

    return testCandidate(candidate);
  });
};

export default hasDolbyVisionTag;
