import { c as createSignal, t as template, i as insert, d as createComponent, S as Show, f as createRenderEffect, e as setAttribute, v as delegateEvents } from './index-Bh-O-sIc.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="px-3 py-1.5 rounded-lg text-sm"style="background:rgba(239, 68, 68, 0.1);color:var(--error-color)">`), _tmpl$2 = /* @__PURE__ */ template(`<div class=spinner style=width:16px;height:16px>`), _tmpl$3 = /* @__PURE__ */ template(`<button class="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"style="background:var(--bg-secondary);color:var(--warning-color);border:1px solid rgba(245, 158, 11, 0.4)">`), _tmpl$4 = /* @__PURE__ */ template(`<div class="flex flex-col h-full"><div class="flex items-center justify-between mb-2"><div class="flex items-center gap-2"></div><div class="flex items-center gap-2"><button class="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)">Cancel</button><button class="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"style=background:var(--accent-primary);color:white></button></div></div><textarea class="flex-1 w-full p-4 rounded-lg font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color);fontFamily:ui-monospace, SFMono-Regular, &quot;SF Mono&quot;, Menlo, Consolas, &quot;Liberation Mono&quot;, monospace">`);
const YAMLEditor = (props) => {
  const [editedYaml, setEditedYaml] = createSignal(props.yaml);
  const [saving, setSaving] = createSignal(false);
  const [dryRunning, setDryRunning] = createSignal(false);
  const [error, setError] = createSignal(null);
  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      await props.onSave?.(editedYaml());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save YAML");
    } finally {
      setSaving(false);
    }
  };
  const handleDryRun = async () => {
    if (!props.onDryRun) return;
    setError(null);
    setDryRunning(true);
    try {
      await props.onDryRun(editedYaml());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dry run failed");
    } finally {
      setDryRunning(false);
    }
  };
  const handleCancel = () => {
    setEditedYaml(props.yaml);
    setError(null);
    props.onCancel?.();
  };
  return (() => {
    var _el$ = _tmpl$4(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$5 = _el$3.nextSibling, _el$6 = _el$5.firstChild, _el$9 = _el$6.nextSibling, _el$1 = _el$2.nextSibling;
    insert(_el$3, createComponent(Show, {
      get when() {
        return error();
      },
      get children() {
        var _el$4 = _tmpl$();
        insert(_el$4, error);
        return _el$4;
      }
    }));
    _el$6.$$click = handleCancel;
    insert(_el$5, createComponent(Show, {
      get when() {
        return props.onDryRun;
      },
      get children() {
        var _el$7 = _tmpl$3();
        _el$7.$$click = handleDryRun;
        insert(_el$7, createComponent(Show, {
          get when() {
            return dryRunning() || props.loading;
          },
          fallback: "Dry run",
          get children() {
            return [_tmpl$2(), "Dry running..."];
          }
        }));
        createRenderEffect(() => _el$7.disabled = saving() || props.loading || dryRunning());
        return _el$7;
      }
    }), _el$9);
    _el$9.$$click = handleSave;
    insert(_el$9, createComponent(Show, {
      get when() {
        return saving() || props.loading;
      },
      fallback: "Save",
      get children() {
        return [_tmpl$2(), "Saving..."];
      }
    }));
    _el$1.$$input = (e) => setEditedYaml(e.currentTarget.value);
    setAttribute(_el$1, "spellcheck", false);
    createRenderEffect((_p$) => {
      var _v$ = saving() || props.loading, _v$2 = saving() || props.loading || editedYaml() === props.yaml;
      _v$ !== _p$.e && (_el$6.disabled = _p$.e = _v$);
      _v$2 !== _p$.t && (_el$9.disabled = _p$.t = _v$2);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    createRenderEffect(() => _el$1.value = editedYaml());
    return _el$;
  })();
};
delegateEvents(["click", "input"]);

export { YAMLEditor as Y };
//# sourceMappingURL=YAMLEditor-Cvfm5wCJ.js.map
