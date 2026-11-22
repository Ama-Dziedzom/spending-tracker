# LogIt public pages

Static site for the privacy policy, terms and account deletion page. No build step.

- `/privacy` — Privacy Policy (App Store + Play Store privacy URL)
- `/terms` — Terms of Use (linked from Sign up)
- `/delete-account` — Play Store "Delete account URL"

## Deploy on Vercel

1. vercel.com › Add New › Project › import the `spending-tracker` repo.
2. Set **Root Directory** to `site`. Framework preset: **Other**. Leave build and output settings empty.
3. Deploy. The pages are at `https://<project>.vercel.app/privacy`, `/terms` and `/delete-account`.

Every push to the repo redeploys the site. When LogIt has its own domain, add it under Project › Settings › Domains; the paths stay the same.

## Before going live

Search for `class="todo"`: every highlighted placeholder must be filled in, then the highlight removed.

- `[CONTACT EMAIL]`, `[WHATSAPP NUMBER]`
- `[DATE YOU PUBLISH]` (privacy and terms)
- `[ADD ONCE REGISTERED]` (Data Protection Commission number)
- `[SUPABASE REGION]`, `[RAILWAY REGION]`
- Backups: `[kept for up to 7 days / not kept on our current plan]` (privacy and delete-account)

The Ask LogIt section describes a consent choice before the first chat answer. Ship that in the app before publishing this version.
