import { useEffect, useRef, useState } from "react";
import { Download, MessageSquare, Trash2, X } from "lucide-react";
type Note = {
  id: string;
  createdAt: string;
  screen: string;
  questionId: string | null;
  category: string;
  message: string;
  viewport: { width: number; height: number };
};
const storageKey = "physics-path-feedback-v1";
export function FeedbackPanel({
  screen,
  questionId,
}: {
  screen: string;
  questionId?: string;
}) {
  const [open, setOpen] = useState(false),
    [message, setMessage] = useState(""),
    [category, setCategory] = useState("Idea"),
    [status, setStatus] = useState(""),
    [notes, setNotes] = useState<Note[]>(() => {
      try {
        const value = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
        return Array.isArray(value) ? value : [];
      } catch {
        return [];
      }
    });
  const textarea = useRef<HTMLTextAreaElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    textarea.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
      if (event.key === "Tab") {
        const elements = dialog.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),textarea,select",
        );
        if (!elements?.length) return;
        const first = elements[0],
          last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  function save() {
    const note: Note = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      screen,
      questionId: questionId ?? null,
      category,
      message: message.trim(),
      viewport: { width: innerWidth, height: innerHeight },
    };
    const updated = [...notes, note];
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setNotes(updated);
      setMessage("");
      setStatus(
        "Saved on this device. Download the report and send it in chat.",
      );
    } catch {
      setStatus(
        "Could not save: browser storage is unavailable. Copy your note before closing.",
      );
    }
  }
  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            app: "Physics Path",
            version: "0.1.0",
            exportedAt: new Date().toISOString(),
            notes,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `physics-path-feedback-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("Report downloaded. Attach it in chat to share your feedback.");
  }
  return (
    <>
      <button
        ref={trigger}
        className={`feedback-launcher ${screen === "mission" ? "during-mission" : ""}`}
        onClick={() => setOpen(true)}
        aria-label="Give feedback"
      >
        <MessageSquare size={16} />
        <span>Feedback</span>
      </button>
      {open && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setOpen(false);
            trigger.current?.focus();
          }}
        >
          <section
            ref={dialog}
            className="modal feedback-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Close feedback"
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              <X size={20} />
            </button>
            <div className="modal-icon">
              <MessageSquare size={25} />
            </div>
            <h2 id="feedback-title">Help shape the next step.</h2>
            <p>What felt useful? What got in your way?</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
            >
              <label htmlFor="feedback-category">Type of feedback</label>
              <select
                id="feedback-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {["Idea", "Bug", "Content issue", "Design"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <label htmlFor="feedback-message">Your note</label>
              <textarea
                ref={textarea}
                id="feedback-message"
                rows={4}
                minLength={5}
                maxLength={2000}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="For example: I wanted a clearer next step after finishing a mission."
              />
              <small>
                Screen: {screen}
                {questionId ? ` · Question: ${questionId}` : ""}. Please leave
                out personal or payment information.
              </small>
              <button
                className="primary"
                disabled={message.trim().length < 5 || notes.length >= 100}
              >
                Save note on this device
              </button>
            </form>
            <div className="feedback-export">
              <span>
                {notes.length} saved note{notes.length === 1 ? "" : "s"}
              </span>
              <button
                className="outline-button"
                disabled={!notes.length}
                onClick={download}
              >
                <Download size={15} />
                Download report
              </button>
              <button
                aria-label="Delete saved feedback"
                disabled={!notes.length}
                onClick={() => {
                  if (
                    confirm("Delete all saved feedback notes on this device?")
                  ) {
                    try {
                      localStorage.removeItem(storageKey);
                      setNotes([]);
                      setStatus("Feedback notes deleted.");
                    } catch {
                      setStatus("Could not clear browser storage.");
                    }
                  }
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
            <p className="feedback-privacy">
              Notes stay in this browser. Nothing is sent automatically.
              Download the report and attach it in chat.
            </p>
            {status && (
              <p role="status" className="feedback-status">
                {status}
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
