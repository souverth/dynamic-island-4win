# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-07-17

### Added
- **Notification Manager Tab**: Designed a premium, glassmorphic notification hub featuring sound toggles, quick clear actions, and separate Unread/All filters.
- **Dynamic App Icons**: Added smart application icon mapping (Notepad, Chrome, Spotify, Discord, Telegram, Snipping Tool, etc.) with custom styles and dynamic fallback initials badges.
- **Unread Status Indicator**: Added a dynamic red number badge next to the clock in the compact idle view that automatically widens the island notch to preserve layout spacing, alongside a navigation tab number badge.
- **Win32 Native Focus & Activation**: Replaced heavy PowerShell spawns with ultra-fast, zero-overhead Rust-native Win32 API calls (`EnumWindows`, `AttachThreadInput`, `ShowWindow`, `SetForegroundWindow`) to bypass Windows Focus Stealing Prevention.

### Changed
- **Interactive Mark as Read**: Replaced automatic mark-all-as-read on tab open with interactive individual checkmark buttons, card-click auto-read, and a top-bar mark-all button.
- **Compact Notification Layout**: Compressed notification card paddings, font scales, and icon sizes to fit more items in the view.

## [0.1.0] - 2026-07-16

### Added
- **i18n Multi-language System**: Built a localization framework using dynamic translation configurations defined in `i18n.json` and a translator helper class. Supporting dynamic run-time toggles between English and Vietnamese.
- **Windows Toast Notification Interception**: Added native Windows toast listener integration (`UserNotificationListener` WinRT API) on the Rust backend to capture incoming system/app notifications and emit `system-notification` events.
- **Notification Banner Rendering**: Added custom front-end slot on Dynamic Island to temporarily display captured toast notifications with app names and content details.
- **Squircle Rounded App Icon Generator**: Created a PowerShell automation script `round_icon.ps1` utilizing GDI+ to convert and crop the raw icon into iOS-compliant 22% squircle radius curves.

### Changed
- **Minimalist Charging Animation**: Modified `index.css` and `CompactIsland.tsx` to completely remove blinking green pulse glow effects, sweeping animations, and drop shadows on the battery charging component, matching standard iOS/macOS static charging style.
- **Integrated i18n Dictionary**: Migrated static labels inside settings and hardware scanner tabs into a structured external `i18n.json` configuration file.
- **Window Positioning Settings**: Enhanced `position_window` and monitor repositioning commands to align window dimensions properly with the top bezel space.

### Fixed
- **Cargo Panic & Resource Resolution**: Fixed a proc-macro panic in `tauri::generate_context!()` caused by missing compiler-defined icon sizes (32x32.png) by regenerating bundle structures.
- **WinRT Feature Exclusions**: Resolved Rust import issues by explicitly enabling `"UI_Notifications"`, `"UI_Notifications_Management"`, and `"ApplicationModel"` feature gates in `Cargo.toml`.
