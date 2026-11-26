import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const translations = {
  en: {
    // Brand & System
    brandName: 'Rural Community Biogas',
    systemTagline: 'Clean Energy. Greener Tomorrow.',
    resourceSystem: 'Resource Management System',
    
    // Roles
    adminRole: 'National Administrator',
    coordRole: 'Village Coordinator',
    householdRole: 'Farming Household',

    // Nav Items
    overview: 'Overview Dashboard',
    feasibilityCalc: 'Feasibility Calculator',
    wasteManagement: 'Feedstock & Waste',
    wasteScheduling: 'Waste Pickup Schedules',
    communitySharing: 'Community Sharing',
    plantMonitoring: 'Plant Health & Kinetics',
    breakdowns: 'Plant Breakdown Reports',
    grievances: 'Complaints & Grievances',
    gasAlerts: 'Gas Supply Alerts',
    subsidies: 'Government Schemes & Subsidies',
    fertilizerMarket: 'Bio-Slurry Marketplace',
    finances: 'Financial Ledger & Receipts',
    gisMap: 'Geographical Map',
    reports: 'Reports & Analytics',
    emergency: 'EMERGENCY SAFETY ALERT',
    offlineSync: 'Offline Synchronization',
    myHousehold: 'My Household & Farm',

    // Dashboard headings & metrics
    welcomeBack: 'Welcome back',
    familyBioenergyHub: 'Family Bioenergy Hub',
    coordinatorOperations: 'Village Operations Hub',
    adminCommandCenter: 'National Governance Command Center',
    totalBiogasProduced: 'Total Biogas Produced',
    monthlySavings: 'Estimated Fuel Savings',
    slurryEntitlement: 'Bio-Slurry Entitlement',
    dailyIntake: 'Daily Waste Collected',
    activePlants: 'Active Community Digesters',
    activeHouseholds: 'Active Participating Households',

    // Actions & Buttons
    logWasteToday: 'Log Today’s Waste Intake',
    schedulePickup: 'Request Waste Pickup',
    reportIssue: 'Report Plant Issue',
    lodgeGrievance: 'Lodge Grievance / Suggestion',
    reportEmergencyBtn: 'REPORT GAS LEAK / HAZARD',
    applyScheme: 'Apply for Subsidy',
    orderSlurry: 'Request Fertilizer',
    downloadReceipt: 'Download Official Receipt',
    syncOfflineData: 'Sync Offline Records',
    voiceAssistant: 'Voice Assistant',
    listening: 'Listening... Speak your command',
    searchVoice: 'Ask in Voice',

    // Statuses
    submitted: 'Submitted',
    approved: 'Approved',
    scheduled: 'Scheduled',
    collected: 'Collected',
    missed: 'Missed',
    underRepair: 'Under Repair',
    resolved: 'Resolved',
    closed: 'Closed',
    activeEmergency: 'ACTIVE EMERGENCY',

    // Emergency Guidance
    emergencyTitle: 'IMMEDIATE SAFETY GUIDELINES',
    emergencyStep1: 'Evacuate all people and livestock from the suspected leak area.',
    emergencyStep2: 'DO NOT ignite flames, turn on lights, or use mobile phones near the gas.',
    emergencyStep3: 'Close the nearest manual pipeline valve if safely accessible.',
    emergencyStep4: 'Stay upwind and wait for trained technicians.'
  },
  ta: {
    // Brand & System
    brandName: 'கிராமப்புற சமூக உயிர்வாயு',
    systemTagline: 'தூய ஆற்றல். பசுமையான எதிர்காலம்.',
    resourceSystem: 'வள மேலாண்மை அமைப்பு',

    // Roles
    adminRole: 'தேசிய நிர்வாகி',
    coordRole: 'கிராம ஒருங்கிணைப்பாளர்',
    householdRole: 'விவசாய குடும்ப பயனர்',

    // Nav Items
    overview: 'கண்ணோட்டம் முகப்பு',
    feasibilityCalc: 'உயிர்வாயு சாத்தியக்கூறு கணக்கீடு',
    wasteManagement: 'கழிவு மற்றும் மூலப்பொருள்',
    wasteScheduling: 'கழிவு சேகரிப்பு அட்டவணை',
    communitySharing: 'சமூக பகிர்வு மையம்',
    plantMonitoring: 'ஆலை கண்காணிப்பு & இயக்கம்',
    breakdowns: 'ஆலை பழுதுபார்ப்பு புகார்கள்',
    grievances: 'குறைதீர்ப்பு & பரிந்துரைகள்',
    gasAlerts: 'எரிவாயு விநியோக அறிவிப்புகள்',
    subsidies: 'அரசு மானியங்கள் & திட்டங்கள்',
    fertilizerMarket: 'இயற்கை உரம் சந்தை',
    finances: 'நிதி பதிவேடு & ரசீதுகள்',
    gisMap: 'வரைபடம் (GIS)',
    reports: 'அறிக்கைகள் & பகுப்பாய்வு',
    emergency: 'அவசர பாதுகாப்பு எச்சரிக்கை',
    offlineSync: 'இணையற்ற தரவு ஒத்திசைவு',
    myHousehold: 'என் குடும்பம் & கால்நடைகள்',

    // Dashboard headings & metrics
    welcomeBack: 'வணக்கம்',
    familyBioenergyHub: 'குடும்ப உயிர்வாயு மையம்',
    coordinatorOperations: 'கிராம செயல்பாட்டு மையம்',
    adminCommandCenter: 'தேசிய மேலாண்மை கட்டுப்பாட்டு மையம்',
    totalBiogasProduced: 'மொத்த உயிர்வாயு உற்பத்தி',
    monthlySavings: 'மதிப்பிடப்பட்ட எரிபொருள் சேமிப்பு',
    slurryEntitlement: 'தினசரி இயற்கை உர உரிமை',
    dailyIntake: 'இன்றைய கழிவு சேகரிப்பு',
    activePlants: 'செயலில் உள்ள கிராம ஆலைகள்',
    activeHouseholds: 'பங்கேற்கும் குடும்பங்கள்',

    // Actions & Buttons
    logWasteToday: 'இன்றைய கழிவை பதிவு செய்',
    schedulePickup: 'கழிவு சேகரிக்க கோரிக்கை',
    reportIssue: 'ஆலை பழுதை புகாரளி',
    lodgeGrievance: 'குறை / கருத்து பதிவு செய்',
    reportEmergencyBtn: 'எரிவாயு கசிவு / ஆபத்து புகாரளி',
    applyScheme: 'அரசு மானியத்திற்கு விண்ணப்பி',
    orderSlurry: 'உரம் கோரிக்கை வை',
    downloadReceipt: 'அதிகாரப்பூர்வ ரசீது பதிவிறக்கு',
    syncOfflineData: 'சேமித்த தரவை ஒத்திசை',
    voiceAssistant: 'குரல் உதவியாளர்',
    listening: 'கேட்கிறது... கட்டளையை பேசுங்கள்',
    searchVoice: 'குரல் மூலம் தேடுங்கள்',

    // Statuses
    submitted: 'சமர்ப்பிக்கப்பட்டது',
    approved: 'ஒப்புதல் அளிக்கப்பட்டது',
    scheduled: 'திட்டமிடப்பட்டது',
    collected: 'சேகரிக்கப்பட்டது',
    missed: 'தவறவிடப்பட்டது',
    underRepair: 'பழுதுபார்க்கப்படுகிறது',
    resolved: 'தீர்க்கப்பட்டது',
    closed: 'மூடப்பட்டது',
    activeEmergency: 'தீவிர அவசரநிலை',

    // Emergency Guidance
    emergencyTitle: 'உடனடி பாதுகாப்பு வழிகாட்டுதல்கள்',
    emergencyStep1: 'எரிவாயு கசியும் இடத்திலிருந்து உடனடியாக விலகி பாதுகாப்பான இடத்திற்கு செல்லவும்.',
    emergencyStep2: 'எந்த தீப்பொறி, மின்விசிறி அல்லது தொலைபேசியை அருகில் பயன்படுத்த வேண்டாம்.',
    emergencyStep3: 'பாதுகாப்பாக இருந்தால் குழாயின் முக்கிய வால்வை உடனடியாக மூடவும்.',
    emergencyStep4: 'பயிற்சி பெற்ற தொழில்நுட்ப வல்லுநர் வரும் வரை காத்திருக்கவும்.'
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('biogas_lang') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('biogas_lang', language);
  }, [language]);

  const t = (key, fallback = '') => {
    const dict = translations[language] || translations.en;
    return dict[key] || translations.en[key] || fallback || key;
  };

  // Text-to-speech accessibility helper
  const speak = (text) => {
    if ('speechSynthesis' in window && text) {
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'ta' ? 'ta-IN' : 'en-IN';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, speak }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
