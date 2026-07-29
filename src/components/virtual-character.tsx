'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  Settings,
  Star,
  Heart,
  Zap,
  Moon,
  Send,
  MessageCircle,
  Loader2,
  Check,
  Lock,
  Plus,
  BookOpen,
  Lightbulb,
  Trophy,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { t } from '@/lib/i18n';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import { toast } from 'sonner';

interface VirtualCharacterData {
  id: string;
  userId: string;
  characterId: string;
  name: string;
  color: string;
  level: number;
  xp: number;
  mood: string;
  accessories: string | null;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const CHARACTER_TYPES = [
  { id: 'owl', nameKey: 'character.owl' },
  { id: 'dragon', nameKey: 'character.dragon' },
  { id: 'robot', nameKey: 'character.robot' },
  { id: 'cat', nameKey: 'character.cat' },
  { id: 'wizard', nameKey: 'character.wizard' },
];

const XP_PER_LEVEL = 100;

// Accessories that unlock at certain levels
const ACCESSORIES = [
  { id: 'hat', nameKey: 'character.hat', unlockLevel: 2, icon: 'hat' },
  { id: 'glasses', nameKey: 'character.glasses', unlockLevel: 3, icon: 'glasses' },
  { id: 'scarf', nameKey: 'character.scarf', unlockLevel: 5, icon: 'scarf' },
  { id: 'cape', nameKey: 'character.cape', unlockLevel: 7, icon: 'cape' },
  { id: 'wand', nameKey: 'character.wand', unlockLevel: 10, icon: 'wand' },
];

// ─── SVG Character Renderers ──────────────────────────────────────────

function OwlCharacter({ color, mood, accessories }: { color: string; mood: string; accessories: string[] }) {
  const isBlinking = mood === 'thinking';
  const isSleepy = mood === 'sleepy';
  const isExcited = mood === 'excited' || mood === 'celebrating';
  const isTalking = mood === 'talking';

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* Body */}
      <ellipse cx="50" cy="65" rx="28" ry="25" fill={color} opacity="0.9" />
      <ellipse cx="50" cy="65" rx="22" ry="20" fill={`${color}33`} />

      {/* Head */}
      <circle cx="50" cy="38" r="20" fill={color} opacity="0.95" />

      {/* Ear tufts */}
      <polygon points="35,25 30,10 40,22" fill={color} />
      <polygon points="65,25 70,10 60,22" fill={color} />

      {/* Hat accessory */}
      {accessories.includes('hat') && (
        <g>
          <rect x="30" y="14" width="40" height="4" rx="2" fill="#4b5563" />
          <rect x="38" y="2" width="24" height="14" rx="3" fill="#6b7280" />
          <rect x="40" y="4" width="20" height="10" rx="2" fill="#9ca3af" />
        </g>
      )}

      {/* Glasses accessory */}
      {accessories.includes('glasses') && (
        <g>
          <circle cx="42" cy="36" r="10" fill="none" stroke="#4b5563" strokeWidth="2" />
          <circle cx="58" cy="36" r="10" fill="none" stroke="#4b5563" strokeWidth="2" />
          <line x1="48" y1="36" x2="52" y2="36" stroke="#4b5563" strokeWidth="2" />
        </g>
      )}

      {/* Eyes */}
      <circle cx="42" cy="36" r="8" fill="white" />
      <circle cx="58" cy="36" r="8" fill="white" />
      {!isBlinking && !isSleepy ? (
        <>
          <circle cx="43" cy="36" r="4" fill="#1a1a2e" />
          <circle cx="59" cy="36" r="4" fill="#1a1a2e" />
          <circle cx="44" cy="34" r="1.5" fill="white" />
          <circle cx="60" cy="34" r="1.5" fill="white" />
        </>
      ) : isSleepy ? (
        <>
          <line x1="38" y1="36" x2="46" y2="36" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" />
          <line x1="54" y1="36" x2="62" y2="36" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="42" cy="36" rx="6" ry="2" fill="#1a1a2e" />
          <ellipse cx="58" cy="36" rx="6" ry="2" fill="#1a1a2e" />
        </>
      )}

      {/* Beak */}
      {isTalking ? (
        <motion.ellipse cx="50" cy="44" rx="3" ry="3" fill="#f59e0b"
          animate={{ ry: [3, 5, 3] }}
          transition={{ repeat: Infinity, duration: 0.3 }}
        />
      ) : (
        <polygon points="47,42 50,47 53,42" fill="#f59e0b" />
      )}

      {/* Wings */}
      <motion.ellipse
        cx="25" cy="62" rx="10" ry="15" fill={color} opacity="0.8"
        animate={isExcited ? { rotate: [0, -10, 0], y: [0, -3, 0] } : {}}
        style={{ transformOrigin: '35px 62px' }}
      />
      <motion.ellipse
        cx="75" cy="62" rx="10" ry="15" fill={color} opacity="0.8"
        animate={isExcited ? { rotate: [0, 10, 0], y: [0, -3, 0] } : {}}
        style={{ transformOrigin: '65px 62px' }}
      />

      {/* Scarf accessory */}
      {accessories.includes('scarf') && (
        <path d="M 30 52 Q 50 58 70 52 Q 70 56 50 60 Q 30 56 30 52" fill="#ef4444" opacity="0.8" />
      )}

      {/* Cape accessory */}
      {accessories.includes('cape') && (
        <path d="M 25 55 Q 15 70 10 90 L 90 90 Q 85 70 75 55 Q 50 65 25 55" fill={`${color}88`} opacity="0.6" />
      )}

      {/* Feet */}
      <ellipse cx="40" cy="88" rx="8" ry="3" fill="#f59e0b" />
      <ellipse cx="60" cy="88" rx="8" ry="3" fill="#f59e0b" />

      {/* Wand accessory */}
      {accessories.includes('wand') && (
        <g>
          <line x1="80" y1="55" x2="92" y2="40" stroke="#92400e" strokeWidth="2" strokeLinecap="round" />
          <motion.circle cx="93" cy="39" r="3" fill="#fbbf24"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
        </g>
      )}

