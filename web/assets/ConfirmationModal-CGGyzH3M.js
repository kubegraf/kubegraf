import { d as createComponent, t as template, i as insert, S as Show, m as memo, u as addEventListener, f as createRenderEffect, h as setStyleProperty, e as setAttribute, M as Modal, v as delegateEvents } from './index-Bh-O-sIc.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="p-3 rounded-lg mb-4"style=background:var(--bg-tertiary)>`), _tmpl$2 = /* @__PURE__ */ template(`<span class="flex items-center gap-2"><svg class="animate-spin h-4 w-4"fill=none viewBox="0 0 24 24"><circle class=opacity-25 cx=12 cy=12 r=10 stroke=currentColor stroke-width=4></circle><path class=opacity-75 fill=currentColor d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>...`), _tmpl$3 = /* @__PURE__ */ template(`<div class=space-y-4><div class="flex items-start gap-3"><div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"><svg class="w-6 h-6"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2></path></svg></div><div class=flex-1><p class="text-sm mb-3"style=color:var(--text-primary)></p></div></div><div class="flex justify-end gap-3 pt-4 border-t"style=border-color:var(--border-color)><button class="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"style=background:var(--bg-tertiary);color:var(--text-primary)></button><button class="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"style=color:white>`), _tmpl$4 = /* @__PURE__ */ template(`<div class=text-sm style=color:var(--text-primary)>`), _tmpl$5 = /* @__PURE__ */ template(`<div class=space-y-2>`), _tmpl$6 = /* @__PURE__ */ template(`<div><div class="text-xs font-medium mb-1"style=color:var(--text-muted)></div><div class=text-sm style=color:var(--text-primary)>`);
const ConfirmationModal = (props) => {
  const getVariantStyles = () => {
    switch (props.variant || "danger") {
      case "danger":
        return {
          iconBg: "rgba(239, 68, 68, 0.15)",
          iconColor: "var(--error-color)",
          buttonBg: "var(--error-color)",
          iconPath: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        };
      case "warning":
        return {
          iconBg: "rgba(245, 158, 11, 0.15)",
          iconColor: "var(--warning-color)",
          buttonBg: "var(--warning-color)",
          iconPath: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        };
      default:
        return {
          iconBg: "rgba(59, 130, 246, 0.15)",
          iconColor: "var(--accent-primary)",
          buttonBg: "var(--accent-primary)",
          iconPath: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        };
    }
  };
  const variantStyles = getVariantStyles();
  return createComponent(Modal, {
    get isOpen() {
      return props.isOpen;
    },
    get onClose() {
      return props.onClose;
    },
    get title() {
      return props.title;
    },
    get size() {
      return props.size || "md";
    },
    get children() {
      var _el$ = _tmpl$3(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$3.nextSibling, _el$7 = _el$6.firstChild, _el$9 = _el$2.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling;
      insert(_el$7, () => props.message);
      insert(_el$6, createComponent(Show, {
        get when() {
          return props.details;
        },
        get children() {
          var _el$8 = _tmpl$();
          insert(_el$8, (() => {
            var _c$ = memo(() => typeof props.details === "string");
            return () => _c$() ? (() => {
              var _el$13 = _tmpl$4();
              insert(_el$13, () => props.details);
              return _el$13;
            })() : (() => {
              var _el$14 = _tmpl$5();
              insert(_el$14, () => props.details.map((detail) => (() => {
                var _el$15 = _tmpl$6(), _el$16 = _el$15.firstChild, _el$17 = _el$16.nextSibling;
                insert(_el$16, () => detail.label);
                insert(_el$17, () => detail.value);
                return _el$15;
              })()));
              return _el$14;
            })();
          })());
          return _el$8;
        }
      }), null);
      addEventListener(_el$0, "click", props.onClose, true);
      insert(_el$0, () => props.cancelText || "Cancel");
      addEventListener(_el$1, "click", props.onConfirm, true);
      insert(_el$1, createComponent(Show, {
        get when() {
          return props.loading;
        },
        get fallback() {
          return props.confirmText || "Confirm";
        },
        get children() {
          var _el$10 = _tmpl$2(), _el$11 = _el$10.firstChild, _el$12 = _el$11.nextSibling;
          insert(_el$10, () => props.confirmText || "Confirm", _el$12);
          return _el$10;
        }
      }));
      createRenderEffect((_p$) => {
        var _v$ = variantStyles.iconBg, _v$2 = variantStyles.iconColor, _v$3 = variantStyles.iconPath, _v$4 = props.loading, _v$5 = props.loading, _v$6 = variantStyles.buttonBg;
        _v$ !== _p$.e && setStyleProperty(_el$3, "background", _p$.e = _v$);
        _v$2 !== _p$.t && setStyleProperty(_el$4, "color", _p$.t = _v$2);
        _v$3 !== _p$.a && setAttribute(_el$5, "d", _p$.a = _v$3);
        _v$4 !== _p$.o && (_el$0.disabled = _p$.o = _v$4);
        _v$5 !== _p$.i && (_el$1.disabled = _p$.i = _v$5);
        _v$6 !== _p$.n && setStyleProperty(_el$1, "background", _p$.n = _v$6);
        return _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0,
        o: void 0,
        i: void 0,
        n: void 0
      });
      return _el$;
    }
  });
};
delegateEvents(["click"]);

export { ConfirmationModal as C };
//# sourceMappingURL=ConfirmationModal-CGGyzH3M.js.map
