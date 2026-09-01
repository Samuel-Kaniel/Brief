import { Summarizer } from '../types';

// Average adult silent reading speed, used to size a summary to ~60 seconds.
const WORDS_PER_SECOND = 3.3;

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  mdash: '—',
  ndash: '–',
  hellip: '…',
};

function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
}

function stripHtml(input: string): string {
  return decodeEntities(
    input
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<\/(p|div|br|li)>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

// Some publishers (e.g. MIT Technology Review's newsletter-sourced posts) open
// every article with a promotional lead-in instead of the actual story — this
// pattern repeats across both <description> and <content:encoded>. Strip these
// so the summary starts at the real hook of the story, not the ad for the
// newsletter it came from. Matched against text that's already had entities
// decoded, so apostrophes may be straight (') or curly (’).
const BOILERPLATE_LEAD_PATTERNS: RegExp[] = [
  /^this story originally appeared in .+/i,
  /^this is today['’]?s edition of .+/i,
  /sign up here\.?\s*$/i,
  /helps you get things done\.?\s*$/i,
];

function stripLeadingBoilerplate(sentences: string[]): string[] {
  let start = 0;
  // Only look at the first few sentences — a legitimate article mentioning
  // "sign up here" deep in its body shouldn't be touched.
  while (start < sentences.length && start < 3) {
    const trimmed = sentences[start].trim();
    if (!BOILERPLATE_LEAD_PATTERNS.some((pattern) => pattern.test(trimmed))) break;
    start++;
  }
  return sentences.slice(start);
}

/**
 * Rule-based summarizer: cleans the RSS description and truncates it to a
 * ~60-second read at the sentence boundary closest to the target word count.
 * Swap RuleBasedSummarizer for an LLM-backed Summarizer without touching the UI
 * (see README "Plugging in a better summarizer").
 */
export class RuleBasedSummarizer implements Summarizer {
  summarize(title: string, rawDescription: string | undefined, targetSeconds = 60): string {
    const targetWords = Math.round(WORDS_PER_SECOND * targetSeconds);
    const cleaned = rawDescription ? stripHtml(rawDescription) : '';

    if (!cleaned || cleaned.length < 8) {
      return title;
    }

    // `[.!?]*` (not `+`) so a final fragment with no terminal punctuation —
    // common when a feed truncates its description mid-sentence — is still
    // captured instead of silently dropped.
    const rawSentences = cleaned.match(/[^.!?]+[.!?]*/g) ?? [cleaned];
    const sentences = stripLeadingBoilerplate(rawSentences);
    if (sentences.length === 0) {
      return title;
    }

    let result = '';
    let wordCount = 0;

    for (const sentence of sentences) {
      const sentenceWords = sentence.trim().split(/\s+/).length;
      if (wordCount > 0 && wordCount + sentenceWords > targetWords) break;
      result += sentence;
      wordCount += sentenceWords;
      if (wordCount >= targetWords) break;
    }

    if (!result.trim()) {
      const remaining = sentences.join(' ');
      const allWords = remaining.split(/\s+/);
      const words = allWords.slice(0, targetWords);
      result = words.join(' ') + (words.length < allWords.length ? '…' : '');
    }

    return result.trim();
  }
}

export const defaultSummarizer: Summarizer = new RuleBasedSummarizer();
