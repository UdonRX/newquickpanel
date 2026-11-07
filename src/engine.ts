import type { QuickAction, ActionStep } from './types';
const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));
function openShortcut(name: string) {
  if (!name.trim()) { alert('ショートカット名を設定してね'); return; }
  window.location.href = 'shortcuts://run-shortcut?name=' + encodeURIComponent(name.trim());
}
export async function runStep(step: ActionStep): Promise<void> {
  switch (step.type) {
    case 'open-url': window.location.href = step.value; break;
    case 'open-shortcut': openShortcut(step.value); break;
    case 'copy-text':
      try { await navigator.clipboard.writeText(step.value); alert('コピーしたよ'); }
      catch { window.prompt('このテキストをコピーしてね', step.value); }
      break;
    case 'show-alert': alert(step.value); break;
    case 'wait': await wait(Math.max(0, Math.min(30000, Number(step.value) || 0))); break;
  }
}
export async function runAction(action: QuickAction): Promise<void> {
  // Webサイト検索はApp側の検索ワード入力UIから実行する。
  if (action.kind === 'search') return;
  if (action.kind === 'workflow') {
    for (const step of action.steps ?? []) await runStep(step);
    return;
  }
  if (action.kind === 'shortcut') { openShortcut(action.shortcutName ?? ''); return; }
  if (action.kind === 'info') {
    if (action.note) {
      try { await navigator.clipboard.writeText(action.note); alert('メモをコピーしたよ'); }
      catch { window.prompt(action.title, action.note); }
    } else alert(action.title);
    return;
  }
  if (action.kind === 'setting' && action.target === 'camera') {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment'; input.click();
    return;
  }
  if (action.target?.trim()) window.location.href = action.target.trim();
  else alert('このタイルの起動先がまだ設定されていないよ');
}
