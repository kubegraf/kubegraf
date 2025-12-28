import { j as createResource, d as createComponent, t as template, i as insert, S as Show, f as createRenderEffect, M as Modal, v as delegateEvents } from './index-B8I71-mz.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class=text-red-400>Error: `), _tmpl$2 = /* @__PURE__ */ template(`<pre class=whitespace-pre-wrap>`), _tmpl$3 = /* @__PURE__ */ template(`<div class="flex flex-col h-[60vh]"><div class="flex items-center justify-end gap-2 mb-2"><button class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors"style=background:var(--bg-tertiary);color:var(--text-secondary)><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>Copy</button></div><div class="flex-1 font-mono text-sm p-4 rounded-lg overflow-auto"style="background:#0d1117;color:#c9d1d9;border:1px solid var(--border-color)">`), _tmpl$4 = /* @__PURE__ */ template(`<div class="flex items-center justify-center h-full"><div class=spinner>`);
const DescribeModal = (props) => {
  const [describe] = createResource(() => ({
    type: props.resourceType,
    name: props.name,
    ns: props.namespace,
    open: props.isOpen
  }), async (params) => {
    if (!params.open || !params.name) return "";
    const nsParam = params.ns ? `&namespace=${params.ns}` : "";
    const res = await fetch(`/api/${params.type}/describe?name=${params.name}${nsParam}`);
    if (!res.ok) throw new Error("Failed to fetch describe output");
    const data = await res.json();
    return data.describe || "";
  });
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(describe() || "");
  };
  const highlightDescribe = (text) => {
    return text.split("\n").map((line) => {
      const headerMatch = line.match(/^([A-Za-z][A-Za-z\s]+):\s*(.*)$/);
      if (headerMatch && line.indexOf(":") < 30) {
        const [, key, value] = headerMatch;
        return `<span class="text-cyan-400">${escapeHtml(key)}:</span> <span class="text-amber-300">${escapeHtml(value)}</span>`;
      }
      const kvMatch = line.match(/^(\s+)([A-Za-z][A-Za-z\s-]+):\s*(.*)$/);
      if (kvMatch) {
        const [, indent, key, value] = kvMatch;
        return `${indent}<span class="text-blue-400">${escapeHtml(key)}:</span> ${escapeHtml(value)}`;
      }
      return escapeHtml(line);
    }).join("\n");
  };
  const escapeHtml = (str) => {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  };
  return createComponent(Modal, {
    get isOpen() {
      return props.isOpen;
    },
    get onClose() {
      return props.onClose;
    },
    get title() {
      return `Describe: ${props.name}`;
    },
    size: "xl",
    get children() {
      var _el$ = _tmpl$3(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$2.nextSibling;
      _el$3.$$click = copyToClipboard;
      insert(_el$4, createComponent(Show, {
        get when() {
          return !describe.loading;
        },
        get fallback() {
          return _tmpl$4();
        },
        get children() {
          return [createComponent(Show, {
            get when() {
              return describe.error;
            },
            get children() {
              var _el$5 = _tmpl$(); _el$5.firstChild;
              insert(_el$5, () => describe.error?.message, null);
              return _el$5;
            }
          }), (() => {
            var _el$7 = _tmpl$2();
            createRenderEffect(() => _el$7.innerHTML = highlightDescribe(describe() || ""));
            return _el$7;
          })()];
        }
      }));
      return _el$;
    }
  });
};
delegateEvents(["click"]);

export { DescribeModal as D };
//# sourceMappingURL=DescribeModal-BOrOE6vF.js.map