      {/* Celebration sparkles */}
      {mood === 'celebrating' && (
        <>
          <motion.circle cx="15" cy="20" r="2" fill="#fbbf24" animate={{ opacity: [1, 0, 1], scale: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
          <motion.circle cx="85" cy="15" r="2" fill="#fbbf24" animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.2 }} />
          <motion.circle cx="80" cy="45" r="1.5" fill="#fbbf24" animate={{ opacity: [1, 0, 1], scale: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} />
        </>
      )}

      {/* Sleeping Zzz */}
      {mood === 'sleepy' && (
        <>
          <motion.text x="70" y="25" fontSize="8" fill="#9ca3af" animate={{ opacity: [0, 1, 0], y: [25, 20, 15] }} transition={{ repeat: Infinity, duration: 2 }}>z</motion.text>
          <motion.text x="78" y="20" fontSize="6" fill="#9ca3af" animate={{ opacity: [0, 1, 0], y: [20, 15, 10] }} transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}>z</motion.text>
        </>
      )}
    </svg>
  );
}

function DragonCharacter({ color, mood, accessories }: { color: string; mood: string; accessories: string[] }) {
  const isExcited = mood === 'excited' || mood === 'celebrating';
  const isSleepy = mood === 'sleepy';
  const isTalking = mood === 'talking';

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* Body */}
      <ellipse cx="50" cy="62" rx="25" ry="22" fill={color} opacity="0.9" />
      <ellipse cx="50" cy="62" rx="18" ry="16" fill={`${color}33`} />

      {/* Head */}
      <circle cx="50" cy="35" r="18" fill={color} opacity="0.95" />

      {/* Horns */}
      <polygon points="38,22 32,5 42,18" fill="#92400e" />
      <polygon points="62,22 68,5 58,18" fill="#92400e" />

      {/* Hat accessory */}
      {accessories.includes('hat') && (
        <g>
          <rect x="32" y="12" width="36" height="4" rx="2" fill="#4b5563" />
          <polygon points="50,0 40,12 60,12" fill="#6b7280" />
        </g>
      )}

      {/* Eyes */}
      <circle cx="42" cy="33" r="6" fill="white" />
      <circle cx="58" cy="33" r="6" fill="white" />
      {isSleepy ? (
        <>
          <line x1="38" y1="33" x2="46" y2="33" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" />
          <line x1="54" y1="33" x2="62" y2="33" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="43" cy="33" r="3.5" fill="#1a1a2e" />
          <circle cx="59" cy="33" r="3.5" fill="#1a1a2e" />
          <circle cx="44" cy="31" r="1.2" fill="white" />
          <circle cx="60" cy="31" r="1.2" fill="white" />
        </>
      )}

      {/* Nostrils */}
      <circle cx="46" cy="40" r="1.5" fill={`${color}99`} />
      <circle cx="54" cy="40" r="1.5" fill={`${color}99`} />

      {/* Mouth */}
      {isTalking ? (
        <motion.ellipse cx="50" cy="46" rx="4" ry="3" fill="#1a1a2e"
          animate={{ ry: [3, 5, 3] }}
          transition={{ repeat: Infinity, duration: 0.3 }}
        />
      ) : mood === 'happy' || isExcited ? (
        <path d="M 44 44 Q 50 50 56 44" fill="none" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round" />
      ) : (
        <line x1="44" y1="44" x2="56" y2="44" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round" />
      )}

      {/* Wings */}
      <motion.path d="M 25 50 Q 10 35 5 50 Q 15 45 20 55" fill={`${color}88`}
        animate={isExcited ? { y: [0, -4, 0] } : {}}
        transition={{ repeat: Infinity, duration: 0.5 }}
      />
      <motion.path d="M 75 50 Q 90 35 95 50 Q 85 45 80 55" fill={`${color}88`}
        animate={isExcited ? { y: [0, -4, 0] } : {}}
        transition={{ repeat: Infinity, duration: 0.5 }}
      />

      {/* Scarf accessory */}
      {accessories.includes('scarf') && (
        <path d="M 32 48 Q 50 54 68 48 Q 68 52 50 56 Q 32 52 32 48" fill="#ef4444" opacity="0.8" />
      )}

      {/* Cape accessory */}
      {accessories.includes('cape') && (
        <path d="M 28 55 Q 18 70 12 90 L 88 90 Q 82 70 72 55 Q 50 65 28 55" fill={`${color}88`} opacity="0.6" />
      )}

      {/* Tail */}
      <motion.path d="M 50 82 Q 60 88 70 85 Q 80 82 75 78" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        animate={isExcited ? { d: ['M 50 82 Q 60 88 70 85 Q 80 82 75 78', 'M 50 82 Q 60 92 70 89 Q 80 86 75 82', 'M 50 82 Q 60 88 70 85 Q 80 82 75 78'] } : {}}
        transition={{ repeat: Infinity, duration: 0.8 }}
      />

      {/* Belly */}
      <ellipse cx="50" cy="65" rx="14" ry="14" fill={`${color}44`} />

      {/* Feet */}
      <ellipse cx="38" cy="82" rx="7" ry="3" fill={color} />
      <ellipse cx="62" cy="82" rx="7" ry="3" fill={color} />

      {/* Wand accessory */}
      {accessories.includes('wand') && (
        <g>
          <line x1="78" y1="55" x2="90" y2="40" stroke="#92400e" strokeWidth="2" strokeLinecap="round" />
          <motion.circle cx="91" cy="39" r="3" fill="#fbbf24"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
        </g>
      )}

      {/* Fire breath when celebrating */}
      {mood === 'celebrating' && (
        <motion.g animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 0.6 }}>
          <circle cx="50" cy="48" r="3" fill="#f59e0b" />
          <circle cx="50" cy="52" r="2" fill="#ef4444" />
        </motion.g>
      )}

      {/* Sleeping Zzz */}
      {mood === 'sleepy' && (
        <>
          <motion.text x="72" y="22" fontSize="8" fill="#9ca3af" animate={{ opacity: [0, 1, 0], y: [22, 17, 12] }} transition={{ repeat: Infinity, duration: 2 }}>z</motion.text>
          <motion.text x="80" y="17" fontSize="6" fill="#9ca3af" animate={{ opacity: [0, 1, 0], y: [17, 12, 7] }} transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}>z</motion.text>
        </>
      )}
    </svg>
  );
}

