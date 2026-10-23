import React, { Suspense, lazy, useState } from "react";
import {
  Camera,
  MapPin,
  Ticket,
  ShieldCheck,
  AlertTriangle,
  Send,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Lock,
  AlertCircle
} from "lucide-react";
import NagarNetraLogo from "../components/NagarNetraLogo";

const MapTab = lazy(() => import("../components/tabs/MapTab"));

const CONTENT = {
  en: {
    portalBadge: "Citizen Road Safety Portal",
    tagline: "AI-Powered Road Hazard Intelligence",

    // Section 1: Report a Road Hazard
    sec1Badge: "FASTEST RESPONSE",
    sec1Title: "REPORT A ROAD HAZARD",
    sec1Desc:
      "Spotted a dangerous pothole, open manhole, waterlogging, or fallen tree? Report it in seconds through our official Telegram bot.",
    reportBtn: "Report Hazard via Telegram",
    reportSubtext: "Opens Telegram App • Free & Instant • No Account Needed",
    botHandleLabel: "Official Bot:",
    openDirectly: "Open Bot",
    scanQrBtn: "Scan QR",
    hideQrBtn: "Hide QR",
    qrTip: "Scan with your phone camera to open Telegram directly.",
    botUnavailableTitle: "Reporting Bot Not Configured",
    botUnavailableDesc:
      "The Telegram reporting bot username is not configured in this environment.",

    // Section 2: Track My Report
    sec2Badge: "TRACK",
    sec2Title: "TRACK MY REPORT",
    sec2Desc:
      "Check the real-time status and repair verification of your submitted ticket directly in Telegram.",
    sec2CommandTip: "Send this command to our bot:",
    ticketInputPlaceholder: "Enter Ticket ID (e.g. HAZ-2026-0001)",
    trackBtn: "Track on Telegram",
    copyCommandBtn: "Copy Command",
    copiedFeedback: "Copied!",
    privacyNotice:
      "Status tracking is private to the original reporter's Telegram account.",

    // Section 3: How to Report
    sec3Badge: "GUIDE",
    sec3Title: "HOW TO REPORT",
    sec3Subtitle: "Simple 3-step visual guide to reporting hazards",
    step1Num: "01",
    step1Title: "TAKE A CLEAR PHOTO",
    step1Desc:
      "Capture the pothole, damage, or road obstacle clearly in daylight.",
    step2Num: "02",
    step2Title: "SHARE GPS LOCATION",
    step2Desc:
      "Open Telegram's location attachment (📎) and send exact coordinates.",
    step3Num: "03",
    step3Title: "GET TICKET & TRACK",
    step3Desc:
      "Receive unique ticket ID and track progress through /status TICKET_ID.",

    // Section 4: Privacy & Safety
    sec4Badge: "SAFETY",
    sec4Title: "PRIVACY & SAFETY",
    sec4Subtitle: "Essential civic guidelines for road reporting",
    tip1Num: "01",
    tip1Title: "LOCATION FOR REPORTING ONLY",
    tip1Desc:
      "GPS coordinates are used strictly to dispatch municipal repair crews to the road hazard.",
    tip2Num: "02",
    tip2Title: "NEVER RISK YOUR SAFETY",
    tip2Desc:
      "Never take photos while driving or in traffic. Always step safely onto the sidewalk first.",
    tip3Num: "03",
    tip3Title: "NO PERSONAL INFO NEEDED",
    tip3Desc:
      "No phone contacts, private travel history, or unnecessary citizen PII is ever collected.",

    // Footer
    adminLink: "Municipal Staff Login →",
    emergencyNote: "For life-threatening road accidents, dial 112 immediately."
  },
  hi: {
    portalBadge: "नागरिक सड़क सुरक्षा पोर्टल",
    tagline: "AI-संचालित सड़क सुरक्षा एवं निगरानी प्रणाली",

    // Section 1: Report a Road Hazard
    sec1Badge: "शीघ्र समाधान",
    sec1Title: "सड़क का गड्ढा / खतरा रिपोर्ट करें",
    sec1Desc:
      "सड़क पर खतरनाक गड्ढा, खुला मैनहोल, जलभराव या कोई रुकावट देखी? हमारे आधिकारिक टेलीग्राम बॉट से तुरंत रिपोर्ट करें।",
    reportBtn: "टेलीग्राम पर शिकायत दर्ज करें",
    reportSubtext: "टेलीग्राम खुलेगा • पूरी तरह निःशुल्क • किसी खाते की आवश्यकता नहीं",
    botHandleLabel: "आधिकारिक बॉट:",
    openDirectly: "बॉट खोलें",
    scanQrBtn: "QR कोड",
    hideQrBtn: "QR छिपाएं",
    qrTip: "फोन कैमरे से स्कैन करके टेलीग्राम में बॉट खोलें।",
    botUnavailableTitle: "रिपोर्टिंग बॉट कॉन्फ़िगर नहीं है",
    botUnavailableDesc:
      "टेलीग्राम बॉट यूजरनेम वातावरण में सेट नहीं है।",

    // Section 2: Track My Report
    sec2Badge: "ट्रैकिंग",
    sec2Title: "अपनी शिकायत की स्थिति ट्रैक करें",
    sec2Desc:
      "अपनी दर्ज शिकायत की प्रगति और मरम्मत की स्थिति सीधे टेलीग्राम पर कभी भी देखें।",
    sec2CommandTip: "टेलीग्राम बॉट को यह कमांड भेजें:",
    ticketInputPlaceholder: "टिकट नंबर डालें (जैसे HAZ-2026-0001)",
    trackBtn: "टेलीग्राम पर ट्रैक करें",
    copyCommandBtn: "कमांड कॉपी करें",
    copiedFeedback: "कॉपी हो गई!",
    privacyNotice:
      "डेटा सुरक्षा के लिए, शिकायत केवल उसी टेलीग्राम खाते से ट्रैक की जा सकती है जिससे दर्ज की गई थी।",

    // Section 3: How to Report
    sec3Badge: "मार्गदर्शिका",
    sec3Title: "रिपोर्ट कैसे करें?",
    sec3Subtitle: "सड़क के गड्ढों को रिपोर्ट करने के 3 आसान चरण",
    step1Num: "01",
    step1Title: "साफ फोटो खींचें",
    step1Desc:
      "सड़क के गड्ढे या खतरे की दिन के उजाले में साफ फोटो लें ताकि समस्या स्पष्ट दिखे।",
    step2Num: "02",
    step2Title: "GPS लोकेशन भेजें",
    step2Desc:
      "टेलीग्राम में अटैचमेंट (📎) दबाएं और Location चुनकर अपनी लोकेशन शेयर करें।",
    step3Num: "03",
    step3Title: "टिकट आईडी पाएं और ट्रैक करें",
    step3Desc:
      "तुरंत यूनिक टिकट आईडी पाएं और /status TICKET_ID से प्रगति ट्रैक करें।",

    // Section 4: Privacy & Safety
    sec4Badge: "सुरक्षा",
    sec4Title: "सुरक्षा एवं गोपनीयता निर्देश",
    sec4Subtitle: "सड़क रिपोर्टिंग के लिए आवश्यक नागरिक दिशानिर्देश",
    tip1Num: "01",
    tip1Title: "लोकेशन केवल रिपोर्टिंग के लिए",
    tip1Desc:
      "GPS का उपयोग केवल मरम्मत दल को घटनास्थल तक भेजने के लिए होता है।",
    tip2Num: "02",
    tip2Title: "सुरक्षा से समझौता कभी न करें",
    tip2Desc:
      "गाड़ी चलाते हुए या ट्रैफिक में फोटो न लें। हमेशा फुटपाथ पर रुकें।",
    tip3Num: "03",
    tip3Title: "निजी जानकारी की आवश्यकता नहीं",
    tip3Desc:
      "कोई फोन संपर्क, यात्रा इतिहास या अनावश्यक निजी डेटा एकत्र नहीं होता।",

    // Footer
    adminLink: "नगर निगम कर्मचारी लॉगिन →",
    emergencyNote: "सड़क दुर्घटना या आपातकालीन चिकित्सा स्थिति के लिए सीधे 112 डायल करें।"
  }
};

