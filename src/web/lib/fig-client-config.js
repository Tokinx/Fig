const DEFAULT_FIG_CLIENT_CONFIG = Object.freeze({
  template: "",
  target_url: "",
  notes: "",
});

function normalizeString(value) {
  return typeof value === "string" ? value : "";
}

export function getFigClientConfig() {
  const config = window.$figc ?? DEFAULT_FIG_CLIENT_CONFIG;

  return Object.freeze({
    template: normalizeString(config.template),
    target_url: normalizeString(config.target_url),
    notes: normalizeString(config.notes),
  });
}

