// src/modules/photos/components/tagColors.ts

interface TagColor {
    bg: string;
    text: string;
    border: string;
}

const TAG_PALETTE: TagColor[] = [
    { bg: 'rgba(59,130,246,0.10)',  text: '#1D4ED8', border: 'rgba(59,130,246,0.22)'  }, // blue
    { bg: 'rgba(16,185,129,0.10)',  text: '#047857', border: 'rgba(16,185,129,0.22)'  }, // emerald
    { bg: 'rgba(168,85,247,0.10)',  text: '#7C3AED', border: 'rgba(168,85,247,0.22)'  }, // violet
    { bg: 'rgba(245,158,11,0.10)',  text: '#B45309', border: 'rgba(245,158,11,0.22)'  }, // amber
    { bg: 'rgba(20,184,166,0.10)',  text: '#0F766E', border: 'rgba(20,184,166,0.22)'  }, // teal
    { bg: 'rgba(239,68,68,0.10)',   text: '#B91C1C', border: 'rgba(239,68,68,0.22)'   }, // red
    { bg: 'rgba(236,72,153,0.10)',  text: '#9D174D', border: 'rgba(236,72,153,0.22)'  }, // pink
    { bg: 'rgba(99,102,241,0.10)',  text: '#4338CA', border: 'rgba(99,102,241,0.22)'  }, // indigo
];

function hashStr(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    }
    return Math.abs(h);
}

export function getTagColor(tag: string): TagColor {
    return TAG_PALETTE[hashStr(tag) % TAG_PALETTE.length];
}
