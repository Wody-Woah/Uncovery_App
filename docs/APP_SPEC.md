# The Uncovery — App Specification (MVP)

## Goal
A mobile-friendly web app (browser-based) similar in feel to the Bible app.
Clean reading experience, simple navigation, and daily devotion front-and-center.

---

## Core Features (MVP)

1) Today’s Devotion
   - Automatically loads based on current month + day.
   - Only shows devotions where published = true.

2) Month Theme Display
   - Shows the theme + scripture for the current month.

3) Browse Page
   - Calendar or month/day picker.
   - Allows browsing by month and day.

4) Devotion Detail Page
   - Route: /devotion/:month/:day
   - Shows full devotion content.

5) Authentication
   - Login (email/password via Supabase Auth)
   - Signup
   - Logout

6) Admin Area (Protected)
   - Create new devotion
   - Edit existing devotion
   - Toggle published status

---

## Data Rules

- Devotions repeat every year.
- The year is NOT used to determine content.
- The app fetches today's devotion using:
  - month = current month
  - day = current day

---

## Pages / Routes

Public:
- / (redirect to /today)
- /today
- /browse
- /devotion/:month/:day

Auth:
- /login
- /signup

Admin:
- /admin
- /admin/devotions/new
- /admin/devotions/:id/edit

---

## UI Requirements

- Mobile-first design
- Clean reading column (max-width ~700px)
- Large readable typography
- Simple header nav:
  - Today
  - Browse
  - Login / Profile
- Devotion content displayed in card layout
- Month theme displayed above devotion on Today page