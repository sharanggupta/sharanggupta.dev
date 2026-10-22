"use client";

import { type FormEvent, useEffect, useId, useState } from "react";
import Container from "@/components/ui/Container";
import { matchingSuggestions, SUGGESTED_QUESTIONS } from "@/content/ask";
import { PERSON } from "@/content/person";
import { cx } from "@/lib/classNames";
import styles from "./AskBar.module.css";

/** The Worker in worker/ that answers; unset means the box does not exist. */
const DEFAULT_ENDPOINT = process.env.NEXT_PUBLIC_ASK_URL;
const QUESTION_LIMIT = 300;
const PLACEHOLDER = "Ask about my work…";
/** How many suggested questions the empty box offers as chips. */
const CHIP_COUNT = 4;

type Phase = "checking" | "ready" | "asking" | "hidden";
type Reply = { question: string; answer: string };
type Status = { available?: boolean; remaining?: number };
type Answer = { answer?: string; remaining?: number; error?: string };

const NOTICE: Record<string, string> = {
  visitor_limit: `That is today's five questions from you. For anything else, email ${PERSON.email}.`,
  slow_down: "One at a time, please: try again in a minute.",
  too_long: `Please keep a question under ${QUESTION_LIMIT} characters.`,
  empty: "Type a question first.",
};

const INPUT =
  "min-w-0 flex-1 rounded-full border border-border bg-bg px-4 py-2.5 text-fg placeholder:text-muted/80 focus:border-accent disabled:opacity-60";
const BUTTON = "rounded-full bg-accent px-5 py-2.5 font-semibold text-bg transition hover:opacity-90 disabled:opacity-60";
const CHIP =
  "rounded-full border border-border bg-bg/70 px-3 py-1 text-sm text-muted transition hover:border-accent hover:text-accent disabled:opacity-60";
const SUGGESTION = "block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface hover:text-accent";

/**
 * A full-width bar floating at the bottom of every page: one question at a time about Sharang, answered
 * from the site's own content by the Worker. It shows only while the Worker says answers are left today,
 * and goes away for the day once they are used up or the Worker cannot answer. Suggested questions are
 * offered as chips, and matched while typing: a question asked in those words comes from the Worker's cache.
 */
export default function AskBar({ endpoint = DEFAULT_ENDPOINT }: { endpoint?: string }) {
  const [phase, setPhase] = useState<Phase>(endpoint ? "checking" : "hidden");
  const [remaining, setRemaining] = useState(0);
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState<Reply | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inputId = useId();
  const suggestionsId = useId();

  useEffect(() => {
    if (!endpoint) return;
    let cancelled = false;
    fetch(`${endpoint}/status`)
      .then((response) => (response.ok ? (response.json() as Promise<Status>) : Promise.reject(new Error(String(response.status)))))
      .then((status) => {
        if (cancelled) return;
        setRemaining(status.remaining ?? 0);
        setPhase(status.available ? "ready" : "hidden");
      })
      .catch(() => {
        if (!cancelled) setPhase("hidden");
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  async function ask(asked: string) {
    if (!asked || phase !== "ready") return;
    setPhase("asking");
    setNotice(null);
    setQuestion(asked);
    try {
      const response = await fetch(`${endpoint}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: asked }),
      });
      const body = (await response.json().catch(() => ({}))) as Answer;
      if (response.ok && body.answer) {
        setReply({ question: asked, answer: body.answer });
        setRemaining(body.remaining ?? remaining);
        setQuestion("");
        setPhase("ready");
      } else if (body.error && body.error in NOTICE) {
        setNotice(NOTICE[body.error]);
        setPhase("ready");
      } else {
        setPhase("hidden");
      }
    } catch {
      setPhase("hidden");
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(question.trim());
  }

  if (phase === "checking" || phase === "hidden") return null;
  const busy = phase === "asking";
  const suggestions = busy ? [] : matchingSuggestions(question);
  const showChips = !busy && question.trim() === "" && !reply;

  return (
    <>
      {/* In the flow, so the footer can scroll out from under the fixed bar. */}
      <div className="h-40 sm:h-36" aria-hidden="true" />
      <section
        aria-label="Ask about Sharang"
        className={cx(styles.bar, "fixed inset-x-0 bottom-0 z-(--z-header) border-t border-border bg-surface/85 backdrop-blur-[10px]")}
      >
        {/* Extra left padding keeps the input clear of the theme toggle, which floats bottom left. */}
        <Container className="py-3 pl-16 sm:pl-20">
          {reply && (
            <output className="mb-3 block max-h-56 overflow-y-auto rounded-xl border border-border bg-bg/70 p-4" aria-live="polite">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-muted">{reply.question}</p>
                <button type="button" className="shrink-0 text-sm text-accent hover:underline" onClick={() => setReply(null)}>
                  Close
                </button>
              </div>
              <p className="mt-2">{reply.answer}</p>
            </output>
          )}
          {suggestions.length > 0 && (
            <ul id={suggestionsId} className="mb-2 rounded-xl border border-border bg-bg/90 p-1" aria-label="Suggested questions">
              {suggestions.map((suggestion) => (
                <li key={suggestion}>
                  <button type="button" className={SUGGESTION} onClick={() => void ask(suggestion)}>
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form className="flex gap-2" onSubmit={submit}>
            <label htmlFor={inputId} className="sr-only">
              Ask a question about Sharang
            </label>
            <input
              id={inputId}
              className={INPUT}
              type="text"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={PLACEHOLDER}
              maxLength={QUESTION_LIMIT}
              autoComplete="off"
              aria-describedby={suggestions.length > 0 ? suggestionsId : undefined}
              disabled={busy}
            />
            <button type="submit" className={BUTTON} disabled={busy || question.trim() === ""}>
              {busy ? "Asking…" : "Ask"}
            </button>
          </form>
          {showChips && (
            <ul className="mt-2 flex flex-wrap gap-2" aria-label="Try one of these">
              {SUGGESTED_QUESTIONS.slice(0, CHIP_COUNT).map((suggestion) => (
                <li key={suggestion}>
                  <button type="button" className={CHIP} onClick={() => void ask(suggestion)}>
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1.5 text-xs text-muted">
            {notice ?? `Answered by an AI model from this site's content, so check anything that matters. ${remaining} answers left today.`}
          </p>
        </Container>
      </section>
    </>
  );
}
