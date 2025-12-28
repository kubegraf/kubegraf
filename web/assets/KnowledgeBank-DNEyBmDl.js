import { c as createSignal, t as template, i as insert, d as createComponent, S as Show, F as For, m as memo, f as createRenderEffect, h as setStyleProperty, G as addNotification, v as delegateEvents } from './index-NnaOo1cf.js';

var _tmpl$ = /* @__PURE__ */ template(`<div style="background:var(--bg-secondary);border-radius:6px;padding:8px 12px;margin-bottom:16px;font-size:13px;color:var(--text-primary);display:flex;align-items:center;gap:8px">📄 <!> (<!> KB)`), _tmpl$2 = /* @__PURE__ */ template(`<div style="margin-top:16px;background:rgba(239, 68, 68, 0.1);border:1px solid rgba(239, 68, 68, 0.3);border-radius:8px;padding:12px 16px;color:var(--error-color)"><strong>Error:</strong> `), _tmpl$3 = /* @__PURE__ */ template(`<div style=margin-top:12px;font-size:12px;color:var(--error-color)><strong>Errors:</strong><ul style="margin:4px 0 0;padding-left:20px">`), _tmpl$4 = /* @__PURE__ */ template(`<div style="margin-top:16px;background:rgba(16, 185, 129, 0.1);border:1px solid rgba(16, 185, 129, 0.3);border-radius:8px;padding:16px"><h4 style="margin:0 0 12px;color:var(--success-color);font-size:14px">✅ Import Complete</h4><div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:12px"><div style=text-align:center><div style=font-size:24px;font-weight:700;color:var(--success-color)></div><div style=font-size:11px;color:var(--text-muted)>Imported</div></div><div style=text-align:center><div style=font-size:24px;font-weight:700;color:var(--text-secondary)></div><div style=font-size:11px;color:var(--text-muted)>Skipped</div></div><div style=text-align:center><div style=font-size:24px;font-weight:700;color:var(--error-color)></div><div style=font-size:11px;color:var(--text-muted)>Errors`), _tmpl$5 = /* @__PURE__ */ template(`<div style="padding:24px;max-width:900px;margin:0 auto"><div style=margin-bottom:32px><h1 style="margin:0 0 8px;font-size:24px;font-weight:600;color:var(--text-primary);display:flex;align-items:center;gap:12px">🧠 Knowledge Bank</h1><p style=margin:0;color:var(--text-secondary);font-size:14px>Export and import learned incident patterns, root causes, and fix outcomes. Share knowledge across teams or bootstrap new installations.</p></div><div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:24px;margin-bottom:24px"><div style=display:flex;align-items:flex-start;gap:16px><div style=width:48px;height:48px;background:var(--accent-primary)20;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0>📤</div><div style=flex:1><h3 style="margin:0 0 8px;color:var(--text-primary);font-size:16px">Export Knowledge</h3><p style="margin:0 0 16px;color:var(--text-secondary);font-size:13px">Download a JSON file containing all learned patterns, confirmed root causes, applied fixes, and their outcomes from your local Knowledge Bank. This file can be shared with other team members or used to bootstrap new installations.</p><div style="background:var(--bg-secondary);border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:12px;color:var(--text-muted)"><strong style=color:var(--text-secondary)>What's included:</strong><ul style="margin:8px 0 0;padding-left:20px"><li>Incident fingerprints and patterns</li><li>Confirmed root causes</li><li>Applied fix summaries</li><li>Success/failure outcomes</li><li>Confidence scores</li></ul></div><button style="padding:10px 20px;background:var(--accent-primary);color:#000;border:none;border-radius:8px;font-weight:600;font-size:14px;display:flex;align-items:center;gap:8px"></button></div></div></div><div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:24px"><div style=display:flex;align-items:flex-start;gap:16px><div style="width:48px;height:48px;background:var(--success-color, #10b981)20;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">📥</div><div style=flex:1><h3 style="margin:0 0 8px;color:var(--text-primary);font-size:16px">Import Knowledge</h3><p style="margin:0 0 16px;color:var(--text-secondary);font-size:13px">Upload a previously exported JSON file to import knowledge entries into your local Knowledge Bank. This helps bootstrap learning with shared team knowledge or migrate between installations.</p><div style="background:var(--bg-secondary);border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:12px;color:var(--text-muted);border:1px dashed var(--border-color)"><strong style=color:var(--text-secondary)>Note:</strong> Imported entries will be merged with existing knowledge. Duplicate fingerprints will be skipped.</div><div style=margin-bottom:16px><input id=import-file-input type=file accept=.json style="display:block;width:100%;padding:12px;background:var(--bg-secondary);border:2px dashed var(--border-color);border-radius:8px;color:var(--text-primary);font-size:14px;cursor:pointer"></div><button style="padding:10px 20px;border:none;border-radius:8px;font-weight:600;font-size:14px;display:flex;align-items:center;gap:8px"></button></div></div></div><div style=margin-top:24px;padding:16px;background:var(--bg-secondary);border-radius:8px;font-size:12px;color:var(--text-muted)><strong style=color:var(--text-secondary)>💡 How the Knowledge Bank Works:</strong><p style="margin:8px 0 0">The Knowledge Bank stores learnings from incidents you encounter. As you confirm root causes and apply fixes, KubeGraf learns which patterns are most common and which fixes work best. This information is used to improve diagnosis confidence and rank recommendations. Export your knowledge to share with your team or backup before upgrades.`), _tmpl$6 = /* @__PURE__ */ template(`<li>`);
const KnowledgeBank = () => {
  const [exportLoading, setExportLoading] = createSignal(false);
  const [importLoading, setImportLoading] = createSignal(false);
  const [importFile, setImportFile] = createSignal(null);
  const [importResult, setImportResult] = createSignal(null);
  const [importError, setImportError] = createSignal(null);
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const response = await fetch("/api/knowledge/export");
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `API error: ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "kubegraf_knowledge.json";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addNotification("Knowledge exported successfully!", "success");
    } catch (err) {
      addNotification(`Failed to export: ${err.message}`, "error");
      console.error("Export error:", err);
    } finally {
      setExportLoading(false);
    }
  };
  const handleFileChange = (event) => {
    const input = event.target;
    if (input.files && input.files.length > 0) {
      setImportFile(input.files[0]);
      setImportError(null);
      setImportResult(null);
    } else {
      setImportFile(null);
    }
  };
  const handleImport = async () => {
    if (!importFile()) {
      setImportError("Please select a file to import.");
      return;
    }
    setImportLoading(true);
    setImportError(null);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile());
      const response = await fetch("/api/knowledge/import", {
        method: "POST",
        body: formData
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `API error: ${response.status}`);
      }
      const result = await response.json();
      setImportResult(result);
      addNotification(`Knowledge imported: ${result.importedCount} entries.`, "success");
    } catch (err) {
      setImportError(err.message || "Failed to import knowledge");
      addNotification(`Failed to import: ${err.message}`, "error");
      console.error("Import error:", err);
    } finally {
      setImportLoading(false);
      setImportFile(null);
      const input = document.getElementById("import-file-input");
      if (input) input.value = "";
    }
  };
  return (() => {
    var _el$ = _tmpl$5(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild; _el$3.nextSibling; var _el$5 = _el$2.nextSibling, _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild, _el$8 = _el$7.nextSibling, _el$9 = _el$8.firstChild, _el$0 = _el$9.nextSibling, _el$1 = _el$0.nextSibling, _el$10 = _el$1.firstChild; _el$10.nextSibling; var _el$12 = _el$1.nextSibling, _el$13 = _el$5.nextSibling, _el$14 = _el$13.firstChild, _el$15 = _el$14.firstChild, _el$16 = _el$15.nextSibling, _el$17 = _el$16.firstChild, _el$18 = _el$17.nextSibling, _el$19 = _el$18.nextSibling; _el$19.firstChild; var _el$21 = _el$19.nextSibling, _el$22 = _el$21.firstChild, _el$29 = _el$21.nextSibling, _el$48 = _el$13.nextSibling, _el$49 = _el$48.firstChild; _el$49.nextSibling;
    _el$12.$$click = handleExport;
    insert(_el$12, createComponent(Show, {
      get when() {
        return !exportLoading();
      },
      get fallback() {
        return "⏳ Exporting...";
      },
      children: "📥 Download Knowledge JSON"
    }));
    _el$22.addEventListener("change", handleFileChange);
    insert(_el$16, createComponent(Show, {
      get when() {
        return importFile();
      },
      get children() {
        var _el$23 = _tmpl$(), _el$24 = _el$23.firstChild, _el$27 = _el$24.nextSibling, _el$25 = _el$27.nextSibling, _el$28 = _el$25.nextSibling; _el$28.nextSibling;
        insert(_el$23, () => importFile().name, _el$27);
        insert(_el$23, () => (importFile().size / 1024).toFixed(1), _el$28);
        return _el$23;
      }
    }), _el$29);
    _el$29.$$click = handleImport;
    insert(_el$29, createComponent(Show, {
      get when() {
        return !importLoading();
      },
      get fallback() {
        return "⏳ Importing...";
      },
      children: "📤 Import Knowledge"
    }));
    insert(_el$16, createComponent(Show, {
      get when() {
        return importError();
      },
      get children() {
        var _el$30 = _tmpl$2(), _el$31 = _el$30.firstChild; _el$31.nextSibling;
        insert(_el$30, importError, null);
        return _el$30;
      }
    }), null);
    insert(_el$16, createComponent(Show, {
      get when() {
        return importResult();
      },
      get children() {
        var _el$33 = _tmpl$4(), _el$34 = _el$33.firstChild, _el$35 = _el$34.nextSibling, _el$36 = _el$35.firstChild, _el$37 = _el$36.firstChild; _el$37.nextSibling; var _el$39 = _el$36.nextSibling, _el$40 = _el$39.firstChild; _el$40.nextSibling; var _el$42 = _el$39.nextSibling, _el$43 = _el$42.firstChild; _el$43.nextSibling;
        insert(_el$37, () => importResult().importedCount);
        insert(_el$40, () => importResult().skippedCount);
        insert(_el$43, () => importResult().errorCount);
        insert(_el$33, createComponent(Show, {
          get when() {
            return memo(() => !!importResult().errors)() && importResult().errors.length > 0;
          },
          get children() {
            var _el$45 = _tmpl$3(), _el$46 = _el$45.firstChild, _el$47 = _el$46.nextSibling;
            insert(_el$47, createComponent(For, {
              get each() {
                return importResult().errors.slice(0, 5);
              },
              children: (error) => (() => {
                var _el$51 = _tmpl$6();
                insert(_el$51, error);
                return _el$51;
              })()
            }));
            return _el$45;
          }
        }), null);
        return _el$33;
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$ = exportLoading(), _v$2 = exportLoading() ? "not-allowed" : "pointer", _v$3 = exportLoading() ? 0.7 : 1, _v$4 = importLoading() || !importFile(), _v$5 = importFile() ? "var(--success-color, #10b981)" : "var(--bg-secondary)", _v$6 = importFile() ? "#fff" : "var(--text-muted)", _v$7 = importLoading() || !importFile() ? "not-allowed" : "pointer", _v$8 = importLoading() ? 0.7 : 1;
      _v$ !== _p$.e && (_el$12.disabled = _p$.e = _v$);
      _v$2 !== _p$.t && setStyleProperty(_el$12, "cursor", _p$.t = _v$2);
      _v$3 !== _p$.a && setStyleProperty(_el$12, "opacity", _p$.a = _v$3);
      _v$4 !== _p$.o && (_el$29.disabled = _p$.o = _v$4);
      _v$5 !== _p$.i && setStyleProperty(_el$29, "background", _p$.i = _v$5);
      _v$6 !== _p$.n && setStyleProperty(_el$29, "color", _p$.n = _v$6);
      _v$7 !== _p$.s && setStyleProperty(_el$29, "cursor", _p$.s = _v$7);
      _v$8 !== _p$.h && setStyleProperty(_el$29, "opacity", _p$.h = _v$8);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0,
      i: void 0,
      n: void 0,
      s: void 0,
      h: void 0
    });
    return _el$;
  })();
};
delegateEvents(["click"]);

export { KnowledgeBank as default };
//# sourceMappingURL=KnowledgeBank-DNEyBmDl.js.map
