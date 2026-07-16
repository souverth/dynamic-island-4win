import { useState, useEffect } from 'react';

export interface Track {
  title: string;
  artist: string;
  is_playing: boolean;
  cover_url: string | null;
  source_app: string;
  position_s?: number;
  duration_s?: number;
}

interface TimelineState {
  position_s: number;
  duration_s: number;
}

function getDominantColor(coverUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('#34c759');
          return;
        }
        ctx.drawImage(img, 0, 0, 1, 1);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        let r = data[0];
        let g = data[1];
        let b = data[2];

        // Boost color vibrancy if it's too dark or dull
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2.0 / 255.0; // lightness

        if (l < 0.3) {
          const factor = 0.5 / (l || 0.01);
          r = Math.min(255, Math.round(r * factor));
          g = Math.min(255, Math.round(g * factor));
          b = Math.min(255, Math.round(b * factor));
        } else if (l > 0.8) {
          r = Math.round(r * 0.8);
          g = Math.round(g * 0.8);
          b = Math.round(b * 0.8);
        }

        resolve(`rgb(${r}, ${g}, ${b})`);
      } catch (e) {
        resolve('#34c759');
      }
    };
    img.onerror = () => resolve('#34c759');
    img.src = coverUrl;
  });
}

export function useMedia() {
  const [track, setTrack] = useState<Track>({
    title: 'Ready',
    artist: 'Vibe Station',
    is_playing: false,
    cover_url: null,
    source_app: '',
    position_s: 0,
    duration_s: 0,
  });

  const [localPlaying, setLocalPlaying] = useState(false);
  const [dominantColor, setDominantColor] = useState('#34c759');
  const [timeline, setTimeline] = useState<TimelineState>({ position_s: 0, duration_s: 0 });

  useEffect(() => {
    if (!(window as any).__TAURI__) return;

    let unlistenTrack: () => void;
    let unlistenTimeline: () => void;

    // Dynamically import Tauri event to avoid compile error in browser mockup env
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<Track>('track-changed', (event) => {
        const payload = event.payload;
        setTrack(payload);
        setLocalPlaying(payload.is_playing);
      }).then((fn) => {
        unlistenTrack = fn;
      });

      listen<TimelineState>('media-timeline', (event) => {
        setTimeline(event.payload);
      }).then((fn) => {
        unlistenTimeline = fn;
      });
    });

    return () => {
      if (unlistenTrack) unlistenTrack();
      if (unlistenTimeline) unlistenTimeline();
    };
  }, []);

  // Update dominant color when track cover changes
  useEffect(() => {
    if (track.cover_url) {
      getDominantColor(track.cover_url).then(setDominantColor);
    } else {
      if (track.source_app.toLowerCase().includes('spotify')) {
        setDominantColor('#1ed760');
      } else {
        setDominantColor('#34c759');
      }
    }
  }, [track.cover_url, track.source_app]);

  const controlMedia = (action: 'play' | 'pause' | 'next' | 'prev') => {
    if (action === 'play') setLocalPlaying(true);
    if (action === 'pause') setLocalPlaying(false);
    
    if ((window as any).__TAURI__) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('control_media', { action }).catch(console.error);
      });
    }
  };

  const togglePlay = () => {
    controlMedia(localPlaying ? 'pause' : 'play');
  };

  const skipNext = () => {
    controlMedia('next');
  };

  const skipPrevious = () => {
    controlMedia('prev');
  };

  return { track, localPlaying, dominantColor, timeline, togglePlay, skipNext, skipPrevious };
}
