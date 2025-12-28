import { d as createComponent, t as template, i as insert, u as addEventListener, f as createRenderEffect, e as setAttribute, S as Show, m as memo, h as setStyleProperty, g as className, v as delegateEvents, c as createSignal, F as For, M as Modal } from './index-B8I71-mz.js';

var _tmpl$$1 = /* @__PURE__ */ template(`<div class="flex items-center gap-2"><div class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium"style="background:rgba(6, 182, 212, 0.15);border-color:rgba(6, 182, 212, 0.3);color:var(--text-primary)"><svg class="w-4 h-4"viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 style=color:#06b6d4><polyline points="20 6 9 17 4 12"></polyline></svg><span> selected</span></div><button class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"title="Clear selection"style="background:rgba(139, 92, 246, 0.2);color:#8b5cf6;border:1px solid rgba(139, 92, 246, 0.3)">Clear</button><button class="px-3 py-1.5 rounded-lg text-sm font-bold transition-all hover:opacity-90 flex items-center gap-1.5"style="background:linear-gradient(135deg, #ef4444 0%, #dc2626 100%);color:#fff"><svg class="w-4 h-4"viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>Delete (<!>)`), _tmpl$2$1 = /* @__PURE__ */ template(`<svg class="w-3 h-3 text-white"viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=3><polyline points="20 6 9 17 4 12">`), _tmpl$3$1 = /* @__PURE__ */ template(`<div class="flex items-center justify-center cursor-pointer w-full h-full"><div>`), _tmpl$4$1 = /* @__PURE__ */ template(`<div class="w-2 h-0.5 bg-white">`), _tmpl$5 = /* @__PURE__ */ template(`<div class="flex items-center justify-center cursor-pointer w-full h-full"><div class="w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0">`);
const BulkActions = (props) => {
  return createComponent(Show, {
    get when() {
      return props.selectedCount > 0;
    },
    get children() {
      var _el$ = _tmpl$$1(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling, _el$5 = _el$4.firstChild, _el$6 = _el$2.nextSibling, _el$7 = _el$6.nextSibling, _el$8 = _el$7.firstChild, _el$9 = _el$8.nextSibling, _el$1 = _el$9.nextSibling; _el$1.nextSibling;
      insert(_el$4, () => props.selectedCount, _el$5);
      addEventListener(_el$6, "click", props.onDeselectAll, true);
      addEventListener(_el$7, "click", props.onDelete, true);
      insert(_el$7, () => props.selectedCount, _el$1);
      createRenderEffect(() => setAttribute(_el$7, "title", `Delete ${props.selectedCount} ${props.resourceType}`));
      return _el$;
    }
  });
};
const SelectionCheckbox = (props) => {
  return (() => {
    var _el$10 = _tmpl$3$1(), _el$11 = _el$10.firstChild;
    _el$10.$$click = (e) => {
      e.stopPropagation();
      if (!props.disabled) {
        props.onChange(!props.checked);
      }
    };
    insert(_el$11, createComponent(Show, {
      get when() {
        return props.checked;
      },
      get children() {
        return _tmpl$2$1();
      }
    }));
    createRenderEffect((_p$) => {
      var _v$ = `w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${props.checked ? "scale-110" : "scale-100"}`, _v$2 = props.checked ? "#06b6d4" : "var(--border-color, rgba(128, 128, 128, 0.5))", _v$3 = props.checked ? "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)" : "var(--bg-tertiary, rgba(128, 128, 128, 0.15))", _v$4 = props.disabled ? 0.5 : 1;
      _v$ !== _p$.e && className(_el$11, _p$.e = _v$);
      _v$2 !== _p$.t && setStyleProperty(_el$11, "border-color", _p$.t = _v$2);
      _v$3 !== _p$.a && setStyleProperty(_el$11, "background", _p$.a = _v$3);
      _v$4 !== _p$.o && setStyleProperty(_el$11, "opacity", _p$.o = _v$4);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0
    });
    return _el$10;
  })();
};
const SelectAllCheckbox = (props) => {
  return (() => {
    var _el$13 = _tmpl$5(), _el$14 = _el$13.firstChild;
    _el$13.$$click = (e) => {
      e.stopPropagation();
      props.onChange(!props.checked);
    };
    insert(_el$14, createComponent(Show, {
      get when() {
        return props.checked;
      },
      get children() {
        return _tmpl$2$1();
      }
    }), null);
    insert(_el$14, createComponent(Show, {
      get when() {
        return memo(() => !!props.indeterminate)() && !props.checked;
      },
      get children() {
        return _tmpl$4$1();
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$5 = props.checked ? "Deselect all" : "Select all", _v$6 = props.checked || props.indeterminate ? "#06b6d4" : "var(--border-color, rgba(128, 128, 128, 0.5))", _v$7 = props.checked || props.indeterminate ? "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)" : "var(--bg-tertiary, rgba(128, 128, 128, 0.15))";
      _v$5 !== _p$.e && setAttribute(_el$13, "title", _p$.e = _v$5);
      _v$6 !== _p$.t && setStyleProperty(_el$14, "border-color", _p$.t = _v$6);
      _v$7 !== _p$.a && setStyleProperty(_el$14, "background", _p$.a = _v$7);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0
    });
    return _el$13;
  })();
};
delegateEvents(["click"]);

var _tmpl$ = /* @__PURE__ */ template(`<div class=spinner style=width:16px;height:16px>`), _tmpl$2 = /* @__PURE__ */ template(`<div class=space-y-4><div class="p-4 rounded-lg border-l-4 flex items-start gap-3"style="background:rgba(239, 68, 68, 0.1);border-color:#ef4444"><svg class="w-6 h-6 flex-shrink-0 mt-0.5"viewBox="0 0 24 24"fill=none stroke=#ef4444 stroke-width=2><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1=12 y1=9 x2=12 y2=13></line><line x1=12 y1=17 x2=12.01 y2=17></line></svg><div><div class="font-bold mb-1"style=color:#ef4444>Permanent Action</div><div class=text-sm style=color:var(--text-secondary)>You are about to delete <strong></strong> <!>. This action cannot be undone.</div></div></div><div class=space-y-2><div class="text-sm font-semibold"style=color:var(--text-primary)>Resources to be deleted:</div><div class="max-h-60 overflow-y-auto space-y-1 p-3 rounded-lg"style=background:var(--bg-secondary)></div></div><div class=space-y-2><label class="text-sm font-medium"style=color:var(--text-primary)>Type <span class="font-mono px-2 py-0.5 rounded"style=background:var(--bg-tertiary);color:#ef4444></span> to confirm:</label><input type=text class="w-full px-4 py-2 rounded-lg text-sm font-mono"autofocus style=background:var(--bg-secondary);color:var(--text-primary)></div><div class="flex items-center gap-3 pt-4"><button class="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)">Cancel</button><button class="flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"style=color:#fff>`), _tmpl$3 = /* @__PURE__ */ template(`<span class="text-xs px-2 py-0.5 rounded"style=background:var(--bg-primary);color:var(--text-muted)>`), _tmpl$4 = /* @__PURE__ */ template(`<div class="flex items-center gap-2 py-2 px-3 rounded"style=background:var(--bg-tertiary)><svg class="w-4 h-4 flex-shrink-0"viewBox="0 0 24 24"fill=none stroke=#ef4444 stroke-width=2><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg><span class="text-sm font-mono flex-1"style=color:var(--text-primary)>`);
const BulkDeleteModal = (props) => {
  const [deleting, setDeleting] = createSignal(false);
  const [confirmText, setConfirmText] = createSignal("");
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await props.onConfirm();
      props.onClose();
      setConfirmText("");
    } catch (error) {
      console.error("Bulk delete failed:", error);
    } finally {
      setDeleting(false);
    }
  };
  const expectedText = `delete ${props.selectedItems.length} ${props.resourceType.toLowerCase()}`;
  const isConfirmValid = () => confirmText().toLowerCase() === expectedText;
  return createComponent(Modal, {
    get isOpen() {
      return props.isOpen;
    },
    onClose: () => {
      if (!deleting()) {
        props.onClose();
        setConfirmText("");
      }
    },
    get title() {
      return `Delete ${props.selectedItems.length} ${props.resourceType}`;
    },
    get children() {
      var _el$ = _tmpl$2(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling, _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling, _el$7 = _el$6.firstChild, _el$8 = _el$7.nextSibling, _el$9 = _el$8.nextSibling, _el$1 = _el$9.nextSibling; _el$1.nextSibling; var _el$10 = _el$2.nextSibling, _el$11 = _el$10.firstChild, _el$12 = _el$11.nextSibling, _el$13 = _el$10.nextSibling, _el$14 = _el$13.firstChild, _el$15 = _el$14.firstChild, _el$17 = _el$15.nextSibling, _el$18 = _el$14.nextSibling, _el$19 = _el$13.nextSibling, _el$20 = _el$19.firstChild, _el$21 = _el$20.nextSibling;
      insert(_el$8, () => props.selectedItems.length);
      insert(_el$6, () => props.resourceType.toLowerCase(), _el$1);
      insert(_el$12, createComponent(For, {
        get each() {
          return props.selectedItems;
        },
        children: (item) => (() => {
          var _el$23 = _tmpl$4(), _el$24 = _el$23.firstChild, _el$25 = _el$24.nextSibling;
          insert(_el$25, () => item.name);
          insert(_el$23, createComponent(Show, {
            get when() {
              return item.namespace;
            },
            get children() {
              var _el$26 = _tmpl$3();
              insert(_el$26, () => item.namespace);
              return _el$26;
            }
          }), null);
          return _el$23;
        })()
      }));
      insert(_el$17, expectedText);
      _el$18.$$input = (e) => setConfirmText(e.currentTarget.value);
      setAttribute(_el$18, "placeholder", expectedText);
      _el$20.$$click = () => {
        props.onClose();
        setConfirmText("");
      };
      _el$21.$$click = handleDelete;
      insert(_el$21, createComponent(Show, {
        get when() {
          return deleting();
        },
        get fallback() {
          return ["Delete ", memo(() => props.selectedItems.length), " ", memo(() => props.resourceType)];
        },
        get children() {
          return [_tmpl$(), "Deleting..."];
        }
      }));
      createRenderEffect((_p$) => {
        var _v$ = `2px solid ${isConfirmValid() ? "#22c55e" : "var(--border-color)"}`, _v$2 = deleting(), _v$3 = deleting(), _v$4 = !isConfirmValid() || deleting(), _v$5 = isConfirmValid() ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" : "var(--bg-tertiary)";
        _v$ !== _p$.e && setStyleProperty(_el$18, "border", _p$.e = _v$);
        _v$2 !== _p$.t && (_el$18.disabled = _p$.t = _v$2);
        _v$3 !== _p$.a && (_el$20.disabled = _p$.a = _v$3);
        _v$4 !== _p$.o && (_el$21.disabled = _p$.o = _v$4);
        _v$5 !== _p$.i && setStyleProperty(_el$21, "background", _p$.i = _v$5);
        return _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0,
        o: void 0,
        i: void 0
      });
      createRenderEffect(() => _el$18.value = confirmText());
      return _el$;
    }
  });
};
delegateEvents(["input", "click"]);

function useBulkSelection() {
  const [selectedItems, setSelectedItems] = createSignal(/* @__PURE__ */ new Set());
  const getItemKey = (item) => {
    return item.namespace ? `${item.namespace}/${item.name}` : item.name;
  };
  const isSelected = (item) => {
    return selectedItems().has(getItemKey(item));
  };
  const toggleSelection = (item) => {
    const key = getItemKey(item);
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  const selectAll = (items) => {
    setSelectedItems(new Set(items.map(getItemKey)));
  };
  const deselectAll = () => {
    setSelectedItems(/* @__PURE__ */ new Set());
  };
  const getSelectedItems = (allItems) => {
    const selected = selectedItems();
    return allItems.filter((item) => selected.has(getItemKey(item)));
  };
  const selectedCount = () => {
    return selectedItems().size;
  };
  return {
    isSelected,
    toggleSelection,
    selectAll,
    deselectAll,
    getSelectedItems,
    selectedCount,
    selectedItems
    // Raw Set accessor if needed
  };
}

export { BulkActions as B, SelectAllCheckbox as S, SelectionCheckbox as a, BulkDeleteModal as b, useBulkSelection as u };
//# sourceMappingURL=useBulkSelection-CgTI3QZq.js.map
