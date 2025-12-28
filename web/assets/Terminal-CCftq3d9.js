import { j as createResource, k as api, c as createSignal, o as onMount, t as template, i as insert, d as createComponent, F as For, f as createRenderEffect, S as Show, m as memo, am as LocalTerminal, h as setStyleProperty, e as setAttribute, v as delegateEvents } from './index-NnaOo1cf.js';

var _tmpl$$1 = /* @__PURE__ */ template(`<select class="px-3 py-1.5 text-sm rounded-md border"style=background:var(--bg-primary);color:var(--text-primary);border-color:var(--border-color);outline:none;cursor:pointer>`), _tmpl$2$1 = /* @__PURE__ */ template(`<span class=text-xs style=color:var(--text-muted)>(Change takes effect on next terminal connection)`), _tmpl$3$1 = /* @__PURE__ */ template(`<div class="flex items-center gap-3"><label class=text-sm style=color:var(--text-secondary)>Shell:`), _tmpl$4 = /* @__PURE__ */ template(`<span class=text-sm style=color:var(--text-muted)>Loading shells...`), _tmpl$5 = /* @__PURE__ */ template(`<option> `);
const ShellSelector = (props) => {
  const [shells] = createResource(() => api.getAvailableShells().then((res) => res.shells || []));
  const [selected, setSelected] = createSignal(props.selectedShell || "");
  onMount(() => {
    try {
      const saved = localStorage.getItem("kubegraf-preferred-shell");
      if (saved) {
        setSelected(saved);
        props.onShellChange(saved);
      }
    } catch (e) {
      console.error("Failed to load shell preference:", e);
    }
  });
  const handleChange = (shellName) => {
    setSelected(shellName);
    try {
      localStorage.setItem("kubegraf-preferred-shell", shellName);
    } catch (e) {
      console.error("Failed to save shell preference:", e);
    }
    props.onShellChange(shellName);
  };
  return (() => {
    var _el$ = _tmpl$3$1(); _el$.firstChild;
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!(!shells.loading && shells()))() && shells().length > 0;
      },
      get fallback() {
        return _tmpl$4();
      },
      get children() {
        return [(() => {
          var _el$3 = _tmpl$$1();
          _el$3.addEventListener("mouseleave", (e) => {
            e.currentTarget.style["border-color"] = "var(--border-color)";
          });
          _el$3.addEventListener("mouseenter", (e) => {
            e.currentTarget.style["border-color"] = "var(--accent-primary)";
          });
          _el$3.addEventListener("change", (e) => handleChange(e.currentTarget.value));
          insert(_el$3, createComponent(For, {
            get each() {
              return shells();
            },
            children: (shell) => (() => {
              var _el$6 = _tmpl$5(), _el$7 = _el$6.firstChild;
              insert(_el$6, () => shell.display, _el$7);
              insert(_el$6, () => shell.name === selected() ? "✓" : "", null);
              createRenderEffect(() => _el$6.value = shell.name);
              return _el$6;
            })()
          }));
          createRenderEffect(() => _el$3.value = selected());
          return _el$3;
        })(), createComponent(Show, {
          get when() {
            return selected();
          },
          get children() {
            return _tmpl$2$1();
          }
        })];
      }
    }), null);
    return _el$;
  })();
};

var _tmpl$ = /* @__PURE__ */ template(`<svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M6 18L18 6M6 6l12 12">`), _tmpl$2 = /* @__PURE__ */ template(`<div class="flex flex-col h-full"><div class="flex items-center justify-between mb-4"><div class=flex-1><h1 class="text-2xl font-bold"style=color:var(--text-primary)>Terminal</h1><p style=color:var(--text-secondary)>Local system terminal</p></div><div class="flex items-center mr-4"></div><div class="flex items-center gap-2"style=z-index:10;position:relative><button class="p-2 rounded transition-colors"title="Open in New Window"style="color:var(--text-secondary);background:transparent;border:1px solid var(--border-color);cursor:pointer;pointer-events:auto"><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></button><button class="p-2 rounded transition-colors"style="color:var(--text-secondary);background:transparent;border:1px solid var(--border-color);cursor:pointer;pointer-events:auto">`), _tmpl$3 = /* @__PURE__ */ template(`<svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4">`);
const TerminalPage = () => {
  const [isMaximized, setIsMaximized] = createSignal(false);
  const [selectedShell, setSelectedShell] = createSignal(void 0);
  const [key, setKey] = createSignal(0);
  const handleShellChange = (shellName) => {
    setSelectedShell(shellName);
    setKey((prev) => prev + 1);
  };
  const handleOpenInNewWindow = () => {
    console.log("[Terminal] Open in new window clicked");
    const currentUrl = window.location.origin + window.location.pathname;
    const terminalUrl = `${currentUrl}#terminal`;
    console.log("[Terminal] Opening URL:", terminalUrl);
    const newWindow = window.open(terminalUrl, "_blank", "width=1200,height=800,menubar=no,toolbar=no,location=no,status=no");
    if (newWindow) {
      newWindow.focus();
    } else {
      console.error("[Terminal] Failed to open new window - popup blocked?");
    }
  };
  const containerHeight = () => isMaximized() ? "calc(100vh - 80px)" : "calc(100vh - 120px)";
  return (() => {
    var _el$ = _tmpl$2(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling, _el$7 = _el$6.nextSibling, _el$8 = _el$7.firstChild, _el$9 = _el$8.nextSibling;
    insert(_el$6, createComponent(ShellSelector, {
      get selectedShell() {
        return selectedShell();
      },
      onShellChange: handleShellChange
    }));
    _el$8.addEventListener("mouseleave", (e) => {
      e.currentTarget.style.background = "transparent";
      e.currentTarget.style.color = "var(--text-secondary)";
    });
    _el$8.addEventListener("mouseenter", (e) => {
      e.currentTarget.style.background = "var(--bg-tertiary)";
      e.currentTarget.style.color = "var(--text-primary)";
    });
    _el$8.$$click = handleOpenInNewWindow;
    _el$9.addEventListener("mouseleave", (e) => {
      e.currentTarget.style.background = "transparent";
      e.currentTarget.style.color = "var(--text-secondary)";
    });
    _el$9.addEventListener("mouseenter", (e) => {
      e.currentTarget.style.background = "var(--bg-tertiary)";
      e.currentTarget.style.color = "var(--text-primary)";
    });
    _el$9.$$click = () => {
      console.log("[Terminal] Maximize clicked, current state:", isMaximized());
      setIsMaximized(!isMaximized());
      console.log("[Terminal] New state:", !isMaximized());
    };
    insert(_el$9, createComponent(Show, {
      get when() {
        return isMaximized();
      },
      get fallback() {
        return _tmpl$3();
      },
      get children() {
        return _tmpl$();
      }
    }));
    insert(_el$, createComponent(LocalTerminal, {
      get key() {
        return key();
      },
      get preferredShell() {
        return selectedShell();
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$ = containerHeight(), _v$2 = isMaximized() ? "Restore" : "Maximize";
      _v$ !== _p$.e && setStyleProperty(_el$, "height", _p$.e = _v$);
      _v$2 !== _p$.t && setAttribute(_el$9, "title", _p$.t = _v$2);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    return _el$;
  })();
};
delegateEvents(["click"]);

export { TerminalPage as default };
//# sourceMappingURL=Terminal-CCftq3d9.js.map
