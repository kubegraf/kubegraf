import { o as onMount, an as setAIPanelOpen, t as template, i as insert, d as createComponent, ao as AIChat, s as setCurrentView, v as delegateEvents } from './index-B8I71-mz.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="h-full flex flex-col"><div class="mb-4 flex items-center justify-between"><div><h1 class="text-2xl font-bold"style=color:var(--text-primary)>AI Assistant</h1><p class="text-sm mt-1"style=color:var(--text-secondary)>Ask questions about your Kubernetes cluster and get AI-powered insights</p></div><button class="p-2 rounded-lg transition-colors border"title="Close AI Assistant"style=color:var(--text-secondary);border-color:transparent><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M6 18L18 6M6 6l12 12"></path></svg></button></div><div class="flex-1 overflow-hidden rounded-lg border"style=background:var(--bg-card);border-color:var(--border-color)>`);
const AIAssistant = () => {
  onMount(() => {
    setAIPanelOpen(true);
  });
  const handleClose = () => {
    setAIPanelOpen(false);
    setCurrentView("dashboard");
  };
  return (() => {
    var _el$ = _tmpl$(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling, _el$7 = _el$2.nextSibling;
    _el$6.addEventListener("mouseleave", (e) => {
      e.currentTarget.style.background = "transparent";
      e.currentTarget.style.borderColor = "transparent";
      e.currentTarget.style.color = "var(--text-secondary)";
    });
    _el$6.addEventListener("mouseenter", (e) => {
      e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
      e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
      e.currentTarget.style.color = "var(--error-color)";
    });
    _el$6.$$click = handleClose;
    insert(_el$7, createComponent(AIChat, {
      inline: true
    }));
    return _el$;
  })();
};
delegateEvents(["click"]);

export { AIAssistant as default };
//# sourceMappingURL=AIAssistant-CTVw_BZS.js.map
