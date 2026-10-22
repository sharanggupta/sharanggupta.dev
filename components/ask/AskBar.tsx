"use client";

import { type FormEvent, type KeyboardEvent, useEffect, useId, useState } from "react";
import Container from "@/components/ui/Container";
import { completionFor } from "@/content/ask";
import { PERSON } from "@/content/person";
import { cx } from "@/lib/classNames";
import styles from "./AskBar.module.css";

/** The Worker in worker/ that answers; unset means the box does not exist. */
const DEFAULT_ENDPOINT = process.env.NEXT_PUBLIC_ASK_URL;
const QUESTION_LIMIT = 300;
const PLACEHOLDER = "Ask about my work…";

type Phase = "checking" | "ready" | "asking" | "hidden";
type Reply = { question: string; answer: string };
type Status = { available?: boolean };
type Answer = { answer?: string; error?: string };

const NOTICE: Record<string, string> = {
  visitor_limit: `That is today's five questions from you. For anything else, email ${PERSON.email}.`,
  slow_down: "One at a time, please: try again in a minute.",
  too_long: `Please keep a question under ${QUESTION_LIMIT} characters.`,
  empty: "Type a question first.",
};

// The input and the ghost text behind it share these, so the completion lines up with the typing.
const TEXT = "px-4 py-2.5 text-base leading-normal";
const FIELD = "rounded-full border border-border bg-bg focus-within:border-accent";
const INPUT = cx(TEXT, "relative w-full min-w-0 bg-transparent text-fg outline-none placeholder:text-muted/80 disabled:opacity-60");
const GHOST = cx(TEXT, "pointer-events-none absolute inset-0 overflow-hidden whitespace-pre text-muted/60");
const BUTTON = "rounded-full bg-accent px-5 py-2.5 font-semibold text-bg transition hover:opacity-90 disabled:opacity-60";

/**
 * A slim full-width bar floating at the bottom of every page: one question at a time about Sharang,
 * answered from the site's own content by the Worker. It shows only while the Worker says answers are
 * left today, and goes away for the day once they are used up or the Worker cannot answer.
 *
 * As the visitor types, the first suggested question that starts the same way is completed in grey
 * inside the input; Tab or the right arrow accepts it, typing on refines or dismisses it. On a touch
 * screen, which has no Tab, the same completion is one tappable line under the input. A question asked
 * in a suggestion's words is answered from the Worker's cache.
 */
export default function AskBar({ endpoint = DEFAULT_ENDPOINT }: { endpoint?: string }) {
  const [phase, setPhase] = useState<Phase>(endpoint ? "checking" : "hidden");
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState<Reply | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inputId = useId();
  const hintId = useId();

  useEffect(() => {
    if (!endpoint) return;
    let cancelled = false;
    fetch(`${endpoint}/status`)
      .then((response) => (response.ok ? (response.json() as Promise<Status>) : Promise.reject(new Error(String(response.status)))))
      .then((status) => {
        if (cancelled) return;
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
  const completion = busy ? undefined : completionFor(question);

  function acceptCompletion(event: KeyboardEvent<HTMLInputElement>) {
    if (!completion) return;
    const caretAtEnd = event.currentTarget.selectionEnd === question.length;
    if (event.key === "Tab" || (event.key === "ArrowRight" && caretAtEnd)) {
      event.preventDefault();
      setQuestion(completion.full);
    }
  }

  return (
    <>
      {/* In the flow, so the footer can scroll out from under the fixed bar. */}
      <div className="h-24" aria-hidden="true" />
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
          <form className="flex gap-2" onSubmit={submit}>
            <label htmlFor={inputId} className="sr-only">
              Ask a question about Sharang
            </label>
            <div className={cx(FIELD, "relative min-w-0 flex-1")}>
              {/* The typed part is rendered invisibly so the rest of the suggestion starts exactly where the caret is. */}
              <div className={GHOST} aria-hidden="true" data-testid="ask-ghost">
                <span className="invisible">{question}</span>
                {completion?.rest}
              </div>
              <input
                id={inputId}
                className={INPUT}
                type="text"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={acceptCompletion}
                placeholder={PLACEHOLDER}
                maxLength={QUESTION_LIMIT}
                autoComplete="off"
                aria-describedby={completion ? hintId : undefined}
                disabled={busy}
              />
            </div>
            <button type="submit" className={BUTTON} disabled={busy || question.trim() === ""}>
              {busy ? "Asking…" : "Ask"}
            </button>
          </form>
          {completion && (
            <p id={hintId} className="mt-1.5 text-xs text-muted">
              <span className={styles.keyboardOnly}>Press Tab to complete: {completion.full}</span>
              {/* No Tab on a touch screen: the same completion as one tap. */}
              <button type="button" className={cx(styles.touchOnly, "text-left text-accent")} onClick={() => void ask(completion.full)}>
                Ask: {completion.full}
              </button>
            </p>
          )}
          {notice && !completion && <p className="mt-1.5 text-xs text-muted">{notice}</p>}
        </Container>
      </section>
    </>
  );
}
