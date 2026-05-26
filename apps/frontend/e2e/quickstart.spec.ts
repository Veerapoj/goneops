import { expect, test } from "@playwright/test";

test("QuickStart generates a real project and opens README project page", async ({ page }) => {
  await page.goto("/quickstart");

  await expect(page.getByRole("heading", { name: "Generate, push, build, and sandbox locally." })).toBeVisible();
  await expect(page.getByText("Create Project", { exact: true })).toBeVisible();

  await page.getByLabel("Project Name:").fill("goneops-demo");
  await page.getByLabel("NestJS").check();
  await page.getByLabel("PostgreSQL").check();
  await page.getByLabel("Redis").check();
  await page.getByLabel("RabbitMQ").check();
  await expect(page.getByLabel("Generate README")).toBeChecked();
  await expect(page.getByLabel("Generate Docker Compose")).toBeChecked();
  await expect(page.getByLabel("Generate Woodpecker CI/CD")).toBeChecked();
  await expect(page.getByLabel("Generate Hello World")).toBeChecked();

  await page.getByRole("button", { name: "Generate Project" }).click();
  await page.waitForURL("**/quickstart/projects/goneops-demo");

  await expect(page.getByText("GoneOps QuickStart Project")).toBeVisible();
  await expect(page.getByText("Loaded from backend project URL")).toBeVisible();
  await expect(page.getByText("Project URL", { exact: true })).toBeVisible();
  await expect(page.getByText("Generated files")).toBeVisible();
  await expect(page.getByText("File Preview")).toBeVisible();
  await expect(page.getByText("# goneops-demo")).toBeVisible();
  await expect(page.getByText("docker compose up -d --build")).toBeVisible();
  await expect(page.getByText("curl http://localhost:${API_APP_PORT}/health")).toBeVisible();
  await page.getByRole("button", { name: "goneops-demo/.woodpecker.yml" }).click();
  await expect(page.getByText("Selected file")).toBeVisible();
  await expect(page.getByText("pipeline:")).toBeVisible();
  await expect(page.getByText("docker compose build")).toBeVisible();

  await page.goto("/quickstart/projects/goneops-demo/sandbox");
  await expect(page.getByText("QuickStart Sandbox")).toBeVisible();
  await expect(page.getByText("Build and startup validation logs")).toBeVisible();

  await page.goto("/quickstart");
  await expect(page.getByText("Created Projects")).toBeVisible();
  await page.getByRole("button", { name: /goneops-demo.*files/ }).click();
  await expect(page.getByRole("button", { name: "Delete selected project" })).toBeDisabled();
  await page.getByLabel("Confirm project name").fill("goneops-demo");
  await page.getByRole("button", { name: "Delete selected project" }).click();
  await expect(page.getByText("Deleted goneops-demo")).toBeVisible();
  await expect(page.getByRole("button", { name: /goneops-demo.*files/ })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("quickstart:goneops-demo"))).toBeNull();
  const deletedProject = await page.request.get("http://127.0.0.1:4100/quickstart/projects/goneops-demo");
  expect(deletedProject.status()).toBe(404);
});
