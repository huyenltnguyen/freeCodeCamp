'use strict';

// Applies 'status: waiting review' to open, non-draft PRs once CI passes. Two cases:
//   1. PRs with no status label — label is applied directly.
//   2. PRs with 'status: waiting update' — label is swapped once the author pushes new
//      commits, CI passes, and WAITING_REVIEW_WAIT_HOURS have elapsed since the last commit.
//   3. PRs labeled 'deprioritized' are always skipped

module.exports = async ({ github, context }) => {
  const waitHours = parseInt(process.env.WAITING_REVIEW_WAIT_HOURS, 10);
  const waitMs = waitHours * 60 * 60 * 1000;

  const prs = await github.paginate(github.rest.pulls.list, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    state: 'open',
    per_page: 100
  });

  const now = new Date();

  for (const pr of prs) {
    if (pr.draft) continue;

    const labels = pr.labels.map(l => l.name);
    const hasWaitingUpdate = labels.includes('status: waiting update');
    const hasAnyStatusLabel = labels.some(l => l.startsWith('status:'));

    // Skip PRs that are deprioritized
    if (labels.includes('deprioritized')) continue;

    // Skip PRs that have a status label other than 'status: waiting update'
    if (!hasWaitingUpdate && hasAnyStatusLabel) continue;

    // Check CI: all check runs must be completed and green
    const checkRuns = await github.paginate(github.rest.checks.listForRef, {
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: pr.head.sha,
      per_page: 100
    });

    if (checkRuns.length === 0) continue;

    // Deduplicate by name, keeping the most recent run per check.
    // Prefer completed_at (stable result time) over started_at, which can be
    // identical for matrix jobs queued simultaneously.
    const latestByName = new Map();
    for (const run of checkRuns) {
      const existing = latestByName.get(run.name);
      const runTime = new Date(run.completed_at || run.started_at);
      const existingTime = existing
        ? new Date(existing.completed_at || existing.started_at)
        : null;
      if (!existing || runTime > existingTime) {
        latestByName.set(run.name, run);
      }
    }

    const latest = [...latestByName.values()];
    const allGreen =
      latest.every(r => r.status === 'completed') &&
      latest.every(r => ['success', 'neutral', 'skipped'].includes(r.conclusion)) &&
      latest.some(r => r.conclusion === 'success');

    if (!allGreen) continue;

    if (hasWaitingUpdate) {
      // Find when 'status: waiting update' label was most recently applied
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
        .filter(e => e.event === 'labeled' && e.label?.name === 'status: waiting update')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      if (labelEvents.length === 0) continue;

      const labeledAt = new Date(labelEvents[0].created_at);

      const commits = await github.paginate(github.rest.pulls.listCommits, {
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: pr.number,
        per_page: 100
      });

      const newCommits = commits.filter(
        c => new Date(c.commit.author.date) > labeledAt
      );

      if (newCommits.length === 0) continue;

      const mostRecentCommit = newCommits.reduce((a, b) =>
        new Date(a.commit.author.date) > new Date(b.commit.author.date) ? a : b
      );

      const timeSinceLastCommit =
        now - new Date(mostRecentCommit.commit.author.date);

      if (timeSinceLastCommit < waitMs) continue;

      await github.rest.issues.removeLabel({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: pr.number,
        name: 'status: waiting update'
      });

      // Always add 'waiting review' after removing 'waiting update' — the cached
      // labels array is stale at this point and must not be used as a guard here.
      await github.rest.issues.addLabels({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: pr.number,
        labels: ['status: waiting review']
      });
    } else if (!labels.includes('status: waiting review')) {
      await github.rest.issues.addLabels({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: pr.number,
        labels: ['status: waiting review']
      });
    }
  }
};
