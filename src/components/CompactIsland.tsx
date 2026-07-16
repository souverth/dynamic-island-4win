import React from 'react';
import { Clock, Music, Timer, ListTodo, Inbox, Download, Bell } from 'lucide-react';
import { BatteryState } from '../hooks/useBattery';
import { Track } from '../hooks/useMedia';
import { getAppIcon } from '../utils/appIcons';

interface CompactIslandProps {
  currentSlot: string;
  clicks: number;
  timeString: string;
  battery: BatteryState;
  track: Track;
  localPlaying: boolean;
  dominantColor: string;
  pomoTime: string;
  tasksCount: number;
  filesCount: number;
  isDragOver: boolean;
  isHovered: boolean;
  isNotif?: boolean;
  btDeviceName?: string;
  btStatus?: 'connected' | 'disconnected';
  systemNotif?: { appName: string; title: string; message: string } | null;
  unreadNotifsCount?: number;
}

export const CompactIsland: React.FC<CompactIslandProps> = ({
  currentSlot,
  clicks: _clicks,
  timeString,
  battery,
  track,
  localPlaying,
  dominantColor,
  pomoTime,
  tasksCount,
  filesCount,
  isDragOver,
  isHovered,
  isNotif = false,
  btDeviceName = '',
  btStatus = 'connected',
  systemNotif = null,
  unreadNotifsCount = 0,
}) => {
  // Bao bọc bằng hiệu ứng trượt khi hiển thị thông báo tạm thời | Wrap content in slide transition for transient notifications
  const wrap = (content: React.ReactNode) =>
    isNotif
      ? <div key={currentSlot} className="notif-slot-enter">{content}</div>
      : <>{content}</>;

  if (isDragOver) {
    return (
      <div className="flex items-center gap-1.5">
        <Download className="w-3.5 h-3.5 text-cyan-400 drag-icon-bounce flex-shrink-0" />
        <div className="flex flex-col leading-none gap-0.5">
          <span className="text-[10px] font-bold text-white/95">Drop files here</span>
          <span className="text-[8px] text-white/40">to stash in Island</span>
        </div>
      </div>
    );
  }

  switch (currentSlot) {
    case 'music':
      return wrap(
        <div className="flex items-center justify-between w-full px-0.5 max-w-full">
          {/* Phía bên trái: Đĩa nhạc xoay tròn chứa ảnh bìa album | Left side: Circular rotating album art icon */}
          <div className="relative w-5 h-5 rounded-full overflow-hidden bg-white/[0.03] border border-white/[0.05] flex-shrink-0 flex items-center justify-center">
            {track.cover_url ? (
              <img
                src={track.cover_url}
                className="w-full h-full object-cover"
                alt="mini-cover"
              />
            ) : (
              <Music className="w-2.5 h-2.5 flex-shrink-0" style={{ color: dominantColor || '#22d3ee' }} />
            )}
          </div>

          {/* Phía giữa: Tên bài hát & Nghệ sĩ (chỉ hiển thị khi hover) | Middle: Song Title & Artist (only visible when hovered) */}
          {isHovered && track.title && track.title !== 'Ready' && (
            <div className="flex flex-col leading-none min-w-0 mx-2 select-none flex-grow text-left animate-content-reveal">
              <span className="text-[10px] font-semibold text-white truncate max-w-[120px]" title={track.title}>
                {track.title}
              </span>
              <span className="text-[8px] text-white/40 truncate max-w-[120px] mt-0.5" title={track.artist}>
                {track.artist}
              </span>
            </div>
          )}

          {/* Phía bên phải: Cột sóng nhạc nhảy đối xứng lên/xuống | Right side: Equalizer bars moving up/down symmetrically */}
          <div className={`flex items-center gap-[2px] h-[14px] flex-shrink-0 ${localPlaying ? 'visualizer-playing' : ''}`}>
            <span className="w-[2.5px] rounded-full bar bar-1 h-[4px]" style={{ backgroundColor: dominantColor || '#22d3ee' }}></span>
            <span className="w-[2.5px] rounded-full bar bar-2 h-[9px]" style={{ backgroundColor: dominantColor || '#22d3ee' }}></span>
            <span className="w-[2.5px] rounded-full bar bar-3 h-[6px]" style={{ backgroundColor: dominantColor || '#22d3ee' }}></span>
            <span className="w-[2.5px] rounded-full bar bar-4 h-[11px]" style={{ backgroundColor: dominantColor || '#22d3ee' }}></span>
            <span className="w-[2.5px] rounded-full bar bar-5 h-[3px]" style={{ backgroundColor: dominantColor || '#22d3ee' }}></span>
          </div>
        </div>
      );

    case 'pomo':
      return (
        <div className="flex items-center gap-2 text-warning-color">
          <Timer className="w-4 h-4" />
          <span className="text-[12px] font-mono font-bold whitespace-nowrap">{pomoTime}</span>
        </div>
      );

    case 'tasks':
      return (
        <div className="flex items-center gap-2 text-accent-color">
          <ListTodo className="w-4 h-4" />
          <span className="text-[12px] font-medium text-white whitespace-nowrap">
            {tasksCount} task{tasksCount !== 1 ? 's' : ''}
          </span>
        </div>
      );

    case 'files':
      return (
        <div className="flex items-center gap-2 text-cyan-400">
          <Inbox className="w-4 h-4" />
          <span className="text-[12px] font-medium text-white whitespace-nowrap">
            {filesCount} file{filesCount !== 1 ? 's' : ''}
          </span>
        </div>
      );

    case 'battery':
      return wrap(
        <div className={`flex items-center gap-2 ${battery.charging ? 'text-green-400' : battery.level < 20 ? 'text-red-400' : 'text-white/60'}`}>
          <div className="relative flex-shrink-0">
            <svg width="22" height="13" viewBox="0 0 22 13" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0.5" y="0.5" width="18" height="12" rx="2.5"
                stroke={battery.charging ? '#4ade80' : battery.level < 20 ? '#f87171' : 'rgba(255,255,255,0.4)'}
                strokeWidth="1"
                fill="none"
              />
              <rect x="19" y="4" width="2.5" height="5" rx="1"
                fill={battery.charging ? '#4ade80' : battery.level < 20 ? '#f87171' : 'rgba(255,255,255,0.3)'}
              />
              <rect
                x="2" y="2"
                width={Math.round((battery.level / 100) * 15)}
                height="9" rx="1.5"
                fill={battery.charging ? '#4ade80' : battery.level < 20 ? '#f87171' : battery.level < 50 ? '#facc15' : '#4ade80'}
                opacity={battery.charging ? '0.35' : '0.9'}
              />
            </svg>

            {battery.charging && (
              <div className="absolute inset-0 flex items-center justify-center battery-bolt-pop" style={{ marginRight: '3px' }}>
                <svg width="8" height="11" viewBox="0 0 8 11" fill="none">
                  <path d="M4.5 0L0 6.5H3.5L3 11L8 4H4.5L4.5 0Z"
                    fill="white"
                  />
                </svg>
              </div>
            )}
          </div>

          <span className="text-[11px] font-bold tabular-nums">
            {battery.level}%
          </span>
        </div>
      );

    case 'bluetooth':
      return wrap(
        <div className="flex items-center gap-2 px-1">
          <div className={`p-1 rounded-full flex items-center justify-center ${
            btStatus === 'connected' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m7 7 10 10-5 5V2l5 5L7 17" />
            </svg>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[11px] font-bold text-white/95 truncate max-w-[200px]">
              {btStatus === 'connected' ? 'Bluetooth Connected' : 'Bluetooth Disconnected'}
            </span>
            <span className="text-[9.5px] text-white/50 truncate max-w-[200px] mt-0.5">
              {btDeviceName}
            </span>
          </div>
        </div>
      );

    case 'system-notification':
      return wrap(
        <div className="flex items-center gap-2 px-1.5 min-w-0 max-w-full">
          <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            {systemNotif ? getAppIcon(systemNotif.appName, 12) : <Bell className="w-3 h-3 text-white/75" />}
          </div>
          {systemNotif ? (
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[10px] font-semibold text-white truncate max-w-[170px]" title={systemNotif.title}>
                {systemNotif.title}
              </span>
              <span className="text-[8.5px] text-white/45 truncate max-w-[170px] mt-0.5" title={systemNotif.message}>
                {systemNotif.appName}: {systemNotif.message}
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-white/45">Notification</span>
          )}
        </div>
      );

    case 'idle':
    default:
      return (
        <div className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
          {battery.charging ? (
            <div className="relative flex-shrink-0 battery-charge-inline-enter">
              <svg width="20" height="12" viewBox="0 0 22 13" fill="none">
                <rect x="0.5" y="0.5" width="18" height="12" rx="2.5"
                  stroke="#4ade80" strokeWidth="1" fill="none" />
                <rect x="19" y="4" width="2.5" height="5" rx="1" fill="#4ade80" />
                <rect x="2" y="2"
                  width={Math.round((battery.level / 100) * 15)}
                  height="9" rx="1.5"
                  fill="#4ade80" opacity="0.35" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center" style={{ marginRight: '3px' }}>
                <svg width="6" height="9" viewBox="0 0 8 11" fill="none">
                  <path d="M4.5 0L0 6.5H3.5L3 11L8 4H4.5L4.5 0Z"
                    fill="white" />
                </svg>
              </div>
            </div>
          ) : (
            <Clock className="w-3.5 h-3.5 opacity-60" />
          )}
          <span className="text-[12px] font-medium whitespace-nowrap">{timeString}</span>
          {unreadNotifsCount > 0 && (
            <div className="relative flex items-center justify-center ml-1.5 mr-1 flex-shrink-0">
              {/* Icon chuông và chấm đỏ đè góc thông báo chưa xem | Bell icon with absolute-positioned unread badge overlay */}
              <Bell className="w-3.5 h-3.5 text-white/50" />
              <span className="absolute -top-1 -right-1.5 min-w-[11px] h-[11px] px-0.5 rounded-full bg-[#ff3b30] text-white text-[7px] font-black flex items-center justify-center border border-[#09090b] leading-none">
                {unreadNotifsCount}
              </span>
            </div>
          )}
        </div>
      );
  }
};
