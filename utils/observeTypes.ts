// utils/observeTypes.ts
export type Severity = 'debug'|'info'|'warn'|'error';
export type Source = 'browser'|'desktop-ax'|'screen-ocr'|'connector';
export type UiRole = 'button'|'link'|'textbox'|'combobox'|'menuitem'|'table'|'row'|'cell'|'dialog'|'unknown';

export interface UiNode {
  role: UiRole; name?: string;
  aria?: Record<string,string>;
  selector?: string; xpath?: string;
  bounds?: { x:number; y:number; w:number; h:number };
}

export type DomPatchOp = 'add'|'remove'|'replace';
export interface DomPatch { op: DomPatchOp; path: string; value?: any }

export type ObserveAction =
  | { type:'click'; target: UiNode }
  | { type:'input'; target: UiNode; value?: string; redacted?: boolean }
  | { type:'submit'; target?: UiNode }
  | { type:'navigate'; url: string }
  | { type:'dom_diff'; diff: DomPatch[] }
  | { type:'network'; method: string; url: string; status?: number }
  | { type:'focus'; target: UiNode }
  | { type:'snapshot'; thumbUrl?: string };

export interface ObserveEvent {
  id: string; ts: string; source: Source;
  app: { name: string; url?: string; pid?: number };
  window?: { title?: string; id?: string };
  action: ObserveAction;
  context?: { selectionText?: string; clipboardHash?: string; tags?: string[] };
  severity?: Severity;
  session_id?: string;   // rotate often
  episode_id?: string;   // server-grouped
}
