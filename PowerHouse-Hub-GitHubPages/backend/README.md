# Power House Auction Hub backend

This folder is the secure backend starter for the independent live auction. The
public GitHub Pages site remains static; Supabase supplies authentication,
room state, bids, chat, and reviews.

## Setup

1. Create a free project at Supabase.
2. Open **SQL Editor** and run `supabase/schema.sql` once.
3. Enable the sign-in method you want (email/password is the simplest).
4. The browser app may use only the project URL and the public `anon` key.
   Never put the `service_role` key in HTML, GitHub, screenshots, or chat.
5. Connect the auction UI to the `place_bid` RPC and Supabase Realtime.

The project URL and publishable browser key are stored in `supabase/config.js`.
That key is intentionally public and is safe only because row-level security
and the policies in `schema.sql` are enabled.

## Security choices

- Row-level security is enabled on every application table.
- Direct inserts into `bids` are intentionally blocked; bids go through a
  server-validated function that checks authentication, room membership,
  auction status, current player, purse, and current highest bid.
- Chat messages and display names have database length limits.
- Room data is not public by default; users must sign in and belong to a room.

This is the schema foundation, not yet a connected live-auction UI. The next
implementation step is wiring the IPL room first, testing it with two signed-in
accounts, and then applying the same engine to WPL, Kabaddi, and BBL.
