import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ActionKind, ActionStep, PanelState, QuickAction, TileSize } from './types';
import { initialState } from './defaults';
import { exportState, importState, loadState, saveState } from './storage';
import { runAction } from './engine';

const kinds: { value: ActionKind; label: string }[] = [
  { value: 'app', label: 'アプリ・URLスキーム' }, { value: 'web', label: 'Webサイト' },
  { value: 'shortcut', label: 'ショートカット' }, { value: 'setting', label: '設定・操作' },
  { value: 'workflow', label: 'アクション' }, { value: 'info', label: '情報・メモ' }
];
const uid = () => crypto.randomUUID?.() ?? String(Date.now() + Math.random());
const blankAction = (): QuickAction => ({ id: uid(), title: '新しいタイル', subtitle: '', icon: '✨', color: '#6477e8', size: '1x1', kind: 'web', target: 'https://' });
const stepTypes: { value: ActionStep['type']; label: string }[] = [
  { value: 'open-url', label: 'URLを開く' }, { value: 'open-shortcut', label: 'ショートカットを実行' },
  { value: 'copy-text', label: 'テキストをコピー' }, { value: 'show-alert', label: 'メッセージを表示' }, { value: 'wait', label: '待機（ミリ秒）' }
];

export default function App() {
  const [state, setState] = useState<PanelState>(() => loadState());
  const [editing, setEditing] = useState<QuickAction | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => { saveState(state); }, [state]);
  const sorted = useMemo(() => state.actions, [state.actions]);
  const update = (next: QuickAction) => setEditing(next);
  const commit = () => {
    if (!editing || !editing.title.trim()) return;
    setState(s => ({ ...s, actions: s.actions.some(a => a.id === editing.id) ? s.actions.map(a => a.id === editing.id ? editing : a) : [...s.actions, editing] }));
    setEditing(null);
  };
  const moveBy = (id: string, offset: number) => setState(s => { const arr = [...s.actions]; const from = arr.findIndex(a => a.id === id); const to = Math.max(0, Math.min(arr.length - 1, from + offset)); if (from < 0 || from === to) return s; const [item] = arr.splice(from, 1); arr.splice(to, 0, item); return { ...s, actions: arr }; });
  const move = (source: string, target: string) => {
    if (source === target) return;
    setState(s => {
      const arr = [...s.actions]; const from = arr.findIndex(a => a.id === source); const to = arr.findIndex(a => a.id === target);
      if (from < 0 || to < 0) return s;
      const [item] = arr.splice(from, 1); arr.splice(to, 0, item); return { ...s, actions: arr };
    });
  };
  const duplicate = (action: QuickAction) => setState(s => ({ ...s, actions: [...s.actions, { ...action, id: uid(), title: action.title + ' コピー', steps: action.steps?.map(step => ({ ...step, id: uid() })) }] }));
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2200); };
  const restore = () => { if (confirm('すべてのタイルを初期状態に戻す？')) setState(structuredClone(initialState)); };
  const addStep = () => update({ ...editing!, steps: [...(editing!.steps ?? []), { id: uid(), type: 'open-url', value: 'https://' }] });

  return <main className="app-shell">
    <header className="topbar">
      <div><div className="eyebrow">PERSONAL LAUNCHER</div><h1>QuickPanel</h1></div>
      <div className="header-actions">
        <button className="icon-button" aria-label="使い方" onClick={() => setShowHelp(v => !v)}>ⓘ</button>
        <button className={isEditing ? 'edit-button active' : 'edit-button'} onClick={() => setIsEditing(v => !v)}>{isEditing ? '完了' : '編集'}</button>
      </div>
    </header>

    {showHelp && <section className="help-panel"><b>使い方</b><p>タイルをタップすると登録したアプリ・URL・ショートカットを起動するよ。編集モードで追加・変更・複製・削除・並べ替えができる。</p><p>設定はこのiPhoneのブラウザ内に保存されるよ。機種変更や再インストールに備えて、設定画面からバックアップしてね。</p><button className="text-button" onClick={() => setShowHelp(false)}>閉じる</button></section>}

    <section className="panel-heading"><div><span className="section-kicker">YOUR SPACE</span><h2>よく使うアクション</h2></div><span className="tile-count">{state.actions.length} TILES</span></section>
    <section className="tile-grid" aria-label="クイックアクション">
      {sorted.map(action => <article key={action.id}
        className={`tile tile-${action.size.replace('x','-')} ${dragId === action.id ? 'dragging' : ''}`}
        style={{ '--tile-color': action.color } as CSSProperties}
        draggable={isEditing}
        onDragStart={() => setDragId(action.id)}
        onDragOver={e => { if (isEditing) e.preventDefault(); }}
        onDrop={e => { e.preventDefault(); if (dragId) move(dragId, action.id); setDragId(null); }}
        onDragEnd={() => setDragId(null)}>
        <button className="tile-main" onClick={() => isEditing ? setEditing({ ...action }) : void runAction(action)}>
          <span className="tile-icon">{action.icon || '◇'}</span>
          <span className="tile-copy"><strong>{action.title}</strong>{action.subtitle && <small>{action.subtitle}</small>}</span>
          {action.size !== '1x1' && <span className="tile-size">{action.size}</span>}
        </button>
        {isEditing && <div className="tile-tools">
          <button onClick={() => setEditing({ ...action })}>編集</button>
          <button onClick={() => moveBy(action.id, -1)} aria-label="上へ移動">↑</button>
          <button onClick={() => moveBy(action.id, 1)} aria-label="下へ移動">↓</button>
          <button onClick={() => duplicate(action)}>複製</button>
          <button onClick={() => { if (confirm(`「${action.title}」を削除する？`)) setState(s => ({ ...s, actions: s.actions.filter(a => a.id !== action.id) })); }}>削除</button>
        </div>}
      </article>)}
      {isEditing && <button className="add-tile" onClick={() => setEditing(blankAction())}><span>＋</span><b>タイルを追加</b></button>}
    </section>

    {isEditing && <section className="settings-panel">
      <div className="panel-heading compact"><div><span className="section-kicker">DATA</span><h2>設定の管理</h2></div></div>
      <div className="settings-actions">
        <button onClick={() => exportState(state)}>設定をバックアップ</button>
        <label className="file-button">バックアップを復元<input type="file" accept="application/json,.json" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; try { setState(await importState(file)); notify('復元したよ'); } catch (err) { alert(err instanceof Error ? err.message : '読み込めなかった'); } e.currentTarget.value = ''; }} /></label>
        <button className="danger-button" onClick={restore}>初期状態に戻す</button>
      </div>
      <p className="storage-note">設定はこの端末内に保存。バックアップファイルは大切に保管してね。</p>
    </section>}

    <footer className="footer"><span>QUICKPANEL · PERSONAL USE</span><button onClick={() => setShowHelp(true)}>使い方・注意事項</button></footer>

    {editing && <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setEditing(null); }}>
      <section className="editor-modal">
        <div className="modal-header"><div><span className="section-kicker">TILE SETTINGS</span><h2>タイルを編集</h2></div><button className="icon-button" onClick={() => setEditing(null)}>✕</button></div>
        <label>表示名<input value={editing.title} onChange={e => update({ ...editing, title: e.target.value })} placeholder="例：カレンダー" /></label>
        <label>説明<input value={editing.subtitle ?? ''} onChange={e => update({ ...editing, subtitle: e.target.value })} placeholder="タイルの下に表示" /></label>
        <div className="form-row">
          <label>アイコン（絵文字）<input value={editing.icon} onChange={e => update({ ...editing, icon: e.target.value })} maxLength={8} /></label>
          <label>タイル色<input type="color" value={editing.color} onChange={e => update({ ...editing, color: e.target.value })} /></label>
        </div>
        <label>サイズ<select value={editing.size} onChange={e => update({ ...editing, size: e.target.value as TileSize })}><option value="1x1">1 × 1</option><option value="2x1">2 × 1（横長）</option><option value="2x2">2 × 2（大）</option></select></label>
        <label>アクションの種類<select value={editing.kind} onChange={e => update({ ...editing, kind: e.target.value as ActionKind })}>{kinds.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}</select></label>
        {(editing.kind === 'app' || editing.kind === 'web' || editing.kind === 'setting') && <label>{editing.kind === 'web' ? 'WebサイトURL' : '起動先URL・URLスキーム'}<input value={editing.target ?? ''} onChange={e => update({ ...editing, target: e.target.value })} placeholder="https://example.com または myapp://" autoCapitalize="none" /></label>}
        {editing.kind === 'shortcut' && <label>ショートカット名<input value={editing.shortcutName ?? ''} onChange={e => update({ ...editing, shortcutName: e.target.value })} placeholder="ショートカットの名前" /></label>}
        {editing.kind === 'info' && <label>メモ内容<textarea value={editing.note ?? ''} onChange={e => update({ ...editing, note: e.target.value })} rows={3} /></label>}
        {editing.kind === 'workflow' && <div className="workflow-editor">
          <div className="workflow-title"><b>アクション手順</b><button className="text-button" onClick={addStep}>＋ 手順を追加</button></div>
          {(editing.steps ?? []).map((step, index) => <div className="step-card" key={step.id}>
            <div className="step-top"><b>STEP {index + 1}</b><button className="remove-step" onClick={() => update({ ...editing, steps: editing.steps?.filter(s => s.id !== step.id) })}>削除</button></div>
            <select value={step.type} onChange={e => update({ ...editing, steps: editing.steps?.map(s => s.id === step.id ? ({ ...s, type: e.target.value as ActionStep['type'] } as ActionStep) : s) })}>{stepTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
            <textarea rows={2} value={step.value} onChange={e => update({ ...editing, steps: editing.steps?.map(s => s.id === step.id ? { ...s, value: e.target.value } : s) })} placeholder="URL・テキスト・ショートカット名など" />
          </div>)}
          {!editing.steps?.length && <p className="empty-hint">まだ手順がないよ。「手順を追加」から登録してね。</p>}
        </div>}
        <div className="modal-actions"><button className="cancel-button" onClick={() => setEditing(null)}>キャンセル</button><button className="save-button" onClick={commit}>保存する</button></div>
      </section>
    </div>}
    {toast && <div className="toast">{toast}</div>}
  </main>;
}