export default function PublicDashboard({
  hazards = [],
  points = [],
  reports = []
}) {
  const [lang, setLang] = useState("en"); // "en" | "hi"
  const [showQr, setShowQr] = useState(false);
  const [ticketInput, setTicketInput] = useState("");
  const [copied, setCopied] = useState(false);

  const activeList = hazards.length > 0 ? hazards : points;

  // Retrieve configured bot username from environment with verified repository fallback
  const rawBotUsername = (
    import.meta.env.VITE_TELEGRAM_BOT_USERNAME ||
    "NAGARNETRA_LUCKNOWBOT"
  ).trim();

  // Strip leading @ if present
  const botUsername = rawBotUsername.replace(/^@/, "");
  const isBotConfigured = Boolean(botUsername);

  // Deep-link to Telegram bot
  const botUrl = isBotConfigured ? `https://t.me/${botUsername}?start=report` : null;
  const botChatUrl = isBotConfigured ? `https://t.me/${botUsername}` : null;

  const t = CONTENT[lang];

  // Helper to copy command
  const handleCopyCommand = async (commandText) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(commandText);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = commandText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  const activeTicketCode = ticketInput.trim() ? ticketInput.trim().toUpperCase() : "HAZ-2026-0001";
  const activeStatusCommand = `/status ${activeTicketCode}`;

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-white font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900 select-none">
      {/* ── 1. HEADER (Compact, Single Pure-White Header) ─────────────── */}
      <header className="h-14 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-30">
        {/* Left: NagarNetra Branding */}
        <div className="flex items-center gap-2.5 min-w-0">
          <NagarNetraLogo size={32} />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black text-slate-900 tracking-tight leading-none">
                NagarNetra
              </span>
              <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-wide">
                {lang === "en" ? "Official" : "आधिकारिक"}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 truncate mt-0.5">
              {t.tagline}
            </span>
          </div>
        </div>

        {/* Right: Language Selector + Staff link */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/admin"
            className="hidden sm:inline-flex text-xs font-extrabold text-slate-600 hover:text-blue-600 transition-colors"
          >
            {t.adminLink}
          </a>
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setLang("en")}
              className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                lang === "en"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("hi")}
              className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                lang === "hi"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              हिन्दी
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. TWO-COLUMN WORKSPACE (Desktop: Map 70% | Sidebar 30% / Mobile: Stacked) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden relative bg-white">

        {/* ── MOBILE QUICK CTA BANNER (Visible on mobile only, above the map) ── */}
        <div className="block lg:hidden p-3.5 bg-white border-b-2 border-slate-100 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <h2 className="text-xs font-black text-slate-900 tracking-tight">{t.sec1Title}</h2>
              </div>
              <p className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">{t.reportSubtext}</p>
            </div>
            {isBotConfigured && (
              <a
                href={botUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 active:bg-blue-700 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 shrink-0 shadow-md shadow-blue-600/20 border border-blue-700"
              >
                <Send size={13} />
                <span>{lang === "en" ? "Report" : "रिपोर्ट"}</span>
              </a>
            )}
          </div>
        </div>

        {/* ── LEFT / MAIN AREA (69%–71% on desktop): Prominent Road Hazard Map ── */}
        <main className="w-full lg:w-[69%] xl:w-[71%] h-[380px] sm:h-[460px] lg:h-full p-2.5 sm:p-3 shrink-0 lg:shrink flex flex-col bg-white">
          <div className="w-full h-full rounded-2xl overflow-hidden border-2 border-slate-200/90 shadow-[3px_3px_0px_0px_rgba(15,23,42,0.06)] bg-white relative">
            <Suspense
              fallback={
                <div className="flex h-full w-full items-center justify-center bg-white text-slate-500 font-bold text-xs">
                  Loading Live Hazard Map...
                </div>
              }
            >
              <MapTab
                hazards={activeList}
                dumpPoints={points}
                reports={reports}
                isPublic={true}
              />
            </Suspense>
          </div>
        </main>

        {/* ── RIGHT SIDEBAR (29%–31% on desktop): Premium Citizen Cards ── */}
        <aside className="w-full lg:w-[31%] xl:w-[29%] lg:min-w-[340px] lg:max-w-[420px] h-auto lg:h-full overflow-visible lg:overflow-y-auto bg-white border-t lg:border-t-0 lg:border-l border-slate-200/90 p-4 space-y-4 shrink-0 flex flex-col justify-between">
          <div className="space-y-4">

            {/* ── CARD 1: REPORT A ROAD HAZARD (Primary CTA, Reference-Inspired) ── */}
            <section
              id="report-hazard"
              aria-labelledby="report-hazard-title"
              className="bg-white rounded-2xl border-2 border-slate-900/10 shadow-[4px_4px_0px_0px_#f97316] p-4 sm:p-5 relative transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_#f97316]"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  {t.sec1Badge}
                </span>

                {isBotConfigured && (
                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    @{botUsername}
                  </span>
                )}
              </div>

              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h2
                    id="report-hazard-title"
                    className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug"
                  >
                    {t.sec1Title}
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1 font-medium">
                    {t.sec1Desc}
                  </p>
                </div>
                {/* Decorative Telegram Icon Container */}
                <div className="w-10 h-10 rounded-full bg-blue-50 border-2 border-blue-500 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
                  <Send size={16} className="-ml-0.5 text-blue-600" />
                </div>
              </div>

              {isBotConfigured ? (
                <div className="space-y-2.5 mt-3.5">
                  <a
                    href={botUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full min-h-[48px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl px-4 py-3 flex items-center justify-center gap-2 shadow-md shadow-blue-600/25 border-2 border-blue-700 cursor-pointer transition-all text-center select-none"
                  >
                    <Send size={15} className="shrink-0" />
                    <span>{t.reportBtn}</span>
                    <ExternalLink size={13} className="shrink-0 opacity-80" />
                  </a>

                  <p className="text-center text-[10px] text-slate-400 font-bold">
                    {t.reportSubtext}
                  </p>

                  {/* Bot handle quick-actions */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs flex-wrap">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                      <span>{t.botHandleLabel}</span>
                      <a
                        href={botChatUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono font-bold text-blue-600 hover:underline"
                      >
                        @{botUsername}
                      </a>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setShowQr(!showQr)}
                        className="inline-flex items-center gap-1 text-slate-700 hover:text-blue-600 text-[11px] font-bold px-2 py-0.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <QrCode size={12} />
                        <span>{showQr ? t.hideQrBtn : t.scanQrBtn}</span>
                      </button>
                      <button
                        onClick={() => handleCopyCommand(`@${botUsername}`)}
                        className="inline-flex items-center gap-1 text-slate-700 hover:text-blue-600 text-[11px] font-bold px-2 py-0.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        <span>{copied ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  {showQr && (
                    <div className="mt-2 p-3 bg-slate-50 border-2 border-slate-200 rounded-xl flex flex-col items-center text-center animate-in fade-in duration-150">
                      <div className="w-36 h-36 bg-white p-1 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden shadow-2xs">
                        <img
                          src="/nagarnetra-telegram-qr.png"
                          alt="Telegram Bot QR Code"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/favicon.svg";
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 font-bold">
                        {t.qrTip}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                  <div className="flex items-center gap-1 font-bold text-amber-800">
                    <AlertCircle size={14} className="text-amber-600 shrink-0" />
                    <span>{t.botUnavailableTitle}</span>
                  </div>
                  <p className="text-[11px] text-amber-700 mt-0.5">{t.botUnavailableDesc}</p>
                </div>
              )}
            </section>

            {/* ── CARD 2: TRACK MY REPORT (Reference-Inspired) ───────────── */}
            <section
              id="track-report"
              aria-labelledby="track-report-title"
              className="bg-white rounded-2xl border-2 border-slate-900/10 shadow-[4px_4px_0px_0px_#4f46e5] p-4 sm:p-5 space-y-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_#4f46e5]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-indigo-50 border-2 border-indigo-400 text-indigo-600 flex items-center justify-center shrink-0">
                    <Ticket size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-black text-slate-400 tracking-wider">
                      {t.sec2Badge}
                    </span>
                    <h3
                      id="track-report-title"
                      className="text-sm font-black text-slate-900 tracking-tight leading-none"
                    >
                      {t.sec2Title}
                    </h3>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {t.sec2Desc}
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  {t.sec2CommandTip}
                </p>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={ticketInput}
                      onChange={(e) => setTicketInput(e.target.value)}
                      placeholder={t.ticketInputPlaceholder}
                      className="w-full bg-white border-2 border-slate-200 focus:border-indigo-600 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none uppercase transition-colors"
                    />
                    {ticketInput && (
                      <button
                        onClick={() => setTicketInput("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleCopyCommand(activeStatusCommand)}
                    className="shrink-0 bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-black transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                    title="Copy command"
                  >
                    {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    <span>{copied ? t.copiedFeedback : t.copyCommandBtn}</span>
                  </button>
                </div>

                {/* Dark Navy Command Preview Strip (with green command text) */}
                <div className="flex items-center justify-between gap-2 bg-[#0f172a] text-slate-100 px-3.5 py-2.5 rounded-xl font-mono text-xs border border-slate-800 shadow-inner">
                  <span className="truncate text-[#4ade80] font-bold">
                    {activeStatusCommand}
                  </span>
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black shrink-0">
                    Command
                  </span>
                </div>

                {isBotConfigured && (
                  <a
                    href={botChatUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold py-2 px-3 rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center shadow-2xs"
                  >
                    <span>{t.trackBtn}</span>
                    <ExternalLink size={12} className="text-slate-500" />
                  </a>
                )}
              </div>

              <div className="flex items-start gap-1.5 text-[10px] text-slate-400 leading-tight font-medium">
                <Lock size={12} className="shrink-0 mt-0.5 text-slate-400" />
                <span>{t.privacyNotice}</span>
              </div>
            </section>

            {/* ── CARD 3: HOW TO REPORT (Reference Card Layout: 3 Distinct Steps) ── */}
            <section
              id="how-to-report"
              aria-labelledby="how-to-report-title"
              className="bg-white rounded-2xl border-2 border-slate-900/10 shadow-[4px_4px_0px_0px_#0284c7] p-4 sm:p-5 space-y-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_#0284c7]"
            >
              <div>
                <span className="text-[10px] font-mono font-black text-slate-400 tracking-wider">
                  {t.sec3Badge}
                </span>
                <h3
                  id="how-to-report-title"
                  className="text-sm font-black text-slate-900 tracking-tight leading-none"
                >
                  {t.sec3Title}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                  {t.sec3Subtitle}
                </p>
              </div>

              <div className="space-y-2.5">
                {/* Step 1: Photo */}
                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-[3px_3px_0px_0px_#0284c7] transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-sky-50 border-2 border-sky-400 text-sky-600 flex items-center justify-center shrink-0">
                      <Camera size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-mono font-black text-sky-600 tracking-wider">
                        {t.step1Num}
                      </div>
                      <h4 className="text-xs font-black text-slate-900 tracking-tight leading-tight">
                        {t.step1Title}
                      </h4>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1.5 leading-snug font-medium pl-12">
                    {t.step1Desc}
                  </p>
                </div>

                {/* Step 2: Location */}
                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-[3px_3px_0px_0px_#10b981] transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 border-2 border-emerald-400 text-emerald-600 flex items-center justify-center shrink-0">
                      <MapPin size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-mono font-black text-emerald-600 tracking-wider">
                        {t.step2Num}
                      </div>
                      <h4 className="text-xs font-black text-slate-900 tracking-tight leading-tight">
                        {t.step2Title}
                      </h4>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1.5 leading-snug font-medium pl-12">
                    {t.step2Desc}
                  </p>
                </div>

                {/* Step 3: Ticket & Track */}
                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-[3px_3px_0px_0px_#8b5cf6] transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-violet-50 border-2 border-violet-400 text-violet-600 flex items-center justify-center shrink-0">
                      <ShieldCheck size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-mono font-black text-violet-600 tracking-wider">
                        {t.step3Num}
                      </div>
                      <h4 className="text-xs font-black text-slate-900 tracking-tight leading-tight">
                        {t.step3Title}
                      </h4>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1.5 leading-snug font-medium pl-12">
                    {t.step3Desc}
                  </p>
                </div>
              </div>
            </section>

            {/* ── CARD 4: PRIVACY & SAFETY (Reference-Inspired: 3 Visual Tips) ── */}
            <section
              id="privacy-safety"
              aria-labelledby="privacy-safety-title"
              className="bg-white rounded-2xl border-2 border-slate-900/10 shadow-[4px_4px_0px_0px_#10b981] p-4 sm:p-5 space-y-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_#10b981]"
            >
              <div>
                <span className="text-[10px] font-mono font-black text-slate-400 tracking-wider">
                  {t.sec4Badge}
                </span>
                <h3
                  id="privacy-safety-title"
                  className="text-sm font-black text-slate-900 tracking-tight leading-none"
                >
                  {t.sec4Title}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                  {t.sec4Subtitle}
                </p>
              </div>

              <div className="space-y-2.5">
                {/* Tip 1: Location Only */}
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-[3px_3px_0px_0px_#10b981] flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 border-2 border-emerald-400 text-emerald-600 flex items-center justify-center shrink-0">
                    <ShieldCheck size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-mono font-black text-emerald-600 tracking-wider">
                      {t.tip1Num}
                    </div>
                    <h5 className="text-xs font-black text-slate-900 leading-tight">
                      {t.tip1Title}
                    </h5>
                    <p className="text-[10px] text-slate-600 mt-0.5 leading-snug font-medium">
                      {t.tip1Desc}
                    </p>
                  </div>
                </div>

                {/* Tip 2: Never Risk Safety */}
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-[3px_3px_0px_0px_#f97316] flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-orange-50 border-2 border-orange-400 text-orange-600 flex items-center justify-center shrink-0">
                    <AlertTriangle size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-mono font-black text-orange-600 tracking-wider">
                      {t.tip2Num}
                    </div>
                    <h5 className="text-xs font-black text-slate-900 leading-tight">
                      {t.tip2Title}
                    </h5>
                    <p className="text-[10px] text-slate-600 mt-0.5 leading-snug font-medium">
                      {t.tip2Desc}
                    </p>
                  </div>
                </div>

                {/* Tip 3: No Personal Info */}
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-[3px_3px_0px_0px_#0284c7] flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-sky-50 border-2 border-sky-400 text-sky-600 flex items-center justify-center shrink-0">
                    <Lock size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-mono font-black text-sky-600 tracking-wider">
                      {t.tip3Num}
                    </div>
                    <h5 className="text-xs font-black text-slate-900 leading-tight">
                      {t.tip3Title}
                    </h5>
                    <p className="text-[10px] text-slate-600 mt-0.5 leading-snug font-medium">
                      {t.tip3Desc}
                    </p>
                  </div>
                </div>
              </div>
            </section>

          </div>

          {/* ── SIDEBAR FOOTER ─────────────────────────────────────────── */}
          <footer className="pt-3 mt-4 border-t border-slate-100 text-center space-y-1">
            <p className="text-[10px] text-rose-600 font-bold">
              {t.emergencyNote}
            </p>
            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-semibold">
              <span>SI-02 Road Intelligence</span>
              <span>•</span>
              <a
                href="/admin"
                className="text-blue-600 hover:text-blue-800 font-black hover:underline transition-colors"
              >
                {t.adminLink}
              </a>
            </div>
          </footer>
        </aside>

      </div>
    </div>
  );
}
