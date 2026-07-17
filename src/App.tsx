import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { Bell, Timer, ListTodo, Music, Inbox } from 'lucide-react';
import { CompactIsland } from './components/CompactIsland';
import { useBattery } from './hooks/useBattery';
import { useMedia } from './hooks/useMedia';
import { useClickTracker } from './hooks/useClickTracker';
import { useSettings } from './hooks/useSettings';

import type { StashedFile } from './components/TabDrop';
import type { StoredNotification } from './components/TabNotifications';

// Tải động (Lazy loading) các tab chức năng để giảm tải lượng code ban đầu | Lazy-load tab components to reduce initial bundle chunk size
const TabPomo = lazy(() => import('./components/TabPomo').then(m => ({ default: m.TabPomo })));
const TabNotes = lazy(() => import('./components/TabNotes').then(m => ({ default: m.TabNotes })));
const TabMusic = lazy(() => import('./components/TabMusic').then(m => ({ default: m.TabMusic })));
const TabDrop = lazy(() => import('./components/TabDrop').then(m => ({ default: m.TabDrop })));
const TabSettings = lazy(() => import('./components/TabSettings').then(m => ({ default: m.TabSettings })));
const TabNotifications = lazy(() => import('./components/TabNotifications').then(m => ({ default: m.TabNotifications })));

const FIXED_WIDTH = 650; // Wide enough to accommodate all compact states and hovered music without resizing the Tauri window

