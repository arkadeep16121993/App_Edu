import {
  ArrowUpRight,
  BookOpen,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

export function PreparationPath({ onTopics }: { onTopics: () => void }) {
  const steps = [
    {
      title: "Choose a concept",
      description:
        "Start with a topic in Electrostatics, Current Electricity or Ray Optics.",
    },
    {
      title: "Practise six questions",
      description:
        "Work through a short mission. Choose an answer, then check it.",
    },
    {
      title: "Understand the answer",
      description:
        "Use a hint when you need it and read the worked explanation.",
    },
    {
      title: "Revisit your mistakes",
      description:
        "Return to tricky questions and keep building your understanding.",
    },
  ];
  return (
    <section
      className="preparation-path"
      aria-labelledby="preparation-path-title"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR NEXT STEPS</span>
          <h2 id="preparation-path-title">A clear path through Physics</h2>
        </div>
        <button className="text-button" onClick={onTopics}>
          Explore topics <ArrowUpRight size={16} />
        </button>
      </div>
      <ol className="preparation-steps">
        {steps.map((step, index) => (
          <li key={step.title}>
            <span className="step-number" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </li>
        ))}
      </ol>
      <p className="path-scope">
        Start with the free demo. This pilot covers Physics practice; Biology,
        Chemistry and full NEET mock tests are outside its current scope.
      </p>
    </section>
  );
}

export function FeatureRoadmap({ onPlans }: { onPlans: () => void }) {
  const available = [
    {
      icon: Target,
      title: "Short starter missions",
      description:
        "18 demo questions across three starter topics. Six questions per mission, with no sign-up needed.",
    },
    {
      icon: Lightbulb,
      title: "Explanations and linked concept lessons",
      description:
        "Check an answer, open its concept lesson and save the idea to revisit later.",
    },
    {
      icon: RotateCcw,
      title: "Mistake analysis and practice history",
      description:
        "See which question types caused difficulty, then revisit those questions. Guest history stays on this device.",
    },
  ];
  available.push({
    icon: Users,
    title: "A sample group ranking",
    description:
      "See your mission score beside fictional learners. This demonstrates rankings; it is not a live comparison.",
  });
  const planned = [
    {
      icon: BookOpen,
      title: "An educator-reviewed question bank",
      description:
        "A target of 600 questions across 30 Physics topics, including reserved assessment questions.",
    },
    {
      icon: Sparkles,
      title: "Adaptive practice and topic readiness",
      description:
        "Practice guided by recent mistakes and due reviews, with readiness based on enough fresh evidence.",
    },
    {
      icon: Users,
      title: "Cloud progress, friend challenges and Plus",
      description:
        "Google sign-in, progress across devices and private challenges. A ₹149/month plan is planned for the paid beta.",
    },
  ];
  return (
    <section
      className="feature-roadmap"
      aria-labelledby="feature-roadmap-title"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">THE PILOT & THE PLAN</span>
          <h2 id="feature-roadmap-title">
            What you can do now. What comes next.
          </h2>
          <p>Try the starter experience and help shape the next release.</p>
        </div>
      </div>
      <div className="roadmap-columns">
        <section
          className="roadmap-panel available-panel"
          aria-labelledby="available-features-title"
        >
          <div className="roadmap-panel-heading">
            <h3 id="available-features-title">Available in this MVP</h3>
            <span className="release-label available-label">TRY IT NOW</span>
          </div>
          <ul>
            {available.map((feature) => (
              <li key={feature.title}>
                <span className="roadmap-icon">
                  <feature.icon size={19} />
                </span>
                <div>
                  <h4>{feature.title}</h4>
                  <p>{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="roadmap-note">
            Starter questions are demo content awaiting educator review. Demo
            results do not establish topic readiness or predict NEET marks.
          </p>
        </section>
        <section
          className="roadmap-panel planned-panel"
          aria-labelledby="planned-features-title"
        >
          <div className="roadmap-panel-heading">
            <h3 id="planned-features-title">Coming in future releases</h3>
            <span className="release-label planned-label">PLANNED</span>
          </div>
          <ul>
            {planned.map((feature) => (
              <li key={feature.title}>
                <span className="roadmap-icon">
                  <feature.icon size={19} />
                </span>
                <div>
                  <h4>{feature.title}</h4>
                  <p>{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="roadmap-note">
            These features are not live in the starter preview. Release dates
            are not set, and payments are not active.
          </p>
          <button className="text-button" onClick={onPlans}>
            See the planned Plus plan <ArrowUpRight size={15} />
          </button>
        </section>
      </div>
    </section>
  );
}
