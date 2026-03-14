'use strict';

// Closes draft PRs that have had no author activity (commits or comments) within
// the rolling window defined by STALE_DRAFT_DAYS. Adds 'status: decayed' before closing.

module.exports = async ({ github, context }) => {
  const staleDays = parseInt(process.env.STALE_DRAFT_DAYS, 10);
  const staleMs = staleDays * 24 * 60 * 60 * 1000;
  const footer =
    '\n\n---\nJoin us in our [chat room](https://discord.gg/PRyKn3Vbay) or our [forum](https://forum.freecodecamp.org/c/contributors/3) if you have any questions or need help with contributing.';
  const closingBody =
    [
      'Hey there,',
      '',
      "This draft PR has been open for a while without any recent activity, so we're closing it to keep the queue tidy. If you're still working on it, feel free to reopen it or open a new PR when it's ready.",
      '',
      'Thank you for your contribution and happy coding.'
    ].join('\n') + footer;

  const prs = await github.paginate(github.rest.pulls.list, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    state: 'open',
    per_page: 100
  });

  const now = new Date();

  for (const pr of prs) {
    if (!pr.draft) continue;

    const author = pr.user.login;
    const cutoff = new Date(now - staleMs);

    // Skip PRs that have been updated recently — updated_at is a conservative
    // upper bound on any activity, so if it's within the window the PR is not stale.
    if (new Date(pr.updated_at) > cutoff) continue;

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

    const hasRecentActivity =
      commits.some(c => new Date(c.commit.author.date) > cutoff) ||
      comments.some(c => c.user?.login === author && new Date(c.created_at) > cutoff);

    if (hasRecentActivity) continue;

    // Verify PR is still open before acting
    const { data: prData } = await github.rest.pulls.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: pr.number
    });
    if (prData.state !== 'open') continue;

    await github.rest.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: pr.number,
      labels: ['status: decayed']
    });
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
