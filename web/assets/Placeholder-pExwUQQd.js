import { t as template, i as insert, m as memo, f as createRenderEffect, e as setAttribute } from './index-Bh-O-sIc.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="flex items-center justify-center min-h-screen"style=background:var(--bg-primary)><div class="max-w-2xl mx-auto p-8 text-center"><div class=mb-6><h1 class="text-4xl font-bold mb-4"style=color:var(--text-primary)></h1><p class="text-lg mb-6"style=color:var(--text-secondary)></p></div><div class="mt-8 pt-8 border-t"style=border-color:var(--border-color)><p class=text-sm style=color:var(--text-muted)>This feature is under active development. Check back soon for updates!`), _tmpl$2 = /* @__PURE__ */ template(`<div class="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"style=background:var(--bg-secondary)><svg class="w-10 h-10"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--accent-primary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2>`), _tmpl$3 = /* @__PURE__ */ template(`<div class="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"style=background:var(--bg-secondary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--accent-primary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span class="text-sm font-medium"style=color:var(--text-primary)>Coming Soon`), _tmpl$4 = /* @__PURE__ */ template(`<div class="text-left space-y-3"><h2 class="text-xl font-semibold mb-4"style=color:var(--text-primary)>Planned Features:</h2><ul class=space-y-2>`), _tmpl$5 = /* @__PURE__ */ template(`<li class="flex items-start gap-3"><svg class="w-5 h-5 mt-0.5 flex-shrink-0"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--accent-primary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span style=color:var(--text-secondary)>`);
const Placeholder = (props) => {
  return (() => {
    var _el$ = _tmpl$(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.nextSibling, _el$6 = _el$3.nextSibling; _el$6.firstChild;
    insert(_el$3, (() => {
      var _c$ = memo(() => !!props.icon);
      return () => _c$() && (() => {
        var _el$8 = _tmpl$2(), _el$9 = _el$8.firstChild, _el$0 = _el$9.firstChild;
        createRenderEffect(() => setAttribute(_el$0, "d", props.icon));
        return _el$8;
      })();
    })(), _el$4);
    insert(_el$4, () => props.title);
    insert(_el$5, () => props.description);
    insert(_el$2, (() => {
      var _c$2 = memo(() => !!props.comingSoon);
      return () => _c$2() && (() => {
        var _el$1 = _tmpl$3(), _el$10 = _el$1.firstChild; _el$10.nextSibling;
        return _el$1;
      })();
    })(), _el$6);
    insert(_el$2, (() => {
      var _c$3 = memo(() => !!(props.features && props.features.length > 0));
      return () => _c$3() && (() => {
        var _el$12 = _tmpl$4(), _el$13 = _el$12.firstChild, _el$14 = _el$13.nextSibling;
        insert(_el$14, () => props.features.map((feature) => (() => {
          var _el$15 = _tmpl$5(), _el$16 = _el$15.firstChild, _el$17 = _el$16.nextSibling;
          insert(_el$17, feature);
          return _el$15;
        })()));
        return _el$12;
      })();
    })(), _el$6);
    return _el$;
  })();
};

export { Placeholder as default };
//# sourceMappingURL=Placeholder-pExwUQQd.js.map
