import React, { useEffect, useState, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  Atom,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChartNoAxesCombined,
  Check,
  CheckCircle2,
  ChevronRight,
  Flame,
  Flag,
  Home,
  Lightbulb,
  Menu,
  MoreHorizontal,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  WifiOff,
  X,
  Zap,
  LogOut,
  Lock,
  CheckCheck,
} from "lucide-react";
import Dexie, { type EntityTable } from "dexie";
import katex from "katex";
import "katex/dist/katex.min.css";
import "./styles.css";
import demo from "./demo.json";
import { FeedbackPanel } from "./FeedbackPanel";
import {
  ConceptDialog,
  MissionInsights,
  SampleRanking,
  SavedConcepts,
} from "./ConceptLearning";
import { getConcept, possibleError } from "../shared/learning";
import { PreparationPath, FeatureRoadmap } from "./PreparationGuide";
import { topics, demoTopics } from "../shared/topics";
import type { LocalMission, Question } from "../shared/types";
const questions = demo as Question[];
const db = new Dexie("physics-path") as Dexie & {
  state: EntityTable<{ key: string; value: LocalMission[] }, "key">;
};
db.version(1).stores({ state: "key" });
type Page = "practice" | "topics" | "progress" | "friends" | "pricing";
type Config = {
  accountsEnabled: boolean;
  billingEnabled: boolean;
  contentReady: boolean;
};
function Formula({ value }: { value: string }) {
  return (
    <span
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(value, {
          throwOnError: false,
          trust: false,
        }),
      }}
    />
  );
}
function App() {
  const [conceptId, setConceptId] = useState<string | null>(null);
  const closeConcept = useCallback(() => setConceptId(null), []);
  const [savedConcepts, setSavedConcepts] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("physics-path-saved-concepts") ?? "[]",
      );
      return Array.isArray(stored)
        ? stored.filter(
            (id): id is string => typeof id === "string" && !!getConcept(id),
          )
        : [];
    } catch {
      return [];
    }
  });
  function saveConcept(id: string) {
    if (savedConcepts.includes(id)) return;
    const updated = [...savedConcepts, id];
    try {
      localStorage.setItem(
        "physics-path-saved-concepts",
        JSON.stringify(updated),
      );
      setSavedConcepts(updated);
    } catch {
      setToast("Could not save the concept: device storage is unavailable.");
    }
  }
  function removeConcept(id: string) {
    const updated = savedConcepts.filter((c) => c !== id);
    try {
      localStorage.setItem(
        "physics-path-saved-concepts",
        JSON.stringify(updated),
      );
      setSavedConcepts(updated);
    } catch {
      setToast("Could not update saved concepts.");
    }
  }

  const pendingSubmission = useRef<{
    key: string;
    body: Record<string, unknown>;
  } | null>(null);
  const [cloudMission, setCloudMission] = useState<LocalMission | null>(null),
    [cloudQuestions, setCloudQuestions] = useState<Question[]>([]),
    [busy, setBusy] = useState(false);
  const [page, setPage] = useState<Page>("practice"),
    [missions, setMissions] = useState<LocalMission[]>([]),
    [loaded, setLoaded] = useState(false),
    [storageError, setStorageError] = useState(false),
    [active, setActive] = useState<string | null>(null),
    [selected, setSelected] = useState<number | null>(null),
    [hint, setHint] = useState(false),
    [filter, setFilter] = useState("All topics"),
    [search, setSearch] = useState(""),
    [modal, setModal] = useState<"auth" | "about" | "report" | null>(null),
    [toast, setToast] = useState(""),
    [online, setOnline] = useState(navigator.onLine),
    [mobile, setMobile] = useState(false),
    [config, setConfig] = useState<Config>({
      accountsEnabled: false,
      billingEnabled: false,
      contentReady: false,
    }),
    [user, setUser] = useState<{ name: string; id: string } | null>(null),
    [groups, setGroups] = useState<{ id: string; name: string }[]>([]),
    [invite, setInvite] = useState(""),
    [groupName, setGroupName] = useState(""),
    [groupToken, setGroupToken] = useState(""),
    [cloudXp, setCloudXp] = useState(0);
  useEffect(() => {
    db.state
      .get("missions")
      .then((row) => setMissions(row?.value ?? []))
      .catch(() => setStorageError(true))
      .finally(() => setLoaded(true));
    fetch("/api/v1/config")
      .then((r) => r.json())
      .then((d) => setConfig(d as Config))
      .catch(() => {});
    fetch("/api/auth/get-session")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const s = data as { user?: { name: string; id: string } } | null;
        if (s?.user) setUser(s.user);
      })
      .catch(() => {});
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);
  useEffect(() => {
    if (loaded)
      db.state
        .put({ key: "missions", value: missions })
        .catch(() => setStorageError(true));
  }, [missions, loaded]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (user) {
      api("/api/v1/progress")
        .then((p) => setCloudXp(p.xp ?? 0))
        .catch(() => {});
      api("/api/v1/groups")
        .then((p) => setGroups(p.groups ?? []))
        .catch(() => {});
    }
  }, [user]);
  const finished = missions.filter((m) => m.finished),
    answers = missions.flatMap((m) => m.answers),
    correct = answers.filter((a) => a.correct).length;
  const pending = missions.find((m) => !m.finished),
    mission =
      cloudMission?.id === active
        ? cloudMission
        : missions.find((m) => m.id === active),
    q = mission
      ? [...cloudQuestions, ...questions].find(
          (q) => q.id === mission.questionIds[mission.answers.length],
        )
      : null;
  const days = new Set(
    finished.map((m) => new Date(m.startedAt).toLocaleDateString()),
  );
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (days.has(d.toLocaleDateString())) streak++;
    else if (i > 0 || !days.has(new Date().toLocaleDateString())) break;
  }
  const last = finished.at(-1),
    mistakes = answers.filter((a) => !a.correct),
    week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 6 + i);
      return {
        label: d.toLocaleDateString("en", { weekday: "narrow" }),
        active: days.has(d.toLocaleDateString()),
        today: i === 6,
      };
    });
  function navigate(p: Page) {
    setPage(p);
    setActive(null);
    setMobile(false);
    setSelected(null);
    setHint(false);
    window.scrollTo(0, 0);
  }
  async function start(
    topic = demoTopics[0],
    review = false,
    targetedIds?: string[],
  ) {
    if (!loaded || busy) return;
    if (user && config.contentReady && !review) {
      setBusy(true);
      try {
        const remote = await api("/api/v1/missions/next", {
          topic_id: topic,
          client_request_id: crypto.randomUUID(),
        });
        setCloudQuestions(remote.questions as Question[]);
        setCloudMission({
          id: remote.id,
          topic,
          questionIds: remote.questions.map((q: Question) => q.id),
          answers: remote.attempts.map((a: any) => ({
            id: a.id,
            questionId: a.item_version,
            selected: a.selected,
            correct: !!a.correct,
            hinted: !!a.hinted,
            errorReason: a.error_reason ?? undefined,
            at: Date.now(),
          })),
          finished: false,
          startedAt: Date.now(),
        });
        setActive(remote.id);
        setSelected(null);
        setHint(false);
      } catch (e) {
        setToast((e as Error).message);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!review && pending) {
      setActive(pending.id);
      setSelected(null);
      setHint(false);
      return;
    }
    const ids = review
      ? [...new Set(targetedIds ?? mistakes.map((a) => a.questionId))].slice(
          0,
          6,
        )
      : questions.filter((q) => q.topic === topic).map((q) => q.id);
    if (!ids.length) {
      setToast(
        "This topic is waiting for reviewed questions. Try one of the three starter topics.",
      );
      return;
    }
    const m: LocalMission = {
      id: crypto.randomUUID(),
      topic,
      questionIds: ids,
      answers: [],
      finished: false,
      startedAt: Date.now(),
    };
    setMissions((ms) => [...ms, m]);
    setActive(m.id);
    setSelected(null);
    setHint(false);
  }
  function answer() {
    if (!mission || !q || selected === null) return;
    const a = {
      id: crypto.randomUUID(),
      questionId: q.id,
      selected,
      correct: selected === q.answer,
      hinted: hint,
      errorReason:
        selected === q.answer ? undefined : possibleError(q, selected),
      at: Date.now(),
    };
    setMissions((ms) =>
      ms.map((m) =>
        m.id === mission.id ? { ...m, answers: [...m.answers, a] } : m,
      ),
    );
  }
  const [feedback, setFeedback] = useState<{
    question: Question;
    selected: number;
  } | null>(null);
  async function check() {
    if (!q || selected === null || busy || !mission) return;
    if (cloudMission?.id === mission.id) {
      setBusy(true);
      try {
        const key = mission.id + q.id;
        if (pendingSubmission.current?.key !== key)
          pendingSubmission.current = {
            key,
            body: {
              attempt_id: crypto.randomUUID(),
              item_version: q.id,
              selected_option: selected,
              active_ms: Math.min(Date.now() - mission.startedAt, 3600000),
              source: "online",
            },
          };
        const body = pendingSubmission.current.body;
        const attemptId = body.attempt_id as string;
        const d = await api(`/api/v1/missions/${mission.id}/attempts`, body);
        const canonical = {
          ...q,
          answer: d.correct_option,
          solution: d.short_explanation,
          error: d.error ?? "",
          conceptId: d.concept_id ?? q.conceptId,
          questionType: d.question_type ?? q.questionType,
          hints: [],
        };
        setFeedback({
          question: canonical,
          selected: body.selected_option as number,
        });
        setCloudMission((m) =>
          m
            ? {
                ...m,
                answers: [
                  ...m.answers,
                  {
                    id: attemptId,
                    questionId: q.id,
                    selected: body.selected_option as number,
                    correct: d.result === "correct",
                    hinted: hint,
                    errorReason: d.error ?? undefined,
                    at: Date.now(),
                  },
                ],
              }
            : null,
        );
      } catch (e) {
        setToast((e as Error).message);
      } finally {
        setBusy(false);
      }
      return;
    }
    setFeedback({ question: q, selected });
    answer();
  }
  async function showHint() {
    if (!q || !mission || busy) return;
    if (cloudMission?.id === mission.id) {
      setBusy(true);
      try {
        const d = await api(`/api/v1/missions/${mission.id}/hints`, {
          item_version: q.id,
        });
        setCloudQuestions((qs) =>
          qs.map((x) => (x.id === q.id ? { ...x, hints: d.hints } : x)),
        );
        setHint(true);
      } catch (e) {
        setToast((e as Error).message);
      } finally {
        setBusy(false);
      }
    } else setHint(true);
  }
  async function next() {
    if (!mission || busy) return;
    if (
      mission.answers.length === mission.questionIds.length &&
      cloudMission?.id === mission.id
    ) {
      setBusy(true);
      try {
        await api(`/api/v1/missions/${mission.id}/finish`, {});
        setCloudMission((m) => (m ? { ...m, finished: true } : null));
        const p = await api("/api/v1/progress");
        setCloudXp(p.xp ?? 0);
      } catch (e) {
        setToast((e as Error).message);
        return;
      } finally {
        setBusy(false);
      }
    } else if (mission.answers.length === mission.questionIds.length)
      setMissions((ms) =>
        ms.map((m) => (m.id === mission.id ? { ...m, finished: true } : m)),
      );
    setFeedback(null);
    setSelected(null);
    setHint(false);
  }
  async function api(path: string, body?: unknown) {
    const r = await fetch(path, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await r.json()) as Record<string, any>;
    if (!r.ok)
      throw new Error(
        data.message ?? "Something went wrong. Please try again.",
      );
    return data;
  }
  async function signIn() {
    if (!config.accountsEnabled) {
      setModal("auth");
      return;
    }
    try {
      const d = await api("/api/auth/sign-in/social", {
        provider: "google",
        callbackURL: location.origin,
      });
      if (d.url) location.assign(d.url);
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  async function upgrade() {
    if (!user) {
      setModal("auth");
      return;
    }
    try {
      const d = await api("/api/v1/billing/start", {});
      if (d.url && new URL(d.url).hostname === "rzp.io") location.assign(d.url);
      else if (d.url && new URL(d.url).hostname.endsWith(".razorpay.com"))
        location.assign(d.url);
      else setToast("Checkout is not available yet.");
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  const nav = [
    { id: "practice" as Page, label: "Practice", icon: Home },
    { id: "topics" as Page, label: "Topics", icon: BookOpen },
    { id: "progress" as Page, label: "My progress", icon: ChartNoAxesCombined },
    { id: "friends" as Page, label: "Study circle", icon: Users },
  ];
  return (
    <div className="layout">
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate("practice");
          }}
        >
          <span className="brand-mark">
            <Atom size={25} />
          </span>
          <span>
            physics<span className="brand-light">path</span>
            <small>A LITTLE BETTER, EVERY DAY</small>
          </span>
        </a>
        <div className="exam-label">
          <span className="dot" /> NEET PHYSICS <span>2027</span>
        </div>
        <div className="nav-label">YOUR LEARNING SPACE</div>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              className={page === n.id ? "nav-item active" : "nav-item"}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={19} />
              {n.label}
              {page === n.id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-card">
          <span className="little-star">✧</span>
          <h3>
            Small steps.
            <br />
            Big possibilities.
          </h3>
          <p>
            Make room for a little
            <br />
            Physics every day.
          </p>
          <button onClick={() => navigate("pricing")}>
            Explore Plus <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button onClick={() => setModal("about")}>
            <ShieldCheck size={17} /> About this pilot{" "}
            <ArrowUpRight size={14} />
          </button>
          <div className="profile">
            <div className="avatar">{user?.name[0] ?? "Y"}</div>
            <div>
              <b>{user?.name ?? "Your learning journey"}</b>
              <small>{user ? "Free account" : "Guest explorer"}</small>
            </div>
            <button
              aria-label={user ? "Sign out" : "Sign in"}
              onClick={async () => {
                if (user) {
                  try {
                    await api("/api/auth/sign-out", {});
                    setUser(null);
                    setGroups([]);
                    setCloudXp(0);
                    setCloudMission(null);
                    setCloudQuestions([]);
                    setActive(null);
                    setFeedback(null);
                    await caches
                      .keys()
                      .then((keys) =>
                        Promise.all(keys.map((k) => caches.delete(k))),
                      );
                    setToast("Signed out. Private data cleared.");
                  } catch {
                    setToast("Sign out failed. Please try again.");
                  }
                } else setModal("auth");
              }}
            >
              {user ? <LogOut size={16} /> : <MoreHorizontal size={18} />}
            </button>
          </div>
        </div>
      </aside>
      {mobile && <div className="scrim" onClick={() => setMobile(false)} />}
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu"
              aria-label="Open menu"
              onClick={() => setMobile(true)}
            >
              <Menu size={22} />
            </button>
            <span>Your workspace</span>
            <ChevronRight size={14} />
            <b>
              {page === "pricing"
                ? "Physics Path Plus"
                : nav.find((n) => n.id === page)?.label}
            </b>
          </div>
          <div className="top-actions">
            <span className="pilot-badge">
              <span className="dot" /> EARLY ACCESS
            </span>
            <button onClick={() => setModal("auth")} className="top-signin">
              {user ? "Account connected" : "Save your progress"}{" "}
              <ArrowUpRight size={15} />
            </button>
          </div>
        </header>
        {!online && (
          <div className="status-banner">
            <WifiOff size={16} /> You’re offline. Starter practice still works
            on this device.
          </div>
        )}
        {storageError && (
          <div className="status-banner">
            Device storage is unavailable. Your practice will last for this
            visit only.
          </div>
        )}
        <main>
          {active && mission ? (
            <section className="mission-view">
              <button
                className="back-link"
                onClick={() => {
                  setActive(null);
                  setFeedback(null);
                }}
              >
                ← Back to practice · progress saved
              </button>
              {mission.finished ? (
                <div className="completion">
                  <span className="completion-icon">
                    <CheckCheck size={40} />
                  </span>
                  <span className="eyebrow">ONE SMALL STEP FORWARD</span>
                  <h1>Look at you, showing up.</h1>
                  <p>
                    You finished {mission.questionIds.length} questions. Keep
                    the momentum going.
                  </p>
                  <div className="completion-stats">
                    <div>
                      <b>
                        {mission.answers.filter((a) => a.correct).length}/
                        {mission.questionIds.length}
                      </b>
                      <span>Correct answers</span>
                    </div>
                    <div>
                      <b>{mission.answers.filter((a) => a.hinted).length}</b>
                      <span>Hints explored</span>
                    </div>
                  </div>
                  <p className="muted">
                    {cloudMission?.id === mission.id
                      ? "Account practice · saved to your account · unranked"
                      : "Starter practice · saved on this device · unverified"}
                  </p>
                  <MissionInsights
                    mission={mission}
                    questions={[...questions, ...cloudQuestions]}
                    onConcept={setConceptId}
                    onReview={
                      cloudMission?.id === mission.id
                        ? undefined
                        : (ids) => {
                            setFeedback(null);
                            start("review", true, ids);
                          }
                    }
                  />
                  <SampleRanking mission={mission} />
                  <button
                    className="primary"
                    onClick={() => {
                      setActive(null);
                      setModal("auth");
                    }}
                  >
                    Save my progress <ArrowRight size={17} />
                  </button>
                  <button
                    className="text-button"
                    onClick={() => navigate("progress")}
                  >
                    See practice history
                  </button>
                </div>
              ) : (
                <>
                  <div className="mission-heading">
                    <span className="pill">
                      {cloudMission?.id === mission.id
                        ? "ACCOUNT PRACTICE"
                        : "STARTER MISSION"}
                    </span>
                    <span>
                      Question{" "}
                      {Math.min(
                        mission.answers.length + (feedback ? 0 : 1),
                        mission.questionIds.length,
                      )}{" "}
                      of {mission.questionIds.length}
                    </span>
                  </div>
                  <div className="mission-dots">
                    {mission.questionIds.map((id, i) => (
                      <span
                        key={id}
                        className={
                          i < mission.answers.length
                            ? "done"
                            : i === mission.answers.length
                              ? "current"
                              : ""
                        }
                      />
                    ))}
                  </div>
                  <div className="question-card">
                    <div className="eyebrow">
                      {topics.find((t) => t.id === mission.topic)?.unit ??
                        "MISTAKE REVISION"}
                    </div>
                    <h2>{(feedback?.question ?? q)?.stem}</h2>
                    {(feedback?.question ?? q)?.formula && (
                      <div className="formula">
                        <Formula value={(feedback?.question ?? q)!.formula!} />
                      </div>
                    )}
                    <div className="options">
                      {(feedback?.question ?? q)?.options.map((option, i) => (
                        <button
                          disabled={!!feedback}
                          key={option}
                          className={`option ${selected === i ? "selected" : ""} ${feedback && i === feedback.question.answer ? "correct" : ""} ${feedback && i === feedback.selected && i !== feedback.question.answer ? "incorrect" : ""}`}
                          onClick={() => setSelected(i)}
                        >
                          <span className="option-letter">{"ABCD"[i]}</span>
                          {option}
                          {selected === i && <Check size={18} />}
                        </button>
                      ))}
                    </div>
                    {hint && !feedback && (
                      <div className="hint-box">
                        <Lightbulb size={18} />
                        <p>{q?.hints?.[0]}</p>
                      </div>
                    )}
                    {feedback && (
                      <div
                        className={`feedback ${feedback.selected === feedback.question.answer ? "success" : "repair"}`}
                        role="status"
                      >
                        <b>
                          {feedback.selected === feedback.question.answer
                            ? "That’s right. Nicely done!"
                            : "A useful mistake. Let’s work through it."}
                        </b>
                        <p>{feedback.question.solution}</p>
                        {getConcept(feedback.question.conceptId) ? (
                          <div className="answer-concept">
                            <span>Linked concept</span>
                            <a
                              href={`#concept-${feedback.question.conceptId}`}
                              onClick={(event) => {
                                event.preventDefault();
                                setConceptId(feedback.question.conceptId!);
                              }}
                            >
                              <BookOpen size={16} />
                              Understand the concept:{" "}
                              {getConcept(feedback.question.conceptId)!.title}
                              <ArrowUpRight size={15} />
                            </a>
                            <small>
                              Open a short lesson without losing your place.
                            </small>
                          </div>
                        ) : (
                          <small>
                            Concept notes for this item are still in
                            preparation.
                          </small>
                        )}

                        {feedback.selected !== feedback.question.answer && (
                          <small>
                            {possibleError(
                              feedback.question,
                              feedback.selected,
                            )}
                          </small>
                        )}
                      </div>
                    )}
                    <div className="question-actions">
                      {feedback ? (
                        <>
                          <button
                            className="text-button"
                            onClick={() => setModal("report")}
                          >
                            <Flag size={15} /> Report a content issue
                          </button>
                          <button
                            className="primary"
                            disabled={busy}
                            onClick={next}
                          >
                            {mission.answers.length ===
                            mission.questionIds.length
                              ? "Finish mission"
                              : "Next question"}{" "}
                            <ArrowRight size={17} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="hint-button" onClick={showHint}>
                            <Lightbulb size={17} /> Explain this step
                          </button>
                          <button
                            className="primary"
                            disabled={selected === null || busy}
                            onClick={check}
                          >
                            Check answer <ArrowRight size={17} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="mission-disclaimer">
                    {cloudMission?.id === mission.id
                      ? "Account practice · no ranked or readiness evidence in this pilot"
                      : "Original starter content · educator review pending · no readiness or ranked evidence"}
                  </p>
                </>
              )}
            </section>
          ) : (
            <>
              {page === "practice" && (
                <>
                  <div className="page-heading">
                    <div>
                      <div className="eyebrow">NEET-UG · PHYSICS PRACTICE</div>
                      <h1>
                        NEET Physics, one concept at a time
                        <span className="coral">.</span>
                      </h1>
                      <p>
                        For Class 11 and 12 students and repeat aspirants
                        preparing for NEET-UG. Practise Physics concepts,
                        understand each answer and revisit mistakes.
                      </p>
                    </div>
                    <div className="date-chip">
                      NEET-UG <span>•</span> Physics only
                    </div>
                  </div>
                  <div className="dashboard-grid">
                    <div className="main-column">
                      <section className="hero-card">
                        <div className="hero-copy">
                          <span className="hero-tag">
                            <span /> YOUR NEXT SMALL WIN
                          </span>
                          <h2>
                            Six questions.
                            <br />
                            One step closer.
                          </h2>
                          <p>
                            Build your NEET Physics foundations with a short
                            starter mission.
                            <br />
                            Check each answer and learn the steps behind it.
                          </p>
                          <div className="hero-meta">
                            <span>
                              <Target size={15} />{" "}
                              {pending?.questionIds.length ?? 6} questions
                            </span>
                            <span>◷ &nbsp; About 8 minutes</span>
                          </div>
                          <button
                            className="primary"
                            disabled={!loaded}
                            onClick={() => start()}
                          >
                            {pending ? "Continue mission" : "Start my mission"}{" "}
                            <ArrowRight size={18} />
                          </button>
                          <small>No sign-up needed to get started</small>
                        </div>
                        <div className="orbit-art" aria-hidden="true">
                          <div className="orbit-ring ring-one" />
                          <div className="orbit-ring ring-two" />
                          <div className="orbit-ring ring-three" />
                          <div className="planet-core">
                            <span>F</span>
                            <small>= ma</small>
                          </div>
                          <div className="orbit-dot one" />
                          <div className="orbit-dot two" />
                          <div className="orbit-star">✧</div>
                          <span className="art-label a">
                            a little curiosity
                          </span>
                          <span className="art-label b">
                            a lot of possibility
                          </span>
                        </div>
                      </section>
                      <PreparationPath onTopics={() => navigate("topics")} />
                      <div className="stat-grid">
                        <article className="stat-card">
                          <span className="stat-icon peach">
                            <Flame size={19} />
                          </span>
                          <div>
                            <b>
                              {streak}{" "}
                              <small>day{streak !== 1 ? "s" : ""}</small>
                            </b>
                            <p>Practice streak</p>
                          </div>
                          <span className="stat-mini">Keep showing up</span>
                        </article>
                        <article className="stat-card">
                          <span className="stat-icon lavender">
                            <CheckCircle2 size={19} />
                          </span>
                          <div>
                            <b>{answers.length}</b>
                            <p>Questions explored</p>
                          </div>
                          <span className="stat-mini">Every one counts</span>
                        </article>
                        <article className="stat-card">
                          <span className="stat-icon green">
                            <Zap size={19} />
                          </span>
                          <div>
                            <b>{cloudXp}</b>
                            <p>Verified XP earned</p>
                          </div>
                          <span className="stat-mini">Grow at your pace</span>
                        </article>
                      </div>
                      <div className="section-heading">
                        <div>
                          <h2>Find your next “aha!”</h2>
                          <p>Big ideas, broken into small steps.</p>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => navigate("topics")}
                        >
                          All topics <ArrowUpRight size={16} />
                        </button>
                      </div>
                      <div className="topic-cards">
                        {[
                          {
                            id: "1-1",
                            title: "Electrostatics",
                            sub: "Start with a spark",
                            class: "peach",
                            icon: Zap,
                            formula: "F = k \\frac{q_1q_2}{r^2}",
                          },
                          {
                            id: "2-3",
                            title: "Current Electricity",
                            sub: "Go with the flow",
                            class: "lavender",
                            icon: Atom,
                            formula: "V = IR",
                          },
                          {
                            id: "3-6",
                            title: "Ray Optics",
                            sub: "See things differently",
                            class: "green",
                            icon: Target,
                            formula: "\\frac{1}{f}=\\frac{1}{v}-\\frac{1}{u}",
                          },
                        ].map((t) => (
                          <button
                            className="topic-card"
                            key={t.id}
                            onClick={() => start(t.id)}
                          >
                            <div className={`topic-visual ${t.class}`}>
                              <t.icon size={26} />
                              <Formula value={t.formula} />
                              <span className="decorative-plus">+</span>
                            </div>
                            <h3>{t.title}</h3>
                            <p>{t.sub}</p>
                            <div className="topic-footer">
                              <span>6 starter questions</span>
                              <span className="circle-arrow">
                                <ArrowUpRight size={17} />
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="gentle-note">
                        <span>✦</span>
                        <div>
                          <b>Understanding beats memorising.</b>
                          <p>
                            Get it wrong. Explore why. Try again. That’s where
                            the learning happens.
                          </p>
                        </div>
                      </div>
                    </div>
                    <aside className="right-column">
                      <section className="week-card">
                        <div className="card-heading">
                          <h3>Your rhythm</h3>
                          <Flame size={18} />
                        </div>
                        <p>A little consistency goes a long way.</p>
                        <div className="week-days">
                          {week.map((d, i) => (
                            <div key={i}>
                              <span>{d.label}</span>
                              <div
                                className={`${d.active ? "day-active" : ""} ${d.today ? "day-today" : ""}`}
                              >
                                {d.active ? (
                                  <Check size={15} />
                                ) : d.today ? (
                                  <span className="today-dot" />
                                ) : (
                                  "·"
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="week-foot">
                          <span className="dot" />
                          {days.size
                            ? "You’re building something good."
                            : "Your next chapter starts today."}
                        </div>
                      </section>
                      <section className="revision-card">
                        <div className="card-heading">
                          <span className="round-icon">
                            <RotateCcw size={19} />
                          </span>
                          <span className="tiny-label">MAKE IT STICK</span>
                        </div>
                        <h3>
                          A second look.
                          <br />A stronger concept.
                        </h3>
                        <p>
                          {mistakes.length
                            ? `${mistakes.length} practice mistake${mistakes.length === 1 ? "" : "s"} to explore. Turn a tricky moment into a clear one.`
                            : "Your tricky questions will find a home here. Come back to turn them into strengths."}
                        </p>
                        <button
                          className="outline-button"
                          onClick={() =>
                            mistakes.length
                              ? start("review", true)
                              : setToast(
                                  "Complete a mission first. Any mistakes will be ready to revisit here.",
                                )
                          }
                        >
                          Review mistakes <ArrowRight size={16} />
                        </button>
                      </section>
                      <section className="readiness-card">
                        <div className="card-heading">
                          <h3>A clearer picture</h3>
                          <ChartNoAxesCombined size={18} />
                        </div>
                        <div className="readiness-illustration">
                          <div />
                          <div />
                          <div />
                          <div />
                          <span>
                            <Sparkles size={19} />
                          </span>
                        </div>
                        <b>Readiness takes evidence.</b>
                        <p>
                          Topic insights unlock with reviewed, unassisted
                          practice. Starter demos don’t count toward readiness.
                        </p>
                        <button
                          className="text-button"
                          onClick={() => navigate("progress")}
                        >
                          Explore my progress <ArrowUpRight size={15} />
                        </button>
                      </section>
                    </aside>
                  </div>
                  <FeatureRoadmap onPlans={() => navigate("pricing")} />
                  <footer>
                    <span>
                      <Atom size={14} /> Built for understanding. Designed for
                      you.
                    </span>
                    <span>One concept at a time.</span>
                  </footer>
                </>
              )}
              {page === "topics" && (
                <>
                  <div className="page-heading">
                    <div>
                      <div className="eyebrow">
                        THE BIG PICTURE, IN SMALL STEPS
                      </div>
                      <h1>
                        Follow your curiosity<span className="coral">.</span>
                      </h1>
                      <p>
                        30 topics across three Physics units. Start with a
                        small, focused mission.
                      </p>
                    </div>
                  </div>
                  <div className="topic-toolbar">
                    <div className="filter-tabs">
                      {[
                        "All topics",
                        "Electrostatics",
                        "Current Electricity",
                        "Ray Optics",
                      ].map((f) => (
                        <button
                          key={f}
                          className={filter === f ? "active" : ""}
                          onClick={() => setFilter(f)}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    <label className="search">
                      <Search size={17} />
                      <input
                        placeholder="Find a concept"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="catalogue">
                    {topics
                      .filter(
                        (t) =>
                          (filter === "All topics" || filter === t.unit) &&
                          t.name.toLowerCase().includes(search.toLowerCase()),
                      )
                      .map((t) => (
                        <button
                          className="catalogue-card"
                          key={t.id}
                          onClick={() => start(t.id)}
                        >
                          <span
                            className={`topic-icon ${t.unit === "Electrostatics" ? "peach" : t.unit === "Ray Optics" ? "green" : "lavender"}`}
                          >
                            {t.icon}
                          </span>
                          <span className="eyebrow">{t.unit}</span>
                          <h3>{t.name}</h3>
                          <p>{t.description}</p>
                          <div>
                            <span>
                              {demoTopics.includes(t.id)
                                ? "Try starter mission"
                                : "Content in preparation"}
                            </span>
                            {demoTopics.includes(t.id) ? (
                              <ArrowUpRight size={18} />
                            ) : (
                              <Lock size={15} />
                            )}
                          </div>
                        </button>
                      ))}
                  </div>
                  <p className="muted content-note">
                    18 original starter questions are available in three topics.
                    Educator-reviewed content for the full syllabus is still in
                    preparation.
                  </p>
                </>
              )}
              {page === "progress" && (
                <>
                  <div className="page-heading">
                    <div>
                      <div className="eyebrow">
                        EVERY STEP IS PART OF THE STORY
                      </div>
                      <h1>
                        See how far you’ve come<span className="coral">.</span>
                      </h1>
                      <p>
                        Your practice history, without the pressure of
                        predictions.
                      </p>
                    </div>
                  </div>
                  <div className="progress-stats">
                    <div className="panel">
                      <CheckCircle2 />
                      <b>{finished.length}</b>
                      <span>Missions completed</span>
                    </div>
                    <div className="panel">
                      <Target />
                      <b>
                        {answers.length
                          ? Math.round((correct / answers.length) * 100) + "%"
                          : "—"}
                      </b>
                      <span>Starter practice accuracy</span>
                    </div>
                    <div className="panel">
                      <Flame />
                      <b>{days.size}</b>
                      <span>Days you showed up</span>
                    </div>
                  </div>
                  <div className="two-columns">
                    <section className="panel">
                      <h2>Recent practice</h2>
                      {missions.length ? (
                        missions
                          .slice()
                          .reverse()
                          .map((m) => (
                            <div className="history-row" key={m.id}>
                              <div className="stat-icon green">
                                <BookOpen size={19} />
                              </div>
                              <div>
                                <b>
                                  {topics.find((t) => t.id === m.topic)?.name ??
                                    "Mistake revision"}
                                </b>
                                <small>
                                  {new Date(m.startedAt).toLocaleDateString(
                                    "en",
                                    { month: "short", day: "numeric" },
                                  )}{" "}
                                  · {m.answers.length}/{m.questionIds.length}{" "}
                                  answered · Device only
                                </small>
                              </div>
                              <span className="pill">
                                {m.finished ? "Completed" : "In progress"}
                              </span>
                              <button
                                className="history-result-button"
                                onClick={() => {
                                  setFeedback(null);
                                  setSelected(null);
                                  setHint(false);
                                  setActive(m.id);
                                  window.scrollTo(0, 0);
                                }}
                              >
                                {m.finished ? "View results" : "Resume"}
                              </button>
                            </div>
                          ))
                      ) : (
                        <div className="empty-state">
                          <BookOpen size={35} />
                          <h3>A fresh page.</h3>
                          <p>Your first mission is the start of your story.</p>
                          <button
                            className="primary"
                            onClick={() => {
                              setPage("practice");
                              start();
                            }}
                          >
                            Try a mission <ArrowRight size={16} />
                          </button>
                        </div>
                      )}
                    </section>
                    <section className="panel">
                      <h2>Topic readiness</h2>
                      <p className="muted">
                        An honest picture needs enough fresh evidence.
                      </p>
                      {[
                        "Electrostatics",
                        "Current Electricity",
                        "Ray Optics",
                      ].map((t) => (
                        <div className="readiness-row" key={t}>
                          <b>{t}</b>
                          <span>Not enough evidence</span>
                          <div className="empty-track" />
                        </div>
                      ))}
                      <div className="hint-box">
                        <ShieldCheck size={20} />
                        <p>
                          Starter, offline and hinted practice never establish
                          secure readiness. No whole-Physics marks prediction is
                          made.
                        </p>
                      </div>
                    </section>
                  </div>
                  <SavedConcepts
                    ids={savedConcepts}
                    onConcept={setConceptId}
                    onRemove={removeConcept}
                  />
                </>
              )}
              {page === "friends" && (
                <>
                  <div className="page-heading">
                    <div>
                      <div className="eyebrow">BETTER, TOGETHER</div>
                      <h1>
                        Your own study circle<span className="coral">.</span>
                      </h1>
                      <p>
                        A little encouragement from people on the same journey.
                      </p>
                    </div>
                  </div>
                  <div className="circle-hero">
                    <div className="circle-art">
                      <Users size={72} />
                      <span>✧</span>
                    </div>
                    <h2>Small circle. Shared momentum.</h2>
                    <p>
                      Create a private space for your friends. Invite-only
                      groups,
                      <br />
                      with no public rankings or open chat.
                    </p>
                    {!user ? (
                      <button
                        className="primary"
                        onClick={() => setModal("auth")}
                      >
                        Sign in to get started <ArrowRight size={17} />
                      </button>
                    ) : (
                      <div className="group-forms">
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                              const d = await api("/api/v1/groups", {
                                name: groupName,
                              });
                              setGroups((g) => [...g, d.group]);
                              setGroupToken(d.invite);
                              setGroupName("");
                            } catch (err) {
                              setToast((err as Error).message);
                            }
                          }}
                        >
                          <input
                            aria-label="Circle name"
                            placeholder="Your circle’s name"
                            required
                            maxLength={50}
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                          />
                          <button className="primary">
                            Create circle <Plus size={16} />
                          </button>
                        </form>
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                              await api("/api/v1/groups/join", { invite });
                              const d = await api("/api/v1/groups");
                              setGroups(d.groups);
                              setInvite("");
                              setToast("You joined the circle.");
                            } catch (err) {
                              setToast((err as Error).message);
                            }
                          }}
                        >
                          <input
                            aria-label="Invite code"
                            placeholder="Paste an invite code"
                            required
                            value={invite}
                            onChange={(e) => setInvite(e.target.value)}
                          />
                          <button className="outline-button">
                            Join circle
                          </button>
                        </form>
                      </div>
                    )}
                    {groupToken && (
                      <div className="hint-box">
                        Invite expires in 7 days: <code>{groupToken}</code>
                        <button
                          onClick={() =>
                            navigator.clipboard
                              .writeText(groupToken)
                              .then(() => setToast("Invite copied."))
                              .catch(() =>
                                setToast("Select and copy the code."),
                              )
                          }
                        >
                          Copy
                        </button>
                      </div>
                    )}
                    {groups.map((g) => (
                      <div className="panel" key={g.id}>
                        {g.name}
                      </div>
                    ))}
                    <span className="muted">
                      Ranked challenges unlock after the reserved assessment
                      bank is reviewed.
                    </span>
                  </div>
                </>
              )}
              {page === "pricing" && (
                <>
                  <div className="page-heading">
                    <div>
                      <div className="eyebrow">MORE ROOM TO GROW</div>
                      <h1>
                        A small investment in your next step
                        <span className="coral">.</span>
                      </h1>
                      <p>
                        One simple monthly plan. No AI service. No complicated
                        bundles.
                      </p>
                    </div>
                  </div>
                  <div className="pricing-grid">
                    <section className="plan-card">
                      <span className="pill">THE FIRST STEP</span>
                      <h2>Explorer</h2>
                      <div className="price">
                        ₹0<span> / always</span>
                      </div>
                      <p>Discover your daily practice rhythm.</p>
                      <ul>
                        <li>
                          <Check />
                          Three starter topics
                        </li>
                        <li>
                          <Check />
                          18 original demo questions
                        </li>
                        <li>
                          <Check />
                          Step-by-step worked explanations
                        </li>
                        <li>
                          <Check />
                          Local progress & mistake revision
                        </li>
                      </ul>
                      <button
                        className="outline-button"
                        onClick={() => {
                          navigate("practice");
                          start();
                        }}
                      >
                        Start exploring <ArrowRight size={16} />
                      </button>
                    </section>
                    <section className="plan-card featured">
                      <span className="pill">PLANNED FOR THE PAID BETA</span>
                      <h2>
                        Physics Path Plus <Sparkles size={22} />
                      </h2>
                      <div className="price">
                        ₹149<span> / month</span>
                      </div>
                      <p>A focused home for your Physics preparation.</p>
                      <ul>
                        <li>
                          <Check />
                          Reviewed practice across 30 topics
                        </li>
                        <li>
                          <Check />
                          Adaptive six-question missions
                        </li>
                        <li>
                          <Check />
                          Cloud-saved progress & due reviews
                        </li>
                        <li>
                          <Check />
                          Topic readiness with evidence
                        </li>
                        <li>
                          <Check />
                          Private friend challenges
                        </li>
                      </ul>
                      <button
                        className="primary"
                        disabled={!config.billingEnabled}
                        onClick={upgrade}
                      >
                        {config.billingEnabled
                          ? "Continue to secure checkout"
                          : "Paid beta coming soon"}{" "}
                        <ArrowUpRight size={17} />
                      </button>
                      <small>
                        Billing is not active. No payment will be collected.
                      </small>
                    </section>
                  </div>
                  <div className="billing-note">
                    <ShieldCheck size={22} />
                    <p>
                      Future payments use Razorpay’s hosted checkout. Access
                      begins only after a verified payment. Cancellation keeps
                      access through your paid period. Pricing and refund terms
                      will be confirmed before launch.
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>
      <FeedbackPanel
        screen={active ? "mission" : page}
        questionId={feedback?.question.id ?? q?.id}
      />
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button aria-label="Dismiss message" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {conceptId && getConcept(conceptId) && (
        <ConceptDialog
          key={conceptId}
          concept={getConcept(conceptId)!}
          onClose={closeConcept}
          saved={savedConcepts.includes(conceptId)}
          onSave={() => saveConcept(conceptId)}
        />
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Close dialog"
              onClick={() => setModal(null)}
            >
              <X size={20} />
            </button>
            <div className="modal-icon">
              <Atom size={29} />
            </div>
            <h2 id="modal-title">
              {modal === "auth"
                ? "Keep your momentum."
                : modal === "report"
                  ? "Thanks for looking closely."
                  : "A thoughtful start."}
            </h2>
            {modal === "auth" ? (
              <>
                <p>
                  Starter practice is saved on this device. Google sign-in will
                  let you keep your progress across devices.
                </p>
                {config.accountsEnabled ? (
                  <button className="primary" onClick={signIn}>
                    Continue with Google <ArrowRight size={17} />
                  </button>
                ) : (
                  <div className="setup-notice">
                    <Lock size={18} />
                    <div>
                      <b>Accounts aren’t connected yet</b>
                      <p>
                        You can keep practising as a guest. Cloud sign-in will
                        be available when this pilot is configured.
                      </p>
                    </div>
                  </div>
                )}
                <small>No account required for the starter missions.</small>
              </>
            ) : modal === "report" ? (
              <>
                <p>
                  Content review is not connected yet. Note the question ID
                  below and share it with the pilot owner.
                </p>
                <code>{feedback?.question.id ?? "General feedback"}</code>
                <p className="muted">
                  All starter questions are development examples awaiting
                  educator review.
                </p>
              </>
            ) : (
              <>
                <p>
                  Physics Path is an early MVP for NEET Physics practice.
                  Starter questions are original development examples awaiting
                  educator review.
                </p>
                <p>
                  No live AI tutor, paid checkout or exam-score prediction is
                  active. Your guest history stays in this browser’s IndexedDB
                  storage.
                </p>
                <button
                  className="outline-button"
                  onClick={async () => {
                    if (
                      window.confirm(
                        "Delete all starter practice history and saved concepts from this device?",
                      )
                    ) {
                      setMissions([]);
                      try {
                        localStorage.removeItem("physics-path-saved-concepts");
                        setSavedConcepts([]);
                      } catch {
                        setToast(
                          "Practice history deleted; saved concepts could not be cleared.",
                        );
                      }
                      setActive(null);
                      setModal(null);
                      setToast("Device practice history deleted.");
                    }
                  }}
                >
                  Delete my device history
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
if ("serviceWorker" in navigator && import.meta.env.PROD)
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("/sw.js").catch(() => {}),
  );
