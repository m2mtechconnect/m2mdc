import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl === undefined || shortcut.ctrl === (e.ctrlKey || e.metaKey);
        const shiftMatch = shortcut.shift === undefined || shortcut.shift === e.shiftKey;
        const altMatch = shortcut.alt === undefined || shortcut.alt === e.altKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

// Global shortcuts helper
export const useGlobalShortcuts = () => {
  const navigate = useNavigate();

  useKeyboardShortcuts([
    {
      key: 'k',
      ctrl: true,
      action: () => {
        // Command palette (already implemented in Layout)
        window.dispatchEvent(new CustomEvent('toggle-command-palette'));
      },
      description: 'Open command palette',
    },
    {
      key: '/',
      ctrl: true,
      action: () => {
        // Toggle AURA Assistant
        window.dispatchEvent(new CustomEvent('toggle-copilot'));
      },
      description: 'Toggle AURA Assistant',
    },
    {
      key: 's',
      ctrl: true,
      action: () => {
        // Manual save
        window.dispatchEvent(new CustomEvent('manual-save'));
      },
      description: 'Save current progress',
    },
    {
      key: 'z',
      ctrl: true,
      action: () => {
        window.dispatchEvent(new CustomEvent('undo'));
      },
      description: 'Undo last change',
    },
    {
      key: 'z',
      ctrl: true,
      shift: true,
      action: () => {
        window.dispatchEvent(new CustomEvent('redo'));
      },
      description: 'Redo last change',
    },
    {
      key: 'h',
      ctrl: true,
      action: () => {
        navigate('/help');
      },
      description: 'Open help',
    },
  ]);
};
