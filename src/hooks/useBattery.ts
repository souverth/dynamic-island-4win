import { useState, useEffect } from 'react';

export interface BatteryState {
  level: number;
  charging: boolean;
}

export function useBattery() {
  const [battery, setBattery] = useState<BatteryState>({ level: 100, charging: false });

  useEffect(() => {
    // Only query on browser environment
    if (typeof navigator === 'undefined' || !('getBattery' in navigator)) return;

    let batteryObj: any = null;

    const updateState = () => {
      if (batteryObj) {
        setBattery({
          level: Math.round(batteryObj.level * 100),
          charging: batteryObj.charging,
        });
      }
    };

    (navigator as any).getBattery().then((batt: any) => {
      batteryObj = batt;
      updateState();
      batt.addEventListener('levelchange', updateState);
      batt.addEventListener('chargingchange', updateState);
    });

    return () => {
      if (batteryObj) {
        batteryObj.removeEventListener('levelchange', updateState);
        batteryObj.removeEventListener('chargingchange', updateState);
      }
    };
  }, []);

  return battery;
}
