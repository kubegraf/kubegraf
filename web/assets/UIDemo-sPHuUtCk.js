import { au as mergeProps, t as template, i as insert, d as createComponent, f as createRenderEffect, q as style, m as memo, g as className, h as setStyleProperty, c as createSignal, O as startExecution, v as delegateEvents } from './index-Bh-O-sIc.js';

var _tmpl$$2 = /* @__PURE__ */ template(`<div aria-hidden=true>`), _tmpl$2$2 = /* @__PURE__ */ template(`<div class=skeleton-container style=width:100%>`), _tmpl$3$2 = /* @__PURE__ */ template(`<tr class=table-row-hover>`), _tmpl$4$2 = /* @__PURE__ */ template(`<td>`), _tmpl$5$2 = /* @__PURE__ */ template(`<div class="responsive-grid gap-6">`), _tmpl$6$1 = /* @__PURE__ */ template(`<div class="card card-hover-enhanced p-6"><div class="flex items-center justify-between mb-4"></div><div class="mt-4 pt-4 border-t">`);
const Skeleton = (props) => {
  const merged = mergeProps({
    variant: "text",
    shimmer: true,
    pulse: true,
    count: 1,
    rounded: false
  }, props);
  const getVariantStyles = () => {
    switch (merged.variant) {
      case "circle":
        return {
          width: typeof merged.width === "number" ? `${merged.width}px` : merged.width || "40px",
          height: typeof merged.height === "number" ? `${merged.height}px` : merged.height || "40px",
          "border-radius": "50%"
        };
      case "rect":
        return {
          width: typeof merged.width === "number" ? `${merged.width}px` : merged.width || "100%",
          height: typeof merged.height === "number" ? `${merged.height}px` : merged.height || "100px",
          "border-radius": merged.rounded ? typeof merged.rounded === "string" ? merged.rounded : "8px" : "0"
        };
      case "card":
        return {
          width: typeof merged.width === "number" ? `${merged.width}px` : merged.width || "100%",
          height: typeof merged.height === "number" ? `${merged.height}px` : merged.height || "200px",
          "border-radius": "12px"
        };
      case "text":
      default:
        return {
          width: typeof merged.width === "number" ? `${merged.width}px` : merged.width || "100%",
          height: typeof merged.height === "number" ? `${merged.height}px` : merged.height || "1em",
          "border-radius": merged.rounded ? typeof merged.rounded === "string" ? merged.rounded : "4px" : "0"
        };
    }
  };
  const getAnimationClass = () => {
    if (merged.shimmer && merged.pulse) {
      return "skeleton-pulse skeleton-shimmer";
    } else if (merged.shimmer) {
      return "skeleton-shimmer";
    } else if (merged.pulse) {
      return "skeleton-pulse";
    }
    return "";
  };
  const renderSkeleton = (index) => {
    const variantStyles = getVariantStyles();
    const animationClass = getAnimationClass();
    const style$1 = {
      ...variantStyles,
      ...merged.style
    };
    if (merged.variant === "text" && merged.count > 1 && index < merged.count - 1) {
      style$1["margin-bottom"] = "0.5em";
    }
    return (() => {
      var _el$ = _tmpl$$2();
      createRenderEffect((_p$) => {
        var _v$ = `${animationClass} ${merged.className || ""}`, _v$2 = style$1;
        _v$ !== _p$.e && className(_el$, _p$.e = _v$);
        _p$.t = style(_el$, _v$2, _p$.t);
        return _p$;
      }, {
        e: void 0,
        t: void 0
      });
      return _el$;
    })();
  };
  return (() => {
    var _el$2 = _tmpl$2$2();
    insert(_el$2, () => Array.from({
      length: merged.count
    }, (_, i) => renderSkeleton(i)));
    return _el$2;
  })();
};
const TableRowSkeleton = (props) => {
  const rows = props.rows || 5;
  const columns = props.columns;
  return memo(() => Array.from({
    length: rows
  }).map((_, rowIndex) => (() => {
    var _el$3 = _tmpl$3$2();
    insert(_el$3, () => Array.from({
      length: columns
    }).map((_2, colIndex) => (() => {
      var _el$4 = _tmpl$4$2();
      insert(_el$4, createComponent(Skeleton, {
        variant: "text",
        width: colIndex === 0 ? "80%" : "60%",
        shimmer: true,
        pulse: true
      }));
      return _el$4;
    })()));
    return _el$3;
  })()));
};
const DashboardCardSkeleton = (props) => {
  const count = props.count || 4;
  return (() => {
    var _el$5 = _tmpl$5$2();
    insert(_el$5, () => Array.from({
      length: count
    }).map(() => (() => {
      var _el$6 = _tmpl$6$1(), _el$7 = _el$6.firstChild, _el$8 = _el$7.nextSibling;
      insert(_el$7, createComponent(Skeleton, {
        variant: "text",
        width: "40%"
      }), null);
      insert(_el$7, createComponent(Skeleton, {
        variant: "circle",
        width: "24px",
        height: "24px"
      }), null);
      insert(_el$6, createComponent(Skeleton, {
        variant: "text",
        width: "60%",
        height: "2em",
        className: "mb-2"
      }), _el$8);
      insert(_el$6, createComponent(Skeleton, {
        variant: "text",
        width: "30%"
      }), _el$8);
      insert(_el$8, createComponent(Skeleton, {
        variant: "text",
        width: "100%",
        height: "0.875em",
        count: 2
      }));
      createRenderEffect((_$p) => style(_el$8, {
        "border-color": "var(--border-color)"
      }, _$p));
      return _el$6;
    })()));
    return _el$5;
  })();
};

