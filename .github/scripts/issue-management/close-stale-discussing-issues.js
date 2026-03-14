'use strict';

// Closes issues labeled 'status: discussing' if there has been no comment activity
// since the label was applied. Uses the label-applied date as the baseline, falling
// back to issue creation date if no label event is found. Adds 'status: decayed'
// before closing.

module.exports = async ({ github, context }) => {
  const staleDays = parseInt(process.env.DISCUSSING_CLOSE_DAYS, 10);
  const staleMs = staleDays * 24 * 60 * 60 * 1000;
  const footer =
    '\n\n---\nJoin us in our [chat room](https://discord.gg/PRyKn3Vbay) or our [forum](https://forum.freecodecamp.org/c/contributors/3) if you have any questions or need help with contributing.';
  const closingBody =
    [
      'Hey there,',
      '',
      'This issue is being closed due to inactivity. If you believe this is still relevant, please feel free to reopen it or open a new issue with updated context.',
      '',
      'Thank you for your contribution to the discussion.'
    ].join('\n') + footer;

  const issues = await github.paginate(github.rest.issues.listForRepo, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    state: 'open',
    labels: 'status: discussing',
    per_page: 100
  });

  const now = new Date();

  for (const issue of issues) {
    // Skip pull requests (the issues API returns both)
    if (issue.pull_request) continue;

    // Find when 'status: discussing' label was most recently added
    const timeline = await github.paginate(
      github.rest.issues.listEventsForTimeline,
      {
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issue.number,
        per_page: 100
      }
    );

    const labelEvents = timeline
      .filter(e => e.event === 'labeled' && e.label?.name === 'status: discussing')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const baselineDate =
      labelEvents.length > 0
        ? new Date(labelEvents[0].created_at)
        : new Date(issue.created_at);

    const comments = await github.paginate(github.rest.issues.listComments, {
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      per_page: 100
    });

    // Use the last comment date if any comments exist after the baseline
    // Exclude bot comments — only human activity should reset the stale timer.
    const humanComments = comments.filter(c => c.user?.type !== 'Bot');
    const lastCommentDate =
      humanComments.length > 0
        ? new Date(humanComments[humanComments.length - 1].created_at)
        : null;

    const referenceDate =
      lastCommentDate && lastCommentDate > baselineDate
        ? lastCommentDate
        : baselineDate;

    if (now - referenceDate < staleMs) continue;

    await github.rest.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      labels: ['status: decayed']
    });
    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      body: closingBody
    });
    await github.rest.issues.update({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      state: 'closed'
    });
  }
};
