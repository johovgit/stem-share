# 🎵 Stem Share

Upload audio stems from Logic Pro and share them with your bandmates. Recipients can play and adjust individual stem volumes without creating an account.

## Features

- ✅ Upload 4 stems (Vocals, Drums, Bass, Other)
- ✅ Get a shareable link instantly
- ✅ Recipients can play/pause, adjust volume, mute, and solo each stem
- ✅ No login required for listeners
- ✅ Mobile friendly

---

## 🚀 Setup Guide (15 minutes)

### Step 1: Create a Supabase Account (Free)

1. Go to [supabase.com](https://supabase.com) and click "Start your project"
2. Sign up with GitHub (easiest) or email
3. Click "New Project"
4. Choose a name (e.g., "stem-share")
5. Set a database password (save this somewhere!)
6. Select a region close to you
7. Click "Create new project" and wait ~2 minutes

### Step 2: Set Up Supabase Storage

1. In your Supabase dashboard, click **Storage** in the left sidebar
2. Click **New bucket**
3. Name it exactly: `stems`
4. ✅ Check "Public bucket" (so your bandmates can play the audio)
5. Click **Create bucket**

### Step 3: Create the Database Table

1. Click **SQL Editor** in the left sidebar
2. Click **New query**
3. Paste this SQL and click **Run**:

```sql
-- Create tracks table
create table public.tracks (
  id text primary key,
  title text not null,
  created_at timestamp with time zone default now(),
  vocals_url text,
  drums_url text,
  bass_url text,
  guitar_url text,
  piano_url text,
  other_url text
);

-- Allow public read access (so shared links work)
alter table public.tracks enable row level security;

create policy "Anyone can view tracks"
  on public.tracks for select
  using (true);

create policy "Anyone can insert tracks"
  on public.tracks for insert
  with check (true);
```

4. You should see "Success" message

### Step 4: Get Your Supabase Keys

1. Click **Settings** (gear icon) in the left sidebar
2. Click **API** under Configuration
3. Copy these two values (you'll need them next):
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (under Project API keys)

### Step 5: Deploy to Vercel (Free)

1. Click this button: 

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/stem-share&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY)

> **Note:** If you're setting this up manually, first push this code to a GitHub repository, then use the Vercel button or import the repo directly on vercel.com

2. Connect your GitHub account if prompted
3. When asked for environment variables, enter:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Project URL from Step 4
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key from Step 4
4. Click **Deploy**
5. Wait ~1 minute for deployment
6. Click the URL Vercel gives you - your app is live! 🎉

---

## 📱 How to Use

### Uploading Stems (You)

1. Export stems from Logic Pro:
   - Select your track
   - File → Export → All Tracks as Audio Files
   - Export as WAV or MP3

2. Go to your Stem Share app
3. Enter a track title
4. Upload each stem (Vocals, Drums, Bass, Other)
5. Click "Upload & Get Share Link"
6. Copy the link and send to your bandmates!

### Playing Stems (Your Bandmates)

1. Open the shared link
2. Press play
3. Adjust individual stem volumes
4. Use **M** (mute) to silence a stem
5. Use **S** (solo) to hear only that stem

---

## 💰 Cost

- **Vercel**: Free (hobby tier)
- **Supabase**: Free tier includes:
  - 1GB storage (~25 songs)
  - 2GB bandwidth/month
  - Plenty for a small band!

Need more? Supabase Pro is $25/month for 100GB storage.

---

## 🛠 Local Development

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/stem-share
cd stem-share

# Install dependencies
npm install

# Create .env.local with your Supabase keys
cp .env.example .env.local
# Edit .env.local with your keys

# Run locally
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📝 License

MIT - Use it however you want!

---

## Questions?

Open an issue or ping me. Happy jamming! 🎸
