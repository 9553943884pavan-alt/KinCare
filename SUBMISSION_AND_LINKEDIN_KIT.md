# 🏆 PromptWars x Catalyst — Submission & LinkedIn Post Kit

Use this ready-to-copy kit for your **Platform Submission (Requirement 4/4)**, **LinkedIn Post (10% of Round 2 Score)**, and **Top 10 Live Pitch**.

---

## 1. Platform Submission — "Brief Description of the Project" (Requirement 4/4)

> **Copy-paste this into the submission portal:**

**KinCare AI** is a smart, interconnected elderly care and medication management platform built with **Google Gemini AI (`@google/genai`)**, **React**, and **Node.js/Express on Google Cloud Run**. It creates a shared, passcode-protected care ecosystem connecting elderly individuals, family members, and caretakers while keeping seniors at the centre of their own healthcare decisions.

**Key Highlights:**
1. **Secure Passcode & Account Onboarding (`Login / Sign Up`):** Role-aware PBKDF2-hashed passcode access and custom account creation for the Elderly Individual (`123456`), Family Members (`654321`), and Caregivers (`112233`) with granular permissions and real-time activity auditing.
2. **4-Screen GrandPad-Inspired Senior Accessibility (WCAG AAA):** Features a calm **Senior Comfort View** (*My Medicines* with spotlight dose + Undo, *My Day & Doctor* with 1-tap emoji mood check-in, *Voice Helper* with TTS/STT, and *Choices & SOS*) alongside a **Family & Caregiver Command Center**.
3. **Elderly Autonomy & Decision Charter:** Family and caregivers can propose schedule changes from the Command Center while seniors approve or decline in 1 tap and control their privacy & escalation rules.
4. **Proactive Multi-Tier Email Reminder Engine:** Includes a Live 9:00 AM Auto-Escalation Watcher and dispatches AI-enriched HTML email alerts via Resend/SMTP for missed doses, upcoming doses, and appointments with a built-in Live Email Outbox Inspector.
5. **Google Gemini 3.5 Flash Lite Clinical Intelligence:** Includes an **AI Prescription & Label Scanner**, **Drug-Drug & Food Interaction Guardian**, **Multilingual AI Care Companion & Voice Reminder Broadcaster**, **Pre-Visit Doctor Clinical Brief Generator**, `.ics` calendar exports, and a **One-Tap SOS & Printable QR Emergency Medical ID Card**.

---

## 2. LinkedIn Post Template (Worth 10% of Round 2 Evaluation!)

> **Checklist before posting on LinkedIn:**
> - [x] Clear explanation of the project & features
> - [x] Direct alignment with the *Elderly Care & Medication Management Platform* problem statement
> - [x] Tag **@Makers Need More** (**MnM**) — type `@Makers Need More` in the LinkedIn composer so the official page tag turns blue!
> - [x] Attach 2–3 screenshots (Senior Comfort Mode + Family Command Center + Live Email Inspector / Gemini AI Hub) and your Live Deployed URL + Public GitHub Repo URL.

### 📋 Copy-Paste LinkedIn Post:

```text
🚀 Built "KinCare AI" — A Smart, Elderly-Centric Healthcare & Medication Management Platform at PromptWars x Catalyst! 💊👵👨‍👩‍👧‍👦

Managing daily medications, doctor appointments, and chronic care routines shouldn't make elderly individuals feel like passive patients—or leave family members and caretakers anxious in the dark.

For the PromptWars x Catalyst Hackathon (Google for Developers x Hack2Skill), I tackled the "Elderly Care & Medication Management Platform" challenge by building KinCare AI: an interconnected care ecosystem that keeps seniors at the centre of their own healthcare decisions.

✨ How KinCare AI Solves the Problem Statement (and goes beyond a basic reminder app):

🔐 1. Secure Passcode-Based Care Circle:
A shared ecosystem where Elderly Individuals, Family Members, and Caretakers access and manage the care profile using role-specific passcodes (secured with PBKDF2-SHA256 hashing & rate-limiting).

🗣️ 2. Senior Comfort Mode & Elder Autonomy Charter:
Designed with WCAG AAA accessibility—featuring visual pill identifiers (color & shape), 1-tap "Mark as Taken", native Voice Readouts (TTS) & Voice Commands, text scaling (A/A+/A++), and an Elder Decision Charter where seniors approve or decline routine changes proposed by caregivers.

📧 3. Proactive Email Reminder & Escalation Engine:
Automatically monitors adherence and dispatches proactive HTML email reminders for missed medications, upcoming doses, and medical appointments—ensuring critical routines are never overlooked.

🤖 4. Powered by Google Gemini AI (@google/genai) & Cloud Run:
• AI Prescription & Pill Bottle Scanner: Converts clinical shorthand or prescription photos into senior-friendly schedules.
• Drug-Drug & Food Interaction Guardian: Flags dietary and timing precautions across active prescriptions.
• Bilingual AI Care Companion & Doctor Visit Brief Generator: Prepares clinical summaries and questions for upcoming cardiology/endocrinology visits, plus `.ics` calendar exports and a printable QR Emergency Medical ID Card.

🔗 Live Deployed Project: [INSERT YOUR CLOUD RUN / VERCEL URL HERE]
💻 Public GitHub Repository: https://github.com/9553943884pavan-alt/KinCare

A huge thank you to @Makers Need More (MnM), Google for Developers, and Hack2Skill for organizing an incredible build experience with Google Antigravity and Gemini AI! 🙌

#PromptWars #Catalyst #BuildWithAI #MakersNeedMore #MnM #GoogleForDevelopers #GeminiAI #GoogleCloudRun #HealthTech #ElderlyCare #Accessibility #AIHackathon
```

---

## 3. Fast Deployment Commands (Important: Only Your Last Submission Counts & Cloud Run Link Must Work!)

### Option A: Google Cloud Run (Required for Top 10 Qualification per Slide 8)
```bash
# 1. Authenticate & set project
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT_ID

# 2. Deploy directly from source (uses production Dockerfile on Port 8080)
gcloud run deploy kincare-ai \
  --source . \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "NODE_ENV=production,GEMINI_MODEL=gemini-3.5-flash-lite,ALERT_EMAIL_RECIPIENT=9553943884pavan@gmail.com,GEMINI_API_KEY=YOUR_GEMINI_KEY,RESEND_API_KEY=YOUR_RESEND_KEY,SESSION_SECRET=YOUR_SECRET"
```

### Option B: Vercel / Render / Railway
- **Vercel:** Run `npx vercel --prod` (configured via `vercel.json` + `api/index.js`) and configure `GEMINI_API_KEY`, `GEMINI_MODEL`, `RESEND_API_KEY`, `ALERT_EMAIL_RECIPIENT`, and `SESSION_SECRET` in Vercel Environment Variables.
- **Render:** Push your public GitHub repository (`git push`) and connect it as a Blueprint (`render.yaml` auto-detects build & start commands on port `8080`). Add your API keys in Render → Environment.
