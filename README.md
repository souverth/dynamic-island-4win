# Dynamic Island for Windows

[![Latest release](https://img.shields.io/github/v/release/souverth/dynamic-island-4win)](https://github.com/souverth/dynamic-island-4win/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/souverth/dynamic-island-4win/total)](https://github.com/souverth/dynamic-island-4win/releases)
[![License: GPLv3](https://img.shields.io/badge/license-GPLv3-blue)](LICENSE)

A minimal, fluid, and premium desktop widget inspired by iOS Dynamic Island, rebuilt natively for Windows 10 and 11 using **Tauri**, **React**, **TypeScript**, and **Rust**.

Designed with **strict flat gray/white aesthetics, micro-animations, and custom WinRT event loops**, Vibe Island seamlessly floats on top of your workspace, adapting to your system status.

---

## ✨ Features

- **Windows Notification Hub (TabNotifications)**: Intercepts native Windows toast notifications (Notepad, Chrome, Zalo, Messenger, etc.) with a dedicated glassmorphic dashboard. Features sound controls, clean card filters (Unread / All history), a compact status indicator badge, and **rich image preview rendering** (such as Snipping Tool screenshots) with dynamic island co-resizing.
- **Win32 Native Window Focus & Activation**: Integrates direct Rust-to-Win32 API bindings (`EnumWindows`, `AttachThreadInput`, `ShowWindow`, `SetForegroundWindow`) in the backend event loop to bypass Windows Focus Stealing Prevention security restrictions in 0ms, allowing users to click a notification card and bring the respective app straight to the foreground.
- **Media Center (TabMusic)**: Syncs with Windows Global System Media Transport Controls (GSMTC) to display album covers, track progress, real-time audio visualizer waves, media controls, and **interactive timeline seeking/scrubbing** with micro-animations.
- **⏱Pomodoro Tracker (TabPomo)**: A distraction-free Focus/Rest session tracker.
- **Task Stash (TabNotes)**: A quick task todo checklist pinned to the desktop widget.
- **Drop Stash (TabDrop)**: Drag and drop files from Windows Explorer onto the island to store them in a quick-access workspace folder.
- **Desktop Settings (TabSettings)**: Customize active display monitor positioning, Windows autostart (boot launch), animation speed (Fast, Smooth, Slow), and height/width scaling.
- **i18n & Multi-language Support**: Full translation localizations dynamically toggled between **English** and **Tiếng Việt**.

---

## Tech Stack & Architecture

- **Backend**: Rust (Tauri v2)
  - Native Windows OS interaction using the `windows` crate (WinRT APIs).
  - Background loop listeners for GSMTC Media, Bluetooth, and User Notification API (`UserNotificationListener`).
  - Transparent click-through overlay mapping based on mouse position (optimized with a **dual-timing 30ms click-recovery thread loop** and direct Win32 API window positioning).
- **Frontend**: React (Vite + TypeScript + Vanilla TailwindCSS)
- **State & Sync**: Custom React hooks (`useMedia`, `useBattery`, `useSettings`) listening to backend Tauri events.

---

## Getting Started

### Prerequisites
1. **Node.js** (v18+) & **npm** (or pnpm/yarn).
2. **Rust & Cargo** compiler toolchain. Refer to [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/) for Windows setup (Visual Studio C++ Build Tools).

### Installation & Run

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Run the application in development mode:
   ```bash
   npm run tauri dev
   ```

3. Build production distribution (.exe package):
   ```bash
   npm run build
   # then package with tauri
   npx tauri build
   ```

---

## Interaction & Shortcuts

- **Click-through (Firefox / Browser friendly)**: When collapsed in Compact Mode, clicking outside the center of the island will click *straight through* the window (allowing you to click browser tabs behind it). Hovering/moving the mouse near the center automatically makes it responsive.
- **Scroll Wheel**: Scroll up/down on the compact island to cycle through active tabs without expanding it.
- **Autostart**: Toggle inside settings to register the app into the Windows registry run folder.

---

## Bản dịch Tiếng Việt

Dynamic Island (Vibe Island) là một tiện ích màn hình nền (desktop widget) tối giản, chuyển động uyển chuyển lấy cảm hứng từ iOS, được thiết kế nguyên bản cho Windows 10 & 11 dựa trên sự kết hợp giữa **Tauri, React, TypeScript và Rust**.

### Tính năng chính
1. **Trình phát nhạc**: Đồng bộ hệ thống media Windows hiển thị sóng nhạc, tiến trình thực tế.
2. **Đánh chặn thông báo Windows**: Hiển thị tin nhắn dạng banner nổi iOS ngay trên Island.
3. **Quét cấu hình phần cứng**: Xem nhanh RAM, Dung lượng ổ cứng, Sức khỏe ổ SSD và Pin (Chu kỳ sạc, chai).
4. **Hòm lưu trữ kéo thả**: Kéo file trực tiếp thả vào Island để lưu nhanh.
5. **Cài đặt tiện lợi**: Chạy cùng Windows, đổi tốc độ hiệu ứng, tuỳ chỉnh màn hình hiển thị.
6. **Đồng bộ đa ngôn ngữ**: i18n Anh / Việt linh hoạt.

---

## License

GPLv3 - see [LICENSE](LICENSE).

