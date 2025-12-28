import { t as template, i as insert, d as createComponent, S as Show, f as createRenderEffect, g as className, h as setStyleProperty, e as setAttribute } from './index-B8I71-mz.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class=loading-spinner-container style=position:relative><svg class=loading-spinner viewBox="0 0 50 50"><circle class=loading-spinner-circle cx=25 cy=25 r=20 fill=none stroke-width=4 stroke-linecap=round stroke-dasharray="80 50">`), _tmpl$2 = /* @__PURE__ */ template(`<div class="flex items-center justify-center gap-1">`), _tmpl$3 = /* @__PURE__ */ template(`<div class=rounded-full style=opacity:0.6>`), _tmpl$4 = /* @__PURE__ */ template(`<div class="flex items-end justify-center gap-1">`), _tmpl$5 = /* @__PURE__ */ template(`<div class=rounded-sm style="opacity:0.6;transform-origin:bottom center">`), _tmpl$6 = /* @__PURE__ */ template(`<div class=rounded-full style=opacity:0.7>`), _tmpl$7 = /* @__PURE__ */ template(`<div class=relative><div class="absolute inset-0 rounded-full border-4 border-transparent"></div><div class="absolute inset-2 rounded-full border-4 border-transparent">`), _tmpl$8 = /* @__PURE__ */ template(`<div class="absolute inset-0 flex items-center justify-center"><span class="text-xs font-semibold">%`), _tmpl$9 = /* @__PURE__ */ template(`<div class=relative><svg class="absolute inset-0"><circle fill=none stroke=var(--border-color) stroke-width=4 stroke-linecap=round></circle><circle fill=none stroke-width=4 stroke-linecap=round style="transition:stroke-dashoffset 0.3s ease">`), _tmpl$0 = /* @__PURE__ */ template(`<div class=text-sm style=color:var(--text-secondary)>`), _tmpl$1 = /* @__PURE__ */ template(`<div style=gap:8px>`), _tmpl$10 = /* @__PURE__ */ template(`<div class="fixed inset-0 flex items-center justify-center z-50"style="background:rgba(0, 0, 0, 0.4);backdrop-filter:blur(4px)"><div class="flex flex-col items-center gap-4 p-8 rounded-xl"style="background:var(--bg-secondary);border:1px solid var(--border-color);box-shadow:0 20px 40px rgba(0, 0, 0, 0.3)">`);
const LoadingSpinner = (props) => {
  const sizes = {
    xs: "16px",
    sm: "24px",
    md: "32px",
    lg: "48px",
    xl: "64px"
  };
  const getSize = () => {
    if (typeof props.size === "number") {
      return `${props.size}px`;
    }
    return sizes[props.size || "md"];
  };
  const getSpeed = () => {
    switch (props.speed) {
      case "slow":
        return "2s";
      case "fast":
        return "0.6s";
      default:
        return "1.4s";
    }
  };
  const getColor = () => props.color || "var(--accent-primary)";
  const renderCircleSpinner = () => {
    const size = getSize();
    const speed = getSpeed();
    const color = getColor();
    return (() => {
      var _el$ = _tmpl$(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild;
      setStyleProperty(_el$, "width", size);
      setStyleProperty(_el$, "height", size);
      setStyleProperty(_el$2, "width", size);
      setStyleProperty(_el$2, "height", size);
      setAttribute(_el$3, "stroke", color);
      setStyleProperty(_el$3, "animation", `spin ${speed} linear infinite`);
      return _el$;
    })();
  };
  const renderDotsSpinner = () => {
    const size = getSize();
    const speed = getSpeed();
    const color = getColor();
    const dotSize = parseInt(size) / 4;
    return (() => {
      var _el$4 = _tmpl$2();
      setStyleProperty(_el$4, "width", size);
      setStyleProperty(_el$4, "height", size);
      insert(_el$4, () => [0, 1, 2].map((i) => (() => {
        var _el$5 = _tmpl$3();
        setStyleProperty(_el$5, "width", `${dotSize}px`);
        setStyleProperty(_el$5, "height", `${dotSize}px`);
        setStyleProperty(_el$5, "background", color);
        setStyleProperty(_el$5, "animation", `pulse ${speed} ease-in-out infinite ${i * 0.15}s`);
        return _el$5;
      })()));
      return _el$4;
    })();
  };
  const renderBarsSpinner = () => {
    const size = getSize();
    const speed = getSpeed();
    const color = getColor();
    const barWidth = parseInt(size) / 5;
    const barHeight = parseInt(size) * 0.6;
    return (() => {
      var _el$6 = _tmpl$4();
      setStyleProperty(_el$6, "width", size);
      setStyleProperty(_el$6, "height", size);
      insert(_el$6, () => [0, 1, 2].map((i) => (() => {
        var _el$7 = _tmpl$5();
        setStyleProperty(_el$7, "width", `${barWidth}px`);
        setStyleProperty(_el$7, "height", `${barHeight}px`);
        setStyleProperty(_el$7, "background", color);
        setStyleProperty(_el$7, "animation", `scale-up ${speed} ease-in-out infinite ${i * 0.15}s`);
        return _el$7;
      })()));
      return _el$6;
    })();
  };
  const renderPulseSpinner = () => {
    const size = getSize();
    const speed = getSpeed();
    const color = getColor();
    return (() => {
      var _el$8 = _tmpl$6();
      setStyleProperty(_el$8, "width", size);
      setStyleProperty(_el$8, "height", size);
      setStyleProperty(_el$8, "background", color);
      setStyleProperty(_el$8, "animation", `pulse ${speed} ease-in-out infinite`);
      return _el$8;
    })();
  };
  const renderRingSpinner = () => {
    const size = getSize();
    const speed = getSpeed();
    const color = getColor();
    return (() => {
      var _el$9 = _tmpl$7(), _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling;
      setStyleProperty(_el$9, "width", size);
      setStyleProperty(_el$9, "height", size);
      setStyleProperty(_el$0, "border-top-color", color);
      setStyleProperty(_el$0, "border-right-color", color);
      setStyleProperty(_el$0, "animation", `spin ${speed} linear infinite`);
      setStyleProperty(_el$1, "border-bottom-color", color);
      setStyleProperty(_el$1, "border-left-color", color);
      setStyleProperty(_el$1, "animation", `spin ${speed} linear infinite reverse`);
      return _el$9;
    })();
  };
  const renderSpinner = () => {
    switch (props.type) {
      case "dots":
        return renderDotsSpinner();
      case "bars":
        return renderBarsSpinner();
      case "pulse":
        return renderPulseSpinner();
      case "ring":
        return renderRingSpinner();
      default:
        return renderCircleSpinner();
    }
  };
  const renderProgress = () => {
    if (props.progress === void 0) return null;
    const size = getSize();
    const color = getColor();
    const numericSize = parseInt(size);
    const strokeWidth = 4;
    const radius = numericSize / 2 - strokeWidth;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - props.progress / 100 * circumference;
    return (() => {
      var _el$10 = _tmpl$9(), _el$11 = _el$10.firstChild, _el$12 = _el$11.firstChild, _el$13 = _el$12.nextSibling;
      setStyleProperty(_el$10, "width", size);
      setStyleProperty(_el$10, "height", size);
      setAttribute(_el$11, "viewBox", `0 0 ${numericSize} ${numericSize}`);
      setAttribute(_el$12, "cx", numericSize / 2);
      setAttribute(_el$12, "cy", numericSize / 2);
      setAttribute(_el$12, "r", radius);
      setAttribute(_el$13, "cx", numericSize / 2);
      setAttribute(_el$13, "cy", numericSize / 2);
      setAttribute(_el$13, "r", radius);
      setAttribute(_el$13, "stroke", color);
      setAttribute(_el$13, "stroke-dasharray", `${circumference}`);
      setAttribute(_el$13, "stroke-dashoffset", offset);
      setAttribute(_el$13, "transform", `rotate(-90 ${numericSize / 2} ${numericSize / 2})`);
      insert(_el$10, createComponent(Show, {
        get when() {
          return props.showProgress;
        },
        get children() {
          var _el$14 = _tmpl$8(), _el$15 = _el$14.firstChild, _el$16 = _el$15.firstChild;
          setStyleProperty(_el$15, "color", color);
          insert(_el$15, () => Math.round(props.progress), _el$16);
          return _el$14;
        }
      }), null);
      return _el$10;
    })();
  };
  const spinnerContent = () => {
    if (props.progress !== void 0) {
      return renderProgress();
    }
    return renderSpinner();
  };
  const containerClass = () => {
    const classes = [];
    if (!props.inline) {
      classes.push("flex items-center justify-center");
    }
    if (props.class) {
      classes.push(props.class);
    }
    return classes.join(" ");
  };
  const content = (() => {
    var _el$17 = _tmpl$1();
    insert(_el$17, spinnerContent, null);
    insert(_el$17, createComponent(Show, {
      get when() {
        return props.showText || props.text;
      },
      get children() {
        var _el$18 = _tmpl$0();
        insert(_el$18, () => props.text || "Loading...");
        return _el$18;
      }
    }), null);
    createRenderEffect(() => className(_el$17, containerClass()));
    return _el$17;
  })();
  if (props.fullPage) {
    return (() => {
      var _el$19 = _tmpl$10(), _el$20 = _el$19.firstChild;
      insert(_el$20, content);
      return _el$19;
    })();
  }
  return content;
};
const style = document.createElement("style");
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.6; }
    50% { transform: scale(1.1); opacity: 1; }
  }
  
  @keyframes scale-up {
    0%, 100% { transform: scaleY(0.6); opacity: 0.6; }
    50% { transform: scaleY(1); opacity: 1; }
  }
`;
if (!document.querySelector("style[data-loading-spinner]")) {
  style.setAttribute("data-loading-spinner", "true");
  document.head.appendChild(style);
}

export { LoadingSpinner as L };
//# sourceMappingURL=LoadingSpinner-DFudwHAm.js.map
