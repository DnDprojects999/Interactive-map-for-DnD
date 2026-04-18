const DEFAULT_HERO_ACCENT = "#b98a4b";

// Template factories provide the starter content that appears when an editor
// creates a new entity from the UI.
function normalizeKind(kind) {
  const value = String(kind || "").trim().toLowerCase();
  if (["faction", "fractions", "guild", "order"].includes(value)) return "faction";
  if (["city", "state", "country", "region", "realm"].includes(value)) return "city";
  if (["authority", "power", "council", "institution"].includes(value)) return "authority";
  return "general";
}

export function inferArchiveTemplateKind(group) {
  // If a group kind was not stored explicitly, we make a best-effort guess from
  // its title so old projects still get the right archive template.
  const explicitKind = normalizeKind(group?.kind);
  if (explicitKind !== "general") return explicitKind;

  const title = String(group?.title || "").toLowerCase();
  if (title.includes("С„СЂР°Рє") || title.includes("РіРёР»СЊРґ") || title.includes("РѕСЂРґРµРЅ")) return "faction";
  if (title.includes("СЃС‚СЂР°РЅ") || title.includes("РіРѕСЂРѕРґ") || title.includes("СЂРµРіРёРѕРЅ") || title.includes("Р·РµРјР»")) return "city";
  if (title.includes("РІР»Р°СЃС‚") || title.includes("СЃРѕРІРµС‚") || title.includes("РїР°Р»Р°С‚") || title.includes("СЃРёРЅРѕРґ")) return "authority";
  return "general";
}

export function createTimelineEventTemplate(previousEvent) {
  // New timeline events inherit position/act context from the previous event so
  // bulk timeline building requires fewer manual fixes.
  return {
    year: "NOW",
    title: "Новый поворот хроники",
    description: "Что именно произошло, кто в этом участвовал и почему событие важно для мира прямо сейчас.",
    fullDescription: "Подробно опиши само событие, последствия, участников и какие нити оно оставляет на кампанию.",
    imageUrl: "",
    imageText: "Иллюстрация, карта, портрет участников или кадр события.",
    markerId: "",
    actId: previousEvent?.actId || "",
    facts: ["", "", ""],
    position: previousEvent?.position === "up" ? "down" : "up",
    sidebarShortcut: false,
    sidebarShortcutLabel: "",
  };
}

export function createTimelineActTemplate(order = 0) {
  return {
    id: "",
    title: `Акт ${order + 1}`,
    description: "Отдельная арка хроники для крупной истории, фронта или важной кампанийной линии.",
    backgroundImageUrl: "",
    sortOrder: order,
    translations: {
      en: {
        title: `Act ${order + 1}`,
        description: "A separate chronicle arc for a major story, front, or campaign line.",
      },
    },
  };
}

export function createArchiveGroupTemplate(kind = "general") {
  const normalizedKind = normalizeKind(kind);
  const templates = {
    faction: {
      title: "Р¤СЂР°РєС†РёРё",
    },
    city: {
      title: "Р“РѕСЂРѕРґР° Рё СЂРµРіРёРѕРЅС‹",
    },
    authority: {
      title: "РћСЂРіР°РЅС‹ РІР»Р°СЃС‚Рё",
    },
    general: {
      title: "РќРѕРІР°СЏ РіР»Р°РІР°",
    },
  };

  return {
    id: "",
    kind: normalizedKind,
    title: templates[normalizedKind].title,
    items: [],
  };
}

