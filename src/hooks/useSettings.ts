import { useState } from 'react';

export interface AppSettings {
  animationSpeed: number;
  expandedWidth: number;
  heightMultiplier: number;
  startOnBoot: boolean;
  selectedMonitor: string;
  language: 'en' | 'vi';
}

const DEFAULT_SETTINGS: AppSettings = {
  animationSpeed: 600,
  expandedWidth: 420,
  heightMultiplier: 1.0,
  startOnBoot: false,
  selectedMonitor: '',
  language: 'en',
};

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem('vibe-island-settings');
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
    return DEFAULT_SETTINGS;
  });

  const setSettings = (newSettings: Partial<AppSettings>) => {
    setSettingsState((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('vibe-island-settings', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save settings', e);
      }
      return updated;
    });
  };

  return { settings, setSettings };
}
