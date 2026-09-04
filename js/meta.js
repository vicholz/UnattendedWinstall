(function (root) {
  const APP_META = {
    "Microsoft.Microsoft3DViewer": { label: "3D Viewer", desc: "View 3D models" },
    "Microsoft.MixedReality.Portal": { label: "Mixed Reality Portal", desc: "Windows Mixed Reality setup" },
    "Microsoft.BingSearch": { label: "Bing Search", desc: "Bing web search integration" },
    "Microsoft.BingNews": { label: "News", desc: "Microsoft News app" },
    "Microsoft.BingWeather": { label: "Weather", desc: "Weather forecasts" },
    "Microsoft.WindowsCamera": { label: "Camera", desc: "Inbox camera app" },
    "Clipchamp.Clipchamp": { label: "Clipchamp", desc: "Video editor" },
    "Microsoft.WindowsAlarms": { label: "Alarms & Clock", desc: "Alarms, timers, and clock" },
    "Microsoft.549981C3F5F10": { label: "Cortana", desc: "Cortana assistant" },
    "Microsoft.GetHelp": { label: "Get Help", desc: "Microsoft support app" },
    "Microsoft.Windows.DevHome": { label: "Dev Home", desc: "Developer dashboard" },
    "MicrosoftCorporationII.MicrosoftFamily": { label: "Microsoft Family", desc: "Family Safety" },
    "microsoft.windowscommunicationsapps": { label: "Mail and Calendar", desc: "Windows Mail and Calendar" },
    "Microsoft.SkypeApp": { label: "Skype", desc: "Skype UWP app" },
    "MSTeams": { label: "Microsoft Teams", desc: "Teams consumer / Chat" },
    "Microsoft.WindowsFeedbackHub": { label: "Feedback Hub", desc: "Send feedback to Microsoft" },
    "Microsoft.WindowsMaps": { label: "Maps", desc: "Windows Maps" },
    "Microsoft.MicrosoftOfficeHub": { label: "Office Hub", desc: "Microsoft 365 / Office suggestion app" },
    "Microsoft.OutlookForWindows": { label: "Outlook (new)", desc: "New Outlook for Windows" },
    "Microsoft.MSPaint": { label: "Paint 3D", desc: "Paint 3D" },
    "Microsoft.Paint": { label: "Paint", desc: "Microsoft Paint" },
    "Microsoft.Windows.Photos": { label: "Photos", desc: "Windows Photos" },
    "Microsoft.People": { label: "People", desc: "Contacts app" },
    "Microsoft.PowerAutomateDesktop": { label: "Power Automate", desc: "Desktop automation" },
    "MicrosoftCorporationII.QuickAssist": { label: "Quick Assist", desc: "Remote assistance app" },
    "Microsoft.MicrosoftSolitaireCollection": { label: "Solitaire Collection", desc: "Microsoft Solitaire" },
    "Microsoft.GamingApp": { label: "Xbox app", desc: "Xbox PC app / Game Pass" },
    "Microsoft.XboxApp": { label: "Xbox Console Companion", desc: "Legacy Xbox app" },
    "Microsoft.XboxIdentityProvider": { label: "Xbox Identity Provider", desc: "Xbox account identity" },
    "Microsoft.XboxGameOverlay": { label: "Xbox Game Overlay", desc: "In-game Xbox overlay" },
    "Microsoft.Xbox.TCUI": { label: "Xbox TCUI", desc: "Xbox title callable UI" },
    "Microsoft.XboxGamingOverlay": { label: "Xbox Game Bar", desc: "Game Bar overlay" },
    "Microsoft.WindowsStore": { label: "Microsoft Store", desc: "Store app. Keep this if you want Store apps later." },
    "Microsoft.ZuneMusic": { label: "Windows Media Player / Groove", desc: "Music / Media Player app" },
    "Microsoft.ZuneVideo": { label: "Films & TV", desc: "Movies & TV app" },
    "Microsoft.WindowsSoundRecorder": { label: "Sound Recorder", desc: "Voice recorder" },
    "Microsoft.MicrosoftStickyNotes": { label: "Sticky Notes", desc: "Desktop sticky notes" },
    "Microsoft.Getstarted": { label: "Tips", desc: "Windows Tips" },
    "Microsoft.Todos": { label: "Microsoft To Do", desc: "Tasks app" },
    "Microsoft.YourPhone": { label: "Phone Link", desc: "Link your Android/iPhone" },
    "Microsoft.Copilot": { label: "Copilot", desc: "Windows Copilot", group: "copilot" },
    "Microsoft.Windows.Ai.Copilot.Provider": { label: "Copilot Provider", desc: "Copilot platform package", group: "copilot" },
    "Microsoft.Copilot_8wekyb3d8bbwe": { label: "Copilot (package family)", desc: "Copilot AppX family name", group: "copilot" },
    "Microsoft.Office.OneNote": { label: "OneNote (UWP)", desc: "OneNote Windows app", group: "onenote" }
  };

  const CAP_META = {
    "Microsoft.Windows.PowerShell.ISE": { label: "PowerShell ISE", desc: "Legacy PowerShell ISE capability" },
    "App.Support.QuickAssist": { label: "Quick Assist", desc: "Remote assistance capability" },
    "App.StepsRecorder": { label: "Steps Recorder", desc: "Problem Steps Recorder" },
    "Microsoft.Windows.WordPad": { label: "WordPad", desc: "Legacy WordPad" },
    "Microsoft.Windows.MSPaint": { label: "Paint (legacy capability)", desc: "Classic Paint capability" }
  };

  const FEATURE_META = {
    "Recall": { label: "Recall", desc: "Windows Recall snapshots" }
  };

  const SPECIAL_APP_META = {
    "OneNote": { label: "OneNote (Win32)", desc: "Desktop OneNote uninstaller", group: "onenote" }
  };

  const SERVICE_META = {
    SysMain: { label: "SysMain (Superfetch)" },
    WSearch: { label: "Windows Search" },
    Spooler: { label: "Print Spooler" },
    DiagTrack: { label: "Connected User Experiences and Telemetry" },
    PcaSvc: { label: "Program Compatibility Assistant" },
    WerSvc: { label: "Windows Error Reporting" },
    lfsvc: { label: "Geolocation Service" },
    RetailDemo: { label: "Retail Demo Service" },
    wisvc: { label: "Windows Insider Service" },
    PhoneSvc: { label: "Phone Service" },
    WalletService: { label: "Wallet Service" },
    SCardSvr: { label: "Smart Card" },
    ScDeviceEnum: { label: "Smart Card Device Enumeration Service" },
    SCPolicySvc: { label: "Smart Card Removal Policy" },
    MapsBroker: { label: "Downloaded Maps Manager" },
    Fax: { label: "Fax" },
    WMPNetworkSvc: { label: "Windows Media Player Network Sharing" },
    MixedRealityOpenXRSvc: { label: "Windows Mixed Reality OpenXR" },
    icssvc: { label: "Windows Mobile Hotspot Service" },
    SmsRouter: { label: "SMS Router" },
    WpcMonSvc: { label: "Parental Controls" },
    SEMgrSvc: { label: "Payments and NFC/SE Manager" },
    svsvc: { label: "Spot Verifier" },
    RasMan: { label: "Remote Access Connection Manager" },
    RasAuto: { label: "Remote Access Auto Connection Manager" },
    TermService: { label: "Remote Desktop Services" },
    SessionEnv: { label: "Remote Desktop Configuration" },
    UmRdpService: { label: "Remote Desktop UserMode Port Redirector" },
    XblAuthManager: { label: "Xbox Live Auth Manager" },
    XblGameSave: { label: "Xbox Live Game Save" },
    XboxNetApiSvc: { label: "Xbox Live Networking Service" },
    WbioSrvc: { label: "Windows Biometric Service" },
    TabletInputService: { label: "Touch Keyboard and Handwriting Panel" },
    SensrSvc: { label: "Sensor Monitoring Service" },
    SensorDataService: { label: "Sensor Data Service" }
  };

  const SERVICE_START = [
    { value: "2", label: "Automatic" },
    { value: "3", label: "Manual" },
    { value: "4", label: "Disabled" }
  ];

  const CHOICES = {
    AllowTelemetry: [
      { value: "0", label: "Security / disabled" },
      { value: "1", label: "Required" },
      { value: "3", label: "Optional / full" }
    ],
    MaxTelemetryAllowed: [
      { value: "0", label: "Security / disabled" },
      { value: "1", label: "Required" },
      { value: "3", label: "Optional / full" }
    ],
    Win32PrioritySeparation: [
      { value: "2", label: "No foreground boost" },
      { value: "26", label: "Short, fixed, high" },
      { value: "38", label: "Short, variable, high (gaming)" }
    ],
    SystemResponsiveness: [
      { value: "0", label: "0 — reserve CPU for multimedia" },
      { value: "10", label: "10 — UnattendedWinstall" },
      { value: "20", label: "20 — Windows default" }
    ],
    HwSchMode: [
      { value: "1", label: "Off" },
      { value: "2", label: "On (hardware-accelerated GPU scheduling)" }
    ],
    EnablePrefetcher: [
      { value: "0", label: "Disabled" },
      { value: "1", label: "Application only" },
      { value: "2", label: "Boot only" },
      { value: "3", label: "Boot and application" }
    ],
    NetworkThrottlingIndex: [
      { value: "10", label: "Enabled (10 packets/ms)" },
      { value: "4294967295", label: "Disabled (0xFFFFFFFF)" }
    ],
    VisualFXSetting: [
      { value: "0", label: "Let Windows choose" },
      { value: "1", label: "Best appearance" },
      { value: "2", label: "Best performance" },
      { value: "3", label: "Custom" }
    ],
    LaunchTo: [
      { value: "1", label: "This PC" },
      { value: "2", label: "Home / Quick access" },
      { value: "3", label: "Downloads" }
    ],
    Hidden: [
      { value: "1", label: "Show hidden files" },
      { value: "2", label: "Don't show hidden files" }
    ],
    HideFileExt: [
      { value: "0", label: "Show extensions" },
      { value: "1", label: "Hide extensions" }
    ],
    SearchboxTaskbarMode: [
      { value: "0", label: "Hidden" },
      { value: "1", label: "Search icon" },
      { value: "2", label: "Search box" },
      { value: "3", label: "Icon and label" }
    ],
    TaskbarAl: [
      { value: "0", label: "Left" },
      { value: "1", label: "Center" }
    ],
    Start_Layout: [
      { value: "0", label: "Default" },
      { value: "1", label: "More pins" },
      { value: "2", label: "More recommendations" }
    ],
    AppsUseLightTheme: [
      { value: "0", label: "Dark" },
      { value: "1", label: "Light" }
    ],
    SystemUsesLightTheme: [
      { value: "0", label: "Dark" },
      { value: "1", label: "Light" }
    ],
    EnableTransparency: [
      { value: "0", label: "Off" },
      { value: "1", label: "On" }
    ],
    UserDuckingPreference: [
      { value: "1", label: "Mute other sounds" },
      { value: "2", label: "Reduce other sounds by 80%" },
      { value: "3", label: "Do nothing" }
    ],
    DODownloadMode: [
      { value: "0", label: "HTTP only, no peering" },
      { value: "1", label: "LAN peering" },
      { value: "99", label: "Simple download, no peering" },
      { value: "100", label: "Bypass" }
    ],
    AutoDownload: [
      { value: "2", label: "Never auto-update Store apps" },
      { value: "4", label: "Always auto-update" }
    ],
    MultiTaskingAltTabFilter: [
      { value: "0", label: "Windows and all Edge tabs" },
      { value: "1", label: "Windows and 5 recent tabs" },
      { value: "2", label: "Windows and 3 recent tabs" },
      { value: "3", label: "Open windows only" }
    ],
    FontSmoothing: [
      { value: "0", label: "Off" },
      { value: "2", label: "ClearType / smoothing on" }
    ],
    JPEGImportQuality: [
      { value: "60", label: "60 (compressed)" },
      { value: "85", label: "85" },
      { value: "100", label: "100 (no wallpaper compression)" }
    ],
    MenuShowDelay: [
      { value: "0", label: "Instant (0 ms)" },
      { value: "400", label: "Windows default (400 ms)" }
    ],
    GameDVR_FSEBehaviorMode: [
      { value: "0", label: "Fullscreen optimizations on" },
      { value: "2", label: "Fullscreen optimizations off" }
    ],
    Priority: [
      { value: "1", label: "1 — low" },
      { value: "6", label: "6 — high (games)" },
      { value: "8", label: "8" }
    ]
  };

  const FLAG_SETTINGS = {
    DirectXUserGlobalSettings: [
      { key: "SwapEffectUpgradeEnable", label: "Optimizations for windowed games" },
      { key: "VRROptimizeEnable", label: "Variable refresh rate optimizations" },
      { key: "AutoHDREnable", label: "Auto HDR" }
    ]
  };

  const BLOCKS = [
    { id: "bloat", label: "Remove selected inbox apps and capabilities", desc: "Writes and runs BloatRemoval.ps1 during specialize. Uncheck to keep every inbox app listed below.", default: true },
    { id: "edge", label: "Uninstall Microsoft Edge", desc: "Removes Chromium Edge and legacy Edge, then redirects microsoft-edge: links to your default browser. WebView2 is kept.", default: true },
    { id: "onedrive", label: "Uninstall OneDrive", desc: "Removes OneDrive and stops it from coming back for new users. Files already in the OneDrive folder are not deleted.", default: true },
    { id: "shortcut", label: "Add an Install Winhance desktop shortcut", desc: "Creates a shortcut on the Default user desktop that downloads Winhance.", default: true },
    { id: "powerPlan", label: "Install and apply the Winhance Power Plan", desc: "Duplicates a high-performance scheme, unhides advanced power settings, and applies the included AC/DC values.", default: true },
    { id: "startLayout", label: "Unpin all Start menu tiles / pins", desc: "Applies a clean Start layout for Windows 10 and Windows 11.", default: true },
    { id: "wallpaper", label: "Set a matching default wallpaper", desc: "Picks the built-in light or dark Windows wallpaper after the theme is applied.", default: true }
  ];

  const EDITIONS = [
    { id: "picker", label: "Show edition picker during setup", key: "00000-00000-00000-00000-00000", ui: "Always" },
    { id: "home", label: "Windows Home", key: "TX9XD-98N7V-6WMQ6-BX7FG-H8Q99", ui: "OnError" },
    { id: "home-n", label: "Windows Home N", key: "3KHY7-WNT83-DGQKR-F7HPR-844BM", ui: "OnError" },
    { id: "pro", label: "Windows Pro", key: "VK7JG-NPHTM-C97JM-9MPGT-3V66T", ui: "OnError" },
    { id: "pro-n", label: "Windows Pro N", key: "2B87N-8KFHP-DKV6R-Y2C8J-PKCKT", ui: "OnError" },
    { id: "pro-wks", label: "Windows Pro for Workstations", key: "DXG7C-N36C4-C4HTG-X4T3X-2YV77", ui: "OnError" },
    { id: "edu", label: "Windows Education", key: "YNMGQ-8RYV3-4PGQ3-C8XTP-7CFBY", ui: "OnError" },
    { id: "ent", label: "Windows Enterprise", key: "NPPR9-FWDCX-D2C8J-H872K-2YT43", ui: "OnError" },
    { id: "custom", label: "Custom product key", key: "", ui: "OnError" }
  ];

  const SETUP_DEFAULTS = {
    edition: "picker",
    productKey: "00000-00000-00000-00000-00000",
    willShowUI: "Always",
    bypassHw: true,
    bypassNro: true,
    disableNet: true,
    netFx35: true,
    hideEula: true,
    hideOem: true,
    hideOnlineAccount: true,
    hideWireless: true,
    networkLocation: "Work",
    protectYourPC: "3"
  };

  root.UWMeta = {
    APP_META,
    CAP_META,
    FEATURE_META,
    SPECIAL_APP_META,
    SERVICE_META,
    SERVICE_START,
    CHOICES,
    FLAG_SETTINGS,
    BLOCKS,
    EDITIONS,
    SETUP_DEFAULTS
  };
})(typeof window !== "undefined" ? window : globalThis);
