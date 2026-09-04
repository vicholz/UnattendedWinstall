(function () {
  const { BLOCKS, EDITIONS, SETUP_DEFAULTS } = UWMeta;
  const { parseTemplate, defaultState, generateXml, counts } = UWCore;

  const STORAGE_KEY = "uw-customizer-v1";
  const els = {
    main: document.getElementById("main"),
    sidebar: document.getElementById("sidebar"),
    search: document.getElementById("search"),
    toast: document.getElementById("toast"),
    download: document.getElementById("downloadBtn"),
    copy: document.getElementById("copyBtn"),
    reset: document.getElementById("resetBtn")
  };

  let template = "";
  let model = null;
  let state = null;
  let category = "setup";
  let query = "";
  let toastTimer = 0;

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove("show"); }, 2400);
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (err) { /* ignore quota */ }
  }

  function loadSaved(defaults) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults;
      const saved = JSON.parse(raw);
      return deepMerge(defaults, saved);
    } catch (err) {
      return defaults;
    }
  }

  function deepMerge(base, extra) {
    if (!extra || typeof extra !== "object") return base;
    Object.keys(extra).forEach(function (key) {
      if (extra[key] && typeof extra[key] === "object" && !Array.isArray(extra[key])) {
        if (!base[key] || typeof base[key] !== "object") base[key] = {};
        deepMerge(base[key], extra[key]);
      } else if (extra[key] !== undefined) {
        base[key] = extra[key];
      }
    });
    return base;
  }

  const SECTION_TITLES = {
    POWER: "Power",
    "GAMING & PERFORMANCE": "Gaming & performance",
    NOTIFICATIONS: "Notifications",
    "PRIVACY & SECURITY": "Privacy & security",
    SOUND: "Sound",
    "WINDOWS UPDATE": "Windows Update",
    EXPLORER: "File Explorer",
    "START MENU": "Start menu",
    TASKBAR: "Taskbar",
    "WINDOWS THEME": "Theme"
  };

  function matchesQuery(text) {
    if (!query) return true;
    return String(text || "").toLowerCase().indexOf(query) !== -1;
  }

  function settingMatches(group) {
    return matchesQuery(group.label) || matchesQuery(group.description) || matchesQuery(group.name) ||
      group.mutations.some(function (mut) { return matchesQuery(mut.path) || matchesQuery(mut.name); });
  }

  function categories() {
    const sections = [];
    const seen = {};
    model.settingGroups.forEach(function (group) {
      if (group.service) return;
      const name = group.section || "Other";
      if (!seen[name]) {
        seen[name] = { id: "sec:" + name, title: name, kind: "section", section: name, count: 0 };
        sections.push(seen[name]);
      }
      seen[name].count++;
    });
    const services = model.settingGroups.filter(function (group) { return group.service; }).length;
    return [
      { id: "setup", title: "Setup & OOBE", kind: "setup", count: 12 },
      { id: "apps", title: "Apps & features", kind: "apps", count: model.appItems.length + model.capItems.length + model.featureItems.length + 3 },
      { id: "blocks", title: "Scripts & extras", kind: "blocks", count: BLOCKS.length }
    ].concat(sections.map(function (sec) {
      sec.title = SECTION_TITLES[sec.section] || sec.section;
      return sec;
    })).concat([
      { id: "services", title: "Services", kind: "services", count: services },
      { id: "tasks", title: "Scheduled tasks", kind: "tasks", count: model.tasks.length }
    ]);
  }

  function switchHtml(id, checked) {
    return '<label class="switch"><input type="checkbox" data-switch="' + id + '"' + (checked ? " checked" : "") + '><span></span></label>';
  }

  function selectHtml(id, choices, value) {
    return '<select data-select="' + id + '">' + choices.map(function (choice) {
      const selected = String(choice.value) === String(value) ? " selected" : "";
      return '<option value="' + escapeAttr(choice.value) + '"' + selected + ">" + escapeHtml(choice.label) + "</option>";
    }).join("") + "</select>";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/'/g, "&#39;");
  }

  function optionRow(opts) {
    const skipped = opts.apply === false ? " skipped" : "";
    return '<article class="option' + skipped + '">' +
      "<div><h4>" + escapeHtml(opts.title) + "</h4>" +
      (opts.desc ? '<p class="desc">' + escapeHtml(opts.desc) + "</p>" : "") +
      (opts.meta ? '<p class="meta">' + escapeHtml(opts.meta) + "</p>" : "") +
      "</div><div class=\"controls\">" + opts.controls + "</div></article>";
  }

  function renderSetup() {
    const s = state.setup;
    const editionOptions = EDITIONS.map(function (item) {
      return { value: item.id, label: item.label };
    });
    const custom = s.edition === "custom";
    return '<section class="hero"><h2>Windows setup</h2><p>These values live in the unattend XML itself: product key, hardware bypasses, and the OOBE screens. They run before the embedded Winhance script. Download the file and place it at the root of your Windows install USB, named <span class="kbd">autounattend.xml</span>.</p></section>' +
      '<div class="group"><div class="group-h"><div><h3>Edition &amp; product key</h3><p>Generic keys only select an edition. They do not activate Windows.</p></div></div>' +
      optionRow({
        title: "Windows edition",
        desc: "Uses a Microsoft generic key so Setup can skip the picker, or keeps the blank key so you choose the edition on the PC.",
        apply: true,
        controls: selectHtml("setup.edition", editionOptions, s.edition)
      }) +
      (custom ? optionRow({
        title: "Custom product key",
        desc: "Paste a retail, OEM, or MAK key. Setup still shows the key page if WillShowUI is Always.",
        apply: true,
        controls: '<input class="text-input" data-text="setup.productKey" value="' + escapeAttr(s.productKey) + '" spellcheck="false">'
      }) : "") +
      optionRow({
        title: "Product key UI",
        desc: "Always shows the key/edition page. OnError only shows it if the key is missing or invalid. Never hides it.",
        apply: true,
        controls: selectHtml("setup.willShowUI", [
          { value: "Always", label: "Always" },
          { value: "OnError", label: "On error" },
          { value: "Never", label: "Never" }
        ], s.willShowUI)
      }) +
      "</div><div class=\"group\"><div class=\"group-h\"><div><h3>Compatibility &amp; account</h3></div></div>" +
      optionRow({ title: "Bypass Windows 11 hardware checks", desc: "Writes LabConfig values for TPM, Secure Boot, CPU, RAM, storage, and disk so unsupported PCs can install Windows 11.", apply: s.bypassHw, controls: switchHtml("setup.bypassHw", s.bypassHw) }) +
      optionRow({ title: "Allow a local account (BypassNRO)", desc: "Skips the forced Microsoft account path during OOBE so you can create a local user.", apply: s.bypassNro, controls: switchHtml("setup.bypassNro", s.bypassNro) }) +
      optionRow({ title: "Disable network adapters during OOBE", desc: "Prevents Windows Update and online account screens from interrupting setup, then re-enables adapters at first logon.", apply: s.disableNet, controls: switchHtml("setup.disableNet", s.disableNet) }) +
      optionRow({ title: "Enable .NET Framework 3.5 from install media", desc: "Runs DISM against sources\\sxs on the installation drive if the cab files are present.", apply: s.netFx35, controls: switchHtml("setup.netFx35", s.netFx35) }) +
      "</div><div class=\"group\"><div class=\"group-h\"><div><h3>Out-of-box experience</h3></div></div>" +
      optionRow({ title: "Hide EULA page", apply: s.hideEula, controls: switchHtml("setup.hideEula", s.hideEula) }) +
      optionRow({ title: "Hide OEM registration", apply: s.hideOem, controls: switchHtml("setup.hideOem", s.hideOem) }) +
      optionRow({ title: "Hide Microsoft account screens", apply: s.hideOnlineAccount, controls: switchHtml("setup.hideOnlineAccount", s.hideOnlineAccount) }) +
      optionRow({ title: "Hide wireless setup", apply: s.hideWireless, controls: switchHtml("setup.hideWireless", s.hideWireless) }) +
      optionRow({
        title: "Network location",
        desc: "Used by the unattend OOBE NetworkLocation value.",
        apply: true,
        controls: selectHtml("setup.networkLocation", [
          { value: "Home", label: "Home" },
          { value: "Work", label: "Work" },
          { value: "Other", label: "Other" }
        ], s.networkLocation)
      }) +
      optionRow({
        title: "Express settings (ProtectYourPC)",
        desc: "1 enables express settings, 2 is recommended, 3 turns off the privacy-impacting defaults.",
        apply: true,
        controls: selectHtml("setup.protectYourPC", [
          { value: "1", label: "1 — Express (enable all)" },
          { value: "2", label: "2 — Recommended" },
          { value: "3", label: "3 — Disable privacy settings (UnattendedWinstall)" }
        ], s.protectYourPC)
      }) +
      "</div>";
  }

  function appChecked(item) {
    return item.ids.every(function (id) {
      if (model.packages.indexOf(id) !== -1) return state.remove.packages[id] !== false;
      if (model.specialApps.indexOf(id) !== -1) return state.remove.special[id] !== false;
      return true;
    });
  }

  function chip(item, kind) {
    const checked = kind === "package" ? appChecked(item)
      : kind === "cap" ? state.remove.capabilities[item.id] !== false
        : state.remove.features[item.id] !== false;
    if (!matchesQuery(item.label) && !matchesQuery(item.desc) && !matchesQuery(item.id) && !(item.ids || []).some(matchesQuery)) return "";
    return '<label class="chip"><input type="checkbox" data-chip="' + kind + ":" + escapeAttr(item.id) + '"' + (checked ? " checked" : "") + (state.blocks.bloat ? "" : " disabled") + ">" +
      "<div><b>" + escapeHtml(item.label) + "</b><small>" + escapeHtml(item.desc || item.id) + "</small></div></label>";
  }

  function renderApps() {
    const pkgs = model.appItems.map(function (item) { return chip(item, "package"); }).join("");
    const caps = model.capItems.map(function (item) { return chip(item, "cap"); }).join("");
    const feats = model.featureItems.map(function (item) { return chip(item, "feature"); }).join("");
    return '<section class="hero"><h2>Apps &amp; features</h2><p>Checked items are uninstalled or disabled by the embedded BloatRemoval script. Uncheck anything you want to keep. Edge and OneDrive have their own removal scripts.</p></section>' +
      '<div class="toolbar">' +
      '<button class="btn" type="button" data-apps="all">Remove all listed</button>' +
      '<button class="btn" type="button" data-apps="none">Keep all listed</button>' +
      "</div>" +
      '<div class="group">' +
      optionRow({
        title: "Run inbox app / capability removal",
        desc: BLOCKS.find(function (b) { return b.id === "bloat"; }).desc,
        apply: state.blocks.bloat,
        controls: switchHtml("blocks.bloat", state.blocks.bloat)
      }) +
      optionRow({
        title: "Uninstall Microsoft Edge",
        desc: BLOCKS.find(function (b) { return b.id === "edge"; }).desc,
        apply: state.blocks.edge,
        controls: switchHtml("blocks.edge", state.blocks.edge)
      }) +
      optionRow({
        title: "Uninstall OneDrive",
        desc: BLOCKS.find(function (b) { return b.id === "onedrive"; }).desc,
        apply: state.blocks.onedrive,
        controls: switchHtml("blocks.onedrive", state.blocks.onedrive)
      }) +
      "</div>" +
      '<div class="group"><div class="group-h"><div><h3>Inbox apps</h3><p>Provisioned AppX packages plus the Win32 OneNote uninstaller.</p></div></div><div class="apps">' + (pkgs || '<div class="empty">No matching apps</div>') + "</div></div>" +
      '<div class="group"><div class="group-h"><div><h3>Capabilities</h3></div></div><div class="apps">' + (caps || '<div class="empty">No matching capabilities</div>') + "</div></div>" +
      '<div class="group"><div class="group-h"><div><h3>Optional features</h3></div></div><div class="apps">' + (feats || '<div class="empty">No matching features</div>') + "</div></div>";
  }

  function renderBlocks() {
    const extras = BLOCKS.filter(function (block) {
      return block.id !== "bloat" && block.id !== "edge" && block.id !== "onedrive";
    });
    return '<section class="hero"><h2>Scripts &amp; extras</h2><p>Larger inline script blocks that install a power plan, clean the Start menu, drop a Winhance shortcut, or set wallpaper. Turn a block off to leave that part of Windows alone.</p></section>' +
      '<div class="group">' + extras.map(function (block) {
        if (!matchesQuery(block.label) && !matchesQuery(block.desc) && !matchesQuery(block.id)) return "";
        return optionRow({
          title: block.label,
          desc: block.desc,
          apply: state.blocks[block.id],
          controls: switchHtml("blocks." + block.id, state.blocks[block.id])
        });
      }).join("") + "</div>";
  }

  function settingControls(group) {
    const current = state.settings[group.id] || { apply: true, value: group.defaultValue };
    let extra = "";
    if (current.apply && group.control.type === "select") {
      extra = selectHtml("val:" + group.id, group.control.choices, current.value);
    } else if (current.apply && group.control.type === "flags") {
      extra = '<div class="flags">' + group.control.flags.map(function (flag) {
        const on = String((current.value || {})[flag.key]) === "1";
        return '<label class="flag"><span>' + escapeHtml(flag.label) + "</span>" + switchHtml("flag:" + group.id + ":" + flag.key, on) + "</label>";
      }).join("") + "</div>";
    }
    return switchHtml("set:" + group.id, current.apply) + extra;
  }

  function renderSection(section) {
    const groups = model.settingGroups.filter(function (group) {
      return !group.service && group.section === section && settingMatches(group);
    });
    if (!groups.length) return '<div class="empty">No matching settings in this category.</div>';
    return '<section class="hero"><h2>' + escapeHtml(SECTION_TITLES[section] || section) + "</h2><p>Each switch applies the UnattendedWinstall tweak. Turn a switch off to leave the Windows default. If the setting has more than one valid value, pick it on the right.</p></section>" +
      '<div class="toolbar"><button class="btn" type="button" data-sec-all="' + escapeAttr(section) + '">Apply all</button><button class="btn" type="button" data-sec-none="' + escapeAttr(section) + '">Skip all</button></div>' +
      '<div class="group">' + groups.map(function (group) {
        const current = state.settings[group.id] || { apply: true };
        const paths = unique(group.mutations.map(function (mut) { return mut.path + (mut.name ? "\\" + mut.name : ""); }));
        return optionRow({
          title: group.label,
          desc: group.description && group.description !== group.label ? group.description : "",
          meta: paths.slice(0, 3).join(" · "),
          apply: current.apply,
          controls: settingControls(group)
        });
      }).join("") + "</div>";
  }

  function renderServices() {
    const groups = model.settingGroups.filter(function (group) { return group.service && settingMatches(group); });
    return '<section class="hero"><h2>Services</h2><p>These set the Start value for Windows services (2 automatic, 3 manual, 4 disabled). Skipping a row leaves the inbox start type unchanged.</p></section>' +
      '<div class="toolbar"><button class="btn" type="button" data-svc="all">Apply all</button><button class="btn" type="button" data-svc="none">Skip all</button></div>' +
      '<div class="group">' + groups.map(function (group) {
        const current = state.settings[group.id] || { apply: true };
        return optionRow({
          title: group.label,
          desc: group.description,
          meta: group.mutations[0].path,
          apply: current.apply,
          controls: settingControls(group)
        });
      }).join("") + "</div>";
  }

  function renderTasks() {
    const tasks = model.tasks.filter(function (task) {
      return matchesQuery(task.tn) || matchesQuery(task.desc);
    });
    return '<section class="hero"><h2>Scheduled tasks</h2><p>The script disables telemetry and maintenance tasks with <span class="kbd">schtasks /Change</span>. You can skip a task or switch it to Enable.</p></section>' +
      '<div class="group">' + tasks.map(function (task) {
        const current = state.tasks[task.tn] || { apply: true, action: task.action };
        return optionRow({
          title: task.tn.replace(/\\Microsoft\\Windows\\/, ""),
          desc: task.desc,
          meta: task.tn,
          apply: current.apply,
          controls: switchHtml("task:" + task.tn, current.apply) + (current.apply ? selectHtml("taskval:" + task.tn, [
            { value: "/Disable", label: "Disable" },
            { value: "/Enable", label: "Enable" }
          ], current.action) : "")
        });
      }).join("") + "</div>";
  }

  function unique(items) {
    return items.filter(function (item, index) { return items.indexOf(item) === index; });
  }

  function renderSearch() {
    const setupHits = [
      ["Bypass Windows 11 hardware checks", "bypass"],
      ["local account BypassNRO", "account"],
      ["product key edition", "key"],
      ["OOBE EULA wireless ProtectYourPC", "oobe"]
    ].some(function (pair) { return matchesQuery(pair[0]); });
    const parts = [];
    parts.push('<section class="hero"><h2>Search results</h2><p>Matches across setup, apps, scripts, and registry tweaks.</p></section>');
    if (setupHits) parts.push('<div class="notice">Setup &amp; OOBE also matches this search — open that category to edit those XML options.</div>');
    parts.push(renderApps());
    parts.push(renderBlocks());
    unique(model.settingGroups.map(function (group) { return group.section; })).forEach(function (section) {
      const groups = model.settingGroups.filter(function (group) {
        return !group.service && group.section === section && settingMatches(group);
      });
      if (groups.length) parts.push(renderSection(section));
    });
    parts.push(renderServices());
    parts.push(renderTasks());
    return parts.join("");
  }

  function statsBar() {
    const c = counts(model, state);
    return '<div class="stats">' +
      '<div class="stat"><strong>' + c.apps + "</strong><span>apps / features removed of " + c.appsTotal + "</span></div>" +
      '<div class="stat"><strong>' + c.applied + "</strong><span>tweaks applied</span></div>" +
      '<div class="stat"><strong>' + c.skipped + "</strong><span>tweaks skipped</span></div>" +
      "</div>";
  }

  function render() {
    const cats = categories();
    els.sidebar.innerHTML = '<div class="nav-section-label">Customize</div>' + cats.map(function (cat) {
      const active = cat.id === category ? " active" : "";
      return '<button class="nav-btn' + active + '" type="button" data-cat="' + escapeAttr(cat.id) + '"><span>' + escapeHtml(cat.title) + "</span><span class=\"nav-count\">" + cat.count + "</span></button>";
    }).join("");

    let body = "";
    if (query) body = renderSearch();
    else if (category === "setup") body = renderSetup();
    else if (category === "apps") body = renderApps();
    else if (category === "blocks") body = renderBlocks();
    else if (category === "services") body = renderServices();
    else if (category === "tasks") body = renderTasks();
    else if (category.indexOf("sec:") === 0) body = renderSection(category.slice(4));
    else body = '<div class="empty">Unknown category</div>';

    els.main.innerHTML = statsBar() + body;
  }

  function setPath(obj, path, value) {
    const parts = path.split(".");
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
    cur[parts[parts.length - 1]] = value;
  }

  function applyEdition(id) {
    const edition = EDITIONS.find(function (item) { return item.id === id; }) || EDITIONS[0];
    state.setup.edition = edition.id;
    state.setup.willShowUI = edition.ui;
    if (edition.id !== "custom") state.setup.productKey = edition.key || SETUP_DEFAULTS.productKey;
  }

  function setAppGroup(id, on) {
    const item = model.appItems.find(function (app) { return app.id === id; });
    if (!item) return;
    item.ids.forEach(function (pkg) {
      if (Object.prototype.hasOwnProperty.call(state.remove.packages, pkg) || model.packages.indexOf(pkg) !== -1) {
        state.remove.packages[pkg] = on;
      }
      if (Object.prototype.hasOwnProperty.call(state.remove.special, pkg) || model.specialApps.indexOf(pkg) !== -1) {
        state.remove.special[pkg] = on;
      }
    });
  }

  function onChange(event) {
    const t = event.target;
    if (t.dataset.cat) {
      category = t.dataset.cat;
      render();
      return;
    }
    if (t.dataset.apps) {
      const on = t.dataset.apps === "all";
      model.appItems.forEach(function (item) { setAppGroup(item.id, on); });
      model.capItems.forEach(function (item) { state.remove.capabilities[item.id] = on; });
      model.featureItems.forEach(function (item) { state.remove.features[item.id] = on; });
      save(); render(); return;
    }
    if (t.dataset.secAll || t.dataset.secNone) {
      const section = t.dataset.secAll || t.dataset.secNone;
      const on = Boolean(t.dataset.secAll);
      model.settingGroups.forEach(function (group) {
        if (!group.service && group.section === section) state.settings[group.id].apply = on;
      });
      save(); render(); return;
    }
    if (t.dataset.svc) {
      const on = t.dataset.svc === "all";
      model.settingGroups.forEach(function (group) {
        if (group.service) state.settings[group.id].apply = on;
      });
      save(); render(); return;
    }
    if (t.dataset.switch) {
      const id = t.dataset.switch;
      const on = t.checked;
      if (id.indexOf("setup.") === 0) setPath(state, id, on);
      else if (id.indexOf("blocks.") === 0) state.blocks[id.slice(7)] = on;
      else if (id.indexOf("set:") === 0) state.settings[id.slice(4)].apply = on;
      else if (id.indexOf("flag:") === 0) {
        const parts = id.split(":");
        const groupId = parts.slice(1, -1).join(":");
        const flag = parts[parts.length - 1];
        if (!state.settings[groupId].value || typeof state.settings[groupId].value !== "object") {
          state.settings[groupId].value = {};
        }
        state.settings[groupId].value[flag] = on ? "1" : "0";
      } else if (id.indexOf("task:") === 0) {
        state.tasks[id.slice(5)].apply = on;
      }
      save(); render(); return;
    }
    if (t.dataset.select) {
      const id = t.dataset.select;
      if (id === "setup.edition") applyEdition(t.value);
      else if (id.indexOf("setup.") === 0) setPath(state, id, t.value);
      else if (id.indexOf("val:") === 0) state.settings[id.slice(4)].value = t.value;
      else if (id.indexOf("taskval:") === 0) state.tasks[id.slice(8)].action = t.value;
      save(); render(); return;
    }
    if (t.dataset.text) {
      setPath(state, t.dataset.text, t.value);
      save(); return;
    }
    if (t.dataset.chip) {
      const parts = t.dataset.chip.split(":");
      const kind = parts.shift();
      const id = parts.join(":");
      if (kind === "package") setAppGroup(id, t.checked);
      else if (kind === "cap") state.remove.capabilities[id] = t.checked;
      else if (kind === "feature") state.remove.features[id] = t.checked;
      save(); render();
    }
  }

  function buildXml() {
    return generateXml(template, model, state);
  }

  function download() {
    const xml = buildXml();
    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "autounattend.xml";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("Saved autounattend.xml — copy it to the root of your Windows install media.");
  }

  async function copyXml() {
    const xml = buildXml();
    try {
      await navigator.clipboard.writeText(xml);
      toast("XML copied to the clipboard.");
    } catch (err) {
      toast("Clipboard permission denied. Download the file instead.");
    }
  }

  function reset() {
    state = defaultState(model);
    try { localStorage.removeItem(STORAGE_KEY); } catch (err) { /* ignore */ }
    render();
    toast("Restored UnattendedWinstall defaults.");
  }

  function bind() {
    document.body.addEventListener("click", function (event) {
      const btn = event.target.closest("[data-cat], [data-apps], [data-sec-all], [data-sec-none], [data-svc]");
      if (btn) onChange({ target: btn });
    });
    document.body.addEventListener("change", onChange);
    els.search.addEventListener("input", function () {
      query = els.search.value.trim().toLowerCase();
      render();
    });
    els.download.addEventListener("click", download);
    els.copy.addEventListener("click", copyXml);
    els.reset.addEventListener("click", reset);
  }

  function showFatal(message, extra) {
    els.main.innerHTML = '<div class="notice error"><strong>' + escapeHtml(message) + "</strong><p>" + extra + "</p>" +
      '<p><label class="btn">Load autounattend.xml <input id="file" type="file" accept=".xml,text/xml" hidden></label></p></div>';
    const file = document.getElementById("file");
    if (file) file.addEventListener("change", function () {
      const picked = file.files && file.files[0];
      if (!picked) return;
      picked.text().then(bootFromText);
    });
  }

  function bootFromText(text) {
    template = text;
    model = parseTemplate(text);
    state = loadSaved(defaultState(model));
    render();
  }

  async function init() {
    bind();
    try {
      const res = await fetch(new URL("autounattend.xml", document.baseURI));
      if (!res.ok) throw new Error("HTTP " + res.status);
      bootFromText(await res.text());
    } catch (err) {
      showFatal("Could not load autounattend.xml",
        "GitHub Pages needs the file next to this page. If you opened the HTML as a local file, browsers block fetch — use a local server or load the XML manually. " +
        escapeHtml(String(err.message || err)));
    }
  }

  init();
})();
