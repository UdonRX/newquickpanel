export type TileSize = '1x1' | '2x1' | '2x2';
export type ActionKind = 'app' | 'search' | 'web' | 'shortcut' | 'setting' | 'workflow' | 'info';
export type ActionStep =
  | { id: string; type: 'open-url'; value: string }
  | { id: string; type: 'open-shortcut'; value: string }
  | { id: string; type: 'copy-text'; value: string }
  | { id: string; type: 'show-alert'; value: string }
  | { id: string; type: 'wait'; value: string };
export interface QuickAction {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  color: string;
  size: TileSize;
  kind: ActionKind;
  position?: number;
  target?: string;
  shortcutName?: string;
  note?: string;
  steps?: ActionStep[];
}
export interface PanelState { version: 1; actions: QuickAction[] }