function RobotCharacter({ color, mood, accessories }: { color: string; mood: string; accessories: string[] }) {
  const isThinking = mood === 'thinking';
  const isSleepy = mood === 'sleepy';
  const isExcited = mood === 'excited' || mood === 'celebrating';
  const isTalking = mood === 'talking';

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* Antenna */}
      <line x1="50" y1="15" x2="50" y2="8" stroke="#6b7280" strokeWidth="2" />
      <motion.circle cx="50" cy="6" r="4" fill={isExcited ? '#fbbf24' : color}
        animate={isExcited ? { scale: [1, 1.3, 1] } : isThinking ? { opacity: [1, 0.3, 1] } : {}}
        transition={{ repeat: Infinity, duration: 0.8 }}
      />

      {/* Hat accessory */}
      {accessories.includes('hat') && (
        <rect x="30" y="14" width="40" height="5" rx="2" fill="#4b5563" />
      )}

      {/* Head */}
      <rect x="28" y="15" width="44" height="30" rx="8" fill="#6b7280" />
      <rect x="30" y="17" width="40" height="26" rx="6" fill="#9ca3af" />

      {/* Eyes */}
      <rect x="36" y="24" width="10" height="10" rx="2" fill="#1a1a2e" />
      <rect x="54" y="24" width="10" height="10" rx="2" fill="#1a1a2e" />
      {isSleepy ? (
        <>
          <line x1="38" y1="29" x2="44" y2="29" stroke="#4ade80" strokeWidth="2" />
          <line x1="56" y1="29" x2="62" y2="29" stroke="#4ade80" strokeWidth="2" />
        </>
      ) : (
        <>
          <rect x="38" y="26" width="6" height="6" rx="1" fill={color} />
          <rect x="56" y="26" width="6" height="6" rx="1" fill={color} />
        </>
      )}

      {/* Glasses accessory */}
      {accessories.includes('glasses') && (
        <g>
          <rect x="34" y="22" width="14" height="14" rx="3" fill="none" stroke="#4b5563" strokeWidth="2" />
          <rect x="52" y="22" width="14" height="14" rx="3" fill="none" stroke="#4b5563" strokeWidth="2" />
          <line x1="48" y1="29" x2="52" y2="29" stroke="#4b5563" strokeWidth="2" />
        </g>
      )}

      {/* Mouth */}
      {isTalking ? (
        <motion.rect x="42" y="38" width="16" height="4" rx="2" fill={color}
          animate={{ height: [4, 6, 4] }}
          transition={{ repeat: Infinity, duration: 0.3 }}
        />
      ) : mood === 'happy' || isExcited ? (
        <rect x="42" y="38" width="16" height="4" rx="2" fill={color} />
      ) : (
        <rect x="44" y="38" width="12" height="2" rx="1" fill="#4b5563" />
      )}

      {/* Body */}
      <rect x="25" y="50" width="50" height="30" rx="8" fill="#6b7280" />
      <rect x="27" y="52" width="46" height="26" rx="6" fill="#9ca3af" />

      {/* Chest display */}
      <motion.circle cx="50" cy="65" r="8" fill={color}
        animate={isThinking ? { scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] } : {}}
        transition={{ repeat: Infinity, duration: 1.5 }}
      />
      <circle cx="50" cy="65" r="4" fill={`${color}66`} />

      {/* Scarf accessory */}
      {accessories.includes('scarf') && (
        <rect x="25" y="48" width="50" height="5" rx="2" fill="#ef4444" opacity="0.8" />
      )}

      {/* Cape accessory */}
      {accessories.includes('cape') && (
        <path d="M 28 55 Q 18 70 12 90 L 88 90 Q 82 70 72 55 Q 50 65 28 55" fill={`${color}88`} opacity="0.6" />
      )}

      {/* Arms */}
      <rect x="12" y="52" width="13" height="8" rx="4" fill="#6b7280" />
      <rect x="75" y="52" width="13" height="8" rx="4" fill="#6b7280" />
      <motion.rect x="8" y="58" width="8" height="8" rx="4" fill="#9ca3af"
        animate={isExcited ? { y: [58, 55, 58] } : {}}
        transition={{ repeat: Infinity, duration: 0.5 }}
      />
      <motion.rect x="84" y="58" width="8" height="8" rx="4" fill="#9ca3af"
        animate={isExcited ? { y: [58, 55, 58] } : {}}
        transition={{ repeat: Infinity, duration: 0.5 }}
      />

      {/* Legs */}
      <rect x="33" y="80" width="10" height="10" rx="3" fill="#6b7280" />
      <rect x="57" y="80" width="10" height="10" rx="3" fill="#6b7280" />
      <rect x="31" y="88" width="14" height="6" rx="3" fill="#4b5563" />
      <rect x="55" y="88" width="14" height="6" rx="3" fill="#4b5563" />

      {/* Wand accessory */}
      {accessories.includes('wand') && (
        <g>
          <line x1="88" y1="55" x2="96" y2="42" stroke="#92400e" strokeWidth="2" strokeLinecap="round" />
          <motion.circle cx="97" cy="41" r="3" fill="#fbbf24"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
        </g>
      )}

      {/* Celebration sparkles */}
      {mood === 'celebrating' && (
        <>
          <motion.circle cx="20" cy="30" r="2" fill="#fbbf24" animate={{ opacity: [1, 0, 1], scale: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
          <motion.circle cx="80" cy="25" r="2" fill="#fbbf24" animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.2 }} />
        </>
      )}

      {/* Sleeping Zzz */}
      {mood === 'sleepy' && (
        <>
          <motion.text x="72" y="15" fontSize="8" fill="#9ca3af" animate={{ opacity: [0, 1, 0], y: [15, 10, 5] }} transition={{ repeat: Infinity, duration: 2 }}>z</motion.text>
          <motion.text x="80" y="10" fontSize="6" fill="#9ca3af" animate={{ opacity: [0, 1, 0], y: [10, 5, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}>z</motion.text>
        </>
      )}
    </svg>
  );
}

