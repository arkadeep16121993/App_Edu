import { useEffect, useRef } from "react";
import {
  BookOpen,
  Bookmark,
  Check,
  ChevronRight,
  RotateCcw,
  Trophy,
  X,
} from "lucide-react";
import katex from "katex";
import {
  analyseAnswers,
  getConcept,
  sampleRanking,
  type ConceptLesson,
} from "../shared/learning";
import type { LocalMission, Question } from "../shared/types";
function MathLine({ value }: { value: string }) {
  return (
    <div
      className="concept-formula"
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(value, {
          throwOnError: false,
          trust: false,
          displayMode: true,
        }),
      }}
    />
  );
}
export function ConceptDialog({
  concept,
  onClose,
  onSave,
  saved,
}: {
  concept: ConceptLesson;
  onClose: () => void;
  onSave: () => void;
  saved: boolean;
}) {
  const dialog = useRef<HTMLElement>(null),
    close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab") {
        const elements = dialog.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),a[href]",
        );
        if (!elements?.length) return;
        const first = elements[0],
          last = elements[elements.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop concept-backdrop" onClick={onClose}>
      <section
        className="concept-dialog"
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="concept-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={close}
          className="modal-close"
          aria-label="Close concept lesson"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <span className="eyebrow">{concept.unit} · CONCEPT NOTES</span>
        <h2 id="concept-title">{concept.title}</h2>
        <p className="concept-idea">{concept.idea}</p>
        {concept.id === "inverse-square" && (
          <div
            className="force-comparison"
            role="img"
            aria-label="At separation r the force is F; at separation 2r the force is F divided by four."
          >
            <div>
              <span>Separation r</span>
              <div className="charge-pair">
                <i>+</i>
                <span className="charge-distance" />
                <i>+</i>
              </div>
              <b>Force F</b>
              <div className="force-bar full" />
            </div>
            <div>
              <span>Separation 2r</span>
              <div className="charge-pair wide">
                <i>+</i>
                <span className="charge-distance" />
                <i>+</i>
              </div>
              <b>Force F/4</b>
              <div className="force-bar quarter" />
            </div>
          </div>
        )}
        <MathLine value={concept.formula} />
        <p className="concept-variables">{concept.variables}</p>
        <h3>How to think about it</h3>
        <ol className="concept-steps">
          {concept.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <div className="concept-example">
          <span className="eyebrow">A WORKED EXAMPLE</span>
          <p>{concept.examplePrompt}</p>
          <ul>
            {concept.exampleSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="concept-pitfall">
          <BookOpen size={18} />
          <p>
            <b>Watch for this:</b> {concept.pitfall}
          </p>
        </div>
        <p className="concept-review-note">
          Starter concept notes · educator review pending. Reading is for
          learning; it does not establish independent mastery.
        </p>
        <div className="concept-actions">
          <button className="outline-button" disabled={saved} onClick={onSave}>
            {saved ? <Check size={16} /> : <Bookmark size={16} />}{" "}
            {saved ? "Saved for review" : "Save concept for review"}
          </button>
          <button className="primary" onClick={onClose}>
            Back to my practice <ChevronRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
export function MissionInsights({
  mission,
  questions,
  onConcept,
  onReview,
}: {
  mission: LocalMission;
  questions: Question[];
  onConcept: (id: string) => void;
  onReview?: (ids: string[]) => void;
}) {
  const groups = analyseAnswers(mission.answers, questions),
    focus = groups.filter((g) => g.wrong || g.hinted);
  return (
    <section
      className="mission-insights"
      aria-labelledby="mission-insights-title"
    >
      <span className="eyebrow">YOUR NEXT USEFUL STEP</span>
      <h2 id="mission-insights-title">
        Which question types need another look?
      </h2>
      <p className="insights-intro">
        Based on this mission’s first answers. A small sample suggests what to
        practise; it does not label a whole topic weak.
      </p>
      {focus.length ? (
        focus.map((g) => (
          <article className="pattern-card" key={g.id}>
            <div className="pattern-heading">
              <h3>{g.title}</h3>
              <span className="pattern-count">
                {g.wrong} missed / {g.answered} answered
              </span>
            </div>
            <p>
              {g.wrong === 0
                ? "You got this right with help. Try an unassisted check another time."
                : g.wrong === 1
                  ? "One missed question is a reason to revisit this idea, not proof of a weak topic."
                  : "This question type caused repeated difficulty in this mission. Start with the concept before another attempt."}
            </p>
            {g.hinted > 0 && (
              <small>
                {g.hinted} answer{g.hinted === 1 ? "" : "s"} used a hint.
              </small>
            )}
            {g.reasons.length > 0 && (
              <div className="pattern-reasons">
                <b>Possible reason{g.reasons.length === 1 ? "" : "s"}</b>
                <ul>
                  {g.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="pattern-actions">
              {getConcept(g.conceptId) && (
                <button
                  className="text-button"
                  onClick={() => onConcept(g.conceptId!)}
                >
                  <BookOpen size={15} /> Read {getConcept(g.conceptId)!.title}
                </button>
              )}
              {g.wrong > 0 && onReview && (
                <button
                  className="text-button"
                  onClick={() => onReview(g.questionIds)}
                >
                  <RotateCcw size={14} /> Revisit these questions
                </button>
              )}
            </div>
          </article>
        ))
      ) : (
        <div className="insights-positive">
          <Check size={20} />
          <p>
            No missed or hinted answers in this mission. Try fresh questions
            later to check what sticks.
          </p>
        </div>
      )}
      <details className="pattern-breakdown">
        <summary>All question types in this mission</summary>
        <ul>
          {groups.map((g) => (
            <li key={g.id}>
              <span>{g.title}</span>
              <b>
                {g.answered - g.wrong}/{g.answered} correct
                {g.hinted ? ` · ${g.hinted} hinted` : ""}
              </b>
            </li>
          ))}
        </ul>
      </details>
      <p className="insights-footnote">
        Concept and error suggestions use fixed question tags and answer rules.
        No AI is used. Repeated, hinted and demo answers do not create verified
        readiness.
      </p>
    </section>
  );
}
export function SampleRanking({ mission }: { mission: LocalMission }) {
  const comparison = sampleRanking(mission.answers);
  const user = comparison.rows.find((r) => r.isYou)!;
  return (
    <section className="sample-ranking" aria-labelledby="sample-ranking-title">
      <div className="sample-ranking-heading">
        <span className="ranking-trophy">
          <Trophy size={25} />
        </span>
        <div>
          <span className="eyebrow">SAMPLE RANKING · FICTIONAL COMPARISON</span>
          <h2 id="sample-ranking-title">Your rank in a sample group</h2>
        </div>
      </div>
      <p className="sample-ranking-note">
        Your score comes from this mission. All other learners and results below
        are made up to demonstrate the ranking. This is not a live rank or a
        NEET percentile.
      </p>
      <div className="sample-rank-stat">
        <b>#{comparison.rank}</b>
        <span>
          of {comparison.rows.length} sample entries · {user.score} marks
        </span>
      </div>
      <div className="ranking-table-wrap">
        <table>
          <caption>
            Sample leaderboard · {comparison.total} questions · +4 correct, −1
            incorrect
          </caption>
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Learner</th>
              <th scope="col">Correct</th>
              <th scope="col">Marks</th>
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((r) => (
              <tr key={r.id} className={r.isYou ? "ranking-you" : ""}>
                <td>#{r.rank}</td>
                <th scope="row">
                  {r.name}
                  <small>{r.isYou ? "Your mission" : "Fictional"}</small>
                </th>
                <td>
                  {r.correct}/{comparison.total}
                </td>
                <td>{r.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ranking-footnote">
        Equal marks share a rank. Assisted practice is included in this
        demonstration only. Real peer comparisons will require common unseen
        questions and matching test rules.
      </p>
    </section>
  );
}
export function SavedConcepts({
  ids,
  onConcept,
  onRemove,
}: {
  ids: string[];
  onConcept: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const saved = ids.map(getConcept).filter((c): c is ConceptLesson => !!c);
  return (
    <section
      className="panel saved-concepts"
      aria-labelledby="saved-concepts-title"
    >
      <h2 id="saved-concepts-title">Saved concepts</h2>
      <p className="muted">
        A reading list for your next visit. Saved on this device.
      </p>
      {saved.length ? (
        <ul>
          {saved.map((c) => (
            <li key={c.id}>
              <button
                className="saved-concept-link"
                onClick={() => onConcept(c.id)}
              >
                <BookOpen size={18} />
                <span>
                  <b>{c.title}</b>
                  <small>{c.unit}</small>
                </span>
                <ChevronRight size={15} />
              </button>
              <button
                aria-label={`Remove ${c.title} from saved concepts`}
                onClick={() => onRemove(c.id)}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="saved-concepts-empty">
          After checking an answer, open its concept notes and save an idea to
          revisit here.
        </p>
      )}
    </section>
  );
}
