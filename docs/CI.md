# CI / Verification

Run the same checks locally:

```bash
npm run verify
```

This executes:

- `node --check lib/client.js`
- `node --check lib/index.js`
- `node --test test/*.test.mjs`

## GitHub Actions

A workflow file cannot be pushed by an OAuth App that lacks the `workflow` scope. If the repository
owner wants CI, add `.github/workflows/check.yml` from the GitHub web UI:

```yaml
name: check
on:
  push:
  pull_request:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm run verify
```

Alternatively, run `gh auth refresh -s workflow` and push the workflow from a machine with the
updated token.