function CatCharacter({ color, mood, accessories }: { color: string; mood: string; accessories: string[] }) {
  const isExcited = mood === 'excited' || mood === 'celebrating';
  const isSleepy = mood === 'sleepy';
  const isThinking = mood === 'thinking';
  const isTalking = mood === 'talking';

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* Body */}
      <ellipse cx="50" cy="65" rx="24" ry="22" fill={color} opacity="0.9" />
      <ellipse cx="50" cy="65" rx="17" ry="17" fill={`${color}33`} />

      {/* Head */}
      <circle cx="50" cy="38" r="18" fill={color} opacity="0.95" />

      {/* Ears */}
      <polygon points="35,25 28,8 42,22" fill={color} />
      <polygon points="65,25 72,8 58,22" fill={color} />
      <polygon points="37,24 31,12 41,22" fill="#fca5a5" />
      <polygon points="63,24 69,12 59,22" fill="#fca5a5" />

      {/* Hat accessory */}
      {accessories.includes('hat') && (
        <g>
          <rect x="30" y="18" width="40" height="4" rx="2" fill="#4b5563" />
          <polygon points="50,4 38,18 62,18" fill="#6b7280" />
        </g>
      )}

      {/* Eyes */}
      <circle cx="42" cy="36" r="6" fill="white" />
      <circle cx="58" cy="36" r="6" fill="white" />
      {isSleepy ? (
        <>
          <line x1="38" y1="36" x2="46" y2="36" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" />
          <line x1="54" y1="36" x2="62" y2="36" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : isThinking ? (
        <>
          <ellipse cx="42" cy="36" rx="4" ry="2" fill="#1a1a2e" />
          <ellipse cx="58" cy="36" rx="4" ry="2" fill="#1a1a2e" />
        </>
      ) : (
        <>
          <ellipse cx="42" cy="36" rx="3" ry="5" fill="#1a1a2e" />
          <ellipse cx="58" cy="36" rx="3" ry="5" fill="#1a1a2e" />
          <circle cx="43" cy="34" r="1.2" fill="white" />
          <circle cx="59" cy="34" r="1.2" fill="white" />
        </>
      )}

      {/* Nose */}
      <polygon points="48,42 50,44 52,42" fill="#fca5a5" />

      {/* Mouth */}
      {isTalking ? (
        <motion.ellipse cx="50" cy="48" rx="3" ry="3" fill="#1a1a2e"
          animate={{ ry: [3, 5, 3] }}
          transition={{ repeat: Infinity, duration: 0.3 }}
        />
      ) : mood === 'happy' || isExcited ? (
        <path d="M 44 46 Q 50 52 56 46" fill="none" stroke="#1a1a2e" strokeWidth="1" strokeLinecap="round" />
      ) : (
        <path d="M 46 46 Q 50 48 54 46" fill="none" stroke="#1a1a2e" strokeWidth="1" strokeLinecap="round" />
      )}

      {/* Whiskers */}
      <line x1="18" y1="38" x2="38" y2="40" stroke="#6b7280" strokeWidth="0.8" />
      <line x1="18" y1="44" x2="38" y2="43" stroke="#6b7280" strokeWidth="0.8" />
      <line x1="82" y1="38" x2="62" y2="40" stroke="#6b7280" strokeWidth="0.8" />
      <line x1="82" y1="44" x2="62" y2="43" stroke="#6b7280" strokeWidth="0.8" />

      {/* Glasses accessory */}
      {accessories.includes('glasses') && (
        <g>
          <circle cx="42" cy="36" r="8" fill="none" stroke="#4b5563" strokeWidth="2" />
          <circle cx="58" cy="36" r="8" fill="none" stroke="#4b5563" strokeWidth="2" />
          <line x1="48" y1="36" x2="52" y2="36" stroke="#4b5563" strokeWidth="2" />
        </g>
      )}

      {/* Tail */}
      <motion.path d="M 72 70 Q 85 55 80 45" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
        animate={isExcited ? { d: ['M 72 70 Q 85 55 80 45', 'M 72 70 Q 88 50 82 40', 'M 72 70 Q 85 55 80 45'] } : {}}
        transition={{ repeat: Infinity, duration: 0.6 }}
      />

      {/* Scarf accessory */}
      {accessories.includes('scarf') && (
        <path d="M 32 48 Q 50 54 68 48 Q 68 52 50 56 Q 32 52 32 48" fill="#ef4444" opacity="0.8" />
      )}

      {/* Cape accessory */}
      {accessories.includes('cape') && (
        <path d="M 28 55 Q 18 70 12 90 L 88 90 Q 82 70 72 55 Q 50 65 28 55" fill={`${color}88`} opacity="0.6" />
      )}

      {/* Paws */}
      <ellipse cx="38" cy="85" rx="8" ry="4" fill={color} />
      <ellipse cx="62" cy="85" rx="8" ry="4" fill={color} />

      {/* Wand accessory */}
      {accessories.includes('wand') && (
        <g>
          <line x1="78" y1="55" x2="90" y2="40" stroke="#92400e" strokeWidth="2" strokeLinecap="round" />
          <motion.circle cx="91" cy="39" r="3" fill="#fbbf24"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
        </g>
      )}

      {/* Celebration stars */}
      {mood === 'celebrating' && (
        <>
          <motion.circle cx="15" cy="25" r="2" fill="#fbbf24" animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
          <motion.circle cx="85" cy="20" r="2" fill="#fbbf24" animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.2 }} />
        </>
      )}

      {/* Sleeping Zzz */}
      {mood === 'sleepy' && (
        <>
          <motion.text x="72" y="25" fontSize="8" fill="#9ca3af" animate={{ opacity: [0, 1, 0], y: [25, 20, 15] }} transition={{ repeat: Infinity, duration: 2 }}>z</motion.text>
          <motion.text x="80" y="20" fontSize="6" fill="#9ca3af" animate={{ opacity: [0, 1, 0], y: [20, 15, 10] }} transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}>z</motion.text>
        </>
      )}
    </svg>
  );
}

