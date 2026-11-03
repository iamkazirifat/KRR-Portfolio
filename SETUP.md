# Blog Editor Setup

Your site now has an editing panel at `/admin`. You log in with GitHub, edit a post, add images, fill in the SEO boxes, and hit **Publish**. Vercel rebuilds the site and the live page updates in about a minute.

Setup takes about 15 minutes, once.

## How it works

- Every blog post is a file in `content/blog/` (one `.md` file per post).
- `/admin` is the editor. It saves your changes straight to GitHub.
- On every save, Vercel runs `build.js`. That turns the posts into the blog pages, updates the lists on the Portfolio page, and writes `sitemap.xml` and `robots.txt`.
- Images you upload go to `assets/uploads/`.

## Step 1: Put the files in your GitHub repo

1. Copy everything in this folder into your repo, replacing the old files.
2. **Delete the old `blog/` folder from the repo.** The blog pages are now built automatically from `content/blog/`.
3. Commit and push.

## Step 2: Check the Vercel build settings

`vercel.json` already sets these. In Vercel, under **Project → Settings → Build & Deployment**, confirm:

- Framework Preset: **Other**
- Build Command: `npm run build`
- Output Directory: `dist`

## Step 3: Create a GitHub OAuth app (this is the login)

1. Go to GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Fill in:
   - Application name: `Kazi Blog Editor`
   - Homepage URL: `https://portfolio-of-kazi.vercel.app`
   - Authorization callback URL: `https://portfolio-of-kazi.vercel.app/api/callback`
3. Click **Register application**, then **Generate a new client secret**. Copy the Client ID and the secret.

## Step 4: Add the keys to Vercel

In Vercel → **Project → Settings → Environment Variables**, add:

| Name | Value |
|---|---|
| `OAUTH_GITHUB_CLIENT_ID` | the Client ID from step 3 |
| `OAUTH_GITHUB_CLIENT_SECRET` | the client secret from step 3 |
| `OAUTH_GITHUB_SCOPE` | `public_repo` if your repo is public. Leave it out if the repo is private. |

Redeploy after saving them.

## Step 5: Point the editor at your repo

Open `admin/config.yml` and change this line to your GitHub username and repo name:

```yaml
repo: YOUR-GITHUB-USERNAME/YOUR-REPO-NAME
```

If your main branch is called `master` instead of `main`, change `branch:` too. Commit and push.

## Step 6: Log in

Go to `https://portfolio-of-kazi.vercel.app/admin/` and click **Login with GitHub**. Only GitHub accounts that can push to your repo can log in.

## Using the editor

- **New post:** click **New Blog post**. Pick a category:
  - **Business Inspection BD** or **10 Studio** adds the post to that section of the Portfolio page.
  - **Blog** adds it to a new "Blog" section that appears on the Portfolio page once you have one post there.
- **Images:** use the image button in the body toolbar, or the Featured image field. Always fill in the alt text.
- **SEO boxes:** the SEO section has the SEO title, meta description and focus keyword. Social sharing has the share title, description and image.
- **SEO checks:** the right-hand preview shows your score, a Google preview, a social share preview, and the content checks, with the page preview below them. If the preview is hidden, click the eye icon at the top of the editor.
- **Draft:** turn on "Draft (hide from site)" to save without publishing.
- **Publish:** click **Publish → Publish now**. The site updates in about a minute.

## If you move to a custom domain

Replace `portfolio-of-kazi.vercel.app` in these places:

1. `admin/config.yml`: `base_url`, `site_url`, `display_url`
2. `admin/index.html`: the `SITE` line near the top of the script
3. Vercel: add an env var `SITE_URL` with the new address (used by `build.js`)
4. Your GitHub OAuth app: Homepage URL and callback URL

## Editing on your own computer (optional)

1. In `admin/config.yml`, uncomment `local_backend: true`.
2. Run `npx decap-server` in the repo folder.
3. Serve the site locally and open `/admin/`. Edits save to your files without logging in.
