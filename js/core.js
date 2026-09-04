(function (root) {
  const meta = root.UWMeta;

  function detectNl(text) {
    return text.includes("\r\n") ? "\r\n" : "\n";
  }

  function splitLines(text) {
    return text.split(/\r?\n/);
  }

  function escXml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function quotePs(value) {
    return "'" + String(value).replace(/'/g, "''") + "'";
  }

  function titleFromSection(raw) {
    return raw
      .replace(/^#\s*/, "")
      .replace(/\s+SETTINGS$/i, "")
      .replace(/\s+&$/i, "")
      .trim();
  }

  function serviceNameFromPath(path) {
    const m = String(path).match(/\\Services\\([^\\]+)/i);
    return m ? m[1] : null;
  }

  function hiveAgnostic(path) {
    return String(path).replace(/^HK(LM|CU|CR|U):/i, "HK:");
  }

  function parseNamedArgs(source) {
    const params = {};
    let i = 0;
    const s = source;
    while (i < s.length) {
      while (i < s.length && /\s/.test(s[i])) i++;
      if (s[i] !== "-") break;
      let j = i + 1;
      while (j < s.length && /[A-Za-z]/.test(s[j])) j++;
      const key = s.slice(i + 1, j);
      while (j < s.length && /\s/.test(s[j])) j++;
      let value = "";
      if (s[j] === "'") {
        j++;
        let out = "";
        while (j < s.length) {
          if (s[j] === "'" && s[j + 1] === "'") {
            out += "'";
            j += 2;
            continue;
          }
          if (s[j] === "'") {
            j++;
            break;
          }
          out += s[j++];
        }
        value = out;
      } else if (s[j] === '"') {
        j++;
        let out = "";
        while (j < s.length && s[j] !== '"') out += s[j++];
        if (s[j] === '"') j++;
        value = out;
      } else if (s[j] === "@") {
        let depth = 0;
        const start = j;
        while (j < s.length) {
          if (s[j] === "(") depth++;
          if (s[j] === ")") {
            depth--;
            j++;
            if (depth === 0) break;
            continue;
          }
          j++;
        }
        value = s.slice(start, j);
      } else {
        const start = j;
        while (j < s.length && !/\s/.test(s[j])) j++;
        value = s.slice(start, j);
      }
      params[key] = value;
      i = j;
    }
    return params;
  }

  function parseFlags(value) {
    const flags = {};
    String(value || "").split(";").forEach(function (part) {
      const idx = part.indexOf("=");
      if (idx > 0) flags[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
    });
    return flags;
  }

  function serializeFlags(flagDefs, values) {
    return flagDefs.map(function (flag) {
      const raw = values[flag.key];
      const on = raw === true || raw === "1" || raw === 1;
      return flag.key + "=" + (on ? "1" : "0");
    }).join(";") + ";";
  }

  function firstTag(xml, tag) {
    const m = xml.match(new RegExp("<" + tag + ">([\\s\\S]*?)</" + tag + ">"));
    return m ? m[1].trim() : "";
  }

  function parsePsArray(script, name) {
    const re = new RegExp("\\$" + name + " = @\\(([\\s\\S]*?)\\)\\s*(?:\\r?\\n)");
    const m = script.match(re);
    if (!m) return [];
    return (m[1].match(/'([^']+)'/g) || []).map(function (item) {
      return item.slice(1, -1);
    });
  }

  function parseScheduledTasks(script) {
    const block = script.match(/\$scheduledTasks = @\(([\s\S]*?)\)\s*\r?\n/);
    if (!block) return [];
    const tasks = [];
    const re = /@\{ TN="([^"]+)"; Action="([^"]+)"; Desc="((?:\\"|[^"])*)" \}/g;
    let m;
    while ((m = re.exec(block[1]))) {
      tasks.push({ tn: m[1], action: m[2], desc: m[3] });
    }
    return tasks;
  }

  function parseMutations(xml) {
    const lines = splitLines(xml);
    const mutations = [];
    let section = "General";
    let inHere = false;
    let hereKind = "";

    lines.forEach(function (line, index) {
      const trimmed = line.trim();
      if (!inHere) {
        if (/@"\s*$/.test(trimmed)) { inHere = true; hereKind = "double"; }
        else if (/@'\s*$/.test(trimmed)) { inHere = true; hereKind = "single"; }
      } else if ((hereKind === "double" && /^"@/.test(trimmed)) || (hereKind === "single" && /^'@/.test(trimmed))) {
        inHere = false;
        hereKind = "";
      }

      const sec = trimmed.match(/^# ([A-Z0-9][A-Z0-9 &\/-]+)$/);
      if (sec && !inHere) {
        const title = titleFromSection(sec[0]);
        if (title.length > 2 && !/^=+$/.test(title)) {
          section = title === "START MENU LAYOUT" ? "START MENU" : title;
        }
      }

      if (inHere) return;
      const call = trimmed.match(/^(Set-RegistryValue|Remove-RegistryValue|Remove-RegistryKey|New-RegistryKey|Set-BinaryBit|Set-BinaryByte)\b(.*)$/);
      if (!call) return;
      const args = parseNamedArgs(call[2]);
      if (!args.Path) return;
      mutations.push({
        index: index,
        kind: call[1],
        path: args.Path,
        name: args.Name || "",
        type: args.Type || "",
        value: args.Value,
        description: args.Description || "",
        byteIndex: args.ByteIndex,
        bitMask: args.BitMask,
        setBit: args.SetBit,
        section: section,
        raw: line
      });
    });
    return mutations;
  }

  function groupMutations(mutations) {
    const groups = new Map();

    mutations.forEach(function (mut) {
      const svc = mut.name === "Start" ? serviceNameFromPath(mut.path) : null;
      let key;
      if (svc) key = "svc:" + svc;
      else if (mut.name === "DirectXUserGlobalSettings") key = "flags:DirectXUserGlobalSettings";
      else if (mut.name === "ConsentPromptBehaviorAdmin" || mut.name === "PromptOnSecureDesktop") key = "uac";
      else key = hiveAgnostic(mut.path).toLowerCase() + "|" + mut.name + "|" + (mut.byteIndex || "") + "|" + (mut.bitMask || "");

      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          mutations: [],
          section: mut.section,
          name: mut.name,
          kind: mut.kind,
          type: mut.type,
          description: mut.description,
          service: svc || null
        });
      }
      const group = groups.get(key);
      group.mutations.push(mut);
      if (mut.description && mut.description.length > group.description.length) {
        group.description = mut.description;
      }
    });

    const byDesc = new Map();
    const merged = [];
    groups.forEach(function (group) {
      if (group.service || group.id === "uac" || group.id.indexOf("flags:") === 0) {
        merged.push(group);
        return;
      }
      const descKey = group.description || group.id;
      if (byDesc.has(descKey)) {
        const existing = byDesc.get(descKey);
        existing.mutations = existing.mutations.concat(group.mutations);
      } else {
        byDesc.set(descKey, group);
        merged.push(group);
      }
    });

    merged.forEach(function (group) {
      const first = group.mutations[0];
      group.defaultValue = first.value;
      group.label = labelFor(group);
      group.control = controlFor(group);
    });

    return merged;
  }

  function labelFor(group) {
    if (group.id === "uac") return "User Account Control";
    if (group.service) {
      return (meta.SERVICE_META[group.service] && meta.SERVICE_META[group.service].label) || group.service;
    }
    if (group.id === "flags:DirectXUserGlobalSettings") return "DirectX advanced graphics options";
    if (group.description) {
      const desc = group.description;
      if (desc.length <= 92) return desc;
      const cut = desc.slice(0, 92);
      const sp = cut.lastIndexOf(" ");
      return (sp > 40 ? cut.slice(0, sp) : cut) + "…";
    }
    return group.name || group.kind;
  }

  function binaryChoices(defaultValue) {
    const def = String(defaultValue);
    return [
      { value: "0", label: def === "0" ? "Off (UnattendedWinstall)" : "Off" },
      { value: "1", label: def === "1" ? "On (UnattendedWinstall)" : "On" }
    ];
  }

  function markDefault(choices, value) {
    return choices.map(function (choice) {
      const label = String(choice.value) === String(value)
        ? choice.label.replace(/ \(UnattendedWinstall\)$/, "") + " (UnattendedWinstall)"
        : choice.label;
      return { value: choice.value, label: label };
    });
  }

  function controlFor(group) {
    if (group.id === "uac") {
      return {
        type: "select",
        choices: [
          { value: "0,0", label: "Never notify (UnattendedWinstall)" },
          { value: "5,0", label: "Notify without dimming" },
          { value: "5,1", label: "Always notify (Windows default)" }
        ]
      };
    }
    if (group.id.indexOf("flags:") === 0) {
      return { type: "flags", flags: meta.FLAG_SETTINGS.DirectXUserGlobalSettings };
    }
    if (group.service) {
      return { type: "select", choices: markDefault(meta.SERVICE_START, group.defaultValue) };
    }
    if (group.kind === "Set-BinaryBit") {
      const def = group.mutations[0].setBit === "$True" ? "$True" : "$False";
      return {
        type: "select",
        choices: [
          { value: "$False", label: def === "$False" ? "Off (UnattendedWinstall)" : "Off" },
          { value: "$True", label: def === "$True" ? "On (UnattendedWinstall)" : "On" }
        ]
      };
    }
    if (group.kind !== "Set-RegistryValue") {
      return { type: "apply" };
    }
    if (group.name === "Value" && /ConsentStore/i.test(group.mutations[0].path)) {
      return {
        type: "select",
        choices: markDefault([
          { value: "Allow", label: "Allow" },
          { value: "Deny", label: "Deny" }
        ], group.defaultValue)
      };
    }
    const named = meta.CHOICES[group.name];
    if (named) return { type: "select", choices: markDefault(named, group.defaultValue) };

    const value = group.defaultValue;
    if (value === "0" || value === "1") return { type: "select", choices: binaryChoices(value) };
    if (value === "$True" || value === "$False") {
      return {
        type: "select",
        choices: [
          { value: "$False", label: "False" },
          { value: "$True", label: "True" }
        ]
      };
    }
    if (/^-?\d+$/.test(String(value || ""))) {
      const n = String(value);
      const choices = [{ value: n, label: n + " (UnattendedWinstall)" }];
      if (n !== "0") choices.push({ value: "0", label: "0" });
      if (n !== "1") choices.push({ value: "1", label: "1" });
      return { type: "select", choices: choices };
    }
    if (String(value || "").charAt(0) === "@") return { type: "apply" };
    return { type: "apply" };
  }

  function defaultValueFor(group) {
    if (group.id === "uac") {
      const byName = {};
      group.mutations.forEach(function (mut) { byName[mut.name] = mut.value; });
      return (byName.ConsentPromptBehaviorAdmin || "0") + "," + (byName.PromptOnSecureDesktop || "0");
    }
    if (group.control.type === "flags") return parseFlags(group.defaultValue);
    if (group.kind === "Set-BinaryBit") return group.mutations[0].setBit === "$True" ? "$True" : "$False";
    return group.defaultValue;
  }

  function parseTemplate(xml) {
    const packages = parsePsArray(xml, "packages");
    const capabilities = parsePsArray(xml, "capabilities");
    const optionalFeatures = parsePsArray(xml, "optionalFeatures");
    const specialApps = parsePsArray(xml, "specialApps");
    const tasks = parseScheduledTasks(xml);
    const groups = groupMutations(parseMutations(xml));

    const appItems = [];
    const seenGroup = {};
    packages.forEach(function (id) {
      const info = meta.APP_META[id] || { label: id, desc: id };
      const gid = info.group || id;
      if (seenGroup[gid]) {
        seenGroup[gid].ids.push(id);
        return;
      }
      const item = { id: gid, ids: [id], label: info.label || id, desc: info.desc || "", kind: "package" };
      seenGroup[gid] = item;
      appItems.push(item);
    });
    specialApps.forEach(function (id) {
      const info = meta.SPECIAL_APP_META[id] || { label: id };
      const gid = info.group || ("special:" + id);
      if (seenGroup[gid]) {
        seenGroup[gid].ids.push(id);
        seenGroup[gid].special = true;
        return;
      }
      appItems.push({
        id: gid,
        ids: [id],
        label: info.label || id,
        desc: info.desc || "Win32 uninstall",
        kind: "special",
        special: true
      });
    });

    return {
      xml: xml,
      setup: {
        productKey: firstTag(xml, "Key"),
        willShowUI: firstTag(xml, "WillShowUI"),
        hideEula: firstTag(xml, "HideEULAPage") === "true",
        hideOem: firstTag(xml, "HideOEMRegistrationScreen") === "true",
        hideOnlineAccount: firstTag(xml, "HideOnlineAccountScreens") === "true",
        hideWireless: firstTag(xml, "HideWirelessSetupInOOBE") === "true",
        networkLocation: firstTag(xml, "NetworkLocation") || "Work",
        protectYourPC: firstTag(xml, "ProtectYourPC") || "3",
        bypassHw: /BypassTPMCheck/.test(xml),
        bypassNro: /BypassNRO/.test(xml),
        disableNet: /Disable-NetAdapter/.test(xml),
        netFx35: /FeatureName:NetFx3/.test(xml)
      },
      packages: packages,
      capabilities: capabilities,
      optionalFeatures: optionalFeatures,
      specialApps: specialApps,
      appItems: appItems,
      capItems: capabilities.map(function (id) {
        const info = meta.CAP_META[id] || {};
        return { id: id, label: info.label || id, desc: info.desc || "Windows capability" };
      }),
      featureItems: optionalFeatures.map(function (id) {
        const info = meta.FEATURE_META[id] || {};
        return { id: id, label: info.label || id, desc: info.desc || "Optional feature" };
      }),
      tasks: tasks,
      settingGroups: groups
    };
  }

  function defaultState(model) {
    const edition = meta.EDITIONS.find(function (item) {
      return item.key === model.setup.productKey;
    });
    const state = {
      setup: Object.assign({}, meta.SETUP_DEFAULTS, {
        productKey: model.setup.productKey,
        willShowUI: model.setup.willShowUI,
        hideEula: model.setup.hideEula,
        hideOem: model.setup.hideOem,
        hideOnlineAccount: model.setup.hideOnlineAccount,
        hideWireless: model.setup.hideWireless,
        networkLocation: model.setup.networkLocation,
        protectYourPC: model.setup.protectYourPC,
        bypassHw: model.setup.bypassHw,
        bypassNro: model.setup.bypassNro,
        disableNet: model.setup.disableNet,
        netFx35: model.setup.netFx35,
        edition: edition ? edition.id : (model.setup.productKey === meta.SETUP_DEFAULTS.productKey ? "picker" : "custom")
      }),
      blocks: {},
      remove: { packages: {}, capabilities: {}, features: {}, special: {} },
      settings: {},
      tasks: {}
    };
    meta.BLOCKS.forEach(function (block) { state.blocks[block.id] = block.default; });
    model.packages.forEach(function (id) { state.remove.packages[id] = true; });
    model.capabilities.forEach(function (id) { state.remove.capabilities[id] = true; });
    model.optionalFeatures.forEach(function (id) { state.remove.features[id] = true; });
    model.specialApps.forEach(function (id) { state.remove.special[id] = true; });
    model.settingGroups.forEach(function (group) {
      state.settings[group.id] = { apply: true, value: defaultValueFor(group) };
    });
    model.tasks.forEach(function (task) {
      state.tasks[task.tn] = { apply: true, action: task.action };
    });
    return state;
  }

  function replaceTag(xml, tag, value) {
    return xml.replace(new RegExp("<" + tag + ">[\\s\\S]*?</" + tag + ">", "g"), "<" + tag + ">" + value + "</" + tag + ">");
  }

  function sameSet(list, keep) {
    if (list.length !== keep.size) return false;
    return list.every(function (id) { return keep.has(id); });
  }

  function replacePsArray(xml, name, keep, original) {
    if (sameSet(original, keep)) return xml;
    const re = new RegExp("\\$" + name + " = @\\(\\n[\\s\\S]*?\\n\\)");
    const items = original.filter(function (id) { return keep.has(id); });
    const body = items.length ? items.map(function (id) { return "    '" + id + "'"; }).join("\n") : "";
    const next = "$" + name + " = @(\n" + body + (body ? "\n" : "") + ")";
    return xml.replace(re, next);
  }

  function commentLine(line) {
    if (/^\s*$/.test(line) || /^\s*#/.test(line)) return line;
    return line.replace(/^(\s*)/, "$1# ");
  }

  function commentRegion(xml, startNeedle, endNeedle, inclusiveEnd) {
    const nl = detectNl(xml);
    const lines = splitLines(xml);
    let active = false;
    let done = false;
    const out = lines.map(function (line) {
      if (done) return line;
      if (!active && line.indexOf(startNeedle) !== -1) active = true;
      if (!active) return line;
      if (!inclusiveEnd && line.indexOf(endNeedle) !== -1 && line.indexOf(startNeedle) === -1) {
        active = false;
        done = true;
        return line;
      }
      const next = commentLine(line);
      if (inclusiveEnd && line.indexOf(endNeedle) !== -1) {
        active = false;
        done = true;
      }
      return next;
    });
    return out.join(nl);
  }

  function formatRegValue(mut, value) {
    if (mut.type === "DWord" || mut.type === "QWord" || /^-?\d+$/.test(String(value))) return String(value);
    if (String(value).charAt(0) === "$" || String(value).charAt(0) === "@") return String(value);
    return quotePs(value);
  }

  function applySettingLine(line, group, setting) {
    if (!setting || !setting.apply) return commentLine(line);
    if (group.control.type === "apply") return line;
    if (group.id === "uac") {
      const packed = String(setting.value || "0,0");
      if (packed === String(group.defaultValue || "0,0")) return line;
      const parts = packed.split(",");
      const map = {
        ConsentPromptBehaviorAdmin: parts[0] || "0",
        PromptOnSecureDesktop: parts[1] || "0"
      };
      const name = (line.match(/-Name\s+'((?:''|[^'])*)'/) || [])[1];
      if (!name || map[name] == null) return line;
      return line.replace(/-Value\s+(?:'((?:''|[^'])*)'|-?\d+|\$True|\$False)/, "-Value " + formatRegValue({ type: "DWord" }, map[name]));
    }
    if (group.control.type === "flags") {
      const composed = serializeFlags(group.control.flags, setting.value || {});
      if (composed === group.defaultValue) return line;
      return line.replace(/-Value\s+'((?:''|[^'])*)'/, "-Value " + quotePs(composed));
    }
    if (group.kind === "Set-BinaryBit") {
      const bit = setting.value === "$True" ? "$True" : "$False";
      if (bit === (group.mutations[0].setBit === "$True" ? "$True" : "$False")) return line;
      return line.replace(/-SetBit\s+\$(True|False)/, "-SetBit " + bit);
    }
    if (group.kind === "Set-RegistryValue" && setting.value != null && String(setting.value) !== String(group.defaultValue)) {
      return line.replace(/-Value\s+(?:'((?:''|[^'])*)'|-?\d+|\$True|\$False|@\([^)]*\))/, "-Value " + formatRegValue(group.mutations[0], setting.value));
    }
    return line;
  }

  function generateXml(template, model, state) {
    let xml = template;
    const setup = state.setup;
    const nl = detectNl(xml);

    const keepPkgs = new Set(model.packages.filter(function (id) { return state.remove.packages[id] !== false; }));
    const keepCaps = new Set(model.capabilities.filter(function (id) { return state.remove.capabilities[id] !== false; }));
    const keepFeats = new Set(model.optionalFeatures.filter(function (id) { return state.remove.features[id] !== false; }));
    const keepSpecial = new Set(model.specialApps.filter(function (id) { return state.remove.special[id] !== false; }));
    if (!state.blocks.bloat) {
      keepPkgs.clear();
      keepCaps.clear();
      keepFeats.clear();
      keepSpecial.clear();
    }

    const skipExec = {
      BloatRemoval: !state.blocks.bloat,
      EdgeRemoval: !state.blocks.edge,
      OneDriveRemoval: !state.blocks.onedrive
    };

    const lineIndex = new Map();
    model.settingGroups.forEach(function (group) {
      group.mutations.forEach(function (mut) {
        lineIndex.set(mut.index, { group: group, setting: state.settings[group.id] });
      });
    });

    let inHere = false;
    let hereKind = "";
    let pendingTrySkip = false;
    let trySkipDepth = 0;
    xml = splitLines(xml).map(function (line, index) {
      const trimmed = line.trim();
      if (!inHere) {
        if (/@"\s*$/.test(trimmed)) { inHere = true; hereKind = "double"; }
        else if (/@'\s*$/.test(trimmed)) { inHere = true; hereKind = "single"; }
      } else if ((hereKind === "double" && /^"@/.test(trimmed)) || (hereKind === "single" && /^'@/.test(trimmed))) {
        inHere = false;
        hereKind = "";
      }

      if (trySkipDepth > 0) {
        trySkipDepth += (line.match(/\{/g) || []).length;
        trySkipDepth -= (line.match(/\}/g) || []).length;
        if (trySkipDepth < 0) trySkipDepth = 0;
        return commentLine(line);
      }
      if (pendingTrySkip) {
        if (/^try\s*\{/.test(trimmed)) {
          pendingTrySkip = false;
          trySkipDepth = 1;
          return commentLine(line);
        }
        if (trimmed) pendingTrySkip = false;
      }

      if (!inHere) {
        const exec = trimmed.match(/\$scriptsToExecute \+= @\{Path = "\$scriptsDir\\(BloatRemoval|EdgeRemoval|OneDriveRemoval)\.ps1"/);
        if (exec && skipExec[exec[1]]) return commentLine(line);

        const taskMatch = trimmed.match(/@\{ TN="([^"]+)"; Action="([^"]+)";/);
        if (taskMatch && state.tasks[taskMatch[1]]) {
          const task = state.tasks[taskMatch[1]];
          if (!task.apply) return commentLine(line);
          if (task.action && task.action !== taskMatch[2]) {
            return line.replace(/Action="[^"]+"/, 'Action="' + task.action + '"');
          }
        }

        if (lineIndex.has(index)) {
          const hit = lineIndex.get(index);
          const next = applySettingLine(line, hit.group, hit.setting);
          if (hit.setting && !hit.setting.apply && /Remove-Registry(Key|Value)/.test(hit.group.kind)) {
            pendingTrySkip = true;
          }
          return next;
        }

        if (/powercfg \/hibernate off/.test(line)) {
          const hib = model.settingGroups.find(function (group) {
            return group.mutations.some(function (mut) { return mut.name === "HibernateEnabled"; });
          });
          const setting = hib && state.settings[hib.id];
          if (!setting || !setting.apply) return commentLine(line);
          if (String(setting.value) === "1") return line.replace("powercfg /hibernate off", "powercfg /hibernate on");
        }
      }
      return line;
    }).join(nl);

    xml = replacePsArray(xml, "packages", keepPkgs, model.packages);
    xml = replacePsArray(xml, "capabilities", keepCaps, model.capabilities);
    xml = replacePsArray(xml, "optionalFeatures", keepFeats, model.optionalFeatures);
    xml = replacePsArray(xml, "specialApps", keepSpecial, model.specialApps);

    xml = replaceTag(xml, "Key", escXml(setup.productKey || "00000-00000-00000-00000-00000"));
    xml = replaceTag(xml, "WillShowUI", escXml(setup.willShowUI || "Always"));
    xml = replaceTag(xml, "HideEULAPage", setup.hideEula ? "true" : "false");
    xml = replaceTag(xml, "HideOEMRegistrationScreen", setup.hideOem ? "true" : "false");
    xml = replaceTag(xml, "HideOnlineAccountScreens", setup.hideOnlineAccount ? "true" : "false");
    xml = replaceTag(xml, "HideWirelessSetupInOOBE", setup.hideWireless ? "true" : "false");
    xml = replaceTag(xml, "NetworkLocation", escXml(setup.networkLocation || "Work"));
    xml = replaceTag(xml, "ProtectYourPC", escXml(setup.protectYourPC || "3"));

    xml = xml.replace(/[ \t]*<RunSynchronousCommand[\s\S]*?<\/RunSynchronousCommand>\s*/g, function (block) {
      if (!setup.bypassHw && /LabConfig/.test(block)) return "";
      if (!setup.bypassNro && /BypassNRO/.test(block)) return "";
      if (!setup.disableNet && /Disable-NetAdapter/.test(block)) return "";
      if (!setup.netFx35 && /FeatureName:NetFx3/.test(block)) return "";
      return block;
    });
    xml = xml.replace(/[ \t]*<SynchronousCommand>[\s\S]*?<\/SynchronousCommand>\s*/g, function (block) {
      if (!setup.disableNet && /Enable-NetAdapter/.test(block)) return "";
      return block;
    });
    xml = xml.replace(/<RunSynchronous>\s*<\/RunSynchronous>/g, "");
    xml = xml.replace(/<FirstLogonCommands>\s*<\/FirstLogonCommands>/g, "");

    if (!state.blocks.powerPlan) {
      xml = commentRegion(xml, "Setting up power plan: Winhance Power Plan", "# POWER SETTINGS", false);
    }
    if (!state.blocks.shortcut) {
      xml = commentRegion(xml, "Create desktop shortcut for Winhance installer", "# POWER PLAN & POWERCFG SETTINGS", false);
    }
    if (!state.blocks.startLayout) {
      xml = commentRegion(xml, "# START MENU LAYOUT", "# USER CUSTOMIZATIONS SCHEDULED TASK", false);
    }
    if (!state.blocks.wallpaper) {
      xml = commentRegion(xml, "Setting wallpaper based on Windows version and theme", "# ADD YOUR USER SPECIFIC POWERSHELL SCRIPT CONTENTS BELOW", false);
    }

    return xml;
  }

  function counts(model, state) {
    let apps = 0;
    let appsTotal = model.packages.length + model.capabilities.length + model.optionalFeatures.length + model.specialApps.length;
    model.packages.forEach(function (id) { if (state.remove.packages[id] !== false) apps++; });
    model.capabilities.forEach(function (id) { if (state.remove.capabilities[id] !== false) apps++; });
    model.optionalFeatures.forEach(function (id) { if (state.remove.features[id] !== false) apps++; });
    model.specialApps.forEach(function (id) { if (state.remove.special[id] !== false) apps++; });
    if (!state.blocks.bloat) apps = 0;
    if (state.blocks.edge) apps++;
    if (state.blocks.onedrive) apps++;
    appsTotal += 2;

    let applied = 0;
    let skipped = 0;
    model.settingGroups.forEach(function (group) {
      if (state.settings[group.id] && state.settings[group.id].apply) applied++;
      else skipped++;
    });
    model.tasks.forEach(function (task) {
      if (state.tasks[task.tn] && state.tasks[task.tn].apply) applied++;
      else skipped++;
    });
    meta.BLOCKS.forEach(function (block) {
      if (block.id === "bloat" || block.id === "edge" || block.id === "onedrive") return;
      if (state.blocks[block.id]) applied++;
      else skipped++;
    });
    return { apps: apps, appsTotal: appsTotal, applied: applied, skipped: skipped };
  }

  root.UWCore = {
    parseTemplate: parseTemplate,
    defaultState: defaultState,
    generateXml: generateXml,
    defaultValueFor: defaultValueFor,
    counts: counts,
    serializeFlags: serializeFlags,
    parseFlags: parseFlags
  };
})(typeof window !== "undefined" ? window : globalThis);
