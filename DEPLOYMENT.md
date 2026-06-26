# EBOS Deployment Guide
## Windows — Complete Step by Step

**What you'll have at the end:**
- App live at: `https://YOUR_GITHUB_USERNAME.github.io/EBOS/`
- Database running on Supabase (free)
- Auto-deploys every time you push a code change

**Time needed:** ~45 minutes

---

## PART 1 — Install the tools (10 minutes)

### Step 1.1 — Install Node.js

1. Go to: **https://nodejs.org**
2. Click the big green button that says **"LTS"** (not Current)
3. Download the `.msi` file and run it
4. Click Next → Next → Next → Install (accept all defaults)
5. Click Finish

**Verify it worked:**
- Press `Windows key + R`, type `cmd`, press Enter
- In the black window, type: `node --version`
- You should see something like `v20.11.0`

---

### Step 1.2 — Install Git

1. Go to: **https://git-scm.com/download/win**
2. Download starts automatically — run the `.exe` file
3. Click Next through everything — do not change any defaults
4. On the screen "Choosing the default editor" — select **Notepad**
5. Keep clicking Next → Install → Finish

**Verify it worked:**
- In Command Prompt, type: `git --version`
- You should see something like `git version 2.44.0`

---

## PART 2 — Set up Supabase (15 minutes)

### Step 2.1 — Create a Supabase account

1. Go to: **https://supabase.com**
2. Click **Start your project**
3. Sign up with GitHub or Google
4. You'll land on your Supabase dashboard

---

### Step 2.2 — Create a new project

1. Click **New project**
2. Fill in:
   - **Name:** `ease-builders`
   - **Database Password:** make a strong password and **save it**
   - **Region:** `Southeast Asia (Singapore)`
3. Click **Create new project**
4. Wait 2 minutes for it to set up

---

### Step 2.3 — Run the database schema (Phase 2)

1. In Supabase left sidebar, click **SQL Editor**
2. Click **New query**
3. Open `eb4/supabase/schema.sql` from your zip in Notepad
4. Press `Ctrl+A` to select all → `Ctrl+C` to copy
5. Click inside the Supabase SQL editor → `Ctrl+V` to paste
6. Click **Run** (green button, or `Ctrl+Enter`)
7. You should see: **"Success. No rows returned"**

---

### Step 2.4 — Run the Phase 3 schema (Director Office)

1. Click **New query** again
2. Open `eb4/supabase/schema_phase3.sql` in Notepad — copy all
3. Paste into Supabase SQL Editor → Click **Run**
4. Should show: **"Success. No rows returned"**

---

### Step 2.5 — Verify tables were created

1. Click **Table Editor** in the left sidebar
2. You should see tables including:
   `users`, `projects`, `milestones`, `daily_logs`, `materials`,
   `expenses`, `boq`, `documents`, `photos`, `funding`,
   `receivables`, `payables`, `cash_book`, `bank_accounts`

If you see those — database is ready. ✓

---

### Step 2.6 — Get your API keys

1. Click **Project Settings** (gear icon, bottom of left sidebar)
2. Click **API**
3. Copy and save both values in Notepad:
   - **Project URL** — e.g. `https://abcdefghijkl.supabase.co`
   - **anon public key** — long string starting with `eyJhbGci...`

Keep this Notepad open — you'll need these in Part 3 and Part 4.

---

### Step 2.7 — Create the 3 Director accounts

**Create each user in Authentication:**

1. Supabase left sidebar → **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Enter email and password for Anirudh → **Create user**
4. Repeat for Arjun and Niranjan

**Then set their Director roles:**

1. Go to **SQL Editor** → **New query**
2. Paste the SQL below (replace the emails with what you used above):

```sql
UPDATE public.users SET full_name = 'Anirudh', role = 'director'
WHERE email = 'anirudh@easebuilders.com';

UPDATE public.users SET full_name = 'Arjun', role = 'director'
WHERE email = 'arjun@easebuilders.com';

UPDATE public.users SET full_name = 'Niranjan', role = 'director'
WHERE email = 'niranjan@easebuilders.com';
```

