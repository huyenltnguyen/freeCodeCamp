'use strict';

// Closes PRs labeled 'deprioritized' if the author has not pushed any commits or
// left a comment since the label was applied. Runs on a grace period defined by
// DEPRIORITIZED_CLOSE_HOURS before taking action.

module.exports = async ({ github, context }) => {
  const closeHours = parseInt(process.env.DEPRIORITIZED_CLOSE_HOURS, 10);
  const closeMs = closeHours * 60 * 60 * 1000;
  const footer =
    '\n\n---\nJoin us in our [chat room](https://discord.gg/PRyKn3Vbay) or our [forum](https://forum.freecodecamp.org/c/contributors/3) if you have any questions or need help with contributing.';
  const closingBody =
    [
      'Hey there,',
      '',
      'Thank you for opening this pull request.',
      '',
      "This is a standard message notifying you that we've reviewed your pull request and have decided not to merge it. We would welcome future pull requests from you.",
      '',
      'Thank you and happy coding.'
    ].join('\n') + footer;

  const prs = await github.paginate(github.rest.issues.listForRepo, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    state: 'open',
    labels: 'deprioritized',
    per_page: 100
  });

  const now = new Date();

  for (const pr of prs) {
    if (!pr.pull_request) continue;

    // Find when 'deprioritized' label was most recently added
    const timeline = await github.paginate(
      github.rest.issues.listEventsForTimeline,
      {
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: pr.number,
        per_page: 100
      }
    );

    const labelEvents = timeline
      .filter(e => e.event === 'labeled' && e.label?.name === 'deprioritized')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (labelEvents.length === 0) continue;

    const labeledAt = new Date(labelEvents[0].created_at);
    if (now - labeledAt < closeMs) continue;

    // Check for author activity (commits or comments by PR author) after label was added
    const author = pr.user.login;
    const [commits, comments] = await Promise.all([
      github.paginate(github.rest.pulls.listCommits, {
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: pr.number,
        per_page: 100
      }),
      github.paginate(github.rest.issues.listComments, {
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: pr.number,
        per_page: 100
      })
    ]);

    const hasAuthorActivity =
      commits.some(c => new Date(c.commit.author.date) > labeledAt) ||
      comments.some(c => c.user?.login === author && new Date(c.created_at) > labeledAt);

    if (hasAuthorActivity) continue;

    // Verify PR is still open before acting
    const { data: prData } = await github.rest.pulls.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: pr.number
    });
    if (prData.state !== 'open') continue;

    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: pr.number,
      body: closingBody
    });
    await github.rest.pulls.update({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: pr.number,
      state: 'closed'
    });
  }
};
