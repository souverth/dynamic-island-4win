import React, { useState, useEffect } from 'react';
import { getTranslation, Language } from '../utils/i18n';

interface HardwareStats {
  os_name: string;
  cpu_name: string;
  ram_total: number; // MB
  ram_free: number;  // MB
  disk_total: number; // GB
  disk_free: number;  // GB
  disk_model: string;
  disk_health: string;
  disk_health_pct: number;
  battery_design: number; // mWh
  battery_full: number;   // mWh
  battery_current: number; // mWh
  battery_cycles: number;
}

interface TabHardwareProps {
  language?: Language;
}

const MatrixLoading: React.FC<{ scanningSpecs: string }> = ({ scanningSpecs }) => {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3.5 select-none animate-pulse">
      {/* Ultra-slim, professional spinner */}
      <svg 
        className="animate-spin h-5 w-5 text-white/40" 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle 
          className="opacity-10" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="1.5"
        />
        <path 
          className="opacity-60" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="text-[10px] text-white/35 font-medium tracking-wide">
        {scanningSpecs}
      </span>
    </div>
  );
};

export const TabHardware: React.FC<TabHardwareProps> = ({ language = 'en' }) => {
  const [stats, setStats] = useState<HardwareStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = getTranslation(language);

  useEffect(() => {
    let active = true;
    let running = false;

    const isTauri = !!(window as any).__TAURI__;
    if (!isTauri) {
      const timer = setTimeout(() => {
        if (!active) return;
        setStats({
          os_name: 'Microsoft Windows 11 Pro',
          cpu_name: 'AMD Ryzen 7 5800H with Radeon Graphics',
          ram_total: 16242,
          ram_free: 5312,
          disk_total: 512,
          disk_free: 184,
          disk_model: 'Samsung SSD 980 PRO 1TB',
          disk_health: 'Healthy',
          disk_health_pct: 99,
          battery_design: 60000,
          battery_full: 54200,
          battery_current: 48900,
          battery_cycles: 88,
        });
        setLoading(false);
      }, 800);
      return () => clearTimeout(timer);
    }

    const fetchHardware = async () => {
      if (running) return;
      running = true;
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const rawJson = await invoke<string>('get_hardware_info');
        if (!active) return;
        const parsed = JSON.parse(rawJson);
        setStats(parsed);
        setError(null);
      } catch (err: any) {
        console.error('Failed to query hardware info:', err);
        if (active) {
          setError(err.toString());
        }
      } finally {
        running = false;
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchHardware();
    const interval = setInterval(fetchHardware, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return <MatrixLoading scanningSpecs={t.scanningSpecs} />;
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-1 text-white/40 select-none">
        <span className="text-[11px] font-medium">{t.failedQuery}</span>
        <span className="text-[9px] text-white/20 text-center px-4 max-w-[200px] truncate">{error}</span>
      </div>
    );
  }

  // RAM calculations
  const ramTotalGB = Math.round(stats.ram_total / 1024);
  const ramUsedMB = stats.ram_total - stats.ram_free;
  const ramUsedGB = parseFloat((ramUsedMB / 1024).toFixed(1));
  const ramPct = Math.round((ramUsedMB / stats.ram_total) * 100);

  // Storage calculations
  const diskUsedGB = stats.disk_total - stats.disk_free;
  const diskPct = Math.round((diskUsedGB / stats.disk_total) * 100);

  // Battery calculations
  const hasBattery = stats.battery_design > 0;
  const healthPct = hasBattery ? Math.round((stats.battery_full / stats.battery_design) * 100) : 100;
  const wearPct = 100 - healthPct;

  return (
    <div className="flex flex-col w-full text-[11px] text-white/80 animate-content-reveal p-1 divide-y divide-white/[0.04] select-none">
      
      {/* OS & CPU Summary */}
      <div className="flex flex-col gap-0.5 pb-2">
        <span className="font-medium text-white/90 truncate max-w-[320px]">{stats.os_name}</span>
        <span className="text-[10px] text-white/40 truncate max-w-[320px]">{stats.cpu_name}</span>
      </div>

      {/* Memory (RAM) Info */}
      <div className="flex flex-col gap-1.5 py-2">
        <div className="flex justify-between items-center text-[10.5px]">
          <span className="font-medium text-white/50">{t.memory}</span>
          <span className="font-mono text-white/70">{ramUsedGB} GB / {ramTotalGB} GB ({ramPct}%)</span>
        </div>
        <div className="w-full h-[2px] bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full bg-white/80 rounded-full" style={{ width: `${ramPct}%` }} />
        </div>
      </div>

      {/* Storage (SSD/HDD) Info */}
      <div className="flex flex-col gap-1.5 py-2">
        <div className="flex justify-between items-center text-[10.5px]">
          <span className="font-medium text-white/50">{t.storage}</span>
          <span className="font-mono text-white/70">{diskUsedGB} GB / {stats.disk_total} GB ({diskPct}%)</span>
        </div>
        <div className="w-full h-[2px] bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full bg-white/80 rounded-full" style={{ width: `${diskPct}%` }} />
        </div>
      </div>

      {/* Disk Health Status */}
      <div className="flex items-center justify-between py-2 text-[10.5px]">
        <span className="font-medium text-white/50">{t.storageHealth}</span>
        <span className="font-mono text-white/70 truncate max-w-[200px]" title={stats.disk_model}>
          {stats.disk_health} ({stats.disk_health_pct}%)
        </span>
      </div>

      {/* Battery Diagnostics */}
      <div className="flex items-center justify-between py-2 text-[10.5px]">
        <span className="font-medium text-white/50">{t.batteryStatus}</span>
        {hasBattery ? (
          <span className="font-mono text-white/70">
            {t.batteryHealth}: {healthPct}% | {t.batteryWear}: {wearPct}% | {stats.battery_cycles} {t.batteryCycles}
          </span>
        ) : (
          <span className="text-white/30">{t.desktopMode}</span>
        )}
      </div>

    </div>
  );
};