3. Click **Run**

All 3 Directors can now log in. They can create other accounts (Accountant, Site Engineer) from inside the app later.

---

## PART 3 — Set up GitHub (5 minutes)

### Step 3.1 — Create a GitHub account

1. Go to: **https://github.com**
2. Click **Sign up** → create a free account
3. Verify your email

---

### Step 3.2 — Create the repository

1. Click **+** (top right) → **New repository**
2. Fill in:
   - **Repository name:** `EBOS` ← type exactly this
   - **Visibility:** Private
   - Do NOT tick any checkboxes
3. Click **Create repository**
4. Leave this page open

---

### Step 3.3 — Enable GitHub Pages

1. In your EBOS repo, click **Settings** tab
2. Click **Pages** in the left sidebar
3. Under **Source** → select **GitHub Actions**
4. Click **Save**

---

### Step 3.4 — Add Supabase keys as Secrets

1. Still in Settings → click **Secrets and variables** → **Actions**
2. Click **New repository secret** — add these two:

   | Secret Name | Value |
   |-------------|-------|
   | `VITE_SUPABASE_URL` | Your Project URL from Step 2.6 |
   | `VITE_SUPABASE_ANON_KEY` | Your anon public key from Step 2.6 |

3. Click **Add secret** after each one

---

## PART 4 — Configure and push the code (10 minutes)

### Step 4.1 — Extract the project files

1. Find `ease-builders-v4-phase3.zip` — right-click → **Extract All**
2. Extract to somewhere simple, like `C:\Projects\`
3. You should now have the folder `C:\Projects\eb4\`

---

### Step 4.2 — Create your environment file

1. Open the folder `C:\Projects\eb4\`
2. Find the file `.env.example`
   - If you can't see it: File Explorer → View → tick **Hidden items**
3. Copy it and rename the copy to `.env.local`
4. Right-click `.env.local` → Open with → Notepad
5. Fill in your values:

```
VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

6. Save and close

---

### Step 4.3 — Open Command Prompt in your project folder

1. In File Explorer, go to `C:\Projects\eb4\`
2. Click the address bar at the top (showing the folder path)
3. Type `cmd` and press Enter
4. Command Prompt opens directly in your project folder

---

### Step 4.4 — Install dependencies

```
npm install
```

Wait 1-2 minutes. You'll see lots of text — that's normal. Done when the cursor comes back.

---

### Step 4.5 — Test locally (recommended)

```
npm run dev
```

- Open browser → go to **http://localhost:5173**
- You should see the Ease Builders login screen
- Sign in with Anirudh's credentials from Step 2.7
- If login works and you see projects — everything is connected ✓
- Press `Ctrl+C` in Command Prompt when done

---

### Step 4.6 — Configure Git identity

```
git config --global user.name "Anirudh"
git config --global user.email "anirudh@easebuilders.com"
```

---

### Step 4.7 — Generate a GitHub Personal Access Token

GitHub no longer accepts your account password for pushing code. You need a token.

1. On GitHub — click your profile photo (top right) → **Settings**
2. Scroll to the very bottom → click **Developer settings**
3. Click **Personal access tokens** → **Tokens (classic)**
4. Click **Generate new token** → **Generate new token (classic)**
5. Note: `EBOS deploy`
6. Expiration: **No expiration**
7. Tick the **repo** checkbox (first section)
8. Click **Generate token** at the bottom
9. **Copy the token NOW** — GitHub only shows it once
10. Paste it into your Notepad to save it

---

### Step 4.8 — Push the code to GitHub

Run these commands one by one. Replace `YOUR_GITHUB_USERNAME` with your actual username:

```
git init
```
```
git add .
```
```
git commit -m "Initial commit — Ease Builders Site Manager v4"
```
```
git branch -M main
```
```
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/EBOS.git
```
```
git push -u origin main
```

When it asks for credentials:
- **Username:** your GitHub username
- **Password:** paste the Personal Access Token from Step 4.7

---

## PART 5 — Watch it go live (2 minutes)

1. Go to: `https://github.com/YOUR_GITHUB_USERNAME/EBOS`
2. Click the **Actions** tab
3. You should see **"Deploy to GitHub Pages"** running
4. Click it to watch the progress
5. Green ✓ = your app is live

