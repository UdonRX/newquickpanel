import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import type { ActionKind, ActionStep, PanelState, QuickAction } from './types';
import { initialState } from './defaults';
import { exportState, importState, loadState, saveState } from './storage';
import { runAction } from './engine';

const kinds: { value: ActionKind; label: string }[] = [
  { value: 'app', label: 'アプリ・URLスキーム' }, { value: 'web', label: 'Webサイト' },
  { value: 'shortcut', label: 'ショートカット' }, { value: 'setting', label: '設定・操作' },
  { value: 'workflow', label: 'アクション' }, { value: 'info', label: '情報・メモ' }
];
const uid = () => crypto.randomUUID?.() ?? String(Date.now() + Math.random());
const blankAction = (): QuickAction => ({ id: uid(), title: '新しいタイル', subtitle: '', icon: '', color: '#6477e8', size: '1x1', kind: 'web', target: 'https://' });
const stepTypes: { value: ActionStep['type']; label: string }[] = [
  { value: 'open-url', label: 'URLを開く' }, { value: 'open-shortcut', label: 'ショートカットを実行' },
  { value: 'copy-text', label: 'テキストをコピー' }, { value: 'show-alert', label: 'メッセージを表示' }, { value: 'wait', label: '待機（ミリ秒）' }
];

