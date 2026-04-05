/// <reference types="vite/client" />

interface FigClientConfig {
  notes: string;
  target_url: string;
  template: string;
}

interface Window {
  $figc: FigClientConfig;
  router?: unknown;
}