export function createArchiveItemTemplate(kind = "general", sortOrder = 0) {
  const normalizedKind = normalizeKind(kind);
  const templates = {
    faction: {
      title: "РќРѕРІР°СЏ С„СЂР°РєС†РёСЏ",
      imageLabel: "Р“РµСЂР± РёР»Рё СЃРёРјРІРѕР» С„СЂР°РєС†РёРё",
      expandedImageLabel: "Р‘РѕР»СЊС€РѕР№ Р±Р°РЅРЅРµСЂ РёР»Рё РїРѕСЂС‚СЂРµС‚ Р»РёРґРµСЂР°",
      description: "РљС‚Рѕ РѕРЅРё, РіРґРµ РґРµСЂР¶Р°С‚ РІР»РёСЏРЅРёРµ Рё С‡РµРј РёР·РІРµСЃС‚РЅС‹ РЅР° РєР°СЂС‚Рµ РЎРµСЂРєРѕРЅРёРё.",
      fullDescription: "РљС‚Рѕ РѕРЅРё С‚Р°РєРёРµ.\nР¦РµР»Рё Рё РёРЅС‚РµСЂРµСЃС‹.\nРЎ РєРµРј РґСЂСѓР¶Р°С‚ РёР»Рё РІСЂР°Р¶РґСѓСЋС‚.\nР§РµРј РјРѕРіСѓС‚ Р±С‹С‚СЊ РїРѕР»РµР·РЅС‹ РёР»Рё РѕРїР°СЃРЅС‹ РґР»СЏ РёРіСЂРѕРєРѕРІ.",
    },
    city: {
      title: "РќРѕРІС‹Р№ РіРѕСЂРѕРґ",
      imageLabel: "Р’РёРґ РіРѕСЂРѕРґР° РёР»Рё РіРµСЂР±",
      expandedImageLabel: "Р‘РѕР»СЊС€Р°СЏ РёР»Р»СЋСЃС‚СЂР°С†РёСЏ РјРµСЃС‚Р°",
      description: "Р§РµРј Р¶РёРІС‘С‚ СЌС‚РѕС‚ РіРѕСЂРѕРґ РёР»Рё СЂРµРіРёРѕРЅ Рё РїРѕС‡РµРјСѓ РѕРЅ РІР°Р¶РµРЅ РґР»СЏ РєР°РјРїР°РЅРёРё.",
      fullDescription: "РљСЂР°С‚РєР°СЏ РёСЃС‚РѕСЂРёСЏ РјРµСЃС‚Р°.\nРљС‚Рѕ Р·РґРµСЃСЊ РїСЂР°РІРёС‚.\nР§РµРј РіРѕСЂРѕРґ СЃР»Р°РІРёС‚СЃСЏ.\nРљР°РєРёРµ РїСЂРѕР±Р»РµРјС‹ РёР»Рё Р·Р°С†РµРїРєРё Р¶РґСѓС‚ РёРіСЂРѕРєРѕРІ.",
    },
    authority: {
      title: "РќРѕРІС‹Р№ РѕСЂРіР°РЅ РІР»Р°СЃС‚Рё",
      imageLabel: "РџРµС‡Р°С‚СЊ, СЃРёРјРІРѕР» РёР»Рё Р·Р°Р» Р·Р°СЃРµРґР°РЅРёР№",
      expandedImageLabel: "Р‘РѕР»СЊС€Р°СЏ СЃС†РµРЅР° РІР»Р°СЃС‚Рё РёР»Рё СЃРёРјРІРѕР»Р°",
      description: "РљС‚Рѕ РїСЂРёРЅРёРјР°РµС‚ СЂРµС€РµРЅРёСЏ Рё РєР°Рє СЌС‚РѕС‚ РёРЅСЃС‚РёС‚СѓС‚ РІР»РёСЏРµС‚ РЅР° РјРёСЂ.",
      fullDescription: "РљС‚Рѕ РІС…РѕРґРёС‚ РІ СЌС‚РѕС‚ РѕСЂРіР°РЅ.\nРљР°Рє РѕРЅ РїСЂРёРЅРёРјР°РµС‚ СЂРµС€РµРЅРёСЏ.\nРљР°РєРёРµ СЂРµСЃСѓСЂСЃС‹ Рё СЂС‹С‡Р°РіРё РІР»РёСЏРЅРёСЏ Сѓ РЅРµРіРѕ РµСЃС‚СЊ.\nР§РµРј РѕРЅ РІР°Р¶РµРЅ РґР»СЏ С‚РµРєСѓС‰РµР№ С…СЂРѕРЅРёРєРё.",
    },
    general: {
      title: "РќРѕРІР°СЏ Р·Р°РїРёСЃСЊ",
      imageLabel: "РР»Р»СЋСЃС‚СЂР°С†РёСЏ РєР°СЂС‚РѕС‡РєРё",
      expandedImageLabel: "РР»Р»СЋСЃС‚СЂР°С†РёСЏ СЂР°СЃРєСЂС‹С‚РѕРіРѕ РІРёРґР°",
      description: "РљРѕСЂРѕС‚РєРѕ РѕРїРёС€Рё, С‡С‚Рѕ СЌС‚Рѕ Р·Р° Р·Р°РїРёСЃСЊ Рё РїРѕС‡РµРјСѓ РЅР° РЅРµС‘ СЃС‚РѕРёС‚ РѕР±СЂР°С‚РёС‚СЊ РІРЅРёРјР°РЅРёРµ.",
      fullDescription: "РџРѕРґСЂРѕР±РЅРѕРµ РѕРїРёСЃР°РЅРёРµ Р·Р°РїРёСЃРё.\nРћСЃРЅРѕРІРЅС‹Рµ РґРµС‚Р°Р»Рё.\nРЎРІСЏР·Рё СЃ РјРёСЂРѕРј.\nР§С‚Рѕ РёРіСЂРѕРєР°Рј РІР°Р¶РЅРѕ Р·РЅР°С‚СЊ РІ РїРµСЂРІСѓСЋ РѕС‡РµСЂРµРґСЊ.",
    },
  };

  return {
    id: "",
    title: templates[normalizedKind].title,
    imageLabel: templates[normalizedKind].imageLabel,
    expandedImageLabel: templates[normalizedKind].expandedImageLabel,
    description: templates[normalizedKind].description,
    fullDescription: templates[normalizedKind].fullDescription,
    sortOrder,
  };
}