export default function App() {
  const [state, setState] = useState<PanelState>(() => loadState());
  const [editing, setEditing] = useState<QuickAction | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const dragTimer = useRef<number | null>(null);
  const dragSource = useRef<string | null>(null);
  const targetSlot = useRef<number | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => { saveState(state); }, [state]);
  const sorted = useMemo(() => [...state.actions].map((action, index) => ({ ...action, position: action.position ?? index })).sort((a, b) => a.position - b.position), [state.actions]);
  const maxPosition = Math.max(-1, ...sorted.map(a => a.position));
  const slotCount = Math.max(sorted.length, maxPosition + 1) + (isEditing ? 1 : 0);
  const slots = Array.from({ length: slotCount }, (_, index) => index);
  const update = (next: QuickAction) => setEditing(next);
  const commit = () => {
    if (!editing || !editing.title.trim()) return;
    setState(s => ({ ...s, actions: s.actions.some(a => a.id === editing.id) ? s.actions.map(a => a.id === editing.id ? editing : a) : [...s.actions, { ...editing, position: Math.max(-1, ...s.actions.map((a, i) => a.position ?? i)) + 1 }] }));
    setEditing(null);
  };
  const moveTo = (source: string, targetPosition: number) => {
    setState(s => {
      const positioned = s.actions.map((a, i) => ({ ...a, position: a.position ?? i }));
      const sourceItem = positioned.find(a => a.id === source);
      if (!sourceItem || sourceItem.position === targetPosition) return s;
      const targetItem = positioned.find(a => a.position === targetPosition);
      return { ...s, actions: positioned.map(a => a.id === source ? { ...a, position: targetPosition } : targetItem && a.id === targetItem.id ? { ...a, position: sourceItem.position } : a) };
    });
  };
  const clearDrag = () => {
    if (dragTimer.current !== null) window.clearTimeout(dragTimer.current);
    dragTimer.current = null;
    dragSource.current = null;
    targetSlot.current = null;
    setDragId(null);
    setDragTarget(null);
  };
  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, action: QuickAction) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    suppressClick.current = false;
    dragTimer.current = window.setTimeout(() => {
      dragSource.current = action.id;
      targetSlot.current = action.position;
      suppressClick.current = true;
      setDragId(action.id);
      setDragTarget(action.position);
      if ('vibrate' in navigator) navigator.vibrate?.(18);
    }, 420);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragSource.current) return;
    event.preventDefault();
    const underPointer = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-slot]');
    if (!underPointer) return;
    const slot = Number(underPointer.dataset.slot);
    if (Number.isInteger(slot)) { targetSlot.current = slot; setDragTarget(slot); }
  };
  const onPointerUp = () => {
    if (dragTimer.current !== null) window.clearTimeout(dragTimer.current);
    dragTimer.current = null;
    if (dragSource.current && targetSlot.current !== null) moveTo(dragSource.current, targetSlot.current);
    window.setTimeout(clearDrag, 0);
  };
  const onPointerCancel = () => { if (dragTimer.current !== null) window.clearTimeout(dragTimer.current); clearDrag(); };
  const handleTileClick = (action: QuickAction) => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    if (isEditing) setEditing({ ...action }); else void runAction(action);
  };
  const duplicate = (action: QuickAction) => setState(s => ({ ...s, actions: [...s.actions, { ...action, id: uid(), position: Math.max(-1, ...s.actions.map((a, i) => a.position ?? i)) + 1, title: action.title + ' コピー', steps: action.steps?.map(step => ({ ...step, id: uid() })) }] }));
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2200); };
  const restore = () => { if (confirm('すべてのタイルを初期状態に戻す？')) setState(structuredClone(initialState)); };
  const addStep = () => update({ ...editing!, steps: [...(editing!.steps ?? []), { id: uid(), type: 'open-url', value: 'https://' }] });

  return <main className="app-shell">
    <header className="topbar">
      <button className={isEditing ? 'edit-button active' : 'edit-button'} onClick={() => setIsEditing(v => !v)}>{isEditing ? '完了' : '編集'}</button>
    </header>

    <section className="tile-grid" aria-label="クイックアクション">
      {slots.map(slot => {
        const action = sorted.find(a => a.position === slot);
        return <div className="tile-slot" data-slot={slot} key={slot}>
          {action ? <article className={`tile ${dragId === action.id ? 'dragging' : ''} ${dragTarget === slot && dragId !== action.id ? 'drop-target' : ''}`} style={{ '--tile-color': action.color } as CSSProperties}>
            <button className="tile-main" onPointerDown={e => onPointerDown(e, action)} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onClick={() => handleTileClick(action)}>
              <span className="tile-copy"><strong>{action.title}</strong></span>
            </button>
            {isEditing && <div className="tile-tools">
              <button onClick={() => setEditing({ ...action })}>編集</button>
              <button onClick={() => duplicate(action)}>複製</button>
              <button onClick={() => { if (confirm(`「${action.title}」を削除する？`)) setState(s => ({ ...s, actions: s.actions.filter(a => a.id !== action.id) })); }}>削除</button>
            </div>}
          </article> : isEditing ? <div className="empty-slot" aria-label={`空き位置 ${slot + 1}`}>ここに移動</div> : <div className="empty-slot-placeholder" />}
        </div>;
      })}
    </section>

    {isEditing && <section className="settings-panel">
      <button className="add-tile" onClick={() => setEditing(blankAction())}>＋ タイルを追加</button>
      <div className="settings-actions">
        <button onClick={() => exportState(state)}>設定をバックアップ</button>
        <label className="file-button">バックアップを復元<input type="file" accept="application/json,.json" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; try { setState(await importState(file)); notify('復元したよ'); } catch (err) { alert(err instanceof Error ? err.message : '読み込めなかった'); } e.currentTarget.value = ''; }} /></label>
        <button className="danger-button" onClick={restore}>初期状態に戻す</button>
      </div>
      <p className="storage-note">タイルを長押ししてドラッグすると、好きな位置に移動できるよ。設定はこの端末内に保存されるよ。</p>
    </section>}

    {editing && <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setEditing(null); }}>
      <section className="editor-modal">
        <div className="modal-header"><div><span className="section-kicker">TILE SETTINGS</span><h2>タイルを編集</h2></div><button className="icon-button" onClick={() => setEditing(null)}>✕</button></div>
        <label>表示名<input value={editing.title} onChange={e => update({ ...editing, title: e.target.value })} placeholder="例：カレンダー" /></label>
        <label>タイル色<input type="color" value={editing.color} onChange={e => update({ ...editing, color: e.target.value })} /></label>
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
