/**
 * Resolves the admin-only realism A/B mode for the twin canvas.
 *
 * The `?realism=` query parameter is honoured only for asset administrators;
 * every other caller renders the default (video-informed) presentation, so the
 * selector can never appear in or affect the standard operator interface.
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { isAssetAdmin } from '@/auth/assetAdmin';
import { useRBAC } from '@/contexts/RBACContext';
import {
  DEFAULT_REALISM_MODE,
  getRealismMode,
  readRealismModeFromSearch,
  setRealismMode,
  subscribeRealismMode,
  type RealismMode,
} from '../realismMode';

export function useRealismMode(): RealismMode {
  const { role, roles } = useRBAC();
  const location = useLocation();
  const [mode, setMode] = useState<RealismMode>(getRealismMode());

  useEffect(() => subscribeRealismMode(setMode), []);

  useEffect(() => {
    const requested = readRealismModeFromSearch(location.search);
    const allowed = isAssetAdmin(role, roles);
    setRealismMode(allowed && requested ? requested : DEFAULT_REALISM_MODE);
  }, [location.search, role, roles]);

  return mode;
}