import { c as createSignal, t as template, i as insert, d as createComponent, S as Show, f as createRenderEffect, v as delegateEvents } from './index-B8I71-mz.js';

var _tmpl$ = /* @__PURE__ */ template(`<svg class="w-4 h-4 text-green-400"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M5 13l4 4L19 7">`), _tmpl$2 = /* @__PURE__ */ template(`<span class=text-green-400>Copied!`), _tmpl$3 = /* @__PURE__ */ template(`<div class=relative><div class="flex items-center justify-end gap-2 mb-2"><button class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors"style=background:var(--bg-tertiary);color:var(--text-secondary)></button><button class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors"style=background:var(--bg-tertiary);color:var(--text-secondary)><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>Download</button></div><div class="code-block overflow-auto max-h-[60vh]"><pre class="text-sm leading-relaxed">`), _tmpl$4 = /* @__PURE__ */ template(`<svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z">`);
const YAMLViewer = (props) => {
  const [copied, setCopied] = createSignal(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(props.yaml);
    setCopied(true);
    props.onCopy?.();
    setTimeout(() => setCopied(false), 2e3);
  };
  const handleDownload = () => {
    const blob = new Blob([props.yaml], {
      type: "text/yaml"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${props.title || "resource"}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const highlightYAML = (yaml) => {
    return yaml.split("\n").map((line) => {
      if (line.trim().startsWith("#")) {
        return `<span class="text-gray-500">${escapeHtml(line)}</span>`;
      }
      const keyMatch = line.match(/^(\s*)([a-zA-Z0-9_-]+)(:)/);
      if (keyMatch) {
        const [, indent, key, colon] = keyMatch;
        const value = line.slice(keyMatch[0].length);
        return `${indent}<span class="text-cyan-400">${escapeHtml(key)}</span>${colon}<span class="text-amber-300">${escapeHtml(value)}</span>`;
      }
      if (line.trim().startsWith("-")) {
        return `<span class="text-purple-400">${escapeHtml(line)}</span>`;
      }
      return escapeHtml(line);
    }).join("\n");
  };
  const escapeHtml = (str) => {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  };
  return (() => {
    var _el$ = _tmpl$3(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$6 = _el$3.nextSibling, _el$7 = _el$2.nextSibling, _el$8 = _el$7.firstChild;
    _el$3.$$click = handleCopy;
    insert(_el$3, createComponent(Show, {
      get when() {
        return copied();
      },
      get fallback() {
        return [_tmpl$4(), "Copy"];
      },
      get children() {
        return [_tmpl$(), _tmpl$2()];
      }
    }));
    _el$6.$$click = handleDownload;
    createRenderEffect(() => _el$8.innerHTML = highlightYAML(props.yaml));
    return _el$;
  })();
};
delegateEvents(["click"]);

export { YAMLViewer as Y };
//# sourceMappingURL=YAMLViewer-BH5fzWmG.js.map
