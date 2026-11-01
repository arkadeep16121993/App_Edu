import { describe, it, expect } from "vitest";
import {
  analyseAnswers,
  getConcept,
  possibleError,
  sampleRanking,
} from "../shared/learning";
import { safeQuestion } from "../shared/rules";
import type { LocalAnswer, Question } from "../shared/types";
import demo from "../app/demo.json";
const questions: Question[] = demo;
function attempt(q: Question, selected: number, hinted = false): LocalAnswer {
  return {
    id: crypto.randomUUID(),
    questionId: q.id,
    selected,
    correct: selected === q.answer,
    hinted,
    at: 1,
  };
}
describe("concept links and question-pattern analysis", () => {
  it("covers every starter item with a real lesson and option-specific mistakes", () => {
    for (const q of questions) {
      expect(getConcept(q.conceptId)?.steps.length).toBeGreaterThan(0);
      expect(q.questionType).toBeTruthy();
      for (let i = 0; i < 4; i++)
        if (i !== q.answer) expect(q.misconceptions?.[String(i)]).toBeTruthy();
      expect(safeQuestion(q)).not.toHaveProperty("misconceptions");
    }
  });
  it("identifies inverse-distance versus inverse-square confusion from the chosen answer", () => {
    const q = questions[1];
    const result = analyseAnswers([attempt(q, 2)], questions);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: "Inverse-square scaling",
      answered: 1,
      wrong: 1,
      questionIds: [q.id],
    });
    expect(result[0].reasons).toEqual([
      "You may have used inverse-distance scaling instead of inverse-square scaling.",
    ]);
    expect(possibleError(q, 0)).toContain("directly proportional");
  });
  it("preserves first responses and separates different question types in one concept", () => {
    const q = questions[6],
      ratio = questions[8];
    const result = analyseAnswers(
      [attempt(q, 0), attempt(q, q.answer), attempt(ratio, ratio.answer, true)],
      questions,
    );
    expect(result).toHaveLength(2);
    expect(
      result.find((r) => r.title === "Calculating current from voltage"),
    ).toMatchObject({ answered: 1, wrong: 1 });
    expect(
      result.find((r) => r.title === "Current-voltage proportionality"),
    ).toMatchObject({ answered: 1, wrong: 0, hinted: 1 });
  });
  it("handles older untagged items without inventing a concept diagnosis", () => {
    const q = {
      ...questions[0],
      conceptId: undefined,
      questionType: undefined,
      misconceptions: undefined,
    };
    const result = analyseAnswers([attempt(q, 0)], [q]);
    expect(result[0]).toMatchObject({
      title: "General practice",
      conceptId: undefined,
      wrong: 1,
    });
    expect(getConcept("missing")).toBeUndefined();
  });
});
describe("sample leaderboard rules", () => {
  it("uses this mission score, fictional peers and shared competition ranks", () => {
    const answers = questions
      .slice(0, 6)
      .map((q, i) => attempt(q, i === 1 ? 2 : q.answer));
    const { rows, total, rank } = sampleRanking(answers);
    expect(total).toBe(6);
    expect(rows).toHaveLength(9);
    expect(rows.filter((r) => r.isYou)).toHaveLength(1);
    expect(rows.find((r) => r.isYou)).toMatchObject({ score: 19, correct: 5 });
    expect(rank).toBe(2);
    expect(rows.filter((r) => r.rank === 2)).toHaveLength(3);
    expect(rows.find((r) => r.name === "Photon")?.rank).toBe(5);
  });
  it("keeps retry data from inflating the learner score and supports short revision missions", () => {
    const q = questions[1];
    const first = attempt(q, 2);
    const { rows, total } = sampleRanking([first, attempt(q, q.answer)]);
    expect(total).toBe(1);
    expect(rows.find((r) => r.isYou)?.score).toBe(-1);
    expect(
      sampleRanking([attempt(q, q.answer)]).rows.find((r) => r.isYou)?.score,
    ).toBe(4);
  });
});
