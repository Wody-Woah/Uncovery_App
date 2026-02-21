# The Uncovery — Database Schema (Supabase)

## Overview
This app stores monthly themes and daily devotions.
Devotions repeat every year.
The app determines "today" using month + day (not year).

---

## Table: month_themes

Stores the theme for each month.

Columns:
- month (int) PRIMARY KEY  -- 1 to 12
- month_name (text)
- theme_title (text)
- theme_scripture_reference (text)
- theme_scripture_text (text)

RLS:
- SELECT: public can read (USING true)

---

## Table: devotions

Stores the daily devotion content.

Columns:
- id (uuid) PRIMARY KEY default gen_random_uuid()
- devotion_date (date) optional (do not rely on year for logic)
- month (int)  -- 1 to 12
- day (int)    -- 1 to 31
- title (text)
- verse_reference (text)
- verse_text (text) optional
- body (text)
- prayer (text)
- published (bool) default true
- created_at (timestamptz) default now()

Constraints:
- UNIQUE (month, day)

RLS:
- SELECT: public can read published rows (published = true)
- INSERT/UPDATE/DELETE: admin only (checks admins table)

---

## Table: admins

Stores which Supabase auth users are admins.

Columns:
- user_id (uuid) PRIMARY KEY references auth.users(id)
- created_at (timestamptz) default now()

RLS:
- SELECT: user can read their own admin row (user_id = auth.uid())