import { test, expect } from "@playwright/test";
test("complete six questions, revise mistakes, persist history and show honest billing", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "NEET Physics, one concept at a time." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start my mission" }).click();
  await expect(page.getByText("Question 1 of 6")).toBeVisible();
  await page.locator(".option").first().click();
  await page
    .getByRole("button", { name: "Explain this step", exact: true })
    .click();
  await expect(page.locator(".hint-box")).toBeVisible();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.locator(".feedback")).toContainText("0.6 N");
  await page
    .getByRole("button", { name: "Next question", exact: true })
    .click();
  await page.reload();
  await page
    .getByRole("button", { name: "Continue mission", exact: true })
    .click();
  await expect(page.getByText("Question 2 of 6")).toBeVisible();
  for (let i = 1; i < 6; i++) {
    await page.locator(".option").first().click();
    await page
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: i === 5 ? "Finish mission" : "Next question",
        exact: true,
      })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Look at you, showing up." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "See practice history" }).click();
  await expect(page.locator(".history-row")).toHaveCount(1);
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  await page
    .getByRole("button", { name: "Review mistakes", exact: true })
    .click();
  await expect(page.locator(".question-card")).toBeVisible();
  await page
    .getByRole("button", { name: "Back to practice", exact: false })
    .click();
  await page.getByRole("button", { name: "Explore Plus" }).click();
  await expect(
    page.getByRole("button", { name: "Paid beta coming soon" }),
  ).toBeDisabled();
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
});
test("360px viewport supports navigation, topic search and practice without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "NEET Physics, one concept at a time." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Topics", exact: true }).click();
  await page.getByPlaceholder("Find a concept").fill("Ohm");
  await expect(page.locator(".catalogue-card")).toHaveCount(1);
  await page.locator(".catalogue-card").click();
  await expect(page.locator(".question-card")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("offline shell and device history remain available after reload", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start my mission" }).click();
  await page.locator(".option").first().click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page
    .getByRole("button", { name: "Next question", exact: true })
    .click();
  if (process.env.E2E_BASE_URL) {
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page
      .getByRole("button", { name: "Continue mission", exact: true })
      .click();
  }
  await context.setOffline(true);
  if (process.env.E2E_BASE_URL) {
    await page.reload();
    await page
      .getByRole("button", { name: "Continue mission", exact: true })
      .click();
  }
  await expect(
    page.getByText("You’re offline.", { exact: false }),
  ).toBeVisible();
  await page.locator(".option").first().click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.locator(".feedback")).toBeVisible();
});
test("account mission uses server grading and records completion", async ({
  page,
}) => {
  const fixtures = (
    await import("../../app/demo.json", { with: { type: "json" } })
  ).default.slice(0, 6);
  let xp = 0;
  const submissions: any[] = [];
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = {};
    if (path === "/api/v1/config")
      data = {
        accountsEnabled: true,
        billingEnabled: false,
        contentReady: true,
      };
    else if (path === "/api/auth/get-session")
      data = { user: { id: "fixture-account", name: "Test learner" } };
    else if (path === "/api/v1/progress")
      data = { xp, missions: [], readiness: [] };
    else if (path === "/api/v1/groups") data = { groups: [] };
    else if (path === "/api/v1/missions/next")
      data = {
        id: "remote-mission",
        questions: fixtures.map(
          ({ answer, hints, solution, error, ...q }) => q,
        ),
        attempts: [],
      };
    else if (path.endsWith("/attempts")) {
      const body = route.request().postDataJSON();
      submissions.push(body);
      const q = fixtures.find((q) => q.id === body.item_version)!;
      data = {
        result: body.selected_option === q.answer ? "correct" : "incorrect",
        correct_option: q.answer,
        short_explanation: q.solution,
        error: q.error,
      };
    } else if (path.endsWith("/finish")) {
      xp = 10;
      data = { finished: true };
    } else if (path.endsWith("/hints"))
      data = { hints: ["A server-recorded hint."] };
    await route.fulfill({ json: data });
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Account connected" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start my mission" }).click();
  await expect(
    page.getByText("ACCOUNT PRACTICE", { exact: true }),
  ).toBeVisible();
  for (let i = 0; i < 6; i++) {
    await page.locator(".option").nth(fixtures[i].answer).click();
    await page
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await expect(page.locator(".feedback")).toContainText("That’s right.");
    await page
      .getByRole("button", {
        name: i === 5 ? "Finish mission" : "Next question",
        exact: true,
      })
      .click();
  }
  await expect(
    page.getByText("Account practice · saved to your account · unranked"),
  ).toBeVisible();
  expect(submissions).toHaveLength(6);
  expect(new Set(submissions.map((b) => b.attempt_id)).size).toBe(6);
});
test("feedback notes persist, export a usable report and can be deleted", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Give feedback" }).click();
  await expect(page.getByLabel("Your note")).toBeFocused();
  await page.getByLabel("Type of feedback").selectOption("Bug");
  await page
    .getByLabel("Your note")
    .fill("Please make the mission button easier to find.");
  await page.getByRole("button", { name: "Save note on this device" }).click();
  await expect(page.getByText("1 saved note", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Saved on this device");
  await page.reload();
  await page.getByRole("button", { name: "Give feedback" }).click();
  await expect(page.getByText("1 saved note", { exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download report" }).click();
  const download = await downloadPromise;
  const { readFileSync } = await import("node:fs");
  const report = JSON.parse(readFileSync((await download.path())!, "utf8"));
  expect(report.notes).toHaveLength(1);
  expect(report.notes[0]).toMatchObject({
    category: "Bug",
    screen: "practice",
    message: "Please make the mission button easier to find.",
  });
  expect(report).not.toHaveProperty("user");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete saved feedback" }).click();
  await expect(page.getByText("0 saved notes", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download report" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Give feedback" }),
  ).toBeFocused();
});
test("concept lessons, specific mistake analysis and sample ranking work from answer to result", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start my mission", exact: true })
    .click();
  await page.locator(".option").nth(1).click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  const firstConcept = page.getByRole("link", {
    name: "Understand the concept: Coulomb’s law",
  });
  await firstConcept.click();
  await expect(
    page.getByRole("dialog", { name: "Coulomb’s law" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(firstConcept).toBeFocused();
  await page
    .getByRole("button", { name: "Next question", exact: true })
    .click();
  await page.locator(".option").nth(2).click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.locator(".feedback")).toContainText(
    "inverse-distance scaling instead of inverse-square scaling",
  );
  await page
    .getByRole("link", {
      name: "Understand the concept: Inverse-square scaling",
    })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Inverse-square scaling" }),
  ).toBeVisible();
  await expect(
    page.getByText("The separation doubles while both charges stay unchanged."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save concept for review", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Saved for review", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Back to my practice" }).click();
  await expect(page.locator(".feedback")).toBeVisible();
  await page
    .getByRole("button", { name: "Next question", exact: true })
    .click();
  for (const [index, selected] of [1, 0, 2, 1].entries()) {
    await page.locator(".option").nth(selected).click();
    await page
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: index === 3 ? "Finish mission" : "Next question",
        exact: true,
      })
      .click();
  }
  const pattern = page.locator(".pattern-card").filter({
    has: page.getByRole("heading", {
      name: "Inverse-square scaling",
      exact: true,
    }),
  });
  await expect(pattern).toContainText("1 missed / 1 answered");
  await expect(pattern).toContainText("inverse-distance scaling");
  await expect(
    page.getByRole("heading", { name: "Your rank in a sample group" }),
  ).toBeVisible();
  await expect(page.locator(".ranking-you")).toContainText("19");
  await expect(page.locator(".ranking-you")).toContainText("#2");
  await expect(page.locator(".sample-ranking")).toContainText(
    "All other learners and results below are made up",
  );
  await page.screenshot({
    path: "test-results/concept-result.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "See practice history" }).click();
  await expect(page.locator(".saved-concepts")).toContainText(
    "Inverse-square scaling",
  );
  await page.reload();
  await page.getByRole("button", { name: "My progress", exact: true }).click();
  await page.locator(".saved-concept-link").click();
  await expect(
    page.getByRole("dialog", { name: "Inverse-square scaling" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to my practice" }).click();
  await page.getByRole("button", { name: "View results", exact: true }).click();
  const savedResult = page
    .locator(".pattern-card")
    .filter({
      has: page.getByRole("heading", {
        name: "Inverse-square scaling",
        exact: true,
      }),
    });
  await savedResult
    .getByRole("button", { name: "Revisit these questions" })
    .click();
  await expect(page.getByText("Question 1 of 1")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "The distance between two point charges is doubled. Their electrostatic force becomes:",
    }),
  ).toBeVisible();
  await page.locator(".option").nth(3).click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page
    .getByRole("button", { name: "Finish mission", exact: true })
    .click();
  await expect(page.locator(".insights-positive")).toContainText(
    "No missed or hinted answers",
  );
  await page.setViewportSize({ width: 360, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/concept-result-mobile.png",
    fullPage: true,
  });
});