function WizardCharacter({ color, mood, accessories }: { color: string; mood: string; accessories: string[] }) {
  const isExcited = mood === 'excited' || mood === 'celebrating';
  const isSleepy = mood === 'sleepy';
  const isTalking = mood === 'talking';

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* Hat */}
      <polygon points="50,5 30,35 70,35" fill="#4b5563" />
      <polygon points="50,5 35,35 65,35" fill="#6b7280" />
      <rect x="25" y="33" width="50" height="6" rx="3" fill={color} />
      <motion.circle cx="50" cy="12" r="3" fill="#fbbf24"
        animate={isExcited ? { scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] } : {}}
        transition={{ repeat: Infinity, duration: 1 }}
      />

      {/* Head */}
      <circle cx="50" cy="45" r="14" fill="#fde68a" />

      {/* Eyes */}
      <circle cx="44" cy="43" r="4" fill="white" />
      <circle cx="56" cy="43" r="4" fill="white" />
      {isSleepy ? (
        <>
          <line x1="41" y1="43" x2="47" y2="43" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="53" y1="43" x2="59" y2="43" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="44" cy="43" r="2.5" fill="#1a1a2e" />
          <circle cx="56" cy="43" r="2.5" fill="#1a1a2e" />
          <circle cx="45" cy="42" r="1" fill="white" />
          <circle cx="57" cy="42" r="1" fill="white" />
        </>
      )}

      {/* Glasses accessory */}
      {accessories.includes('glasses') && (
        <g>
          <circle cx="44" cy="43" r="6" fill="none" stroke="#4b5563" strokeWidth="1.5" />
          <circle cx="56" cy="43" r="6" fill="none" stroke="#4b5563" strokeWidth="1.5" />
          <line x1="48" y1="43" x2="52" y2="43" stroke="#4b5563" strokeWidth="1.5" />
        </g>
      )}

      {/* Beard */}
      <path d="M 42 50 Q 50 65 58 50" fill="#9ca3af" />

      {/* Nose */}
      <circle cx="50" cy="47" r="2" fill="#f59e0b" />

      {/* Mouth */}
      {isTalking ? (
        <motion.ellipse cx="50" cy="52" rx="3" ry="2" fill="#1a1a2e"
          animate={{ ry: [2, 4, 2] }}
          transition={{ repeat: Infinity, duration: 0.3 }}
        />
      ) : null}

      {/* Robe */}
      <path d="M 30 60 L 25 90 L 75 90 L 70 60 Q 50 55 30 60" fill={color} opacity="0.9" />
      <path d="M 35 60 L 32 90 L 68 90 L 65 60 Q 50 57 35 60" fill={`${color}44`} />

      {/* Scarf accessory */}
      {accessories.includes('scarf') && (
        <path d="M 32 57 Q 50 62 68 57 Q 68 61 50 65 Q 32 61 32 57" fill="#ef4444" opacity="0.8" />
      )}

      {/* Cape accessory */}
      {accessories.includes('cape') && (
        <path d="M 28 60 Q 18 75 12 95 L 88 95 Q 82 75 72 60 Q 50 70 28 60" fill={`${color}88`} opacity="0.6" />
      )}

      {/* Belt */}
      <rect x="30" y="62" width="40" height="5" rx="2" fill="#92400e" />
      <rect x="46" y="60" width="8" height="8" rx="2" fill="#fbbf24" />

      {/* Wand */}
      <motion.line x1="75" y1="60" x2="85" y2="45" stroke="#92400e" strokeWidth="2" strokeLinecap="round"
        animate={isExcited ? { rotate: [0, 5, -5, 0] } : {}}
        style={{ transformOrigin: '75px 60px' }}
      />
      <motion.circle cx="86" cy="44" r="3" fill={color}
        animate={isExcited ? { scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] } : {}}
        transition={{ repeat: Infinity, duration: 0.8 }}
      />

      {/* Magic sparkles */}
      {mood === 'celebrating' && (
        <>
          <motion.circle cx="20" cy="30" r="1.5" fill="#fbbf24" animate={{ opacity: [1, 0, 1], y: [30, 25, 30] }} transition={{ repeat: Infinity, duration: 1 }} />
          <motion.circle cx="80" cy="25" r="1.5" fill="#fbbf24" animate={{ opacity: [0, 1, 0], y: [25, 20, 25] }} transition={{ repeat: Infinity, duration: 1.2 }} />
          <motion.circle cx="90" cy="50" r="1" fill={color} animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} />
          <motion.circle cx="15" cy="55" r="1" fill={color} animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.1 }} />
        </>
      )}

      {/* Hands */}
      <circle cx="30" cy="68" r="4" fill="#fde68a" />
      <circle cx="70" cy="68" r="4" fill="#fde68a" />

      {/* Sleeping Zzz */}
      {mood === 'sleepy' && (
        <>
          <motion.text x="68" y="35" fontSize="8" fill="#9ca3af" animate={{ opacity: [0, 1, 0], y: [35, 30, 25] }} transition={{ repeat: Infinity, duration: 2 }}>z</motion.text>
          <motion.text x="76" y="30" fontSize="6" fill="#9ca3af" animate={{ opacity: [0, 1, 0], y: [30, 25, 20] }} transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}>z</motion.text>
        </>
      )}
    </svg>
  );
}

