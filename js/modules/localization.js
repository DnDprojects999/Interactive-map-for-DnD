export const DEFAULT_LANGUAGE = "ru";

const LANGUAGE_LABELS = Object.freeze({
  ru: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  pl: "Polski",
  uk: "\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430",
});

function cloneValue(value) {
  if (value === undefined) return value;
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

// "Meaningful" is stricter than plain truthiness: empty strings and empty
// arrays should still fall back to the base language.
function hasMeaningfulValue(value) {
  if (Array.isArray(value)) return value.some((entry) => hasMeaningfulValue(entry));
  if (typeof value === "string") return value.trim().length > 0;
  return value !== undefined && value !== null;
}

export function normalizeLanguageCode(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return normalized || DEFAULT_LANGUAGE;
}

export function getLanguageLabelSuggestion(code) {
  const normalized = normalizeLanguageCode(code);
  return LANGUAGE_LABELS[normalized] || normalized.toUpperCase();
}

function normalizeLanguageEntry(rawValue, fallbackCode = DEFAULT_LANGUAGE) {
  if (typeof rawValue === "string") {
    const code = normalizeLanguageCode(rawValue || fallbackCode);
    return { code, label: getLanguageLabelSuggestion(code), visible: true };
  }

  const code = normalizeLanguageCode(rawValue?.code || fallbackCode);
  const label = String(rawValue?.label || "").trim() || getLanguageLabelSuggestion(code);
  return {
    code,
    label,
    visible: rawValue?.visible !== false,
  };
}

export function normalizeTranslationsMap(rawValue) {
  if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) return {};

  return Object.entries(rawValue).reduce((result, [code, fields]) => {
    const normalizedCode = normalizeLanguageCode(code);
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) return result;

    const normalizedFields = Object.entries(fields).reduce((fieldResult, [field, value]) => {
      fieldResult[field] = cloneValue(value);
      return fieldResult;
    }, {});

    if (Object.keys(normalizedFields).length > 0) result[normalizedCode] = normalizedFields;
    return result;
  }, {});
}

// World languages are normalized from several sources at once:
// - default language
// - explicit languages list
// - keys already present in translations
// This lets older worlds keep working even if their config is incomplete.
export function normalizeLanguageConfig(rawWorldInfo = {}) {
  const defaultLanguage = normalizeLanguageCode(rawWorldInfo.defaultLanguage || DEFAULT_LANGUAGE);
  const translationLanguageCodes = rawWorldInfo.translations && typeof rawWorldInfo.translations === "object"
    ? Object.keys(rawWorldInfo.translations)
    : [];
  const fallbackLanguages = defaultLanguage === "en"
    ? [defaultLanguage]
    : [defaultLanguage, "en"];
  const configuredLanguages = Array.isArray(rawWorldInfo.languages) && rawWorldInfo.languages.length
    ? rawWorldInfo.languages
    : fallbackLanguages;
  const inputLanguages = [...configuredLanguages, ...translationLanguageCodes];

  const languages = [];
  const seen = new Set();
  const pushLanguage = (entry, fallbackCode) => {
    const normalized = normalizeLanguageEntry(entry, fallbackCode);
    if (seen.has(normalized.code)) return;
    seen.add(normalized.code);
    languages.push(normalized);
  };

  inputLanguages.forEach((entry, index) => pushLanguage(entry, `lang-${index + 1}`));
  pushLanguage({ code: defaultLanguage, label: getLanguageLabelSuggestion(defaultLanguage), visible: true }, defaultLanguage);

  const hasExplicitLanguagesEnabled = typeof rawWorldInfo.languagesEnabled === "boolean";
  const inferredLanguagesEnabled = languages.filter((entry) => entry.visible !== false).length > 1;

  return {
    defaultLanguage,
    languagesEnabled: hasExplicitLanguagesEnabled ? rawWorldInfo.languagesEnabled : inferredLanguagesEnabled,
    languages,
  };
}

export function getLanguages(worldData) {
  return normalizeLanguageConfig(worldData).languages;
}

export function getUserFacingLanguages(worldData) {
  return getLanguages(worldData).filter((language) => language.visible !== false);
}

export function getDefaultLanguage(worldData) {
  return normalizeLanguageConfig(worldData).defaultLanguage;
}

