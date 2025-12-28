import { d as createComponent, t as template, i as insert, S as Show, u as addEventListener, f as createRenderEffect, M as Modal, v as delegateEvents, c as createSignal, j as createResource, k as api, l as currentContext, n as createEffect, a as createMemo, h as setStyleProperty, F as For, g as className, m as memo, e as setAttribute } from './index-Bh-O-sIc.js';
import { C as ConfirmationModal } from './ConfirmationModal-CGGyzH3M.js';

var _tmpl$$1 = /* @__PURE__ */ template(`<div class=text-xs style=color:var(--text-muted)>Chart: `), _tmpl$2$1 = /* @__PURE__ */ template(`<span class="flex items-center gap-2"><svg class="animate-spin h-4 w-4"fill=none viewBox="0 0 24 24"><circle class=opacity-25 cx=12 cy=12 r=10 stroke=currentColor stroke-width=4></circle><path class=opacity-75 fill=currentColor d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Uninstalling...`), _tmpl$3$1 = /* @__PURE__ */ template(`<div class=space-y-3><div class="flex items-start gap-2"><div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"style="background:rgba(239, 68, 68, 0.15)"><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--error-color)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></div><div class=flex-1><p class="text-sm mb-2"style=color:var(--text-primary)>Are you sure you want to uninstall <strong></strong> from <strong></strong>?</p><div class="p-2 rounded-lg mb-2"style=background:var(--bg-tertiary)><div class="text-xs font-medium mb-0.5"style=color:var(--text-primary)></div><div class=text-xs style=color:var(--text-muted)>Namespace: </div></div><p class="text-xs mb-2"style=color:var(--text-muted)>This action cannot be undone.</p></div></div><div class="flex justify-end gap-2 pt-3 border-t"style=border-color:var(--border-color)><button class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"style=background:var(--bg-tertiary);color:var(--text-primary)>Cancel</button><button class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"style=background:var(--error-color);color:white>`);
const HelmReleaseDeleteModal = (props) => {
  return createComponent(Modal, {
    get isOpen() {
      return props.isOpen;
    },
    get onClose() {
      return props.onClose;
    },
    title: "Uninstall Helm Release",
    size: "sm",
    get children() {
      var _el$ = _tmpl$3$1(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild; _el$3.firstChild; var _el$5 = _el$3.nextSibling, _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild, _el$8 = _el$7.nextSibling, _el$9 = _el$8.nextSibling, _el$0 = _el$9.nextSibling, _el$1 = _el$6.nextSibling, _el$10 = _el$1.firstChild, _el$13 = _el$10.nextSibling; _el$13.firstChild; _el$1.nextSibling; var _el$16 = _el$2.nextSibling, _el$17 = _el$16.firstChild, _el$18 = _el$17.nextSibling;
      insert(_el$8, () => props.release?.name);
      insert(_el$0, () => props.release?.namespace);
      insert(_el$10, () => props.release?.name);
      insert(_el$1, createComponent(Show, {
        get when() {
          return props.release?.chart;
        },
        get children() {
          var _el$11 = _tmpl$$1(); _el$11.firstChild;
          insert(_el$11, () => props.release?.chart, null);
          return _el$11;
        }
      }), _el$13);
      insert(_el$13, () => props.release?.namespace, null);
      addEventListener(_el$17, "click", props.onClose, true);
      addEventListener(_el$18, "click", props.onConfirm, true);
      insert(_el$18, createComponent(Show, {
        get when() {
          return props.loading;
        },
        fallback: "Uninstall",
        get children() {
          return _tmpl$2$1();
        }
      }));
      createRenderEffect((_p$) => {
        var _v$ = props.loading, _v$2 = props.loading;
        _v$ !== _p$.e && (_el$17.disabled = _p$.e = _v$);
        _v$2 !== _p$.t && (_el$18.disabled = _p$.t = _v$2);
        return _p$;
      }, {
        e: void 0,
        t: void 0
      });
      return _el$;
    }
  });
};
delegateEvents(["click"]);

var _tmpl$ = /* @__PURE__ */ template(`<svg viewBox="0 0 512 512"class="w-8 h-8"><path fill=#0F1689 d="M256 0C114.6 0 0 114.6 0 256s114.6 256 256 256 256-114.6 256-256S397.4 0 256 0z"></path><g fill=#fff><circle cx=256 cy=256 r=50></circle><rect x=248 y=96 width=16 height=80 rx=8></rect><rect x=248 y=336 width=16 height=80 rx=8></rect><rect x=96 y=248 width=80 height=16 rx=8></rect><rect x=336 y=248 width=80 height=16 rx=8></rect><rect x=132 y=132 width=16 height=80 rx=8 transform="rotate(-45 140 172)"></rect><rect x=364 y=300 width=16 height=80 rx=8 transform="rotate(-45 372 340)"></rect><rect x=300 y=132 width=16 height=80 rx=8 transform="rotate(45 308 172)"></rect><rect x=132 y=300 width=16 height=80 rx=8 transform="rotate(45 140 340)">`), _tmpl$2 = /* @__PURE__ */ template(`<svg viewBox="0 0 128 128"class="w-8 h-8"><defs><linearGradient id=argoGrad x1=0% y1=0% x2=100% y2=100%><stop offset=0% style=stop-color:#EF7B4D></stop><stop offset=100% style=stop-color:#E96D3F></stop></linearGradient></defs><circle cx=64 cy=64 r=60 fill=url(#argoGrad)></circle><g fill=#fff><ellipse cx=64 cy=52 rx=28 ry=24></ellipse><circle cx=52 cy=48 r=6 fill=#E96D3F></circle><circle cx=76 cy=48 r=6 fill=#E96D3F></circle><circle cx=52 cy=48 r=3 fill=#1a1a1a></circle><circle cx=76 cy=48 r=3 fill=#1a1a1a></circle><path d="M44 76 Q34 90 28 100"stroke=#fff stroke-width=8 stroke-linecap=round fill=none></path><path d="M52 78 Q48 94 44 106"stroke=#fff stroke-width=8 stroke-linecap=round fill=none></path><path d="M64 80 Q64 96 64 108"stroke=#fff stroke-width=8 stroke-linecap=round fill=none></path><path d="M76 78 Q80 94 84 106"stroke=#fff stroke-width=8 stroke-linecap=round fill=none></path><path d="M84 76 Q94 90 100 100"stroke=#fff stroke-width=8 stroke-linecap=round fill=none>`), _tmpl$3 = /* @__PURE__ */ template(`<svg viewBox="0 0 128 128"class="w-8 h-8"><defs><linearGradient id=fluxGrad x1=0% y1=0% x2=100% y2=100%><stop offset=0% style=stop-color:#5468FF></stop><stop offset=100% style=stop-color:#316CE6></stop></linearGradient></defs><circle cx=64 cy=64 r=60 fill=url(#fluxGrad)></circle><g fill=none stroke=#fff stroke-width=8 stroke-linecap=round><path d="M24 44 Q44 28 64 44 Q84 60 104 44"></path><path d="M24 64 Q44 48 64 64 Q84 80 104 64"></path><path d="M24 84 Q44 68 64 84 Q84 100 104 84">`), _tmpl$4 = /* @__PURE__ */ template(`<svg viewBox="0 0 128 128"class="w-8 h-8"><defs><linearGradient id=kustomizeGrad x1=0% y1=0% x2=100% y2=100%><stop offset=0% style=stop-color:#326CE5></stop><stop offset=100% style=stop-color:#1D4ED8></stop></linearGradient></defs><circle cx=64 cy=64 r=60 fill=url(#kustomizeGrad)></circle><g fill=#fff><rect x=32 y=28 width=16 height=72 rx=2></rect><polygon points="48,64 80,28 96,28 56,72 96,100 80,100"></polygon></g><g fill=none stroke=#fff stroke-width=3><rect x=76 y=52 width=20 height=20 rx=2></rect><rect x=86 y=62 width=20 height=20 rx=2>`), _tmpl$5 = /* @__PURE__ */ template(`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">`), _tmpl$6 = /* @__PURE__ */ template(`<div class="text-2xl font-bold flex items-center justify-center"style=color:var(--accent-primary)><div class=spinner style=width:24px;height:24px>`), _tmpl$7 = /* @__PURE__ */ template(`<div class="text-2xl font-bold flex items-center justify-center"style=color:var(--accent-secondary)><div class=spinner style=width:24px;height:24px>`), _tmpl$8 = /* @__PURE__ */ template(`<div class="text-2xl font-bold flex items-center justify-center"style=color:#8b5cf6><div class=spinner style=width:24px;height:24px>`), _tmpl$9 = /* @__PURE__ */ template(`<div class="card p-6"><h3 class="font-semibold mb-4"style=color:var(--text-primary)>Quick Stats</h3><div class="grid grid-cols-2 md:grid-cols-4 gap-4"><div class="p-4 rounded-lg text-center"style=background:var(--bg-tertiary)><div class=text-sm style=color:var(--text-secondary)>Helm Releases</div></div><div class="p-4 rounded-lg text-center"style=background:var(--bg-tertiary)><div class=text-sm style=color:var(--text-secondary)>ArgoCD Apps</div></div><div class="p-4 rounded-lg text-center"style=background:var(--bg-tertiary)><div class=text-sm style=color:var(--text-secondary)>Flux Resources</div></div><div class="p-4 rounded-lg text-center"style=background:var(--bg-tertiary)><div class="text-2xl font-bold"style=color:var(--success-color)></div><div class=text-sm style=color:var(--text-secondary)>Active Plugins`), _tmpl$0 = /* @__PURE__ */ template(`<div class="flex items-center justify-between mb-4 gap-4"><div class="flex-1 max-w-md"><input type=text placeholder="Search Helm releases..."class="w-full px-4 py-2 rounded-lg text-sm"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"></div><div class=text-sm style=color:var(--text-muted)> of <!> releases</div><button class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"><svg fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>Refresh`), _tmpl$1 = /* @__PURE__ */ template(`<table class=data-table><thead><tr><th>Name</th><th>Namespace</th><th>Chart</th><th>Revision</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>`), _tmpl$10 = /* @__PURE__ */ template(`<div class="card overflow-hidden">`), _tmpl$11 = /* @__PURE__ */ template(`<div class="flex items-center justify-between mb-4 gap-4"><div class="flex-1 max-w-md"><input type=text placeholder="Search ArgoCD applications..."class="w-full px-4 py-2 rounded-lg text-sm"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"></div><div class=text-sm style=color:var(--text-muted)> of <!> applications</div><button class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"><svg fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>Refresh`), _tmpl$12 = /* @__PURE__ */ template(`<table class=data-table><thead><tr><th>Name</th><th>Project</th><th>Sync Status</th><th>Health</th><th>Age</th><th>Actions</th></tr></thead><tbody>`), _tmpl$13 = /* @__PURE__ */ template(`<div class="flex items-center justify-between mb-4"><div class=text-sm style=color:var(--text-muted)> resources</div><button class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"><svg fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>Refresh`), _tmpl$14 = /* @__PURE__ */ template(`<table class=data-table><thead><tr><th>Name</th><th>Kind</th><th>Namespace</th><th>Ready</th><th>Status</th></tr></thead><tbody>`), _tmpl$15 = /* @__PURE__ */ template(`<div>`), _tmpl$16 = /* @__PURE__ */ template(`<div class="border rounded-lg overflow-hidden"style=border-color:var(--border-color)><table class="data-table w-full"><thead><tr><th>Revision</th><th>Status</th><th>Updated</th><th>Description</th><th>Actions</th></tr></thead><tbody>`), _tmpl$17 = /* @__PURE__ */ template(`<div class=space-y-4><div class="grid grid-cols-2 gap-4"><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-sm style=color:var(--text-muted)>Chart</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-sm style=color:var(--text-muted)>Current Revision</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-sm style=color:var(--text-muted)>Namespace</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-sm style=color:var(--text-muted)>Status</div><div><span class="badge badge-success"></span></div></div><div class="p-3 rounded-lg col-span-2"style=background:var(--bg-tertiary)><div class=text-sm style=color:var(--text-muted)>Last Updated</div><div style=color:var(--text-primary)></div></div></div><div><h4 class="font-semibold mb-3 flex items-center gap-2"style=color:var(--text-primary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>Release History`), _tmpl$18 = /* @__PURE__ */ template(`<div class=space-y-4><div class="flex gap-2"><button class="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"title="Apply changes from Git repository"style=background:var(--accent-primary);color:#fff><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg></button><button title="Fetch latest state from cluster"class="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button></div><div class="grid grid-cols-2 gap-4"><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-sm style=color:var(--text-muted)>Project</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-sm style=color:var(--text-muted)>Namespace</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-sm style=color:var(--text-muted)>Sync Status</div><div><span></span></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-sm style=color:var(--text-muted)>Health</div><div><span></span></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-sm style=color:var(--text-muted)>Age</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-sm style=color:var(--text-muted)>Revision</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg col-span-2"style=background:var(--bg-tertiary)><div class=text-sm style=color:var(--text-muted)>Repository</div><div class="text-sm break-all"style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-sm style=color:var(--text-muted)>Path</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-sm style=color:var(--text-muted)>Cluster</div><div class="text-sm break-all"style=color:var(--text-primary)>`), _tmpl$19 = /* @__PURE__ */ template(`<div class=space-y-6><div><h1 class="text-2xl font-bold"style=color:var(--text-primary)>Plugins</h1><p style=color:var(--text-secondary)>GitOps and package management integrations</p></div><div class="flex gap-2 border-b"style=border-color:var(--border-color)>`), _tmpl$20 = /* @__PURE__ */ template(`<button class="px-4 py-2 -mb-px transition-colors">`), _tmpl$21 = /* @__PURE__ */ template(`<div class="card p-6"><div class="flex items-center gap-3 mb-4"><div class=flex-shrink-0></div><div><div class=font-semibold style=color:var(--text-primary)></div><div class=text-sm style=color:var(--text-muted)></div></div></div><p class="text-sm mb-4"style=color:var(--text-secondary)></p><div class="flex items-center justify-between"><span></span><button class=text-sm style=color:var(--accent-primary)>View →`), _tmpl$22 = /* @__PURE__ */ template(`<div class="text-2xl font-bold"style=color:var(--accent-primary)>`), _tmpl$23 = /* @__PURE__ */ template(`<div class="text-2xl font-bold"style=color:var(--accent-secondary)>`), _tmpl$24 = /* @__PURE__ */ template(`<div class="text-2xl font-bold"style=color:#8b5cf6>`), _tmpl$25 = /* @__PURE__ */ template(`<div class="p-8 text-center"><div class="spinner mx-auto">`), _tmpl$26 = /* @__PURE__ */ template(`<tr><td colspan=7 class="text-center py-8"style=color:var(--text-muted)>`), _tmpl$27 = /* @__PURE__ */ template(`<tr class="cursor-pointer hover:bg-[var(--bg-tertiary)]"><td class=font-medium style=color:var(--accent-primary)></td><td></td><td></td><td></td><td><span></span></td><td></td><td><div class="flex gap-1"><button class=action-btn title="Details &amp; History"><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></button><button class=action-btn title="Uninstall release"type=button style=color:var(--error-color)><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">`), _tmpl$28 = /* @__PURE__ */ template(`<div class="p-8 text-center"style=color:var(--text-muted)><svg class="w-12 h-12 mx-auto mb-4 opacity-50"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg><p>No ArgoCD applications found</p><p class="text-sm mt-2">ArgoCD may not be installed or configured`), _tmpl$29 = /* @__PURE__ */ template(`<tr><td colspan=6 class="text-center py-8"style=color:var(--text-muted)>`), _tmpl$30 = /* @__PURE__ */ template(`<tr class="cursor-pointer hover:bg-[var(--bg-tertiary)]"><td class=font-medium style=color:var(--accent-primary)></td><td></td><td><span></span></td><td><span></span></td><td></td><td class="flex gap-1"><button class=action-btn title="Sync - Apply changes from Git"><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg></button><button class=action-btn title="Refresh - Fetch latest state"><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button><button class=action-btn title=Details><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z">`), _tmpl$31 = /* @__PURE__ */ template(`<div class="p-8 text-center"style=color:var(--text-muted)><svg class="w-12 h-12 mx-auto mb-4 opacity-50"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg><p>No Flux resources found</p><p class="text-sm mt-2">Flux may not be installed or configured`), _tmpl$32 = /* @__PURE__ */ template(`<tr><td class=font-medium style=color:var(--accent-primary)></td><td></td><td></td><td><span></span></td><td>`), _tmpl$33 = /* @__PURE__ */ template(`<div class="p-4 text-center"><div class="spinner mx-auto">`), _tmpl$34 = /* @__PURE__ */ template(`<div class="p-4 text-center"style=color:var(--text-muted)>No history available`), _tmpl$35 = /* @__PURE__ */ template(`<span class="ml-2 badge badge-success">current`), _tmpl$36 = /* @__PURE__ */ template(`<button class="px-3 py-1.5 rounded transition-colors font-medium"style=background:var(--warning-color);color:#000>`), _tmpl$37 = /* @__PURE__ */ template(`<tr><td style=color:var(--accent-primary)></td><td><span></span></td><td style=color:var(--text-secondary)></td><td class="max-w-xs truncate"style=color:var(--text-muted)></td><td>`);
const Plugins = () => {
  const [activeTab, setActiveTab] = createSignal("overview");
  const [selectedRelease, setSelectedRelease] = createSignal(null);
  const [selectedArgoApp, setSelectedArgoApp] = createSignal(null);
  const [showDetails, setShowDetails] = createSignal(false);
  const [showArgoDetails, setShowArgoDetails] = createSignal(false);
  const [releaseHistory, setReleaseHistory] = createSignal([]);
  const [historyLoading, setHistoryLoading] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);
  const [actionMessage, setActionMessage] = createSignal(null);
  const [showUninstallModal, setShowUninstallModal] = createSignal(false);
  const [releaseToUninstall, setReleaseToUninstall] = createSignal(null);
  const [uninstalling, setUninstalling] = createSignal(false);
  const [showRollbackConfirm, setShowRollbackConfirm] = createSignal(false);
  const [rollbackRevision, setRollbackRevision] = createSignal(null);
  const [helmSearch, setHelmSearch] = createSignal("");
  const [argoSearch, setArgoSearch] = createSignal("");
  const [helmReleases, {
    refetch: refetchHelm,
    mutate: mutateHelm
  }] = createResource(() => activeTab() === "helm" || activeTab() === "overview" ? currentContext() : false, async () => api.getHelmReleases());
  const [argoCDApps, {
    refetch: refetchArgo,
    mutate: mutateArgo
  }] = createResource(() => activeTab() === "argocd" || activeTab() === "overview" ? currentContext() : false, async () => api.getArgoCDApps());
  const [fluxResources, {
    refetch: refetchFlux,
    mutate: mutateFlux
  }] = createResource(() => activeTab() === "flux" || activeTab() === "overview" ? currentContext() : false, async () => api.getFluxResources());
  createEffect(() => {
    const ctx = currentContext();
    if (ctx) {
      mutateHelm(void 0);
      mutateArgo(void 0);
      mutateFlux(void 0);
    }
  });
  const filteredHelmReleases = createMemo(() => {
    const releases = helmReleases() || [];
    const search = helmSearch().toLowerCase();
    if (!search) return releases;
    return releases.filter((r) => r.name.toLowerCase().includes(search) || r.namespace.toLowerCase().includes(search) || r.chart.toLowerCase().includes(search) || r.status.toLowerCase().includes(search));
  });
  const filteredArgoApps = createMemo(() => {
    const apps = argoCDApps() || [];
    const search = argoSearch().toLowerCase();
    if (!search) return apps;
    return apps.filter((a) => a.name.toLowerCase().includes(search) || a.namespace.toLowerCase().includes(search) || a.project.toLowerCase().includes(search) || a.syncStatus.toLowerCase().includes(search) || a.health.toLowerCase().includes(search));
  });
  const fetchHistory = async (name, namespace) => {
    setHistoryLoading(true);
    try {
      const result = await api.getHelmReleaseHistory(name, namespace);
      setReleaseHistory(result.history || []);
    } catch (e) {
      console.error("Failed to fetch release history:", e);
      setReleaseHistory([]);
    }
    setHistoryLoading(false);
  };
  const handleRollbackClick = (revision) => {
    setRollbackRevision(revision);
    setShowRollbackConfirm(true);
  };
  const handleRollback = async () => {
    const release = selectedRelease();
    const revision = rollbackRevision();
    if (!release || !revision) return;
    setActionLoading(true);
    setActionMessage(null);
    setShowRollbackConfirm(false);
    try {
      await api.rollbackHelmRelease(release.name, release.namespace, revision);
      setActionMessage({
        type: "success",
        text: `Rolled back to revision ${revision}`
      });
      fetchHistory(release.name, release.namespace);
      refetchHelm();
    } catch (e) {
      setActionMessage({
        type: "error",
        text: e.message || "Rollback failed"
      });
    } finally {
      setActionLoading(false);
      setRollbackRevision(null);
    }
  };
  const handleArgoSync = async () => {
    const app = selectedArgoApp();
    if (!app) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      await api.syncArgoCDApp(app.name, app.namespace);
      setActionMessage({
        type: "success",
        text: "Sync triggered successfully"
      });
      refetchArgo();
    } catch (e) {
      setActionMessage({
        type: "error",
        text: e.message || "Sync failed"
      });
    }
    setActionLoading(false);
  };
  const handleArgoRefresh = async () => {
    const app = selectedArgoApp();
    if (!app) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      await api.refreshArgoCDApp(app.name, app.namespace);
      setActionMessage({
        type: "success",
        text: "Refresh triggered successfully"
      });
      refetchArgo();
    } catch (e) {
      setActionMessage({
        type: "error",
        text: e.message || "Refresh failed"
      });
    }
    setActionLoading(false);
  };
  const handleUninstallHelm = (release) => {
    console.log("[Plugins] Opening uninstall modal for:", release.name);
    setReleaseToUninstall(release);
    setShowUninstallModal(true);
  };
  const confirmUninstallHelm = async () => {
    const release = releaseToUninstall();
    if (!release) return;
    setUninstalling(true);
    try {
      await api.uninstallApp(release.name, release.namespace);
      refetchHelm();
      setShowUninstallModal(false);
      setReleaseToUninstall(null);
      setActionMessage({
        type: "success",
        text: `${release.name} uninstalled successfully`
      });
    } catch (e) {
      setActionMessage({
        type: "error",
        text: `Failed to uninstall ${release.name}: ${e.message || "Unknown error"}`
      });
    } finally {
      setUninstalling(false);
    }
  };
  const openHelmDetails = (release) => {
    setSelectedRelease(release);
    setShowDetails(true);
    setActionMessage(null);
    fetchHistory(release.name, release.namespace);
  };
  const openArgoDetails = (app) => {
    setSelectedArgoApp(app);
    setShowArgoDetails(true);
    setActionMessage(null);
  };
  const HelmIcon = () => (
    // Official Helm ship wheel logo
    _tmpl$()
  );
  const ArgoCDIcon = () => (
    // Official ArgoCD octopus logo
    _tmpl$2()
  );
  const FluxIcon = () => (
    // Official Flux logo - blue waves
    _tmpl$3()
  );
  const KustomizeIcon = () => (
    // Official Kustomize logo - K with squares
    _tmpl$4()
  );
  const plugins = [{
    name: "Helm",
    version: "v3",
    enabled: true,
    description: "Package manager for Kubernetes",
    icon: createComponent(HelmIcon, {})
  }, {
    name: "ArgoCD",
    version: "v2",
    enabled: true,
    description: "GitOps continuous delivery",
    icon: createComponent(ArgoCDIcon, {})
  }, {
    name: "Flux",
    version: "v2",
    enabled: true,
    description: "GitOps toolkit for Kubernetes",
    icon: createComponent(FluxIcon, {})
  }, {
    name: "Kustomize",
    version: "v5",
    enabled: true,
    description: "Kubernetes native configuration management",
    icon: createComponent(KustomizeIcon, {})
  }];
  const tabs = [{
    id: "overview",
    label: "Overview"
  }, {
    id: "helm",
    label: "Helm Releases"
  }, {
    id: "argocd",
    label: "ArgoCD Apps"
  }, {
    id: "flux",
    label: "Flux Resources"
  }];
  return (() => {
    var _el$5 = _tmpl$19(), _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild; _el$7.nextSibling; var _el$9 = _el$6.nextSibling;
    insert(_el$9, createComponent(For, {
      each: tabs,
      children: (tab) => (() => {
        var _el$124 = _tmpl$20();
        _el$124.$$click = () => setActiveTab(tab.id);
        insert(_el$124, () => tab.label);
        createRenderEffect((_p$) => {
          var _v$14 = activeTab() === tab.id ? "var(--accent-primary)" : "var(--text-secondary)", _v$15 = activeTab() === tab.id ? "2px solid var(--accent-primary)" : "2px solid transparent";
          _v$14 !== _p$.e && setStyleProperty(_el$124, "color", _p$.e = _v$14);
          _v$15 !== _p$.t && setStyleProperty(_el$124, "border-bottom", _p$.t = _v$15);
          return _p$;
        }, {
          e: void 0,
          t: void 0
        });
        return _el$124;
      })()
    }));
    insert(_el$5, createComponent(Show, {
      get when() {
        return activeTab() === "overview";
      },
      get children() {
        return [(() => {
          var _el$0 = _tmpl$5();
          insert(_el$0, createComponent(For, {
            each: plugins,
            children: (plugin) => (() => {
              var _el$125 = _tmpl$21(), _el$126 = _el$125.firstChild, _el$127 = _el$126.firstChild, _el$128 = _el$127.nextSibling, _el$129 = _el$128.firstChild, _el$130 = _el$129.nextSibling, _el$131 = _el$126.nextSibling, _el$132 = _el$131.nextSibling, _el$133 = _el$132.firstChild, _el$134 = _el$133.nextSibling;
              insert(_el$127, () => plugin.icon);
              insert(_el$129, () => plugin.name);
              insert(_el$130, () => plugin.version);
              insert(_el$131, () => plugin.description);
              insert(_el$133, () => plugin.enabled ? "Enabled" : "Disabled");
              _el$134.$$click = () => setActiveTab(plugin.name.toLowerCase());
              createRenderEffect(() => className(_el$133, `badge ${plugin.enabled ? "badge-success" : "badge-warning"}`));
              return _el$125;
            })()
          }));
          return _el$0;
        })(), (() => {
          var _el$1 = _tmpl$9(), _el$10 = _el$1.firstChild, _el$11 = _el$10.nextSibling, _el$12 = _el$11.firstChild, _el$15 = _el$12.firstChild, _el$16 = _el$12.nextSibling, _el$19 = _el$16.firstChild, _el$20 = _el$16.nextSibling, _el$23 = _el$20.firstChild, _el$24 = _el$20.nextSibling, _el$25 = _el$24.firstChild; _el$25.nextSibling;
          insert(_el$12, createComponent(Show, {
            get when() {
              return helmReleases.loading;
            },
            get fallback() {
              return (() => {
                var _el$135 = _tmpl$22();
                insert(_el$135, (() => {
                  var _c$ = memo(() => !!Array.isArray(helmReleases()));
                  return () => _c$() ? helmReleases()?.length ?? 0 : 0;
                })());
                return _el$135;
              })();
            },
            get children() {
              var _el$13 = _tmpl$6(); _el$13.firstChild;
              return _el$13;
            }
          }), _el$15);
          insert(_el$16, createComponent(Show, {
            get when() {
              return argoCDApps.loading;
            },
            get fallback() {
              return (() => {
                var _el$136 = _tmpl$23();
                insert(_el$136, (() => {
                  var _c$2 = memo(() => !!Array.isArray(argoCDApps()));
                  return () => _c$2() ? argoCDApps()?.length ?? 0 : 0;
                })());
                return _el$136;
              })();
            },
            get children() {
              var _el$17 = _tmpl$7(); _el$17.firstChild;
              return _el$17;
            }
          }), _el$19);
          insert(_el$20, createComponent(Show, {
            get when() {
              return fluxResources.loading;
            },
            get fallback() {
              return (() => {
                var _el$137 = _tmpl$24();
                insert(_el$137, (() => {
                  var _c$3 = memo(() => !!Array.isArray(fluxResources()));
                  return () => _c$3() ? fluxResources()?.length ?? 0 : 0;
                })());
                return _el$137;
              })();
            },
            get children() {
              var _el$21 = _tmpl$8(); _el$21.firstChild;
              return _el$21;
            }
          }), _el$23);
          insert(_el$25, () => plugins.filter((p) => p.enabled).length);
          return _el$1;
        })()];
      }
    }), null);
    insert(_el$5, createComponent(Show, {
      get when() {
        return activeTab() === "helm";
      },
      get children() {
        return [(() => {
          var _el$27 = _tmpl$0(), _el$28 = _el$27.firstChild, _el$29 = _el$28.firstChild, _el$30 = _el$28.nextSibling, _el$31 = _el$30.firstChild, _el$33 = _el$31.nextSibling; _el$33.nextSibling; var _el$34 = _el$30.nextSibling, _el$35 = _el$34.firstChild;
          _el$29.$$input = (e) => setHelmSearch(e.currentTarget.value);
          insert(_el$30, () => filteredHelmReleases().length, _el$31);
          insert(_el$30, () => helmReleases()?.length || 0, _el$33);
          _el$34.$$click = () => refetchHelm();
          createRenderEffect((_p$) => {
            var _v$ = helmReleases.loading, _v$2 = helmReleases.loading ? 0.5 : 1, _v$3 = `w-4 h-4 ${helmReleases.loading ? "animate-spin" : ""}`;
            _v$ !== _p$.e && (_el$34.disabled = _p$.e = _v$);
            _v$2 !== _p$.t && setStyleProperty(_el$34, "opacity", _p$.t = _v$2);
            _v$3 !== _p$.a && setAttribute(_el$35, "class", _p$.a = _v$3);
            return _p$;
          }, {
            e: void 0,
            t: void 0,
            a: void 0
          });
          createRenderEffect(() => _el$29.value = helmSearch());
          return _el$27;
        })(), (() => {
          var _el$36 = _tmpl$10();
          insert(_el$36, createComponent(Show, {
            get when() {
              return !helmReleases.loading;
            },
            get fallback() {
              return _tmpl$25();
            },
            get children() {
              var _el$37 = _tmpl$1(), _el$38 = _el$37.firstChild, _el$39 = _el$38.nextSibling;
              insert(_el$39, createComponent(For, {
                get each() {
                  return filteredHelmReleases();
                },
                get fallback() {
                  return (() => {
                    var _el$139 = _tmpl$26(), _el$140 = _el$139.firstChild;
                    insert(_el$140, (() => {
                      var _c$4 = memo(() => !!helmSearch());
                      return () => _c$4() ? `No Helm releases match "${helmSearch()}"` : "No Helm releases found";
                    })());
                    return _el$139;
                  })();
                },
                children: (release) => (() => {
                  var _el$141 = _tmpl$27(), _el$142 = _el$141.firstChild, _el$143 = _el$142.nextSibling, _el$144 = _el$143.nextSibling, _el$145 = _el$144.nextSibling, _el$146 = _el$145.nextSibling, _el$147 = _el$146.firstChild, _el$148 = _el$146.nextSibling, _el$149 = _el$148.nextSibling, _el$150 = _el$149.firstChild, _el$151 = _el$150.firstChild, _el$152 = _el$151.nextSibling;
                  _el$141.$$click = () => openHelmDetails(release);
                  insert(_el$142, () => release.name);
                  insert(_el$143, () => release.namespace);
                  insert(_el$144, () => release.chart);
                  insert(_el$145, () => release.revision);
                  insert(_el$147, () => release.status);
                  insert(_el$148, () => release.updated);
                  _el$151.$$click = (e) => {
                    e.stopPropagation();
                    openHelmDetails(release);
                  };
                  _el$152.$$click = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("[Plugins] Uninstall button clicked for:", release.name);
                    handleUninstallHelm(release);
                  };
                  createRenderEffect(() => className(_el$147, `badge ${release.status === "deployed" ? "badge-success" : "badge-warning"}`));
                  return _el$141;
                })()
              }));
              return _el$37;
            }
          }));
          return _el$36;
        })()];
      }
    }), null);
    insert(_el$5, createComponent(Show, {
      get when() {
        return activeTab() === "argocd";
      },
      get children() {
        return [(() => {
          var _el$40 = _tmpl$11(), _el$41 = _el$40.firstChild, _el$42 = _el$41.firstChild, _el$43 = _el$41.nextSibling, _el$44 = _el$43.firstChild, _el$46 = _el$44.nextSibling; _el$46.nextSibling; var _el$47 = _el$43.nextSibling, _el$48 = _el$47.firstChild;
          _el$42.$$input = (e) => setArgoSearch(e.currentTarget.value);
          insert(_el$43, () => filteredArgoApps().length, _el$44);
          insert(_el$43, () => argoCDApps()?.length || 0, _el$46);
          _el$47.$$click = () => refetchArgo();
          createRenderEffect((_p$) => {
            var _v$4 = argoCDApps.loading, _v$5 = argoCDApps.loading ? 0.5 : 1, _v$6 = `w-4 h-4 ${argoCDApps.loading ? "animate-spin" : ""}`;
            _v$4 !== _p$.e && (_el$47.disabled = _p$.e = _v$4);
            _v$5 !== _p$.t && setStyleProperty(_el$47, "opacity", _p$.t = _v$5);
            _v$6 !== _p$.a && setAttribute(_el$48, "class", _p$.a = _v$6);
            return _p$;
          }, {
            e: void 0,
            t: void 0,
            a: void 0
          });
          createRenderEffect(() => _el$42.value = argoSearch());
          return _el$40;
        })(), (() => {
          var _el$49 = _tmpl$10();
          insert(_el$49, createComponent(Show, {
            get when() {
              return !argoCDApps.loading;
            },
            get fallback() {
              return _tmpl$25();
            },
            get children() {
              return createComponent(Show, {
                get when() {
                  return (argoCDApps() || []).length > 0;
                },
                get fallback() {
                  return _tmpl$28();
                },
                get children() {
                  var _el$50 = _tmpl$12(), _el$51 = _el$50.firstChild, _el$52 = _el$51.nextSibling;
                  insert(_el$52, createComponent(For, {
                    get each() {
                      return filteredArgoApps();
                    },
                    get fallback() {
                      return (() => {
                        var _el$155 = _tmpl$29(), _el$156 = _el$155.firstChild;
                        insert(_el$156, (() => {
                          var _c$5 = memo(() => !!argoSearch());
                          return () => _c$5() ? `No ArgoCD applications match "${argoSearch()}"` : "No ArgoCD applications found";
                        })());
                        return _el$155;
                      })();
                    },
                    children: (app) => (() => {
                      var _el$157 = _tmpl$30(), _el$158 = _el$157.firstChild, _el$159 = _el$158.nextSibling, _el$160 = _el$159.nextSibling, _el$161 = _el$160.firstChild, _el$162 = _el$160.nextSibling, _el$163 = _el$162.firstChild, _el$164 = _el$162.nextSibling, _el$165 = _el$164.nextSibling, _el$166 = _el$165.firstChild, _el$167 = _el$166.nextSibling, _el$168 = _el$167.nextSibling;
                      _el$157.$$click = () => openArgoDetails(app);
                      insert(_el$158, () => app.name);
                      insert(_el$159, () => app.project);
                      insert(_el$161, () => app.syncStatus);
                      insert(_el$163, () => app.health);
                      insert(_el$164, () => app.age);
                      _el$166.$$click = (e) => {
                        e.stopPropagation();
                        setSelectedArgoApp(app);
                        handleArgoSync();
                      };
                      _el$167.$$click = (e) => {
                        e.stopPropagation();
                        setSelectedArgoApp(app);
                        handleArgoRefresh();
                      };
                      _el$168.$$click = (e) => {
                        e.stopPropagation();
                        openArgoDetails(app);
                      };
                      createRenderEffect((_p$) => {
                        var _v$16 = `badge ${app.syncStatus === "Synced" ? "badge-success" : "badge-warning"}`, _v$17 = `badge ${app.health === "Healthy" ? "badge-success" : "badge-error"}`;
                        _v$16 !== _p$.e && className(_el$161, _p$.e = _v$16);
                        _v$17 !== _p$.t && className(_el$163, _p$.t = _v$17);
                        return _p$;
                      }, {
                        e: void 0,
                        t: void 0
                      });
                      return _el$157;
                    })()
                  }));
                  return _el$50;
                }
              });
            }
          }));
          return _el$49;
        })()];
      }
    }), null);
    insert(_el$5, createComponent(Show, {
      get when() {
        return activeTab() === "flux";
      },
      get children() {
        return [(() => {
          var _el$53 = _tmpl$13(), _el$54 = _el$53.firstChild, _el$55 = _el$54.firstChild, _el$56 = _el$54.nextSibling, _el$57 = _el$56.firstChild;
          insert(_el$54, () => fluxResources()?.length || 0, _el$55);
          _el$56.$$click = () => refetchFlux();
          createRenderEffect((_p$) => {
            var _v$7 = fluxResources.loading, _v$8 = fluxResources.loading ? 0.5 : 1, _v$9 = `w-4 h-4 ${fluxResources.loading ? "animate-spin" : ""}`;
            _v$7 !== _p$.e && (_el$56.disabled = _p$.e = _v$7);
            _v$8 !== _p$.t && setStyleProperty(_el$56, "opacity", _p$.t = _v$8);
            _v$9 !== _p$.a && setAttribute(_el$57, "class", _p$.a = _v$9);
            return _p$;
          }, {
            e: void 0,
            t: void 0,
            a: void 0
          });
          return _el$53;
        })(), (() => {
          var _el$58 = _tmpl$10();
          insert(_el$58, createComponent(Show, {
            get when() {
              return !fluxResources.loading;
            },
            get fallback() {
              return _tmpl$25();
            },
            get children() {
              return createComponent(Show, {
                get when() {
                  return (fluxResources() || []).length > 0;
                },
                get fallback() {
                  return _tmpl$31();
                },
                get children() {
                  var _el$59 = _tmpl$14(), _el$60 = _el$59.firstChild, _el$61 = _el$60.nextSibling;
                  insert(_el$61, createComponent(For, {
                    get each() {
                      return fluxResources() || [];
                    },
                    children: (resource) => (() => {
                      var _el$171 = _tmpl$32(), _el$172 = _el$171.firstChild, _el$173 = _el$172.nextSibling, _el$174 = _el$173.nextSibling, _el$175 = _el$174.nextSibling, _el$176 = _el$175.firstChild, _el$177 = _el$175.nextSibling;
                      insert(_el$172, () => resource.name);
                      insert(_el$173, () => resource.kind);
                      insert(_el$174, () => resource.namespace);
                      insert(_el$176, () => resource.ready ? "True" : "False");
                      insert(_el$177, () => resource.status);
                      createRenderEffect(() => className(_el$176, `badge ${resource.ready ? "badge-success" : "badge-error"}`));
                      return _el$171;
                    })()
                  }));
                  return _el$59;
                }
              });
            }
          }));
          return _el$58;
        })()];
      }
    }), null);
    insert(_el$5, createComponent(Modal, {
      get isOpen() {
        return showDetails();
      },
      onClose: () => setShowDetails(false),
      get title() {
        return `Helm Release: ${selectedRelease()?.name}`;
      },
      size: "lg",
      get children() {
        return createComponent(Show, {
          get when() {
            return selectedRelease();
          },
          get children() {
            var _el$62 = _tmpl$17(), _el$64 = _el$62.firstChild, _el$65 = _el$64.firstChild, _el$66 = _el$65.firstChild, _el$67 = _el$66.nextSibling, _el$68 = _el$65.nextSibling, _el$69 = _el$68.firstChild, _el$70 = _el$69.nextSibling, _el$71 = _el$68.nextSibling, _el$72 = _el$71.firstChild, _el$73 = _el$72.nextSibling, _el$74 = _el$71.nextSibling, _el$75 = _el$74.firstChild, _el$76 = _el$75.nextSibling, _el$77 = _el$76.firstChild, _el$78 = _el$74.nextSibling, _el$79 = _el$78.firstChild, _el$80 = _el$79.nextSibling, _el$81 = _el$64.nextSibling; _el$81.firstChild;
            insert(_el$62, createComponent(Show, {
              get when() {
                return actionMessage();
              },
              get children() {
                var _el$63 = _tmpl$15();
                insert(_el$63, () => actionMessage()?.text);
                createRenderEffect(() => className(_el$63, `p-3 rounded-lg ${actionMessage()?.type === "success" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`));
                return _el$63;
              }
            }), _el$64);
            insert(_el$67, () => selectedRelease()?.chart);
            insert(_el$70, () => selectedRelease()?.revision);
            insert(_el$73, () => selectedRelease()?.namespace);
            insert(_el$77, () => selectedRelease()?.status);
            insert(_el$80, () => selectedRelease()?.updated);
            insert(_el$81, createComponent(Show, {
              get when() {
                return !historyLoading();
              },
              get fallback() {
                return _tmpl$33();
              },
              get children() {
                return createComponent(Show, {
                  get when() {
                    return releaseHistory().length > 0;
                  },
                  get fallback() {
                    return _tmpl$34();
                  },
                  get children() {
                    var _el$83 = _tmpl$16(), _el$84 = _el$83.firstChild, _el$85 = _el$84.firstChild, _el$86 = _el$85.nextSibling;
                    insert(_el$86, createComponent(For, {
                      get each() {
                        return releaseHistory();
                      },
                      children: (entry) => (() => {
                        var _el$180 = _tmpl$37(), _el$181 = _el$180.firstChild, _el$183 = _el$181.nextSibling, _el$184 = _el$183.firstChild, _el$185 = _el$183.nextSibling, _el$186 = _el$185.nextSibling, _el$187 = _el$186.nextSibling;
                        insert(_el$181, () => entry.revision, null);
                        insert(_el$181, createComponent(Show, {
                          get when() {
                            return entry.revision === selectedRelease()?.revision;
                          },
                          get children() {
                            return _tmpl$35();
                          }
                        }), null);
                        insert(_el$184, () => entry.status);
                        insert(_el$185, () => entry.updated);
                        insert(_el$186, () => entry.description || "-");
                        insert(_el$187, createComponent(Show, {
                          get when() {
                            return entry.revision !== selectedRelease()?.revision;
                          },
                          get children() {
                            var _el$188 = _tmpl$36();
                            _el$188.$$click = () => handleRollbackClick(entry.revision);
                            insert(_el$188, () => actionLoading() ? "Rolling back..." : "Rollback");
                            createRenderEffect((_p$) => {
                              var _v$18 = actionLoading(), _v$19 = actionLoading() ? 0.5 : 1;
                              _v$18 !== _p$.e && (_el$188.disabled = _p$.e = _v$18);
                              _v$19 !== _p$.t && setStyleProperty(_el$188, "opacity", _p$.t = _v$19);
                              return _p$;
                            }, {
                              e: void 0,
                              t: void 0
                            });
                            return _el$188;
                          }
                        }));
                        createRenderEffect(() => className(_el$184, `badge ${entry.status === "deployed" ? "badge-success" : entry.status === "superseded" ? "badge-secondary" : "badge-warning"}`));
                        return _el$180;
                      })()
                    }));
                    return _el$83;
                  }
                });
              }
            }), null);
            return _el$62;
          }
        });
      }
    }), null);
    insert(_el$5, createComponent(Modal, {
      get isOpen() {
        return showArgoDetails();
      },
      onClose: () => setShowArgoDetails(false),
      get title() {
        return `ArgoCD App: ${selectedArgoApp()?.name}`;
      },
      size: "lg",
      get children() {
        return createComponent(Show, {
          get when() {
            return selectedArgoApp();
          },
          get children() {
            var _el$87 = _tmpl$18(), _el$89 = _el$87.firstChild, _el$90 = _el$89.firstChild; _el$90.firstChild; var _el$92 = _el$90.nextSibling; _el$92.firstChild; var _el$94 = _el$89.nextSibling, _el$95 = _el$94.firstChild, _el$96 = _el$95.firstChild, _el$97 = _el$96.nextSibling, _el$98 = _el$95.nextSibling, _el$99 = _el$98.firstChild, _el$100 = _el$99.nextSibling, _el$101 = _el$98.nextSibling, _el$102 = _el$101.firstChild, _el$103 = _el$102.nextSibling, _el$104 = _el$103.firstChild, _el$105 = _el$101.nextSibling, _el$106 = _el$105.firstChild, _el$107 = _el$106.nextSibling, _el$108 = _el$107.firstChild, _el$109 = _el$105.nextSibling, _el$110 = _el$109.firstChild, _el$111 = _el$110.nextSibling, _el$112 = _el$109.nextSibling, _el$113 = _el$112.firstChild, _el$114 = _el$113.nextSibling, _el$115 = _el$112.nextSibling, _el$116 = _el$115.firstChild, _el$117 = _el$116.nextSibling, _el$118 = _el$115.nextSibling, _el$119 = _el$118.firstChild, _el$120 = _el$119.nextSibling, _el$121 = _el$118.nextSibling, _el$122 = _el$121.firstChild, _el$123 = _el$122.nextSibling;
            insert(_el$87, createComponent(Show, {
              get when() {
                return actionMessage();
              },
              get children() {
                var _el$88 = _tmpl$15();
                insert(_el$88, () => actionMessage()?.text);
                createRenderEffect(() => className(_el$88, `p-3 rounded-lg ${actionMessage()?.type === "success" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`));
                return _el$88;
              }
            }), _el$89);
            _el$90.$$click = handleArgoSync;
            insert(_el$90, () => actionLoading() ? "Syncing..." : "Sync", null);
            _el$92.$$click = handleArgoRefresh;
            insert(_el$92, () => actionLoading() ? "Refreshing..." : "Refresh", null);
            insert(_el$97, () => selectedArgoApp()?.project);
            insert(_el$100, () => selectedArgoApp()?.namespace);
            insert(_el$104, () => selectedArgoApp()?.syncStatus);
            insert(_el$108, () => selectedArgoApp()?.health);
            insert(_el$111, () => selectedArgoApp()?.age);
            insert(_el$114, () => selectedArgoApp()?.revision || "-");
            insert(_el$117, () => selectedArgoApp()?.repoURL || "-");
            insert(_el$120, () => selectedArgoApp()?.path || "-");
            insert(_el$123, () => selectedArgoApp()?.cluster || "-");
            createRenderEffect((_p$) => {
              var _v$0 = actionLoading(), _v$1 = actionLoading() ? 0.5 : 1, _v$10 = actionLoading(), _v$11 = actionLoading() ? 0.5 : 1, _v$12 = `badge ${selectedArgoApp()?.syncStatus === "Synced" ? "badge-success" : "badge-warning"}`, _v$13 = `badge ${selectedArgoApp()?.health === "Healthy" ? "badge-success" : "badge-error"}`;
              _v$0 !== _p$.e && (_el$90.disabled = _p$.e = _v$0);
              _v$1 !== _p$.t && setStyleProperty(_el$90, "opacity", _p$.t = _v$1);
              _v$10 !== _p$.a && (_el$92.disabled = _p$.a = _v$10);
              _v$11 !== _p$.o && setStyleProperty(_el$92, "opacity", _p$.o = _v$11);
              _v$12 !== _p$.i && className(_el$104, _p$.i = _v$12);
              _v$13 !== _p$.n && className(_el$108, _p$.n = _v$13);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0,
              i: void 0,
              n: void 0
            });
            return _el$87;
          }
        });
      }
    }), null);
    insert(_el$5, createComponent(ConfirmationModal, {
      get isOpen() {
        return showRollbackConfirm();
      },
      onClose: () => {
        if (!actionLoading()) {
          setShowRollbackConfirm(false);
          setRollbackRevision(null);
        }
      },
      title: "Rollback Helm Release",
      get message() {
        return memo(() => !!(selectedRelease() && rollbackRevision()))() ? `Are you sure you want to rollback "${selectedRelease().name}" to revision ${rollbackRevision()}?` : "Are you sure you want to rollback this Helm release?";
      },
      get details() {
        return memo(() => !!(selectedRelease() && rollbackRevision()))() ? [{
          label: "Release",
          value: selectedRelease().name
        }, {
          label: "Namespace",
          value: selectedRelease().namespace
        }, {
          label: "Target Revision",
          value: rollbackRevision().toString()
        }, {
          label: "Current Revision",
          value: selectedRelease().revision.toString()
        }] : void 0;
      },
      variant: "warning",
      confirmText: "Rollback",
      cancelText: "Cancel",
      get loading() {
        return actionLoading();
      },
      onConfirm: handleRollback,
      size: "sm"
    }), null);
    insert(_el$5, createComponent(HelmReleaseDeleteModal, {
      get isOpen() {
        return showUninstallModal();
      },
      get release() {
        return releaseToUninstall();
      },
      onClose: () => {
        setShowUninstallModal(false);
        setReleaseToUninstall(null);
      },
      onConfirm: confirmUninstallHelm,
      get loading() {
        return uninstalling();
      }
    }), null);
    return _el$5;
  })();
};
delegateEvents(["input", "click"]);

export { Plugins as default };
//# sourceMappingURL=Plugins-C9KjnxIo.js.map
