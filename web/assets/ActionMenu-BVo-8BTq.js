import { c as createSignal, n as createEffect, E as onCleanup, t as template, i as insert, d as createComponent, _ as Portal, F as For, S as Show, f as createRenderEffect, e as setAttribute, m as memo, $ as classList, h as setStyleProperty, L as use, v as delegateEvents } from './index-Bh-O-sIc.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="fixed py-2 rounded-lg shadow-xl min-w-[180px]"style="background:var(--bg-card);border:1px solid var(--border-color);box-shadow:0 10px 40px rgba(0, 0, 0, 0.3);z-index:9998">`), _tmpl$2 = /* @__PURE__ */ template(`<div class=relative style=display:inline-block><button class="flex items-center justify-center p-1 rounded transition-all hover:bg-opacity-80"title=Actions style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color);cursor:pointer"><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z">`), _tmpl$3 = /* @__PURE__ */ template(`<div class="my-1 border-t"style=border-color:var(--border-color)>`), _tmpl$4 = /* @__PURE__ */ template(`<div class=spinner style=width:16px;height:16px>`), _tmpl$5 = /* @__PURE__ */ template(`<button class="w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors"style=background:transparent;border:none;text-align:left>`), _tmpl$6 = /* @__PURE__ */ template(`<svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2>`);
const icons = {
  shell: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  portforward: "M13 10V3L4 14h7v7l9-11h-7z",
  logs: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  yaml: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
  describe: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  restart: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  delete: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  scale: "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4",
  details: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  pod: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  events: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
};
const ActionMenu = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [menuPosition, setMenuPosition] = createSignal({
    top: 0,
    left: 0
  });
  let buttonRef;
  let menuRef;
  const toggleMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const newState = !isOpen();
    if (buttonRef && newState) {
      const rect = buttonRef.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: Math.max(10, rect.right - 180)
        // Menu width approximately 180px
      });
    }
    setIsOpen(newState);
    props.onOpenChange?.(newState);
  };
  const executeAction = (action) => {
    console.log("ActionMenu: Executing action:", action.label);
    setIsOpen(false);
    props.onOpenChange?.(false);
    try {
      action.onClick();
    } catch (err) {
      console.error("ActionMenu: Error executing action:", err);
    }
  };
  createEffect(() => {
    if (!isOpen()) return;
    const handleClickOutside = (e) => {
      const target = e.target;
      if (buttonRef?.contains(target)) return;
      if (menuRef?.contains(target)) return;
      setIsOpen(false);
      props.onOpenChange?.(false);
    };
    document.addEventListener("click", handleClickOutside, true);
    onCleanup(() => {
      document.removeEventListener("click", handleClickOutside, true);
    });
  });
  return (() => {
    var _el$ = _tmpl$2(), _el$2 = _el$.firstChild;
    _el$2.$$click = toggleMenu;
    var _ref$ = buttonRef;
    typeof _ref$ === "function" ? use(_ref$, _el$2) : buttonRef = _el$2;
    insert(_el$, createComponent(Show, {
      get when() {
        return isOpen();
      },
      get children() {
        return createComponent(Portal, {
          get children() {
            var _el$3 = _tmpl$();
            var _ref$2 = menuRef;
            typeof _ref$2 === "function" ? use(_ref$2, _el$3) : menuRef = _el$3;
            insert(_el$3, createComponent(For, {
              get each() {
                return props.actions;
              },
              children: (action) => [createComponent(Show, {
                get when() {
                  return action.divider;
                },
                get children() {
                  return _tmpl$3();
                }
              }), (() => {
                var _el$5 = _tmpl$5();
                _el$5.addEventListener("mouseleave", (e) => {
                  e.currentTarget.style.background = "transparent";
                });
                _el$5.addEventListener("mouseenter", (e) => {
                  if (!action.disabled && !action.loading) {
                    e.currentTarget.style.background = action.variant === "danger" ? "rgba(239, 68, 68, 0.1)" : "var(--bg-tertiary)";
                  }
                });
                _el$5.$$click = (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!action.disabled && !action.loading) {
                    executeAction(action);
                  }
                };
                insert(_el$5, createComponent(Show, {
                  get when() {
                    return action.loading;
                  },
                  get fallback() {
                    return (() => {
                      var _el$7 = _tmpl$6(), _el$8 = _el$7.firstChild;
                      createRenderEffect(() => setAttribute(_el$8, "d", icons[action.icon] || icons.details));
                      return _el$7;
                    })();
                  },
                  get children() {
                    return _tmpl$4();
                  }
                }), null);
                insert(_el$5, (() => {
                  var _c$ = memo(() => !!action.loading);
                  return () => _c$() ? `${action.label}...` : action.label;
                })(), null);
                createRenderEffect((_p$) => {
                  var _v$3 = action.disabled || action.loading, _v$4 = {
                    "opacity-50 cursor-not-allowed": action.disabled || action.loading
                  }, _v$5 = action.variant === "danger" ? "var(--error-color)" : "var(--text-primary)", _v$6 = action.disabled || action.loading ? "not-allowed" : "pointer";
                  _v$3 !== _p$.e && (_el$5.disabled = _p$.e = _v$3);
                  _p$.t = classList(_el$5, _v$4, _p$.t);
                  _v$5 !== _p$.a && setStyleProperty(_el$5, "color", _p$.a = _v$5);
                  _v$6 !== _p$.o && setStyleProperty(_el$5, "cursor", _p$.o = _v$6);
                  return _p$;
                }, {
                  e: void 0,
                  t: void 0,
                  a: void 0,
                  o: void 0
                });
                return _el$5;
              })()]
            }));
            createRenderEffect((_p$) => {
              var _v$ = `${menuPosition().top}px`, _v$2 = `${menuPosition().left}px`;
              _v$ !== _p$.e && setStyleProperty(_el$3, "top", _p$.e = _v$);
              _v$2 !== _p$.t && setStyleProperty(_el$3, "left", _p$.t = _v$2);
              return _p$;
            }, {
              e: void 0,
              t: void 0
            });
            return _el$3;
          }
        });
      }
    }), null);
    return _el$;
  })();
};
delegateEvents(["click"]);

export { ActionMenu as A };
//# sourceMappingURL=ActionMenu-BVo-8BTq.js.map
