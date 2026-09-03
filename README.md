<div align="center">
  <img src="assets/nagarnetra-logo-highres.png" alt="NagarNetra Logo" width="150" />
  
  # NagarNetra
  **AI-Powered Civic Sanitation Intelligence Platform**

  <img src="assets/slide4_workflow.png" alt="Workflow Overview" width="600" />
</div>

---

Every great city has a shadow: the quiet accumulation of unauthorized waste. For years, the approach to urban cleanliness has been reactive—citizens complain, authorities eventually dispatch a truck, and the cycle repeats. The data was there, but it was chaotic, siloed, and impossible to act upon efficiently. 

**NagarNetra** is a premium, high-performance geospatial dashboard designed to give city administrators God-mode visibility over urban waste management.

Here is how NagarNetra fundamentally re-engineers the city's cleanliness infrastructure.

---

## 🚨 The Problems We Face
<div align="center">
  <img src="assets/slide1_problems.png" alt="The Problems" width="300" align="right" />
</div>

* **The Municipal Budget Strain:** Up to **50%** of a city's total revenue budget is swallowed by waste management, and **85%** of that is burned purely on inefficient collection, transport, and fuel, rather than actual waste processing.
* **The True Cost of Illegal Dumping:** Standard landfill disposal costs **$40/ton**, but cleaning up illegal dumping sites costs cities up to **$600/ton** (a 15x cost penalty) and decreases surrounding property values by up to 15%.
* **The Broken Feedback Loop:** Legacy 311 complaint systems have zero accountability, resulting in massive **duplicate reporting** and false hotspots. Ground crews can claim a site is clean when it isn't, and trolls can spam fake reports.

<br clear="both"/>

---

## 💡 The NagarNetra Solution
<div align="center">
  <img src="assets/slide2_solutions.png" alt="The Solutions" width="300" align="left" style="margin-right: 20px" />
</div>

* **Smart Dispatch (Solves Budget Strain):** AI Priority Zones and Hex Maps deploy teams only where needed, saving massive amounts of fuel and labor. Haversine spatial clustering automatically merges duplicate reports, eliminating redundant truck dispatches.
* **Frictionless Reporting (Solves Illegal Dumping):** A multi-lingual Telegram bot lets any citizen report waste in seconds. Crowdsourced reports catch dumping early—before it becomes a massive, $600/ton cleanup.
* **Verified Accountability (Solves the Feedback Loop):** Gemini AI and cryptographic hashing instantly reject fake or duplicate photos before they reach the dashboard. NagarNetra automatically messages reporters to verify and rate a team's cleanup, ensuring 100% accountability.

<br clear="both"/>

---

## ⚙️ How It Works: The 5-Step Engine
<div align="center">
  <img src="assets/slide4_workflow.png" alt="The 5-Step Workflow" width="300" align="right" />
</div>

1. **Telegram Received:** Citizens report illegal dumping simply by sending a photo and location to our multi-lingual Telegram bot.
2. **Analysed (AI Validation):** Gemini AI scans the photo to ensure it contains actual garbage, while cryptographic hashing instantly blocks duplicate reports.
3. **Ranking Produced:** Raw reports are spatially clustered on the dashboard map. The system generates live Heatmaps and Hex Grids to rank the most critical zones.
4. **Coordinated Team:** Administrators use the AI Priority Zones to dispatch ground crews precisely where they are needed most.
5. **Feedback (Closing the Loop):** Once cleaned, the system automatically messages the citizen to rate the job. Poor ratings require photo proof, ensuring total accountability.

<br clear="both"/>

---

## 🚀 Unique Selling Propositions (USP)
<div align="center">
  <img src="assets/slide3_usp.png" alt="Unique Selling Propositions" width="300" align="left" style="margin-right: 20px" />
</div>

**1. The Strict "Proof of Work" Feedback Loop**
Traditional systems close the ticket the moment a truck leaves. NagarNetra automatically messages the original reporter on Telegram to rate and verify the cleanup. If a citizen maliciously rates a good cleanup poorly (or if a crew fakes a job), the system halts and demands AI-verified photo proof.

**2. The Public Dashboard & Transparency**
We don't just hide data in administrative spreadsheets. NagarNetra translates raw cleanup metrics into live, public leaderboards for different neighborhoods and zones, turning urban cleanliness into a community-driven mission.

<br clear="both"/>

---

## 🛠️ Under the Hood: Tech Stack
<div align="center">
  <img src="assets/slide5_techstack.png" alt="Tech Stack" width="300" align="right" />
</div>

* **The Brain & Communication:** Google Gemini 2.5 Flash (AI validation), Firebase (Firestore & Cloud Functions), and Telegram Bot API (Telegram integration).
* **The Command Center:** React 18, Vite, and Vanilla CSS for the sleek, glassmorphic UI.
* **The Geospatial Engine:** Leaflet & React-Leaflet, `use-supercluster` (high-speed client-side clustering), and Uber's `h3-js` (hexagonal grid partitioning).

<br clear="both"/>

---

## 🌍 The Impact
<div align="center">
  <img src="assets/slide6_impact.png" alt="The Impact" width="300" align="left" style="margin-right: 20px" />
</div>

* **Massive Financial Savings:** Replaces blind dispatching with AI-driven priority routing.
* **100% Accountability & Trust:** Ensures city funds are only spent on jobs that are genuinely completed and visually verified by the public.
* **Radical Accessibility:** Bypasses app downloads entirely by integrating directly with Telegram, featuring full multilingual support.

<br clear="both"/>

---

## 📱 How to Get Access to NagarNetra Bot

You can interact with NagarNetra directly through Telegram!

1. **Open Telegram** on your mobile or desktop.
2. **Scan the QR code below** to open the NagarNetra Telegram Bot.
3. Or search for the Telegram username:

   **[@NAGARNETRA_LUCKNOWBOT](https://t.me/NAGARNETRA_LUCKNOWBOT)**

4. Click **Start** and begin reporting garbage dumps or asking NagarNetra AI for information.

🚀 **That's it! You can now report a garbage dump, track complaints, or ask NagarNetra AI.**

<p align="center">
  <img src="./public/nagarnetra-telegram-qr.png" alt="NagarNetra Telegram Bot QR Code" width="350">
</p>

---

<div align="center">
  <h2>Try NagarNetra</h2>
  
  <a href="https://nagarnetra-4a55d.web.app" target="_blank">
    <img src="https://img.shields.io/badge/Public_Dashboard-Live-0ea5e9?style=for-the-badge&logo=firebase" alt="Public Dashboard" />
  </a>
  &nbsp;&nbsp;
  <a href="https://nagarnetra-4a55d.web.app/admin" target="_blank">
    <img src="https://img.shields.io/badge/Admin_Panel-Live-4f46e5?style=for-the-badge&logo=firebase" alt="Admin Panel" />
  </a>
  <br /><br />
  
  <img src="assets/slide7_try_it.png" alt="Try NagarNetra" width="300" />
</div>
