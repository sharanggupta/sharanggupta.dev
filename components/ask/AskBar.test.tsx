import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AskBar from "./AskBar";

const ENDPOINT = "https://ask.example";

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** A fetch that answers /status, then /ask, in order. */
function mockFetch(...responses: Response[]) {
  const fetch = vi.fn().mockImplementation(() => Promise.resolve(responses.shift()));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

async function ask(user: ReturnType<typeof userEvent.setup>, question: string) {
  await user.type(await screen.findByLabelText("Ask a question about Sharang"), question);
  await user.click(screen.getByRole("button", { name: "Ask" }));
}

describe("AskBar", () => {
  it("renders nothing without an endpoint", () => {
    const fetch = mockFetch();
    const { container } = render(<AskBar endpoint={undefined} />);
    expect(container).toBeEmptyDOMElement();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("stays hidden when the Worker says the day's answers are used up", async () => {
    const fetch = mockFetch(reply(200, { available: false, remaining: 0 }));
    const { container } = render(<AskBar endpoint={ENDPOINT} />);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(`${ENDPOINT}/status`));
    expect(container).toBeEmptyDOMElement();
  });

  it("stays hidden when the Worker cannot be reached", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetch);
    const { container } = render(<AskBar endpoint={ENDPOINT} />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the box with the answers left, and then the answer to a question", async () => {
    const fetch = mockFetch(reply(200, { available: true, remaining: 12 }), reply(200, { answer: "Mostly Java and Spring.", remaining: 11 }));
    const user = userEvent.setup();
    render(<AskBar endpoint={ENDPOINT} />);
    expect(await screen.findByText(/12 answers left today/)).toBeInTheDocument();

    await ask(user, "What does Sharang work on?");
    expect(await screen.findByText("Mostly Java and Spring.")).toBeInTheDocument();
    expect(screen.getByText("What does Sharang work on?")).toBeInTheDocument();
    expect(screen.getByText(/11 answers left today/)).toBeInTheDocument();
    expect(fetch).toHaveBeenLastCalledWith(`${ENDPOINT}/ask`, expect.objectContaining({ method: "POST", body: JSON.stringify({ question: "What does Sharang work on?" }) }));

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText("Mostly Java and Spring.")).not.toBeInTheDocument();
  });

  it("keeps the box but explains when this visitor has used their questions", async () => {
    mockFetch(reply(200, { available: true, remaining: 12 }), reply(429, { error: "visitor_limit", remaining: 12 }));
    const user = userEvent.setup();
    render(<AskBar endpoint={ENDPOINT} />);
    await ask(user, "Another one?");
    expect(await screen.findByText(/today's five questions from you/)).toBeInTheDocument();
    expect(screen.getByLabelText("Ask a question about Sharang")).toBeEnabled();
  });

  it("goes away for the day when the global limit is reached mid-way", async () => {
    mockFetch(reply(200, { available: true, remaining: 1 }), reply(429, { error: "daily_limit", remaining: 0 }));
    const user = userEvent.setup();
    const { container } = render(<AskBar endpoint={ENDPOINT} />);
    await ask(user, "Last one?");
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
