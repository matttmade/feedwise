# Deploying Feedwise

About 20 minutes, once. You need accounts on Supabase, Vercel and GitHub (all free tiers).

## 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com). Note the database password.
2. Push the schema from this repo:
   ```bash
   pnpm exec supabase login
   pnpm exec supabase link --project-ref <your-project-ref>
   pnpm exec supabase db push
   ```
3. In **Authentication → Sign In / Providers → Email**:
   - Keep **Email** enabled.
   - Turn **Allow new users to sign up** off. Then create your user in step 4.
4. **Authentication → Users → Add user → Send invitation**, using your own email.
5. **Authentication → URL Configuration**:
   - Site URL: `https://<your-vercel-domain>`
   - Redirect URLs: add `https://<your-vercel-domain>/auth/confirm`
6. **Project Settings → API**: copy the Project URL, the `anon` key and the `service_role` key.

## 2. Vercel

1. Import `matttmade/feedwise` at [vercel.com/new](https://vercel.com/new). The framework (Next.js) is detected.
2. Add the environment variables from `.env.example`:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` key |
   | `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (server only, never shown to browsers) |
   | `ALLOWED_EMAILS` | your email |
   | `CRON_SECRET` | `openssl rand -hex 32` |
   | `IMAGE_PROXY_SECRET` | `openssl rand -hex 32` (a different one) |
   | `APP_TIMEZONE` | e.g. `Europe/London` or `America/Los_Angeles` |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-vercel-domain>` |

3. Deploy. Then open the site and sign in with your email.

### Previews

Once the repo is connected, Vercel builds every pushed branch and posts a "Visit Preview" link on its pull request. Previews use the same environment variables (keep **Production and Preview** selected).

- **Signing in on a preview:** in Supabase → **Authentication → URL Configuration → Redirect URLs**, add `https://*.vercel.app/**`. The magic link goes back to whichever address you signed in from, and Supabase only allows addresses on this list.
- **Vercel's own login:** Hobby projects protect previews with a Vercel sign-in by default. Sign in as the project owner, or turn it off under **Settings → Deployment Protection**.

## 3. Scheduled fetch (GitHub Actions)

In GitHub → **Settings → Secrets and variables → Actions**, add:

- `FEEDWISE_APP_URL`: `https://<your-vercel-domain>` (no trailing slash)
- `CRON_SECRET`: the same value as in Vercel

The schedule is in `.github/workflows/fetch-feeds.yml` and runs every 2 hours. GitHub only runs schedules from the default branch, so it starts once this branch is merged. To test it immediately: **Actions → Fetch feeds → Run workflow**.

## 4. Check it worked

- **Sources:** add a site. It should say "Added. N new posts are waiting in Explore."
- **Explore:** shows cards with images.
- **Sources list:** after the first scheduled run, each source shows "Healthy · checked … ago".

## Phase 1 exit gate

Run Lighthouse against the deployed URL:

- Chrome DevTools → Lighthouse → Mobile → Performance + Accessibility.
- Run it on Today, Explore and a Reader page, 3 times each, and take the median.
- The target is ≥ 90 on both.
- `pnpm audit:lighthouse` (with `AUDIT_BASE_URL`) does the same, but it signs in through the local Mailpit inbox, so use it locally.
