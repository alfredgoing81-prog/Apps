# Set up Bigfoot Sightings

This is the shared map. The link you can post on Facebook is:

https://alfredgoing81-prog.github.io/Apps/bigfoot/

You only do this once. You can do it on your phone. It takes about 10 minutes.

You do steps 1 through 6. Then send two copied lines to your assistant. Your assistant can paste them into the app for you. You do not have to edit any code.

The Bible app is separate. Its link does not change.

## 1. Create a free Supabase project

1. Open Safari or Chrome.
2. Go to https://supabase.com
3. Tap **Start your project** and sign up. Email is fine.
4. Tap **New project**.
5. Name it `bigfoot`.
6. Make a database password and write it somewhere safe. The map does not ask for this password later, but Supabase does.
7. Leave the region as it is, or pick one in the United States.
8. Tap **Create new project**.
9. Wait until the project is ready. This can take a minute or two.

## 2. Open the setup text

On your phone, open this address. It is the database setup:

https://github.com/alfredgoing81-prog/Apps/raw/main/bigfoot/supabase/schema.sql

1. Press and hold on the text.
2. Tap **Select All**, then **Copy**.

If that page is missing, ask your assistant to text you the file `bigfoot/supabase/schema.sql`.

## 3. Paste it into Supabase

1. Go back to Supabase.
2. Tap the menu (three lines), then **SQL Editor**.
3. Tap **New query**. Turning the phone sideways gives you more room.
4. Press and hold in the empty box and tap **Paste**.
5. Near the top, find this line:

   `PUT-YOUR-EMAIL-HERE@example.com`

6. Change it to your email. Use an email you can open on this phone. Leave the quotes.
7. Tap **Run**.
8. You should see **Success**. If you see red error text, take a screenshot and send it to your assistant. Do not keep tapping Run until they look.

## 4. If you need to fix the email later

In a new SQL query, paste this, change the email, and tap **Run**:

```sql
delete from public.admins where email = 'put-your-email-here@example.com';
insert into public.admins (email) values (lower('you@email.com'));
```

## 5. Copy the Project URL and the public key

1. In Supabase, tap the gear, **Project Settings**.
2. Tap **API Keys**. (It might be under a **Connect** button on the project home screen.)
3. Copy the **Project URL**. It looks like `https://abcdefg.supabase.co`.
4. Copy the public key.
   - It may be called **publishable** and start with `sb_publishable_`.
   - Or it may be called **anon** and be a long key starting with `eyJ`.
   - Either one is fine. Both are meant to be public.
5. Do **not** copy a key called **secret** or **service_role**. Those start with `sb_secret_` or are labeled secret. Leave them where they are. Never text those to anyone.

## 6. Send the two lines to your assistant

Send a message with:

- the Project URL
- the public key (anon or publishable)

Your assistant will put them in `bigfoot/config.js`. That is the only file that needs them.

If you want to paste them yourself, that file looks like this:

```javascript
window.BIGFOOT_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: ""
};
```

Put the Project URL in the first quotes. Put the public key in the second quotes. The name says `ANON` even if your key is the publishable one. That is expected.

## 7. Allow the sign-in link

This lets you approve reports from your phone.

1. In Supabase, tap **Authentication**.
2. Tap **URL Configuration**. If you don't see that name, look for **Redirect URLs**.
3. Set **Site URL** to:

   https://alfredgoing81-prog.github.io/Apps/bigfoot/

4. Add this **Redirect URL**:

   https://alfredgoing81-prog.github.io/Apps/bigfoot/admin.html

5. Save.
6. Tap **Sign In / Providers** (or **Providers**) and make sure **Email** is on. It usually already is.

## 8. Try it

Wait until your assistant says the keys are saved. Then:

1. Open https://alfredgoing81-prog.github.io/Apps/bigfoot/
2. The gold "Not connected yet" bar should be gone.
3. Tap **Report**, drop a pin in a general area (not a house), and send a test report.
4. Open https://alfredgoing81-prog.github.io/Apps/bigfoot/admin.html
5. Type your email and tap **Email me a sign-in link**.
6. Open the email and tap the link.
7. You should see the test report. Tap **Approve**.
8. Go back to the map. The pin should be there.

## What to tell people

People do not need an account to send a report. You are the only one who approves what shows on the map.

A line you can use on Facebook:

"Here's a map for Bigfoot reports. Add what you saw, heard, or found. Please don't pin someone's house — use a nearby general area. Reports are checked before they show up."

Link: https://alfredgoing81-prog.github.io/Apps/bigfoot/
