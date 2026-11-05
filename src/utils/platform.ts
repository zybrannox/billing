// Macs and iPads show the command key; everything else uses Ctrl.
const isApple = /Mac|iPhone|iPad/.test(navigator.platform);

// e.g. shortcutLabel("K") is "⌘K" on a Mac and "Ctrl K" elsewhere.
export const shortcutLabel = (key: string) => (isApple ? `⌘${key.length > 1 ? ` ${key}` : key}` : `Ctrl ${key}`);
