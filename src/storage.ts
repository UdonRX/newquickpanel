import type { PanelState } from './types';
import { initialState } from './defaults';
const KEY = 'quickpanel:pwa:state:v1';
export function loadState(): PanelState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(initialState);
    const parsed = JSON.parse(raw) as PanelState;
    if (parsed.version !== 1 || !Array.isArray(parsed.actions)) return structuredClone(initialState);
    return parsed;
  } catch { return structuredClone(initialState); }
}
export function saveState(state: PanelState): void {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { alert('保存できなかった。iPhoneの空き容量を確認してね。'); }
}
export function exportState(state: PanelState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'quickpanel-backup.json'; a.click();
  URL.revokeObjectURL(url);
}
export async function importState(file: File): Promise<PanelState> {
  const parsed = JSON.parse(await file.text()) as PanelState;
  if (parsed.version !== 1 || !Array.isArray(parsed.actions)) throw new Error('QuickPanelのバックアップではないみたい');
  return parsed;
}
