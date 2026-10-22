// The questions the question box completes as a visitor types. Most visitors want one of these, and a
// question asked in exactly these words is answered from the Worker's cache, which costs nothing and
// counts for nothing. Phrase them the way people start typing: "What", "Which", "How", "Is".

export const SUGGESTED_QUESTIONS: readonly string[] = [
  "What has Sharang fixed in Spring?",
  "What does Sharang do at THG?",
  "What is Sharang's experience with Kubernetes and Google Cloud?",
  "What did Sharang study?",
  "What do colleagues say about Sharang?",
  "What has Sharang written about?",
  "Which open-source projects has Sharang contributed to?",
  "How does Sharang approach testing?",
  "How can I contact Sharang?",
  "Is Sharang open to new roles?",
];

/** From how many typed characters a completion is offered. */
const MIN_TYPED = 2;

/**
 * The first suggested question that begins with what has been typed, compared case-insensitively, or
 * nothing when the typing has gone another way. The typed part keeps its own casing; the rest comes
 * from the suggestion, so the two can be shown as one line.
 */
export function completionFor(typed: string, suggestions: readonly string[] = SUGGESTED_QUESTIONS): { full: string; rest: string } | undefined {
  const needle = typed.toLowerCase();
  if (needle.trim().length < MIN_TYPED) return undefined;
  const match = suggestions.find((suggestion) => suggestion.toLowerCase().startsWith(needle) && suggestion.length > typed.length);
  return match ? { full: typed + match.slice(typed.length), rest: match.slice(typed.length) } : undefined;
}