export function createHeroGroupTemplate() {
  return {
    id: "",
    title: "РќРѕРІР°СЏ РїР°СЂС‚РёСЏ",
    subtitle: "РљС‚Рѕ РІС…РѕРґРёС‚ РІ СЌС‚Сѓ РіСЂСѓРїРїСѓ, С‡РµРј РѕРЅР° СЃРІСЏР·Р°РЅР° Рё РєР°РєСѓСЋ СЂРѕР»СЊ РёРіСЂР°РµС‚ РІ С…СЂРѕРЅРёРєРµ РЎРµСЂРєРѕРЅРёРё.",
    items: [],
  };
}

export function createHeroCardTemplate(sortOrder = 0) {
  return {
    id: "",
    title: "РќРѕРІС‹Р№ РіРµСЂРѕР№",
    role: "Р РѕР»СЊ РІ С…СЂРѕРЅРёРєРµ",
    imageLabel: "Р”РѕР±Р°РІСЊ РїРѕСЂС‚СЂРµС‚ РіРµСЂРѕСЏ",
    imageUrl: "",
    accentColor: DEFAULT_HERO_ACCENT,
    accentColorOverride: "",
    description: "РљС‚Рѕ СЌС‚Рѕ, С‡РµРј РѕРЅ Р·Р°РїРѕРјРЅРёР»СЃСЏ РѕС‚СЂСЏРґСѓ Рё РїРѕС‡РµРјСѓ РЅР° РЅРµРіРѕ СЃС‚РѕРёС‚ СЃРјРѕС‚СЂРµС‚СЊ РІ РїРµСЂРІСѓСЋ РѕС‡РµСЂРµРґСЊ.",
    fullDescription: "РџСЂРѕРёСЃС…РѕР¶РґРµРЅРёРµ Рё С…Р°СЂР°РєС‚РµСЂ.\nР¦РµР»Рё Рё РІРЅСѓС‚СЂРµРЅРЅРёРµ РєРѕРЅС„Р»РёРєС‚С‹.\nРЎРІСЏР·Рё СЃ РѕС‚СЂСЏРґРѕРј, С„СЂР°РєС†РёСЏРјРё Рё РјРёСЂРѕРј.\nР’Р°Р¶РЅС‹Рµ СЃС†РµРЅС‹, С‚Р°Р№РЅС‹ Рё Р·Р°С†РµРїРєРё РЅР° Р±СѓРґСѓС‰РµРµ.",
    sortOrder,
    links: [],
  };
}

export function createHomebrewCategoryTemplate(sortOrder = 0) {
  return {
    id: "",
    title: `\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f ${sortOrder + 1}`,
    description: "",
    sortOrder,
    translations: {
      en: {
        title: `Category ${sortOrder + 1}`,
        description: "",
      },
    },
  };
}

export function createHomebrewArticleTemplate(sortOrder = 0, type = "change") {
  return {
    id: "",
    type,
    title: "\u041d\u043e\u0432\u0430\u044f \u0441\u0442\u0430\u0442\u044c\u044f",
    summary: "\u041a\u043e\u0440\u043e\u0442\u043a\u043e \u043e\u043f\u0438\u0448\u0438, \u0447\u0442\u043e \u0438\u043c\u0435\u043d\u043d\u043e \u043c\u0435\u043d\u044f\u0435\u0442\u0441\u044f, \u0434\u043e\u0431\u0430\u0432\u043b\u044f\u0435\u0442\u0441\u044f \u0438\u043b\u0438 \u0443\u0442\u043e\u0447\u043d\u044f\u0435\u0442\u0441\u044f.",
    content: "\u0417\u0434\u0435\u0441\u044c \u043c\u043e\u0436\u043d\u043e \u043f\u043e\u0434\u0440\u043e\u0431\u043d\u043e \u0440\u0430\u0441\u043f\u0438\u0441\u0430\u0442\u044c \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0435, \u043d\u043e\u0432\u043e\u0435 \u043f\u0440\u0430\u0432\u0438\u043b\u043e \u0438\u043b\u0438 \u0434\u043e\u043c\u0430\u0448\u043d\u0438\u0439 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b.",
    sourceUrl: "",
    categoryIds: [],
    sortOrder,
    translations: {
      en: {
        title: "New article",
        summary: "Briefly describe what changes, what is new, or what this rule clarifies.",
        content: "Use this space for the full homebrew text, changelog entry, or rule explanation.",
      },
    },
  };
}