var _tmpl$$1 = /* @__PURE__ */ template(`<svg fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z">`), _tmpl$2$1 = /* @__PURE__ */ template(`<svg fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z">`), _tmpl$3$1 = /* @__PURE__ */ template(`<svg fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z">`), _tmpl$4$1 = /* @__PURE__ */ template(`<svg fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z">`), _tmpl$5$1 = /* @__PURE__ */ template(`<svg fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4">`), _tmpl$6 = /* @__PURE__ */ template(`<div><div class=empty-state-icon></div><h3 class=empty-state-title>`), _tmpl$7 = /* @__PURE__ */ template(`<p class=empty-state-description>`), _tmpl$8 = /* @__PURE__ */ template(`<div class=empty-state-actions>`);
const EmptyState = (props) => {
  const getVariantStyles = () => {
    switch (props.variant) {
      case "success":
        return {
          iconColor: "var(--success-color)",
          borderColor: "color-mix(in srgb, var(--success-color) 30%, transparent)",
          bgColor: "color-mix(in srgb, var(--success-color) 10%, transparent)"
        };
      case "warning":
        return {
          iconColor: "var(--warning-color)",
          borderColor: "color-mix(in srgb, var(--warning-color) 30%, transparent)",
          bgColor: "color-mix(in srgb, var(--warning-color) 10%, transparent)"
        };
      case "error":
        return {
          iconColor: "var(--error-color)",
          borderColor: "color-mix(in srgb, var(--error-color) 30%, transparent)",
          bgColor: "color-mix(in srgb, var(--error-color) 10%, transparent)"
        };
      case "info":
        return {
          iconColor: "var(--accent-primary)",
          borderColor: "color-mix(in srgb, var(--accent-primary) 30%, transparent)",
          bgColor: "color-mix(in srgb, var(--accent-primary) 10%, transparent)"
        };
      default:
        return {
          iconColor: "var(--text-muted)",
          borderColor: "var(--border-color)",
          bgColor: "var(--bg-card)"
        };
    }
  };
  const getSizeStyles = () => {
    switch (props.size) {
      case "sm":
        return {
          padding: "1.5rem",
          iconSize: "2.5rem",
          titleSize: "1rem",
          descriptionSize: "0.875rem"
        };
      case "lg":
        return {
          padding: "4rem 2rem",
          iconSize: "5rem",
          titleSize: "1.75rem",
          descriptionSize: "1.125rem"
        };
      case "md":
      default:
        return {
          padding: "3rem 2rem",
          iconSize: "4rem",
          titleSize: "1.5rem",
          descriptionSize: "1rem"
        };
    }
  };
  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();
  const defaultIcon = () => {
    switch (props.variant) {
      case "success":
        return (() => {
          var _el$ = _tmpl$$1();
          createRenderEffect((_$p) => setStyleProperty(_el$, "color", variantStyles.iconColor));
          return _el$;
        })();
      case "warning":
        return (() => {
          var _el$2 = _tmpl$2$1();
          createRenderEffect((_$p) => setStyleProperty(_el$2, "color", variantStyles.iconColor));
          return _el$2;
        })();
      case "error":
        return (() => {
          var _el$3 = _tmpl$3$1();
          createRenderEffect((_$p) => setStyleProperty(_el$3, "color", variantStyles.iconColor));
          return _el$3;
        })();
      case "info":
        return (() => {
          var _el$4 = _tmpl$4$1();
          createRenderEffect((_$p) => setStyleProperty(_el$4, "color", variantStyles.iconColor));
          return _el$4;
        })();
      default:
        return (() => {
          var _el$5 = _tmpl$5$1();
          createRenderEffect((_$p) => setStyleProperty(_el$5, "color", variantStyles.iconColor));
          return _el$5;
        })();
    }
  };
  return (() => {
    var _el$6 = _tmpl$6(), _el$7 = _el$6.firstChild, _el$8 = _el$7.nextSibling;
    insert(_el$7, () => props.icon || defaultIcon());
    insert(_el$8, () => props.title);
    insert(_el$6, (() => {
      var _c$ = memo(() => !!props.description);
      return () => _c$() && (() => {
        var _el$9 = _tmpl$7();
        insert(_el$9, () => props.description);
        createRenderEffect((_$p) => setStyleProperty(_el$9, "font-size", sizeStyles.descriptionSize));
        return _el$9;
      })();
    })(), null);
    insert(_el$6, (() => {
      var _c$2 = memo(() => !!props.actions);
      return () => _c$2() && (() => {
        var _el$0 = _tmpl$8();
        insert(_el$0, () => props.actions);
        return _el$0;
      })();
    })(), null);
    createRenderEffect((_p$) => {
      var _v$ = `empty-state-enhanced ${props.className || ""}`, _v$2 = sizeStyles.padding, _v$3 = variantStyles.bgColor, _v$4 = variantStyles.borderColor, _v$5 = sizeStyles.iconSize, _v$6 = variantStyles.iconColor, _v$7 = sizeStyles.titleSize;
      _v$ !== _p$.e && className(_el$6, _p$.e = _v$);
      _v$2 !== _p$.t && setStyleProperty(_el$6, "padding", _p$.t = _v$2);
      _v$3 !== _p$.a && setStyleProperty(_el$6, "background", _p$.a = _v$3);
      _v$4 !== _p$.o && setStyleProperty(_el$6, "border-color", _p$.o = _v$4);
      _v$5 !== _p$.i && setStyleProperty(_el$7, "font-size", _p$.i = _v$5);
      _v$6 !== _p$.n && setStyleProperty(_el$7, "color", _p$.n = _v$6);
      _v$7 !== _p$.s && setStyleProperty(_el$8, "font-size", _p$.s = _v$7);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0,
      i: void 0,
      n: void 0,
      s: void 0
    });
    return _el$6;
  })();
};
const NoDataEmptyState = (props) => createComponent(EmptyState, {
  get title() {
    return memo(() => !!props.resource)() ? `No ${props.resource} Found` : "No Data Available";
  },
  get description() {
    return memo(() => !!props.resource)() ? `There are no ${props.resource.toLowerCase()} to display.` : "There is no data to display at the moment.";
  },
  variant: "info",
  get actions() {
    return props.actions;
  }
});
const ErrorEmptyState = (props) => createComponent(EmptyState, {
  get title() {
    return props.title || "Something Went Wrong";
  },
  get description() {
    return props.description || "An error occurred while loading the data. Please try again.";
  },
  variant: "error",
  get actions() {
    return props.actions;
  }
});
const NoResultsEmptyState = (props) => createComponent(EmptyState, {
  title: "No Results Found",
  get description() {
    return memo(() => !!props.searchQuery)() ? `No results found for "${props.searchQuery}". Try a different search term.` : "No results match your criteria.";
  },
  variant: "warning",
  get actions() {
    return props.actions;
  }
});

