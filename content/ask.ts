// The questions the question box suggests. Most visitors want one of these, and a question asked in
// exactly these words is answered from the Worker's cache, which costs nothing and counts for nothing.

export const SUGGESTED_QUESTIONS: readonly string[] = [
  "What has Sharang fixed in Spring?",
  "Which open-source projects has Sharang contributed to?",
  "What does Sharang do at THG?",
  "What is Sharang's experience with Kubernetes and Google Cloud?",
  "How does Sharang approach testing?",
  "What did Sharang study?",
  "What do colleagues say about Sharang?",
  "What has Sharang written about?",
  "Is Sharang open to new roles?",
  "How can I contact Sharang?",
];

/** How many suggestions to show while typing. */
export const SUGGESTION_LIMIT = 4;

/** The suggestions that contain what has been typed so far (two characters or more), case-insensitively. */
export function matchingSuggestions(typed: string, suggestions: readonly string[] = SUGGESTED_QUESTIONS): string[] {
  const needle = typed.trim().toLowerCase();
  if (needle.length < 2) return [];
  return suggestions.filter((suggestion) => suggestion.toLowerCase().includes(needle) && suggestion.toLowerCase() !== needle).slice(0, SUGGESTION_LIMIT);
}
