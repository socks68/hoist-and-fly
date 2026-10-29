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

This is how the repository is set up. GitHub Pages can only serve a repository's root or `/docs` folder directly, so the included workflow, `.github/workflows/pages.yml`, publishes `site/` instead. It runs on every push to `main` and can be started by hand from the **Actions** tab (**Deploy site to GitHub Pages → Run workflow**).

1. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions** (needed once).
2. The site appears at `https://<your-user>.github.io/<repository>/` (for this repository, `https://socks68.github.io/hoist-and-fly/`) and updates on every push.

Each run is listed in the **Actions** tab. Action versions move on; if GitHub warns that one is outdated, bump the number after `@` in the workflow.

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
