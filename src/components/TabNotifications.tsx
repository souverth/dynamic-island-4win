import React, { useState } from 'react';
import { Bell, Trash2, Volume2, VolumeX, ExternalLink, Check, Inbox } from 'lucide-react';
import { getTranslation, Language } from '../utils/i18n';
import { getAppIcon } from '../utils/appIcons';

export interface StoredNotification {
  id: string;
  appName: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

interface TabNotificationsProps {
  history: StoredNotification[];
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  language: Language;
}

export const TabNotifications: React.FC<TabNotificationsProps> = ({
  history,
  onDelete,
  onClearAll,
  onMarkAsRead,
  onMarkAllAsRead,
  soundEnabled,
  onToggleSound,
  language,
}) => {
  const t = getTranslation(language);
  
  // Quản lý tab hiển thị giữa thông báo mới (unread) và lịch sử (all) | Manage tab filter between unread and all notifications
  const [filter, setFilter] = useState<'unread' | 'all'>('unread');

  // Phân loại danh sách dựa trên bộ lọc đang chọn | Filter the notifications list based on active filter
  const unreadList = history.filter((n) => !n.read);
  const displayedList = filter === 'unread' ? unreadList : history;

  // Click thẻ: Đánh dấu đã đọc và kích hoạt Rust focus app tương ứng | Click card: Mark as read and invoke Rust to focus the target app
  const handleCardClick = async (e: React.MouseEvent, notif: StoredNotification) => {
    onMarkAsRead(notif.id);
    
    if ((window as any).__TAURI__) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('focus_window_by_name', { name: notif.appName });
      } catch (err) {
        console.error('Failed to focus window:', err);
      }
    }
  };

  // Định dạng mốc thời gian hiển thị tương đối | Format relative timestamp
  const formatRelativeTime = (timeMs: number): string => {
    const diffS = Math.floor((Date.now() - timeMs) / 1000);
    if (diffS < 60) return language === 'vi' ? 'Vừa xong' : 'Just now';
    const diffM = Math.floor(diffS / 60);
    if (diffM < 60) return `${diffM}m ${language === 'vi' ? 'trước' : 'ago'}`;
    const diffH = Math.floor(diffM / 60);
    if (diffH < 24) return `${diffH}h ${language === 'vi' ? 'trước' : 'ago'}`;
    
    const date = new Date(timeMs);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col gap-3 w-full max-h-[300px] select-none animate-content-reveal">
      {/* Thanh điều hướng tab bộ lọc & các nút chức năng nhanh | Filter tabs navigation & action buttons */}
      <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
        <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/[0.05] p-0.5 rounded-lg">
          {/* Nút lọc thông báo chưa đọc | Unread filter button */}
          <button
            onClick={() => setFilter('unread')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1
              ${filter === 'unread'
                ? 'bg-white/[0.06] text-white shadow-sm'
                : 'text-white/40 hover:text-white/70'
              }`}
          >
            {language === 'vi' ? 'Chưa đọc' : 'Unread'}
            {unreadList.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-success-color animate-pulse" />
            )}
          </button>

          {/* Nút lọc xem toàn bộ lịch sử | All history filter button */}
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all
              ${filter === 'all'
                ? 'bg-white/[0.06] text-white shadow-sm'
                : 'text-white/40 hover:text-white/70'
              }`}
          >
            {language === 'vi' ? 'Tất cả' : 'All'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Đánh dấu đã đọc toàn bộ (chỉ hiện khi có tin chưa đọc) | Mark all as read (Only visible when unreads exist) */}
          {unreadList.length > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="p-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] text-white/50 hover:text-white/80 transition-all"
              title={language === 'vi' ? 'Đọc tất cả' : 'Mark all as read'}
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Bật/Tắt âm thanh chuông báo hiệu hệ thống | Toggle system notification chime sound */}
          <button
            onClick={() => onToggleSound(!soundEnabled)}
            className={`p-1.5 rounded-lg border transition-all duration-200 flex items-center justify-center
              ${soundEnabled
                ? 'bg-success-color/5 border-success-color/20 text-success-color hover:bg-success-color/10'
                : 'bg-white/[0.02] border-white/[0.05] text-white/30 hover:text-white/50 hover:bg-white/[0.04]'
              }`}
            title={t.notifSoundToggle}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Dọn sạch hoàn toàn lịch sử thông báo | Clear all notification history */}
          {history.length > 0 && (
            <button
              onClick={onClearAll}
              className="p-1.5 rounded-lg bg-red-500/5 hover:bg-red-500/15 text-red-400 hover:text-red-300 transition-all border border-red-500/10 hover:border-red-500/20"
              title={t.notifClearAll}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Danh sách cuộn hiển thị các thẻ thông báo | Scrollable list displaying notification cards */}
      <div className="flex flex-col gap-1.5 overflow-y-auto custom-scrollbar flex-grow pr-1" style={{ maxHeight: 240 }}>
        {displayedList.length === 0 ? (
          <div className="text-center text-[11px] text-white/20 py-8 flex flex-col items-center gap-2">
            <Inbox className="w-7 h-7 opacity-20" />
            <span>
              {filter === 'unread'
                ? (language === 'vi' ? 'Không có thông báo mới' : 'No new notifications')
                : t.notifNoHistory}
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-1 pb-1">
            {displayedList.map((notif) => (
              <div
                key={notif.id}
                onClick={(e) => handleCardClick(e, notif)}
                className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all duration-200 cursor-pointer border
                  ${!notif.read
                    ? 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05] hover:border-white/[0.12]'
                    : 'bg-white/[0.005] border-white/[0.02] hover:bg-white/[0.02] hover:border-white/[0.04]'
                  }`}
                title={language === 'vi' ? `Nhấp để mở ${notif.appName}` : `Click to open ${notif.appName}`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-grow pr-10">
                  {/* Khung logo ứng dụng: Tự động đổi độ sáng nền dựa theo trạng thái đọc | App Logo wrapper: Background changes opacity based on read state */}
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200
                    ${!notif.read ? 'bg-white/[0.05]' : 'bg-white/[0.02]'}`}>
                    {getAppIcon(notif.appName, 13)}
                  </div>
                  
                  <div className="flex flex-col min-w-0 flex-grow leading-tight">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-semibold truncate max-w-[150px]
                        ${!notif.read ? 'text-white/80' : 'text-white/35'}`}>
                        {notif.appName}
                      </span>
                      <span className="text-[8px] text-white/20 font-mono">
                        {formatRelativeTime(notif.timestamp)}
                      </span>
                      {/* Chấm tròn xanh lá báo hiệu tin nhắn mới chưa đọc | Small green dot indicating unread status */}
                      {!notif.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-success-color" />
                      )}
                    </div>
                    <span className={`text-[10px] font-medium truncate mt-0.5 transition-colors
                      ${!notif.read ? 'text-white' : 'text-white/60'}`} title={notif.title}>
                      {notif.title}
                    </span>
                    <span className={`text-[8.5px] truncate transition-colors
                      ${!notif.read ? 'text-white/55' : 'text-white/35'}`} title={notif.message}>
                      {notif.message}
                    </span>
                  </div>
                </div>

                {/* Thao tác nhanh xuất hiện khi hover vào thẻ | Hover quick actions */}
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {/* Nút tích đã đọc thủ công (chỉ hiện trên thẻ chưa xem) | Manual checkmark read trigger (Unread only) */}
                  {!notif.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkAsRead(notif.id);
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-success-color/20 text-white/50 hover:text-success-color transition-all border border-transparent hover:border-success-color/30"
                      title={language === 'vi' ? 'Đánh dấu đã đọc' : 'Mark as read'}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