var _tmpl$ = /* @__PURE__ */ template(`<div class="p-6 space-y-8"><div><h2 class="text-2xl font-bold mb-4 gradient-text">UI/UX Improvements Demo</h2><p class="text-gray-400 mb-6">This demo showcases the UI/UX improvements implemented for KubēGraf.</p></div><section class="card p-6 card-hover-enhanced"><h3 class="text-xl font-semibold mb-4">Loading Skeletons</h3><p class="text-gray-400 mb-6">Enhanced loading states with pulse and shimmer effects for better perceived performance.</p><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class=space-y-4><h4 class=font-medium>Text Skeletons</h4></div><div class=space-y-4><h4 class=font-medium>Shape Skeletons</h4><div class="flex items-center gap-4"></div></div></div><div class=mt-6><h4 class="font-medium mb-4">Dashboard Card Skeletons</h4></div><div class=mt-6><h4 class="font-medium mb-4">Table Row Skeletons</h4><table class=w-full><thead><tr><th class="text-left p-3">Name</th><th class="text-left p-3">Status</th><th class="text-left p-3">Age</th><th class="text-left p-3">Actions</th></tr></thead><tbody></tbody></table></div></section><section class="card p-6 card-hover-enhanced"><h3 class="text-xl font-semibold mb-4">Enhanced Empty States</h3><p class="text-gray-400 mb-6">Informative empty states with appropriate icons, colors, and actions.</p><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><div><h4 class="font-medium mb-3">No Data</h4></div><div><h4 class="font-medium mb-3">Error State</h4></div><div><h4 class="font-medium mb-3">No Results</h4></div></div><div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6"><div><h4 class="font-medium mb-3">Custom Empty State</h4></div><div><h4 class="font-medium mb-3">Success State</h4></div></div></section><section class="card p-6 card-hover-enhanced"><h3 class="text-xl font-semibold mb-4">Interactive Feedback</h3><p class="text-gray-400 mb-6">Enhanced hover states, focus states, and animations.</p><div class=space-y-6><div><h4 class="font-medium mb-3">Enhanced Buttons</h4><div class="flex flex-wrap gap-4"><button class="btn-accent px-6 py-3 rounded-lg btn-ripple">Primary Button</button><button class="btn-secondary px-6 py-3 rounded-lg btn-ripple">Secondary Button</button><button class="px-6 py-3 rounded-lg focus-visible-enhanced"style=background:var(--bg-tertiary);color:var(--text-primary)>Focus Visible</button><button class="btn-accent px-6 py-3 rounded-lg btn-ripple">Run ExecutionPanel Demo</button></div></div><div><h4 class="font-medium mb-3">Enhanced Cards</h4><div class="grid grid-cols-1 md:grid-cols-3 gap-4"></div></div><div><h4 class="font-medium mb-3">Enhanced Inputs</h4><div class="space-y-4 max-w-md"><input type=text placeholder="Search resources..."class="w-full input-enhanced"><textarea placeholder="Enter description..."class="w-full input-enhanced"rows=3></textarea><select class="w-full input-enhanced"><option value>Select an option</option><option value=1>Option 1</option><option value=2>Option 2</option></select></div></div><div><h4 class="font-medium mb-3">Enhanced Status Indicators</h4><div class="flex flex-wrap gap-4"><span class="status-indicator status-indicator-running">Running</span><span class="status-indicator status-indicator-pending">Pending</span><span class="status-indicator status-indicator-failed">Failed</span></div></div></div></section><section class="card p-6 card-hover-enhanced"><h3 class="text-xl font-semibold mb-4">Utility Classes</h3><p class="text-gray-400 mb-6">Additional utility classes for common UI patterns.</p><div class=space-y-6><div><h4 class="font-medium mb-3">Text Truncation</h4><div class="space-y-2 max-w-md"><div class="line-clamp-1 p-2 bg-gray-800 rounded">This is a very long text that will be truncated with an ellipsis when it exceeds the container width.</div><div class="truncate-2 p-2 bg-gray-800 rounded">This is a multi-line text that will be truncated after two lines. The text continues here but will be hidden with an ellipsis at the end of the second line.</div></div></div><div><h4 class="font-medium mb-3">Gradient Text & Borders</h4><div class=space-y-4><h2 class="text-3xl font-bold text-gradient">Gradient Text Example</h2><div class="border-gradient p-6 rounded-lg"><p>This card has a gradient border using CSS border-image.</p></div></div></div><div><h4 class="font-medium mb-3">Enhanced Tooltips</h4><div class="flex gap-4"><button class="px-4 py-2 rounded-lg bg-gray-800 tooltip-enhanced"data-tooltip="This is an enhanced tooltip">Hover for Tooltip</button><button class="px-4 py-2 rounded-lg bg-gray-800 tooltip-enhanced"data-tooltip="Tooltip with arrow and shadow">Another Tooltip</button></div></div></div></section><section class="card p-6 card-hover-enhanced"><h3 class="text-xl font-semibold mb-4">Responsive Improvements</h3><p class="text-gray-400 mb-6">Responsive grid layouts that adapt to different screen sizes.</p><div class="responsive-grid gap-4">`), _tmpl$2 = /* @__PURE__ */ template(`<button class="btn-accent px-4 py-2 rounded-lg">Connect Cluster`), _tmpl$3 = /* @__PURE__ */ template(`<button class="btn-secondary px-4 py-2 rounded-lg">View Details`), _tmpl$4 = /* @__PURE__ */ template(`<div class="card card-hover-enhanced p-4"><div class="flex items-center justify-between mb-3"><span class=font-medium>Card </span><span class="status-indicator status-indicator-running">Running</span></div><p class="text-sm text-gray-400">Hover over this card to see the enhanced hover effect with shimmer animation.`), _tmpl$5 = /* @__PURE__ */ template(`<div class="card p-4 text-center"><div class="text-lg font-medium">Item </div><div class="text-sm text-gray-400">Resize window to see responsive behavior`);
const UIDemo = () => {
  const [loading, setLoading] = createSignal(true);
  const [hasError, setHasError] = createSignal(false);
  const [hasData, setHasData] = createSignal(false);
  createSignal("");
  setTimeout(() => {
    setLoading(false);
    setHasError(false);
    setHasData(true);
  }, 2e3);
  return (() => {
    var _el$ = _tmpl$(), _el$2 = _el$.firstChild, _el$3 = _el$2.nextSibling, _el$4 = _el$3.firstChild, _el$5 = _el$4.nextSibling, _el$6 = _el$5.nextSibling, _el$7 = _el$6.firstChild; _el$7.firstChild; var _el$9 = _el$7.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling, _el$10 = _el$6.nextSibling; _el$10.firstChild; var _el$12 = _el$10.nextSibling, _el$13 = _el$12.firstChild, _el$14 = _el$13.nextSibling, _el$15 = _el$14.firstChild, _el$16 = _el$15.nextSibling, _el$17 = _el$3.nextSibling, _el$18 = _el$17.firstChild, _el$19 = _el$18.nextSibling, _el$20 = _el$19.nextSibling, _el$21 = _el$20.firstChild; _el$21.firstChild; var _el$23 = _el$21.nextSibling; _el$23.firstChild; var _el$25 = _el$23.nextSibling; _el$25.firstChild; var _el$27 = _el$20.nextSibling, _el$28 = _el$27.firstChild; _el$28.firstChild; var _el$30 = _el$28.nextSibling; _el$30.firstChild; var _el$32 = _el$17.nextSibling, _el$33 = _el$32.firstChild, _el$34 = _el$33.nextSibling, _el$35 = _el$34.nextSibling, _el$36 = _el$35.firstChild, _el$37 = _el$36.firstChild, _el$38 = _el$37.nextSibling, _el$39 = _el$38.firstChild, _el$40 = _el$39.nextSibling, _el$41 = _el$40.nextSibling, _el$42 = _el$41.nextSibling, _el$43 = _el$36.nextSibling, _el$44 = _el$43.firstChild, _el$45 = _el$44.nextSibling, _el$46 = _el$32.nextSibling, _el$47 = _el$46.nextSibling, _el$48 = _el$47.firstChild, _el$49 = _el$48.nextSibling, _el$50 = _el$49.nextSibling;
    insert(_el$7, createComponent(Skeleton, {
      variant: "text",
      width: "100%"
    }), null);
    insert(_el$7, createComponent(Skeleton, {
      variant: "text",
      width: "80%"
    }), null);
    insert(_el$7, createComponent(Skeleton, {
      variant: "text",
      width: "60%",
      count: 3
    }), null);
    insert(_el$1, createComponent(Skeleton, {
      variant: "circle",
      width: "40px",
      height: "40px"
    }), null);
    insert(_el$1, createComponent(Skeleton, {
      variant: "rect",
      width: "100px",
      height: "40px",
      rounded: "8px"
    }), null);
    insert(_el$9, createComponent(Skeleton, {
      variant: "card",
      width: "100%",
      height: "120px"
    }), null);
    insert(_el$10, createComponent(DashboardCardSkeleton, {
      count: 3
    }), null);
    insert(_el$16, createComponent(TableRowSkeleton, {
      columns: 4,
      rows: 3
    }));
    insert(_el$21, createComponent(NoDataEmptyState, {
      resource: "Pods"
    }), null);
    insert(_el$23, createComponent(ErrorEmptyState, {
      title: "Failed to Load",
      description: "Unable to fetch cluster data. Please check your connection."
    }), null);
    insert(_el$25, createComponent(NoResultsEmptyState, {
      searchQuery: "production"
    }), null);
    insert(_el$28, createComponent(EmptyState, {
      title: "Welcome to KubēGraf!",
      description: "Get started by connecting to your Kubernetes cluster.",
      variant: "info",
      size: "lg",
      get actions() {
        return _tmpl$2();
      }
    }), null);
    insert(_el$30, createComponent(EmptyState, {
      title: "All Systems Operational",
      description: "All services are running smoothly.",
      variant: "success",
      get actions() {
        return _tmpl$3();
      }
    }), null);
    _el$42.$$click = () => startExecution({
      label: "Example: echo dry-run",
      command: "echo",
      args: ["[kubegraf] This is a real shell command executed via the streaming panel."],
      mode: "dry-run",
      kubernetesEquivalent: false
    });
    insert(_el$45, () => [1, 2, 3].map((i) => (() => {
      var _el$53 = _tmpl$4(), _el$54 = _el$53.firstChild, _el$55 = _el$54.firstChild; _el$55.firstChild;
      insert(_el$55, i, null);
      return _el$53;
    })()));
    insert(_el$50, () => [1, 2, 3, 4, 5, 6].map((i) => (() => {
      var _el$57 = _tmpl$5(), _el$58 = _el$57.firstChild; _el$58.firstChild;
      insert(_el$58, i, null);
      return _el$57;
    })()));
    return _el$;
  })();
};
delegateEvents(["click"]);

export { UIDemo as default };
//# sourceMappingURL=UIDemo-sPHuUtCk.js.map
