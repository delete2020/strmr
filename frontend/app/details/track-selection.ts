import type { AudioStreamMetadata, SubtitleStreamMetadata } from '@/services/api';

export const normalizeLanguageForMatching = (lang: string): string => {
  return lang.toLowerCase().trim();
};

export const findAudioTrackByLanguage = (streams: AudioStreamMetadata[], preferredLanguage: string): number | null => {
  if (!preferredLanguage || !streams?.length) {
    return null;
  }

  const normalizedPref = normalizeLanguageForMatching(preferredLanguage);

  // Try exact match on language code or title
  for (const stream of streams) {
    const language = normalizeLanguageForMatching(stream.language || '');
    const title = normalizeLanguageForMatching(stream.title || '');

    if (language === normalizedPref || title === normalizedPref) {
      return stream.index;
    }
  }

  // Try partial match (e.g., "eng" matches "English")
  for (const stream of streams) {
    const language = normalizeLanguageForMatching(stream.language || '');
    const title = normalizeLanguageForMatching(stream.title || '');

    if (
      language.includes(normalizedPref) ||
      title.includes(normalizedPref) ||
      normalizedPref.includes(language) ||
      normalizedPref.includes(title)
    ) {
      return stream.index;
    }
  }

  return null;
};

export const findSubtitleTrackByPreference = (
  streams: SubtitleStreamMetadata[],
  preferredLanguage: string | undefined,
  mode: 'off' | 'on' | 'forced-only' | undefined,
): number | null => {
  if (!streams?.length || mode === 'off') {
    return null;
  }

  const normalizedPref = preferredLanguage ? normalizeLanguageForMatching(preferredLanguage) : null;

  // Filter by mode
  let candidateStreams = streams;
  if (mode === 'forced-only') {
    candidateStreams = streams.filter((s) => s.isForced ?? (s.disposition?.forced ?? 0) > 0);
    if (!candidateStreams.length) {
      // No forced subtitles available, return null (off)
      return null;
    }
  }

  // If language preference is set, try to find a match
  if (normalizedPref) {
    // Try exact match
    for (const stream of candidateStreams) {
      const language = normalizeLanguageForMatching(stream.language || '');
      const title = normalizeLanguageForMatching(stream.title || '');

      if (language === normalizedPref || title === normalizedPref) {
        return stream.index;
      }
    }

    // Try partial match
    for (const stream of candidateStreams) {
      const language = normalizeLanguageForMatching(stream.language || '');
      const title = normalizeLanguageForMatching(stream.title || '');

      if (
        language.includes(normalizedPref) ||
        title.includes(normalizedPref) ||
        normalizedPref.includes(language) ||
        normalizedPref.includes(title)
      ) {
        return stream.index;
      }
    }
  }

  // If mode is 'on' and no language match, return first available
  if (mode === 'on' && candidateStreams.length > 0) {
    return candidateStreams[0].index;
  }

  return null;
};
