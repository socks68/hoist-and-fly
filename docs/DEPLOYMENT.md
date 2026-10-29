# Deploying

The website is the `site/` folder: `index.html` plus `flags/`. It is plain static files, so any static host works, there is no build step on the server, and HTTPS and caching are handled by the host. Keep `index.html` and `flags/` side by side.

Progress is saved in each visitor's browser on any host. Saving to an account only happens in the version published on Claude (see the end of this page).

## Option 1: Netlify Drop (no account needed to try it)

1. Go to [netlify.com/drop](https://netlify.com/drop) and drag the `site` folder onto the page.
2. You get a live link within seconds. Sign up (free) and claim the site to keep it; unclaimed drops expire.
3. To update later, open the site in Netlify, go to **Deploys**, and drag the new `site` folder onto the deploy area.

## Option 2: Netlify connected to this repository (updates on every push)

1. In Netlify, add a new site and import this repository from GitHub.
2. Leave the build command empty. The included `netlify.toml` already tells Netlify to publish `site/`.
3. Every push to the main branch redeploys the site.

## Option 3: Cloudflare Pages

Create a Pages project from this repository with **no build command** and **`site`** as the build output directory, or upload the `site` folder directly.

## Option 4: GitHub Pages

GitHub Pages can only serve a repository's root or `/docs` folder directly, so publish `site/` with a small workflow:

1. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Add this file as `.github/workflows/pages.yml` and push:

```yaml
name: Deploy site to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v5
      - uses: actions/upload-pages-artifact@v5
        with:
          path: site
      - id: deployment
        uses: actions/deploy-pages@v5
```

3. The site appears at `https://<your-user>.github.io/<repository>/` and updates on every push. Action versions move on; if GitHub warns that one is outdated, bump the number after `@`.

## Using your own domain

1. Buy a domain from any registrar if you don't have one.
2. In your host's domain settings (Netlify: **Domain management**; Cloudflare Pages: **Custom domains**; GitHub Pages: **Settings → Pages → Custom domain**), add the domain.
3. The host shows the DNS records to create at your registrar: usually a `CNAME` for `www` and an `A`, `ALIAS` or `ANAME` record for the bare domain. Some hosts can manage DNS for you if you point the domain's nameservers at them instead.
4. DNS changes usually take minutes, occasionally up to a day. The host issues the HTTPS certificate automatically once the domain resolves.

## Checking a deployment

- Open `/` and `/#explore`; flags should appear as you scroll.
- Open a flag link like `/#flag-np` directly; Nepal's details should open.
- If flags are missing, the `flags` folder was not uploaded next to `index.html`.
- Before uploading you can run `npm test` locally against `site/`.

## The version published on Claude

The original copy is hosted as a Claude artifact. It is the same page built without the `<html>`/`<head>` wrapper (Claude adds its own), without the credit footer, and with two Claude runtime capabilities, `db` and `user`, which let signed-in viewers keep their progress in their account across devices.

To rebuild it: `npm run build:artifact` writes `build/artifact/index.html`. It is published with every file in `site/flags/` uploaded alongside it as `flags/<name>` and the capabilities `{"db": {}, "user": {}}`. The simplest way to update it is to ask Claude to republish it from this repository.
