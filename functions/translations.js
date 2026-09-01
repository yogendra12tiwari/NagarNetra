const translations = {
  en: {
    // 1. Onboarding
    welcome_msg: "👋 Welcome to *NagarNetra* — Lucknow's smart waste management system!\n\n⚠️ *Important:* This bot currently only operates strictly within the *Lucknow city limits*.\n\nPlease reply with:\n1️⃣  *1* — Report a new garbage dump\n2️⃣  *2* — Track an existing report\n3️⃣  *3* — Ask NagarNetra AI (Wards, corporators, cleanliness info)",
    invalid_choice: "Please reply with *1* to report new garbage, *2* to track an existing report, or *3* to ask the AI.",
    
    // AI Agent Flow
    ai_welcome: "🤖 *NagarNetra AI Assistant*\n\nWhat would you like to know? You can ask me about:\n- Cleanliness reports in your area\n- Ward corporator details\n- Tracking complaints by ID\n\n(Type *menu* to exit at any time)",
    ai_menu_returned: "You have returned to the main menu. Reply *hey* to restart.",
    
    // 2. Reporting Flow
    rate_limit: "🚫 *Rate Limit Exceeded*\n\nYou have reached the maximum number of reports (1000) allowed per 24 hours to prevent spam.\n\nPlease try again tomorrow. Thank you for helping keep Lucknow clean! 🌿",
    request_photo: "📸 *New Report*\n\nStep 1 of 2: Please send a *photo* of the garbage dump site.",
    ai_spam_alert: "🤖 *AI Spam Filter Alert*\n\nThis image does not appear to contain garbage or waste.\n\nPlease send a valid photo of the dump site, or reply *skip* to continue without one.",
    duplicate_photo: "⚠️ *Duplicate Image Detected*\n\nThis exact photo has already been submitted to our system recently. Please send a new photo of the site, or reply *skip*.",
    photo_received: "✅ Photo received!\n\n📍 Step 2 of 2: Now share the *Location Pin* for this spot.\nTap the 📎 attachment icon → choose *Location*.",
    photo_skipped: "Photo skipped.\n\n📍 Step 2 of 2: Please share the *Location Pin* for this spot.\nTap the 📎 attachment icon → choose *Location*.",
    no_photo: "I didn't receive a photo. 📸\n\nPlease send a photo of the dump site, or reply *skip* to continue without one.",
    
    // 3. Location & Creation
    location_outside_bounds: "⚠️ *Out of Bounds*\n\nIt looks like this location is outside Lucknow city limits. We currently only operate within Lucknow.\n\nPlease submit a location from within the city limits.",
    report_success: "✅ *Report Submitted Successfully!*\n\n🪪 Your Report ID: *{reportId}*\n📍 Community Issue ID: *{communityId}*\n\nYour report is now *live* on the NagarNetra dashboard. A cleanup team will be dispatched based on priority.\n\nTo track your report later, reply *2* and enter *{reportId}*.\n\nThank you for helping keep Lucknow clean! 🌿",
    report_merged: "✅ *Report Merged Successfully!*\n\n🪪 Your Report ID: *{reportId}*\n📍 Community Issue ID: *{communityId}*\n\nSomeone recently reported a dump very close to this spot. We have linked your report to it to boost its priority on our dashboard!\n\nTo track your report later, reply *2* and enter *{reportId}*.\n\nThank you for helping keep Lucknow clean! 🌿",
    request_location_pin: "Please use the WhatsApp attachment button (📎) to send your *Location Pin* so we can map the dump site accurately.",
    
    // 4. Tracking
    request_tracking_id: "🔍 *Track a Report*\n\nPlease send your Report ID (e.g. *NGN-0042* or *SWC-0042*).",
    report_not_found: "❌ Report *{code}* not found.\n\nPlease check the ID and try again, or reply *1* to file a new report.",
    invalid_tracking_id: "That doesn't look like a valid Report ID.\n\nPlease send an ID in the format *NGN-XXXX* or *SWC-XXXX* (e.g. NGN-0042), or reply *1* to file a new report.",
    
    status_active: "🔄 *{code}* — *Active*\n📍 Location: {name}\n📊 {count} report(s) filed\n📅 Last updated: {date}\n\nYour report is in the queue. A cleanup team will be dispatched shortly.",
    status_resolved: "✅ *{code}* — *Resolved*\n📍 Location: {name}\n📅 Cleaned on: {date}\n\nThank you for helping keep Lucknow clean! 🌿",
    status_unmanaged: "⚠️ *{code}* — *Unmanaged*\n📍 Location: {name}\n⚠️ Reason: {reason}\n\nA re-inspection has been requested. We apologize for the inconvenience.",
    status_unknown: "Report {code}: Status — {status}",
    
    // 5. Feedback
    feedback_request: "🧹 *Cleanup Update — {reportId}*\n\nThe garbage site at *{name}* has been cleaned by the NagarNetra team.\n\nPlease rate the cleanup quality:\nReply with a number from *1* (very poor) to *5* (excellent).\n\nYour feedback helps us improve! 🙏",
    feedback_success: "⭐ Thank you for rating us *{rating}/5*! We're glad the area is clean now. 🙌",
    feedback_proof_request: "Thank you for your feedback ({rating}/5). We're sorry the cleanup wasn't satisfactory.\n\n📸 Please send a *photo* of the site showing the remaining garbage so we can reopen the case.",
    feedback_invalid: "Please reply with a number between *1* and *5* to rate the cleanup.\n\n1 = Very poor  |  5 = Excellent",
    feedback_proof_received: "✅ Photo proof received.\n\nThis location has been flagged for re-inspection on our dashboard. Thank you for holding us accountable! 🙏",
    
    // 6. Generic
    error: "Sorry, something went wrong on our end. Please try again later.",
  },
  hi: {
    // 1. Onboarding
    welcome_msg: "👋 *NagarNetra* में आपका स्वागत है — लखनऊ का स्मार्ट कचरा प्रबंधन सिस्टम!\n\n⚠️ *जरूरी सूचना:* यह बॉट अभी केवल *लखनऊ शहर की सीमा* के भीतर ही काम करता है।\n\nकृपया उत्तर दें:\n1️⃣ *1* — नए कचरे के ढेर की रिपोर्ट करने के लिए\n2️⃣ *2* — अपनी पुरानी रिपोर्ट को ट्रैक करने के लिए\n3️⃣ *3* — NagarNetra AI से पूछें (वार्ड, पार्षद, और सफाई की जानकारी के लिए)",
    invalid_choice: "कृपया नई रिपोर्ट के लिए *1*, पुरानी रिपोर्ट ट्रैक करने के लिए *2*, या AI से पूछने के लिए *3* भेजें।",
    
    // AI Agent Flow
    ai_welcome: "🤖 *NagarNetra AI Assistant*\n\nआप क्या जानना चाहते हैं? आप मुझसे पूछ सकते हैं:\n- आपके इलाके में सफाई की रिपोर्ट\n- वार्ड पार्षद का विवरण\n- ID द्वारा शिकायत ट्रैकिंग\n\n(किसी भी समय बाहर निकलने के लिए *menu* टाइप करें)",
    ai_menu_returned: "आप मुख्य मेनू पर वापस आ गए हैं। पुनः आरंभ करने के लिए *hey* भेजें।",
    
    // 2. Reporting Flow
    rate_limit: "🚫 *सीमा समाप्त*\n\nस्पैम को रोकने के लिए आप 24 घंटे में अधिकतम 1000 रिपोर्ट ही दर्ज कर सकते हैं।\n\nकृपया कल फिर प्रयास करें। लखनऊ को साफ रखने में मदद के लिए धन्यवाद! 🌿",
    request_photo: "📸 *नई रिपोर्ट*\n\nचरण 1 (कुल 2): कृपया कचरे के ढेर की *फोटो* भेजें।",
    ai_spam_alert: "🤖 *AI स्पैम फ़िल्टर अलर्ट*\n\nइस तस्वीर में कचरा या गंदगी नहीं दिख रही है।\n\nकृपया कचरे की सही तस्वीर भेजें, या बिना तस्वीर के आगे बढ़ने के लिए *skip* लिखें।",
    duplicate_photo: "⚠️ *डुप्लिकेट इमेज*\n\nयह तस्वीर पहले ही हमारे सिस्टम में जमा की जा चुकी है। कृपया नई तस्वीर भेजें, या *skip* लिखें।",
    photo_received: "✅ फोटो मिल गई!\n\n📍 चरण 2 (कुल 2): अब कृपया इस जगह की *लोकेशन (Location)* भेजें।\nअटैचमेंट (📎) आइकन दबाएं → *Location* चुनें।",
    photo_skipped: "फोटो छोड़ दी गई।\n\n📍 चरण 2 (कुल 2): कृपया इस जगह की *लोकेशन (Location)* भेजें।\nअटैचमेंट (📎) आइकन दबाएं → *Location* चुनें।",
    no_photo: "मुझे कोई फोटो नहीं मिली। 📸\n\nकृपया कचरे की फोटो भेजें, या बिना फोटो के आगे बढ़ने के लिए *skip* लिखें।",
    
    // 3. Location & Creation
    location_outside_bounds: "⚠️ *सीमा से बाहर*\n\nयह लोकेशन लखनऊ शहर की सीमा से बाहर है। हम अभी केवल लखनऊ में ही काम करते हैं।\n\nकृपया शहर के भीतर की लोकेशन भेजें।",
    report_success: "✅ *रिपोर्ट सफलतापूर्वक दर्ज हो गई!*\n\n🪪 आपकी रिपोर्ट ID: *{reportId}*\n📍 कम्युनिटी समस्या ID: *{communityId}*\n\nआपकी रिपोर्ट हमारे डैशबोर्ड पर लाइव है। जल्द ही एक सफाई टीम भेजी जाएगी।\n\nभविष्य में अपनी रिपोर्ट ट्रैक करने के लिए *2* भेजें और अपना ID (*{reportId}*) दर्ज करें।\n\nलखनऊ को स्वच्छ रखने के लिए धन्यवाद! 🌿",
    report_merged: "✅ *रिपोर्ट सफलतापूर्वक दर्ज हो गई!*\n\n🪪 आपकी रिपोर्ट ID: *{reportId}*\n📍 कम्युनिटी समस्या ID: *{communityId}*\n\nकिसी ने हाल ही में इसी जगह के पास कचरे की रिपोर्ट की थी। हमने आपकी रिपोर्ट को उसी के साथ जोड़ दिया है ताकि इसकी प्राथमिकता बढ़ सके!\n\nभविष्य में अपनी रिपोर्ट ट्रैक करने के लिए *2* भेजें और अपना ID (*{reportId}*) दर्ज करें।\n\nलखनऊ को स्वच्छ रखने के लिए धन्यवाद! 🌿",
    request_location_pin: "कृपया WhatsApp अटैचमेंट बटन (📎) का उपयोग करके अपना *लोकेशन पिन* भेजें ताकि हम जगह को सही ढंग से मैप कर सकें।",
    
    // 4. Tracking
    request_tracking_id: "🔍 *रिपोर्ट ट्रैक करें*\n\nकृपया अपनी रिपोर्ट ID भेजें (उदाहरण: *NGN-0042* या *SWC-0042*)।",
    report_not_found: "❌ रिपोर्ट *{code}* नहीं मिली।\n\nकृपया ID जांचें और पुनः प्रयास करें, या नई रिपोर्ट दर्ज करने के लिए *1* भेजें।",
    invalid_tracking_id: "यह मान्य रिपोर्ट ID नहीं लग रही है।\n\nकृपया *NGN-XXXX* या *SWC-XXXX* प्रारूप में ID भेजें (जैसे NGN-0042), या नई रिपोर्ट के लिए *1* भेजें।",
    
    status_active: "🔄 *{code}* — *सक्रिय (Active)*\n📍 स्थान: {name}\n📊 {count} रिपोर्ट(s) दर्ज\n📅 अंतिम अपडेट: {date}\n\nआपकी रिपोर्ट कतार में है। सफाई टीम जल्द ही भेजी जाएगी।",
    status_resolved: "✅ *{code}* — *साफ हो गया (Resolved)*\n📍 स्थान: {name}\n📅 सफाई की तारीख: {date}\n\nलखनऊ को स्वच्छ रखने में मदद के लिए धन्यवाद! 🌿",
    status_unmanaged: "⚠️ *{code}* — *अव्यवस्थित (Unmanaged)*\n📍 स्थान: {name}\n⚠️ कारण: {reason}\n\nइस जगह के पुनरीक्षण (Re-inspection) का अनुरोध किया गया है। असुविधा के लिए हमें खेद है।",
    status_unknown: "रिपोर्ट {code}: स्थिति — {status}",
    
    // 5. Feedback
    feedback_request: "🧹 *सफाई अपडेट — {reportId}*\n\n* {name} * पर कचरे की साइट को NagarNetra टीम द्वारा साफ कर दिया गया है।\n\nकृपया सफाई की गुणवत्ता को रेटिंग दें:\n*1* (बहुत खराब) से *5* (बहुत बढ़िया) के बीच कोई नंबर भेजें।\n\nआपकी प्रतिक्रिया हमें बेहतर बनाने में मदद करती है! 🙏",
    feedback_success: "⭐ हमें *{rating}/5* रेटिंग देने के लिए धन्यवाद! हमें खुशी है कि जगह अब साफ है। 🙌",
    feedback_proof_request: "आपकी प्रतिक्रिया ({rating}/5) के लिए धन्यवाद। हमें खेद है कि सफाई संतोषजनक नहीं थी।\n\n📸 कृपया इस जगह की एक *फोटो* भेजें जिसमें बचा हुआ कचरा दिख रहा हो, ताकि हम इस केस को दोबारा खोल सकें।",
    feedback_invalid: "कृपया सफाई को रेटिंग देने के लिए *1* और *5* के बीच का कोई नंबर भेजें।\n\n1 = बहुत खराब | 5 = बहुत बढ़िया",
    feedback_proof_received: "✅ फोटो मिल गई है।\n\nइस जगह को हमारे डैशबोर्ड पर फिर से जांच (Re-inspection) के लिए चिह्नित कर दिया गया है। हमें जवाबदेह बनाए रखने के लिए धन्यवाद! 🙏",
    
    // 6. Generic
    error: "क्षमा करें, हमारी तरफ से कोई तकनीकी समस्या आ गई है। कृपया कुछ समय बाद पुनः प्रयास करें।",
  }
};

module.exports = translations;
