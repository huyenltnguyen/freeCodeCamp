'use strict';

const { FOOTER } = require('./constants.js');

function parseIssueNumbers(body) {
  const regex = /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;
  const issueNumbers = new Set();
  let match;
  while ((match = regex.exec(body)) !== null) {
    issueNumbers.add(parseInt(match[1], 10));
  }
  return [...issueNumbers];
}

async function fetchIssues(issueNumbers, github, repo) {
  const fetchedIssues = await Promise.all(
    issueNumbers.map(issueNumber =>
      github.rest.issues
        .get({ owner: repo.owner, repo: repo.repo, issue_number: issueNumber })
        .then(({ data }) => data)
        .catch(() => null)
    )
  );
  return fetchedIssues.filter(Boolean);
}

// Returns { pass: boolean, reason: string }.
async function check(body, prAuthor, github, repo) {
  const issueNumbers = parseIssueNumbers(body);
  if (issueNumbers.length === 0) return { pass: false, reason: 'no_issue' };

  const linkedIssues = await fetchIssues(issueNumbers, github, repo);
  if (linkedIssues.length === 0) return { pass: false, reason: 'no_issue' };

  const hasWaitingTriage = linkedIssues.some(issue =>
    issue.labels.some(label => label.name === 'status: waiting triage')
  );
  if (hasWaitingTriage) return { pass: false, reason: 'waiting_triage' };

  const isNaomiSprintAssignee = linkedIssues.some(
    issue =>
      issue.labels.some(label => label.name === "Naomi's Sprints") &&
      issue.assignees.some(assignee => assignee.login === prAuthor)
  );
  if (isNaomiSprintAssignee) return { pass: true, reason: 'naomi_sprint' };

  const isOpenForContribution = linkedIssues.some(issue =>
    issue.labels.some(
      label => label.name === 'help wanted' || label.name === 'first timers only'
    )
  );
  return {
    pass: isOpenForContribution,
    reason: isOpenForContribution ? 'ok' : 'not_open'
  };
}

module.exports = async ({ github, context, isAllowListed }) => {
  if (isAllowListed === 'true') return;

  const pr = context.payload.pull_request;
  const repo = context.repo;
  const checkResult = await check(pr.body || '', pr.user.login, github, repo);

  if (checkResult.pass) {
    if (checkResult.reason === 'naomi_sprint') {
      await github.rest.issues.addLabels({
        owner: repo.owner,
        repo: repo.repo,
        issue_number: pr.number,
        labels: ["Naomi's Sprints"]
      });
    }
    return;
  }

  await github.rest.issues.addLabels({
    owner: repo.owner,
    repo: repo.repo,
    issue_number: pr.number,
    labels: ['deprioritized']
  });

  const messages = {
    no_issue: [
      'Hi there,',
      '',
      'Thanks for opening this pull request.',
      '',
      'We kindly ask that contributors open an issue before submitting a PR so the change can be discussed and approved before work begins. This helps avoid situations where significant effort goes into something we ultimately cannot merge.',
      '',
      'Please open an issue first and allow it to be triaged. Once the issue is open for contribution, you are welcome to update this pull request to reflect the issue consensus. Until then, we will not be able to review your pull request.'
    ].join('\n'),
    waiting_triage: [
      'Hi there,',
      '',
      'Thanks for opening this pull request.',
      '',
      'The linked issue has not been triaged yet, and a solution has not been agreed upon. Once the issue is open for contribution, you are welcome to update this pull request to reflect the issue consensus. Until then, we will not be able to review your pull request.'
    ].join('\n'),
    not_open: [
      'Hi there,',
      '',
      'Thanks for opening this pull request.',
      '',
      'The linked issue is not open for contribution. If you are looking for issues to contribute to, please check out issues labeled [`help wanted`](https://github.com/freeCodeCamp/freeCodeCamp/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22) or [`first timers only`](https://github.com/freeCodeCamp/freeCodeCamp/issues?q=is%3Aissue+is%3Aopen+label%3A%22first+timers+only%22).'
    ].join('\n')
  };

  await github.rest.issues.createComment({
    owner: repo.owner,
    repo: repo.repo,
    issue_number: pr.number,
    body: messages[checkResult.reason] + FOOTER
  });
};

module.exports.check = check;
