'use strict';

const { check: checkTemplate } = require('./check-pr-template.js');
const { check: checkLinkedIssue } = require('./check-linked-issue.js');

module.exports = async ({ github, context }) => {
  const { owner, repo } = context.repo;

  // issues.listForRepo returns both issues and PRs; we filter to PRs below.
  const deprioritizedItems = await github.paginate(
    github.rest.issues.listForRepo,
    {
      owner,
      repo,
      state: 'open',
      labels: 'deprioritized',
      per_page: 100
    }
  );

  for (const item of deprioritizedItems) {
    if (!item.pull_request) continue;

    const { data: pr } = await github.rest.pulls.get({
      owner,
      repo,
      pull_number: item.number
    });

    const body = pr.body || '';
    const prAuthor = pr.user.login;

    const passesTemplate = checkTemplate(body);
    if (!passesTemplate) continue;

    const linkedIssueCheck = await checkLinkedIssue(body, prAuthor, github, {
      owner,
      repo
    });
    if (!linkedIssueCheck.pass) continue;

    await github.rest.issues.removeLabel({
      owner,
      repo,
      issue_number: pr.number,
      name: 'deprioritized'
    });
  }
};
