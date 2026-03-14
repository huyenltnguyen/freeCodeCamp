'use strict';

// Manages PRs labeled 'status: waiting update' that have had no author activity since
// the label was applied. 
// Posts a reminder after WAITING_UPDATE_REMINDER_DAYS, 
// asking the author to push a new commit, leave a comment, 
// or react with 👀 to keep the PR open. 
// Closes and adds 'status: decayed' after WAITING_UPDATE_CLOSE_DAYS if still inactive.

module.exports = async ({ github, context }) => {
  const reminderDays = parseInt(process.env.WAITING_UPDATE_REMINDER_DAYS, 10);
  const closeDays = parseInt(process.env.WAITING_UPDATE_CLOSE_DAYS, 10);
  const reminderMs = reminderDays * 24 * 60 * 60 * 1000;
  const closeMs = closeDays * 24 * 60 * 60 * 1000;
  const reminderMarker = '<!-- bot: waiting-update-reminder -->';
  const footer =
    '\n\n---\nJoin us in our [chat room](https://discord.gg/PRyKn3Vbay) or our [forum](https://forum.freecodecamp.org/c/contributors/3) if you have any questions or need help with contributing.';
  const closingBody =
    [
      'Hey there,',
      '',
      "This PR has been waiting for an update for a while without any recent activity, so we're closing it to keep the queue tidy. If you're still working on it, feel free to reopen it or open a new PR when it's ready.",
      '',
      'Thank you for your contribution and happy coding.'
    ].join('\n') + footer;

  const prs = await github.paginate(github.rest.issues.listForRepo, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    state: 'open',
    labels: 'status: waiting update',
    per_page: 100
  });

  const now = new Date();

  for (const pr of prs) {
    if (!pr.pull_request) continue;

    const author = pr.user.login;

    // Find when 'status: waiting update' label was most recently added
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
    const elapsed = now - labeledAt;

    // Check for author activity (commits, comments, or reaction to reminder) after label was added
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

    const hasCommitOrCommentActivity =
      commits.some(c => new Date(c.commit.author.date) > labeledAt) ||
      comments.some(c => c.user?.login === author && new Date(c.created_at) > labeledAt);

    // Only check reactions if commits and comments haven't already established activity,
    // to avoid an unnecessary API call for the common case.
    let authorReacted = false;
    if (!hasCommitOrCommentActivity) {
      const reminderComment = comments.findLast(
        c => c.user?.login === 'github-actions[bot]' && c.body.includes(reminderMarker)
      );
      if (reminderComment) {
        authorReacted = await github.paginate(github.rest.reactions.listForIssueComment, {
          owner: context.repo.owner,
          repo: context.repo.repo,
          comment_id: reminderComment.id,
          per_page: 100
        }).then(reactions =>
          reactions.some(
            r =>
              r.user?.login === author &&
              r.content === 'eyes' &&
              new Date(r.created_at) > labeledAt
          )
        );
      }
    }

    const hasAuthorActivity = hasCommitOrCommentActivity || authorReacted;

    if (hasAuthorActivity) continue;

    if (elapsed >= closeMs) {
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
    } else if (elapsed >= reminderMs) {
      // Skip if a bot reminder was already posted in the last 7 days
      const recentBotReminder = comments.some(
        c =>
          c.user?.login === 'github-actions[bot]' &&
          c.body.includes(reminderMarker) &&
          new Date(c.created_at) > new Date(now - reminderMs)
      );
      if (recentBotReminder) continue;

      await github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: pr.number,
        body:
          [
            reminderMarker,
            `Hey @${author} — it's been a while since we last heard from you on this PR. Are you still working on it?`,
            '',
            "To keep this PR open, push a new commit, leave a comment, or react to this message with 👀 — otherwise it will be automatically closed in a week. If you're blocked or need help, feel free to let us know!"
          ].join('\n') + footer
      });
    }
  }
};