export function resolveLanguage(worldData, requestedLanguage) {
  const { defaultLanguage, languages } = normalizeLanguageConfig(worldData);
  const normalizedRequested = normalizeLanguageCode(requestedLanguage || defaultLanguage);
  return languages.some((entry) => entry.code === normalizedRequested)
    ? normalizedRequested
    : defaultLanguage;
}

export function getLanguageLabel(worldData, code) {
  const normalizedCode = normalizeLanguageCode(code);
  const entry = getLanguages(worldData).find((language) => language.code === normalizedCode);
  return entry?.label || getLanguageLabelSuggestion(normalizedCode);
}

export function shouldShowLanguageSwitcher(worldData, editMode = false) {
  if (editMode) return true;
  return getUserFacingLanguages(worldData).length > 1 || Boolean(worldData?.languagesEnabled && getUserFacingLanguages(worldData).length > 0);
}

export function canUserOpenLanguageMenu(worldData) {
  return getLanguages(worldData).length > 1;
}

// Read helpers always prefer the current language, then fall back to the base
// field. Write helpers do the reverse and store translated values only when the
// editor is not working in the default language.
export function getLocalizedValue(entity, field, context, fallback = "") {
  const worldData = context?.worldData || context;
  const currentLanguage = resolveLanguage(worldData, context?.currentLanguage);
  const defaultLanguage = getDefaultLanguage(worldData);
  const baseValue = cloneValue(entity?.[field]);

  if (currentLanguage === defaultLanguage) {
    return hasMeaningfulValue(baseValue) ? baseValue : cloneValue(fallback);
  }

  const translatedValue = cloneValue(entity?.translations?.[currentLanguage]?.[field]);
  if (hasMeaningfulValue(translatedValue)) return translatedValue;
  return hasMeaningfulValue(baseValue) ? baseValue : cloneValue(fallback);
}

export function getLocalizedText(entity, field, context, fallback = "") {
  const value = getLocalizedValue(entity, field, context, fallback);
  return typeof value === "string" ? value : String(value || fallback || "");
}

export function setLocalizedValue(entity, field, value, context) {
  if (!entity || typeof entity !== "object") return;

  const worldData = context?.worldData || context;
  const currentLanguage = resolveLanguage(worldData, context?.currentLanguage);
  const defaultLanguage = getDefaultLanguage(worldData);
  const nextValue = cloneValue(value);

  if (currentLanguage === defaultLanguage) {
    entity[field] = nextValue;
    return;
  }

  entity.translations = entity.translations && typeof entity.translations === "object" && !Array.isArray(entity.translations)
    ? entity.translations
    : {};
  entity.translations[currentLanguage] = entity.translations[currentLanguage]
    && typeof entity.translations[currentLanguage] === "object"
    && !Array.isArray(entity.translations[currentLanguage])
    ? entity.translations[currentLanguage]
    : {};
  entity.translations[currentLanguage][field] = nextValue;
}

export function addLanguageToWorld(worldData, code, label = "") {
  const normalizedCode = normalizeLanguageCode(code);
  const languages = getLanguages(worldData);
  if (languages.some((entry) => entry.code === normalizedCode)) return normalizedCode;

  worldData.languages = [
    ...languages,
    {
      code: normalizedCode,
      label: String(label || "").trim() || getLanguageLabelSuggestion(normalizedCode),
      visible: true,
    },
  ];
  return normalizedCode;
}

export function setLanguageVisibility(worldData, code, visible) {
  const normalizedCode = normalizeLanguageCode(code);
  const languages = getLanguages(worldData);
  let changed = false;

  worldData.languages = languages.map((entry) => {
    if (entry.code !== normalizedCode) return entry;
    changed = true;
    return { ...entry, visible: Boolean(visible) };
  });

  return changed;
}

export function removeLanguageFromWorld(worldData, code) {
  const normalizedCode = normalizeLanguageCode(code);
  const defaultLanguage = getDefaultLanguage(worldData);
  if (!worldData || normalizedCode === defaultLanguage) return false;

  const languages = getLanguages(worldData);
  const nextLanguages = languages.filter((entry) => entry.code !== normalizedCode);
  if (nextLanguages.length === languages.length) return false;

  worldData.languages = nextLanguages;
  if (worldData.translations && typeof worldData.translations === "object") {
    delete worldData.translations[normalizedCode];
    if (!Object.keys(worldData.translations).length) worldData.translations = {};
  }
  return true;
}
