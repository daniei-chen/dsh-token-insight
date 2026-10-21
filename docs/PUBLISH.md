# Publish to npm

The package name `dsh-token-insight` is currently unused on npm (verified during development).
Publishing is optional; installing from GitHub with `node scripts/install.mjs` works without npm.

```bash
npm login
npm pack --dry-run   # inspect the tarball
npm publish --access public
```

After publishing:

```bash
npm view dsh-token-insight version
```

Recommended before publishing:

- `npm run verify`
- update `version` and `CHANGELOG.md`
- take fresh light/dark/mobile screenshots for `docs/`
- confirm `package.json` `repository`, `homepage`, `bugs` still point to
  `https://github.com/daniei-chen/dsh-token-insight`
