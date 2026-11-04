# Front Office

Quotes that follow up on themselves, invoices that get paid, and leads that never go cold. A multi-tenant app for small service businesses, built by MLP Consulting.

## What it does

- **Today**: overdue money, quotes waiting, collections and lead response time, plus a ranked "needs you" list (customer replies, leads waiting, quotes being opened right now, invoices whose reminders have all gone out).
- **Follow-ups**: every reminder and check-in is written from the business's templates and waits for approval. Chasing stops on its own when a customer replies, accepts or pays.
- **Pipeline**: drag-and-drop board from new lead to won, with a side panel per lead.
- **Quotes**: builder with line items, a customer page at `/q/<token>` where the customer approves by typing their name, and view tracking.
- **Invoices**: aging buckets (not due, 1-30, 31-60, 61-90, 90+ days), payments, and a timeline of the reminder cadence.
- **Numbers**: cash collected by month, days to get paid, on-time rate, quote win rate and time-to-yes, lead sources, and the money recovered after a follow-up.
- **Settings**: edit each cadence (timing, channel, wording) and business details.

## Stack

Next.js 16 (App Router, server actions, `src/proxy.ts` for session refresh), Supabase (Postgres, Auth, row-level security), Tailwind CSS 4, deployed on Vercel.

## Multi-tenancy

Every table carries `business_id`. Row-level security on every table allows access only when `is_member(business_id)` is true for the signed-in user (`supabase/01_schema.sql`). Anonymous users have no table access; the customer quote page goes through two narrow `security definer` functions keyed by an unguessable token.

## Safety

Nothing is ever delivered to a customer from this app. "Approve" records the message on the customer's history. Delivery would be connected per client during setup. Demo contacts use reserved `.example` domains and 555-01xx numbers.

## Database

Run the files in `supabase/` in order in the SQL editor. `04_demo_workspaces.sql` needs two passwords set with `set_config` first (see the file header). A `pg_cron` job resets demo data nightly.

## Develop

```bash
cp .env.example .env.local   # fill in values
npm install
npm run dev
npm test                     # chase engine + metrics unit tests
```