**Your app URL:**
```
https://YOUR_GITHUB_USERNAME.github.io/EBOS/
```

Bookmark this. Share with Arjun and Niranjan.

---

## PART 6 — Enable team account creation (5 minutes)

This lets Directors create accounts for your accountant and site engineers from inside the app. Without this step, only the 3 Directors you manually created can log in.

### Step 6.1 — Install Supabase CLI

In Command Prompt:
```
npm install -g supabase
```

### Step 6.2 — Log in

```
supabase login
```

Browser opens — sign in and click Authorize.

### Step 6.3 — Find your Project ID

In Supabase, look at your browser URL:
`https://supabase.com/dashboard/project/abcdefghijkl`
The part after `/project/` is your Project ID.

### Step 6.4 — Link your project

```
supabase link --project-ref YOUR_PROJECT_ID
```

### Step 6.5 — Get your service role key

1. Supabase → Project Settings → API
2. Scroll down to **Service role** section
3. Copy the `service_role` key (different from the anon key)

### Step 6.6 — Set the secret and deploy

```
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=paste_service_role_key_here
```
```
supabase functions deploy create-user
```

Done. Now Directors can go to **More → User Management → + Add User** to create accounts.

---

## PART 7 — Add your team accounts

1. Open the app on your phone
2. Log in as any Director
3. Tap **More → User Management → + Add User**
4. Add your accountant and site engineers with their roles

---

## Making future updates

Whenever you change something in the code:

```
git add .
git commit -m "what you changed"
git push
```

GitHub rebuilds and redeploys automatically. Live in ~2 minutes.

---

## Troubleshooting

**"npm is not recognized"**
→ Restart your laptop after installing Node.js, then try again.

**"git is not recognized"**
→ Restart your laptop after installing Git, then try again.

**Blank white page at your app URL**
→ Check the Actions tab — is the build green?
→ Wait 2 more minutes and refresh.

**Build fails in GitHub Actions**
→ Click the failed run → expand "Build" step to see the error.
→ Most common cause: Secrets missing. Check Part 3 Step 3.4.

**Can't log in after deploying**
→ Did you run the SQL in Step 2.7 to set the Director roles?
→ Check the email matches exactly what you used in Supabase Auth.

**"Row Level Security" error**
→ Run this in Supabase SQL Editor to check:
```sql
SELECT email, role FROM public.users;
```
→ If role is blank, run:
```sql
UPDATE public.users SET role = 'director' WHERE email = 'their@email.com';
```

---

## Checklist

- [ ] Node.js installed (`node --version` works)
- [ ] Git installed (`git --version` works)
- [ ] Supabase project created
- [ ] Phase 2 schema run (schema.sql)
- [ ] Phase 3 schema run (schema_phase3.sql)
- [ ] Tables visible in Table Editor
- [ ] API keys saved in Notepad
- [ ] 3 Director accounts created in Supabase Auth
- [ ] Director roles set via SQL
- [ ] GitHub repo created (named EBOS)
- [ ] GitHub Pages enabled (Source: GitHub Actions)
- [ ] Supabase secrets added to GitHub
- [ ] Zip extracted to C:\Projects\eb4\
- [ ] .env.local created with real keys
- [ ] npm install run
- [ ] Local test passed (http://localhost:5173)
- [ ] GitHub Personal Access Token created
- [ ] Code pushed to GitHub
- [ ] GitHub Actions build succeeded (green ✓)
- [ ] App opens at github.io/EBOS/
- [ ] Edge Function deployed (supabase functions deploy)
- [ ] Team accounts created inside app
