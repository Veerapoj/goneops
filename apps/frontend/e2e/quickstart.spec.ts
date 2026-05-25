import { expect, test } from "@playwright/test";

test("QuickStart generates a real project and opens README project page", async ({ page }) => {
  await page.goto("/quickstart");

  await expect(page.getByRole("heading", { name: "Generate a runnable local project." })).toBeVisible();
  await expect(page.getByText("Create Project", { exact: true })).toBeVisible();

  await page.getByLabel("Project Name:").fill("goneops-demo");
  await page.getByLabel("NestJS").check();
  await page.getByLabel("PostgreSQL").check();
  await page.getByLabel("Redis").check();
  await page.getByLabel("RabbitMQ").check();
  await expect(page.getByLabel("Generate README")).toBeChecked();
  await expect(page.getByLabel("Generate Docker Compose")).toBeChecked();
  await expect(page.getByLabel("Generate CI/CD")).toBeChecked();
  await expect(page.getByLabel("Generate Hello World")).toBeChecked();

  await page.getByRole("button", { name: "Generate Project" }).click();
  await page.waitForURL("**/quickstart/projects/goneops-demo");

  await expect(page.getByText("GoneOps QuickStart Project")).toBeVisible();
  await expect(page.getByText("Loaded from backend project URL")).toBeVisible();
  await expect(page.getByText("Project URL", { exact: true })).toBeVisible();
  await expect(page.getByText("Generated files")).toBeVisible();
  await expect(page.getByText("File Preview")).toBeVisible();
  await expect(page.getByText("# goneops-demo")).toBeVisible();
  await expect(page.getByText("docker compose up --build")).toBeVisible();
  await expect(page.getByText("curl http://localhost:${API_APP_PORT}/health")).toBeVisible();
  await page.getByRole("button", { name: "goneops-demo/.github/workflows/ci.yml" }).click();
  await expect(page.getByText("Selected file")).toBeVisible();
  await expect(page.getByText("name: quickstart-ci")).toBeVisible();
  await expect(page.getByText("actions/checkout@v4")).toBeVisible();
});