function CharacterRenderer({ characterId, color, mood, accessories }: { characterId: string; color: string; mood: string; accessories: string[] }) {
  switch (characterId) {
    case 'owl':
      return <OwlCharacter color={color} mood={mood} accessories={accessories} />;
    case 'dragon':
      return <DragonCharacter color={color} mood={mood} accessories={accessories} />;
    case 'robot':
      return <RobotCharacter color={color} mood={mood} accessories={accessories} />;
    case 'cat':
      return <CatCharacter color={color} mood={mood} accessories={accessories} />;
    case 'wizard':
      return <WizardCharacter color={color} mood={mood} accessories={accessories} />;
    default:
      return <OwlCharacter color={color} mood={mood} accessories={accessories} />;
  }
}

// ─── Confetti Particle ─────────────────────────────────────────────────

function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-sm"
      style={{ backgroundColor: color, left: `${Math.random() * 100}%`, top: '-10px' }}
      initial={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      animate={{
        opacity: [1, 1, 0],
        y: [0, 400],
        rotate: [0, Math.random() * 720 - 360],
        scale: [1, 0.8, 0.3],
        x: [0, (Math.random() - 0.5) * 150],
      }}
      transition={{ duration: 2, delay, ease: 'easeOut' }}
    />
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export default function VirtualCharacter({ userRole }: { userRole: string }) {
  // Don't show for admin/teacher roles
  if (userRole === 'SCHOOL_ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'TEACHER') {
    return null;
  }

  return <VirtualCharacterInner />;
}

function VirtualCharacterInner() {
  const [character, setCharacter] = useState<VirtualCharacterData | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showAccessories, setShowAccessories] = useState(false);
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#10b981');
  const [editCharacterId, setEditCharacterId] = useState('owl');
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'customize' | 'accessories' | 'chat'>('info');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Parse accessories from JSON
  const currentAccessories = useMemo(() => {
    if (!character?.accessories) return [];
    try {
      const parsed = JSON.parse(character.accessories);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [character?.accessories]);

  // Load character data
  useEffect(() => {
    async function loadCharacter() {
      try {
        const data = await apiGet<{ character: VirtualCharacterData; enabled: boolean }>(
          '/api/ai/character'
        );
        setCharacter(data.character);
        setEnabled(data.enabled);
        setEditName(data.character.name);
        setEditColor(data.character.color);
        setEditCharacterId(data.character.characterId);
      } catch {
        setEnabled(false);
      }
    }
    loadCharacter();
  }, []);

  // Show idle speech bubbles periodically
  useEffect(() => {
    if (!character || !enabled) return;

    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return t('character.greeting_morning');
      if (hour < 18) return t('character.greeting_afternoon');
      return t('character.greeting_evening');
    };

    // Show initial greeting after 3 seconds
    const initialTimer = setTimeout(() => {
      setSpeechBubble(getGreeting());
      setTimeout(() => setSpeechBubble(null), 5000);
    }, 3000);

    // Show idle messages every 60 seconds
    const interval = setInterval(() => {
      const messages = [
        t('character.idle_message_1'),
        t('character.idle_message_2'),
        t('character.idle_message_3'),
        t('character.daily_tip_1'),
        t('character.daily_tip_2'),
        t('character.encouragement_1'),
        t('character.encouragement_2'),
      ];
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      setSpeechBubble(randomMsg);
      setTimeout(() => setSpeechBubble(null), 4000);
    }, 60000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [character, enabled]);

  // Update character mood periodically
  useEffect(() => {
    if (!character || !enabled) return;

    const moodInterval = setInterval(() => {
      const hour = new Date().getHours();
      let newMood = character.mood;
      if (hour >= 22 || hour < 6) {
        newMood = 'sleepy';
      } else if (Math.random() > 0.7) {
        const randomMoods = ['happy', 'thinking', 'excited'];
        newMood = randomMoods[Math.floor(Math.random() * randomMoods.length)];
      }
      if (newMood !== character.mood) {
        setCharacter((prev) => (prev ? { ...prev, mood: newMood } : prev));
      }
    }, 30000);

    return () => clearInterval(moodInterval);
  }, [character, enabled]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleSaveCharacter = useCallback(async () => {
    try {
      const data = await apiPut<VirtualCharacterData>('/api/ai/character', {
        characterId: editCharacterId,
        name: editName,
        color: editColor,
        accessories: JSON.stringify(currentAccessories),
      });
      setCharacter(data);
      setShowCustomize(false);
      toast.success(t('character.saved'));
    } catch {
      toast.error('Failed to save character');
    }
  }, [editCharacterId, editName, editColor, currentAccessories]);

  const handleToggleAccessory = useCallback(async (accessoryId: string) => {
    if (!character) return;
    const current = currentAccessories;
    const accessory = ACCESSORIES.find((a) => a.id === accessoryId);
    if (!accessory || character.level < accessory.unlockLevel) return;

    const newAccessories = current.includes(accessoryId)
      ? current.filter((a: string) => a !== accessoryId)
      : [...current, accessoryId];

    try {
      const data = await apiPut<VirtualCharacterData>('/api/ai/character', {
        ...character,
        accessories: JSON.stringify(newAccessories),
      });
      setCharacter(data);
    } catch {
      // Ignore
    }
  }, [character, currentAccessories]);

  const handleSendChat = useCallback(async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput.trim() };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const data = await apiPost<{ response: string } & Record<string, unknown>>('/api/ai/chat', {
        message: userMessage.content,
        conversationHistory: chatMessages.slice(-10),
      });

      const aiMessage: ChatMessage = { role: 'assistant', content: data.response };
      setChatMessages((prev) => [...prev, aiMessage]);

      // Refresh character data for XP
      try {
        const charData = await apiGet<{ character: VirtualCharacterData; enabled: boolean }>('/api/ai/character');
        setCharacter(charData.character);
        const oldLevel = character?.level || 1;
        if (charData.character.level > oldLevel) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
          setSpeechBubble(t('character.new_level', { level: String(charData.character.level) }));
          setTimeout(() => setSpeechBubble(null), 4000);
        }
      } catch {
        // Ignore
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: t('practice.generation_error') }]);
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput, isChatLoading, chatMessages, character]);

  const xpProgress = character ? (character.xp % XP_PER_LEVEL) / XP_PER_LEVEL * 100 : 0;
  const xpToNext = character ? XP_PER_LEVEL - (character.xp % XP_PER_LEVEL) : XP_PER_LEVEL;

  // Get mood icon
  const moodIcon = useMemo(() => {
    switch (character?.mood) {
      case 'excited':
      case 'celebrating':
        return <Zap className="h-3 w-3" />;
      case 'thinking':
        return <Sparkles className="h-3 w-3" />;
      case 'sleepy':
        return <Moon className="h-3 w-3" />;
      case 'talking':
        return <MessageCircle className="h-3 w-3" />;
      default:
        return <Heart className="h-3 w-3" />;
    }
  }, [character?.mood]);

  // Get animation for the character container based on mood
  const characterAnimation = useMemo(() => {
    switch (character?.mood) {
      case 'happy':
        return { y: [0, -3, 0] };
      case 'sleepy':
        return { rotate: [0, 2, -2, 0] };
      case 'thinking':
        return { x: [-1, 1, -1, 0] };
      case 'celebrating':
      case 'excited':
        return { y: [0, -5, 0], scale: [1, 1.03, 1] };
      case 'talking':
        return { y: [0, -1, 0] };
      default:
        return { y: [0, -2, 0] };
    }
  }, [character?.mood]);

  if (!enabled || !character) return null;

  return (
    <TooltipProvider>
      <div className="fixed bottom-4 left-4 z-40 sm:bottom-6 sm:left-6">
        {/* Confetti overlay */}
        <AnimatePresence>
          {showConfetti && (
            <motion.div
              className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {Array.from({ length: 30 }).map((_, i) => (
                <ConfettiParticle
                  key={i}
                  delay={Math.random() * 0.5}
                  color={['#10b981', '#fbbf24', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'][i % 6]}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Speech Bubble */}
        <AnimatePresence>
          {speechBubble && !isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="absolute bottom-20 left-0 max-w-[200px] bg-white dark:bg-gray-800 rounded-xl px-3 py-2 shadow-lg border border-emerald-200/60 dark:border-emerald-800/30 text-xs text-gray-700 dark:text-gray-300"
            >
              <p>{speechBubble}</p>
              <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-white dark:bg-gray-800 border-r border-b border-emerald-200/60 dark:border-emerald-800/30 transform rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expanded Panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="absolute bottom-16 left-0 w-[300px] max-h-[70vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl shadow-emerald-500/10 border border-emerald-200/60 dark:border-emerald-800/40 overflow-hidden"
            >
              {/* Tab navigation */}
              <div className="flex items-center border-b border-emerald-200/60 dark:border-emerald-800/30">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    activeTab === 'info'
                      ? 'text-emerald-600 border-b-2 border-emerald-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Star className="h-3.5 w-3.5 mx-auto mb-0.5" />
                  {t('character.level')}
                </button>
                <button
                  onClick={() => setActiveTab('customize')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    activeTab === 'customize'
                      ? 'text-emerald-600 border-b-2 border-emerald-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Settings className="h-3.5 w-3.5 mx-auto mb-0.5" />
                  {t('character.customize')}
                </button>
                <button
                  onClick={() => setActiveTab('accessories')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    activeTab === 'accessories'
                      ? 'text-emerald-600 border-b-2 border-emerald-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 mx-auto mb-0.5" />
                  {t('character.accessories')}
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    activeTab === 'chat'
                      ? 'text-emerald-600 border-b-2 border-emerald-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <MessageCircle className="h-3.5 w-3.5 mx-auto mb-0.5" />
                  {t('character.chat', { name: character.name })}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-400 hover:text-gray-600 shrink-0"
                  onClick={() => setIsExpanded(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Info Tab */}
              {activeTab === 'info' && (
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {character.name}
                    </h3>
                    <Badge className="h-5 text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-0 px-1.5">
                      {t('character.level')} {character.level}
                    </Badge>
                  </div>

                  {/* Character SVG with idle animation */}
                  <motion.div
                    className="w-24 h-24 mx-auto mb-3"
                    animate={characterAnimation}
                    transition={{
                      repeat: Infinity,
                      duration: 2,
                      ease: 'easeInOut',
                    }}
                  >
                    <CharacterRenderer
                      characterId={character.characterId}
                      color={character.color}
                      mood={character.mood}
                      accessories={currentAccessories}
                    />
                  </motion.div>

                  {/* Mood Badge */}
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <Badge
                      className="text-[10px] border-0 px-2 cursor-pointer"
                      style={{ backgroundColor: `${character.color}22`, color: character.color }}
                      onClick={() => {
                        const moods = ['happy', 'excited', 'thinking', 'sleepy', 'celebrating'];
                        const currentIdx = moods.indexOf(character.mood);
                        const nextMood = moods[(currentIdx + 1) % moods.length];
                        setCharacter((prev) => (prev ? { ...prev, mood: nextMood } : prev));
                        if (nextMood === 'celebrating') {
                          setShowConfetti(true);
                          setTimeout(() => setShowConfetti(false), 3000);
                        }
                      }}
                    >
                      {moodIcon}
                      <span className="ml-1">
                        {t(`character.mood_${character.mood}`)}
                      </span>
                    </Badge>
                  </div>

                  {/* XP Progress */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
                      <span>{t('character.xp')}: {character.xp}</span>
                      <span>{t('character.xp_to_next', { xp: String(xpToNext), level: String(character.level + 1) })}</span>
                    </div>
                    <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${xpProgress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full"
                        initial={{ x: '-100%' }}
                        animate={{ x: '200%' }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                        style={{ width: '50%' }}
                      />
                    </div>
                  </div>

                  {/* Active accessories display */}
                  {currentAccessories.length > 0 && (
                    <div className="mt-3 flex items-center gap-1 justify-center flex-wrap">
                      {currentAccessories.map((accId: string) => {
                        const acc = ACCESSORIES.find((a) => a.id === accId);
                        if (!acc) return null;
                        return (
                          <Badge key={accId} className="text-[9px] border-0 px-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                            {t(acc.nameKey)}
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {/* Daily tip */}
                  <div className="mt-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Lightbulb className="h-3 w-3 text-amber-500" />
                      <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">{t('character.daily_tip')}</span>
                    </div>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400">
                      {t(`character.daily_tip_${Math.min(new Date().getDate() % 5 + 1, 5)}`)}
                    </p>
                  </div>
                </div>
              )}

              {/* Customize Tab */}
              {activeTab === 'customize' && (
                <div className="p-4 space-y-3">
                  {/* Character preview */}
                  <div className="flex justify-center mb-2">
                    <div className="w-16 h-16">
                      <CharacterRenderer
                        characterId={editCharacterId}
                        color={editColor}
                        mood="happy"
                        accessories={currentAccessories}
                      />
                    </div>
                  </div>

                  {/* Character Selection */}
                  <div>
                    <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">
                      {t('character.select_character')}
                    </Label>
                    <div className="flex gap-1.5 flex-wrap">
                      {CHARACTER_TYPES.map((ct) => (
                        <Button
                          key={ct.id}
                          variant={editCharacterId === ct.id ? 'default' : 'outline'}
                          size="sm"
                          className={`h-8 text-[10px] px-2 ${
                            editCharacterId === ct.id
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                              : 'border-emerald-200/50 dark:border-emerald-800/30 text-gray-600 dark:text-gray-400'
                          }`}
                          onClick={() => setEditCharacterId(ct.id)}
                        >
                          {t(ct.nameKey)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                      {t('character.name')}
                    </Label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 text-xs border-emerald-200/50 dark:border-emerald-800/30"
                    />
                  </div>

                  {/* Color */}
                  <div>
                    <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                      {t('character.color')}
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="w-8 h-8 rounded-lg border border-emerald-200/50 dark:border-emerald-800/30 cursor-pointer"
                      />
                      <Input
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="h-8 text-xs border-emerald-200/50 dark:border-emerald-800/30 flex-1"
                      />
                    </div>
                    {/* Quick color presets */}
                    <div className="flex gap-1.5 mt-2">
                      {['#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#ec4899'].map((c) => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                            editColor === c ? 'border-gray-800 dark:border-gray-200 scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Save Button */}
                  <Button
                    onClick={handleSaveCharacter}
                    className="w-full h-8 text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                  >
                    {t('character.save')}
                  </Button>
                </div>
              )}

              {/* Accessories Tab */}
              {activeTab === 'accessories' && (
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {t('character.accessories')}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {ACCESSORIES.map((acc) => {
                      const isUnlocked = character.level >= acc.unlockLevel;
                      const isActive = currentAccessories.includes(acc.id);
                      return (
                        <div
                          key={acc.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                            isUnlocked
                              ? isActive
                                ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-emerald-200'
                              : 'border-gray-100 dark:border-gray-800 opacity-50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isUnlocked ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-100 dark:bg-gray-800'
                          }`}>
                            {isUnlocked ? (
                              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Lock className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {t(acc.nameKey)}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {isUnlocked
                                ? t('character.accessory_unlocked')
                                : t('character.unlock_level', { level: String(acc.unlockLevel) })}
                            </p>
                          </div>
                          {isUnlocked && (
                            <Button
                              variant={isActive ? 'default' : 'outline'}
                              size="sm"
                              className={`h-7 text-[10px] px-2 ${
                                isActive
                                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                  : 'border-emerald-200/50 dark:border-emerald-800/30'
                              }`}
                              onClick={() => handleToggleAccessory(acc.id)}
                            >
                              {isActive ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Chat Tab */}
              {activeTab === 'chat' && (
                <div className="flex flex-col h-[350px]">
                  {/* Chat header */}
                  <div className="p-3 border-b border-emerald-200/60 dark:border-emerald-800/30 flex items-center gap-2">
                    <div className="w-6 h-6">
                      <CharacterRenderer
                        characterId={character.characterId}
                        color={character.color}
                        mood="happy"
                        accessories={currentAccessories}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {t('character.chat', { name: character.name })}
                    </span>
                  </div>

                  {/* Chat messages */}
                  <ScrollArea className="flex-1 p-3">
                    <div className="space-y-3">
                      {chatMessages.length === 0 && (
                        <div className="text-center py-4">
                          <p className="text-xs text-gray-400 mb-1">
                            {t('character.greeting', { name: character.name })}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {t('character.daily_tip_1')}
                          </p>
                        </div>
                      )}
                      {chatMessages.map((msg, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                            msg.role === 'user'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}>
                            {msg.content}
                          </div>
                        </motion.div>
                      ))}
                      {isChatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-400 flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            ...
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Chat input */}
                  <div className="p-3 border-t border-emerald-200/60 dark:border-emerald-800/30">
                    <div className="flex items-center gap-2">
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder={t('character.chat_placeholder')}
                        className="h-8 text-xs border-emerald-200/50 dark:border-emerald-800/30"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendChat();
                          }
                        }}
                      />
                      <Button
                        onClick={handleSendChat}
                        size="icon"
                        className="h-8 w-8 shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white"
                        disabled={!chatInput.trim() || isChatLoading}
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Character Button */}
        <motion.div
          className="relative"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-14 w-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300 p-0 overflow-hidden"
          >
            <motion.div
              className="w-10 h-10"
              animate={characterAnimation}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            >
              <CharacterRenderer
                characterId={character.characterId}
                color={character.color}
                mood={character.mood}
                accessories={currentAccessories}
              />
            </motion.div>
          </Button>

          {/* Level badge */}
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-amber-500 text-white text-[10px] border-2 border-white dark:border-gray-900 font-bold">
            {character.level}
          </Badge>
        </motion.div>
      </div>
    </TooltipProvider>
  );
}
