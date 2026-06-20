const fs = require('fs');
const path = require('path');

function fixture() {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '.fixture.json'), 'utf8')
  );
}

async function selectFixture(page) {
  const { project, environment } = fixture();
  await page.addInitScript(({ projectId, environmentId }) => {
    localStorage.setItem('selectedProjectId', String(projectId));
    localStorage.setItem('selectedEnvironmentId', String(environmentId));
  }, { projectId: project.id, environmentId: environment.id });
}

async function openFixturePage(page, route = '/') {
  await selectFixture(page);
  await page.goto(route);
}

module.exports = { fixture, selectFixture, openFixturePage };
