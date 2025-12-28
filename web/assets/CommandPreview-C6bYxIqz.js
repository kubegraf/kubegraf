import { c as createSignal, t as template, i as insert, d as createComponent, S as Show, f as createRenderEffect, e as setAttribute, G as addNotification, v as delegateEvents } from './index-Bh-O-sIc.js';

var _tmpl$ = /* @__PURE__ */ template(`<span class="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px]"style="background:rgba(148, 163, 184, 0.16);color:var(--text-secondary)">`), _tmpl$2 = /* @__PURE__ */ template(`<span class="hidden sm:inline text-[11px] truncate"style=color:var(--text-muted)>`), _tmpl$3 = /* @__PURE__ */ template(`<svg class="w-3.5 h-3.5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z">`), _tmpl$4 = /* @__PURE__ */ template(`<p class="mt-1 text-[11px]"style=color:var(--text-muted)>`), _tmpl$5 = /* @__PURE__ */ template(`<div class="px-3 pb-3 pt-1 border-t"style=border-color:var(--border-color)><div class="relative rounded-md overflow-hidden font-mono text-[11px]"style="background:#020617;border:1px solid rgba(15, 23, 42, 0.7)"><pre class="m-0 p-3 whitespace-pre-wrap overflow-x-auto"style=color:var(--text-secondary)></pre><button type=button class="absolute top-1 right-1 px-2 py-1 rounded text-[11px] flex items-center gap-1"style="background:rgba(15, 23, 42, 0.85);color:var(--text-secondary);border:1px solid rgba(148, 163, 184, 0.5)">`), _tmpl$6 = /* @__PURE__ */ template(`<div class="rounded-lg border mt-3 mb-2"style=background:var(--bg-secondary);border-color:var(--border-color)><button type=button class="w-full flex items-center justify-between px-3 py-2 text-xs"style=color:var(--text-secondary)><div class="flex items-center gap-2 min-w-0"><svg class="w-3.5 h-3.5 flex-shrink-0"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2></path></svg><span class="font-medium truncate"style=color:var(--text-primary)></span></div><div class="flex items-center gap-2"><span class=text-[11px] style=color:var(--text-muted)>`);
const CommandPreview = (props) => {
  const [expanded, setExpanded] = createSignal(!(props.defaultCollapsed ?? true));
  const [copied, setCopied] = createSignal(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(props.command || "");
      setCopied(true);
      addNotification("Command copied to clipboard", "success");
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("[CommandPreview] Failed to copy command:", err);
      addNotification("Failed to copy command", "error");
    }
  };
  const labelText = () => props.label || "Command preview";
  return (() => {
    var _el$ = _tmpl$6(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$4.nextSibling, _el$8 = _el$3.nextSibling, _el$0 = _el$8.firstChild;
    _el$2.$$click = () => setExpanded(!expanded());
    insert(_el$6, labelText);
    insert(_el$3, createComponent(Show, {
      get when() {
        return props.badge;
      },
      get children() {
        var _el$7 = _tmpl$();
        insert(_el$7, () => props.badge);
        return _el$7;
      }
    }), null);
    insert(_el$8, createComponent(Show, {
      get when() {
        return props.description;
      },
      get children() {
        var _el$9 = _tmpl$2();
        insert(_el$9, () => props.description);
        return _el$9;
      }
    }), _el$0);
    insert(_el$0, () => expanded() ? "Hide" : "Show");
    insert(_el$, createComponent(Show, {
      get when() {
        return expanded();
      },
      get children() {
        var _el$1 = _tmpl$5(), _el$10 = _el$1.firstChild, _el$11 = _el$10.firstChild, _el$12 = _el$11.nextSibling;
        insert(_el$11, () => props.command || "# Command preview will appear here");
        _el$12.$$click = handleCopy;
        insert(_el$12, createComponent(Show, {
          get when() {
            return !copied();
          },
          fallback: "Copied",
          get children() {
            return [_tmpl$3(), "Copy"];
          }
        }));
        insert(_el$1, createComponent(Show, {
          get when() {
            return props.description;
          },
          get children() {
            var _el$14 = _tmpl$4();
            insert(_el$14, () => props.description);
            return _el$14;
          }
        }), null);
        return _el$1;
      }
    }), null);
    createRenderEffect(() => setAttribute(_el$5, "d", expanded() ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"));
    return _el$;
  })();
};
delegateEvents(["click"]);

export { CommandPreview as C };
//# sourceMappingURL=CommandPreview-C6bYxIqz.js.map
