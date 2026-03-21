'use strict';

const { FOOTER } = require('./constants.js');

const TEMPLATE_BLOCK = [
  '```md',
  'Checklist:',
  '',
  '<!-- Please follow this checklist and put an x in each of the boxes, like this: [x]. It will ensure that our team takes your pull request seriously. -->',
  '',
  '- [ ] I have read and followed the [contribution guidelines](https://contribute.freecodecamp.org).',
  '- [ ] I have read and followed the [how to open a pull request guide](https://contribute.freecodecamp.org/how-to-open-a-pull-request/).',
  "- [ ] My pull request targets the `main` branch of freeCodeCamp.",
  '- [ ] I have tested these changes either locally on my machine, or GitHub Codespaces.',
  '',
  '<!--If your pull request closes a GitHub issue, replace the XXXXX below with the issue number.-->',
  '',
  'Closes #XXXXX',
  '',
  '<!-- Feel free to add any additional description of changes below this line -->',
  '```'
].join('\n');

// Returns true if the PR body passes the template check.
function check(body) {
  const lowerBody = (body || '').toLowerCase();
  const templatePresent = lowerBody.includes('checklist:');
  const requiredCheckboxes = [
    'i have read and followed the contribution guidelines',
    'i have read and followed the how to open a pull request guide',
    'my pull request targets the'
  ];
  // Strip markdown links ([text](url) → text) before matching so contributors
  // who omit the link syntax (e.g. type plain text) still pass the check.
  const normalizedBody = lowerBody
    .replace(/\[\s*x\s*\]/g, '[x]')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  const allRequiredChecked = requiredCheckboxes.every(checkbox =>
    normalizedBody.includes(`[x] ${checkbox}`)
  );
  return templatePresent && allRequiredChecked;
}

module.exports = async ({ github, context, isAllowListed }) => {
  if (isAllowListed === 'true') return;

  const body = context.payload.pull_request.body || '';
  if (check(body)) return;

  await github.rest.issues.addLabels({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.payload.pull_request.number,
    labels: ['deprioritized']
  });

  await github.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.payload.pull_request.number,
    body:
      [
        'Hi there,',
        '',
        'Thank you for the contribution.',
        '',
        "Please add back the following template to the PR description and complete the checklist items. We won't be able to review this PR until then.",
        '',
        TEMPLATE_BLOCK
      ].join('\n') + FOOTER
  });
};

module.exports.check = check;
