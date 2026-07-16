import React from 'react';
import { 
  Music, Globe, Send, Gamepad2, FileText, Code, 
  Scissors, Settings, Bell, MessageSquare, Terminal, AlertCircle 
} from 'lucide-react';

export const getAppIcon = (appName: string, size = 16) => {
  const name = appName.toLowerCase();

  // Color schemes for different categories
  if (name.includes('spotify') || name.includes('music')) {
    return <Music className="text-[#1ED760]" style={{ width: size, height: size }} />;
  }
  if (name.includes('chrome') || name.includes('edge') || name.includes('browser') || name.includes('firefox')) {
    return <Globe className="text-[#4285F4]" style={{ width: size, height: size }} />;
  }
  if (name.includes('telegram')) {
    return <Send className="text-[#0088cc] rotate-[-20deg]" style={{ width: size, height: size }} />;
  }
  if (name.includes('discord')) {
    return <Gamepad2 className="text-[#5865F2]" style={{ width: size, height: size }} />;
  }
  if (name.includes('notepad')) {
    return <FileText className="text-[#FFB900]" style={{ width: size, height: size }} />;
  }
  if (name.includes('antigravity') || name.includes('vscode') || name.includes('code')) {
    return <Terminal className="text-[#a855f7]" style={{ width: size, height: size }} />;
  }
  if (name.includes('snipping') || name.includes('screenshot') || name.includes('camera')) {
    return <Scissors className="text-[#ff4a4a]" style={{ width: size, height: size }} />;
  }
  if (name.includes('settings') || name.includes('system')) {
    return <Settings className="text-gray-400" style={{ width: size, height: size }} />;
  }
  if (name.includes('messenger') || name.includes('chat') || name.includes('whatsapp')) {
    return <MessageSquare className="text-[#00B2FF]" style={{ width: size, height: size }} />;
  }

  // Fallback: Generate a clean circular badge with the first letter of the App Name
  const firstLetter = appName.trim().charAt(0).toUpperCase() || '?';
  
  // Hash code generation for appName to pick a deterministic beautiful color
  let hash = 0;
  for (let i = 0; i < appName.length; i++) {
    hash = appName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'text-red-400', 'text-blue-400', 'text-emerald-400', 
    'text-amber-400', 'text-indigo-400', 'text-pink-400', 
    'text-cyan-400', 'text-purple-400', 'text-orange-400'
  ];
  const colorClass = colors[Math.abs(hash) % colors.length];

  return (
    <span className={`text-[10px] font-black tracking-tighter ${colorClass}`} style={{ fontSize: size * 0.65 }}>
      {firstLetter}
    </span>
  );
};
