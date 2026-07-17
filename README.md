# Zippy — Pickup & Drop-off Courier App

A full-stack delivery/courier booking app built with **Next.js 14 (App Router)** and **Supabase** (Postgres + Auth + Realtime).

## Features

- **Homepage** — marketing page with hero, how-it-works, pricing, rider CTA
- **Sign up / Sign in** — email+password plus **Google** OAuth (via Supabase Auth)
- **Checkout** — interactive map (Leaflet/OpenStreetMap, no API key needed) to pick pickup & drop-off points, live price estimate, order creation
- **Order tracking** — live map + status timeline via Supabase Realtime (works for customers watching their own delivery)
- **User dashboard** — order history with live status badges
- **Rider dashboard** — go online/offline, broadcast live GPS location, view & accept nearby jobs, advance order status
- **Admin dashboard** — stats, all orders, manual rider assignment, rider directory

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → New project.
2. Open **SQL Editor** → paste the contents of `supabase/schema.sql` → run it.
   This creates the `profiles`, `orders`, `order_events` tables, RLS policies, the
   auto-profile-creation trigger, and enables Realtime on all three tables.
3. Grab your **Project URL** and **anon public key** from Project Settings → API.

## 2. Configure Google OAuth

In Supabase: **Authentication → Providers**

- **Google**: enable it, paste your Google OAuth Client ID/Secret (from Google Cloud Console →
  Credentials → OAuth Client ID → Web application). Add
  `https://<your-project-ref>.supabase.co/auth/v1/callback` as an authorized redirect URI in Google Cloud.

Also add your app's own callback under **Authentication → URL Configuration → Redirect URLs**:

```
http://localhost:3000/auth/callback
https://your-production-domain.com/auth/callback
```

## 3. Install & run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

## 4. Make yourself an admin

Sign up normally, then in Supabase's **Table Editor → profiles**, find your row and change
`role` from `customer` to `admin`. Visit `/dashboard/admin`.

## 5. Make yourself a rider

Either check "Sign up as a rider" on the signup form, or edit your `profiles.role` to `rider`
in the Table Editor, then visit `/dashboard/rider`. Your browser will ask for location
permission — allow it so the app can broadcast your GPS position for live tracking.

**Note:** These steps are intended for local development and testing only. In a production application, roles should be assigned securely through an admin workflow or backend service.

## Notes on the map

The map uses **Leaflet** with free OpenStreetMap tiles — no API key or billing required.
Pickup/drop-off distance is calculated client-side with the Haversine formula, and price =
base fare (by package size) + distance × per-km rate. Swap in Mapbox/Google Directions API
later if you want real road-distance routing instead of straight-line distance.

## Project structure

```
app/
  page.tsx                  Homepage
  auth/signin, auth/signup  Auth pages (email + Google/Apple OAuth)
  auth/callback/route.ts    OAuth code exchange
  checkout/page.tsx         Booking flow with map + price calc
  track/[orderId]/page.tsx  Live order tracking
  dashboard/user            Customer order history
  dashboard/rider           Rider job board + live location
  dashboard/admin           Admin stats/order/rider management
components/
  Map.tsx                   Leaflet map (pickup/dropoff/rider markers)
  Navbar.tsx                Auth-aware nav
lib/supabase/
  client.ts, server.ts      Supabase client factories
middleware.ts               Session refresh + route protection
supabase/schema.sql          Full DB schema, RLS policies, Realtime setup
```

## Extending this

- Add Stripe/Paystack for real payment capture at checkout (currently `payment_status` just tracks `unpaid`/`paid`)
- Add push notifications (Supabase Edge Functions + web push) for status changes
- Swap Haversine distance for a real routing API for accurate ETAs
- Add ratings/reviews table for riders