export const App: React.FC = () => {
  const { settings, setSettings } = useSettings();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'tab-pomo' | 'tab-notes' | 'tab-music' | 'tab-drop' | 'tab-settings' | 'tab-notifications'>('tab-pomo');
  const [currentSlot, setCurrentSlot] = useState<string>('idle');
  const [timeString, setTimeString] = useState('00:00');
  const [tasksCount, setTasksCount] = useState(0);
  const [filesCount, setFilesCount] = useState(0);

  // Khe cắm thông báo tạm thời (notifSlot) - Ghi đè khe hiển thị hiện tại trong N giây rồi tự động trả về vị trí cũ
  const [notifSlot, setNotifSlot] = useState<string | null>(null);
  const notifTimerRef = useRef<number | null>(null);
  const prevSlotRef = useRef<string>('idle');

  const showNotifSlot = useCallback((slot: string, duration = 8000) => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    // Lưu lại vị trí slot trước khi bị thông báo đè lên để sau khi hết thời gian còn khôi phục lại
    setCurrentSlot((cur) => {
      // Chỉ lưu slot thực tế, không lưu đè khi đang hiển thị một thông báo khác
      if (cur !== slot) prevSlotRef.current = cur;
      return cur;
    });
    setNotifSlot(slot);
    notifTimerRef.current = window.setTimeout(() => {
      setNotifSlot(null);
    }, duration);
  }, []);

  // Xác định khe hiển thị cuối cùng trong chế độ thu nhỏ: Ưu tiên thông báo tạm thời trước
  const displaySlot = notifSlot ?? currentSlot;

  // Ánh xạ nhanh giữa khe hiển thị (slot) và tab nội dung tương ứng để tự động chuyển tab khi click mở rộng đảo
  const slotToTabMap: Record<string, typeof activeTab> = {
    idle: 'tab-pomo',
    music: 'tab-music',
    pomo: 'tab-pomo',
    tasks: 'tab-notes',
    files: 'tab-drop',
    battery: 'tab-pomo',
    bluetooth: 'tab-settings',
    'system-notification': 'tab-notifications',
  };

  const [btDeviceName, setBtDeviceName] = useState<string>('');
  const [btStatus, setBtStatus] = useState<'connected' | 'disconnected'>('connected');
  const [systemNotif, setSystemNotif] = useState<{ appName: string; title: string; message: string; imagePath?: string } | null>(null);

  // Lịch sử thông báo chỉ lưu trữ tạm thời trên bộ nhớ RAM, tự động giải phóng khi tắt ứng dụng | Notification history is stored in RAM only, auto-cleared on app close
  const [notifHistory, setNotifHistory] = useState<StoredNotification[]>([]);

  const handleMarkAsRead = (id: string) => {
    setNotifHistory((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllAsRead = () => {
    setNotifHistory((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationClick = async (notif: StoredNotification) => {
    handleMarkAsRead(notif.id);
    ignoreNextBlurRef.current = true;
    if ((window as any).__TAURI__) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('focus_window_by_name', { name: notif.appName });
      } catch (err) {
        console.error('Failed to focus window:', err);
      }
    }
  };

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('notif_sound_enabled');
    return saved !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('notif_sound_enabled', String(soundEnabled));
  }, [soundEnabled]);

  // Bộ phát âm thanh báo hiệu bằng Web Audio API (Chime kép dạng kỹ thuật số, tự tạo dao động tần số trực tiếp không cần file tĩnh)
  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = ctx.currentTime;

      // Nốt chính: Tần số cao vút (A5), âm lượng vừa phải, tan nhanh trong 0.3s
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5 note
      osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.12);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Nốt phụ: Độ trễ nhẹ 0.08s tạo âm vang vọng (Echo) sang nốt C6, tạo cảm giác chuông chime sang trọng
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1046.5, now + 0.08); // C6 note
      osc2.frequency.exponentialRampToValueAtTime(1500, now + 0.2);
      gain2.gain.setValueAtTime(0.06, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.4);
    } catch (e) {
      console.error("Failed to play notification chime sound:", e);
    }
  }, []);

  // Các biến lưu trữ trạng thái chạy đếm ngược của Pomodoro
  const [pomoSeconds, setPomoSeconds] = useState(1500);
  const [pomoTotalSeconds, setPomoTotalSeconds] = useState(1500);
  const [pomoIsRunning, setPomoIsRunning] = useState(false);
  const [pomoCompletedCount, setPomoCompletedCount] = useState(0);
  const pomoTimerRef = useRef<number | null>(null);

  const pomoMins = Math.floor(pomoSeconds / 60);
  const pomoSecs = pomoSeconds % 60;
  const pomoTimeStr = `${pomoMins.toString().padStart(2, '0')}:${pomoSecs.toString().padStart(2, '0')}`;

  const [isDragOver, setIsDragOver] = useState(false);
  const [contentHeight, setContentHeight] = useState<number>(30);
  const [stashedFiles, setStashedFiles] = useState<StashedFile[]>([]);
  const [isTransitioningToCompact, setIsTransitioningToCompact] = useState(false);

  const [isHovered, setIsHovered] = useState(false);
  const [windowHeightOverride, setWindowHeightOverride] = useState<number | null>(null);

  const islandRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const lastSizeRef = useRef({ width: 0, height: 0 });
  const ignoreNextBlurRef = useRef(false);
  const expandedRefCallback = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (node) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const naturalHeight = entry.target.scrollHeight + 34;
          setContentHeight(naturalHeight);
        }
      });
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  // Cơ chế nới rộng tạm thời kích thước cửa sổ Tauri trong lúc chuyển đổi (transition) để nội dung bung ra mượt mà, không bị vấp/cắt khung hình
  useEffect(() => {
    if (isExpanded) {
      setWindowHeightOverride(550);
      const timer = setTimeout(() => {
        setWindowHeightOverride(null);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, activeTab]);

  // Nhập các bộ quản lý dữ liệu (Hook kết nối luồng sự kiện tauri truyền đến)
  const battery = useBattery();
  const { track, localPlaying, dominantColor, timeline, togglePlay, skipNext, skipPrevious } = useMedia();
  const { clicks, incrementClicks } = useClickTracker();

  // Khai báo các biến tham chiếu để phát hiện sự thay đổi trạng thái và gửi thông báo
  const prevTrackTitleRef = useRef<string>('');
  const prevChargingRef = useRef<boolean>(false);

  // Notification: new track / music started
  useEffect(() => {
    if (!isExpanded && track.title && track.title !== 'Ready' && track.title !== prevTrackTitleRef.current) {
      prevTrackTitleRef.current = track.title;
      if (currentSlot !== 'music') {
        showNotifSlot('music');
      }
    }
  }, [track.title, isExpanded, currentSlot]);

  // Notification: charger plugged in
  useEffect(() => {
    if (!isExpanded && battery.charging && !prevChargingRef.current) {
      showNotifSlot('battery', 6000);
    }
    prevChargingRef.current = battery.charging;
  }, [battery.charging, isExpanded]);

  // Clock Update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Bluetooth Connection Listeners
  useEffect(() => {
    let unlistenConnected: (() => void) | null = null;
    let unlistenDisconnected: (() => void) | null = null;

    const setupListeners = async () => {
      const isTauri = !!(window as any).__TAURI__;
      if (!isTauri) return;

      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlistenConnected = await listen<string>('bluetooth-connected', (event) => {
          setBtDeviceName(event.payload);
          setBtStatus('connected');
          showNotifSlot('bluetooth', 5000);
        });

        unlistenDisconnected = await listen<string>('bluetooth-disconnected', (event) => {
          setBtDeviceName(event.payload);
          setBtStatus('disconnected');
          showNotifSlot('bluetooth', 5000);
        });
      } catch (e) {
        console.error('Failed to listen to bluetooth events:', e);
      }
    };

    setupListeners();

    return () => {
      if (unlistenConnected) unlistenConnected();
      if (unlistenDisconnected) unlistenDisconnected();
    };
  }, [showNotifSlot]);

  // Trình lắng nghe thông báo hệ thống | System Notification listener
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    const setupNotifListener = async () => {
      const isTauri = !!(window as any).__TAURI__;
      if (!isTauri) return;

      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlisten = await listen<{ app_name: string; title: string; message: string; image_path?: string }>('system-notification', async (event) => {
          const payload = event.payload;
          
          let imgUrl = '';
          if (payload.image_path) {
            try {
              const { convertFileSrc } = await import('@tauri-apps/api/core');
              const cleanPath = payload.image_path.replace(/^file:\/\/\//, '').replace(/^file:\/\//, '');
              imgUrl = convertFileSrc(decodeURIComponent(cleanPath));
            } catch (err) {
              console.error('Failed to convert image path:', err);
            }
          }

          setSystemNotif({
            appName: payload.app_name,
            title: payload.title,
            message: payload.message,
            imagePath: imgUrl || undefined,
          });

          // Thêm vào lịch sử lưu trữ thông báo | Add to notifications history
          const newNotif: StoredNotification = {
            id: Math.random().toString(36).substring(2, 9),
            appName: payload.app_name,
            title: payload.title,
            message: payload.message,
            timestamp: Date.now(),
            read: false,
            imagePath: imgUrl || undefined,
          };
          setNotifHistory((prev) => [newNotif, ...prev].slice(0, 50));

          // Phát âm thanh chime nếu cài đặt bật | Play premium chime sound if enabled
          if (soundEnabled) {
            playNotificationSound();
          }

          showNotifSlot('system-notification', 6000);
        });
      } catch (e) {
        console.error('Failed to listen to system notification event:', e);
      }
    };
    setupNotifListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [showNotifSlot]);

  // Căn chỉnh lại vị trí cửa sổ dựa theo màn hình được chọn | Reposition window based on selected monitor settings
  useEffect(() => {
    const isTauri = !!(window as any).__TAURI__;
    if (isTauri && settings.selectedMonitor) {
      const reposition = async () => {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('reposition_to_monitor', { monitorName: settings.selectedMonitor });
        } catch (e) {
          console.error('Failed to apply monitor positioning:', e);
        }
      };
      // Đợi nhẹ để hệ điều hành khởi tạo xong tay cầm cửa sổ | Short delay to ensure window handles are fully initialized by OS
      const timer = setTimeout(reposition, 100);
      return () => clearTimeout(timer);
    }
  }, [settings.selectedMonitor]);

  // Đọc số phiên Pomo hôm nay, xin quyền gửi thông báo và dọn dẹp bộ nhớ đệm cũ | Load today's completed Pomo count, request permission & clear old cached storage items
  useEffect(() => {
    // Dọn dẹp dứt điểm bộ nhớ đệm thông báo cũ trên ổ đĩa để giải phóng dung lượng | Explicitly delete old notification storage junk
    localStorage.removeItem('notifications_history');

    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(`pomo_count_${today}`);
    if (stored) {
      setPomoCompletedCount(parseInt(stored, 10));
    }
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Đồng bộ số lượng công việc từ cơ sở dữ liệu SQLite cục bộ | Sync Tasks Count from local SQLite DB
  useEffect(() => {
    const isTauri = !!(window as any).__TAURI__;
    if (!isTauri) {
      // Đồng bộ giả lập khi chạy trên trình duyệt web | Mock sync for web
      const syncMock = () => {
        const saved = localStorage.getItem('local_tasks_mock');
        if (saved) {
          const list = JSON.parse(saved);
          setTasksCount(list.filter((t: any) => !t.done).length);
        }
      };
      syncMock();
      const interval = setInterval(syncMock, 3000);
      return () => clearInterval(interval);
    }

    const fetchTasksCount = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const today = new Date().toISOString().split('T')[0];
        const list = await invoke<any[]>('get_local_tasks', { today });
        const activeCount = list.filter((t) => !t.done).length;
        setTasksCount(activeCount);
      } catch (err) {
        console.error('Failed to sync tasks count:', err);
      }
    };

    fetchTasksCount();
    const interval = setInterval(fetchTasksCount, 3000);
    return () => clearInterval(interval);
  }, []);

  // Xử lý bộ đếm ngược thời gian Pomodoro | Handle timer countdown
  useEffect(() => {
    if (pomoIsRunning) {
      pomoTimerRef.current = setInterval(() => {
        setPomoSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(pomoTimerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (pomoTimerRef.current) {
        clearInterval(pomoTimerRef.current);
      }
    }

    return () => {
      if (pomoTimerRef.current) clearInterval(pomoTimerRef.current);
    };
  }, [pomoIsRunning]);

  // Theo dõi khi Pomodoro hoàn thành | Watch for Pomodoro completion
  useEffect(() => {
    if (pomoSeconds === 0 && pomoIsRunning) {
      setPomoIsRunning(false);

      const today = new Date().toISOString().split('T')[0];
      const newCount = pomoCompletedCount + 1;
      setPomoCompletedCount(newCount);
      localStorage.setItem(`pomo_count_${today}`, newCount.toString());

      // Ghi nhận phiên tập trung vào database cục bộ | Save focus session to Vibe Island local database
      const isTauri = !!(window as any).__TAURI__;
      if (isTauri) {
        import('@tauri-apps/api/core').then(({ invoke }) => {
          const durationMins = Math.round(pomoTotalSeconds / 60);
          invoke('save_focus_session', { durationMinutes: durationMins }).catch((err) => {
            console.error('Failed to save focus session:', err);
          });
        });
      }

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("🍅 Pomodoro Completed!", {
          body: "Great job focusing! Time to take a short break.",
        });
      }
    }
  }, [pomoSeconds, pomoIsRunning, pomoCompletedCount, pomoTotalSeconds]);

  // Xác định các khe hiển thị khả dụng để cuộn đổi | Determine active slots that can be cycled
  const getActiveSlots = () => {
    const active = ['idle'];
    if (localPlaying || track.title !== 'Ready') active.push('music');
    if (pomoIsRunning || pomoSeconds < pomoTotalSeconds) active.push('pomo');
    if (tasksCount > 0) active.push('tasks');
    if (filesCount > 0) active.push('files');
    return active;
  };

  // Cuộn chuột giữa để đổi nhanh các khe hiển thị khi thu nhỏ | Wheel scroll to cycle slots when compact
  const handleWheel = (e: React.WheelEvent) => {
    if (isExpanded) return;
    const activeSlots = getActiveSlots();
    const curIdx = activeSlots.indexOf(currentSlot);
    if (curIdx === -1) {
      setCurrentSlot('idle');
      return;
    }
    let nextIdx = curIdx;
    if (e.deltaY > 0) {
      nextIdx = (curIdx + 1) % activeSlots.length;
    } else if (e.deltaY < 0) {
      nextIdx = (curIdx - 1 + activeSlots.length) % activeSlots.length;
    }
    setCurrentSlot(activeSlots[nextIdx]);
  };

  // Trình lắng nghe sự kiện kéo thả tệp | Drag and Drop event listeners
  useEffect(() => {
    const isTauri = !!(window as any).__TAURI__;

    if (isTauri) {
      // Kéo thả native trên Tauri v2 qua onDragDropEvent | Tauri v2 native drag-drop via onDragDropEvent
      let unlisten: (() => void) | null = null;

      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        const win = getCurrentWindow();
        win.onDragDropEvent(async (event) => {
          const payload = event.payload as any;

          if (payload.type === 'enter' || payload.type === 'over') {
            setIsDragOver(true);
          } else if (payload.type === 'leave' || payload.type === 'cancelled') {
            setIsDragOver(false);
          } else if (payload.type === 'drop') {
            setIsDragOver(false);
            const paths: string[] = payload.paths || [];
            if (paths.length === 0) return;

            const { invoke } = await import('@tauri-apps/api/core');
            const newFiles: StashedFile[] = [];
            for (const sourcePath of paths) {
              try {
                const res = await invoke<StashedFile>('stash_file', { sourcePath });
                newFiles.push(res);
              } catch (err) {
                console.error('Failed to stash file:', err);
              }
            }

            if (newFiles.length > 0) {
              setStashedFiles((prev) => [...prev, ...newFiles]);
              setActiveTab('tab-drop');
              setIsExpanded(true);
              setCurrentSlot('files');
            }
          }
        }).then((fn) => { unlisten = fn; });
      });

      return () => { unlisten?.(); };
    } else {
      // Kéo thả giả lập trên trình duyệt web | Browser fallback using web drag events
      const handleDragEnter = (e: DragEvent) => { e.preventDefault(); setIsDragOver(true); };
      const handleDragOver = (e: DragEvent) => { e.preventDefault(); };
      const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
          setIsDragOver(false);
        }
      };
      const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (!e.dataTransfer?.files?.length) return;

        const newFiles: StashedFile[] = [];
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          const f = e.dataTransfer.files[i];
          newFiles.push({ name: f.name, size: f.size, path: (f as any).path || '' });
        }

        if (newFiles.length > 0) {
          setStashedFiles((prev) => [...prev, ...newFiles]);
          setActiveTab('tab-drop');
          setIsExpanded(true);
          setCurrentSlot('files');
        }
      };

      window.addEventListener('dragenter', handleDragEnter);
      window.addEventListener('dragover', handleDragOver);
      window.addEventListener('dragleave', handleDragLeave);
      window.addEventListener('drop', handleDrop);

      return () => {
        window.removeEventListener('dragenter', handleDragEnter);
        window.removeEventListener('dragover', handleDragOver);
        window.removeEventListener('dragleave', handleDragLeave);
        window.removeEventListener('drop', handleDrop);
      };
    }
  }, []);

  // Thu nhỏ đảo khi cửa sổ mất tiêu điểm | Collapse island when window loses focus
  useEffect(() => {
    if (!(window as any).__TAURI__) return;
    let unlisten: () => void;
    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      // Lắng nghe sự kiện tiêu điểm cửa sổ thay đổi | Listen to window focus events
      const win = getCurrentWindow();
      win.onFocusChanged(({ payload: focused }: { payload: boolean }) => {
        if (!focused) {
          if (ignoreNextBlurRef.current) {
            ignoreNextBlurRef.current = false;
            return;
          }
          setIsExpanded(false);
        }
      }).then((fn: any) => {
        unlisten = fn;
      });
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // Reset lại contentHeight khi thu nhỏ | Reset contentHeight when compacting
  useEffect(() => {
    if (!isExpanded) {
      setContentHeight(34);
      setIsTransitioningToCompact(true);
    }
  }, [isExpanded]);

  const getDynamicMusicWidth = () => {
    if (!track.title || track.title === 'Ready') return 190;
    const textWidth = track.title.length * 8.6;
    return Math.max(190, Math.min(600, Math.ceil(textWidth + 96)));
  };


  // Đồng bộ mọi logic kích thước và tọa độ định vị của Tauri | Consolidate Tauri window sizing and positioning logic dynamically
  useEffect(() => {
    const isTauri = !!(window as any).__TAURI__;
    if (!isTauri) return;

    const updateWindowSizeAndPosition = async () => {
      try {
        const { LogicalSize, LogicalPosition } = await import('@tauri-apps/api/dpi');
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();

        let targetWidth = FIXED_WIDTH;
        let targetHeight = 100;

        if (isExpanded) {
          targetHeight = windowHeightOverride !== null ? windowHeightOverride : contentHeight + 24; // Sử dụng giá trị ghi đè chiều cao tạm thời trong lúc transition | Use override height during transition
        } else {
          targetHeight = 100;
        }

        // Bỏ qua các cuộc gọi Tauri IPC trùng lặp nếu kích thước không đổi | Skip redundant Tauri IPC resizing calls if target size hasn't changed
        if (lastSizeRef.current.width === targetWidth && lastSizeRef.current.height === targetHeight) {
          return;
        }
        lastSizeRef.current = { width: targetWidth, height: targetHeight };

        // Luôn cập nhật kích thước cửa sổ trước | Always set the size first
        await win.setSize(new LogicalSize(targetWidth, targetHeight));

        // Get the monitor to position on
        let monitor = null;
        if (settings.selectedMonitor) {
          const monitors = await (win as any).availableMonitors();
          monitor = monitors.find((m: any) => m.name === settings.selectedMonitor) || null;
        }
        if (!monitor) {
          monitor = await (win as any).currentMonitor();
        }
        if (!monitor) {
          monitor = await (win as any).primaryMonitor();
        }

        if (monitor) {
          const scaleFactor = monitor.scaleFactor;
          const logicalMonitorWidth = monitor.size.width / scaleFactor;
          const logicalMonitorX = monitor.position.x / scaleFactor;
          const logicalMonitorY = monitor.position.y / scaleFactor;

          const x = logicalMonitorX + (logicalMonitorWidth - targetWidth) / 2.0;
          const y = logicalMonitorY - 12.0;

          await win.setPosition(new LogicalPosition(x, y));
        }
      } catch (err) {
        console.error('Failed to update window size/position:', err);
      }
    };

    updateWindowSizeAndPosition();
  }, [isExpanded, contentHeight, isHovered, displaySlot, settings.expandedWidth, settings.selectedMonitor, track.title, windowHeightOverride]);

  // Đồng bộ chiều rộng active của island lên backend để tối ưu hóa click-through | Sync the active width of the island to backend to optimize transparent click-through accuracy
  useEffect(() => {
    const isTauri = !!(window as any).__TAURI__;
    if (isTauri) {
      const getActiveIslandWidth = () => {
        if (isExpanded) return settings.expandedWidth;
        if (isDragOver) return isHovered ? 170 : 150;

        switch (displaySlot) {
          case 'music':
            return isHovered ? getDynamicMusicWidth() : 175;
          case 'system-notification': {
            const hasImg = !!(systemNotif && systemNotif.imagePath);
            if (hasImg) {
              return isHovered ? 330 : 310;
            }
            return isHovered ? 260 : 240;
          }
          case 'bluetooth':
            return isHovered ? 220 : 200;
          case 'pomo':
          case 'tasks':
          case 'files':
          case 'battery':
            return isHovered ? 130 : 100;
          case 'idle':
          default:
            const unreadCount = notifHistory.filter((n) => !n.read).length;
            if (unreadCount > 0) {
              return isHovered ? 150 : 130;
            }
            return isHovered ? 130 : 110;
        }
      };

      const width = getActiveIslandWidth();
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('update_island_width', { width }).catch(() => {});
      });
    }
  }, [isExpanded, isHovered, displaySlot, isDragOver, settings.expandedWidth, track.title, notifHistory, systemNotif]);

  // Đồng bộ khe hiển thị khi nhạc bắt đầu phát hoặc dừng | Sync compact slot when music starts/stops
  useEffect(() => {
    const active = getActiveSlots();
    if (localPlaying && !active.includes(currentSlot)) {
      setCurrentSlot('music');
    }
  }, [localPlaying, track]);

  // Ẩn khe tệp và quay về màn hình chờ khi số lượng tệp trữ về 0 | Hide files slot and fallback to idle when stashed files count becomes 0
  useEffect(() => {
    if (filesCount === 0 && currentSlot === 'files') {
      setCurrentSlot('idle');
    }
  }, [filesCount, currentSlot]);

  // Đóng/Mở bảng điều khiển chi tiết | Toggle Dashboard
  const handleIslandClick = () => {
    if (!isExpanded) {
      incrementClicks();

      // Nếu nhấn vào thông báo hệ thống, kéo cửa sổ ứng dụng đó lên tiền cảnh | If clicking a system notification, bring that application window to foreground
      if (displaySlot === 'system-notification' && systemNotif) {
        if ((window as any).__TAURI__) {
          import('@tauri-apps/api/core').then(({ invoke }) => {
            invoke('focus_window_by_name', { name: systemNotif.appName }).catch((err) => {
              console.error('Failed to focus window:', err);
            });
          });
        }
      }

      // Dọn dẹp bộ đếm giờ thông báo đang chờ để giữ nguyên tab vừa mở | Clear any pending notification so we stay on the expanded tab
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
      setNotifSlot(null);

      setActiveTab(slotToTabMap[displaySlot] || 'tab-pomo');
      setIsExpanded(true);
    }
  };

  const handleTabClick = (tab: typeof activeTab, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveTab(tab);
  };

  const handleTransitionEnd = (e: React.TransitionEvent) => {
    if (e.propertyName === 'height' && !isExpanded) {
      setIsTransitioningToCompact(false);
    }
  };

  const getCompactWidthClass = () => {
    if (isExpanded) return 'rounded-b-[12px] border-b border-x border-white/[0.08]';

    const baseCompact = 'h-[42px] hover:h-[46px] rounded-b-[8px] p-[0_6px] justify-center border-b border-x border-white/[0.04]';

    if (isDragOver) return `w-[250px] h-[54px] rounded-b-[10px] p-[0_16px] justify-center border-b border-x border-white/[0.08]`;

    switch (displaySlot) {
      case 'music':
        return `w-[175px] h-[42px] hover:h-[46px] rounded-b-[8px] p-[0_6px] justify-center border-b border-x border-white/[0.04]`;
      case 'system-notification': {
        const hasImg = !!(systemNotif && systemNotif.imagePath);
        if (hasImg) {
          return `w-[310px] hover:w-[330px] h-[75px] hover:h-[79px] rounded-b-[10px] p-[0_10px] justify-center border-b border-x border-white/[0.06]`;
        }
        return `w-[240px] hover:w-[260px] h-[46px] hover:h-[50px] rounded-b-[8px] p-[0_12px] justify-center border-b border-x border-white/[0.04]`;
      }
      case 'bluetooth':
        return `w-[200px] hover:w-[220px] h-[46px] hover:h-[50px] rounded-b-[8px] p-[0_12px] justify-center border-b border-x border-white/[0.04]`;
      case 'pomo':
      case 'tasks':
      case 'files':
      case 'battery':
        return `w-[100px] hover:w-[130px] ${baseCompact}`;
      case 'idle':
      default:
        const unreadCount = notifHistory.filter((n) => !n.read).length;
        if (unreadCount > 0) {
          return `w-[130px] hover:w-[150px] ${baseCompact}`;
        }
        return `w-[110px] hover:w-[130px] ${baseCompact}`;
    }
  };



  return (
    <div className="w-full h-full flex justify-center items-start bg-transparent select-none island-container">

      {/* ── Fullscreen drag-over overlay ── */}
      {isDragOver && (
        <div className="fixed inset-0 pointer-events-none z-50 drag-overlay-root">
          {/* Corner brackets */}
          <span className="drag-corner drag-corner-tl" />
          <span className="drag-corner drag-corner-tr" />
          <span className="drag-corner drag-corner-bl" />
          <span className="drag-corner drag-corner-br" />
        </div>
      )}
      <div
        ref={islandRef}
        onClick={handleIslandClick}
        onWheel={handleWheel}
        onTransitionEnd={handleTransitionEnd}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`island-notch relative bg-[#09090b] text-white flex flex-col items-center justify-start transition-[width,height,border-radius,background-color] ease-[cubic-bezier(0.16,1,0.3,1)] outline-none cursor-pointer ${getCompactWidthClass()} ${isDragOver ? 'island-drag-active' : ''} ${notifSlot ? 'animate-island-alert' : ''}`}
        style={{
          paddingTop: '8px',
          height: isExpanded || isTransitioningToCompact ? `${contentHeight}px` : undefined,
          width: isExpanded
            ? `${settings.expandedWidth}px`
            : (!isExpanded && displaySlot === 'music' && isHovered)
              ? `${getDynamicMusicWidth()}px`
              : undefined,
          transitionDuration: `var(--anim-speed, 400ms)`,
          '--anim-speed': `${settings.animationSpeed}ms`,
          '--island-radius': isExpanded ? '12px' : isDragOver ? '10px' : '8px',
        } as React.CSSProperties}
      >
        <div
          className={`w-full flex-1 flex flex-col overflow-hidden ${isExpanded ? 'rounded-b-[12px] px-4 pt-[10px] pb-[16px]' : `rounded-b-[8px] ${isDragOver ? 'h-[46px]' : 'h-[34px] hover:h-[38px]'} p-[0_4px] justify-center`}`}
        >
          {/* COMPACT STATE VIEW */}
          {!isExpanded && (
            <div className="w-full flex items-center justify-center h-full animate-compact-reveal">
              <CompactIsland
                currentSlot={displaySlot}
                clicks={clicks}
                timeString={timeString}
                battery={battery}
                track={track}
                localPlaying={localPlaying}
                dominantColor={dominantColor}
                pomoTime={pomoTimeStr}
                tasksCount={tasksCount}
                filesCount={filesCount}
                isDragOver={isDragOver}
                isHovered={isHovered}
                isNotif={!!notifSlot}
                btDeviceName={btDeviceName}
                btStatus={btStatus}
                systemNotif={systemNotif}
                unreadNotifsCount={notifHistory.filter((n) => !n.read).length}
                onNotificationIconClick={() => {
                  setActiveTab('tab-notifications');
                  setIsExpanded(true);
                }}
              />
            </div>
          )}

          {/* EXPANDED CONTENT VIEWS */}
          {isExpanded && (
            <div
              ref={expandedRefCallback}
              className="flex-shrink-0 flex flex-col gap-3 animate-content-reveal w-full"
            >

              {/* Navigation Tabs Bar */}
              <div className="flex justify-center items-center gap-2 border-b border-white/[0.04] pb-2">
                <button
                  onClick={(e) => handleTabClick('tab-pomo', e)}
                  className={`relative p-2 rounded-md hover:bg-white/[0.06] transition-all duration-300 hover:scale-110 active:scale-95 flex flex-col items-center gap-0.5 ${activeTab === 'tab-pomo' ? 'bg-white/[0.06] text-warning-color' : 'text-text-secondary hover:text-white'}`}
                  title="Pomodoro"
                >
                  <Timer className="w-[18px] h-[18px]" />
                  <span className={`absolute bottom-0.5 w-1 h-1 rounded-full bg-current transition-all duration-300 ${activeTab === 'tab-pomo' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
                </button>

                <button
                  onClick={(e) => handleTabClick('tab-notes', e)}
                  className={`relative p-2 rounded-md hover:bg-white/[0.06] transition-all duration-300 hover:scale-110 active:scale-95 flex flex-col items-center gap-0.5 ${activeTab === 'tab-notes' ? 'bg-white/[0.06] text-success-color' : 'text-text-secondary hover:text-white'}`}
                  title="Notes"
                >
                  <ListTodo className="w-[18px] h-[18px]" />
                  <span className={`absolute bottom-0.5 w-1 h-1 rounded-full bg-current transition-all duration-300 ${activeTab === 'tab-notes' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
                </button>

                <button
                  onClick={(e) => handleTabClick('tab-music', e)}
                  className={`relative p-2 rounded-md hover:bg-white/[0.06] transition-all duration-300 hover:scale-110 active:scale-95 flex flex-col items-center gap-0.5 ${activeTab === 'tab-music' ? 'bg-white/[0.06] text-accent-color' : 'text-text-secondary hover:text-white'}`}
                  title="Music"
                >
                  <Music className="w-[18px] h-[18px]" />
                  <span className={`absolute bottom-0.5 w-1 h-1 rounded-full bg-current transition-all duration-300 ${activeTab === 'tab-music' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
                </button>

                <button
                  onClick={(e) => handleTabClick('tab-drop', e)}
                  className={`relative p-2 rounded-md hover:bg-white/[0.06] transition-all duration-300 hover:scale-110 active:scale-95 flex flex-col items-center gap-0.5 ${activeTab === 'tab-drop' ? 'bg-white/[0.06] text-accent-color' : 'text-text-secondary hover:text-white'}`}
                  title="Stash Drop"
                >
                  <Inbox className="w-[18px] h-[18px]" />
                  <span className={`absolute bottom-0.5 w-1 h-1 rounded-full bg-current transition-all duration-300 ${activeTab === 'tab-drop' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
                </button>

                <button
                  onClick={(e) => handleTabClick('tab-notifications', e)}
                  className={`relative p-2 rounded-md hover:bg-white/[0.06] transition-all duration-300 hover:scale-110 active:scale-95 flex flex-col items-center gap-0.5 ${activeTab === 'tab-notifications' ? 'bg-white/[0.06] text-warning-color' : 'text-text-secondary hover:text-white'}`}
                  title="Notifications"
                >
                  <Bell className="w-[18px] h-[18px]" />
                  {(() => {
                    const unreadCount = notifHistory.filter((n) => !n.read).length;
                    return unreadCount > 0 ? (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center border border-[#09090b]">
                        {unreadCount}
                      </span>
                    ) : null;
                  })()}
                  <span className={`absolute bottom-0.5 w-1 h-1 rounded-full bg-current transition-all duration-300 ${activeTab === 'tab-notifications' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
                </button>

                <div className="w-[1px] h-4 bg-white/[0.04] mx-1"></div>
                <button
                  onClick={(e) => handleTabClick('tab-settings', e)}
                  className={`relative p-2 rounded-md hover:bg-white/[0.06] transition-all duration-300 hover:scale-110 active:scale-95 flex flex-col items-center gap-0.5 ${activeTab === 'tab-settings' ? 'bg-white/[0.06] text-accent-color' : 'text-text-secondary hover:text-white'}`}
                  title="Settings"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                  <span className={`absolute bottom-0.5 w-1 h-1 rounded-full bg-current transition-all duration-300 ${activeTab === 'tab-settings' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
                </button>
              </div>

              {/* TAB CONTENTS */}
              <div className="w-full overflow-hidden">
                <Suspense fallback={
                  <div className="h-[120px] flex flex-col items-center justify-center gap-2 text-white/30 text-[10px] tracking-wider uppercase">
                    <span className="w-3.5 h-3.5 rounded-full border border-white/20 border-t-white/60 animate-spin" />
                    <span>Loading...</span>
                  </div>
                }>
                  {activeTab === 'tab-pomo' && (
                    <TabPomo
                      seconds={pomoSeconds}
                      setSeconds={setPomoSeconds}
                      totalSeconds={pomoTotalSeconds}
                      setTotalSeconds={setPomoTotalSeconds}
                      isRunning={pomoIsRunning}
                      setIsRunning={setPomoIsRunning}
                      completedCount={pomoCompletedCount}
                      setCompletedCount={setPomoCompletedCount}
                      language={settings.language}
                    />
                  )}

                  {activeTab === 'tab-notes' && <TabNotes onCountChange={setTasksCount} language={settings.language} />}
                  {activeTab === 'tab-music' && (
                    <TabMusic
                      track={track}
                      localPlaying={localPlaying}
                      timeline={timeline}
                      onTogglePlay={togglePlay}
                      onPrev={skipPrevious}
                      onNext={skipNext}
                      language={settings.language}
                    />
                  )}
                  {activeTab === 'tab-drop' && (
                    <TabDrop
                      stashedFiles={stashedFiles}
                      setStashedFiles={setStashedFiles}
                      onCountChange={setFilesCount}
                      isDragOver={isDragOver}
                      language={settings.language}
                    />
                  )}
                  {activeTab === 'tab-settings' && (
                    <TabSettings
                      settings={settings}
                      onSettingsChange={setSettings}
                    />
                  )}
                  {activeTab === 'tab-notifications' && (
                    <TabNotifications
                      history={notifHistory}
                      onDelete={(id) => setNotifHistory((prev) => prev.filter((n) => n.id !== id))}
                      onClearAll={() => setNotifHistory([])}
                      onMarkAsRead={handleMarkAsRead}
                      onMarkAllAsRead={handleMarkAllAsRead}
                      soundEnabled={soundEnabled}
                      onToggleSound={setSoundEnabled}
                      language={settings.language}
                      onNotificationClick={handleNotificationClick}
                    />
                  )}
                </Suspense>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
