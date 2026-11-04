import type { QuickAction, PanelState } from './types';
export const starterActions: QuickAction[] = [
  { id: 'browser', title: 'ブラウザ', subtitle: 'Webを開く', icon: '🌐', color: '#536dfe', size: '1x1', kind: 'web', target: 'https://www.google.com' },
  { id: 'camera', title: 'カメラ', subtitle: 'カメラを起動', icon: '📷', color: '#9b72cf', size: '1x1', kind: 'setting', target: 'camera' },
  { id: 'memo', title: 'メモ', subtitle: 'テキストをコピー', icon: '📝', color: '#d18b4a', size: '1x1', kind: 'info', note: 'QuickPanelからコピーしたメモ' },
  { id: 'shortcuts', title: 'ショートカット', subtitle: '名前で実行', icon: '⚡️', color: '#d9a441', size: '1x1', kind: 'shortcut', shortcutName: '' }
];
export const initialState: PanelState = { version: 1, actions: starterActions };
