const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/Pods-CU_FJW62.js","assets/resourceCache-P2tk5pf3.js","assets/YAMLViewer-BH5fzWmG.js","assets/YAMLEditor-DeL5BHL5.js","assets/CommandPreview-DFya1hMl.js","assets/DescribeModal-BOrOE6vF.js","assets/ActionMenu-F4cRW3cz.js","assets/useBulkSelection-CgTI3QZq.js","assets/workload-navigation-Cle66AyL.js","assets/Deployments-BPGSvB5Z.js","assets/ConfirmationModal-BOUoNqd5.js","assets/RelatedResources-rUnE1-tT.js","assets/StatefulSets-B2JwKsu8.js","assets/themeBackground-Cv9JHSq7.js","assets/DaemonSets-DyPisz29.js","assets/CronJobs-CHeDdW68.js","assets/Jobs-CHP3FtV8.js","assets/PDB-CshyeJ9b.js","assets/SecurityRecommendations-CTifCKbv.js","assets/HPA-DH0OriQq.js","assets/Services-DzaLwI6q.js","assets/LoadingSpinner-DFudwHAm.js","assets/Ingresses-CW3mtysc.js","assets/Namespaces-CDwvXzdI.js","assets/ConfigMaps-B9M7GJsW.js","assets/Secrets-C4y2Zitl.js","assets/Certificates-HWH3vjDo.js","assets/tableCellStyles-CGbMKoA7.js","assets/Nodes-D897WuTj.js","assets/ResourceMap-DIZUt6FW.js","assets/zoom-Y-yTGFIv.js","assets/TrafficMapPage-DR7Ahwmw.js","assets/Security-BbBQw-Pa.js","assets/Plugins-D3CWEh_H.js","assets/MLflow-DE3LkriT.js","assets/mlflow-rx36th3-.js","assets/TrainingJobs-CUUD5fG8.js","assets/TrainingJobDetails-BKu-HaS-.js","assets/Feast-DCGWCa3l.js","assets/FeastInstallWizard-Dh_p6pZr.js","assets/MLWorkflows-Bnk73wgo.js","assets/Placeholder--r6uK_lq.js","assets/Anomalies-BSw3f-dI.js","assets/Incidents-umPibq7X.js","assets/Apps-CaRd_9AS.js","assets/Storage-CY5S0IW3.js","assets/RBAC-L4u8A-A_.js","assets/ServiceAccounts-DQprciAD.js","assets/CustomResources-0FRcFOFQ.js","assets/NetworkPolicies-h2hqutzP.js"])))=>i.map(i=>d[i]);
true&&(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
}());

const sharedConfig = {
  context: undefined,
  registry: undefined,
  effects: undefined,
  done: false,
  getContextId() {
    return getContextId(this.context.count);
  },
  getNextContextId() {
    return getContextId(this.context.count++);
  }
};
function getContextId(count) {
  const num = String(count),
    len = num.length - 1;
  return sharedConfig.context.id + (len ? String.fromCharCode(96 + len) : "") + num;
}
function setHydrateContext(context) {
  sharedConfig.context = context;
}

const IS_DEV = false;
const equalFn = (a, b) => a === b;
const $PROXY = Symbol("solid-proxy");
const SUPPORTS_PROXY = typeof Proxy === "function";
const $TRACK = Symbol("solid-track");
const signalOptions = {
  equals: equalFn
};
let runEffects = runQueue;
const STALE = 1;
const PENDING = 2;
const UNOWNED = {
  owned: null,
  cleanups: null,
  context: null,
  owner: null
};
const NO_INIT = {};
var Owner = null;
let Transition = null;
let ExternalSourceConfig = null;
let Listener = null;
let Updates = null;
let Effects = null;
let ExecCount = 0;
function createRoot(fn, detachedOwner) {
  const listener = Listener,
    owner = Owner,
    unowned = fn.length === 0,
    current = detachedOwner === undefined ? owner : detachedOwner,
    root = unowned ? UNOWNED : {
      owned: null,
      cleanups: null,
      context: current ? current.context : null,
      owner: current
    },
    updateFn = unowned ? fn : () => fn(() => untrack(() => cleanNode(root)));
  Owner = root;
  Listener = null;
  try {
    return runUpdates(updateFn, true);
  } finally {
    Listener = listener;
    Owner = owner;
  }
}
function createSignal(value, options) {
  options = options ? Object.assign({}, signalOptions, options) : signalOptions;
  const s = {
    value,
    observers: null,
    observerSlots: null,
    comparator: options.equals || undefined
  };
  const setter = value => {
    if (typeof value === "function") {
      value = value(s.value);
    }
    return writeSignal(s, value);
  };
  return [readSignal.bind(s), setter];
}
function createComputed(fn, value, options) {
  const c = createComputation(fn, value, true, STALE);
  updateComputation(c);
}
function createRenderEffect(fn, value, options) {
  const c = createComputation(fn, value, false, STALE);
  updateComputation(c);
}
function createEffect(fn, value, options) {
  runEffects = runUserEffects;
  const c = createComputation(fn, value, false, STALE);
  if (!options || !options.render) c.user = true;
  Effects ? Effects.push(c) : updateComputation(c);
}
function createMemo(fn, value, options) {
  options = options ? Object.assign({}, signalOptions, options) : signalOptions;
  const c = createComputation(fn, value, true, 0);
  c.observers = null;
  c.observerSlots = null;
  c.comparator = options.equals || undefined;
  updateComputation(c);
  return readSignal.bind(c);
}
function isPromise(v) {
  return v && typeof v === "object" && "then" in v;
}
function createResource(pSource, pFetcher, pOptions) {
  let source;
  let fetcher;
  let options;
  if (typeof pFetcher === "function") {
    source = pSource;
    fetcher = pFetcher;
    options = {};
  } else {
    source = true;
    fetcher = pSource;
    options = pFetcher || {};
  }
  let pr = null,
    initP = NO_INIT,
    id = null,
    scheduled = false,
    resolved = "initialValue" in options,
    dynamic = typeof source === "function" && createMemo(source);
  const contexts = new Set(),
    [value, setValue] = (options.storage || createSignal)(options.initialValue),
    [error, setError] = createSignal(undefined),
    [track, trigger] = createSignal(undefined, {
      equals: false
    }),
    [state, setState] = createSignal(resolved ? "ready" : "unresolved");
  if (sharedConfig.context) {
    id = sharedConfig.getNextContextId();
    if (options.ssrLoadFrom === "initial") initP = options.initialValue;else if (sharedConfig.load && sharedConfig.has(id)) initP = sharedConfig.load(id);
  }
  function loadEnd(p, v, error, key) {
    if (pr === p) {
      pr = null;
      key !== undefined && (resolved = true);
      if ((p === initP || v === initP) && options.onHydrated) queueMicrotask(() => options.onHydrated(key, {
        value: v
      }));
      initP = NO_INIT;
      completeLoad(v, error);
    }
    return v;
  }
  function completeLoad(v, err) {
    runUpdates(() => {
      if (err === undefined) setValue(() => v);
      setState(err !== undefined ? "errored" : resolved ? "ready" : "unresolved");
      setError(err);
      for (const c of contexts.keys()) c.decrement();
      contexts.clear();
    }, false);
  }
  function read() {
    const c = SuspenseContext,
      v = value(),
      err = error();
    if (err !== undefined && !pr) throw err;
    if (Listener && !Listener.user && c) ;
    return v;
  }
  function load(refetching = true) {
    if (refetching !== false && scheduled) return;
    scheduled = false;
    const lookup = dynamic ? dynamic() : source;
    if (lookup == null || lookup === false) {
      loadEnd(pr, untrack(value));
      return;
    }
    let error;
    const p = initP !== NO_INIT ? initP : untrack(() => {
      try {
        return fetcher(lookup, {
          value: value(),
          refetching
        });
      } catch (fetcherError) {
        error = fetcherError;
      }
    });
    if (error !== undefined) {
      loadEnd(pr, undefined, castError(error), lookup);
      return;
    } else if (!isPromise(p)) {
      loadEnd(pr, p, undefined, lookup);
      return p;
    }
    pr = p;
    if ("v" in p) {
      if (p.s === 1) loadEnd(pr, p.v, undefined, lookup);else loadEnd(pr, undefined, castError(p.v), lookup);
      return p;
    }
    scheduled = true;
    queueMicrotask(() => scheduled = false);
    runUpdates(() => {
      setState(resolved ? "refreshing" : "pending");
      trigger();
    }, false);
    return p.then(v => loadEnd(p, v, undefined, lookup), e => loadEnd(p, undefined, castError(e), lookup));
  }
  Object.defineProperties(read, {
    state: {
      get: () => state()
    },
    error: {
      get: () => error()
    },
    loading: {
      get() {
        const s = state();
        return s === "pending" || s === "refreshing";
      }
    },
    latest: {
      get() {
        if (!resolved) return read();
        const err = error();
        if (err && !pr) throw err;
        return value();
      }
    }
  });
  let owner = Owner;
  if (dynamic) createComputed(() => (owner = Owner, load(false)));else load(false);
  return [read, {
    refetch: info => runWithOwner(owner, () => load(info)),
    mutate: setValue
  }];
}
function batch(fn) {
  return runUpdates(fn, false);
}
function untrack(fn) {
  if (Listener === null) return fn();
  const listener = Listener;
  Listener = null;
  try {
    if (ExternalSourceConfig) ;
    return fn();
  } finally {
    Listener = listener;
  }
}
function on(deps, fn, options) {
  const isArray = Array.isArray(deps);
  let prevInput;
  return prevValue => {
    let input;
    if (isArray) {
      input = Array(deps.length);
      for (let i = 0; i < deps.length; i++) input[i] = deps[i]();
    } else input = deps();
    const result = untrack(() => fn(input, prevInput, prevValue));
    prevInput = input;
    return result;
  };
}
function onMount(fn) {
  createEffect(() => untrack(fn));
}
function onCleanup(fn) {
  if (Owner === null) ;else if (Owner.cleanups === null) Owner.cleanups = [fn];else Owner.cleanups.push(fn);
  return fn;
}
function getOwner() {
  return Owner;
}
function runWithOwner(o, fn) {
  const prev = Owner;
  const prevListener = Listener;
  Owner = o;
  Listener = null;
  try {
    return runUpdates(fn, true);
  } catch (err) {
    handleError(err);
  } finally {
    Owner = prev;
    Listener = prevListener;
  }
}
function createContext(defaultValue, options) {
  const id = Symbol("context");
  return {
    id,
    Provider: createProvider(id),
    defaultValue
  };
}
function useContext(context) {
  let value;
  return Owner && Owner.context && (value = Owner.context[context.id]) !== undefined ? value : context.defaultValue;
}
function children(fn) {
  const children = createMemo(fn);
  const memo = createMemo(() => resolveChildren(children()));
  memo.toArray = () => {
    const c = memo();
    return Array.isArray(c) ? c : c != null ? [c] : [];
  };
  return memo;
}
let SuspenseContext;
function readSignal() {
  if (this.sources && (this.state)) {
    if ((this.state) === STALE) updateComputation(this);else {
      const updates = Updates;
      Updates = null;
      runUpdates(() => lookUpstream(this), false);
      Updates = updates;
    }
  }
  if (Listener) {
    const sSlot = this.observers ? this.observers.length : 0;
    if (!Listener.sources) {
      Listener.sources = [this];
      Listener.sourceSlots = [sSlot];
    } else {
      Listener.sources.push(this);
      Listener.sourceSlots.push(sSlot);
    }
    if (!this.observers) {
      this.observers = [Listener];
      this.observerSlots = [Listener.sources.length - 1];
    } else {
      this.observers.push(Listener);
      this.observerSlots.push(Listener.sources.length - 1);
    }
  }
  return this.value;
}
function writeSignal(node, value, isComp) {
  let current = node.value;
  if (!node.comparator || !node.comparator(current, value)) {
    node.value = value;
    if (node.observers && node.observers.length) {
      runUpdates(() => {
        for (let i = 0; i < node.observers.length; i += 1) {
          const o = node.observers[i];
          const TransitionRunning = Transition && Transition.running;
          if (TransitionRunning && Transition.disposed.has(o)) ;
          if (TransitionRunning ? !o.tState : !o.state) {
            if (o.pure) Updates.push(o);else Effects.push(o);
            if (o.observers) markDownstream(o);
          }
          if (!TransitionRunning) o.state = STALE;
        }
        if (Updates.length > 10e5) {
          Updates = [];
          if (IS_DEV) ;
          throw new Error();
        }
      }, false);
    }
  }
  return value;
}
function updateComputation(node) {
  if (!node.fn) return;
  cleanNode(node);
  const time = ExecCount;
  runComputation(node, node.value, time);
}
function runComputation(node, value, time) {
  let nextValue;
  const owner = Owner,
    listener = Listener;
  Listener = Owner = node;
  try {
    nextValue = node.fn(value);
  } catch (err) {
    if (node.pure) {
      {
        node.state = STALE;
        node.owned && node.owned.forEach(cleanNode);
        node.owned = null;
      }
    }
    node.updatedAt = time + 1;
    return handleError(err);
  } finally {
    Listener = listener;
    Owner = owner;
  }
  if (!node.updatedAt || node.updatedAt <= time) {
    if (node.updatedAt != null && "observers" in node) {
      writeSignal(node, nextValue);
    } else node.value = nextValue;
    node.updatedAt = time;
  }
}
function createComputation(fn, init, pure, state = STALE, options) {
  const c = {
    fn,
    state: state,
    updatedAt: null,
    owned: null,
    sources: null,
    sourceSlots: null,
    cleanups: null,
    value: init,
    owner: Owner,
    context: Owner ? Owner.context : null,
    pure
  };
  if (Owner === null) ;else if (Owner !== UNOWNED) {
    {
      if (!Owner.owned) Owner.owned = [c];else Owner.owned.push(c);
    }
  }
  return c;
}
function runTop(node) {
  if ((node.state) === 0) return;
  if ((node.state) === PENDING) return lookUpstream(node);
  if (node.suspense && untrack(node.suspense.inFallback)) return node.suspense.effects.push(node);
  const ancestors = [node];
  while ((node = node.owner) && (!node.updatedAt || node.updatedAt < ExecCount)) {
    if (node.state) ancestors.push(node);
  }
  for (let i = ancestors.length - 1; i >= 0; i--) {
    node = ancestors[i];
    if ((node.state) === STALE) {
      updateComputation(node);
    } else if ((node.state) === PENDING) {
      const updates = Updates;
      Updates = null;
      runUpdates(() => lookUpstream(node, ancestors[0]), false);
      Updates = updates;
    }
  }
}
function runUpdates(fn, init) {
  if (Updates) return fn();
  let wait = false;
  if (!init) Updates = [];
  if (Effects) wait = true;else Effects = [];
  ExecCount++;
  try {
    const res = fn();
    completeUpdates(wait);
    return res;
  } catch (err) {
    if (!wait) Effects = null;
    Updates = null;
    handleError(err);
  }
}
function completeUpdates(wait) {
  if (Updates) {
    runQueue(Updates);
    Updates = null;
  }
  if (wait) return;
  const e = Effects;
  Effects = null;
  if (e.length) runUpdates(() => runEffects(e), false);
}
function runQueue(queue) {
  for (let i = 0; i < queue.length; i++) runTop(queue[i]);
}
function runUserEffects(queue) {
  let i,
    userLength = 0;
  for (i = 0; i < queue.length; i++) {
    const e = queue[i];
    if (!e.user) runTop(e);else queue[userLength++] = e;
  }
  if (sharedConfig.context) {
    if (sharedConfig.count) {
      sharedConfig.effects || (sharedConfig.effects = []);
      sharedConfig.effects.push(...queue.slice(0, userLength));
      return;
    }
    setHydrateContext();
  }
  if (sharedConfig.effects && (sharedConfig.done || !sharedConfig.count)) {
    queue = [...sharedConfig.effects, ...queue];
    userLength += sharedConfig.effects.length;
    delete sharedConfig.effects;
  }
  for (i = 0; i < userLength; i++) runTop(queue[i]);
}
function lookUpstream(node, ignore) {
  node.state = 0;
  for (let i = 0; i < node.sources.length; i += 1) {
    const source = node.sources[i];
    if (source.sources) {
      const state = source.state;
      if (state === STALE) {
        if (source !== ignore && (!source.updatedAt || source.updatedAt < ExecCount)) runTop(source);
      } else if (state === PENDING) lookUpstream(source, ignore);
    }
  }
}
function markDownstream(node) {
  for (let i = 0; i < node.observers.length; i += 1) {
    const o = node.observers[i];
    if (!o.state) {
      o.state = PENDING;
      if (o.pure) Updates.push(o);else Effects.push(o);
      o.observers && markDownstream(o);
    }
  }
}
function cleanNode(node) {
  let i;
  if (node.sources) {
    while (node.sources.length) {
      const source = node.sources.pop(),
        index = node.sourceSlots.pop(),
        obs = source.observers;
      if (obs && obs.length) {
        const n = obs.pop(),
          s = source.observerSlots.pop();
        if (index < obs.length) {
          n.sourceSlots[s] = index;
          obs[index] = n;
          source.observerSlots[index] = s;
        }
      }
    }
  }
  if (node.tOwned) {
    for (i = node.tOwned.length - 1; i >= 0; i--) cleanNode(node.tOwned[i]);
    delete node.tOwned;
  }
  if (node.owned) {
    for (i = node.owned.length - 1; i >= 0; i--) cleanNode(node.owned[i]);
    node.owned = null;
  }
  if (node.cleanups) {
    for (i = node.cleanups.length - 1; i >= 0; i--) node.cleanups[i]();
    node.cleanups = null;
  }
  node.state = 0;
}
function castError(err) {
  if (err instanceof Error) return err;
  return new Error(typeof err === "string" ? err : "Unknown error", {
    cause: err
  });
}
function handleError(err, owner = Owner) {
  const error = castError(err);
  throw error;
}
function resolveChildren(children) {
  if (typeof children === "function" && !children.length) return resolveChildren(children());
  if (Array.isArray(children)) {
    const results = [];
    for (let i = 0; i < children.length; i++) {
      const result = resolveChildren(children[i]);
      Array.isArray(result) ? results.push.apply(results, result) : results.push(result);
    }
    return results;
  }
  return children;
}
function createProvider(id, options) {
  return function provider(props) {
    let res;
    createRenderEffect(() => res = untrack(() => {
      Owner.context = {
        ...Owner.context,
        [id]: props.value
      };
      return children(() => props.children);
    }), undefined);
    return res;
  };
}

const FALLBACK = Symbol("fallback");
function dispose(d) {
  for (let i = 0; i < d.length; i++) d[i]();
}
function mapArray(list, mapFn, options = {}) {
  let items = [],
    mapped = [],
    disposers = [],
    len = 0,
    indexes = mapFn.length > 1 ? [] : null;
  onCleanup(() => dispose(disposers));
  return () => {
    let newItems = list() || [],
      newLen = newItems.length,
      i,
      j;
    newItems[$TRACK];
    return untrack(() => {
      let newIndices, newIndicesNext, temp, tempdisposers, tempIndexes, start, end, newEnd, item;
      if (newLen === 0) {
        if (len !== 0) {
          dispose(disposers);
          disposers = [];
          items = [];
          mapped = [];
          len = 0;
          indexes && (indexes = []);
        }
        if (options.fallback) {
          items = [FALLBACK];
          mapped[0] = createRoot(disposer => {
            disposers[0] = disposer;
            return options.fallback();
          });
          len = 1;
        }
      }
      else if (len === 0) {
        mapped = new Array(newLen);
        for (j = 0; j < newLen; j++) {
          items[j] = newItems[j];
          mapped[j] = createRoot(mapper);
        }
        len = newLen;
      } else {
        temp = new Array(newLen);
        tempdisposers = new Array(newLen);
        indexes && (tempIndexes = new Array(newLen));
        for (start = 0, end = Math.min(len, newLen); start < end && items[start] === newItems[start]; start++);
        for (end = len - 1, newEnd = newLen - 1; end >= start && newEnd >= start && items[end] === newItems[newEnd]; end--, newEnd--) {
          temp[newEnd] = mapped[end];
          tempdisposers[newEnd] = disposers[end];
          indexes && (tempIndexes[newEnd] = indexes[end]);
        }
        newIndices = new Map();
        newIndicesNext = new Array(newEnd + 1);
        for (j = newEnd; j >= start; j--) {
          item = newItems[j];
          i = newIndices.get(item);
          newIndicesNext[j] = i === undefined ? -1 : i;
          newIndices.set(item, j);
        }
        for (i = start; i <= end; i++) {
          item = items[i];
          j = newIndices.get(item);
          if (j !== undefined && j !== -1) {
            temp[j] = mapped[i];
            tempdisposers[j] = disposers[i];
            indexes && (tempIndexes[j] = indexes[i]);
            j = newIndicesNext[j];
            newIndices.set(item, j);
          } else disposers[i]();
        }
        for (j = start; j < newLen; j++) {
          if (j in temp) {
            mapped[j] = temp[j];
            disposers[j] = tempdisposers[j];
            if (indexes) {
              indexes[j] = tempIndexes[j];
              indexes[j](j);
            }
          } else mapped[j] = createRoot(mapper);
        }
        mapped = mapped.slice(0, len = newLen);
        items = newItems.slice(0);
      }
      return mapped;
    });
    function mapper(disposer) {
      disposers[j] = disposer;
      if (indexes) {
        const [s, set] = createSignal(j);
        indexes[j] = set;
        return mapFn(newItems[j], s);
      }
      return mapFn(newItems[j]);
    }
  };
}
function createComponent(Comp, props) {
  return untrack(() => Comp(props || {}));
}
function trueFn() {
  return true;
}
const propTraps = {
  get(_, property, receiver) {
    if (property === $PROXY) return receiver;
    return _.get(property);
  },
  has(_, property) {
    if (property === $PROXY) return true;
    return _.has(property);
  },
  set: trueFn,
  deleteProperty: trueFn,
  getOwnPropertyDescriptor(_, property) {
    return {
      configurable: true,
      enumerable: true,
      get() {
        return _.get(property);
      },
      set: trueFn,
      deleteProperty: trueFn
    };
  },
  ownKeys(_) {
    return _.keys();
  }
};
function resolveSource(s) {
  return !(s = typeof s === "function" ? s() : s) ? {} : s;
}
function resolveSources() {
  for (let i = 0, length = this.length; i < length; ++i) {
    const v = this[i]();
    if (v !== undefined) return v;
  }
}
function mergeProps(...sources) {
  let proxy = false;
  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    proxy = proxy || !!s && $PROXY in s;
    sources[i] = typeof s === "function" ? (proxy = true, createMemo(s)) : s;
  }
  if (SUPPORTS_PROXY && proxy) {
    return new Proxy({
      get(property) {
        for (let i = sources.length - 1; i >= 0; i--) {
          const v = resolveSource(sources[i])[property];
          if (v !== undefined) return v;
        }
      },
      has(property) {
        for (let i = sources.length - 1; i >= 0; i--) {
          if (property in resolveSource(sources[i])) return true;
        }
        return false;
      },
      keys() {
        const keys = [];
        for (let i = 0; i < sources.length; i++) keys.push(...Object.keys(resolveSource(sources[i])));
        return [...new Set(keys)];
      }
    }, propTraps);
  }
  const sourcesMap = {};
  const defined = Object.create(null);
  for (let i = sources.length - 1; i >= 0; i--) {
    const source = sources[i];
    if (!source) continue;
    const sourceKeys = Object.getOwnPropertyNames(source);
    for (let i = sourceKeys.length - 1; i >= 0; i--) {
      const key = sourceKeys[i];
      if (key === "__proto__" || key === "constructor") continue;
      const desc = Object.getOwnPropertyDescriptor(source, key);
      if (!defined[key]) {
        defined[key] = desc.get ? {
          enumerable: true,
          configurable: true,
          get: resolveSources.bind(sourcesMap[key] = [desc.get.bind(source)])
        } : desc.value !== undefined ? desc : undefined;
      } else {
        const sources = sourcesMap[key];
        if (sources) {
          if (desc.get) sources.push(desc.get.bind(source));else if (desc.value !== undefined) sources.push(() => desc.value);
        }
      }
    }
  }
  const target = {};
  const definedKeys = Object.keys(defined);
  for (let i = definedKeys.length - 1; i >= 0; i--) {
    const key = definedKeys[i],
      desc = defined[key];
    if (desc && desc.get) Object.defineProperty(target, key, desc);else target[key] = desc ? desc.value : undefined;
  }
  return target;
}
function splitProps(props, ...keys) {
  const len = keys.length;
  if (SUPPORTS_PROXY && $PROXY in props) {
    const blocked = len > 1 ? keys.flat() : keys[0];
    const res = keys.map(k => {
      return new Proxy({
        get(property) {
          return k.includes(property) ? props[property] : undefined;
        },
        has(property) {
          return k.includes(property) && property in props;
        },
        keys() {
          return k.filter(property => property in props);
        }
      }, propTraps);
    });
    res.push(new Proxy({
      get(property) {
        return blocked.includes(property) ? undefined : props[property];
      },
      has(property) {
        return blocked.includes(property) ? false : property in props;
      },
      keys() {
        return Object.keys(props).filter(k => !blocked.includes(k));
      }
    }, propTraps));
    return res;
  }
  const objects = [];
  for (let i = 0; i <= len; i++) {
    objects[i] = {};
  }
  for (const propName of Object.getOwnPropertyNames(props)) {
    let keyIndex = len;
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].includes(propName)) {
        keyIndex = i;
        break;
      }
    }
    const desc = Object.getOwnPropertyDescriptor(props, propName);
    const isDefaultDesc = !desc.get && !desc.set && desc.enumerable && desc.writable && desc.configurable;
    isDefaultDesc ? objects[keyIndex][propName] = desc.value : Object.defineProperty(objects[keyIndex], propName, desc);
  }
  return objects;
}
function lazy(fn) {
  let comp;
  let p;
  const wrap = props => {
    const ctx = sharedConfig.context;
    if (ctx) {
      const [s, set] = createSignal();
      sharedConfig.count || (sharedConfig.count = 0);
      sharedConfig.count++;
      (p || (p = fn())).then(mod => {
        !sharedConfig.done && setHydrateContext(ctx);
        sharedConfig.count--;
        set(() => mod.default);
        setHydrateContext();
      });
      comp = s;
    } else if (!comp) {
      const [s] = createResource(() => (p || (p = fn())).then(mod => mod.default));
      comp = s;
    }
    let Comp;
    return createMemo(() => (Comp = comp()) ? untrack(() => {
      if (IS_DEV) ;
      if (!ctx || sharedConfig.done) return Comp(props);
      const c = sharedConfig.context;
      setHydrateContext(ctx);
      const r = Comp(props);
      setHydrateContext(c);
      return r;
    }) : "");
  };
  wrap.preload = () => p || ((p = fn()).then(mod => comp = () => mod.default), p);
  return wrap;
}

const narrowedError = name => `Stale read from <${name}>.`;
function For(props) {
  const fallback = "fallback" in props && {
    fallback: () => props.fallback
  };
  return createMemo(mapArray(() => props.each, props.children, fallback || undefined));
}
function Show(props) {
  const keyed = props.keyed;
  const conditionValue = createMemo(() => props.when, undefined, undefined);
  const condition = keyed ? conditionValue : createMemo(conditionValue, undefined, {
    equals: (a, b) => !a === !b
  });
  return createMemo(() => {
    const c = condition();
    if (c) {
      const child = props.children;
      const fn = typeof child === "function" && child.length > 0;
      return fn ? untrack(() => child(keyed ? c : () => {
        if (!untrack(condition)) throw narrowedError("Show");
        return conditionValue();
      })) : child;
    }
    return props.fallback;
  }, undefined, undefined);
}
function Switch(props) {
  const chs = children(() => props.children);
  const switchFunc = createMemo(() => {
    const ch = chs();
    const mps = Array.isArray(ch) ? ch : [ch];
    let func = () => undefined;
    for (let i = 0; i < mps.length; i++) {
      const index = i;
      const mp = mps[i];
      const prevFunc = func;
      const conditionValue = createMemo(() => prevFunc() ? undefined : mp.when, undefined, undefined);
      const condition = mp.keyed ? conditionValue : createMemo(conditionValue, undefined, {
        equals: (a, b) => !a === !b
      });
      func = () => prevFunc() || (condition() ? [index, conditionValue, mp] : undefined);
    }
    return func;
  });
  return createMemo(() => {
    const sel = switchFunc()();
    if (!sel) return props.fallback;
    const [index, conditionValue, mp] = sel;
    const child = mp.children;
    const fn = typeof child === "function" && child.length > 0;
    return fn ? untrack(() => child(mp.keyed ? conditionValue() : () => {
      if (untrack(switchFunc)()?.[0] !== index) throw narrowedError("Match");
      return conditionValue();
    })) : child;
  }, undefined, undefined);
}
function Match(props) {
  return props;
}

const booleans = ["allowfullscreen", "async", "alpha",
"autofocus",
"autoplay", "checked", "controls", "default", "disabled", "formnovalidate", "hidden",
"indeterminate", "inert",
"ismap", "loop", "multiple", "muted", "nomodule", "novalidate", "open", "playsinline", "readonly", "required", "reversed", "seamless",
"selected", "adauctionheaders",
"browsingtopics",
"credentialless",
"defaultchecked", "defaultmuted", "defaultselected", "defer", "disablepictureinpicture", "disableremoteplayback", "preservespitch",
"shadowrootclonable", "shadowrootcustomelementregistry",
"shadowrootdelegatesfocus", "shadowrootserializable",
"sharedstoragewritable"
];
const Properties = /*#__PURE__*/new Set([
"className", "value",
"readOnly", "noValidate", "formNoValidate", "isMap", "noModule", "playsInline", "adAuctionHeaders",
"allowFullscreen", "browsingTopics",
"defaultChecked", "defaultMuted", "defaultSelected", "disablePictureInPicture", "disableRemotePlayback", "preservesPitch", "shadowRootClonable", "shadowRootCustomElementRegistry",
"shadowRootDelegatesFocus", "shadowRootSerializable",
"sharedStorageWritable",
...booleans]);
const ChildProperties = /*#__PURE__*/new Set(["innerHTML", "textContent", "innerText", "children"]);
const Aliases = /*#__PURE__*/Object.assign(Object.create(null), {
  className: "class",
  htmlFor: "for"
});
const PropAliases = /*#__PURE__*/Object.assign(Object.create(null), {
  class: "className",
  novalidate: {
    $: "noValidate",
    FORM: 1
  },
  formnovalidate: {
    $: "formNoValidate",
    BUTTON: 1,
    INPUT: 1
  },
  ismap: {
    $: "isMap",
    IMG: 1
  },
  nomodule: {
    $: "noModule",
    SCRIPT: 1
  },
  playsinline: {
    $: "playsInline",
    VIDEO: 1
  },
  readonly: {
    $: "readOnly",
    INPUT: 1,
    TEXTAREA: 1
  },
  adauctionheaders: {
    $: "adAuctionHeaders",
    IFRAME: 1
  },
  allowfullscreen: {
    $: "allowFullscreen",
    IFRAME: 1
  },
  browsingtopics: {
    $: "browsingTopics",
    IMG: 1
  },
  defaultchecked: {
    $: "defaultChecked",
    INPUT: 1
  },
  defaultmuted: {
    $: "defaultMuted",
    AUDIO: 1,
    VIDEO: 1
  },
  defaultselected: {
    $: "defaultSelected",
    OPTION: 1
  },
  disablepictureinpicture: {
    $: "disablePictureInPicture",
    VIDEO: 1
  },
  disableremoteplayback: {
    $: "disableRemotePlayback",
    AUDIO: 1,
    VIDEO: 1
  },
  preservespitch: {
    $: "preservesPitch",
    AUDIO: 1,
    VIDEO: 1
  },
  shadowrootclonable: {
    $: "shadowRootClonable",
    TEMPLATE: 1
  },
  shadowrootdelegatesfocus: {
    $: "shadowRootDelegatesFocus",
    TEMPLATE: 1
  },
  shadowrootserializable: {
    $: "shadowRootSerializable",
    TEMPLATE: 1
  },
  sharedstoragewritable: {
    $: "sharedStorageWritable",
    IFRAME: 1,
    IMG: 1
  }
});
function getPropAlias(prop, tagName) {
  const a = PropAliases[prop];
  return typeof a === "object" ? a[tagName] ? a["$"] : undefined : a;
}
const DelegatedEvents = /*#__PURE__*/new Set(["beforeinput", "click", "dblclick", "contextmenu", "focusin", "focusout", "input", "keydown", "keyup", "mousedown", "mousemove", "mouseout", "mouseover", "mouseup", "pointerdown", "pointermove", "pointerout", "pointerover", "pointerup", "touchend", "touchmove", "touchstart"]);
const SVGElements = /*#__PURE__*/new Set([
"altGlyph", "altGlyphDef", "altGlyphItem", "animate", "animateColor", "animateMotion", "animateTransform", "circle", "clipPath", "color-profile", "cursor", "defs", "desc", "ellipse", "feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDistantLight", "feDropShadow", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence", "filter", "font", "font-face", "font-face-format", "font-face-name", "font-face-src", "font-face-uri", "foreignObject", "g", "glyph", "glyphRef", "hkern", "image", "line", "linearGradient", "marker", "mask", "metadata", "missing-glyph", "mpath", "path", "pattern", "polygon", "polyline", "radialGradient", "rect",
"set", "stop",
"svg", "switch", "symbol", "text", "textPath",
"tref", "tspan", "use", "view", "vkern"]);
const SVGNamespace = {
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace"
};

const memo = fn => createMemo(() => fn());

function reconcileArrays(parentNode, a, b) {
  let bLength = b.length,
    aEnd = a.length,
    bEnd = bLength,
    aStart = 0,
    bStart = 0,
    after = a[aEnd - 1].nextSibling,
    map = null;
  while (aStart < aEnd || bStart < bEnd) {
    if (a[aStart] === b[bStart]) {
      aStart++;
      bStart++;
      continue;
    }
    while (a[aEnd - 1] === b[bEnd - 1]) {
      aEnd--;
      bEnd--;
    }
    if (aEnd === aStart) {
      const node = bEnd < bLength ? bStart ? b[bStart - 1].nextSibling : b[bEnd - bStart] : after;
      while (bStart < bEnd) parentNode.insertBefore(b[bStart++], node);
    } else if (bEnd === bStart) {
      while (aStart < aEnd) {
        if (!map || !map.has(a[aStart])) a[aStart].remove();
        aStart++;
      }
    } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
      const node = a[--aEnd].nextSibling;
      parentNode.insertBefore(b[bStart++], a[aStart++].nextSibling);
      parentNode.insertBefore(b[--bEnd], node);
      a[aEnd] = b[bEnd];
    } else {
      if (!map) {
        map = new Map();
        let i = bStart;
        while (i < bEnd) map.set(b[i], i++);
      }
      const index = map.get(a[aStart]);
      if (index != null) {
        if (bStart < index && index < bEnd) {
          let i = aStart,
            sequence = 1,
            t;
          while (++i < aEnd && i < bEnd) {
            if ((t = map.get(a[i])) == null || t !== index + sequence) break;
            sequence++;
          }
          if (sequence > index - bStart) {
            const node = a[aStart];
            while (bStart < index) parentNode.insertBefore(b[bStart++], node);
          } else parentNode.replaceChild(b[bStart++], a[aStart++]);
        } else aStart++;
      } else a[aStart++].remove();
    }
  }
}

const $$EVENTS = "_$DX_DELEGATE";
function render(code, element, init, options = {}) {
  let disposer;
  createRoot(dispose => {
    disposer = dispose;
    element === document ? code() : insert(element, code(), element.firstChild ? null : undefined, init);
  }, options.owner);
  return () => {
    disposer();
    element.textContent = "";
  };
}
function template(html, isImportNode, isSVG, isMathML) {
  let node;
  const create = () => {
    const t = isMathML ? document.createElementNS("http://www.w3.org/1998/Math/MathML", "template") : document.createElement("template");
    t.innerHTML = html;
    return isSVG ? t.content.firstChild.firstChild : isMathML ? t.firstChild : t.content.firstChild;
  };
  const fn = isImportNode ? () => untrack(() => document.importNode(node || (node = create()), true)) : () => (node || (node = create())).cloneNode(true);
  fn.cloneNode = fn;
  return fn;
}
function delegateEvents(eventNames, document = window.document) {
  const e = document[$$EVENTS] || (document[$$EVENTS] = new Set());
  for (let i = 0, l = eventNames.length; i < l; i++) {
    const name = eventNames[i];
    if (!e.has(name)) {
      e.add(name);
      document.addEventListener(name, eventHandler);
    }
  }
}
function setAttribute(node, name, value) {
  if (isHydrating(node)) return;
  if (value == null) node.removeAttribute(name);else node.setAttribute(name, value);
}
function setAttributeNS(node, namespace, name, value) {
  if (isHydrating(node)) return;
  if (value == null) node.removeAttributeNS(namespace, name);else node.setAttributeNS(namespace, name, value);
}
function setBoolAttribute(node, name, value) {
  if (isHydrating(node)) return;
  value ? node.setAttribute(name, "") : node.removeAttribute(name);
}
function className(node, value) {
  if (isHydrating(node)) return;
  if (value == null) node.removeAttribute("class");else node.className = value;
}
function addEventListener(node, name, handler, delegate) {
  if (delegate) {
    if (Array.isArray(handler)) {
      node[`$$${name}`] = handler[0];
      node[`$$${name}Data`] = handler[1];
    } else node[`$$${name}`] = handler;
  } else if (Array.isArray(handler)) {
    const handlerFn = handler[0];
    node.addEventListener(name, handler[0] = e => handlerFn.call(node, handler[1], e));
  } else node.addEventListener(name, handler, typeof handler !== "function" && handler);
}
function classList(node, value, prev = {}) {
  const classKeys = Object.keys(value || {}),
    prevKeys = Object.keys(prev);
  let i, len;
  for (i = 0, len = prevKeys.length; i < len; i++) {
    const key = prevKeys[i];
    if (!key || key === "undefined" || value[key]) continue;
    toggleClassKey(node, key, false);
    delete prev[key];
  }
  for (i = 0, len = classKeys.length; i < len; i++) {
    const key = classKeys[i],
      classValue = !!value[key];
    if (!key || key === "undefined" || prev[key] === classValue || !classValue) continue;
    toggleClassKey(node, key, true);
    prev[key] = classValue;
  }
  return prev;
}
function style(node, value, prev) {
  if (!value) return prev ? setAttribute(node, "style") : value;
  const nodeStyle = node.style;
  if (typeof value === "string") return nodeStyle.cssText = value;
  typeof prev === "string" && (nodeStyle.cssText = prev = undefined);
  prev || (prev = {});
  value || (value = {});
  let v, s;
  for (s in prev) {
    value[s] == null && nodeStyle.removeProperty(s);
    delete prev[s];
  }
  for (s in value) {
    v = value[s];
    if (v !== prev[s]) {
      nodeStyle.setProperty(s, v);
      prev[s] = v;
    }
  }
  return prev;
}
function setStyleProperty(node, name, value) {
  value != null ? node.style.setProperty(name, value) : node.style.removeProperty(name);
}
function spread(node, props = {}, isSVG, skipChildren) {
  const prevProps = {};
  {
    createRenderEffect(() => prevProps.children = insertExpression(node, props.children, prevProps.children));
  }
  createRenderEffect(() => typeof props.ref === "function" && use(props.ref, node));
  createRenderEffect(() => assign(node, props, isSVG, true, prevProps, true));
  return prevProps;
}
function use(fn, element, arg) {
  return untrack(() => fn(element, arg));
}
function insert(parent, accessor, marker, initial) {
  if (marker !== undefined && !initial) initial = [];
  if (typeof accessor !== "function") return insertExpression(parent, accessor, initial, marker);
  createRenderEffect(current => insertExpression(parent, accessor(), current, marker), initial);
}
function assign(node, props, isSVG, skipChildren, prevProps = {}, skipRef = false) {
  props || (props = {});
  for (const prop in prevProps) {
    if (!(prop in props)) {
      if (prop === "children") continue;
      prevProps[prop] = assignProp(node, prop, null, prevProps[prop], isSVG, skipRef, props);
    }
  }
  for (const prop in props) {
    if (prop === "children") {
      continue;
    }
    const value = props[prop];
    prevProps[prop] = assignProp(node, prop, value, prevProps[prop], isSVG, skipRef, props);
  }
}
function getNextElement(template) {
  let node,
    key,
    hydrating = isHydrating();
  if (!hydrating || !(node = sharedConfig.registry.get(key = getHydrationKey()))) {
    return template();
  }
  if (sharedConfig.completed) sharedConfig.completed.add(node);
  sharedConfig.registry.delete(key);
  return node;
}
function isHydrating(node) {
  return !!sharedConfig.context && !sharedConfig.done && (!node || node.isConnected);
}
function toPropertyName(name) {
  return name.toLowerCase().replace(/-([a-z])/g, (_, w) => w.toUpperCase());
}
function toggleClassKey(node, key, value) {
  const classNames = key.trim().split(/\s+/);
  for (let i = 0, nameLen = classNames.length; i < nameLen; i++) node.classList.toggle(classNames[i], value);
}
function assignProp(node, prop, value, prev, isSVG, skipRef, props) {
  let isCE, isProp, isChildProp, propAlias, forceProp;
  if (prop === "style") return style(node, value, prev);
  if (prop === "classList") return classList(node, value, prev);
  if (value === prev) return prev;
  if (prop === "ref") {
    if (!skipRef) value(node);
  } else if (prop.slice(0, 3) === "on:") {
    const e = prop.slice(3);
    prev && node.removeEventListener(e, prev, typeof prev !== "function" && prev);
    value && node.addEventListener(e, value, typeof value !== "function" && value);
  } else if (prop.slice(0, 10) === "oncapture:") {
    const e = prop.slice(10);
    prev && node.removeEventListener(e, prev, true);
    value && node.addEventListener(e, value, true);
  } else if (prop.slice(0, 2) === "on") {
    const name = prop.slice(2).toLowerCase();
    const delegate = DelegatedEvents.has(name);
    if (!delegate && prev) {
      const h = Array.isArray(prev) ? prev[0] : prev;
      node.removeEventListener(name, h);
    }
    if (delegate || value) {
      addEventListener(node, name, value, delegate);
      delegate && delegateEvents([name]);
    }
  } else if (prop.slice(0, 5) === "attr:") {
    setAttribute(node, prop.slice(5), value);
  } else if (prop.slice(0, 5) === "bool:") {
    setBoolAttribute(node, prop.slice(5), value);
  } else if ((forceProp = prop.slice(0, 5) === "prop:") || (isChildProp = ChildProperties.has(prop)) || !isSVG && ((propAlias = getPropAlias(prop, node.tagName)) || (isProp = Properties.has(prop))) || (isCE = node.nodeName.includes("-") || "is" in props)) {
    if (forceProp) {
      prop = prop.slice(5);
      isProp = true;
    } else if (isHydrating(node)) return value;
    if (prop === "class" || prop === "className") className(node, value);else if (isCE && !isProp && !isChildProp) node[toPropertyName(prop)] = value;else node[propAlias || prop] = value;
  } else {
    const ns = isSVG && prop.indexOf(":") > -1 && SVGNamespace[prop.split(":")[0]];
    if (ns) setAttributeNS(node, ns, prop, value);else setAttribute(node, Aliases[prop] || prop, value);
  }
  return value;
}
function eventHandler(e) {
  if (sharedConfig.registry && sharedConfig.events) {
    if (sharedConfig.events.find(([el, ev]) => ev === e)) return;
  }
  let node = e.target;
  const key = `$$${e.type}`;
  const oriTarget = e.target;
  const oriCurrentTarget = e.currentTarget;
  const retarget = value => Object.defineProperty(e, "target", {
    configurable: true,
    value
  });
  const handleNode = () => {
    const handler = node[key];
    if (handler && !node.disabled) {
      const data = node[`${key}Data`];
      data !== undefined ? handler.call(node, data, e) : handler.call(node, e);
      if (e.cancelBubble) return;
    }
    node.host && typeof node.host !== "string" && !node.host._$host && node.contains(e.target) && retarget(node.host);
    return true;
  };
  const walkUpTree = () => {
    while (handleNode() && (node = node._$host || node.parentNode || node.host));
  };
  Object.defineProperty(e, "currentTarget", {
    configurable: true,
    get() {
      return node || document;
    }
  });
  if (sharedConfig.registry && !sharedConfig.done) sharedConfig.done = _$HY.done = true;
  if (e.composedPath) {
    const path = e.composedPath();
    retarget(path[0]);
    for (let i = 0; i < path.length - 2; i++) {
      node = path[i];
      if (!handleNode()) break;
      if (node._$host) {
        node = node._$host;
        walkUpTree();
        break;
      }
      if (node.parentNode === oriCurrentTarget) {
        break;
      }
    }
  }
  else walkUpTree();
  retarget(oriTarget);
}
function insertExpression(parent, value, current, marker, unwrapArray) {
  const hydrating = isHydrating(parent);
  if (hydrating) {
    !current && (current = [...parent.childNodes]);
    let cleaned = [];
    for (let i = 0; i < current.length; i++) {
      const node = current[i];
      if (node.nodeType === 8 && node.data.slice(0, 2) === "!$") node.remove();else cleaned.push(node);
    }
    current = cleaned;
  }
  while (typeof current === "function") current = current();
  if (value === current) return current;
  const t = typeof value,
    multi = marker !== undefined;
  parent = multi && current[0] && current[0].parentNode || parent;
  if (t === "string" || t === "number") {
    if (hydrating) return current;
    if (t === "number") {
      value = value.toString();
      if (value === current) return current;
    }
    if (multi) {
      let node = current[0];
      if (node && node.nodeType === 3) {
        node.data !== value && (node.data = value);
      } else node = document.createTextNode(value);
      current = cleanChildren(parent, current, marker, node);
    } else {
      if (current !== "" && typeof current === "string") {
        current = parent.firstChild.data = value;
      } else current = parent.textContent = value;
    }
  } else if (value == null || t === "boolean") {
    if (hydrating) return current;
    current = cleanChildren(parent, current, marker);
  } else if (t === "function") {
    createRenderEffect(() => {
      let v = value();
      while (typeof v === "function") v = v();
      current = insertExpression(parent, v, current, marker);
    });
    return () => current;
  } else if (Array.isArray(value)) {
    const array = [];
    const currentArray = current && Array.isArray(current);
    if (normalizeIncomingArray(array, value, current, unwrapArray)) {
      createRenderEffect(() => current = insertExpression(parent, array, current, marker, true));
      return () => current;
    }
    if (hydrating) {
      if (!array.length) return current;
      if (marker === undefined) return current = [...parent.childNodes];
      let node = array[0];
      if (node.parentNode !== parent) return current;
      const nodes = [node];
      while ((node = node.nextSibling) !== marker) nodes.push(node);
      return current = nodes;
    }
    if (array.length === 0) {
      current = cleanChildren(parent, current, marker);
      if (multi) return current;
    } else if (currentArray) {
      if (current.length === 0) {
        appendNodes(parent, array, marker);
      } else reconcileArrays(parent, current, array);
    } else {
      current && cleanChildren(parent);
      appendNodes(parent, array);
    }
    current = array;
  } else if (value.nodeType) {
    if (hydrating && value.parentNode) return current = multi ? [value] : value;
    if (Array.isArray(current)) {
      if (multi) return current = cleanChildren(parent, current, marker, value);
      cleanChildren(parent, current, null, value);
    } else if (current == null || current === "" || !parent.firstChild) {
      parent.appendChild(value);
    } else parent.replaceChild(value, parent.firstChild);
    current = value;
  } else ;
  return current;
}
function normalizeIncomingArray(normalized, array, current, unwrap) {
  let dynamic = false;
  for (let i = 0, len = array.length; i < len; i++) {
    let item = array[i],
      prev = current && current[normalized.length],
      t;
    if (item == null || item === true || item === false) ; else if ((t = typeof item) === "object" && item.nodeType) {
      normalized.push(item);
    } else if (Array.isArray(item)) {
      dynamic = normalizeIncomingArray(normalized, item, prev) || dynamic;
    } else if (t === "function") {
      if (unwrap) {
        while (typeof item === "function") item = item();
        dynamic = normalizeIncomingArray(normalized, Array.isArray(item) ? item : [item], Array.isArray(prev) ? prev : [prev]) || dynamic;
      } else {
        normalized.push(item);
        dynamic = true;
      }
    } else {
      const value = String(item);
      if (prev && prev.nodeType === 3 && prev.data === value) normalized.push(prev);else normalized.push(document.createTextNode(value));
    }
  }
  return dynamic;
}
function appendNodes(parent, array, marker = null) {
  for (let i = 0, len = array.length; i < len; i++) parent.insertBefore(array[i], marker);
}
function cleanChildren(parent, current, marker, replacement) {
  if (marker === undefined) return parent.textContent = "";
  const node = replacement || document.createTextNode("");
  if (current.length) {
    let inserted = false;
    for (let i = current.length - 1; i >= 0; i--) {
      const el = current[i];
      if (node !== el) {
        const isParent = el.parentNode === parent;
        if (!inserted && !i) isParent ? parent.replaceChild(node, el) : parent.insertBefore(node, marker);else isParent && el.remove();
      } else inserted = true;
    }
  } else parent.insertBefore(node, marker);
  return [node];
}
function getHydrationKey() {
  return sharedConfig.getNextContextId();
}
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
function createElement(tagName, isSVG = false, is = undefined) {
  return isSVG ? document.createElementNS(SVG_NAMESPACE, tagName) : document.createElement(tagName, {
    is
  });
}
function Portal(props) {
  const {
      useShadow
    } = props,
    marker = document.createTextNode(""),
    mount = () => props.mount || document.body,
    owner = getOwner();
  let content;
  let hydrating = !!sharedConfig.context;
  createEffect(() => {
    if (hydrating) getOwner().user = hydrating = false;
    content || (content = runWithOwner(owner, () => createMemo(() => props.children)));
    const el = mount();
    if (el instanceof HTMLHeadElement) {
      const [clean, setClean] = createSignal(false);
      const cleanup = () => setClean(true);
      createRoot(dispose => insert(el, () => !clean() ? content() : dispose(), null));
      onCleanup(cleanup);
    } else {
      const container = createElement(props.isSVG ? "g" : "div", props.isSVG),
        renderRoot = useShadow && container.attachShadow ? container.attachShadow({
          mode: "open"
        }) : container;
      Object.defineProperty(container, "_$host", {
        get() {
          return marker.parentNode;
        },
        configurable: true
      });
      insert(renderRoot, content);
      el.appendChild(container);
      props.ref && props.ref(container);
      onCleanup(() => el.removeChild(container));
    }
  }, undefined, {
    render: !hydrating
  });
  return marker;
}
function createDynamic(component, props) {
  const cached = createMemo(component);
  return createMemo(() => {
    const component = cached();
    switch (typeof component) {
      case "function":
        return untrack(() => component(props));
      case "string":
        const isSvg = SVGElements.has(component);
        const el = sharedConfig.context ? getNextElement() : createElement(component, isSvg, untrack(() => props.is));
        spread(el, props, isSvg);
        return el;
    }
  });
}
function Dynamic(props) {
  const [, others] = splitProps(props, ["component"]);
  return createDynamic(() => props.component, others);
}

const getInitialView = () => {
  if (typeof sessionStorage !== "undefined") {
    const stored = sessionStorage.getItem("kubegraf-current-view");
    if (stored) {
      return stored;
    }
  }
  return "clustermanager";
};
const [currentViewBase, setCurrentViewBase] = createSignal(getInitialView());
const currentView = currentViewBase;
const setCurrentView = (view) => {
  setCurrentViewBase(view);
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem("kubegraf-current-view", view);
  }
};
const getInitialSidebarAutoHide = () => {
  try {
    return localStorage.getItem("kubegraf-sidebar-autohide") === "true";
  } catch {
    return false;
  }
};
const [sidebarCollapsed$1, setSidebarCollapsed] = createSignal(false);
const [sidebarAutoHide] = createSignal(getInitialSidebarAutoHide());
const [aiPanelOpen, setAIPanelOpen] = createSignal(false);
const [selectedResource, setSelectedResource] = createSignal(null);
createSignal(false);
const [searchQuery$1] = createSignal("");
const [notifications, setNotifications] = createSignal([]);
const [terminalOpen, setTerminalOpen] = createSignal(false);
function playNotificationSound(type) {
  try {
    const soundEnabled = localStorage.getItem("kubegraf-sound");
    if (soundEnabled !== "true") {
      return;
    }
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const frequencies = {
      success: 800,
      // Higher pitch for success
      error: 300,
      // Lower pitch for error
      warning: 500,
      // Medium pitch for warning
      info: 600
      // Medium-high pitch for info
    };
    const frequency = frequencies[type] || 600;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.debug("Could not play notification sound:", error);
  }
}
function addNotification(message, type = "info", options) {
  const notification = {
    id: crypto.randomUUID(),
    type,
    message,
    timestamp: /* @__PURE__ */ new Date(),
    duration: options?.duration,
    actions: options?.actions,
    persistent: options?.persistent
  };
  setNotifications((prev) => [notification, ...prev].slice(0, 10));
  playNotificationSound(type === "update" ? "info" : type);
  {
    const duration = 5e3;
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    }, duration);
  }
}
function dismissNotification(id) {
  setNotifications((prev) => prev.filter((n) => n.id !== id));
}
function showUpdateNotification(version, onApply) {
  const id = crypto.randomUUID();
  const notification = {
    id,
    type: "update",
    message: `🆕 New version v${version} is available!`,
    timestamp: /* @__PURE__ */ new Date(),
    duration: 1e4,
    actions: [
      {
        label: "Remind me later",
        variant: "secondary",
        onClick: () => {
          dismissNotification(id);
          localStorage.setItem("kubegraf-update-reminder-time", Date.now().toString());
        }
      },
      {
        label: "Apply Update",
        variant: "primary",
        onClick: () => {
          dismissNotification(id);
          onApply();
        }
      }
    ]
  };
  setNotifications((prev) => [notification, ...prev].slice(0, 10));
  playNotificationSound("info");
  setTimeout(() => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, 1e4);
}
function toggleAIPanel() {
  setAIPanelOpen(!aiPanelOpen());
}

const CACHE_TTL_MS = 15e3;
const STORAGE_KEYS = {
  CLUSTER: "kubegraf:selectedCluster",
  NAMESPACES: "kubegraf:selectedNamespaces",
  THEME: "kubegraf:theme",
  SIDEBAR_COLLAPSED: "kubegraf:sidebarCollapsed"
};
function generateCacheKey(clusterName, namespaces) {
  const sortedNamespaces = [...namespaces].sort().join(",");
  return `${clusterName}::${sortedNamespaces}`;
}
function isCacheFresh(entry) {
  if (!entry) return false;
  const age = Date.now() - entry.lastUpdated;
  return age < CACHE_TTL_MS;
}
function loadFromStorage(key, defaultValue) {
  if (typeof window === "undefined") return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    return JSON.parse(stored);
  } catch {
    return defaultValue;
  }
}
function saveToStorage(key, value) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to save to localStorage: ${key}`, err);
  }
}
const [selectedCluster] = createSignal(
  loadFromStorage(STORAGE_KEYS.CLUSTER, "")
);
const [selectedNamespaces$1, setSelectedNamespacesSignal$1] = createSignal(
  loadFromStorage(STORAGE_KEYS.NAMESPACES, [])
);
const [searchQuery, setSearchQuerySignal] = createSignal("");
const [theme] = createSignal(
  loadFromStorage(STORAGE_KEYS.THEME, "dark")
);
const [sidebarCollapsed] = createSignal(
  loadFromStorage(STORAGE_KEYS.SIDEBAR_COLLAPSED, false)
);
const [globalLoading, setGlobalLoadingSignal] = createSignal(false);
createSignal(false);
const [resourceCache, setResourceCacheSignal] = createSignal({
  pods: null,
  deployments: null,
  services: null,
  events: null
});
const [updateInfo, setUpdateInfoSignal] = createSignal(null);
createEffect(() => {
  const cluster = selectedCluster();
  saveToStorage(STORAGE_KEYS.CLUSTER, cluster);
});
createEffect(() => {
  const namespaces = selectedNamespaces$1();
  saveToStorage(STORAGE_KEYS.NAMESPACES, namespaces);
});
createEffect(() => {
  const currentTheme = theme();
  saveToStorage(STORAGE_KEYS.THEME, currentTheme);
});
createEffect(() => {
  const collapsed = sidebarCollapsed();
  saveToStorage(STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed);
});
function setNamespaces$1(namespaces) {
  batch(() => {
    setSelectedNamespacesSignal$1([...namespaces].sort());
    setResourceCacheSignal({
      pods: null,
      deployments: null,
      services: null,
      events: null
    });
  });
}
function setSearchQuery(query) {
  setSearchQuerySignal(query);
}
function setGlobalLoading(loading) {
  setGlobalLoadingSignal(loading);
}
function setUpdateInfo(info) {
  setUpdateInfoSignal(info);
}
function getCacheKey() {
  return generateCacheKey(selectedCluster(), selectedNamespaces$1());
}
function getCachedResource(resourceType) {
  const cache = resourceCache();
  const entry = cache[resourceType];
  if (!entry) return null;
  if (isCacheFresh(entry)) {
    const currentKey = getCacheKey();
    if (entry.key === currentKey) {
      return entry;
    }
  }
  return null;
}
function setCachedResource(resourceType, data) {
  const key = getCacheKey();
  const entry = {
    data,
    lastUpdated: Date.now(),
    key
  };
  setResourceCacheSignal((prev) => ({
    ...prev,
    [resourceType]: entry
  }));
}

function normalizeNamespaceList(payload) {
  const items = [];
  const pushName = (v) => {
    if (typeof v === "string") {
      const s = v.trim();
      if (s) items.push({ name: s });
      return;
    }
    if (v && typeof v === "object" && "name" in v) {
      const n = v.name;
      if (typeof n === "string" && n.trim()) items.push(v);
    }
  };
  if (Array.isArray(payload)) {
    for (const item of payload) pushName(item);
    const byName = /* @__PURE__ */ new Map();
    for (const it of items) {
      const key = it.name.trim();
      if (!key) continue;
      if (!byName.has(key)) byName.set(key, it);
    }
    return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
  }
  if (payload && typeof payload === "object") {
    const maybe = payload.namespaces;
    if (Array.isArray(maybe)) {
      for (const item of maybe) pushName(item);
      const byName = /* @__PURE__ */ new Map();
      for (const it of items) {
        const key = it.name.trim();
        if (!key) continue;
        if (!byName.has(key)) byName.set(key, it);
      }
      return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
    }
  }
  return [];
}
function extractNamespaceNames(payload) {
  return normalizeNamespaceList(payload).map((n) => n.name);
}

const API_BASE = "/api";
async function fetchAPI(endpoint, options) {
  let defaultTimeout = 15e3;
  if (endpoint.includes("/cost/")) {
    defaultTimeout = 12e4;
  } else if (endpoint.includes("/history/")) {
    defaultTimeout = 6e4;
  } else if (endpoint.includes("/ml/recommendations")) {
    defaultTimeout = 6e4;
  } else if (endpoint.includes("/anomalies/detect")) {
    defaultTimeout = 6e4;
  } else if (endpoint.includes("/topology") || endpoint.includes("/traffic/metrics")) {
    defaultTimeout = 6e4;
  } else if (endpoint.includes("/brain/")) {
    defaultTimeout = 6e4;
  } else if (endpoint.includes("/incidents")) {
    defaultTimeout = 12e4;
  }
  const timeout = options?.timeout || defaultTimeout;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      },
      signal: controller.signal,
      ...options
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const contentType2 = response.headers.get("content-type");
      const error = await response.text();
      if (contentType2 && contentType2.includes("text/html")) {
        throw new Error(`API endpoint not found (${response.status}). The server returned an HTML error page. Check that the endpoint exists.`);
      }
      if (response.status === 503 && error) {
        throw new Error(error);
      }
      throw new Error(error || `API error: ${response.status}`);
    }
    const contentType = response.headers.get("content-type");
    if (contentType && !contentType.includes("application/json")) {
      const text = await response.text();
      if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<!doctype")) {
        throw new Error(`Server returned HTML instead of JSON. This usually means the API endpoint doesn't exist (404). Response: ${text.substring(0, 200)}...`);
      }
      throw new Error(`Unexpected content type: ${contentType}. Expected JSON.`);
    }
    return response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Request timed out. The server may be processing a large amount of data.");
    }
    throw err;
  }
}
async function deleteAPI(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Delete operation failed");
  }
  return data;
}
const api = {
  // Status
  getStatus: (retry) => {
    const endpoint = retry ? "/status?retry=true" : "/status";
    return fetchAPI(endpoint);
  },
  // Updates (legacy endpoints)
  checkForUpdates: () => fetchAPI("/updates/check"),
  // New update endpoints
  checkUpdate: () => fetchAPI("/update/check"),
  autoCheckUpdate: () => fetchAPI("/update/auto-check"),
  installUpdate: (downloadUrl) => fetchAPI("/updates/install", {
    method: "POST",
    body: JSON.stringify({ downloadUrl })
  }),
  getMetrics: () => fetchAPI("/metrics"),
  // Namespaces
  getNamespaces: async () => {
    const data = await fetchAPI("/namespaces");
    return normalizeNamespaceList(data);
  },
  // Convenience for UI components that only need names (e.g. dropdowns)
  getNamespaceNames: async () => {
    const data = await fetchAPI("/namespaces");
    return extractNamespaceNames(data);
  },
  // ============ Workloads ============
  // Pods
  getPods: async (namespace) => {
    const endpoint = namespace && namespace !== "_all" && namespace !== "All Namespaces" ? `/pods?namespace=${namespace}` : "/pods?namespace=";
    const data = await fetchAPI(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getPodDetails: (name, namespace) => fetchAPI(`/pod/details?name=${name}&namespace=${namespace}`),
  getPodYAML: (name, namespace) => fetchAPI(`/pod/yaml?name=${name}&namespace=${namespace}`),
  updatePod: async (name, namespace, yaml) => {
    const response = await fetch(`/api/pod/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
      method: "POST",
      headers: { "Content-Type": "text/yaml" },
      body: yaml
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(errorData.error || errorData.message || `API error: ${response.statusText}`);
    }
    return response.json();
  },
  getPodDescribe: (name, namespace) => fetchAPI(`/pod/describe?name=${name}&namespace=${namespace}`),
  deletePod: (name, namespace) => deleteAPI(`/pod/delete?name=${name}&namespace=${namespace}`),
  restartPod: (name, namespace) => fetchAPI(`/pod/restart?name=${name}&namespace=${namespace}`, { method: "POST" }),
  getPodMetrics: async (namespace) => {
    const endpoint = namespace && namespace !== "_all" ? `/pods/metrics?namespace=${namespace}` : "/pods/metrics?namespace=";
    const data = await fetchAPI(endpoint);
    return data || {};
  },
  // Deployments
  getDeployments: async (namespace) => {
    const endpoint = namespace && namespace !== "_all" && namespace !== "All Namespaces" ? `/deployments?namespace=${namespace}` : "/deployments?namespace=";
    const data = await fetchAPI(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getDeploymentDetails: (name, namespace) => fetchAPI(`/deployment/details?name=${name}&namespace=${namespace}`),
  getDeploymentYAML: (name, namespace) => fetchAPI(`/deployment/yaml?name=${name}&namespace=${namespace}`),
  updateDeployment: async (name, namespace, yaml) => {
    const response = await fetch(`/api/deployment/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
      method: "POST",
      headers: { "Content-Type": "text/yaml" },
      body: yaml
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(errorData.error || errorData.message || `API error: ${response.statusText}`);
    }
    return response.json();
  },
  getDeploymentDescribe: (name, namespace) => fetchAPI(`/deployment/describe?name=${name}&namespace=${namespace}`),
  deleteDeployment: (name, namespace) => deleteAPI(`/deployment/delete?name=${name}&namespace=${namespace}`),
  restartDeployment: (name, namespace) => fetchAPI(`/deployment/restart?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, { method: "POST" }),
  scaleDeployment: (name, namespace, replicas) => fetchAPI(`/deployment/scale?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}&replicas=${replicas}`, { method: "POST" }),
  bulkRestartDeployments: (namespace) => fetchAPI(`/deployments/bulk/restart?namespace=${encodeURIComponent(namespace)}`, { method: "POST" }),
  bulkDeleteDeployments: (namespace) => fetchAPI(`/deployments/bulk/delete?namespace=${encodeURIComponent(namespace)}`, { method: "POST" }),
  // Workload cross-navigation
  getWorkloadDetails: (namespace, kind, name) => fetchAPI(`/workloads/${namespace}/${kind}/${name}`),
  getWorkloadRelated: (namespace, kind, name) => fetchAPI(`/workloads/${namespace}/${kind}/${name}/related`),
  // StatefulSets
  getStatefulSets: async (namespace) => {
    const endpoint = namespace && namespace !== "_all" && namespace !== "All Namespaces" ? `/statefulsets?namespace=${namespace}` : "/statefulsets?namespace=";
    const data = await fetchAPI(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getStatefulSetDetails: (name, namespace) => fetchAPI(`/statefulset/details?name=${name}&namespace=${namespace}`),
  getStatefulSetYAML: (name, namespace) => fetchAPI(`/statefulset/yaml?name=${name}&namespace=${namespace}`),
  getStatefulSetDescribe: (name, namespace) => fetchAPI(`/statefulset/describe?name=${name}&namespace=${namespace}`),
  deleteStatefulSet: (name, namespace) => deleteAPI(`/statefulset/delete?name=${name}&namespace=${namespace}`),
  restartStatefulSet: (name, namespace) => fetchAPI(`/statefulset/restart?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, { method: "POST" }),
  scaleStatefulSet: (name, namespace, replicas) => fetchAPI(`/statefulset/scale?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}&replicas=${replicas}`, { method: "POST" }),
  bulkRestartStatefulSets: (namespace) => fetchAPI(`/statefulsets/bulk/restart?namespace=${encodeURIComponent(namespace)}`, { method: "POST" }),
  bulkDeleteStatefulSets: (namespace) => fetchAPI(`/statefulsets/bulk/delete?namespace=${encodeURIComponent(namespace)}`, { method: "POST" }),
  // DaemonSets
  getDaemonSets: async (namespace) => {
    const endpoint = namespace && namespace !== "_all" && namespace !== "All Namespaces" ? `/daemonsets?namespace=${namespace}` : "/daemonsets?namespace=";
    const data = await fetchAPI(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getDaemonSetDetails: (name, namespace) => fetchAPI(`/daemonset/details?name=${name}&namespace=${namespace}`),
  getDaemonSetYAML: (name, namespace) => fetchAPI(`/daemonset/yaml?name=${name}&namespace=${namespace}`),
  updateDaemonSet: (name, namespace, yaml) => fetch(`${API_BASE}/daemonset/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
    method: "POST",
    headers: { "Content-Type": "application/yaml" },
    body: yaml
  }).then((res) => res.json()),
  getDaemonSetDescribe: (name, namespace) => fetchAPI(`/daemonset/describe?name=${name}&namespace=${namespace}`),
  deleteDaemonSet: (name, namespace) => deleteAPI(`/daemonset/delete?name=${name}&namespace=${namespace}`),
  restartDaemonSet: (name, namespace) => fetchAPI(`/daemonset/restart?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, { method: "POST" }),
  bulkRestartDaemonSets: (namespace) => fetchAPI(`/daemonsets/bulk/restart?namespace=${encodeURIComponent(namespace)}`, { method: "POST" }),
  bulkDeleteDaemonSets: (namespace) => fetchAPI(`/daemonsets/bulk/delete?namespace=${encodeURIComponent(namespace)}`, { method: "POST" }),
  // CronJobs
  getCronJobs: async (namespace) => {
    const endpoint = namespace && namespace !== "_all" && namespace !== "All Namespaces" ? `/cronjobs?namespace=${namespace}` : "/cronjobs?namespace=";
    const data = await fetchAPI(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getCronJobDetails: (name, namespace) => fetchAPI(`/cronjob/details?name=${name}&namespace=${namespace}`),
  getCronJobYAML: (name, namespace) => fetchAPI(`/cronjob/yaml?name=${name}&namespace=${namespace}`),
  updateCronJob: (name, namespace, yaml) => fetch(`${API_BASE}/cronjob/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
    method: "POST",
    headers: { "Content-Type": "application/yaml" },
    body: yaml
  }).then((res) => res.json()),
  deleteCronJob: (name, namespace) => deleteAPI(`/cronjob/delete?name=${name}&namespace=${namespace}`),
  // Jobs
  getJobs: async (namespace) => {
    const endpoint = namespace && namespace !== "_all" && namespace !== "All Namespaces" ? `/jobs?namespace=${namespace}` : "/jobs?namespace=";
    const data = await fetchAPI(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getJobDetails: (name, namespace) => fetchAPI(`/job/details?name=${name}&namespace=${namespace}`),
  getJobYAML: (name, namespace) => fetchAPI(`/job/yaml?name=${name}&namespace=${namespace}`),
  updateJob: (name, namespace, yaml) => fetch(`${API_BASE}/job/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
    method: "POST",
    headers: { "Content-Type": "application/yaml" },
    body: yaml
  }).then((res) => res.json()),
  deleteJob: (name, namespace) => deleteAPI(`/job/delete?name=${name}&namespace=${namespace}`),
  // Pod Disruption Budgets
  getPDBs: async (namespace) => {
    const endpoint = namespace && namespace !== "_all" && namespace !== "All Namespaces" ? `/pdbs?namespace=${namespace}` : "/pdbs?namespace=";
    const data = await fetchAPI(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getPDBDetails: (name, namespace) => fetchAPI(`/pdb/details?name=${name}&namespace=${namespace}`),
  getPDBYAML: (name, namespace) => fetchAPI(`/pdb/yaml?name=${name}&namespace=${namespace}`),
  getPDBDescribe: (name, namespace) => fetchAPI(`/pdb/describe?name=${name}&namespace=${namespace}`),
  updatePDB: (name, namespace, yaml) => fetch(`${API_BASE}/pdb/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
    method: "POST",
    headers: { "Content-Type": "application/yaml" },
    body: yaml
  }).then((res) => res.json()),
  deletePDB: (name, namespace) => deleteAPI(`/pdb/delete?name=${name}&namespace=${namespace}`),
  // Horizontal Pod Autoscalers
  getHPAs: async (namespace) => {
    const endpoint = namespace && namespace !== "_all" && namespace !== "All Namespaces" ? `/hpas?namespace=${namespace}` : "/hpas?namespace=";
    const data = await fetchAPI(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getHPADetails: (name, namespace) => fetchAPI(`/hpa/details?name=${name}&namespace=${namespace}`),
  getHPAYAML: (name, namespace) => fetchAPI(`/hpa/yaml?name=${name}&namespace=${namespace}`),
  getHPADescribe: (name, namespace) => fetchAPI(`/hpa/describe?name=${name}&namespace=${namespace}`),
  updateHPA: (name, namespace, yaml) => fetch(`${API_BASE}/hpa/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
    method: "POST",
    headers: { "Content-Type": "application/yaml" },
    body: yaml
  }).then((res) => res.json()),
  deleteHPA: (name, namespace) => deleteAPI(`/hpa/delete?name=${name}&namespace=${namespace}`),
  // ============ Network ============
  // Services
  getServices: async (namespace) => {
    const endpoint = namespace && namespace !== "_all" && namespace !== "All Namespaces" ? `/services?namespace=${namespace}` : "/services?namespace=";
    const data = await fetchAPI(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getServiceYAML: (name, namespace) => fetchAPI(`/service/yaml?name=${name}&namespace=${namespace}`),
  getServiceDetails: (name, namespace) => fetchAPI(`/service/details?name=${name}&namespace=${namespace}`),
  updateService: (name, namespace, yaml) => fetch(`${API_BASE}/service/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
    method: "POST",
    headers: { "Content-Type": "application/yaml" },
    body: yaml
  }).then((res) => res.json()),
  getServiceDescribe: (name, namespace) => fetchAPI(`/service/describe?name=${name}&namespace=${namespace}`),
  deleteService: (name, namespace) => deleteAPI(`/service/delete?name=${name}&namespace=${namespace}`),
  // Ingresses
  getIngresses: async (namespace) => {
    const endpoint = namespace && namespace !== "_all" && namespace !== "All Namespaces" ? `/ingresses?namespace=${namespace}` : "/ingresses?namespace=";
    const data = await fetchAPI(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getIngressDetails: (name, namespace) => fetchAPI(`/ingress/details?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`),
  getIngressYAML: (name, namespace) => fetchAPI(`/ingress/yaml?name=${name}&namespace=${namespace}`),
  updateIngress: (name, namespace, yaml) => fetch(`${API_BASE}/ingress/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
    method: "POST",
    headers: { "Content-Type": "application/yaml" },
    body: yaml
  }).then((res) => res.json()),
  getIngressDescribe: (name, namespace) => fetchAPI(`/ingress/describe?name=${name}&namespace=${namespace}`),
  deleteIngress: (name, namespace) => deleteAPI(`/ingress/delete?name=${name}&namespace=${namespace}`),
  // ============ Namespaces ============
  getNamespaceDetails: (name) => fetchAPI(`/namespace/details?name=${name}`),
  getNamespaceYAML: (name) => fetchAPI(`/namespace/yaml?name=${name}`),
  updateNamespace: (name, yaml) => fetch(`${API_BASE}/namespace/update?name=${encodeURIComponent(name)}`, {
    method: "POST",
    headers: { "Content-Type": "application/yaml" },
    body: yaml
  }).then((res) => res.json()),
  getNamespaceDescribe: (name) => fetchAPI(`/namespace/describe?name=${name}`),
  deleteNamespace: (name) => deleteAPI(`/namespace/delete?name=${name}`),
  // Network Policies
  getNetworkPolicies: async (namespace) => {
    const endpoint = namespace && namespace !== "_all" && namespace !== "All Namespaces" ? `/networkpolicies?namespace=${namespace}` : "/networkpolicies?namespace=";
    const data = await fetchAPI(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getNetworkPolicyYAML: (name, namespace) => fetchAPI(`/networkpolicy/yaml?name=${name}&namespace=${namespace}`),
  updateNetworkPolicy: (name, namespace, yaml) => fetchAPI(`/networkpolicy/update?name=${name}&namespace=${namespace}`, {
    method: "POST",
    body: JSON.stringify({ yaml })
  }),
  getNetworkPolicyDescribe: (name, namespace) => fetchAPI(`/networkpolicy/describe?name=${name}&namespace=${namespace}`),
  getNetworkPolicyDetails: (name, namespace) => fetchAPI(`/networkpolicy/details?name=${name}&namespace=${namespace}`),
  deleteNetworkPolicy: (name, namespace) => deleteAPI(`/networkpolicy/delete?name=${name}&namespace=${namespace}`),
  // ============ Config ============
  // ConfigMaps
  getConfigMaps: async (namespace) => {
    const endpoint = namespace && namespace !== "_all" && namespace !== "All Namespaces" ? `/configmaps?namespace=${namespace}` : "/configmaps?namespace=";
    const data = await fetchAPI(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getConfigMapDetails: (name, namespace) => fetchAPI(`/configmap/details?name=${name}&namespace=${namespace}`),
  getConfigMapYAML: (name, namespace) => fetchAPI(`/configmap/yaml?name=${name}&namespace=${namespace}`),
  updateConfigMap: async (name, namespace, yaml) => {
    const response = await fetch(`/api/configmap/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
      method: "POST",
      headers: { "Content-Type": "text/yaml" },
      body: yaml
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(errorData.error || errorData.message || `API error: ${response.statusText}`);
    }
    return response.json();
  },
  getConfigMapDescribe: (name, namespace) => fetchAPI(`/configmap/describe?name=${name}&namespace=${namespace}`),
  deleteConfigMap: (name, namespace) => deleteAPI(`/configmap/delete?name=${name}&namespace=${namespace}`),
  // Secrets
  getSecrets: async (namespace) => {
    const endpoint = namespace && namespace !== "_all" && namespace !== "All Namespaces" ? `/secrets?namespace=${namespace}` : "/secrets?namespace=";
    const data = await fetchAPI(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getSecretDetails: (name, namespace) => fetchAPI(`/secret/details?name=${name}&namespace=${namespace}`),
  getSecretYAML: (name, namespace) => fetchAPI(`/secret/yaml?name=${name}&namespace=${namespace}`),
  updateSecret: async (name, namespace, yaml) => {
    const response = await fetch(`/api/secret/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
      method: "POST",
      headers: { "Content-Type": "text/yaml" },
      body: yaml
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(errorData.error || errorData.message || `API error: ${response.statusText}`);
    }
    return response.json();
  },
  getSecretDescribe: (name, namespace) => fetchAPI(`/secret/describe?name=${name}&namespace=${namespace}`),
  deleteSecret: (name, namespace) => deleteAPI(`/secret/delete?name=${name}&namespace=${namespace}`),
  // Certificates (cert-manager)
  getCertificates: async (namespace) => {
    const endpoint = namespace && namespace !== "_all" && namespace !== "All Namespaces" ? `/certificates?namespace=${namespace}` : "/certificates?namespace=";
    const data = await fetchAPI(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getCertificateYAML: (name, namespace) => fetchAPI(`/certificate/yaml?name=${name}&namespace=${namespace}`),
  updateCertificate: (name, namespace, yaml) => fetch(`${API_BASE}/certificate/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
    method: "POST",
    headers: { "Content-Type": "application/yaml" },
    body: yaml
  }).then((res) => res.json()),
  getCertificateDescribe: (name, namespace) => fetchAPI(`/certificate/describe?name=${name}&namespace=${namespace}`),
  deleteCertificate: (name, namespace) => deleteAPI(`/certificate/delete?name=${name}&namespace=${namespace}`),
  // ============ Cluster ============
  // Nodes
  getNodes: async () => {
    const data = await fetchAPI("/nodes");
    if (Array.isArray(data)) {
      return data;
    }
    return data.nodes || [];
  },
  getNodeDetails: (name) => fetchAPI(`/node/details?name=${name}`),
  getNodeYAML: (name) => fetchAPI(`/node/yaml?name=${name}`),
  getNodeDescribe: (name) => fetchAPI(`/node/describe?name=${name}`),
  // ============ Topology ============
  getTopology: (namespace) => {
    const endpoint = namespace && namespace !== "_all" && namespace !== "All Namespaces" ? `/topology?namespace=${namespace}` : "/topology";
    return fetchAPI(endpoint);
  },
  getResourceMap: () => fetchAPI("/resourcemap"),
  getImpactAnalysis: (kind, name, namespace) => fetchAPI(`/impact?kind=${kind}&name=${name}&namespace=${namespace}`),
  // ============ Security ============
  getSecurityAnalysis: () => fetchAPI("/security"),
  // ============ Port Forwarding ============
  startPortForward: (type, name, namespace, localPort, remotePort) => fetchAPI("/portforward/start", {
    method: "POST",
    body: JSON.stringify({ type, name, namespace, localPort, remotePort })
  }),
  stopPortForward: (id) => fetchAPI(`/portforward/stop?id=${id}`, { method: "POST" }),
  // Backend returns { success: boolean, sessions: PortForwardSession[] }
  // but some older callers expect a plain array, so normalize here.
  listPortForwards: async () => {
    const data = await fetchAPI("/portforward/list");
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.sessions)) {
      return data.sessions;
    }
    return [];
  },
  // ============ AI ============
  getAIStatus: () => fetchAPI("/ai/status"),
  queryAI: (query) => fetchAPI("/ai/query", {
    method: "POST",
    body: JSON.stringify({ query })
  }),
  analyzePod: (name, namespace) => fetchAPI(`/ai/analyze/pod?name=${name}&namespace=${namespace}`),
  explainError: (error, resourceType) => fetchAPI("/ai/explain", {
    method: "POST",
    body: JSON.stringify({ error, resourceType })
  }),
  // ============ Diagnostics ============
  runDiagnostics: (namespace, category) => {
    const params = new URLSearchParams();
    if (namespace) params.append("namespace", namespace);
    if (category) params.append("category", category);
    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchAPI(`/diagnostics/run${query}`);
  },
  getDiagnosticsCategories: () => fetchAPI("/diagnostics/categories"),
  // ============ Vulnerabilities ============
  scanVulnerabilities: (severity) => {
    const params = new URLSearchParams();
    if (severity) params.append("severity", severity);
    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchAPI(`/vulnerabilities/scan${query}`);
  },
  refreshVulnerabilities: () => fetchAPI("/vulnerabilities/refresh", {
    method: "POST"
  }),
  getVulnerabilityStats: () => fetchAPI("/vulnerabilities/stats"),
  // ============ Anomaly Detection ============
  detectAnomalies: (severity) => {
    const url = severity ? `/anomalies/detect?severity=${severity}` : "/anomalies/detect";
    return fetchAPI(url);
  },
  getAnomalyStats: () => fetchAPI("/anomalies/stats"),
  remediateAnomaly: (anomalyId) => fetchAPI("/anomalies/remediate", {
    method: "POST",
    body: JSON.stringify({ anomalyId })
  }),
  // ============ ML Recommendations ============
  getMLRecommendations: () => fetchAPI("/ml/recommendations"),
  getMLRecommendationsStats: () => fetchAPI("/ml/recommendations/stats"),
  predictResourceNeeds: (namespace, deployment, hoursAhead) => {
    const params = new URLSearchParams({ namespace, deployment });
    if (hoursAhead) params.append("hours", hoursAhead.toString());
    return fetchAPI(`/ml/predict?${params.toString()}`);
  },
  getAnomalyMetrics: (limit) => {
    const url = limit ? `/anomalies/metrics?limit=${limit}` : "/anomalies/metrics";
    return fetchAPI(url);
  },
  // ============ Event Monitoring ============
  getMonitoredEvents: (filters) => {
    const params = new URLSearchParams();
    if (filters?.type) params.append("type", filters.type);
    if (filters?.category) params.append("category", filters.category);
    if (filters?.severity) params.append("severity", filters.severity);
    if (filters?.namespace) params.append("namespace", filters.namespace);
    if (filters?.since) params.append("since", filters.since);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchAPI(`/events/monitored${query}`);
  },
  getLogErrors: (filters) => {
    const params = new URLSearchParams();
    if (filters?.namespace) params.append("namespace", filters.namespace);
    if (filters?.since) params.append("since", filters.since);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.critical_only === false) {
      params.append("critical_only", "false");
    } else if (filters?.critical_only === true) {
      params.append("critical_only", "true");
    } else {
      params.append("critical_only", "true");
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchAPI(`/events/log-errors${query}`);
  },
  getEventStats: () => fetchAPI("/events/stats"),
  getGroupedEvents: (period) => {
    const params = new URLSearchParams();
    if (period) params.append("period", period);
    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchAPI(`/events/grouped${query}`);
  },
  // ============ Cost Estimation ============
  getClusterCost: () => fetchAPI("/cost/cluster"),
  getNamespaceCost: (namespace) => fetchAPI(`/cost/namespace?namespace=${namespace}`),
  getPodCost: (name, namespace) => fetchAPI(`/cost/pod?name=${name}&namespace=${namespace}`),
  getDeploymentCost: (name, namespace) => fetchAPI(`/cost/deployment?name=${name}&namespace=${namespace}`),
  getIdleResources: (namespace, cpuThreshold, memThreshold) => {
    const params = new URLSearchParams();
    if (namespace) params.append("namespace", namespace);
    if (cpuThreshold) params.append("cpuThreshold", cpuThreshold.toString());
    if (memThreshold) params.append("memThreshold", memThreshold.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchAPI(`/cost/idle${query}`);
  },
  // ============ Drift Detection ============
  checkDrift: (kind, name, namespace) => {
    const params = new URLSearchParams({ kind, name });
    if (namespace) params.append("namespace", namespace);
    return fetchAPI(`/drift/check?${params.toString()}`);
  },
  getNamespaceDrift: (namespace) => fetchAPI(`/drift/namespace?namespace=${namespace}`),
  getDriftSummary: (namespace) => fetchAPI(`/drift/summary?namespace=${namespace}`),
  revertDrift: (kind, name, namespace) => fetchAPI("/drift/revert", {
    method: "POST",
    body: JSON.stringify({ kind, name, namespace })
  }),
  // ============ Network & Heatmap ============
  getNetworkTopology: () => fetchAPI("/network/topology"),
  getPodHeatmap: () => fetchAPI("/heatmap/pods"),
  getNodeHeatmap: () => fetchAPI("/heatmap/nodes"),
  // ============ Plugins ============
  getPluginsList: () => fetchAPI("/plugins/list"),
  installPlugin: (source) => fetchAPI("/plugins/install", {
    method: "POST",
    body: JSON.stringify({ source })
  }),
  uninstallPlugin: (name) => fetchAPI("/plugins/uninstall", {
    method: "POST",
    body: JSON.stringify({ name })
  }),
  // Helm
  getHelmReleases: async (namespace) => {
    const endpoint = namespace ? `/plugins/helm/releases?namespace=${namespace}` : "/plugins/helm/releases";
    const data = await fetchAPI(endpoint);
    return data.releases || [];
  },
  getHelmReleaseDetails: (name, namespace) => fetchAPI(`/plugins/helm/release?name=${name}&namespace=${namespace}`),
  getHelmReleaseHistory: (name, namespace) => fetchAPI(`/plugins/helm/history?name=${name}&namespace=${namespace}`),
  rollbackHelmRelease: (name, namespace, revision) => fetchAPI("/plugins/helm/rollback", {
    method: "POST",
    body: JSON.stringify({ name, namespace, revision })
  }),
  // ArgoCD
  getArgoCDApps: async () => {
    const data = await fetchAPI("/plugins/argocd/apps");
    return data.apps || [];
  },
  getArgoCDAppDetails: (name, namespace) => fetchAPI(`/plugins/argocd/app?name=${name}&namespace=${namespace}`),
  syncArgoCDApp: (name, namespace) => fetchAPI("/plugins/argocd/sync", {
    method: "POST",
    body: JSON.stringify({ name, namespace })
  }),
  refreshArgoCDApp: (name, namespace) => fetchAPI("/plugins/argocd/refresh", {
    method: "POST",
    body: JSON.stringify({ name, namespace })
  }),
  // Flux
  getFluxResources: async () => {
    const data = await fetchAPI("/plugins/flux/resources");
    return data.resources || [];
  },
  // Kustomize
  getKustomizeResources: () => fetchAPI("/plugins/kustomize/resources"),
  // ============ Cloud Detection ============
  getCloudInfo: () => fetchAPI("/cloud"),
  // ============ Contexts (Multi-cluster) ============
  getContexts: () => fetchAPI("/contexts"),
  getCurrentContext: () => fetchAPI("/contexts/current"),
  switchContext: (contextName) => fetchAPI("/contexts/switch", {
    method: "POST",
    body: JSON.stringify({ context: contextName })
  }),
  // ============ Workspace Context ============
  getWorkspaceContext: () => fetchAPI("/workspace/context"),
  setWorkspaceContext: (context) => fetchAPI("/workspace/context", {
    method: "POST",
    body: JSON.stringify(context)
  }),
  updateWorkspaceContext: (context) => fetchAPI("/workspace/context", {
    method: "POST",
    body: JSON.stringify(context)
  }),
  // ============ Events ============
  getEvents: async (namespace, limit) => {
    const params = new URLSearchParams();
    if (namespace && namespace !== "All Namespaces") {
      params.set("namespace", namespace);
    }
    if (limit) {
      params.set("limit", limit.toString());
    }
    return fetchAPI(`/events?${params.toString()}`);
  },
  // ============ Apps Marketplace ============
  getApps: () => fetchAPI("/apps"),
  getAppDetails: (name) => fetchAPI(`/apps/${name}`),
  installApp: (name, namespace, values, clusterName) => fetchAPI("/apps/install", {
    method: "POST",
    body: JSON.stringify({ name, namespace, values, clusterName })
  }),
  uninstallApp: (name, namespace) => fetchAPI("/apps/uninstall", {
    method: "POST",
    body: JSON.stringify({ name, namespace })
  }),
  getInstalledApps: () => fetchAPI("/apps/installed"),
  getLocalClusters: () => fetchAPI("/apps/local-clusters"),
  // ============ Custom App Deployment ============
  previewCustomApp: (manifests, namespace) => fetchAPI("/custom-apps/preview", {
    method: "POST",
    body: JSON.stringify({ manifests, namespace })
  }),
  deployCustomApp: (manifests, namespace) => fetchAPI("/custom-apps/deploy", {
    method: "POST",
    body: JSON.stringify({ deploymentType: "manifest", manifests, namespace })
  }),
  deployCustomAppWithHelm: (request) => fetchAPI("/custom-apps/deploy", {
    method: "POST",
    body: JSON.stringify(request)
  }),
  listCustomApps: () => fetchAPI("/custom-apps/list"),
  getCustomApp: (deploymentId) => fetchAPI(`/custom-apps/get?deploymentId=${deploymentId}`),
  updateCustomApp: (deploymentId, manifests, namespace) => fetchAPI(`/custom-apps/update?deploymentId=${deploymentId}`, {
    method: "PUT",
    body: JSON.stringify({ manifests, namespace })
  }),
  restartCustomApp: (deploymentId) => fetchAPI(`/custom-apps/restart?deploymentId=${deploymentId}`, {
    method: "POST"
  }),
  deleteCustomApp: (deploymentId) => fetchAPI(`/custom-apps/delete?deploymentId=${deploymentId}`, {
    method: "DELETE"
  }),
  // ============ AI Log Analysis ============
  analyzePodsLogs: (namespace) => fetchAPI(`/ai/analyze/logs${namespace ? `?namespace=${namespace}` : ""}`),
  analyzePodLogs: (name, namespace) => fetchAPI(`/ai/analyze/pod-logs?name=${name}&namespace=${namespace}`),
  // Storage
  getPVDetails: (name) => fetchAPI(`/storage/pv/details?name=${encodeURIComponent(name)}`),
  getPVYAML: (name) => fetchAPI(`/storage/pv/yaml?name=${encodeURIComponent(name)}`),
  getPVDescribe: (name) => fetchAPI(`/storage/pv/describe?name=${encodeURIComponent(name)}`),
  updatePV: async (name, yaml) => {
    const response = await fetch(`/api/storage/pv/update?name=${encodeURIComponent(name)}`, {
      method: "POST",
      headers: { "Content-Type": "text/yaml" },
      body: yaml
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(errorData.error || errorData.message || `API error: ${response.statusText}`);
    }
    return response.json();
  },
  deletePV: (name) => deleteAPI(`/storage/pv/delete?name=${name}`),
  getPVCDetails: (name, namespace) => fetchAPI(`/storage/pvc/details?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`),
  getPVCYAML: (name, namespace) => fetchAPI(`/storage/pvc/yaml?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`),
  getPVCDescribe: (name, namespace) => fetchAPI(`/storage/pvc/describe?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`),
  updatePVC: async (name, namespace, yaml) => {
    const response = await fetch(`/api/storage/pvc/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
      method: "POST",
      headers: { "Content-Type": "text/yaml" },
      body: yaml
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(errorData.error || errorData.message || `API error: ${response.statusText}`);
    }
    return response.json();
  },
  deletePVC: (name, namespace) => deleteAPI(`/storage/pvc/delete?name=${name}&namespace=${namespace}`),
  getStorageClassYAML: (name) => fetchAPI(`/storage/storageclass/yaml?name=${encodeURIComponent(name)}`),
  updateStorageClass: async (name, yaml) => {
    const response = await fetch(`/api/storage/storageclass/update?name=${encodeURIComponent(name)}`, {
      method: "POST",
      headers: { "Content-Type": "text/yaml" },
      body: yaml
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(errorData.error || errorData.message || `API error: ${response.statusText}`);
    }
    return response.json();
  },
  deleteStorageClass: (name) => deleteAPI(`/storage/storageclass/delete?name=${name}`),
  // RBAC
  getRoleYAML: (name, namespace) => fetchAPI(`/rbac/role/yaml?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`),
  updateRole: async (name, namespace, yaml) => {
    const response = await fetch(`/api/rbac/role/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
      method: "POST",
      headers: { "Content-Type": "text/yaml" },
      body: yaml
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(errorData.error || errorData.message || `API error: ${response.statusText}`);
    }
    return response.json();
  },
  deleteRole: (name, namespace) => deleteAPI(`/rbac/role/delete?name=${name}&namespace=${namespace}`),
  getRoleBindingYAML: (name, namespace) => fetchAPI(`/rbac/rolebinding/yaml?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`),
  updateRoleBinding: async (name, namespace, yaml) => {
    const response = await fetch(`/api/rbac/rolebinding/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
      method: "POST",
      headers: { "Content-Type": "text/yaml" },
      body: yaml
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(errorData.error || errorData.message || `API error: ${response.statusText}`);
    }
    return response.json();
  },
  deleteRoleBinding: (name, namespace) => deleteAPI(`/rbac/rolebinding/delete?name=${name}&namespace=${namespace}`),
  getClusterRoleYAML: (name) => fetchAPI(`/rbac/clusterrole/yaml?name=${encodeURIComponent(name)}`),
  updateClusterRole: async (name, yaml) => {
    const response = await fetch(`/api/rbac/clusterrole/update?name=${encodeURIComponent(name)}`, {
      method: "POST",
      headers: { "Content-Type": "text/yaml" },
      body: yaml
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(errorData.error || errorData.message || `API error: ${response.statusText}`);
    }
    return response.json();
  },
  deleteClusterRole: (name) => deleteAPI(`/rbac/clusterrole/delete?name=${name}`),
  getClusterRoleBindingYAML: (name) => fetchAPI(`/rbac/clusterrolebinding/yaml?name=${encodeURIComponent(name)}`),
  updateClusterRoleBinding: async (name, yaml) => {
    const response = await fetch(`/api/rbac/clusterrolebinding/update?name=${encodeURIComponent(name)}`, {
      method: "POST",
      headers: { "Content-Type": "text/yaml" },
      body: yaml
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(errorData.error || errorData.message || `API error: ${response.statusText}`);
    }
    return response.json();
  },
  deleteClusterRoleBinding: (name) => deleteAPI(`/rbac/clusterrolebinding/delete?name=${name}`),
  // Apply ML recommendation
  applyRecommendation: async (recommendationId) => {
    return fetchAPI(`/ml/recommendations/apply`, {
      method: "POST",
      body: JSON.stringify({ id: recommendationId })
    });
  },
  // ============ Connectors ============
  getConnectors: () => fetchAPI("/connectors"),
  createConnector: (connector) => fetchAPI("/connectors", {
    method: "POST",
    body: JSON.stringify(connector)
  }),
  updateConnector: (id, updates) => fetchAPI(`/connectors/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates)
  }),
  deleteConnector: (id) => fetchAPI(`/connectors/${id}`, {
    method: "DELETE"
  }),
  testConnector: (id) => fetchAPI(`/connectors/${id}/test`, {
    method: "POST"
  }),
  // ============ Incidents ============
  getIncidents: async (namespace, pattern, severity, status) => {
    const params = new URLSearchParams();
    if (namespace) params.append("namespace", namespace);
    if (pattern) params.append("pattern", pattern);
    if (severity) params.append("severity", severity);
    if (status) params.append("status", status);
    const query = params.toString();
    const endpoint = query ? `/v2/incidents?${query}` : "/v2/incidents";
    const data = await fetchAPI(endpoint);
    return data.incidents || [];
  },
  getIncident: async (id) => {
    return fetchAPI(`/v2/incidents/${id}`);
  },
  getIncidentSnapshot: async (id) => {
    return fetchAPI(`/v2/incidents/${id}/snapshot`);
  },
  getIncidentLogs: async (id, tail) => {
    const params = new URLSearchParams();
    if (tail) params.append("tail", tail.toString());
    const query = params.toString();
    return fetchAPI(`/v2/incidents/${id}/logs${query ? `?${query}` : ""}`);
  },
  getIncidentMetrics: async (id) => {
    return fetchAPI(`/v2/incidents/${id}/metrics`);
  },
  getIncidentChanges: async (id, lookback) => {
    const params = new URLSearchParams();
    if (lookback) params.append("lookback", lookback.toString());
    const query = params.toString();
    return fetchAPI(`/v2/incidents/${id}/changes${query ? `?${query}` : ""}`);
  },
  getIncidentRunbooks: async (id) => {
    return fetchAPI(`/v2/incidents/${id}/runbooks`);
  },
  getIncidentSimilar: async (id) => {
    return fetchAPI(`/v2/incidents/${id}/similar`);
  },
  getIncidentEvidence: async (id) => {
    return fetchAPI(`/v2/incidents/${id}/evidence`);
  },
  getIncidentCitations: async (id) => {
    return fetchAPI(`/v2/incidents/${id}/citations`);
  },
  // Learning/Feedback endpoints
  submitIncidentFeedback: async (id, outcome, appliedFixId, appliedFixType, notes) => {
    return fetchAPI(`/v2/incidents/${id}/feedback`, {
      method: "POST",
      body: JSON.stringify({ outcome, appliedFixId, appliedFixType, notes })
    });
  },
  getLearningStatus: async () => {
    return fetchAPI("/v2/learning/status");
  },
  resetLearning: async () => {
    return fetchAPI("/v2/learning/reset", {
      method: "POST",
      body: JSON.stringify({ confirm: true })
    });
  },
  getIncidentRecommendations: async (incidentId) => {
    return fetchAPI(`/v2/incidents/${incidentId}/recommendations`);
  },
  // ============ Remediation Engine APIs ============
  getIncidentFixes: async (incidentId) => {
    return fetchAPI(`/v2/incidents/${incidentId}/fixes`);
  },
  previewFix: async (incidentId, fixId) => {
    return fetchAPI(`/v2/incidents/${incidentId}/fix-preview`, {
      method: "POST",
      body: JSON.stringify({ fixId })
    });
  },
  applyFix: async (incidentId, fixId, confirmed, resourceInfo) => {
    const body = { fixId, confirmed };
    if (resourceInfo) {
      body.resourceNamespace = resourceInfo.resourceNamespace;
      body.resourceKind = resourceInfo.resourceKind;
      body.resourceName = resourceInfo.resourceName;
    }
    return fetchAPI(`/v2/incidents/${incidentId}/fix-apply`, {
      method: "POST",
      body: JSON.stringify(body)
    });
  },
  postCheck: async (incidentId, executionId) => {
    return fetchAPI(`/v2/incidents/${incidentId}/post-check`, {
      method: "POST",
      body: JSON.stringify({ executionId })
    });
  },
  // Legacy fix endpoints (kept for backward compatibility)
  previewIncidentFix: async (incidentId, recommendationId) => {
    return fetchAPI(`/v2/incidents/fix-preview`, {
      method: "POST",
      body: JSON.stringify({ incidentId, recommendationId })
    });
  },
  dryRunIncidentFix: async (incidentId, recommendationId) => {
    return fetchAPI(`/v2/incidents/fix-apply`, {
      method: "POST",
      body: JSON.stringify({ incidentId, recommendationId, dryRun: true })
    });
  },
  applyIncidentFix: async (incidentId, recommendationId) => {
    return fetchAPI(`/v2/incidents/fix-apply`, {
      method: "POST",
      body: JSON.stringify({ incidentId, recommendationId, dryRun: false })
    });
  },
  resolveIncident: async (incidentId, resolution) => {
    return fetchAPI(`/v2/incidents/${incidentId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ resolution })
    });
  },
  acknowledgeIncident: async (incidentId) => {
    return fetchAPI(`/v2/incidents/${incidentId}/acknowledge`, {
      method: "POST"
    });
  },
  getIncidentCount: async (namespace, pattern, severity) => {
    const params = new URLSearchParams();
    if (namespace) params.append("namespace", namespace);
    if (pattern) params.append("pattern", pattern);
    if (severity) params.append("severity", severity);
    const query = params.toString();
    const endpoint = query ? `/v2/incidents?${query}` : "/v2/incidents";
    const data = await fetchAPI(endpoint);
    return data.total || 0;
  },
  getIncidentsSummary: async () => {
    const data = await fetchAPI("/v2/incidents/summary");
    return {
      total: data.summary?.total || 0,
      active: data.summary?.active || 0,
      bySeverity: data.summary?.bySeverity || {},
      byPattern: data.summary?.byPattern || {},
      patternStats: data.patternStats || {}
    };
  },
  // ============ History/Timeline ============
  getHistoryEvents: async (incidentId, since, until) => {
    const params = new URLSearchParams();
    if (incidentId) params.append("incident_id", incidentId);
    if (since) params.append("since", since);
    if (until) params.append("until", until);
    const query = params.toString();
    const endpoint = query ? `/history/events?${query}` : "/history/events";
    return fetchAPI(endpoint);
  },
  // ============ Brain ============
  // Use backend endpoints that query real cluster data
  getBrainTimeline: async (hours = 72) => {
    const data = await fetchAPI(`/brain/timeline?hours=${hours}`);
    return data.events || [];
  },
  getBrainOOMInsights: async () => {
    return fetchAPI("/brain/oom-insights");
  },
  getBrainSummary: async () => {
    return fetchAPI("/brain/summary");
  },
  // ============ Continuity ============
  getContinuitySummary: async (window = "7d") => {
    return fetchAPI(`/continuity/summary?window=${window}`, {
      timeout: 45e3
      // 45 seconds timeout for continuity API (can be slow with many namespaces)
    });
  },
  // ============ Cluster Manager ============
  getClusters: () => fetchAPI("/clusters"),
  getClusterManagerStatus: () => fetchAPI("/clusters/status"),
  connectCluster: (payload) => fetchAPI("/clusters/connect", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  disconnectCluster: () => fetchAPI("/clusters/disconnect", {
    method: "POST"
  }),
  // ============ AutoFix Engine ============
  getAutoFixRules: async () => {
    const data = await fetchAPI("/autofix/rules");
    return data.rules || [];
  },
  toggleAutoFixRule: async (ruleId, enabled, settings) => {
    return fetchAPI("/autofix/rules/toggle", {
      method: "POST",
      body: JSON.stringify({ ruleId, enabled, settings })
    });
  },
  getAutoFixActions: async () => {
    const data = await fetchAPI("/autofix/actions");
    return data.actions || [];
  },
  getAutoFixEnabled: async () => {
    const data = await fetchAPI("/autofix/enabled");
    return data.enabled;
  },
  setAutoFixEnabled: async (enabled) => {
    return fetchAPI("/autofix/enabled", {
      method: "POST",
      body: JSON.stringify({ enabled })
    });
  },
  // Database Backup Management
  database: {
    getBackupStatus: () => fetchAPI("/database/backup/status"),
    updateBackupConfig: (config) => fetchAPI("/database/backup/config", {
      method: "POST",
      body: JSON.stringify(config)
    }),
    createBackup: () => fetchAPI("/database/backup/now", {
      method: "POST"
    }),
    listBackups: () => fetchAPI("/database/backup/list"),
    restoreBackup: (backupPath, dbPath) => fetchAPI("/database/backup/restore", {
      method: "POST",
      body: JSON.stringify({ backup_path: backupPath, db_path: dbPath })
    })
  },
  // ============ Performance Instrumentation ============
  getPerfSummary: async (window, route) => {
    const params = new URLSearchParams();
    if (window) params.append("window", window.toString());
    if (route) params.append("route", route);
    const query = params.toString();
    const endpoint = query ? `/v2/perf/summary?${query}` : "/v2/perf/summary";
    return fetchAPI(endpoint);
  },
  getPerfRecent: async (count) => {
    const params = new URLSearchParams();
    if (count) params.append("count", count.toString());
    const query = params.toString();
    const endpoint = query ? `/v2/perf/recent?${query}` : "/v2/perf/recent";
    return fetchAPI(endpoint);
  },
  clearPerf: async (confirm = false) => {
    return fetchAPI("/v2/perf/clear", {
      method: "POST",
      body: JSON.stringify({ confirm })
    });
  },
  postPerfUI: async (metric) => {
    return fetchAPI("/v2/perf/ui", {
      method: "POST",
      body: JSON.stringify(metric)
    });
  },
  // ============ Terminal ============
  getAvailableShells: () => fetchAPI("/terminal/shells"),
  getTerminalPreferences: () => fetchAPI("/terminal/preferences")
};

async function applyUpdate(updateInfo) {
  if (!updateInfo.downloadUrl) {
    return {
      success: false,
      error: "Download URL is not available for this update"
    };
  }
  try {
    const result = await api.installUpdate(updateInfo.downloadUrl);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to apply update"
    };
  }
}
function canApplyUpdate(updateInfo) {
  return updateInfo !== null && updateInfo.updateAvailable && !!updateInfo.downloadUrl;
}

var _tmpl$$v = /* @__PURE__ */ template(`<button>Apply Update`), _tmpl$2$p = /* @__PURE__ */ template(`<div class="flex flex-col gap-2"><div class="flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-medium text-white"style=background:var(--accent-primary)><div class=spinner style=width:16px;height:16px></div><span></span></div><div class="w-full bg-gray-700 rounded-full h-2 overflow-hidden"><div class="h-full transition-all duration-300 rounded-full"style=background:var(--accent-primary)>`), _tmpl$3$m = /* @__PURE__ */ template(`<div class="flex flex-col gap-2"><div class="flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-medium text-white bg-green-600"><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M5 13l4 4L19 7"></path></svg><span>Update Successful!`), _tmpl$4$k = /* @__PURE__ */ template(`<div class="flex flex-col gap-2"><button class="w-full px-6 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 text-white bg-red-600 hover:opacity-90"><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M6 18L18 6M6 6l12 12"></path></svg><span>Update Failed - Try Again`), _tmpl$5$i = /* @__PURE__ */ template(`<div>`), _tmpl$6$f = /* @__PURE__ */ template(`<div class="flex flex-col gap-2 w-full">`);
const UpdateApplyButton = (props) => {
  const [isInstalling, setIsInstalling] = createSignal(false);
  const [updateStage, setUpdateStage] = createSignal("idle");
  const [installMessage, setInstallMessage] = createSignal(null);
  const [progress, setProgress] = createSignal(0);
  const handleApplyUpdate = async () => {
    if (!canApplyUpdate(props.updateInfo)) {
      props.onError?.("Update cannot be applied - download URL is missing");
      return;
    }
    setIsInstalling(true);
    setUpdateStage("downloading");
    setInstallMessage("Preparing update...");
    setProgress(0);
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 90) {
          return prev + Math.random() * 15;
        }
        return prev;
      });
    }, 500);
    try {
      setUpdateStage("downloading");
      setInstallMessage("Downloading update...");
      setProgress(10);
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      setProgress(40);
      setUpdateStage("installing");
      setInstallMessage("Installing update...");
      setProgress(50);
      await new Promise((resolve) => setTimeout(resolve, 800));
      setProgress(80);
      const result = await applyUpdate(props.updateInfo);
      clearInterval(progressInterval);
      if (result.success) {
        setProgress(100);
        setUpdateStage("success");
        setInstallMessage("✓ Update installed successfully! Restarting application...");
        addNotification(`🎉 Update completed successfully! KubēGraf v${props.updateInfo.latestVersion} is now installed. The application will restart automatically.`, "success");
        props.onSuccess?.();
        setTimeout(() => {
          setInstallMessage("Application will restart in a moment...");
        }, 2e3);
      } else {
        clearInterval(progressInterval);
        setUpdateStage("error");
        const errorMsg = result.error || "Failed to apply update";
        setInstallMessage(`✗ ${errorMsg}`);
        props.onError?.(errorMsg);
        setIsInstalling(false);
        setProgress(0);
      }
    } catch (error) {
      clearInterval(progressInterval);
      setUpdateStage("error");
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred";
      setInstallMessage(`✗ ${errorMsg}`);
      props.onError?.(errorMsg);
      setIsInstalling(false);
      setProgress(0);
    }
  };
  const isDisabled = () => isInstalling() || !canApplyUpdate(props.updateInfo);
  const isSuccess = () => updateStage() === "success";
  const isError = () => updateStage() === "error";
  return (() => {
    var _el$ = _tmpl$6$f();
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!!isInstalling())() && !isSuccess();
      },
      get children() {
        var _el$2 = _tmpl$$v();
        _el$2.$$click = handleApplyUpdate;
        createRenderEffect((_p$) => {
          var _v$ = isDisabled(), _v$2 = `w-full px-6 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${props.variant === "secondary" ? "bg-gray-600 hover:bg-gray-700 text-white" : "text-white"} ${isDisabled() ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"}`, _v$3 = props.variant !== "secondary" ? {
            background: "var(--accent-primary)"
          } : {};
          _v$ !== _p$.e && (_el$2.disabled = _p$.e = _v$);
          _v$2 !== _p$.t && className(_el$2, _p$.t = _v$2);
          _p$.a = style(_el$2, _v$3, _p$.a);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0
        });
        return _el$2;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return isInstalling();
      },
      get children() {
        var _el$3 = _tmpl$2$p(), _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling, _el$7 = _el$4.nextSibling, _el$8 = _el$7.firstChild;
        insert(_el$6, (() => {
          var _c$ = memo(() => updateStage() === "downloading");
          return () => _c$() ? "Downloading update..." : updateStage() === "installing" ? "Installing update..." : "Applying update...";
        })());
        createRenderEffect((_$p) => setStyleProperty(_el$8, "width", `${progress()}%`));
        return _el$3;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return isSuccess();
      },
      get children() {
        return _tmpl$3$m();
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return isError();
      },
      get children() {
        var _el$0 = _tmpl$4$k(), _el$1 = _el$0.firstChild;
        _el$1.$$click = handleApplyUpdate;
        return _el$0;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return installMessage();
      },
      get children() {
        var _el$10 = _tmpl$5$i();
        insert(_el$10, installMessage);
        createRenderEffect((_p$) => {
          var _v$4 = `text-xs px-3 py-2 rounded ${isSuccess() ? "bg-green-900/30 border border-green-700/50" : isError() ? "bg-red-900/30 border border-red-700/50" : ""}`, _v$5 = isSuccess() ? "rgba(34, 197, 94, 0.1)" : isError() ? "rgba(239, 68, 68, 0.1)" : "var(--bg-tertiary)", _v$6 = isSuccess() ? "#86efac" : isError() ? "#fca5a5" : "var(--text-secondary)", _v$7 = isSuccess() ? "1px solid rgba(34, 197, 94, 0.3)" : isError() ? "1px solid rgba(239, 68, 68, 0.3)" : "none";
          _v$4 !== _p$.e && className(_el$10, _p$.e = _v$4);
          _v$5 !== _p$.t && setStyleProperty(_el$10, "background", _p$.t = _v$5);
          _v$6 !== _p$.a && setStyleProperty(_el$10, "color", _p$.a = _v$6);
          _v$7 !== _p$.o && setStyleProperty(_el$10, "border", _p$.o = _v$7);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0,
          o: void 0
        });
        return _el$10;
      }
    }), null);
    return _el$;
  })();
};
delegateEvents(["click"]);

var _tmpl$$u = /* @__PURE__ */ template(`<div class="fixed inset-0 z-[1000] flex items-center justify-center p-4"style="background-color:rgba(0, 0, 0, 0.5)"><div class="w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden"style="background:var(--bg-card);border:1px solid var(--border-color)"><div class="px-6 py-4 border-b flex items-center justify-between"style=border-color:var(--border-color)><h2 class="text-xl font-bold"style=color:var(--text-primary)>KubēGraf Update Available</h2><button class="text-2xl leading-none hover:opacity-70 transition-opacity"style=color:var(--text-secondary)>×</button></div><div class="px-6 py-4 max-h-[70vh] overflow-y-auto"><div class=mb-4><p class="text-lg mb-2"style=color:var(--text-primary)>Version <span class=font-semibold>v</span> is now available</p></div><div class=mb-6><h3 class="font-semibold mb-2 flex items-center gap-2"style=color:var(--text-primary)><span>📝</span> Release Notes</h3><div class="prose prose-sm max-w-none p-4 rounded-lg"style=background:var(--bg-tertiary);color:var(--text-primary);white-space:pre-wrap;font-family:monospace;font-size:0.875rem></div></div><div class=mb-6><h3 class="font-semibold mb-2 flex items-center gap-2"style=color:var(--text-primary)><span>🔍</span> Comparison</h3><div class="flex items-center gap-4 p-4 rounded-lg"style=background:var(--bg-tertiary)><div><div class=text-sm style=color:var(--text-muted)>Your version:</div><div class=font-semibold style=color:var(--text-primary)>v</div></div><div class=text-2xl style=color:var(--text-secondary)>→</div><div><div class=text-sm style=color:var(--text-muted)>Latest version:</div><div class=font-semibold style=color:var(--accent-primary)>v</div></div></div></div><div class=mb-6><h3 class="font-semibold mb-2 flex items-center gap-2"style=color:var(--text-primary)><span>📦</span> How to Update</h3><div class="mb-3 p-3 rounded-lg"style="background:rgba(34, 197, 94, 0.1);border:1px solid rgba(34, 197, 94, 0.3)"><p class="text-sm flex items-start gap-2"style=color:var(--text-primary)><span>✅</span><span><strong>Safe Update:</strong> The install script works on Windows, macOS, and Linux. It will automatically detect your OS and architecture, download the correct binary, and install it. Your settings and cluster connections are preserved. After installation, restart KubēGraf to use the new version.</span></p></div><p class="text-sm mb-3"style=color:var(--text-secondary)>Run this command in your terminal when you're ready:</p><div class="flex items-center gap-2 p-4 rounded-lg"style=background:var(--bg-tertiary)><code class="flex-1 font-mono text-sm"style=color:var(--text-primary)>curl -sSL https://kubegraf.io/install.sh | bash</code><button class="px-3 py-1.5 rounded text-sm font-medium transition-colors"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)">Copy</button></div><div class="mt-3 p-3 rounded-lg"style=background:var(--bg-secondary)><p class=text-xs style=color:var(--text-muted)><strong>What happens:</strong></p><ul class="text-xs mt-1.5 ml-4 list-disc"style=color:var(--text-muted)><li>Script detects your OS (Windows/macOS/Linux) and architecture</li><li>Downloads the latest version from GitHub releases</li><li>Installs to <code>/usr/local/bin</code> (may require sudo on Linux/macOS)</li><li>Preserves all your settings and cluster connections</li><li>Restart KubēGraf manually to use the new version</li></ul><p class="text-xs mt-2 italic"style=color:var(--text-muted)>💡 <strong>Tip:</strong> If KubēGraf is currently running, stop it first, run the install command, then start it again.</p></div><div class="mt-3 p-3 rounded-lg"style="background:var(--bg-tertiary);border:1px solid var(--border-color)"><p class="text-xs mb-2"style=color:var(--text-muted)><strong>Alternative (GitHub Raw):</strong></p><code class="text-xs font-mono block"style=color:var(--text-primary)>curl -sSL https://raw.githubusercontent.com/kubegraf/kubegraf/main/docs/install.sh | bash</code></div><p class="text-xs mt-3"style=color:var(--text-muted)>Or visit: <a target=_blank rel="noopener noreferrer"class="underline hover:opacity-80"style=color:var(--accent-primary)></a> to download manually</p></div></div><div class="px-6 py-4 border-t flex items-center justify-between gap-3"style=border-color:var(--border-color)><div class="flex items-center gap-3"></div><div class="flex items-center gap-3"><button class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)">Remind Me Later</button><button class="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"style=background:var(--accent-primary)>View on GitHub`);
const UpdateModal = (props) => {
  const handleInstallClick = () => {
    const url = props.updateInfo.htmlUrl || `https://github.com/kubegraf/kubegraf/releases/tag/v${props.updateInfo.latestVersion}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const handleCopyCommand = () => {
    const command = "curl -sSL https://kubegraf.io/install.sh | bash";
    navigator.clipboard.writeText(command).then(() => {
      alert("Install command copied to clipboard!");
    });
  };
  return createComponent(Show, {
    get when() {
      return props.isOpen;
    },
    get children() {
      return createComponent(Portal, {
        get children() {
          var _el$ = _tmpl$$u(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.nextSibling, _el$6 = _el$3.nextSibling, _el$7 = _el$6.firstChild, _el$8 = _el$7.firstChild, _el$9 = _el$8.firstChild, _el$0 = _el$9.nextSibling; _el$0.firstChild; var _el$10 = _el$7.nextSibling, _el$11 = _el$10.firstChild, _el$12 = _el$11.nextSibling, _el$13 = _el$10.nextSibling, _el$14 = _el$13.firstChild, _el$15 = _el$14.nextSibling, _el$16 = _el$15.firstChild, _el$17 = _el$16.firstChild, _el$18 = _el$17.nextSibling; _el$18.firstChild; var _el$20 = _el$16.nextSibling, _el$21 = _el$20.nextSibling, _el$22 = _el$21.firstChild, _el$23 = _el$22.nextSibling; _el$23.firstChild; var _el$25 = _el$13.nextSibling, _el$26 = _el$25.firstChild, _el$27 = _el$26.nextSibling; _el$27.firstChild; var _el$29 = _el$27.nextSibling, _el$30 = _el$29.nextSibling, _el$31 = _el$30.firstChild, _el$32 = _el$31.nextSibling, _el$33 = _el$30.nextSibling, _el$34 = _el$33.firstChild, _el$35 = _el$34.nextSibling; _el$35.nextSibling; var _el$37 = _el$33.nextSibling, _el$38 = _el$37.firstChild; _el$38.nextSibling; var _el$40 = _el$37.nextSibling, _el$41 = _el$40.firstChild, _el$43 = _el$41.nextSibling, _el$44 = _el$6.nextSibling, _el$45 = _el$44.firstChild, _el$46 = _el$45.nextSibling, _el$47 = _el$46.firstChild, _el$48 = _el$47.nextSibling;
          addEventListener(_el$, "click", props.onClose, true);
          _el$2.$$click = (e) => e.stopPropagation();
          addEventListener(_el$5, "click", props.onClose, true);
          insert(_el$0, () => props.updateInfo.latestVersion, null);
          insert(_el$12, () => props.updateInfo.releaseNotes || "No release notes available.");
          insert(_el$18, () => props.updateInfo.currentVersion, null);
          insert(_el$23, () => props.updateInfo.latestVersion, null);
          _el$32.$$click = handleCopyCommand;
          insert(_el$43, () => props.updateInfo.htmlUrl);
          insert(_el$45, createComponent(Show, {
            get when() {
              return canApplyUpdate(props.updateInfo);
            },
            get children() {
              return createComponent(UpdateApplyButton, {
                get updateInfo() {
                  return props.updateInfo;
                },
                onSuccess: () => {
                  addNotification(`✨ KubēGraf is updating to v${props.updateInfo.latestVersion}. The application will restart shortly.`, "success");
                  props.onClose();
                },
                onError: (error) => {
                  console.error("Update failed:", error);
                  addNotification(`Update failed: ${error}`, "error");
                }
              });
            }
          }));
          addEventListener(_el$47, "click", props.onClose, true);
          _el$48.$$click = handleInstallClick;
          createRenderEffect(() => setAttribute(_el$43, "href", props.updateInfo.htmlUrl));
          return _el$;
        }
      });
    }
  });
};
delegateEvents(["click"]);

const navSections = [
  {
    title: "Overview",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      },
      {
        id: "topology",
        label: "Cluster Overview",
        icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      },
      {
        id: "multicluster",
        label: "Multi-Cluster",
        icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
      },
      {
        id: "monitoredevents",
        label: "Live Events Stream",
        icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      }
    ]
  },
  {
    title: "Insights",
    items: [
      {
        id: "incidents",
        label: "Incidents",
        icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      },
      {
        id: "timeline",
        label: "Timeline Replay",
        icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      },
      {
        id: "anomalies",
        label: "Anomalies",
        icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      },
      {
        id: "security",
        label: "Security Insights",
        icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      },
      {
        id: "cost",
        label: "Cost Insights",
        icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      },
      {
        id: "drift",
        label: "Drift Detection",
        icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
      },
      {
        id: "continuity",
        label: "Continuity",
        icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      }
    ]
  },
  {
    title: "CD",
    items: [
      {
        id: "deployapp",
        label: "Deploy",
        icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
      },
      {
        id: "rollouts",
        label: "Rollouts",
        icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      }
    ]
  },
  {
    title: "Workloads",
    items: [
      {
        id: "pods",
        label: "Pods",
        icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      },
      {
        id: "deployments",
        label: "Deployments",
        icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
      },
      {
        id: "statefulsets",
        label: "StatefulSets",
        icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
      },
      {
        id: "daemonsets",
        label: "DaemonSets",
        icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
      },
      {
        id: "jobs",
        label: "Jobs",
        icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      },
      {
        id: "cronjobs",
        label: "CronJobs",
        icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      },
      {
        id: "pdb",
        label: "PDB",
        icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      },
      {
        id: "hpa",
        label: "HPA",
        icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
      }
    ]
  },
  {
    title: "Networking",
    items: [
      {
        id: "services",
        label: "Services",
        icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
      },
      {
        id: "ingresses",
        label: "Ingress",
        icon: "M13 10V3L4 14h7v7l9-11h-7z"
      },
      {
        id: "networkpolicies",
        label: "Network Policies",
        icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      }
    ]
  },
  {
    title: "Config & Storage",
    items: [
      {
        id: "configmaps",
        label: "ConfigMaps",
        icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      },
      {
        id: "secrets",
        label: "Secrets",
        icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
      },
      {
        id: "certificates",
        label: "Certificates",
        icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      },
      {
        id: "storage",
        label: "PVs / PVCs",
        icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
      }
    ]
  },
  {
    title: "Access Control",
    items: [
      {
        id: "serviceaccounts",
        label: "Service Accounts",
        icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      },
      {
        id: "rbac",
        label: "RBAC",
        icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      }
    ]
  },
  {
    title: "Platform",
    items: [
      {
        id: "namespaces",
        label: "Namespaces",
        icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
      },
      {
        id: "nodes",
        label: "Nodes",
        icon: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
      },
      {
        id: "usermanagement",
        label: "Users",
        icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      },
      {
        id: "resourcemap",
        label: "Resource Map",
        icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
      },
      {
        id: "connectors",
        label: "Integrations",
        icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      },
      {
        id: "plugins",
        label: "Plugins",
        icon: "M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
      },
      {
        id: "terminal",
        label: "Terminal",
        icon: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      }
    ]
  },
  {
    title: "Intelligence",
    items: [
      {
        id: "ai",
        label: "AI Assistant",
        icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      },
      {
        id: "autofix",
        label: "AutoFix Engine",
        icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      },
      {
        id: "sreagent",
        label: "SRE Agent",
        icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      },
      {
        id: "knowledgebank",
        label: "Knowledge Bank",
        icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
      }
    ]
  },
  {
    title: "Machine learning",
    items: [
      {
        id: "trainingjobs",
        label: "Training Jobs",
        icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      },
      {
        id: "inferenceservices",
        label: "Inference Services",
        icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      },
      {
        id: "mlflow",
        label: "MLflow",
        icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      },
      {
        id: "feast",
        label: "Feast",
        icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
      },
      {
        id: "gpudashboard",
        label: "GPU Dashboard",
        icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
      }
    ],
    conditional: true
    // Only shown when ML workloads or GPU nodes are detected
  },
  {
    title: "Custom Resources",
    items: [
      {
        id: "customresources",
        label: "CRDs & Instances",
        icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
      }
    ]
  }
];

const ALL_NAMESPACES_LABEL = "All Namespaces";
const [namespaceLabel, setNamespaceLabel] = createSignal(ALL_NAMESPACES_LABEL);
const namespace = namespaceLabel;
const [namespaces, setNamespaces] = createSignal(["default"]);
const [workspaceContext, setWorkspaceContext] = createSignal(null);
const [workspaceVersion, setWorkspaceVersion] = createSignal(0);
const [selectedNamespaces, setSelectedNamespacesSignal] = createSignal([]);
const [workspaceLoading, setWorkspaceLoading] = createSignal(false);
const [contexts, setContexts] = createSignal([]);
const [currentContext, setCurrentContext] = createSignal("");
const [clusterSwitching, setClusterSwitching] = createSignal(false);
const [clusterSwitchMessage, setClusterSwitchMessage] = createSignal("");
const [clusterStatus, setClusterStatus] = createSignal({
  connected: false,
  context: "",
  server: "",
  namespace: "default",
  nodeCount: 0,
  podCount: 0,
  cpuUsage: 0,
  memoryUsage: 0
});
function computeNamespaceLabel(selection) {
  if (!selection || selection.length === 0) return ALL_NAMESPACES_LABEL;
  if (selection.length === 1) return selection[0];
  return `${selection.length} namespaces`;
}
function normalizeNamespaces(list) {
  const deduped = Array.from(new Set(list.map((ns) => ns.trim()).filter(Boolean)));
  return deduped.sort((a, b) => a.localeCompare(b));
}
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
function applyWorkspaceContextState(ctx) {
  const safeSelection = normalizeNamespaces(ctx.selectedNamespaces || []);
  const filters = ctx.filters || {};
  setWorkspaceContext({
    selectedNamespaces: safeSelection,
    selectedCluster: ctx.selectedCluster || "",
    filters
  });
  setSelectedNamespacesSignal(safeSelection);
  const labelSelection = (() => {
    if (filters.namespaceMode === "all") {
      return [];
    }
    if (safeSelection.length === 0 && (filters.namespaceMode === "default" || !filters.namespaceMode)) {
      const currentNs = clusterStatus().namespace;
      return currentNs ? [currentNs] : [];
    }
    return safeSelection;
  })();
  setNamespaceLabel(computeNamespaceLabel(labelSelection));
  setWorkspaceVersion((prev) => prev + 1);
}
async function loadWorkspaceContext() {
  if (workspaceLoading()) return;
  setWorkspaceLoading(true);
  try {
    const ctx = await api.getWorkspaceContext();
    applyWorkspaceContextState(ctx || { selectedNamespaces: [] });
  } catch (err) {
    console.error("Failed to load workspace context", err);
    applyWorkspaceContextState({ selectedNamespaces: [] });
  } finally {
    setWorkspaceLoading(false);
  }
}
createEffect(() => {
  const connected = clusterStatus().connected;
  const version = workspaceVersion();
  if (connected) {
    if (version === 0) {
      console.log("[Cluster] Cluster connected, triggering resource fetch (workspaceVersion: 0 -> 1)");
      setWorkspaceVersion(1);
    }
    setTimeout(() => {
      if (clusterStatus().connected) {
        console.log("[Cluster] Refetching resources after cluster connection");
        refetchPods();
        refetchDeployments();
        refetchServices();
        refetchNodes();
      }
    }, 500);
  } else {
    if (version > 0) {
      console.log("[Cluster] Cluster disconnected, resetting workspaceVersion");
      setWorkspaceVersion(0);
    }
  }
});
async function persistWorkspaceContext(next) {
  try {
    const updated = await api.updateWorkspaceContext({
      selectedNamespaces: next.selectedNamespaces || [],
      selectedCluster: next.selectedCluster || "",
      filters: next.filters || {}
    });
    applyWorkspaceContextState(updated || next);
  } catch (err) {
    console.error("Failed to update workspace context", err);
    throw err;
  }
}
async function setSelectedNamespaces(names, mode) {
  const normalized = normalizeNamespaces(names);
  if (arraysEqual(selectedNamespaces(), normalized) && (!mode || mode === workspaceContext()?.filters?.namespaceMode)) {
    return;
  }
  const base = workspaceContext() || { selectedCluster: "", filters: {} };
  const filters = { ...base.filters || {} };
  let namespaceMode;
  if (mode) {
    namespaceMode = mode;
  } else {
    namespaceMode = normalized.length === 0 ? "default" : "custom";
  }
  filters.namespaceMode = namespaceMode;
  await persistWorkspaceContext({
    selectedNamespaces: normalized,
    selectedCluster: base.selectedCluster,
    filters
  });
}
async function setNamespace(value) {
  try {
    setNamespaceLabel(value);
    if (!value || value === "_all" || value === ALL_NAMESPACES_LABEL) {
      await setSelectedNamespaces([], "all");
    } else {
      await setSelectedNamespaces([value], "custom");
    }
  } catch (err) {
    console.error("Failed to set namespace", err);
  }
}
async function fetchNamespaces() {
  return await api.getNamespaceNames();
}
async function fetchPods() {
  console.log("[Cluster] Fetching pods from /api/pods");
  try {
    const res = await fetch("/api/pods");
    if (!res.ok) {
      const errorText = await res.text();
      console.error("[Cluster] Failed to fetch pods:", res.status, res.statusText, errorText);
      throw new Error(`Failed to fetch pods: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    const pods = Array.isArray(data) ? data : data.pods || [];
    console.log("[Cluster] Fetched pods:", pods.length, "pods");
    if (pods.length > 0) {
      console.log("[Cluster] Sample pod:", { name: pods[0].name, namespace: pods[0].namespace, status: pods[0].status });
    }
    return pods;
  } catch (error) {
    console.error("[Cluster] Error fetching pods:", error);
    throw error;
  }
}
async function fetchDeployments() {
  console.log("[Cluster] Fetching deployments from /api/deployments");
  try {
    const res = await fetch("/api/deployments");
    if (!res.ok) {
      const errorText = await res.text();
      console.error("[Cluster] Failed to fetch deployments:", res.status, res.statusText, errorText);
      throw new Error(`Failed to fetch deployments: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    const deployments = Array.isArray(data) ? data : data.deployments || [];
    console.log("[Cluster] Fetched deployments:", deployments.length, "deployments");
    if (deployments.length > 0) {
      console.log("[Cluster] Sample deployment:", { name: deployments[0].name, namespace: deployments[0].namespace, ready: deployments[0].ready });
    }
    return deployments;
  } catch (error) {
    console.error("[Cluster] Error fetching deployments:", error);
    throw error;
  }
}
async function fetchServices() {
  console.log("[Cluster] Fetching services from /api/services");
  try {
    const res = await fetch("/api/services");
    if (!res.ok) {
      const errorText = await res.text();
      console.error("[Cluster] Failed to fetch services:", res.status, res.statusText, errorText);
      throw new Error(`Failed to fetch services: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    const services = Array.isArray(data) ? data : data.services || [];
    console.log("[Cluster] Fetched services:", services.length, "services");
    return services;
  } catch (error) {
    console.error("[Cluster] Error fetching services:", error);
    throw error;
  }
}
async function fetchNodes() {
  console.log("[Cluster] Fetching nodes from /api/nodes");
  try {
    const res = await fetch("/api/nodes");
    if (!res.ok) {
      const errorText = await res.text();
      console.error("[Cluster] Failed to fetch nodes:", res.status, res.statusText, errorText);
      throw new Error(`Failed to fetch nodes: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    const nodes = Array.isArray(data) ? data : data.nodes || [];
    console.log("[Cluster] Fetched nodes:", nodes.length, "nodes");
    return nodes;
  } catch (error) {
    console.error("[Cluster] Error fetching nodes:", error);
    throw error;
  }
}
async function fetchClusterStatus() {
  const res = await fetch("/api/status");
  if (!res.ok) throw new Error("Failed to fetch status");
  const data = await res.json();
  return {
    connected: data.connected || false,
    context: data.cluster || data.context || "",
    server: data.server || "",
    namespace: data.namespace || "default",
    nodeCount: data.nodeCount || 0,
    podCount: data.podCount || 0,
    cpuUsage: data.cpuUsage || 0,
    memoryUsage: data.memoryUsage || 0
  };
}
async function fetchContexts() {
  const res = await fetch("/api/contexts");
  if (!res.ok) throw new Error("Failed to fetch contexts");
  const data = await res.json();
  return data.contexts || [];
}
async function switchContext(contextName) {
  setClusterSwitching(true);
  setClusterSwitchMessage(`Switching to ${contextName}...`);
  try {
    const res = await fetch("/api/contexts/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context: contextName })
    });
    if (!res.ok) throw new Error("Failed to switch context");
    setCurrentContext(contextName);
    setClusterSwitchMessage(`Loading resources from ${contextName}...`);
    refreshAll();
    const ctxData = await fetchContexts();
    setContexts(ctxData);
    api.getNamespaceNames().then((ns) => setNamespaces(ns)).catch((err) => console.error("Failed to refresh namespaces after context switch", err));
    setClusterSwitchMessage(`Connected to ${contextName}`);
    setTimeout(() => {
      setClusterSwitching(false);
      setClusterSwitchMessage("");
    }, 1e3);
  } catch (error) {
    setClusterSwitchMessage(`Failed to switch to ${contextName}`);
    setTimeout(() => {
      setClusterSwitching(false);
      setClusterSwitchMessage("");
    }, 2e3);
    throw error;
  }
}
const [namespacesResource] = createResource(fetchNamespaces);
const [statusResource, { refetch: refetchStatus }] = createResource(fetchClusterStatus);
const [contextsResource, { refetch: refetchContexts }] = createResource(fetchContexts);
const resourceTrigger = createMemo(() => {
  const connected = clusterStatus().connected;
  const version = workspaceVersion();
  return connected ? `connected-${version}` : "disconnected";
});
const [podsResource, { refetch: refetchPods }] = createResource(
  () => {
    const trigger = resourceTrigger();
    return clusterStatus().connected ? trigger : false;
  },
  () => fetchPods()
);
const [deploymentsResource, { refetch: refetchDeployments }] = createResource(
  () => {
    const trigger = resourceTrigger();
    return clusterStatus().connected ? trigger : false;
  },
  () => fetchDeployments()
);
const [servicesResource, { refetch: refetchServices }] = createResource(
  () => {
    const trigger = resourceTrigger();
    return clusterStatus().connected ? trigger : false;
  },
  () => fetchServices()
);
const [nodesResource, { refetch: refetchNodes }] = createResource(
  () => {
    const trigger = resourceTrigger();
    return clusterStatus().connected ? trigger : false;
  },
  () => fetchNodes()
);
createEffect(() => {
  const ns = namespacesResource();
  if (ns) setNamespaces(ns);
});
createEffect(() => {
  const status = statusResource();
  if (status) {
    setClusterStatus(status);
    setCurrentContext(status.context);
  }
});
createEffect(() => {
  const ctx = contextsResource();
  if (ctx) setContexts(ctx);
});
createEffect(() => {
  if (statusResource.error) console.error("Status error:", statusResource.error);
  if (namespacesResource.error) console.error("Namespaces error:", namespacesResource.error);
  if (podsResource.error) console.error("Pods error:", podsResource.error);
  if (nodesResource.error) console.error("Nodes error:", nodesResource.error);
});
const [refreshTrigger, setRefreshTrigger] = createSignal(0);
const clusterSwitchCallbacks = [];
function onClusterSwitch(callback) {
  clusterSwitchCallbacks.push(callback);
  return () => {
    const index = clusterSwitchCallbacks.indexOf(callback);
    if (index > -1) {
      clusterSwitchCallbacks.splice(index, 1);
    }
  };
}
function refreshAll() {
  refetchPods();
  refetchDeployments();
  refetchServices();
  refetchNodes();
  refetchStatus();
  clusterSwitchCallbacks.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.error("Error in cluster switch callback:", e);
    }
  });
  setRefreshTrigger((prev) => prev + 1);
}
if (typeof window !== "undefined") {
  loadWorkspaceContext();
}

const [hasMLWorkloads, setHasMLWorkloads] = createSignal(false);
function shouldShowMLSection() {
  const nodes = nodesResource();
  const hasGPUNodes = checkForGPUNodes(nodes);
  const userEnabledML = checkUserMLPreference();
  checkForMLWorkloads();
  const manualOverride = localStorage.getItem("kubegraf-ml-force-show");
  if (manualOverride === "true") {
    return true;
  }
  const mlDisabled = localStorage.getItem("kubegraf-ml-disabled");
  if (mlDisabled === "true") {
    return false;
  }
  return hasGPUNodes || userEnabledML || hasMLWorkloads() || true;
}
function checkForGPUNodes(nodes) {
  if (!nodes || nodes.length === 0) {
    return false;
  }
  return nodes.some((node) => {
    const labels = node.labels || {};
    const capacity = node.capacity || {};
    return labels["nvidia.com/gpu"] !== void 0 || labels["accelerator"] === "nvidia-tesla-k80" || labels["accelerator"] === "nvidia-tesla-p100" || labels["accelerator"] === "nvidia-tesla-v100" || capacity["nvidia.com/gpu"] !== void 0 || node.allocatable?.["nvidia.com/gpu"] !== void 0;
  });
}
function checkUserMLPreference() {
  try {
    const mlEnabled = localStorage.getItem("kubegraf-ml-enabled");
    return mlEnabled === "true";
  } catch {
    return false;
  }
}
async function checkForMLWorkloads() {
  try {
    const response = await fetch("/api/trainingjobs?limit=1");
    if (response.ok) {
      setHasMLWorkloads(true);
      return;
    }
  } catch {
  }
  try {
    const response = await fetch("/api/inferenceservices?limit=1");
    if (response.ok) {
      setHasMLWorkloads(true);
      return;
    }
  } catch {
  }
  try {
    const response = await fetch("/api/services?namespace=default");
    if (response.ok) {
      const services = await response.json();
      const hasMLServices = services.some(
        (svc) => svc.name?.toLowerCase().includes("mlflow") || svc.name?.toLowerCase().includes("feast")
      );
      if (hasMLServices) {
        setHasMLWorkloads(true);
      }
    }
  } catch {
  }
}
if (typeof window !== "undefined") {
  checkForMLWorkloads();
  setInterval(checkForMLWorkloads, 3e4);
}

const STORAGE_KEY$1 = "kubegraf-sidebar-open-sections";
function loadInitial() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY$1);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const next = parsed;
    if ("ML" in next && !("Machine learning" in next)) {
      next["Machine learning"] = !!next["ML"];
      delete next["ML"];
    }
    return next;
  } catch {
    return {};
  }
}
const [openSections, setOpenSections] = createSignal(loadInitial());
function persist(next) {
  try {
    sessionStorage.setItem(STORAGE_KEY$1, JSON.stringify(next));
  } catch {
  }
}
function ensureSidebarSections(titles, defaultOpenTitles) {
  const current = { ...openSections() || {} };
  const defaults = new Set(defaultOpenTitles);
  let changed = false;
  for (const t of titles) {
    if (!(t in current)) {
      current[t] = defaults.has(t);
      changed = true;
    }
  }
  for (const k of Object.keys(current)) {
    if (!titles.includes(k)) {
      delete current[k];
      changed = true;
    }
  }
  if (changed) {
    setOpenSections(current);
    persist(current);
  }
}

const [_activeSection, _setActiveSection] = createSignal(null);
const [_pinnedSection, _setPinnedSection] = createSignal(null);
let hoverTimeout = null;
function activeSection() {
  return _activeSection();
}
function pinnedSection() {
  return _pinnedSection();
}
function setActiveSection(value) {
  _setActiveSection(value);
}
function setPinnedSection(value) {
  _setPinnedSection(value);
}
function setActive(sectionTitle) {
  if (hoverTimeout) {
    clearTimeout(hoverTimeout);
    hoverTimeout = null;
  }
  setActiveSection(sectionTitle);
}
function pinSection(sectionTitle) {
  setPinnedSection(sectionTitle);
  setActiveSection(sectionTitle);
}
function unpinSection() {
  setPinnedSection(null);
}
function closeWithDelay(delay = 200) {
  if (hoverTimeout) {
    clearTimeout(hoverTimeout);
  }
  hoverTimeout = setTimeout(() => {
    if (!pinnedSection()) {
      setActiveSection(null);
    }
    hoverTimeout = null;
  }, delay);
}
function getVisibleSection() {
  const pinned = pinnedSection();
  if (pinned) return pinned;
  return activeSection();
}
function isSectionActive(sectionTitle) {
  const visible = getVisibleSection();
  return visible === sectionTitle;
}
function isSectionPinned(sectionTitle) {
  return pinnedSection() === sectionTitle;
}

const [unreadInsightsEvents, setUnreadInsightsEvents] = createSignal(0);
const [lastInsightEventAt, setLastInsightEventAt] = createSignal(null);
function registerInsightEvent(count = 1) {
  setUnreadInsightsEvents((prev) => prev + Math.max(1, count));
  setLastInsightEventAt(Date.now());
}

var _tmpl$$t = /* @__PURE__ */ template(`<div class="w-16 flex flex-col"style=overflow:visible><nav class="flex-1 py-2 space-y-1"style=overflow:visible>`), _tmpl$2$o = /* @__PURE__ */ template(`<span class="absolute top-1 right-1 w-2 h-2 rounded-full bg-status-danger animate-pulseSoft">`), _tmpl$3$l = /* @__PURE__ */ template(`<span class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-brand-cyan rounded-r">`), _tmpl$4$j = /* @__PURE__ */ template(`<button class="p-1 rounded-md hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-brand-cyan/40"title="Unpin section"><svg class="w-3.5 h-3.5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M6 18L18 6M6 6l12 12">`), _tmpl$5$h = /* @__PURE__ */ template(`<div class="absolute left-full top-0 z-50"style=pointerEvents:auto><div class="w-56 max-h-[calc(100vh-2rem)] rounded-xl border border-border-subtle/50 bg-bg-panel/95 backdrop-blur-xl shadow-2xl flex flex-col animate-slideIn overflow-hidden ml-0"style="box-shadow:0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset"><div class="px-3 py-2.5 border-b border-border-subtle/50 flex items-center justify-between bg-bg-sidebar/50"><h2 class="text-xs font-bold text-text-primary uppercase tracking-wider"></h2></div><nav class="overflow-y-auto py-1.5 px-1.5">`), _tmpl$6$e = /* @__PURE__ */ template(`<div class=relative style=overflow:visible><button style="gap:clamp(2px, 0.25rem, 4px);padding:clamp(6px, 0.625rem, 10px) clamp(4px, 0.5rem, 8px)"><svg class=flex-shrink-0 fill=none stroke=currentColor viewBox="0 0 24 24"stroke-width=2 style="width:clamp(16px, 1.25rem, 20px);height:clamp(16px, 1.25rem, 20px)"><path stroke-linecap=round stroke-linejoin=round></path></svg><span class="font-bold leading-tight text-center"style="font-size:clamp(8px, 0.625rem, 10px)">`), _tmpl$7$c = /* @__PURE__ */ template(`<span class="w-2 h-2 rounded-full bg-status-danger animate-pulseSoft">`), _tmpl$8$a = /* @__PURE__ */ template(`<span class="w-1.5 h-1.5 rounded-full bg-brand-cyan shadow-glowCyan">`), _tmpl$9$8 = /* @__PURE__ */ template(`<button><svg fill=none stroke=currentColor viewBox="0 0 24 24"stroke-width=2><path stroke-linecap=round stroke-linejoin=round></path></svg><span class="text-sm font-semibold flex-1 text-left truncate">`);
const SidebarRail = (props) => {
  const getSectionIcon = (section) => {
    if (section.items.length > 0) {
      return section.items[0].icon;
    }
    const iconMap = {
      "Overview": "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
      "Insights": "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
      "Workloads": "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
      "Networking": "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9",
      "Config & Storage": "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
      "Access Control": "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
      "Platform": "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z",
      "Intelligence": "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
      "Machine learning": "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
      "Custom Resources": "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z",
      "CD": "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    };
    return iconMap[section.title] || section.items[0]?.icon || "";
  };
  const hasActiveItem = (section) => {
    return section.items.some((item) => currentView() === item.id);
  };
  const getShortLabel = (section) => {
    const abbreviations = {
      "Overview": "OV",
      "Insights": "IN",
      "Workloads": "WK",
      "Networking": "NW",
      "Config & Storage": "CS",
      "Access Control": "AC",
      "Platform": "PL",
      "Intelligence": "AI",
      "Machine learning": "ML",
      "Custom Resources": "CR",
      "CD": "CD"
    };
    return abbreviations[section.title] || section.title.substring(0, 2).toUpperCase();
  };
  const handleItemClick = (itemId) => {
    if (itemId === "terminal") {
      setTerminalOpen(true);
      return;
    }
    setCurrentView(itemId);
    setTimeout(() => {
      const mainContent = document.querySelector("main");
      if (mainContent) {
        mainContent.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      }
    }, 100);
  };
  return (() => {
    var _el$ = _tmpl$$t(), _el$2 = _el$.firstChild;
    insert(_el$2, createComponent(For, {
      get each() {
        return props.sections;
      },
      children: (section) => {
        const active = () => isSectionActive(section.title);
        const pinned = () => isSectionPinned(section.title);
        const hasActive = () => hasActiveItem(section);
        const showInsightsPulse = () => section.title === "Insights" && unreadInsightsEvents() > 0;
        let wrapperRef;
        return (
          // ✅ ONE wrapper that contains BOTH the button AND the flyout submenu
          (() => {
            var _el$3 = _tmpl$6$e(), _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$5.firstChild, _el$7 = _el$5.nextSibling;
            _el$3.addEventListener("mouseleave", (e) => {
              const next = e.relatedTarget;
              if (next && wrapperRef && wrapperRef.contains(next)) {
                return;
              }
              if (!pinned()) {
                setActive(null);
              }
            });
            _el$3.addEventListener("mouseenter", () => {
              setActive(section.title);
            });
            var _ref$ = wrapperRef;
            typeof _ref$ === "function" ? use(_ref$, _el$3) : wrapperRef = _el$3;
            _el$4.$$click = () => {
              if (pinned()) {
                pinSection(null);
              } else {
                pinSection(section.title);
              }
              props.onSectionClick?.(section);
            };
            insert(_el$7, () => getShortLabel(section));
            insert(_el$4, createComponent(Show, {
              get when() {
                return showInsightsPulse();
              },
              get children() {
                return _tmpl$2$o();
              }
            }), null);
            insert(_el$4, createComponent(Show, {
              get when() {
                return memo(() => !!hasActive())() && !active();
              },
              get children() {
                return _tmpl$3$l();
              }
            }), null);
            insert(_el$3, createComponent(Show, {
              get when() {
                return active();
              },
              get children() {
                var _el$0 = _tmpl$5$h(), _el$1 = _el$0.firstChild, _el$10 = _el$1.firstChild, _el$11 = _el$10.firstChild, _el$13 = _el$10.nextSibling;
                insert(_el$11, () => section.title);
                insert(_el$10, createComponent(Show, {
                  get when() {
                    return isSectionPinned(section.title);
                  },
                  get children() {
                    var _el$12 = _tmpl$4$j();
                    _el$12.$$click = () => unpinSection();
                    return _el$12;
                  }
                }), null);
                insert(_el$13, createComponent(For, {
                  get each() {
                    return section.items;
                  },
                  children: (item) => {
                    const isActive = () => currentView() === item.id;
                    const showPulse = () => section.title === "Insights" && unreadInsightsEvents() > 0 && item.id === "incidents";
                    return (() => {
                      var _el$14 = _tmpl$9$8(), _el$15 = _el$14.firstChild, _el$16 = _el$15.firstChild, _el$17 = _el$15.nextSibling;
                      _el$14.$$click = () => handleItemClick(item.id);
                      insert(_el$17, () => item.label);
                      insert(_el$14, createComponent(Show, {
                        get when() {
                          return showPulse();
                        },
                        get children() {
                          return _tmpl$7$c();
                        }
                      }), null);
                      insert(_el$14, createComponent(Show, {
                        get when() {
                          return isActive();
                        },
                        get children() {
                          return _tmpl$8$a();
                        }
                      }), null);
                      createRenderEffect((_p$) => {
                        var _v$6 = `
                                  w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg
                                  transition-all duration-150
                                  focus:outline-none focus:ring-2 focus:ring-brand-cyan/40
                                  ${isActive() ? "bg-gradient-to-r from-brand-cyan/20 to-brand-purple/10 text-brand-cyan border border-brand-cyan/30" : "text-text-primary hover:bg-white/5 hover:text-text-primary"}
                                `, _v$7 = isActive() ? 1 : 0.95, _v$8 = `w-4 h-4 flex-shrink-0 ${isActive() ? "text-brand-cyan" : ""}`, _v$9 = item.icon;
                        _v$6 !== _p$.e && className(_el$14, _p$.e = _v$6);
                        _v$7 !== _p$.t && setStyleProperty(_el$14, "opacity", _p$.t = _v$7);
                        _v$8 !== _p$.a && setAttribute(_el$15, "class", _p$.a = _v$8);
                        _v$9 !== _p$.o && setAttribute(_el$16, "d", _p$.o = _v$9);
                        return _p$;
                      }, {
                        e: void 0,
                        t: void 0,
                        a: void 0,
                        o: void 0
                      });
                      return _el$14;
                    })();
                  }
                }));
                return _el$0;
              }
            }), null);
            createRenderEffect((_p$) => {
              var _v$ = section.title, _v$2 = `
                    w-full flex flex-col items-center justify-center
                    transition-all duration-150
                    focus:outline-none focus:ring-2 focus:ring-brand-cyan/40
                    ${active() || hasActive() ? "text-brand-cyan shadow-glowCyan" : "text-text-primary hover:text-text-primary hover:bg-bg-hover"}
                    ${pinned() ? "bg-bg-panelAlt" : ""}
                  `, _v$3 = active() || hasActive() ? 1 : 0.95, _v$4 = section.title, _v$5 = getSectionIcon(section);
              _v$ !== _p$.e && setAttribute(_el$4, "data-section-rail", _p$.e = _v$);
              _v$2 !== _p$.t && className(_el$4, _p$.t = _v$2);
              _v$3 !== _p$.a && setStyleProperty(_el$4, "opacity", _p$.a = _v$3);
              _v$4 !== _p$.o && setAttribute(_el$4, "title", _p$.o = _v$4);
              _v$5 !== _p$.i && setAttribute(_el$6, "d", _p$.i = _v$5);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0,
              i: void 0
            });
            return _el$3;
          })()
        );
      }
    }));
    return _el$;
  })();
};
delegateEvents(["click"]);

var _tmpl$$s = /* @__PURE__ */ template(`<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">`), _tmpl$2$n = /* @__PURE__ */ template(`<div class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-bg-panel border border-border-subtle rounded-lg shadow-elevated z-50 animate-fadeIn"><div class="px-4 py-3 border-b border-border-subtle"><div class=relative><svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg><input type=text placeholder="Search sections and items... (Cmd+K)"class="w-full pl-10 pr-4 py-2 bg-bg-panelAlt border border-border-subtle rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-cyan/40"autofocus></div></div><div class="max-h-96 overflow-y-auto py-2"></div><div class="px-4 py-2 border-t border-border-subtle flex items-center justify-between text-xs text-text-muted"><div class="flex items-center gap-4"><span class="flex items-center gap-1"><kbd class="px-1.5 py-0.5 bg-bg-panelAlt border border-border-subtle rounded">↑</kbd><kbd class="px-1.5 py-0.5 bg-bg-panelAlt border border-border-subtle rounded">↓</kbd>Navigate</span><span class="flex items-center gap-1"><kbd class="px-1.5 py-0.5 bg-bg-panelAlt border border-border-subtle rounded">Enter</kbd>Select</span></div><span class="flex items-center gap-1"><kbd class="px-1.5 py-0.5 bg-bg-panelAlt border border-border-subtle rounded">Esc</kbd>Close`), _tmpl$3$k = /* @__PURE__ */ template(`<div class="px-4 py-8 text-center text-text-muted text-sm">`), _tmpl$4$i = /* @__PURE__ */ template(`<button><svg class="w-4 h-4 flex-shrink-0"fill=none stroke=currentColor viewBox="0 0 24 24"stroke-width=2><path stroke-linecap=round stroke-linejoin=round></path></svg><div class="flex-1 text-left"><div class="text-sm font-medium"></div><div class="text-xs text-text-muted">`);
const QuickSwitcher = (props) => {
  const [query, setQuery] = createSignal("");
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const allItems = createMemo(() => {
    const items = [];
    props.sections.forEach((section) => {
      section.items.forEach((item) => {
        items.push({
          item,
          section
        });
      });
    });
    return items;
  });
  const filteredItems = createMemo(() => {
    const q = query().toLowerCase().trim();
    if (!q) return [];
    return allItems().filter(({
      item,
      section
    }) => {
      return item.label.toLowerCase().includes(q) || section.title.toLowerCase().includes(q) || item.id.toLowerCase().includes(q);
    });
  });
  createMemo(() => {
    query();
    setSelectedIndex(0);
  });
  const handleKeyDown = (e) => {
    if (!props.isOpen) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredItems().length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        const selected = filteredItems()[selectedIndex()];
        if (selected) {
          handleSelect(selected.item, selected.section);
        }
        break;
      case "Escape":
        e.preventDefault();
        props.onClose();
        break;
    }
  };
  const handleSelect = (item, section) => {
    setCurrentView(item.id);
    pinSection(section.title);
    props.onClose();
    setQuery("");
  };
  onMount(() => {
    document.addEventListener("keydown", handleKeyDown);
  });
  onCleanup(() => {
    document.removeEventListener("keydown", handleKeyDown);
  });
  onMount(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!props.isOpen) ; else {
          props.onClose();
        }
      }
    };
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  });
  return createComponent(Show, {
    get when() {
      return props.isOpen;
    },
    get children() {
      return [(() => {
        var _el$ = _tmpl$$s();
        addEventListener(_el$, "click", props.onClose, true);
        return _el$;
      })(), (() => {
        var _el$2 = _tmpl$2$n(), _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling, _el$7 = _el$3.nextSibling;
        _el$2.$$click = (e) => e.stopPropagation();
        _el$6.$$input = (e) => setQuery(e.currentTarget.value);
        insert(_el$7, createComponent(Show, {
          get when() {
            return filteredItems().length > 0;
          },
          get fallback() {
            return (() => {
              var _el$8 = _tmpl$3$k();
              insert(_el$8, () => query() ? "No results found" : "Start typing to search...");
              return _el$8;
            })();
          },
          get children() {
            return createComponent(For, {
              get each() {
                return filteredItems();
              },
              children: ({
                item,
                section
              }, index) => (() => {
                var _el$9 = _tmpl$4$i(), _el$0 = _el$9.firstChild, _el$1 = _el$0.firstChild, _el$10 = _el$0.nextSibling, _el$11 = _el$10.firstChild, _el$12 = _el$11.nextSibling;
                _el$9.$$click = () => handleSelect(item, section);
                insert(_el$11, () => item.label);
                insert(_el$12, () => section.title);
                createRenderEffect((_p$) => {
                  var _v$ = `
                    w-full flex items-center gap-3 px-4 py-2.5
                    transition-colors
                    focus:outline-none
                    ${index() === selectedIndex() ? "bg-bg-panelAlt text-brand-cyan" : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"}
                  `, _v$2 = item.icon;
                  _v$ !== _p$.e && className(_el$9, _p$.e = _v$);
                  _v$2 !== _p$.t && setAttribute(_el$1, "d", _p$.t = _v$2);
                  return _p$;
                }, {
                  e: void 0,
                  t: void 0
                });
                return _el$9;
              })()
            });
          }
        }));
        createRenderEffect(() => _el$6.value = query());
        return _el$2;
      })()];
    }
  });
};
delegateEvents(["click", "input"]);

const themes = {
  dark: {
    name: "dark",
    label: "Dark (Legacy)",
    icon: "moon",
    colors: {
      bgPrimary: "#0f172a",
      bgSecondary: "#1e293b",
      bgTertiary: "#334155",
      bgCard: "rgba(30, 41, 59, 0.8)",
      bgNavbar: "rgba(15, 23, 42, 0.95)",
      bgInput: "rgba(30, 41, 59, 0.8)",
      textPrimary: "#ffffff",
      textSecondary: "#94a3b8",
      textMuted: "#64748b",
      borderColor: "rgba(100, 116, 139, 0.3)",
      borderLight: "rgba(100, 116, 139, 0.5)",
      accentPrimary: "#06b6d4",
      accentSecondary: "#3b82f6",
      accentGradient: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
      successColor: "#22c55e",
      warningColor: "#f59e0b",
      errorColor: "#ef4444"
    }
  },
  light: {
    name: "light",
    // Polar Light — primary light theme
    label: "Polar Light",
    icon: "sun",
    colors: {
      // Backgrounds: soft neutral with better contrast
      bgPrimary: "#F3F4F6",
      // primary background - slightly darker for contrast
      bgSecondary: "#E5E7EB",
      // secondary surfaces / table headers
      bgTertiary: "#F9FAFB",
      // very light gray - for card content areas
      // Panels / cards: white panels with visible borders for clear separation
      bgCard: "#FFFFFF",
      bgNavbar: "#FFFFFF",
      bgInput: "#FFFFFF",
      // Text: DARK colors for maximum visibility on white/light backgrounds
      textPrimary: "#111827",
      // Very dark - almost black for main headings
      textSecondary: "#374151",
      // Dark gray for secondary text
      textMuted: "#6B7280",
      // Medium gray for muted text (still readable)
      // Borders: more visible borders for better card definition
      borderColor: "rgba(15, 23, 42, 0.15)",
      borderLight: "rgba(15, 23, 42, 0.22)",
      // Accent: Cyan (brand color)
      accentPrimary: "#06b6d4",
      accentSecondary: "#22d3ee",
      accentGradient: "linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)",
      // Status colors tuned for light background
      successColor: "#16A34A",
      warningColor: "#D97706",
      errorColor: "#DC2626"
    }
  },
  midnight: {
    name: "midnight",
    label: "Midnight",
    icon: "stars",
    colors: {
      bgPrimary: "#030712",
      bgSecondary: "#111827",
      bgTertiary: "#1f2937",
      bgCard: "rgba(17, 24, 39, 0.9)",
      bgNavbar: "rgba(3, 7, 18, 0.98)",
      bgInput: "rgba(17, 24, 39, 0.9)",
      textPrimary: "#f9fafb",
      textSecondary: "#9ca3af",
      textMuted: "#6b7280",
      borderColor: "rgba(75, 85, 99, 0.4)",
      borderLight: "rgba(75, 85, 99, 0.6)",
      accentPrimary: "#06b6d4",
      accentSecondary: "#22d3ee",
      accentGradient: "linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)",
      successColor: "#10b981",
      warningColor: "#f59e0b",
      errorColor: "#f43f5e"
    }
  },
  nord: {
    name: "nord",
    // Solar Dusk — warm, low-fatigue dark
    label: "Solar Dusk",
    icon: "sunset",
    colors: {
      // Dark brown / slate mix
      bgPrimary: "#111827",
      bgSecondary: "#1F2933",
      bgTertiary: "#292524",
      bgCard: "rgba(17, 24, 39, 0.96)",
      bgNavbar: "rgba(15, 23, 42, 0.98)",
      bgInput: "rgba(31, 41, 51, 0.96)",
      textPrimary: "#F9FAFB",
      textSecondary: "#E5E7EB",
      textMuted: "#9CA3AF",
      // Softer, warmer borders
      borderColor: "rgba(120, 53, 15, 0.4)",
      borderLight: "rgba(180, 83, 9, 0.6)",
      // Warm amber accents
      accentPrimary: "#F59E0B",
      accentSecondary: "#F97316",
      accentGradient: "linear-gradient(135deg, #F97316 0%, #F59E0B 100%)",
      successColor: "#22C55E",
      warningColor: "#F59E0B",
      errorColor: "#F97373"
    }
  },
  ocean: {
    name: "ocean",
    // Aurora Blue — modern SaaS / demo theme
    label: "Aurora Blue",
    icon: "wave",
    colors: {
      // Deep blue base with subtle gradient-ready surfaces
      bgPrimary: "#020617",
      bgSecondary: "#02081F",
      bgTertiary: "#0B1120",
      bgCard: "rgba(15, 23, 42, 0.96)",
      bgNavbar: "rgba(2, 6, 23, 0.98)",
      bgInput: "rgba(15, 23, 42, 0.96)",
      textPrimary: "#E5F2FF",
      textSecondary: "#9CA3AF",
      textMuted: "#6B7280",
      borderColor: "rgba(37, 99, 235, 0.4)",
      borderLight: "rgba(59, 130, 246, 0.6)",
      // Aurora Teal/Emerald - inspired by Northern Lights
      accentPrimary: "#14B8A6",
      accentSecondary: "#10B981",
      accentGradient: "linear-gradient(135deg, #14B8A6 0%, #10B981 50%, #3B82F6 100%)",
      successColor: "#22C55E",
      warningColor: "#FACC15",
      errorColor: "#FB7185"
    }
  },
  terminal: {
    name: "terminal",
    label: "Terminal",
    icon: "terminal",
    colors: {
      bgPrimary: "#000000",
      bgSecondary: "#1a1a1a",
      bgTertiary: "#2d2d2d",
      bgCard: "rgba(26, 26, 26, 0.95)",
      bgNavbar: "rgba(0, 0, 0, 0.98)",
      bgInput: "rgba(26, 26, 26, 0.9)",
      textPrimary: "#ffffff",
      textSecondary: "#e5e5e5",
      textMuted: "#999999",
      borderColor: "rgba(255, 255, 255, 0.1)",
      borderLight: "rgba(255, 255, 255, 0.15)",
      accentPrimary: "#007aff",
      accentSecondary: "#5ac8fa",
      accentGradient: "linear-gradient(135deg, #007aff 0%, #5ac8fa 100%)",
      successColor: "#34c759",
      warningColor: "#ff9500",
      errorColor: "#ff3b30"
    }
  },
  "terminal-pro": {
    name: "terminal-pro",
    label: "Terminal Pro",
    icon: "terminal",
    colors: {
      // Slightly refined terminal aesthetic: deep charcoal with subtle blue-green accents
      bgPrimary: "#020617",
      bgSecondary: "#050816",
      bgTertiary: "#0B1220",
      bgCard: "rgba(3, 7, 18, 0.96)",
      bgNavbar: "rgba(3, 7, 18, 0.98)",
      bgInput: "rgba(15, 23, 42, 0.96)",
      textPrimary: "#E5E7EB",
      textSecondary: "#9CA3AF",
      textMuted: "#6B7280",
      borderColor: "rgba(31, 41, 55, 0.7)",
      borderLight: "rgba(55, 65, 81, 0.9)",
      // Matrix Green - Classic terminal aesthetic (muted)
      accentPrimary: "#00D636",
      accentSecondary: "#32CD32",
      accentGradient: "linear-gradient(135deg, #00D636 0%, #32CD32 50%, #3CB371 100%)",
      successColor: "#22C55E",
      warningColor: "#FACC15",
      errorColor: "#FB7185"
    }
  },
  "github-dark": {
    name: "github-dark",
    label: "GitHub Dark",
    icon: "github",
    colors: {
      bgPrimary: "#0d1117",
      bgSecondary: "#161b22",
      bgTertiary: "#21262d",
      bgCard: "rgba(13, 17, 23, 0.9)",
      bgNavbar: "rgba(13, 17, 23, 0.98)",
      bgInput: "rgba(13, 17, 23, 0.9)",
      textPrimary: "#c9d1d9",
      textSecondary: "#8b949e",
      textMuted: "#6e7681",
      borderColor: "rgba(48, 54, 61, 0.4)",
      borderLight: "rgba(48, 54, 61, 0.6)",
      accentPrimary: "#58a6ff",
      accentSecondary: "#79c0ff",
      accentGradient: "linear-gradient(135deg, #58a6ff 0%, #79c0ff 100%)",
      successColor: "#3fb950",
      warningColor: "#d29922",
      errorColor: "#f85149"
    }
  }
};
function getInitialTheme() {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("kubegraf-theme");
    if (saved && themes[saved]) {
      return saved;
    }
  }
  return "dark";
}
const [currentTheme, setCurrentThemeInternal] = createSignal(getInitialTheme());
function applyTheme(themeName) {
  const theme = themes[themeName];
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssVar = key.replace(/([A-Z])/g, "-$1").toLowerCase();
    root.style.setProperty(`--${cssVar}`, value);
  });
  document.body.setAttribute("data-theme", themeName);
  localStorage.setItem("kubegraf-theme", themeName);
}
function setTheme(themeName) {
  setCurrentThemeInternal(themeName);
  applyTheme(themeName);
}
const visibleThemes = [
  // Primary / default
  "midnight",
  // Midnight (default dark)
  "light",
  // Polar Light
  // Power users
  "terminal",
  // Terminal (classic)
  "terminal-pro",
  // Terminal Pro (refined)
  // Optional / experimental
  "ocean",
  // Aurora Blue
  "nord"
  // Solar Dusk
];
if (typeof window !== "undefined") {
  applyTheme(currentTheme());
}
const getTheme = () => themes[currentTheme()];

var _tmpl$$r = /* @__PURE__ */ template(`<img alt=KubēGraf style="filter:drop-shadow(0 0 8px rgba(6, 182, 212, 0.3))">`);
const LogoIcon = (props) => {
  const getSrc = () => {
    const themeName = currentTheme();
    if (themeName === "light") {
      return "/assets/logos/binary-matrix/favicon.svg";
    }
    return "/assets/logos/binary-matrix/logo-binary-matrix-cyan.svg";
  };
  return (() => {
    var _el$ = _tmpl$$r();
    createRenderEffect((_p$) => {
      var _v$ = getSrc(), _v$2 = props.class ?? "w-14 h-auto object-contain", _v$3 = {
        ...props.style || {}
      };
      _v$ !== _p$.e && setAttribute(_el$, "src", _p$.e = _v$);
      _v$2 !== _p$.t && className(_el$, _p$.t = _v$2);
      _p$.a = style(_el$, _v$3, _p$.a);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0
    });
    return _el$;
  })();
};

var _tmpl$$q = /* @__PURE__ */ template(`<button type=button class="group flex flex-col items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/60 rounded-md"title="KubēGraf Dashboard"style=width:100%;margin-top:-8px><span class="mt-0.5 text-[12px] tracking-wide font-bold"style=text-transform:none;color:var(--text-primary);opacity:0.95>KubēGraf`);
const SidebarLogo = () => {
  const handleClick = () => {
    setCurrentView("dashboard");
  };
  return (() => {
    var _el$ = _tmpl$$q(), _el$2 = _el$.firstChild;
    _el$.$$click = handleClick;
    insert(_el$, createComponent(LogoIcon, {
      "class": "w-16 h-auto object-contain",
      style: {
        "max-width": "none"
      }
    }), _el$2);
    return _el$;
  })();
};
delegateEvents(["click"]);

var _tmpl$$p = /* @__PURE__ */ template(`<div class="border-t border-border-subtle/50 py-0.5"style=width:64px;maxWidth:64px;minWidth:64px;boxSizing:border-box;display:flex;flexDirection:column;gap:8px;overflow:visible><div style=width:64px;maxWidth:64px;minWidth:64px;boxSizing:border-box;display:flex;justifyContent:center;alignItems:center;flexShrink:0;visibility:visible;opacity:1><button title=Settings style="width:64px;maxWidth:64px;minWidth:64px;boxSizing:border-box;display:flex;flexDirection:column;alignItems:center;justifyContent:center;flexShrink:0;flexBasis:auto;padding:6px 0;margin:0;border:none;background:transparent;cursor:pointer;minHeight:32px;color:var(--text-primary, #e5e7eb)"><svg class="w-4 h-4 flex-shrink-0"fill=none stroke=currentColor viewBox="0 0 24 24"style="margin:0 auto;display:block;visibility:visible"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z">`), _tmpl$2$m = /* @__PURE__ */ template(`<aside class="sidebar-v2-container fixed left-0 top-0 h-full z-[110] flex flex-col"><div class="flex flex-1 overflow-visible"><div class="flex flex-col w-16 flex-shrink-0"style=overflow:visible><div class="w-16 border-b border-border-subtle flex-shrink-0 flex items-start justify-center py-0"></div><div class="flex-1 overflow-visible w-16"style=overflow:visible></div><div class="border-t border-border-subtle flex-shrink-0"style=width:64px;minWidth:64px;maxWidth:64px;boxSizing:border-box;overflow:visible;background:var(--bg-surface)><button class="w-full flex items-center justify-center gap-0.5 py-0.5 px-0.5 transition-all duration-150 text-text-primary hover:text-text-primary hover:bg-bg-hover"style=width:64px;maxWidth:64px;boxSizing:border-box;opacity:0.95><svg fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M5 15l7-7 7 7"></path></svg><span class=truncate style=fontSize:6px;fontWeight:700;maxWidth:64px;overflow:hidden;textOverflow:ellipsis;whiteSpace:nowrap;display:block;transform:scale(0.75);transformOrigin:center;color:var(--text-primary);opacity:0.95;textShadow:none></span></button><div class="border-t border-border-subtle py-0.5 px-0.5"style=width:64px;maxWidth:64px;boxSizing:border-box><div class="flex flex-col items-center gap-0.5"style=width:64px;maxWidth:64px;boxSizing:border-box><div class="flex items-center justify-center"style=width:64px;maxWidth:64px;boxSizing:border-box><span class="font-semibold truncate"style=color:var(--text-primary);textShadow:none;fontWeight:600;fontSize:6px;lineHeight:1.1;width:64px;maxWidth:64px;boxSizing:border-box;display:block;overflow:hidden;textOverflow:ellipsis;whiteSpace:nowrap;textAlign:center;transform:scale(0.75);transformOrigin:center>`);
const SidebarV2 = () => {
  const [version, setVersion] = createSignal("");
  const [bottomSectionCollapsed, setBottomSectionCollapsed] = createSignal(true);
  const [quickSwitcherOpen, setQuickSwitcherOpen] = createSignal(false);
  const [updateInfo, setUpdateInfoState] = createSignal(null);
  const [updateModalOpen, setUpdateModalOpen] = createSignal(false);
  createEffect(() => {
    if (sidebarAutoHide()) {
      setSidebarCollapsed(true);
    }
  });
  const fetchVersion = async () => {
    try {
      const status = await api.getStatus();
      if (status?.version) {
        const newVersion = status.version;
        const oldVersion = version();
        setVersion(newVersion);
        if (oldVersion && oldVersion !== newVersion && oldVersion !== "") {
          addNotification(`🎉 KubēGraf updated to v${newVersion}!`, "success");
        }
      } else {
        try {
          const updateInfo2 = await api.checkForUpdates();
          if (updateInfo2?.currentVersion) {
            const newVersion = updateInfo2.currentVersion;
            const oldVersion = version();
            setVersion(newVersion);
            if (oldVersion && oldVersion !== newVersion && oldVersion !== "") {
              addNotification(`🎉 KubēGraf updated to v${newVersion}!`, "success");
            }
          }
        } catch (e) {
          console.error("Failed to get version from update check:", e);
        }
      }
    } catch (err) {
      console.error("Failed to fetch version:", err);
    }
  };
  const checkForUpdates = async (showNotification = false) => {
    try {
      const info = await api.autoCheckUpdate();
      setUpdateInfoState(info);
      setUpdateInfo(info);
      if (info.updateAvailable) {
        const lastReminderKey = "kubegraf-update-reminder-date";
        const lastReminderTimeKey = "kubegraf-update-reminder-time";
        const lastReminder = localStorage.getItem(lastReminderKey);
        const lastReminderTime = localStorage.getItem(lastReminderTimeKey);
        const today = (/* @__PURE__ */ new Date()).toDateString();
        const now = Date.now();
        const thirtyMinutes = 30 * 60 * 1e3;
        const recentlyReminded = lastReminderTime && now - parseInt(lastReminderTime) < thirtyMinutes;
        if (lastReminder !== today && !recentlyReminded) {
          if (showNotification) {
            showUpdateNotification(info.latestVersion, () => {
              setUpdateInfoState(info);
              setUpdateModalOpen(true);
            });
          }
          localStorage.setItem(lastReminderKey, today);
        }
      }
    } catch (err) {
      console.error("Failed to check for updates:", err);
    }
  };
  onMount(() => {
    fetchVersion();
    checkForUpdates(true);
    const versionInterval = setInterval(fetchVersion, 1e4);
    const updateInterval = setInterval(() => checkForUpdates(false), 15 * 60 * 1e3);
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(fetchVersion, 1e3);
        setTimeout(() => checkForUpdates(true), 2e3);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const handleFocus = () => {
      setTimeout(fetchVersion, 500);
      setTimeout(() => checkForUpdates(true), 1e3);
    };
    window.addEventListener("focus", handleFocus);
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setQuickSwitcherOpen(true);
      }
    };
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      clearInterval(versionInterval);
      clearInterval(updateInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  });
  const availableSections = createMemo(() => {
    const showML = shouldShowMLSection();
    return navSections.filter((section) => !(section.conditional && !showML));
  });
  createEffect(() => {
    const titles = availableSections().map((s) => s.title);
    const defaults = ["Overview", "Insights", "Workloads"].filter((t) => titles.includes(t));
    ensureSidebarSections(titles, defaults);
  });
  const handleClickOutside = (e) => {
    const target = e.target;
    if (!target.closest(".sidebar-v2-container")) {
      closeWithDelay(0);
    }
  };
  onMount(() => {
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  });
  return [(() => {
    var _el$ = _tmpl$2$m(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.nextSibling, _el$6 = _el$5.nextSibling, _el$7 = _el$6.firstChild, _el$8 = _el$7.firstChild, _el$9 = _el$8.nextSibling, _el$12 = _el$7.nextSibling, _el$13 = _el$12.firstChild, _el$14 = _el$13.firstChild, _el$15 = _el$14.firstChild;
    _el$.addEventListener("mouseleave", () => {
      if (sidebarAutoHide()) {
        setSidebarCollapsed(true);
        closeWithDelay(0);
      }
    });
    _el$.addEventListener("mouseenter", () => {
      if (sidebarAutoHide()) {
        setSidebarCollapsed(false);
      }
    });
    insert(_el$4, createComponent(SidebarLogo, {}));
    insert(_el$5, createComponent(SidebarRail, {
      get sections() {
        return availableSections();
      },
      onSectionClick: (section) => {
        if (section.items.length > 0) ;
      }
    }));
    _el$7.$$click = () => setBottomSectionCollapsed(!bottomSectionCollapsed());
    insert(_el$9, () => bottomSectionCollapsed() ? "More" : "Less");
    insert(_el$6, createComponent(Show, {
      get when() {
        return !bottomSectionCollapsed();
      },
      get children() {
        var _el$0 = _tmpl$$p(), _el$1 = _el$0.firstChild, _el$10 = _el$1.firstChild; _el$10.firstChild;
        _el$10.$$click = () => setCurrentView("settings");
        createRenderEffect(() => className(_el$10, `
                        transition-all duration-150
                        focus:outline-none focus:ring-1 focus:ring-brand-cyan/40
                        ${currentView() === "settings" ? "text-brand-cyan shadow-glowCyan" : "text-text-primary hover:text-text-primary hover:bg-bg-hover"}
                      `));
        return _el$0;
      }
    }), _el$12);
    insert(_el$15, (() => {
      var _c$ = memo(() => !!version());
      return () => _c$() ? `v${version()}` : "...";
    })());
    createRenderEffect((_p$) => {
      var _v$ = bottomSectionCollapsed() ? "Expand options" : "Collapse options", _v$2 = `w-2.5 h-2.5 flex-shrink-0 transition-transform duration-200 ${bottomSectionCollapsed() ? "" : "rotate-180"}`, _v$3 = version() ? `KubēGraf v${version()}` : "Version not available";
      _v$ !== _p$.e && setAttribute(_el$7, "title", _p$.e = _v$);
      _v$2 !== _p$.t && setAttribute(_el$8, "class", _p$.t = _v$2);
      _v$3 !== _p$.a && setAttribute(_el$12, "title", _p$.a = _v$3);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0
    });
    return _el$;
  })(), createComponent(QuickSwitcher, {
    get sections() {
      return availableSections();
    },
    get isOpen() {
      return quickSwitcherOpen();
    },
    onClose: () => setQuickSwitcherOpen(false)
  }), createComponent(Show, {
    get when() {
      return memo(() => !!updateModalOpen())() && updateInfo();
    },
    get children() {
      return createComponent(UpdateModal, {
        get isOpen() {
          return updateModalOpen();
        },
        onClose: () => setUpdateModalOpen(false),
        get updateInfo() {
          return updateInfo();
        }
      });
    }
  })];
};
delegateEvents(["click"]);

const [isOpen, setIsOpen] = createSignal(false);
const [buttonRef, setButtonRef] = createSignal(null);
function openCommandPalette() {
  setIsOpen(true);
}
function closeCommandPalette() {
  setIsOpen(false);
}
function setCommandPaletteButtonRef(ref) {
  setButtonRef(ref);
}

class WebSocketService {
  ws = null;
  reconnectAttempts = 0;
  maxReconnectAttempts = 10;
  reconnectDelay = 1e3;
  handlers = /* @__PURE__ */ new Set();
  pingInterval = null;
  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => {
        console.log("WebSocket connected");
        this.reconnectAttempts = 0;
        this.startPing();
        this.notifyHandlers({ type: "connection", data: { connected: true } });
      };
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.notifyHandlers(message);
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };
      this.ws.onclose = () => {
        console.log("WebSocket disconnected");
        this.stopPing();
        this.notifyHandlers({ type: "connection", data: { connected: false } });
        this.attemptReconnect();
      };
      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (e) {
      console.error("Failed to create WebSocket:", e);
      this.attemptReconnect();
    }
  }
  disconnect() {
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("Max reconnect attempts reached");
      return;
    }
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }
  startPing() {
    this.pingInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 3e4);
  }
  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
  subscribe(handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
  notifyHandlers(message) {
    this.handlers.forEach((handler) => {
      try {
        handler(message);
      } catch (e) {
        console.error("Handler error:", e);
      }
    });
  }
  send(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}
const wsService = new WebSocketService();
const [wsConnected, setWsConnected] = createSignal(false);
wsService.subscribe((msg) => {
  if (msg.type === "connection") {
    setWsConnected(msg.data.connected);
  }
});

const [clusters, setClusters] = createSignal([]);
const [discoveredClusters, setDiscoveredClusters] = createSignal([]);
const [runtimeContexts, setRuntimeContexts] = createSignal([]);
const [clusterManagerStatus, setClusterManagerStatus] = createSignal(null);
const [clusterLoading, setClusterLoading] = createSignal(false);
async function refreshClusterData() {
  setClusterLoading(true);
  try {
    const data = await api.getClusters();
    setClusters(data.clusters || []);
    setDiscoveredClusters(data.discovered || []);
    setClusterManagerStatus(data.status || null);
    setRuntimeContexts(data.contexts || []);
  } catch (err) {
    console.error("Failed to load clusters", err);
  } finally {
    setClusterLoading(false);
  }
}
async function refreshClusterStatus() {
  try {
    const status = await api.getClusterManagerStatus();
    setClusterManagerStatus(status);
  } catch (err) {
    console.error("Failed to fetch cluster status", err);
  }
}
async function connectToCluster(payload) {
  console.log("[ClusterManager] connectToCluster called with:", payload);
  setClusterLoading(true);
  try {
    console.log("[ClusterManager] Calling API connectCluster...");
    const result = await api.connectCluster(payload);
    console.log("[ClusterManager] API result:", result);
    const targetName = result.cluster?.name || payload.name || "cluster";
    addNotification(`Connected to ${targetName}`, "success");
    setClusterManagerStatus(result.status || null);
    await refreshClusterData();
    console.log("[ClusterManager] Redirecting to dashboard...");
    setTimeout(() => {
      setCurrentView("dashboard");
    }, 500);
  } catch (err) {
    console.error("[ClusterManager] Connect error:", err);
    addNotification(err?.message || "Failed to connect to cluster", "error");
    throw err;
  } finally {
    setClusterLoading(false);
  }
}
async function disconnectActiveCluster() {
  setClusterLoading(true);
  try {
    const result = await api.disconnectCluster();
    setClusterManagerStatus(result.status || null);
    addNotification("Cluster disconnected", "info");
    await refreshClusterData();
  } catch (err) {
    addNotification(err?.message || "Failed to disconnect cluster", "error");
    throw err;
  } finally {
    setClusterLoading(false);
  }
}
async function setDefaultCluster(entry) {
  if (!entry) return;
  await connectToCluster({
    name: entry.name,
    provider: entry.provider,
    kubeconfigPath: entry.kubeconfigPath,
    makeDefault: true
  });
  addNotification(`${entry.name} set as default cluster`, "success");
}
function goToClusterManager() {
  setCurrentView("clustermanager");
}
wsService.subscribe((msg) => {
  if (msg.type === "cluster_status") {
    setClusterManagerStatus(msg.data);
  }
});

const [brainPanelOpen, setBrainPanelOpen] = createSignal(false);
const [brainPanelPinned, setBrainPanelPinned] = createSignal(false);
function toggleBrainPanel() {
  setBrainPanelOpen((prev) => !prev);
}
function toggleBrainPanelPin() {
  setBrainPanelPinned((prev) => !prev);
}

var _tmpl$$o = /* @__PURE__ */ template(`<svg viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round class="w-5 h-5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z">`), _tmpl$2$l = /* @__PURE__ */ template(`<svg viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round class="w-5 h-5"><circle cx=12 cy=12 r=5></circle><line x1=12 y1=1 x2=12 y2=3></line><line x1=12 y1=21 x2=12 y2=23></line><line x1=4.22 y1=4.22 x2=5.64 y2=5.64></line><line x1=18.36 y1=18.36 x2=19.78 y2=19.78></line><line x1=1 y1=12 x2=3 y2=12></line><line x1=21 y1=12 x2=23 y2=12></line><line x1=4.22 y1=19.78 x2=5.64 y2=18.36></line><line x1=18.36 y1=5.64 x2=19.78 y2=4.22>`), _tmpl$3$j = /* @__PURE__ */ template(`<svg viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round class="w-5 h-5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2">`), _tmpl$4$h = /* @__PURE__ */ template(`<svg viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round class="w-5 h-5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2">`), _tmpl$5$g = /* @__PURE__ */ template(`<svg viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round class="w-5 h-5"><path d="M2 12c2-2 4-4 6-4s4 2 6 4 4 4 6 4 4-2 6-4"></path><path d="M2 6c2-2 4-4 6-4s4 2 6 4 4 4 6 4 4-2 6-4"></path><path d="M2 18c2-2 4-4 6-4s4 2 6 4 4 4 6 4 4-2 6-4">`), _tmpl$6$d = /* @__PURE__ */ template(`<svg viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round class="w-5 h-5"><polyline points="4 17 10 11 4 5"></polyline><line x1=12 y1=19 x2=20 y2=19>`), _tmpl$7$b = /* @__PURE__ */ template(`<svg viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round class="w-5 h-5"><path d="M12 2l3 7h7l-5.5 4.5 2 6.5L12 17l-5.5 3.5 2-6.5L2 9h7l3-7z"></path><circle cx=12 cy=8 r=1 fill=currentColor>`), _tmpl$8$9 = /* @__PURE__ */ template(`<svg viewBox="0 0 24 24"fill=currentColor class="w-5 h-5"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z">`), _tmpl$9$7 = /* @__PURE__ */ template(`<svg viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round class="w-5 h-5"><polyline points="4 17 10 11 4 5"></polyline><line x1=12 y1=19 x2=20 y2=19></line><rect x=3 y=4 width=18 height=16 rx=2 ry=2>`), _tmpl$0$6 = /* @__PURE__ */ template(`<div class="fixed inset-0"style=z-index:99998>`), _tmpl$1$5 = /* @__PURE__ */ template(`<div class="fixed w-48 rounded-lg border border-[var(--border-color)] shadow-xl"style=background:var(--bg-secondary);z-index:99999>`), _tmpl$10$4 = /* @__PURE__ */ template(`<div class=relative><button class="icon-btn border border-[var(--border-color)] hover:border-[var(--accent-primary)]"style=color:var(--text-primary)>`), _tmpl$11$3 = /* @__PURE__ */ template(`<button><span class=font-medium>`), _tmpl$12$3 = /* @__PURE__ */ template(`<svg class="w-4 h-4 ml-auto"fill=currentColor viewBox="0 0 20 20"><path fill-rule=evenodd d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"clip-rule=evenodd>`);
const ThemeToggle = () => {
  const [showDropdown, setShowDropdown] = createSignal(false);
  const [dropdownPos, setDropdownPos] = createSignal({
    top: 0,
    right: 0
  });
  let buttonRef;
  const themeIcons = {
    dark: _tmpl$$o(),
    light: _tmpl$2$l(),
    midnight: _tmpl$3$j(),
    cyberpunk: _tmpl$4$h(),
    ocean: _tmpl$5$g(),
    terminal: _tmpl$6$d(),
    nord: _tmpl$7$b(),
    "github-dark": _tmpl$8$9(),
    "terminal-pro": _tmpl$9$7()
  };
  const handleToggle = () => {
    if (!showDropdown() && buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
    setShowDropdown(!showDropdown());
  };
  return (() => {
    var _el$0 = _tmpl$10$4(), _el$1 = _el$0.firstChild;
    _el$1.$$click = handleToggle;
    var _ref$ = buttonRef;
    typeof _ref$ === "function" ? use(_ref$, _el$1) : buttonRef = _el$1;
    insert(_el$1, () => themeIcons[currentTheme()]);
    insert(_el$0, createComponent(Portal, {
      get children() {
        return createComponent(Show, {
          get when() {
            return showDropdown();
          },
          get children() {
            return [(() => {
              var _el$10 = _tmpl$0$6();
              _el$10.$$click = () => setShowDropdown(false);
              return _el$10;
            })(), (() => {
              var _el$11 = _tmpl$1$5();
              insert(_el$11, () => visibleThemes.map((themeName) => (() => {
                var _el$12 = _tmpl$11$3(), _el$13 = _el$12.firstChild;
                _el$12.$$click = () => {
                  setTheme(themeName);
                  setShowDropdown(false);
                };
                insert(_el$12, () => themeIcons[themeName], _el$13);
                insert(_el$13, () => themes[themeName].label);
                insert(_el$12, (() => {
                  var _c$ = memo(() => currentTheme() === themeName);
                  return () => _c$() && _tmpl$12$3();
                })(), null);
                createRenderEffect(() => className(_el$12, `w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-tertiary)] ${currentTheme() === themeName ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]"} ${themeName === "dark" ? "rounded-t-lg" : ""} ${themeName === "github-dark" ? "rounded-b-lg" : ""}`));
                return _el$12;
              })()));
              createRenderEffect((_p$) => {
                var _v$ = `${dropdownPos().top}px`, _v$2 = `${dropdownPos().right}px`;
                _v$ !== _p$.e && setStyleProperty(_el$11, "top", _p$.e = _v$);
                _v$2 !== _p$.t && setStyleProperty(_el$11, "right", _p$.t = _v$2);
                return _p$;
              }, {
                e: void 0,
                t: void 0
              });
              return _el$11;
            })()];
          }
        });
      }
    }), null);
    createRenderEffect(() => setAttribute(_el$1, "title", `Theme: ${themes[currentTheme()].label}`));
    return _el$0;
  })();
};
delegateEvents(["click"]);

const DOCS_URL = "https://kubegraf.io/docs/";
const BUG_URL = "https://github.com/kubegraf/kubegraf/issues/new?template=bug_report.yml";
const FEATURE_URL = "https://github.com/kubegraf/kubegraf/issues/new?template=feature_request.yml";
const CONTACT_EMAIL = "mailto:contact@kubegraf.io";

var _tmpl$$n = /* @__PURE__ */ template(`<div class="modal-overlay animate-fade-in"style=position:fixed;top:0;left:0;right:0;bottom:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;z-index:9999><div style=margin:auto;position:relative><div style=border-color:var(--border-color)><h2 style=color:var(--text-primary)></h2><button class="p-1 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"style=color:var(--text-secondary)><svg fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M6 18L18 6M6 6l12 12"></path></svg></button></div><div>`);
const Modal = (props) => {
  createEffect(() => {
    if (props.isOpen) {
      const handleEscape = (e) => {
        const target = e.target;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.closest(".xterm") || target.closest("[data-terminal]")) {
          return;
        }
        if (e.key === "Escape") {
          props.onClose();
        }
      };
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
      onCleanup(() => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "";
      });
    }
  });
  const sizeClasses = {
    xs: "max-w-[420px]",
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-[90vw] w-full"
  };
  return createComponent(Show, {
    get when() {
      return props.isOpen;
    },
    get children() {
      return createComponent(Portal, {
        get children() {
          var _el$ = _tmpl$$n(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.nextSibling, _el$6 = _el$5.firstChild, _el$7 = _el$3.nextSibling;
          addEventListener(_el$, "click", props.onClose, true);
          _el$2.$$click = (e) => e.stopPropagation();
          insert(_el$4, () => props.title);
          addEventListener(_el$5, "click", props.onClose, true);
          insert(_el$7, () => props.children);
          createRenderEffect((_p$) => {
            var _v$ = `modal-content ${sizeClasses[props.size || "lg"]} animate-slide-up`, _v$2 = props.size === "xs" ? "420px" : props.size === "sm" ? "448px" : "100%", _v$3 = props.size === "xs" ? "420px" : props.size === "sm" ? "448px" : void 0, _v$4 = `flex items-center justify-between border-b ${props.size === "xs" ? "p-3" : "p-4"}`, _v$5 = `font-semibold ${props.size === "xs" ? "text-base" : "text-lg"}`, _v$6 = `${props.size === "xs" ? "w-5 h-5" : "w-5 h-5"}`, _v$7 = `overflow-auto ${props.size === "xs" ? "p-3" : "p-4"} ${props.size === "full" ? "max-h-[85vh]" : "max-h-[70vh]"}`;
            _v$ !== _p$.e && className(_el$2, _p$.e = _v$);
            _v$2 !== _p$.t && setStyleProperty(_el$2, "width", _p$.t = _v$2);
            _v$3 !== _p$.a && setStyleProperty(_el$2, "max-width", _p$.a = _v$3);
            _v$4 !== _p$.o && className(_el$3, _p$.o = _v$4);
            _v$5 !== _p$.i && className(_el$4, _p$.i = _v$5);
            _v$6 !== _p$.n && setAttribute(_el$6, "class", _p$.n = _v$6);
            _v$7 !== _p$.s && className(_el$7, _p$.s = _v$7);
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
          return _el$;
        }
      });
    }
  });
};
delegateEvents(["click"]);

var xterm = {exports: {}};

(function (module, exports$1) {
	!function(e,t){module.exports=t();}(self,(()=>(()=>{var e={4567:function(e,t,i){var s=this&&this.__decorate||function(e,t,i,s){var r,n=arguments.length,o=n<3?t:null===s?s=Object.getOwnPropertyDescriptor(t,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,i,s);else for(var a=e.length-1;a>=0;a--)(r=e[a])&&(o=(n<3?r(o):n>3?r(t,i,o):r(t,i))||o);return n>3&&o&&Object.defineProperty(t,i,o),o},r=this&&this.__param||function(e,t){return function(i,s){t(i,s,e);}};Object.defineProperty(t,"__esModule",{value:true}),t.AccessibilityManager=void 0;const n=i(9042),o=i(6114),a=i(9924),h=i(844),c=i(5596),l=i(4725),d=i(3656);let _=t.AccessibilityManager=class extends h.Disposable{constructor(e,t){super(),this._terminal=e,this._renderService=t,this._liveRegionLineCount=0,this._charsToConsume=[],this._charsToAnnounce="",this._accessibilityContainer=document.createElement("div"),this._accessibilityContainer.classList.add("xterm-accessibility"),this._rowContainer=document.createElement("div"),this._rowContainer.setAttribute("role","list"),this._rowContainer.classList.add("xterm-accessibility-tree"),this._rowElements=[];for(let e=0;e<this._terminal.rows;e++)this._rowElements[e]=this._createAccessibilityTreeNode(),this._rowContainer.appendChild(this._rowElements[e]);if(this._topBoundaryFocusListener=e=>this._handleBoundaryFocus(e,0),this._bottomBoundaryFocusListener=e=>this._handleBoundaryFocus(e,1),this._rowElements[0].addEventListener("focus",this._topBoundaryFocusListener),this._rowElements[this._rowElements.length-1].addEventListener("focus",this._bottomBoundaryFocusListener),this._refreshRowsDimensions(),this._accessibilityContainer.appendChild(this._rowContainer),this._liveRegion=document.createElement("div"),this._liveRegion.classList.add("live-region"),this._liveRegion.setAttribute("aria-live","assertive"),this._accessibilityContainer.appendChild(this._liveRegion),this._liveRegionDebouncer=this.register(new a.TimeBasedDebouncer(this._renderRows.bind(this))),!this._terminal.element)throw new Error("Cannot enable accessibility before Terminal.open");this._terminal.element.insertAdjacentElement("afterbegin",this._accessibilityContainer),this.register(this._terminal.onResize((e=>this._handleResize(e.rows)))),this.register(this._terminal.onRender((e=>this._refreshRows(e.start,e.end)))),this.register(this._terminal.onScroll((()=>this._refreshRows()))),this.register(this._terminal.onA11yChar((e=>this._handleChar(e)))),this.register(this._terminal.onLineFeed((()=>this._handleChar("\n")))),this.register(this._terminal.onA11yTab((e=>this._handleTab(e)))),this.register(this._terminal.onKey((e=>this._handleKey(e.key)))),this.register(this._terminal.onBlur((()=>this._clearLiveRegion()))),this.register(this._renderService.onDimensionsChange((()=>this._refreshRowsDimensions()))),this._screenDprMonitor=new c.ScreenDprMonitor(window),this.register(this._screenDprMonitor),this._screenDprMonitor.setListener((()=>this._refreshRowsDimensions())),this.register((0, d.addDisposableDomListener)(window,"resize",(()=>this._refreshRowsDimensions()))),this._refreshRows(),this.register((0, h.toDisposable)((()=>{this._accessibilityContainer.remove(),this._rowElements.length=0;})));}_handleTab(e){for(let t=0;t<e;t++)this._handleChar(" ");}_handleChar(e){this._liveRegionLineCount<21&&(this._charsToConsume.length>0?this._charsToConsume.shift()!==e&&(this._charsToAnnounce+=e):this._charsToAnnounce+=e,"\n"===e&&(this._liveRegionLineCount++,21===this._liveRegionLineCount&&(this._liveRegion.textContent+=n.tooMuchOutput)),o.isMac&&this._liveRegion.textContent&&this._liveRegion.textContent.length>0&&!this._liveRegion.parentNode&&setTimeout((()=>{this._accessibilityContainer.appendChild(this._liveRegion);}),0));}_clearLiveRegion(){this._liveRegion.textContent="",this._liveRegionLineCount=0,o.isMac&&this._liveRegion.remove();}_handleKey(e){this._clearLiveRegion(),/\p{Control}/u.test(e)||this._charsToConsume.push(e);}_refreshRows(e,t){this._liveRegionDebouncer.refresh(e,t,this._terminal.rows);}_renderRows(e,t){const i=this._terminal.buffer,s=i.lines.length.toString();for(let r=e;r<=t;r++){const e=i.translateBufferLineToString(i.ydisp+r,true),t=(i.ydisp+r+1).toString(),n=this._rowElements[r];n&&(0===e.length?n.innerText=" ":n.textContent=e,n.setAttribute("aria-posinset",t),n.setAttribute("aria-setsize",s));}this._announceCharacters();}_announceCharacters(){0!==this._charsToAnnounce.length&&(this._liveRegion.textContent+=this._charsToAnnounce,this._charsToAnnounce="");}_handleBoundaryFocus(e,t){const i=e.target,s=this._rowElements[0===t?1:this._rowElements.length-2];if(i.getAttribute("aria-posinset")===(0===t?"1":`${this._terminal.buffer.lines.length}`))return;if(e.relatedTarget!==s)return;let r,n;if(0===t?(r=i,n=this._rowElements.pop(),this._rowContainer.removeChild(n)):(r=this._rowElements.shift(),n=i,this._rowContainer.removeChild(r)),r.removeEventListener("focus",this._topBoundaryFocusListener),n.removeEventListener("focus",this._bottomBoundaryFocusListener),0===t){const e=this._createAccessibilityTreeNode();this._rowElements.unshift(e),this._rowContainer.insertAdjacentElement("afterbegin",e);}else {const e=this._createAccessibilityTreeNode();this._rowElements.push(e),this._rowContainer.appendChild(e);}this._rowElements[0].addEventListener("focus",this._topBoundaryFocusListener),this._rowElements[this._rowElements.length-1].addEventListener("focus",this._bottomBoundaryFocusListener),this._terminal.scrollLines(0===t?-1:1),this._rowElements[0===t?1:this._rowElements.length-2].focus(),e.preventDefault(),e.stopImmediatePropagation();}_handleResize(e){this._rowElements[this._rowElements.length-1].removeEventListener("focus",this._bottomBoundaryFocusListener);for(let e=this._rowContainer.children.length;e<this._terminal.rows;e++)this._rowElements[e]=this._createAccessibilityTreeNode(),this._rowContainer.appendChild(this._rowElements[e]);for(;this._rowElements.length>e;)this._rowContainer.removeChild(this._rowElements.pop());this._rowElements[this._rowElements.length-1].addEventListener("focus",this._bottomBoundaryFocusListener),this._refreshRowsDimensions();}_createAccessibilityTreeNode(){const e=document.createElement("div");return e.setAttribute("role","listitem"),e.tabIndex=-1,this._refreshRowDimensions(e),e}_refreshRowsDimensions(){if(this._renderService.dimensions.css.cell.height){this._accessibilityContainer.style.width=`${this._renderService.dimensions.css.canvas.width}px`,this._rowElements.length!==this._terminal.rows&&this._handleResize(this._terminal.rows);for(let e=0;e<this._terminal.rows;e++)this._refreshRowDimensions(this._rowElements[e]);}}_refreshRowDimensions(e){e.style.height=`${this._renderService.dimensions.css.cell.height}px`;}};t.AccessibilityManager=_=s([r(1,l.IRenderService)],_);},3614:(e,t)=>{function i(e){return e.replace(/\r?\n/g,"\r")}function s(e,t){return t?"[200~"+e+"[201~":e}function r(e,t,r,n){e=s(e=i(e),r.decPrivateModes.bracketedPasteMode&&true!==n.rawOptions.ignoreBracketedPasteMode),r.triggerDataEvent(e,true),t.value="";}function n(e,t,i){const s=i.getBoundingClientRect(),r=e.clientX-s.left-10,n=e.clientY-s.top-10;t.style.width="20px",t.style.height="20px",t.style.left=`${r}px`,t.style.top=`${n}px`,t.style.zIndex="1000",t.focus();}Object.defineProperty(t,"__esModule",{value:true}),t.rightClickHandler=t.moveTextAreaUnderMouseCursor=t.paste=t.handlePasteEvent=t.copyHandler=t.bracketTextForPaste=t.prepareTextForTerminal=void 0,t.prepareTextForTerminal=i,t.bracketTextForPaste=s,t.copyHandler=function(e,t){e.clipboardData&&e.clipboardData.setData("text/plain",t.selectionText),e.preventDefault();},t.handlePasteEvent=function(e,t,i,s){e.stopPropagation(),e.clipboardData&&r(e.clipboardData.getData("text/plain"),t,i,s);},t.paste=r,t.moveTextAreaUnderMouseCursor=n,t.rightClickHandler=function(e,t,i,s,r){n(e,t,i),r&&s.rightClickSelect(e),t.value=s.selectionText,t.select();};},7239:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.ColorContrastCache=void 0;const s=i(1505);t.ColorContrastCache=class{constructor(){this._color=new s.TwoKeyMap,this._css=new s.TwoKeyMap;}setCss(e,t,i){this._css.set(e,t,i);}getCss(e,t){return this._css.get(e,t)}setColor(e,t,i){this._color.set(e,t,i);}getColor(e,t){return this._color.get(e,t)}clear(){this._color.clear(),this._css.clear();}};},3656:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.addDisposableDomListener=void 0,t.addDisposableDomListener=function(e,t,i,s){e.addEventListener(t,i,s);let r=false;return {dispose:()=>{r||(r=true,e.removeEventListener(t,i,s));}}};},6465:function(e,t,i){var s=this&&this.__decorate||function(e,t,i,s){var r,n=arguments.length,o=n<3?t:null===s?s=Object.getOwnPropertyDescriptor(t,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,i,s);else for(var a=e.length-1;a>=0;a--)(r=e[a])&&(o=(n<3?r(o):n>3?r(t,i,o):r(t,i))||o);return n>3&&o&&Object.defineProperty(t,i,o),o},r=this&&this.__param||function(e,t){return function(i,s){t(i,s,e);}};Object.defineProperty(t,"__esModule",{value:true}),t.Linkifier2=void 0;const n=i(3656),o=i(8460),a=i(844),h=i(2585);let c=t.Linkifier2=class extends a.Disposable{get currentLink(){return this._currentLink}constructor(e){super(),this._bufferService=e,this._linkProviders=[],this._linkCacheDisposables=[],this._isMouseOut=true,this._wasResized=false,this._activeLine=-1,this._onShowLinkUnderline=this.register(new o.EventEmitter),this.onShowLinkUnderline=this._onShowLinkUnderline.event,this._onHideLinkUnderline=this.register(new o.EventEmitter),this.onHideLinkUnderline=this._onHideLinkUnderline.event,this.register((0, a.getDisposeArrayDisposable)(this._linkCacheDisposables)),this.register((0, a.toDisposable)((()=>{this._lastMouseEvent=void 0;}))),this.register(this._bufferService.onResize((()=>{this._clearCurrentLink(),this._wasResized=true;})));}registerLinkProvider(e){return this._linkProviders.push(e),{dispose:()=>{const t=this._linkProviders.indexOf(e);-1!==t&&this._linkProviders.splice(t,1);}}}attachToDom(e,t,i){this._element=e,this._mouseService=t,this._renderService=i,this.register((0, n.addDisposableDomListener)(this._element,"mouseleave",(()=>{this._isMouseOut=true,this._clearCurrentLink();}))),this.register((0, n.addDisposableDomListener)(this._element,"mousemove",this._handleMouseMove.bind(this))),this.register((0, n.addDisposableDomListener)(this._element,"mousedown",this._handleMouseDown.bind(this))),this.register((0, n.addDisposableDomListener)(this._element,"mouseup",this._handleMouseUp.bind(this)));}_handleMouseMove(e){if(this._lastMouseEvent=e,!this._element||!this._mouseService)return;const t=this._positionFromMouseEvent(e,this._element,this._mouseService);if(!t)return;this._isMouseOut=false;const i=e.composedPath();for(let e=0;e<i.length;e++){const t=i[e];if(t.classList.contains("xterm"))break;if(t.classList.contains("xterm-hover"))return}this._lastBufferCell&&t.x===this._lastBufferCell.x&&t.y===this._lastBufferCell.y||(this._handleHover(t),this._lastBufferCell=t);}_handleHover(e){if(this._activeLine!==e.y||this._wasResized)return this._clearCurrentLink(),this._askForLink(e,false),void(this._wasResized=false);this._currentLink&&this._linkAtPosition(this._currentLink.link,e)||(this._clearCurrentLink(),this._askForLink(e,true));}_askForLink(e,t){var i,s;this._activeProviderReplies&&t||(null===(i=this._activeProviderReplies)||void 0===i||i.forEach((e=>{null==e||e.forEach((e=>{e.link.dispose&&e.link.dispose();}));})),this._activeProviderReplies=new Map,this._activeLine=e.y);let r=false;for(const[i,n]of this._linkProviders.entries())t?(null===(s=this._activeProviderReplies)||void 0===s?void 0:s.get(i))&&(r=this._checkLinkProviderResult(i,e,r)):n.provideLinks(e.y,(t=>{var s,n;if(this._isMouseOut)return;const o=null==t?void 0:t.map((e=>({link:e})));null===(s=this._activeProviderReplies)||void 0===s||s.set(i,o),r=this._checkLinkProviderResult(i,e,r),(null===(n=this._activeProviderReplies)||void 0===n?void 0:n.size)===this._linkProviders.length&&this._removeIntersectingLinks(e.y,this._activeProviderReplies);}));}_removeIntersectingLinks(e,t){const i=new Set;for(let s=0;s<t.size;s++){const r=t.get(s);if(r)for(let t=0;t<r.length;t++){const s=r[t],n=s.link.range.start.y<e?0:s.link.range.start.x,o=s.link.range.end.y>e?this._bufferService.cols:s.link.range.end.x;for(let e=n;e<=o;e++){if(i.has(e)){r.splice(t--,1);break}i.add(e);}}}}_checkLinkProviderResult(e,t,i){var s;if(!this._activeProviderReplies)return i;const r=this._activeProviderReplies.get(e);let n=false;for(let t=0;t<e;t++)this._activeProviderReplies.has(t)&&!this._activeProviderReplies.get(t)||(n=true);if(!n&&r){const e=r.find((e=>this._linkAtPosition(e.link,t)));e&&(i=true,this._handleNewLink(e));}if(this._activeProviderReplies.size===this._linkProviders.length&&!i)for(let e=0;e<this._activeProviderReplies.size;e++){const r=null===(s=this._activeProviderReplies.get(e))||void 0===s?void 0:s.find((e=>this._linkAtPosition(e.link,t)));if(r){i=true,this._handleNewLink(r);break}}return i}_handleMouseDown(){this._mouseDownLink=this._currentLink;}_handleMouseUp(e){if(!this._element||!this._mouseService||!this._currentLink)return;const t=this._positionFromMouseEvent(e,this._element,this._mouseService);t&&this._mouseDownLink===this._currentLink&&this._linkAtPosition(this._currentLink.link,t)&&this._currentLink.link.activate(e,this._currentLink.link.text);}_clearCurrentLink(e,t){this._element&&this._currentLink&&this._lastMouseEvent&&(!e||!t||this._currentLink.link.range.start.y>=e&&this._currentLink.link.range.end.y<=t)&&(this._linkLeave(this._element,this._currentLink.link,this._lastMouseEvent),this._currentLink=void 0,(0, a.disposeArray)(this._linkCacheDisposables));}_handleNewLink(e){if(!this._element||!this._lastMouseEvent||!this._mouseService)return;const t=this._positionFromMouseEvent(this._lastMouseEvent,this._element,this._mouseService);t&&this._linkAtPosition(e.link,t)&&(this._currentLink=e,this._currentLink.state={decorations:{underline:void 0===e.link.decorations||e.link.decorations.underline,pointerCursor:void 0===e.link.decorations||e.link.decorations.pointerCursor},isHovered:true},this._linkHover(this._element,e.link,this._lastMouseEvent),e.link.decorations={},Object.defineProperties(e.link.decorations,{pointerCursor:{get:()=>{var e,t;return null===(t=null===(e=this._currentLink)||void 0===e?void 0:e.state)||void 0===t?void 0:t.decorations.pointerCursor},set:e=>{var t,i;(null===(t=this._currentLink)||void 0===t?void 0:t.state)&&this._currentLink.state.decorations.pointerCursor!==e&&(this._currentLink.state.decorations.pointerCursor=e,this._currentLink.state.isHovered&&(null===(i=this._element)||void 0===i||i.classList.toggle("xterm-cursor-pointer",e)));}},underline:{get:()=>{var e,t;return null===(t=null===(e=this._currentLink)||void 0===e?void 0:e.state)||void 0===t?void 0:t.decorations.underline},set:t=>{var i,s,r;(null===(i=this._currentLink)||void 0===i?void 0:i.state)&&(null===(r=null===(s=this._currentLink)||void 0===s?void 0:s.state)||void 0===r?void 0:r.decorations.underline)!==t&&(this._currentLink.state.decorations.underline=t,this._currentLink.state.isHovered&&this._fireUnderlineEvent(e.link,t));}}}),this._renderService&&this._linkCacheDisposables.push(this._renderService.onRenderedViewportChange((e=>{if(!this._currentLink)return;const t=0===e.start?0:e.start+1+this._bufferService.buffer.ydisp,i=this._bufferService.buffer.ydisp+1+e.end;if(this._currentLink.link.range.start.y>=t&&this._currentLink.link.range.end.y<=i&&(this._clearCurrentLink(t,i),this._lastMouseEvent&&this._element)){const e=this._positionFromMouseEvent(this._lastMouseEvent,this._element,this._mouseService);e&&this._askForLink(e,false);}}))));}_linkHover(e,t,i){var s;(null===(s=this._currentLink)||void 0===s?void 0:s.state)&&(this._currentLink.state.isHovered=true,this._currentLink.state.decorations.underline&&this._fireUnderlineEvent(t,true),this._currentLink.state.decorations.pointerCursor&&e.classList.add("xterm-cursor-pointer")),t.hover&&t.hover(i,t.text);}_fireUnderlineEvent(e,t){const i=e.range,s=this._bufferService.buffer.ydisp,r=this._createLinkUnderlineEvent(i.start.x-1,i.start.y-s-1,i.end.x,i.end.y-s-1,void 0);(t?this._onShowLinkUnderline:this._onHideLinkUnderline).fire(r);}_linkLeave(e,t,i){var s;(null===(s=this._currentLink)||void 0===s?void 0:s.state)&&(this._currentLink.state.isHovered=false,this._currentLink.state.decorations.underline&&this._fireUnderlineEvent(t,false),this._currentLink.state.decorations.pointerCursor&&e.classList.remove("xterm-cursor-pointer")),t.leave&&t.leave(i,t.text);}_linkAtPosition(e,t){const i=e.range.start.y*this._bufferService.cols+e.range.start.x,s=e.range.end.y*this._bufferService.cols+e.range.end.x,r=t.y*this._bufferService.cols+t.x;return i<=r&&r<=s}_positionFromMouseEvent(e,t,i){const s=i.getCoords(e,t,this._bufferService.cols,this._bufferService.rows);if(s)return {x:s[0],y:s[1]+this._bufferService.buffer.ydisp}}_createLinkUnderlineEvent(e,t,i,s,r){return {x1:e,y1:t,x2:i,y2:s,cols:this._bufferService.cols,fg:r}}};t.Linkifier2=c=s([r(0,h.IBufferService)],c);},9042:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.tooMuchOutput=t.promptLabel=void 0,t.promptLabel="Terminal input",t.tooMuchOutput="Too much output to announce, navigate to rows manually to read";},3730:function(e,t,i){var s=this&&this.__decorate||function(e,t,i,s){var r,n=arguments.length,o=n<3?t:null===s?s=Object.getOwnPropertyDescriptor(t,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,i,s);else for(var a=e.length-1;a>=0;a--)(r=e[a])&&(o=(n<3?r(o):n>3?r(t,i,o):r(t,i))||o);return n>3&&o&&Object.defineProperty(t,i,o),o},r=this&&this.__param||function(e,t){return function(i,s){t(i,s,e);}};Object.defineProperty(t,"__esModule",{value:true}),t.OscLinkProvider=void 0;const n=i(511),o=i(2585);let a=t.OscLinkProvider=class{constructor(e,t,i){this._bufferService=e,this._optionsService=t,this._oscLinkService=i;}provideLinks(e,t){var i;const s=this._bufferService.buffer.lines.get(e-1);if(!s)return void t(void 0);const r=[],o=this._optionsService.rawOptions.linkHandler,a=new n.CellData,c=s.getTrimmedLength();let l=-1,d=-1,_=false;for(let t=0;t<c;t++)if(-1!==d||s.hasContent(t)){if(s.loadCell(t,a),a.hasExtendedAttrs()&&a.extended.urlId){if(-1===d){d=t,l=a.extended.urlId;continue}_=a.extended.urlId!==l;}else  -1!==d&&(_=true);if(_||-1!==d&&t===c-1){const s=null===(i=this._oscLinkService.getLinkData(l))||void 0===i?void 0:i.uri;if(s){const i={start:{x:d+1,y:e},end:{x:t+(_||t!==c-1?0:1),y:e}};let n=false;if(!(null==o?void 0:o.allowNonHttpProtocols))try{const e=new URL(s);["http:","https:"].includes(e.protocol)||(n=!0);}catch(e){n=true;}n||r.push({text:s,range:i,activate:(e,t)=>o?o.activate(e,t,i):h(0,t),hover:(e,t)=>{var s;return null===(s=null==o?void 0:o.hover)||void 0===s?void 0:s.call(o,e,t,i)},leave:(e,t)=>{var s;return null===(s=null==o?void 0:o.leave)||void 0===s?void 0:s.call(o,e,t,i)}});}_=false,a.hasExtendedAttrs()&&a.extended.urlId?(d=t,l=a.extended.urlId):(d=-1,l=-1);}}t(r);}};function h(e,t){if(confirm(`Do you want to navigate to ${t}?\n\nWARNING: This link could potentially be dangerous`)){const e=window.open();if(e){try{e.opener=null;}catch(e){}e.location.href=t;}else console.warn("Opening link blocked as opener could not be cleared");}}t.OscLinkProvider=a=s([r(0,o.IBufferService),r(1,o.IOptionsService),r(2,o.IOscLinkService)],a);},6193:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.RenderDebouncer=void 0,t.RenderDebouncer=class{constructor(e,t){this._parentWindow=e,this._renderCallback=t,this._refreshCallbacks=[];}dispose(){this._animationFrame&&(this._parentWindow.cancelAnimationFrame(this._animationFrame),this._animationFrame=void 0);}addRefreshCallback(e){return this._refreshCallbacks.push(e),this._animationFrame||(this._animationFrame=this._parentWindow.requestAnimationFrame((()=>this._innerRefresh()))),this._animationFrame}refresh(e,t,i){this._rowCount=i,e=void 0!==e?e:0,t=void 0!==t?t:this._rowCount-1,this._rowStart=void 0!==this._rowStart?Math.min(this._rowStart,e):e,this._rowEnd=void 0!==this._rowEnd?Math.max(this._rowEnd,t):t,this._animationFrame||(this._animationFrame=this._parentWindow.requestAnimationFrame((()=>this._innerRefresh())));}_innerRefresh(){if(this._animationFrame=void 0,void 0===this._rowStart||void 0===this._rowEnd||void 0===this._rowCount)return void this._runRefreshCallbacks();const e=Math.max(this._rowStart,0),t=Math.min(this._rowEnd,this._rowCount-1);this._rowStart=void 0,this._rowEnd=void 0,this._renderCallback(e,t),this._runRefreshCallbacks();}_runRefreshCallbacks(){for(const e of this._refreshCallbacks)e(0);this._refreshCallbacks=[];}};},5596:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.ScreenDprMonitor=void 0;const s=i(844);class r extends s.Disposable{constructor(e){super(),this._parentWindow=e,this._currentDevicePixelRatio=this._parentWindow.devicePixelRatio,this.register((0, s.toDisposable)((()=>{this.clearListener();})));}setListener(e){this._listener&&this.clearListener(),this._listener=e,this._outerListener=()=>{this._listener&&(this._listener(this._parentWindow.devicePixelRatio,this._currentDevicePixelRatio),this._updateDpr());},this._updateDpr();}_updateDpr(){var e;this._outerListener&&(null===(e=this._resolutionMediaMatchList)||void 0===e||e.removeListener(this._outerListener),this._currentDevicePixelRatio=this._parentWindow.devicePixelRatio,this._resolutionMediaMatchList=this._parentWindow.matchMedia(`screen and (resolution: ${this._parentWindow.devicePixelRatio}dppx)`),this._resolutionMediaMatchList.addListener(this._outerListener));}clearListener(){this._resolutionMediaMatchList&&this._listener&&this._outerListener&&(this._resolutionMediaMatchList.removeListener(this._outerListener),this._resolutionMediaMatchList=void 0,this._listener=void 0,this._outerListener=void 0);}}t.ScreenDprMonitor=r;},3236:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.Terminal=void 0;const s=i(3614),r=i(3656),n=i(6465),o=i(9042),a=i(3730),h=i(1680),c=i(3107),l=i(5744),d=i(2950),_=i(1296),u=i(428),f=i(4269),v=i(5114),p=i(8934),g=i(3230),m=i(9312),S=i(4725),C=i(6731),b=i(8055),y=i(8969),w=i(8460),E=i(844),k=i(6114),L=i(8437),D=i(2584),R=i(7399),x=i(5941),A=i(9074),B=i(2585),T=i(5435),M=i(4567),O="undefined"!=typeof window?window.document:null;class P extends y.CoreTerminal{get onFocus(){return this._onFocus.event}get onBlur(){return this._onBlur.event}get onA11yChar(){return this._onA11yCharEmitter.event}get onA11yTab(){return this._onA11yTabEmitter.event}get onWillOpen(){return this._onWillOpen.event}constructor(e={}){super(e),this.browser=k,this._keyDownHandled=false,this._keyDownSeen=false,this._keyPressHandled=false,this._unprocessedDeadKey=false,this._accessibilityManager=this.register(new E.MutableDisposable),this._onCursorMove=this.register(new w.EventEmitter),this.onCursorMove=this._onCursorMove.event,this._onKey=this.register(new w.EventEmitter),this.onKey=this._onKey.event,this._onRender=this.register(new w.EventEmitter),this.onRender=this._onRender.event,this._onSelectionChange=this.register(new w.EventEmitter),this.onSelectionChange=this._onSelectionChange.event,this._onTitleChange=this.register(new w.EventEmitter),this.onTitleChange=this._onTitleChange.event,this._onBell=this.register(new w.EventEmitter),this.onBell=this._onBell.event,this._onFocus=this.register(new w.EventEmitter),this._onBlur=this.register(new w.EventEmitter),this._onA11yCharEmitter=this.register(new w.EventEmitter),this._onA11yTabEmitter=this.register(new w.EventEmitter),this._onWillOpen=this.register(new w.EventEmitter),this._setup(),this.linkifier2=this.register(this._instantiationService.createInstance(n.Linkifier2)),this.linkifier2.registerLinkProvider(this._instantiationService.createInstance(a.OscLinkProvider)),this._decorationService=this._instantiationService.createInstance(A.DecorationService),this._instantiationService.setService(B.IDecorationService,this._decorationService),this.register(this._inputHandler.onRequestBell((()=>this._onBell.fire()))),this.register(this._inputHandler.onRequestRefreshRows(((e,t)=>this.refresh(e,t)))),this.register(this._inputHandler.onRequestSendFocus((()=>this._reportFocus()))),this.register(this._inputHandler.onRequestReset((()=>this.reset()))),this.register(this._inputHandler.onRequestWindowsOptionsReport((e=>this._reportWindowsOptions(e)))),this.register(this._inputHandler.onColor((e=>this._handleColorEvent(e)))),this.register((0, w.forwardEvent)(this._inputHandler.onCursorMove,this._onCursorMove)),this.register((0, w.forwardEvent)(this._inputHandler.onTitleChange,this._onTitleChange)),this.register((0, w.forwardEvent)(this._inputHandler.onA11yChar,this._onA11yCharEmitter)),this.register((0, w.forwardEvent)(this._inputHandler.onA11yTab,this._onA11yTabEmitter)),this.register(this._bufferService.onResize((e=>this._afterResize(e.cols,e.rows)))),this.register((0, E.toDisposable)((()=>{var e,t;this._customKeyEventHandler=void 0,null===(t=null===(e=this.element)||void 0===e?void 0:e.parentNode)||void 0===t||t.removeChild(this.element);})));}_handleColorEvent(e){if(this._themeService)for(const t of e){let e,i="";switch(t.index){case 256:e="foreground",i="10";break;case 257:e="background",i="11";break;case 258:e="cursor",i="12";break;default:e="ansi",i="4;"+t.index;}switch(t.type){case 0:const s=b.color.toColorRGB("ansi"===e?this._themeService.colors.ansi[t.index]:this._themeService.colors[e]);this.coreService.triggerDataEvent(`${D.C0.ESC}]${i};${(0, x.toRgbString)(s)}${D.C1_ESCAPED.ST}`);break;case 1:if("ansi"===e)this._themeService.modifyColors((e=>e.ansi[t.index]=b.rgba.toColor(...t.color)));else {const i=e;this._themeService.modifyColors((e=>e[i]=b.rgba.toColor(...t.color)));}break;case 2:this._themeService.restoreColor(t.index);}}}_setup(){super._setup(),this._customKeyEventHandler=void 0;}get buffer(){return this.buffers.active}focus(){this.textarea&&this.textarea.focus({preventScroll:true});}_handleScreenReaderModeOptionChange(e){e?!this._accessibilityManager.value&&this._renderService&&(this._accessibilityManager.value=this._instantiationService.createInstance(M.AccessibilityManager,this)):this._accessibilityManager.clear();}_handleTextAreaFocus(e){this.coreService.decPrivateModes.sendFocus&&this.coreService.triggerDataEvent(D.C0.ESC+"[I"),this.updateCursorStyle(e),this.element.classList.add("focus"),this._showCursor(),this._onFocus.fire();}blur(){var e;return null===(e=this.textarea)||void 0===e?void 0:e.blur()}_handleTextAreaBlur(){this.textarea.value="",this.refresh(this.buffer.y,this.buffer.y),this.coreService.decPrivateModes.sendFocus&&this.coreService.triggerDataEvent(D.C0.ESC+"[O"),this.element.classList.remove("focus"),this._onBlur.fire();}_syncTextArea(){if(!this.textarea||!this.buffer.isCursorInViewport||this._compositionHelper.isComposing||!this._renderService)return;const e=this.buffer.ybase+this.buffer.y,t=this.buffer.lines.get(e);if(!t)return;const i=Math.min(this.buffer.x,this.cols-1),s=this._renderService.dimensions.css.cell.height,r=t.getWidth(i),n=this._renderService.dimensions.css.cell.width*r,o=this.buffer.y*this._renderService.dimensions.css.cell.height,a=i*this._renderService.dimensions.css.cell.width;this.textarea.style.left=a+"px",this.textarea.style.top=o+"px",this.textarea.style.width=n+"px",this.textarea.style.height=s+"px",this.textarea.style.lineHeight=s+"px",this.textarea.style.zIndex="-5";}_initGlobal(){this._bindKeys(),this.register((0, r.addDisposableDomListener)(this.element,"copy",(e=>{this.hasSelection()&&(0, s.copyHandler)(e,this._selectionService);})));const e=e=>(0, s.handlePasteEvent)(e,this.textarea,this.coreService,this.optionsService);this.register((0, r.addDisposableDomListener)(this.textarea,"paste",e)),this.register((0, r.addDisposableDomListener)(this.element,"paste",e)),k.isFirefox?this.register((0, r.addDisposableDomListener)(this.element,"mousedown",(e=>{2===e.button&&(0, s.rightClickHandler)(e,this.textarea,this.screenElement,this._selectionService,this.options.rightClickSelectsWord);}))):this.register((0, r.addDisposableDomListener)(this.element,"contextmenu",(e=>{(0, s.rightClickHandler)(e,this.textarea,this.screenElement,this._selectionService,this.options.rightClickSelectsWord);}))),k.isLinux&&this.register((0, r.addDisposableDomListener)(this.element,"auxclick",(e=>{1===e.button&&(0, s.moveTextAreaUnderMouseCursor)(e,this.textarea,this.screenElement);})));}_bindKeys(){this.register((0, r.addDisposableDomListener)(this.textarea,"keyup",(e=>this._keyUp(e)),true)),this.register((0, r.addDisposableDomListener)(this.textarea,"keydown",(e=>this._keyDown(e)),true)),this.register((0, r.addDisposableDomListener)(this.textarea,"keypress",(e=>this._keyPress(e)),true)),this.register((0, r.addDisposableDomListener)(this.textarea,"compositionstart",(()=>this._compositionHelper.compositionstart()))),this.register((0, r.addDisposableDomListener)(this.textarea,"compositionupdate",(e=>this._compositionHelper.compositionupdate(e)))),this.register((0, r.addDisposableDomListener)(this.textarea,"compositionend",(()=>this._compositionHelper.compositionend()))),this.register((0, r.addDisposableDomListener)(this.textarea,"input",(e=>this._inputEvent(e)),true)),this.register(this.onRender((()=>this._compositionHelper.updateCompositionElements())));}open(e){var t;if(!e)throw new Error("Terminal requires a parent element.");e.isConnected||this._logService.debug("Terminal.open was called on an element that was not attached to the DOM"),this._document=e.ownerDocument,this.element=this._document.createElement("div"),this.element.dir="ltr",this.element.classList.add("terminal"),this.element.classList.add("xterm"),e.appendChild(this.element);const i=O.createDocumentFragment();this._viewportElement=O.createElement("div"),this._viewportElement.classList.add("xterm-viewport"),i.appendChild(this._viewportElement),this._viewportScrollArea=O.createElement("div"),this._viewportScrollArea.classList.add("xterm-scroll-area"),this._viewportElement.appendChild(this._viewportScrollArea),this.screenElement=O.createElement("div"),this.screenElement.classList.add("xterm-screen"),this._helperContainer=O.createElement("div"),this._helperContainer.classList.add("xterm-helpers"),this.screenElement.appendChild(this._helperContainer),i.appendChild(this.screenElement),this.textarea=O.createElement("textarea"),this.textarea.classList.add("xterm-helper-textarea"),this.textarea.setAttribute("aria-label",o.promptLabel),k.isChromeOS||this.textarea.setAttribute("aria-multiline","false"),this.textarea.setAttribute("autocorrect","off"),this.textarea.setAttribute("autocapitalize","off"),this.textarea.setAttribute("spellcheck","false"),this.textarea.tabIndex=0,this._coreBrowserService=this._instantiationService.createInstance(v.CoreBrowserService,this.textarea,null!==(t=this._document.defaultView)&&void 0!==t?t:window),this._instantiationService.setService(S.ICoreBrowserService,this._coreBrowserService),this.register((0, r.addDisposableDomListener)(this.textarea,"focus",(e=>this._handleTextAreaFocus(e)))),this.register((0, r.addDisposableDomListener)(this.textarea,"blur",(()=>this._handleTextAreaBlur()))),this._helperContainer.appendChild(this.textarea),this._charSizeService=this._instantiationService.createInstance(u.CharSizeService,this._document,this._helperContainer),this._instantiationService.setService(S.ICharSizeService,this._charSizeService),this._themeService=this._instantiationService.createInstance(C.ThemeService),this._instantiationService.setService(S.IThemeService,this._themeService),this._characterJoinerService=this._instantiationService.createInstance(f.CharacterJoinerService),this._instantiationService.setService(S.ICharacterJoinerService,this._characterJoinerService),this._renderService=this.register(this._instantiationService.createInstance(g.RenderService,this.rows,this.screenElement)),this._instantiationService.setService(S.IRenderService,this._renderService),this.register(this._renderService.onRenderedViewportChange((e=>this._onRender.fire(e)))),this.onResize((e=>this._renderService.resize(e.cols,e.rows))),this._compositionView=O.createElement("div"),this._compositionView.classList.add("composition-view"),this._compositionHelper=this._instantiationService.createInstance(d.CompositionHelper,this.textarea,this._compositionView),this._helperContainer.appendChild(this._compositionView),this.element.appendChild(i);try{this._onWillOpen.fire(this.element);}catch(e){}this._renderService.hasRenderer()||this._renderService.setRenderer(this._createRenderer()),this._mouseService=this._instantiationService.createInstance(p.MouseService),this._instantiationService.setService(S.IMouseService,this._mouseService),this.viewport=this._instantiationService.createInstance(h.Viewport,this._viewportElement,this._viewportScrollArea),this.viewport.onRequestScrollLines((e=>this.scrollLines(e.amount,e.suppressScrollEvent,1))),this.register(this._inputHandler.onRequestSyncScrollBar((()=>this.viewport.syncScrollArea()))),this.register(this.viewport),this.register(this.onCursorMove((()=>{this._renderService.handleCursorMove(),this._syncTextArea();}))),this.register(this.onResize((()=>this._renderService.handleResize(this.cols,this.rows)))),this.register(this.onBlur((()=>this._renderService.handleBlur()))),this.register(this.onFocus((()=>this._renderService.handleFocus()))),this.register(this._renderService.onDimensionsChange((()=>this.viewport.syncScrollArea()))),this._selectionService=this.register(this._instantiationService.createInstance(m.SelectionService,this.element,this.screenElement,this.linkifier2)),this._instantiationService.setService(S.ISelectionService,this._selectionService),this.register(this._selectionService.onRequestScrollLines((e=>this.scrollLines(e.amount,e.suppressScrollEvent)))),this.register(this._selectionService.onSelectionChange((()=>this._onSelectionChange.fire()))),this.register(this._selectionService.onRequestRedraw((e=>this._renderService.handleSelectionChanged(e.start,e.end,e.columnSelectMode)))),this.register(this._selectionService.onLinuxMouseSelection((e=>{this.textarea.value=e,this.textarea.focus(),this.textarea.select();}))),this.register(this._onScroll.event((e=>{this.viewport.syncScrollArea(),this._selectionService.refresh();}))),this.register((0, r.addDisposableDomListener)(this._viewportElement,"scroll",(()=>this._selectionService.refresh()))),this.linkifier2.attachToDom(this.screenElement,this._mouseService,this._renderService),this.register(this._instantiationService.createInstance(c.BufferDecorationRenderer,this.screenElement)),this.register((0, r.addDisposableDomListener)(this.element,"mousedown",(e=>this._selectionService.handleMouseDown(e)))),this.coreMouseService.areMouseEventsActive?(this._selectionService.disable(),this.element.classList.add("enable-mouse-events")):this._selectionService.enable(),this.options.screenReaderMode&&(this._accessibilityManager.value=this._instantiationService.createInstance(M.AccessibilityManager,this)),this.register(this.optionsService.onSpecificOptionChange("screenReaderMode",(e=>this._handleScreenReaderModeOptionChange(e)))),this.options.overviewRulerWidth&&(this._overviewRulerRenderer=this.register(this._instantiationService.createInstance(l.OverviewRulerRenderer,this._viewportElement,this.screenElement))),this.optionsService.onSpecificOptionChange("overviewRulerWidth",(e=>{!this._overviewRulerRenderer&&e&&this._viewportElement&&this.screenElement&&(this._overviewRulerRenderer=this.register(this._instantiationService.createInstance(l.OverviewRulerRenderer,this._viewportElement,this.screenElement)));})),this._charSizeService.measure(),this.refresh(0,this.rows-1),this._initGlobal(),this.bindMouse();}_createRenderer(){return this._instantiationService.createInstance(_.DomRenderer,this.element,this.screenElement,this._viewportElement,this.linkifier2)}bindMouse(){const e=this,t=this.element;function i(t){const i=e._mouseService.getMouseReportCoords(t,e.screenElement);if(!i)return  false;let s,r;switch(t.overrideType||t.type){case "mousemove":r=32,void 0===t.buttons?(s=3,void 0!==t.button&&(s=t.button<3?t.button:3)):s=1&t.buttons?0:4&t.buttons?1:2&t.buttons?2:3;break;case "mouseup":r=0,s=t.button<3?t.button:3;break;case "mousedown":r=1,s=t.button<3?t.button:3;break;case "wheel":if(0===e.viewport.getLinesScrolled(t))return  false;r=t.deltaY<0?0:1,s=4;break;default:return  false}return !(void 0===r||void 0===s||s>4)&&e.coreMouseService.triggerMouseEvent({col:i.col,row:i.row,x:i.x,y:i.y,button:s,action:r,ctrl:t.ctrlKey,alt:t.altKey,shift:t.shiftKey})}const s={mouseup:null,wheel:null,mousedrag:null,mousemove:null},n={mouseup:e=>(i(e),e.buttons||(this._document.removeEventListener("mouseup",s.mouseup),s.mousedrag&&this._document.removeEventListener("mousemove",s.mousedrag)),this.cancel(e)),wheel:e=>(i(e),this.cancel(e,true)),mousedrag:e=>{e.buttons&&i(e);},mousemove:e=>{e.buttons||i(e);}};this.register(this.coreMouseService.onProtocolChange((e=>{e?("debug"===this.optionsService.rawOptions.logLevel&&this._logService.debug("Binding to mouse events:",this.coreMouseService.explainEvents(e)),this.element.classList.add("enable-mouse-events"),this._selectionService.disable()):(this._logService.debug("Unbinding from mouse events."),this.element.classList.remove("enable-mouse-events"),this._selectionService.enable()),8&e?s.mousemove||(t.addEventListener("mousemove",n.mousemove),s.mousemove=n.mousemove):(t.removeEventListener("mousemove",s.mousemove),s.mousemove=null),16&e?s.wheel||(t.addEventListener("wheel",n.wheel,{passive:false}),s.wheel=n.wheel):(t.removeEventListener("wheel",s.wheel),s.wheel=null),2&e?s.mouseup||(t.addEventListener("mouseup",n.mouseup),s.mouseup=n.mouseup):(this._document.removeEventListener("mouseup",s.mouseup),t.removeEventListener("mouseup",s.mouseup),s.mouseup=null),4&e?s.mousedrag||(s.mousedrag=n.mousedrag):(this._document.removeEventListener("mousemove",s.mousedrag),s.mousedrag=null);}))),this.coreMouseService.activeProtocol=this.coreMouseService.activeProtocol,this.register((0, r.addDisposableDomListener)(t,"mousedown",(e=>{if(e.preventDefault(),this.focus(),this.coreMouseService.areMouseEventsActive&&!this._selectionService.shouldForceSelection(e))return i(e),s.mouseup&&this._document.addEventListener("mouseup",s.mouseup),s.mousedrag&&this._document.addEventListener("mousemove",s.mousedrag),this.cancel(e)}))),this.register((0, r.addDisposableDomListener)(t,"wheel",(e=>{if(!s.wheel){if(!this.buffer.hasScrollback){const t=this.viewport.getLinesScrolled(e);if(0===t)return;const i=D.C0.ESC+(this.coreService.decPrivateModes.applicationCursorKeys?"O":"[")+(e.deltaY<0?"A":"B");let s="";for(let e=0;e<Math.abs(t);e++)s+=i;return this.coreService.triggerDataEvent(s,true),this.cancel(e,true)}return this.viewport.handleWheel(e)?this.cancel(e):void 0}}),{passive:false})),this.register((0, r.addDisposableDomListener)(t,"touchstart",(e=>{if(!this.coreMouseService.areMouseEventsActive)return this.viewport.handleTouchStart(e),this.cancel(e)}),{passive:true})),this.register((0, r.addDisposableDomListener)(t,"touchmove",(e=>{if(!this.coreMouseService.areMouseEventsActive)return this.viewport.handleTouchMove(e)?void 0:this.cancel(e)}),{passive:false}));}refresh(e,t){var i;null===(i=this._renderService)||void 0===i||i.refreshRows(e,t);}updateCursorStyle(e){var t;(null===(t=this._selectionService)||void 0===t?void 0:t.shouldColumnSelect(e))?this.element.classList.add("column-select"):this.element.classList.remove("column-select");}_showCursor(){this.coreService.isCursorInitialized||(this.coreService.isCursorInitialized=true,this.refresh(this.buffer.y,this.buffer.y));}scrollLines(e,t,i=0){var s;1===i?(super.scrollLines(e,t,i),this.refresh(0,this.rows-1)):null===(s=this.viewport)||void 0===s||s.scrollLines(e);}paste(e){(0, s.paste)(e,this.textarea,this.coreService,this.optionsService);}attachCustomKeyEventHandler(e){this._customKeyEventHandler=e;}registerLinkProvider(e){return this.linkifier2.registerLinkProvider(e)}registerCharacterJoiner(e){if(!this._characterJoinerService)throw new Error("Terminal must be opened first");const t=this._characterJoinerService.register(e);return this.refresh(0,this.rows-1),t}deregisterCharacterJoiner(e){if(!this._characterJoinerService)throw new Error("Terminal must be opened first");this._characterJoinerService.deregister(e)&&this.refresh(0,this.rows-1);}get markers(){return this.buffer.markers}registerMarker(e){return this.buffer.addMarker(this.buffer.ybase+this.buffer.y+e)}registerDecoration(e){return this._decorationService.registerDecoration(e)}hasSelection(){return !!this._selectionService&&this._selectionService.hasSelection}select(e,t,i){this._selectionService.setSelection(e,t,i);}getSelection(){return this._selectionService?this._selectionService.selectionText:""}getSelectionPosition(){if(this._selectionService&&this._selectionService.hasSelection)return {start:{x:this._selectionService.selectionStart[0],y:this._selectionService.selectionStart[1]},end:{x:this._selectionService.selectionEnd[0],y:this._selectionService.selectionEnd[1]}}}clearSelection(){var e;null===(e=this._selectionService)||void 0===e||e.clearSelection();}selectAll(){var e;null===(e=this._selectionService)||void 0===e||e.selectAll();}selectLines(e,t){var i;null===(i=this._selectionService)||void 0===i||i.selectLines(e,t);}_keyDown(e){if(this._keyDownHandled=false,this._keyDownSeen=true,this._customKeyEventHandler&&false===this._customKeyEventHandler(e))return  false;const t=this.browser.isMac&&this.options.macOptionIsMeta&&e.altKey;if(!t&&!this._compositionHelper.keydown(e))return this.options.scrollOnUserInput&&this.buffer.ybase!==this.buffer.ydisp&&this.scrollToBottom(),false;t||"Dead"!==e.key&&"AltGraph"!==e.key||(this._unprocessedDeadKey=true);const i=(0, R.evaluateKeyboardEvent)(e,this.coreService.decPrivateModes.applicationCursorKeys,this.browser.isMac,this.options.macOptionIsMeta);if(this.updateCursorStyle(e),3===i.type||2===i.type){const t=this.rows-1;return this.scrollLines(2===i.type?-t:t),this.cancel(e,true)}return 1===i.type&&this.selectAll(),!!this._isThirdLevelShift(this.browser,e)||(i.cancel&&this.cancel(e,true),!i.key||!!(e.key&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&1===e.key.length&&e.key.charCodeAt(0)>=65&&e.key.charCodeAt(0)<=90)||(this._unprocessedDeadKey?(this._unprocessedDeadKey=false,true):(i.key!==D.C0.ETX&&i.key!==D.C0.CR||(this.textarea.value=""),this._onKey.fire({key:i.key,domEvent:e}),this._showCursor(),this.coreService.triggerDataEvent(i.key,true),!this.optionsService.rawOptions.screenReaderMode||e.altKey||e.ctrlKey?this.cancel(e,true):void(this._keyDownHandled=true))))}_isThirdLevelShift(e,t){const i=e.isMac&&!this.options.macOptionIsMeta&&t.altKey&&!t.ctrlKey&&!t.metaKey||e.isWindows&&t.altKey&&t.ctrlKey&&!t.metaKey||e.isWindows&&t.getModifierState("AltGraph");return "keypress"===t.type?i:i&&(!t.keyCode||t.keyCode>47)}_keyUp(e){this._keyDownSeen=false,this._customKeyEventHandler&&false===this._customKeyEventHandler(e)||(function(e){return 16===e.keyCode||17===e.keyCode||18===e.keyCode}(e)||this.focus(),this.updateCursorStyle(e),this._keyPressHandled=false);}_keyPress(e){let t;if(this._keyPressHandled=false,this._keyDownHandled)return  false;if(this._customKeyEventHandler&&false===this._customKeyEventHandler(e))return  false;if(this.cancel(e),e.charCode)t=e.charCode;else if(null===e.which||void 0===e.which)t=e.keyCode;else {if(0===e.which||0===e.charCode)return  false;t=e.which;}return !(!t||(e.altKey||e.ctrlKey||e.metaKey)&&!this._isThirdLevelShift(this.browser,e)||(t=String.fromCharCode(t),this._onKey.fire({key:t,domEvent:e}),this._showCursor(),this.coreService.triggerDataEvent(t,true),this._keyPressHandled=true,this._unprocessedDeadKey=false,0))}_inputEvent(e){if(e.data&&"insertText"===e.inputType&&(!e.composed||!this._keyDownSeen)&&!this.optionsService.rawOptions.screenReaderMode){if(this._keyPressHandled)return  false;this._unprocessedDeadKey=false;const t=e.data;return this.coreService.triggerDataEvent(t,true),this.cancel(e),true}return  false}resize(e,t){e!==this.cols||t!==this.rows?super.resize(e,t):this._charSizeService&&!this._charSizeService.hasValidSize&&this._charSizeService.measure();}_afterResize(e,t){var i,s;null===(i=this._charSizeService)||void 0===i||i.measure(),null===(s=this.viewport)||void 0===s||s.syncScrollArea(true);}clear(){var e;if(0!==this.buffer.ybase||0!==this.buffer.y){this.buffer.clearAllMarkers(),this.buffer.lines.set(0,this.buffer.lines.get(this.buffer.ybase+this.buffer.y)),this.buffer.lines.length=1,this.buffer.ydisp=0,this.buffer.ybase=0,this.buffer.y=0;for(let e=1;e<this.rows;e++)this.buffer.lines.push(this.buffer.getBlankLine(L.DEFAULT_ATTR_DATA));this._onScroll.fire({position:this.buffer.ydisp,source:0}),null===(e=this.viewport)||void 0===e||e.reset(),this.refresh(0,this.rows-1);}}reset(){var e,t;this.options.rows=this.rows,this.options.cols=this.cols;const i=this._customKeyEventHandler;this._setup(),super.reset(),null===(e=this._selectionService)||void 0===e||e.reset(),this._decorationService.reset(),null===(t=this.viewport)||void 0===t||t.reset(),this._customKeyEventHandler=i,this.refresh(0,this.rows-1);}clearTextureAtlas(){var e;null===(e=this._renderService)||void 0===e||e.clearTextureAtlas();}_reportFocus(){var e;(null===(e=this.element)||void 0===e?void 0:e.classList.contains("focus"))?this.coreService.triggerDataEvent(D.C0.ESC+"[I"):this.coreService.triggerDataEvent(D.C0.ESC+"[O");}_reportWindowsOptions(e){if(this._renderService)switch(e){case T.WindowsOptionsReportType.GET_WIN_SIZE_PIXELS:const e=this._renderService.dimensions.css.canvas.width.toFixed(0),t=this._renderService.dimensions.css.canvas.height.toFixed(0);this.coreService.triggerDataEvent(`${D.C0.ESC}[4;${t};${e}t`);break;case T.WindowsOptionsReportType.GET_CELL_SIZE_PIXELS:const i=this._renderService.dimensions.css.cell.width.toFixed(0),s=this._renderService.dimensions.css.cell.height.toFixed(0);this.coreService.triggerDataEvent(`${D.C0.ESC}[6;${s};${i}t`);}}cancel(e,t){if(this.options.cancelEvents||t)return e.preventDefault(),e.stopPropagation(),false}}t.Terminal=P;},9924:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.TimeBasedDebouncer=void 0,t.TimeBasedDebouncer=class{constructor(e,t=1e3){this._renderCallback=e,this._debounceThresholdMS=t,this._lastRefreshMs=0,this._additionalRefreshRequested=false;}dispose(){this._refreshTimeoutID&&clearTimeout(this._refreshTimeoutID);}refresh(e,t,i){this._rowCount=i,e=void 0!==e?e:0,t=void 0!==t?t:this._rowCount-1,this._rowStart=void 0!==this._rowStart?Math.min(this._rowStart,e):e,this._rowEnd=void 0!==this._rowEnd?Math.max(this._rowEnd,t):t;const s=Date.now();if(s-this._lastRefreshMs>=this._debounceThresholdMS)this._lastRefreshMs=s,this._innerRefresh();else if(!this._additionalRefreshRequested){const e=s-this._lastRefreshMs,t=this._debounceThresholdMS-e;this._additionalRefreshRequested=true,this._refreshTimeoutID=window.setTimeout((()=>{this._lastRefreshMs=Date.now(),this._innerRefresh(),this._additionalRefreshRequested=false,this._refreshTimeoutID=void 0;}),t);}}_innerRefresh(){if(void 0===this._rowStart||void 0===this._rowEnd||void 0===this._rowCount)return;const e=Math.max(this._rowStart,0),t=Math.min(this._rowEnd,this._rowCount-1);this._rowStart=void 0,this._rowEnd=void 0,this._renderCallback(e,t);}};},1680:function(e,t,i){var s=this&&this.__decorate||function(e,t,i,s){var r,n=arguments.length,o=n<3?t:null===s?s=Object.getOwnPropertyDescriptor(t,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,i,s);else for(var a=e.length-1;a>=0;a--)(r=e[a])&&(o=(n<3?r(o):n>3?r(t,i,o):r(t,i))||o);return n>3&&o&&Object.defineProperty(t,i,o),o},r=this&&this.__param||function(e,t){return function(i,s){t(i,s,e);}};Object.defineProperty(t,"__esModule",{value:true}),t.Viewport=void 0;const n=i(3656),o=i(4725),a=i(8460),h=i(844),c=i(2585);let l=t.Viewport=class extends h.Disposable{constructor(e,t,i,s,r,o,h,c){super(),this._viewportElement=e,this._scrollArea=t,this._bufferService=i,this._optionsService=s,this._charSizeService=r,this._renderService=o,this._coreBrowserService=h,this.scrollBarWidth=0,this._currentRowHeight=0,this._currentDeviceCellHeight=0,this._lastRecordedBufferLength=0,this._lastRecordedViewportHeight=0,this._lastRecordedBufferHeight=0,this._lastTouchY=0,this._lastScrollTop=0,this._wheelPartialScroll=0,this._refreshAnimationFrame=null,this._ignoreNextScrollEvent=false,this._smoothScrollState={startTime:0,origin:-1,target:-1},this._onRequestScrollLines=this.register(new a.EventEmitter),this.onRequestScrollLines=this._onRequestScrollLines.event,this.scrollBarWidth=this._viewportElement.offsetWidth-this._scrollArea.offsetWidth||15,this.register((0, n.addDisposableDomListener)(this._viewportElement,"scroll",this._handleScroll.bind(this))),this._activeBuffer=this._bufferService.buffer,this.register(this._bufferService.buffers.onBufferActivate((e=>this._activeBuffer=e.activeBuffer))),this._renderDimensions=this._renderService.dimensions,this.register(this._renderService.onDimensionsChange((e=>this._renderDimensions=e))),this._handleThemeChange(c.colors),this.register(c.onChangeColors((e=>this._handleThemeChange(e)))),this.register(this._optionsService.onSpecificOptionChange("scrollback",(()=>this.syncScrollArea()))),setTimeout((()=>this.syncScrollArea()));}_handleThemeChange(e){this._viewportElement.style.backgroundColor=e.background.css;}reset(){this._currentRowHeight=0,this._currentDeviceCellHeight=0,this._lastRecordedBufferLength=0,this._lastRecordedViewportHeight=0,this._lastRecordedBufferHeight=0,this._lastTouchY=0,this._lastScrollTop=0,this._coreBrowserService.window.requestAnimationFrame((()=>this.syncScrollArea()));}_refresh(e){if(e)return this._innerRefresh(),void(null!==this._refreshAnimationFrame&&this._coreBrowserService.window.cancelAnimationFrame(this._refreshAnimationFrame));null===this._refreshAnimationFrame&&(this._refreshAnimationFrame=this._coreBrowserService.window.requestAnimationFrame((()=>this._innerRefresh())));}_innerRefresh(){if(this._charSizeService.height>0){this._currentRowHeight=this._renderService.dimensions.device.cell.height/this._coreBrowserService.dpr,this._currentDeviceCellHeight=this._renderService.dimensions.device.cell.height,this._lastRecordedViewportHeight=this._viewportElement.offsetHeight;const e=Math.round(this._currentRowHeight*this._lastRecordedBufferLength)+(this._lastRecordedViewportHeight-this._renderService.dimensions.css.canvas.height);this._lastRecordedBufferHeight!==e&&(this._lastRecordedBufferHeight=e,this._scrollArea.style.height=this._lastRecordedBufferHeight+"px");}const e=this._bufferService.buffer.ydisp*this._currentRowHeight;this._viewportElement.scrollTop!==e&&(this._ignoreNextScrollEvent=true,this._viewportElement.scrollTop=e),this._refreshAnimationFrame=null;}syncScrollArea(e=false){if(this._lastRecordedBufferLength!==this._bufferService.buffer.lines.length)return this._lastRecordedBufferLength=this._bufferService.buffer.lines.length,void this._refresh(e);this._lastRecordedViewportHeight===this._renderService.dimensions.css.canvas.height&&this._lastScrollTop===this._activeBuffer.ydisp*this._currentRowHeight&&this._renderDimensions.device.cell.height===this._currentDeviceCellHeight||this._refresh(e);}_handleScroll(e){if(this._lastScrollTop=this._viewportElement.scrollTop,!this._viewportElement.offsetParent)return;if(this._ignoreNextScrollEvent)return this._ignoreNextScrollEvent=false,void this._onRequestScrollLines.fire({amount:0,suppressScrollEvent:true});const t=Math.round(this._lastScrollTop/this._currentRowHeight)-this._bufferService.buffer.ydisp;this._onRequestScrollLines.fire({amount:t,suppressScrollEvent:true});}_smoothScroll(){if(this._isDisposed||-1===this._smoothScrollState.origin||-1===this._smoothScrollState.target)return;const e=this._smoothScrollPercent();this._viewportElement.scrollTop=this._smoothScrollState.origin+Math.round(e*(this._smoothScrollState.target-this._smoothScrollState.origin)),e<1?this._coreBrowserService.window.requestAnimationFrame((()=>this._smoothScroll())):this._clearSmoothScrollState();}_smoothScrollPercent(){return this._optionsService.rawOptions.smoothScrollDuration&&this._smoothScrollState.startTime?Math.max(Math.min((Date.now()-this._smoothScrollState.startTime)/this._optionsService.rawOptions.smoothScrollDuration,1),0):1}_clearSmoothScrollState(){this._smoothScrollState.startTime=0,this._smoothScrollState.origin=-1,this._smoothScrollState.target=-1;}_bubbleScroll(e,t){const i=this._viewportElement.scrollTop+this._lastRecordedViewportHeight;return !(t<0&&0!==this._viewportElement.scrollTop||t>0&&i<this._lastRecordedBufferHeight)||(e.cancelable&&e.preventDefault(),false)}handleWheel(e){const t=this._getPixelsScrolled(e);return 0!==t&&(this._optionsService.rawOptions.smoothScrollDuration?(this._smoothScrollState.startTime=Date.now(),this._smoothScrollPercent()<1?(this._smoothScrollState.origin=this._viewportElement.scrollTop,-1===this._smoothScrollState.target?this._smoothScrollState.target=this._viewportElement.scrollTop+t:this._smoothScrollState.target+=t,this._smoothScrollState.target=Math.max(Math.min(this._smoothScrollState.target,this._viewportElement.scrollHeight),0),this._smoothScroll()):this._clearSmoothScrollState()):this._viewportElement.scrollTop+=t,this._bubbleScroll(e,t))}scrollLines(e){if(0!==e)if(this._optionsService.rawOptions.smoothScrollDuration){const t=e*this._currentRowHeight;this._smoothScrollState.startTime=Date.now(),this._smoothScrollPercent()<1?(this._smoothScrollState.origin=this._viewportElement.scrollTop,this._smoothScrollState.target=this._smoothScrollState.origin+t,this._smoothScrollState.target=Math.max(Math.min(this._smoothScrollState.target,this._viewportElement.scrollHeight),0),this._smoothScroll()):this._clearSmoothScrollState();}else this._onRequestScrollLines.fire({amount:e,suppressScrollEvent:false});}_getPixelsScrolled(e){if(0===e.deltaY||e.shiftKey)return 0;let t=this._applyScrollModifier(e.deltaY,e);return e.deltaMode===WheelEvent.DOM_DELTA_LINE?t*=this._currentRowHeight:e.deltaMode===WheelEvent.DOM_DELTA_PAGE&&(t*=this._currentRowHeight*this._bufferService.rows),t}getBufferElements(e,t){var i;let s,r="";const n=[],o=null!=t?t:this._bufferService.buffer.lines.length,a=this._bufferService.buffer.lines;for(let t=e;t<o;t++){const e=a.get(t);if(!e)continue;const o=null===(i=a.get(t+1))||void 0===i?void 0:i.isWrapped;if(r+=e.translateToString(!o),!o||t===a.length-1){const e=document.createElement("div");e.textContent=r,n.push(e),r.length>0&&(s=e),r="";}}return {bufferElements:n,cursorElement:s}}getLinesScrolled(e){if(0===e.deltaY||e.shiftKey)return 0;let t=this._applyScrollModifier(e.deltaY,e);return e.deltaMode===WheelEvent.DOM_DELTA_PIXEL?(t/=this._currentRowHeight+0,this._wheelPartialScroll+=t,t=Math.floor(Math.abs(this._wheelPartialScroll))*(this._wheelPartialScroll>0?1:-1),this._wheelPartialScroll%=1):e.deltaMode===WheelEvent.DOM_DELTA_PAGE&&(t*=this._bufferService.rows),t}_applyScrollModifier(e,t){const i=this._optionsService.rawOptions.fastScrollModifier;return "alt"===i&&t.altKey||"ctrl"===i&&t.ctrlKey||"shift"===i&&t.shiftKey?e*this._optionsService.rawOptions.fastScrollSensitivity*this._optionsService.rawOptions.scrollSensitivity:e*this._optionsService.rawOptions.scrollSensitivity}handleTouchStart(e){this._lastTouchY=e.touches[0].pageY;}handleTouchMove(e){const t=this._lastTouchY-e.touches[0].pageY;return this._lastTouchY=e.touches[0].pageY,0!==t&&(this._viewportElement.scrollTop+=t,this._bubbleScroll(e,t))}};t.Viewport=l=s([r(2,c.IBufferService),r(3,c.IOptionsService),r(4,o.ICharSizeService),r(5,o.IRenderService),r(6,o.ICoreBrowserService),r(7,o.IThemeService)],l);},3107:function(e,t,i){var s=this&&this.__decorate||function(e,t,i,s){var r,n=arguments.length,o=n<3?t:null===s?s=Object.getOwnPropertyDescriptor(t,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,i,s);else for(var a=e.length-1;a>=0;a--)(r=e[a])&&(o=(n<3?r(o):n>3?r(t,i,o):r(t,i))||o);return n>3&&o&&Object.defineProperty(t,i,o),o},r=this&&this.__param||function(e,t){return function(i,s){t(i,s,e);}};Object.defineProperty(t,"__esModule",{value:true}),t.BufferDecorationRenderer=void 0;const n=i(3656),o=i(4725),a=i(844),h=i(2585);let c=t.BufferDecorationRenderer=class extends a.Disposable{constructor(e,t,i,s){super(),this._screenElement=e,this._bufferService=t,this._decorationService=i,this._renderService=s,this._decorationElements=new Map,this._altBufferIsActive=false,this._dimensionsChanged=false,this._container=document.createElement("div"),this._container.classList.add("xterm-decoration-container"),this._screenElement.appendChild(this._container),this.register(this._renderService.onRenderedViewportChange((()=>this._doRefreshDecorations()))),this.register(this._renderService.onDimensionsChange((()=>{this._dimensionsChanged=true,this._queueRefresh();}))),this.register((0, n.addDisposableDomListener)(window,"resize",(()=>this._queueRefresh()))),this.register(this._bufferService.buffers.onBufferActivate((()=>{this._altBufferIsActive=this._bufferService.buffer===this._bufferService.buffers.alt;}))),this.register(this._decorationService.onDecorationRegistered((()=>this._queueRefresh()))),this.register(this._decorationService.onDecorationRemoved((e=>this._removeDecoration(e)))),this.register((0, a.toDisposable)((()=>{this._container.remove(),this._decorationElements.clear();})));}_queueRefresh(){ void 0===this._animationFrame&&(this._animationFrame=this._renderService.addRefreshCallback((()=>{this._doRefreshDecorations(),this._animationFrame=void 0;})));}_doRefreshDecorations(){for(const e of this._decorationService.decorations)this._renderDecoration(e);this._dimensionsChanged=false;}_renderDecoration(e){this._refreshStyle(e),this._dimensionsChanged&&this._refreshXPosition(e);}_createElement(e){var t,i;const s=document.createElement("div");s.classList.add("xterm-decoration"),s.classList.toggle("xterm-decoration-top-layer","top"===(null===(t=null==e?void 0:e.options)||void 0===t?void 0:t.layer)),s.style.width=`${Math.round((e.options.width||1)*this._renderService.dimensions.css.cell.width)}px`,s.style.height=(e.options.height||1)*this._renderService.dimensions.css.cell.height+"px",s.style.top=(e.marker.line-this._bufferService.buffers.active.ydisp)*this._renderService.dimensions.css.cell.height+"px",s.style.lineHeight=`${this._renderService.dimensions.css.cell.height}px`;const r=null!==(i=e.options.x)&&void 0!==i?i:0;return r&&r>this._bufferService.cols&&(s.style.display="none"),this._refreshXPosition(e,s),s}_refreshStyle(e){const t=e.marker.line-this._bufferService.buffers.active.ydisp;if(t<0||t>=this._bufferService.rows)e.element&&(e.element.style.display="none",e.onRenderEmitter.fire(e.element));else {let i=this._decorationElements.get(e);i||(i=this._createElement(e),e.element=i,this._decorationElements.set(e,i),this._container.appendChild(i),e.onDispose((()=>{this._decorationElements.delete(e),i.remove();}))),i.style.top=t*this._renderService.dimensions.css.cell.height+"px",i.style.display=this._altBufferIsActive?"none":"block",e.onRenderEmitter.fire(i);}}_refreshXPosition(e,t=e.element){var i;if(!t)return;const s=null!==(i=e.options.x)&&void 0!==i?i:0;"right"===(e.options.anchor||"left")?t.style.right=s?s*this._renderService.dimensions.css.cell.width+"px":"":t.style.left=s?s*this._renderService.dimensions.css.cell.width+"px":"";}_removeDecoration(e){var t;null===(t=this._decorationElements.get(e))||void 0===t||t.remove(),this._decorationElements.delete(e),e.dispose();}};t.BufferDecorationRenderer=c=s([r(1,h.IBufferService),r(2,h.IDecorationService),r(3,o.IRenderService)],c);},5871:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.ColorZoneStore=void 0,t.ColorZoneStore=class{constructor(){this._zones=[],this._zonePool=[],this._zonePoolIndex=0,this._linePadding={full:0,left:0,center:0,right:0};}get zones(){return this._zonePool.length=Math.min(this._zonePool.length,this._zones.length),this._zones}clear(){this._zones.length=0,this._zonePoolIndex=0;}addDecoration(e){if(e.options.overviewRulerOptions){for(const t of this._zones)if(t.color===e.options.overviewRulerOptions.color&&t.position===e.options.overviewRulerOptions.position){if(this._lineIntersectsZone(t,e.marker.line))return;if(this._lineAdjacentToZone(t,e.marker.line,e.options.overviewRulerOptions.position))return void this._addLineToZone(t,e.marker.line)}if(this._zonePoolIndex<this._zonePool.length)return this._zonePool[this._zonePoolIndex].color=e.options.overviewRulerOptions.color,this._zonePool[this._zonePoolIndex].position=e.options.overviewRulerOptions.position,this._zonePool[this._zonePoolIndex].startBufferLine=e.marker.line,this._zonePool[this._zonePoolIndex].endBufferLine=e.marker.line,void this._zones.push(this._zonePool[this._zonePoolIndex++]);this._zones.push({color:e.options.overviewRulerOptions.color,position:e.options.overviewRulerOptions.position,startBufferLine:e.marker.line,endBufferLine:e.marker.line}),this._zonePool.push(this._zones[this._zones.length-1]),this._zonePoolIndex++;}}setPadding(e){this._linePadding=e;}_lineIntersectsZone(e,t){return t>=e.startBufferLine&&t<=e.endBufferLine}_lineAdjacentToZone(e,t,i){return t>=e.startBufferLine-this._linePadding[i||"full"]&&t<=e.endBufferLine+this._linePadding[i||"full"]}_addLineToZone(e,t){e.startBufferLine=Math.min(e.startBufferLine,t),e.endBufferLine=Math.max(e.endBufferLine,t);}};},5744:function(e,t,i){var s=this&&this.__decorate||function(e,t,i,s){var r,n=arguments.length,o=n<3?t:null===s?s=Object.getOwnPropertyDescriptor(t,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,i,s);else for(var a=e.length-1;a>=0;a--)(r=e[a])&&(o=(n<3?r(o):n>3?r(t,i,o):r(t,i))||o);return n>3&&o&&Object.defineProperty(t,i,o),o},r=this&&this.__param||function(e,t){return function(i,s){t(i,s,e);}};Object.defineProperty(t,"__esModule",{value:true}),t.OverviewRulerRenderer=void 0;const n=i(5871),o=i(3656),a=i(4725),h=i(844),c=i(2585),l={full:0,left:0,center:0,right:0},d={full:0,left:0,center:0,right:0},_={full:0,left:0,center:0,right:0};let u=t.OverviewRulerRenderer=class extends h.Disposable{get _width(){return this._optionsService.options.overviewRulerWidth||0}constructor(e,t,i,s,r,o,a){var c;super(),this._viewportElement=e,this._screenElement=t,this._bufferService=i,this._decorationService=s,this._renderService=r,this._optionsService=o,this._coreBrowseService=a,this._colorZoneStore=new n.ColorZoneStore,this._shouldUpdateDimensions=true,this._shouldUpdateAnchor=true,this._lastKnownBufferLength=0,this._canvas=document.createElement("canvas"),this._canvas.classList.add("xterm-decoration-overview-ruler"),this._refreshCanvasDimensions(),null===(c=this._viewportElement.parentElement)||void 0===c||c.insertBefore(this._canvas,this._viewportElement);const l=this._canvas.getContext("2d");if(!l)throw new Error("Ctx cannot be null");this._ctx=l,this._registerDecorationListeners(),this._registerBufferChangeListeners(),this._registerDimensionChangeListeners(),this.register((0, h.toDisposable)((()=>{var e;null===(e=this._canvas)||void 0===e||e.remove();})));}_registerDecorationListeners(){this.register(this._decorationService.onDecorationRegistered((()=>this._queueRefresh(void 0,true)))),this.register(this._decorationService.onDecorationRemoved((()=>this._queueRefresh(void 0,true))));}_registerBufferChangeListeners(){this.register(this._renderService.onRenderedViewportChange((()=>this._queueRefresh()))),this.register(this._bufferService.buffers.onBufferActivate((()=>{this._canvas.style.display=this._bufferService.buffer===this._bufferService.buffers.alt?"none":"block";}))),this.register(this._bufferService.onScroll((()=>{this._lastKnownBufferLength!==this._bufferService.buffers.normal.lines.length&&(this._refreshDrawHeightConstants(),this._refreshColorZonePadding());})));}_registerDimensionChangeListeners(){this.register(this._renderService.onRender((()=>{this._containerHeight&&this._containerHeight===this._screenElement.clientHeight||(this._queueRefresh(true),this._containerHeight=this._screenElement.clientHeight);}))),this.register(this._optionsService.onSpecificOptionChange("overviewRulerWidth",(()=>this._queueRefresh(true)))),this.register((0, o.addDisposableDomListener)(this._coreBrowseService.window,"resize",(()=>this._queueRefresh(true)))),this._queueRefresh(true);}_refreshDrawConstants(){const e=Math.floor(this._canvas.width/3),t=Math.ceil(this._canvas.width/3);d.full=this._canvas.width,d.left=e,d.center=t,d.right=e,this._refreshDrawHeightConstants(),_.full=0,_.left=0,_.center=d.left,_.right=d.left+d.center;}_refreshDrawHeightConstants(){l.full=Math.round(2*this._coreBrowseService.dpr);const e=this._canvas.height/this._bufferService.buffer.lines.length,t=Math.round(Math.max(Math.min(e,12),6)*this._coreBrowseService.dpr);l.left=t,l.center=t,l.right=t;}_refreshColorZonePadding(){this._colorZoneStore.setPadding({full:Math.floor(this._bufferService.buffers.active.lines.length/(this._canvas.height-1)*l.full),left:Math.floor(this._bufferService.buffers.active.lines.length/(this._canvas.height-1)*l.left),center:Math.floor(this._bufferService.buffers.active.lines.length/(this._canvas.height-1)*l.center),right:Math.floor(this._bufferService.buffers.active.lines.length/(this._canvas.height-1)*l.right)}),this._lastKnownBufferLength=this._bufferService.buffers.normal.lines.length;}_refreshCanvasDimensions(){this._canvas.style.width=`${this._width}px`,this._canvas.width=Math.round(this._width*this._coreBrowseService.dpr),this._canvas.style.height=`${this._screenElement.clientHeight}px`,this._canvas.height=Math.round(this._screenElement.clientHeight*this._coreBrowseService.dpr),this._refreshDrawConstants(),this._refreshColorZonePadding();}_refreshDecorations(){this._shouldUpdateDimensions&&this._refreshCanvasDimensions(),this._ctx.clearRect(0,0,this._canvas.width,this._canvas.height),this._colorZoneStore.clear();for(const e of this._decorationService.decorations)this._colorZoneStore.addDecoration(e);this._ctx.lineWidth=1;const e=this._colorZoneStore.zones;for(const t of e)"full"!==t.position&&this._renderColorZone(t);for(const t of e)"full"===t.position&&this._renderColorZone(t);this._shouldUpdateDimensions=false,this._shouldUpdateAnchor=false;}_renderColorZone(e){this._ctx.fillStyle=e.color,this._ctx.fillRect(_[e.position||"full"],Math.round((this._canvas.height-1)*(e.startBufferLine/this._bufferService.buffers.active.lines.length)-l[e.position||"full"]/2),d[e.position||"full"],Math.round((this._canvas.height-1)*((e.endBufferLine-e.startBufferLine)/this._bufferService.buffers.active.lines.length)+l[e.position||"full"]));}_queueRefresh(e,t){this._shouldUpdateDimensions=e||this._shouldUpdateDimensions,this._shouldUpdateAnchor=t||this._shouldUpdateAnchor,void 0===this._animationFrame&&(this._animationFrame=this._coreBrowseService.window.requestAnimationFrame((()=>{this._refreshDecorations(),this._animationFrame=void 0;})));}};t.OverviewRulerRenderer=u=s([r(2,c.IBufferService),r(3,c.IDecorationService),r(4,a.IRenderService),r(5,c.IOptionsService),r(6,a.ICoreBrowserService)],u);},2950:function(e,t,i){var s=this&&this.__decorate||function(e,t,i,s){var r,n=arguments.length,o=n<3?t:null===s?s=Object.getOwnPropertyDescriptor(t,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,i,s);else for(var a=e.length-1;a>=0;a--)(r=e[a])&&(o=(n<3?r(o):n>3?r(t,i,o):r(t,i))||o);return n>3&&o&&Object.defineProperty(t,i,o),o},r=this&&this.__param||function(e,t){return function(i,s){t(i,s,e);}};Object.defineProperty(t,"__esModule",{value:true}),t.CompositionHelper=void 0;const n=i(4725),o=i(2585),a=i(2584);let h=t.CompositionHelper=class{get isComposing(){return this._isComposing}constructor(e,t,i,s,r,n){this._textarea=e,this._compositionView=t,this._bufferService=i,this._optionsService=s,this._coreService=r,this._renderService=n,this._isComposing=false,this._isSendingComposition=false,this._compositionPosition={start:0,end:0},this._dataAlreadySent="";}compositionstart(){this._isComposing=true,this._compositionPosition.start=this._textarea.value.length,this._compositionView.textContent="",this._dataAlreadySent="",this._compositionView.classList.add("active");}compositionupdate(e){this._compositionView.textContent=e.data,this.updateCompositionElements(),setTimeout((()=>{this._compositionPosition.end=this._textarea.value.length;}),0);}compositionend(){this._finalizeComposition(true);}keydown(e){if(this._isComposing||this._isSendingComposition){if(229===e.keyCode)return  false;if(16===e.keyCode||17===e.keyCode||18===e.keyCode)return  false;this._finalizeComposition(false);}return 229!==e.keyCode||(this._handleAnyTextareaChanges(),false)}_finalizeComposition(e){if(this._compositionView.classList.remove("active"),this._isComposing=false,e){const e={start:this._compositionPosition.start,end:this._compositionPosition.end};this._isSendingComposition=true,setTimeout((()=>{if(this._isSendingComposition){let t;this._isSendingComposition=false,e.start+=this._dataAlreadySent.length,t=this._isComposing?this._textarea.value.substring(e.start,e.end):this._textarea.value.substring(e.start),t.length>0&&this._coreService.triggerDataEvent(t,true);}}),0);}else {this._isSendingComposition=false;const e=this._textarea.value.substring(this._compositionPosition.start,this._compositionPosition.end);this._coreService.triggerDataEvent(e,true);}}_handleAnyTextareaChanges(){const e=this._textarea.value;setTimeout((()=>{if(!this._isComposing){const t=this._textarea.value,i=t.replace(e,"");this._dataAlreadySent=i,t.length>e.length?this._coreService.triggerDataEvent(i,true):t.length<e.length?this._coreService.triggerDataEvent(`${a.C0.DEL}`,true):t.length===e.length&&t!==e&&this._coreService.triggerDataEvent(t,true);}}),0);}updateCompositionElements(e){if(this._isComposing){if(this._bufferService.buffer.isCursorInViewport){const e=Math.min(this._bufferService.buffer.x,this._bufferService.cols-1),t=this._renderService.dimensions.css.cell.height,i=this._bufferService.buffer.y*this._renderService.dimensions.css.cell.height,s=e*this._renderService.dimensions.css.cell.width;this._compositionView.style.left=s+"px",this._compositionView.style.top=i+"px",this._compositionView.style.height=t+"px",this._compositionView.style.lineHeight=t+"px",this._compositionView.style.fontFamily=this._optionsService.rawOptions.fontFamily,this._compositionView.style.fontSize=this._optionsService.rawOptions.fontSize+"px";const r=this._compositionView.getBoundingClientRect();this._textarea.style.left=s+"px",this._textarea.style.top=i+"px",this._textarea.style.width=Math.max(r.width,1)+"px",this._textarea.style.height=Math.max(r.height,1)+"px",this._textarea.style.lineHeight=r.height+"px";}e||setTimeout((()=>this.updateCompositionElements(true)),0);}}};t.CompositionHelper=h=s([r(2,o.IBufferService),r(3,o.IOptionsService),r(4,o.ICoreService),r(5,n.IRenderService)],h);},9806:(e,t)=>{function i(e,t,i){const s=i.getBoundingClientRect(),r=e.getComputedStyle(i),n=parseInt(r.getPropertyValue("padding-left")),o=parseInt(r.getPropertyValue("padding-top"));return [t.clientX-s.left-n,t.clientY-s.top-o]}Object.defineProperty(t,"__esModule",{value:true}),t.getCoords=t.getCoordsRelativeToElement=void 0,t.getCoordsRelativeToElement=i,t.getCoords=function(e,t,s,r,n,o,a,h,c){if(!o)return;const l=i(e,t,s);return l?(l[0]=Math.ceil((l[0]+(c?a/2:0))/a),l[1]=Math.ceil(l[1]/h),l[0]=Math.min(Math.max(l[0],1),r+(c?1:0)),l[1]=Math.min(Math.max(l[1],1),n),l):void 0};},9504:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.moveToCellSequence=void 0;const s=i(2584);function r(e,t,i,s){const r=e-n(e,i),a=t-n(t,i),l=Math.abs(r-a)-function(e,t,i){let s=0;const r=e-n(e,i),a=t-n(t,i);for(let n=0;n<Math.abs(r-a);n++){const a="A"===o(e,t)?-1:1,h=i.buffer.lines.get(r+a*n);(null==h?void 0:h.isWrapped)&&s++;}return s}(e,t,i);return c(l,h(o(e,t),s))}function n(e,t){let i=0,s=t.buffer.lines.get(e),r=null==s?void 0:s.isWrapped;for(;r&&e>=0&&e<t.rows;)i++,s=t.buffer.lines.get(--e),r=null==s?void 0:s.isWrapped;return i}function o(e,t){return e>t?"A":"B"}function a(e,t,i,s,r,n){let o=e,a=t,h="";for(;o!==i||a!==s;)o+=r?1:-1,r&&o>n.cols-1?(h+=n.buffer.translateBufferLineToString(a,false,e,o),o=0,e=0,a++):!r&&o<0&&(h+=n.buffer.translateBufferLineToString(a,false,0,e+1),o=n.cols-1,e=o,a--);return h+n.buffer.translateBufferLineToString(a,false,e,o)}function h(e,t){const i=t?"O":"[";return s.C0.ESC+i+e}function c(e,t){e=Math.floor(e);let i="";for(let s=0;s<e;s++)i+=t;return i}t.moveToCellSequence=function(e,t,i,s){const o=i.buffer.x,l=i.buffer.y;if(!i.buffer.hasScrollback)return function(e,t,i,s,o,l){return 0===r(t,s,o,l).length?"":c(a(e,t,e,t-n(t,o),false,o).length,h("D",l))}(o,l,0,t,i,s)+r(l,t,i,s)+function(e,t,i,s,o,l){let d;d=r(t,s,o,l).length>0?s-n(s,o):t;const _=s,u=function(e,t,i,s,o,a){let h;return h=r(i,s,o,a).length>0?s-n(s,o):t,e<i&&h<=s||e>=i&&h<s?"C":"D"}(e,t,i,s,o,l);return c(a(e,d,i,_,"C"===u,o).length,h(u,l))}(o,l,e,t,i,s);let d;if(l===t)return d=o>e?"D":"C",c(Math.abs(o-e),h(d,s));d=l>t?"D":"C";const _=Math.abs(l-t);return c(function(e,t){return t.cols-e}(l>t?e:o,i)+(_-1)*i.cols+1+((l>t?o:e)-1),h(d,s))};},1296:function(e,t,i){var s=this&&this.__decorate||function(e,t,i,s){var r,n=arguments.length,o=n<3?t:null===s?s=Object.getOwnPropertyDescriptor(t,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,i,s);else for(var a=e.length-1;a>=0;a--)(r=e[a])&&(o=(n<3?r(o):n>3?r(t,i,o):r(t,i))||o);return n>3&&o&&Object.defineProperty(t,i,o),o},r=this&&this.__param||function(e,t){return function(i,s){t(i,s,e);}};Object.defineProperty(t,"__esModule",{value:true}),t.DomRenderer=void 0;const n=i(3787),o=i(2550),a=i(2223),h=i(6171),c=i(4725),l=i(8055),d=i(8460),_=i(844),u=i(2585),f="xterm-dom-renderer-owner-",v="xterm-rows",p="xterm-fg-",g="xterm-bg-",m="xterm-focus",S="xterm-selection";let C=1,b=t.DomRenderer=class extends _.Disposable{constructor(e,t,i,s,r,a,c,l,u,p){super(),this._element=e,this._screenElement=t,this._viewportElement=i,this._linkifier2=s,this._charSizeService=a,this._optionsService=c,this._bufferService=l,this._coreBrowserService=u,this._themeService=p,this._terminalClass=C++,this._rowElements=[],this.onRequestRedraw=this.register(new d.EventEmitter).event,this._rowContainer=document.createElement("div"),this._rowContainer.classList.add(v),this._rowContainer.style.lineHeight="normal",this._rowContainer.setAttribute("aria-hidden","true"),this._refreshRowElements(this._bufferService.cols,this._bufferService.rows),this._selectionContainer=document.createElement("div"),this._selectionContainer.classList.add(S),this._selectionContainer.setAttribute("aria-hidden","true"),this.dimensions=(0, h.createRenderDimensions)(),this._updateDimensions(),this.register(this._optionsService.onOptionChange((()=>this._handleOptionsChanged()))),this.register(this._themeService.onChangeColors((e=>this._injectCss(e)))),this._injectCss(this._themeService.colors),this._rowFactory=r.createInstance(n.DomRendererRowFactory,document),this._element.classList.add(f+this._terminalClass),this._screenElement.appendChild(this._rowContainer),this._screenElement.appendChild(this._selectionContainer),this.register(this._linkifier2.onShowLinkUnderline((e=>this._handleLinkHover(e)))),this.register(this._linkifier2.onHideLinkUnderline((e=>this._handleLinkLeave(e)))),this.register((0, _.toDisposable)((()=>{this._element.classList.remove(f+this._terminalClass),this._rowContainer.remove(),this._selectionContainer.remove(),this._widthCache.dispose(),this._themeStyleElement.remove(),this._dimensionsStyleElement.remove();}))),this._widthCache=new o.WidthCache(document),this._widthCache.setFont(this._optionsService.rawOptions.fontFamily,this._optionsService.rawOptions.fontSize,this._optionsService.rawOptions.fontWeight,this._optionsService.rawOptions.fontWeightBold),this._setDefaultSpacing();}_updateDimensions(){const e=this._coreBrowserService.dpr;this.dimensions.device.char.width=this._charSizeService.width*e,this.dimensions.device.char.height=Math.ceil(this._charSizeService.height*e),this.dimensions.device.cell.width=this.dimensions.device.char.width+Math.round(this._optionsService.rawOptions.letterSpacing),this.dimensions.device.cell.height=Math.floor(this.dimensions.device.char.height*this._optionsService.rawOptions.lineHeight),this.dimensions.device.char.left=0,this.dimensions.device.char.top=0,this.dimensions.device.canvas.width=this.dimensions.device.cell.width*this._bufferService.cols,this.dimensions.device.canvas.height=this.dimensions.device.cell.height*this._bufferService.rows,this.dimensions.css.canvas.width=Math.round(this.dimensions.device.canvas.width/e),this.dimensions.css.canvas.height=Math.round(this.dimensions.device.canvas.height/e),this.dimensions.css.cell.width=this.dimensions.css.canvas.width/this._bufferService.cols,this.dimensions.css.cell.height=this.dimensions.css.canvas.height/this._bufferService.rows;for(const e of this._rowElements)e.style.width=`${this.dimensions.css.canvas.width}px`,e.style.height=`${this.dimensions.css.cell.height}px`,e.style.lineHeight=`${this.dimensions.css.cell.height}px`,e.style.overflow="hidden";this._dimensionsStyleElement||(this._dimensionsStyleElement=document.createElement("style"),this._screenElement.appendChild(this._dimensionsStyleElement));const t=`${this._terminalSelector} .${v} span { display: inline-block; height: 100%; vertical-align: top;}`;this._dimensionsStyleElement.textContent=t,this._selectionContainer.style.height=this._viewportElement.style.height,this._screenElement.style.width=`${this.dimensions.css.canvas.width}px`,this._screenElement.style.height=`${this.dimensions.css.canvas.height}px`;}_injectCss(e){this._themeStyleElement||(this._themeStyleElement=document.createElement("style"),this._screenElement.appendChild(this._themeStyleElement));let t=`${this._terminalSelector} .${v} { color: ${e.foreground.css}; font-family: ${this._optionsService.rawOptions.fontFamily}; font-size: ${this._optionsService.rawOptions.fontSize}px; font-kerning: none; white-space: pre}`;t+=`${this._terminalSelector} .${v} .xterm-dim { color: ${l.color.multiplyOpacity(e.foreground,.5).css};}`,t+=`${this._terminalSelector} span:not(.xterm-bold) { font-weight: ${this._optionsService.rawOptions.fontWeight};}${this._terminalSelector} span.xterm-bold { font-weight: ${this._optionsService.rawOptions.fontWeightBold};}${this._terminalSelector} span.xterm-italic { font-style: italic;}`,t+="@keyframes blink_box_shadow_"+this._terminalClass+" { 50% {  border-bottom-style: hidden; }}",t+="@keyframes blink_block_"+this._terminalClass+" { 0% {"+`  background-color: ${e.cursor.css};`+`  color: ${e.cursorAccent.css}; } 50% {  background-color: inherit;`+`  color: ${e.cursor.css}; }}`,t+=`${this._terminalSelector} .${v}.${m} .xterm-cursor.xterm-cursor-blink:not(.xterm-cursor-block) { animation: blink_box_shadow_`+this._terminalClass+" 1s step-end infinite;}"+`${this._terminalSelector} .${v}.${m} .xterm-cursor.xterm-cursor-blink.xterm-cursor-block { animation: blink_block_`+this._terminalClass+" 1s step-end infinite;}"+`${this._terminalSelector} .${v} .xterm-cursor.xterm-cursor-block {`+` background-color: ${e.cursor.css};`+` color: ${e.cursorAccent.css};}`+`${this._terminalSelector} .${v} .xterm-cursor.xterm-cursor-outline {`+` outline: 1px solid ${e.cursor.css}; outline-offset: -1px;}`+`${this._terminalSelector} .${v} .xterm-cursor.xterm-cursor-bar {`+` box-shadow: ${this._optionsService.rawOptions.cursorWidth}px 0 0 ${e.cursor.css} inset;}`+`${this._terminalSelector} .${v} .xterm-cursor.xterm-cursor-underline {`+` border-bottom: 1px ${e.cursor.css}; border-bottom-style: solid; height: calc(100% - 1px);}`,t+=`${this._terminalSelector} .${S} { position: absolute; top: 0; left: 0; z-index: 1; pointer-events: none;}${this._terminalSelector}.focus .${S} div { position: absolute; background-color: ${e.selectionBackgroundOpaque.css};}${this._terminalSelector} .${S} div { position: absolute; background-color: ${e.selectionInactiveBackgroundOpaque.css};}`;for(const[i,s]of e.ansi.entries())t+=`${this._terminalSelector} .${p}${i} { color: ${s.css}; }${this._terminalSelector} .${p}${i}.xterm-dim { color: ${l.color.multiplyOpacity(s,.5).css}; }${this._terminalSelector} .${g}${i} { background-color: ${s.css}; }`;t+=`${this._terminalSelector} .${p}${a.INVERTED_DEFAULT_COLOR} { color: ${l.color.opaque(e.background).css}; }${this._terminalSelector} .${p}${a.INVERTED_DEFAULT_COLOR}.xterm-dim { color: ${l.color.multiplyOpacity(l.color.opaque(e.background),.5).css}; }${this._terminalSelector} .${g}${a.INVERTED_DEFAULT_COLOR} { background-color: ${e.foreground.css}; }`,this._themeStyleElement.textContent=t;}_setDefaultSpacing(){const e=this.dimensions.css.cell.width-this._widthCache.get("W",false,false);this._rowContainer.style.letterSpacing=`${e}px`,this._rowFactory.defaultSpacing=e;}handleDevicePixelRatioChange(){this._updateDimensions(),this._widthCache.clear(),this._setDefaultSpacing();}_refreshRowElements(e,t){for(let e=this._rowElements.length;e<=t;e++){const e=document.createElement("div");this._rowContainer.appendChild(e),this._rowElements.push(e);}for(;this._rowElements.length>t;)this._rowContainer.removeChild(this._rowElements.pop());}handleResize(e,t){this._refreshRowElements(e,t),this._updateDimensions();}handleCharSizeChanged(){this._updateDimensions(),this._widthCache.clear(),this._setDefaultSpacing();}handleBlur(){this._rowContainer.classList.remove(m);}handleFocus(){this._rowContainer.classList.add(m),this.renderRows(this._bufferService.buffer.y,this._bufferService.buffer.y);}handleSelectionChanged(e,t,i){if(this._selectionContainer.replaceChildren(),this._rowFactory.handleSelectionChanged(e,t,i),this.renderRows(0,this._bufferService.rows-1),!e||!t)return;const s=e[1]-this._bufferService.buffer.ydisp,r=t[1]-this._bufferService.buffer.ydisp,n=Math.max(s,0),o=Math.min(r,this._bufferService.rows-1);if(n>=this._bufferService.rows||o<0)return;const a=document.createDocumentFragment();if(i){const i=e[0]>t[0];a.appendChild(this._createSelectionElement(n,i?t[0]:e[0],i?e[0]:t[0],o-n+1));}else {const i=s===n?e[0]:0,h=n===r?t[0]:this._bufferService.cols;a.appendChild(this._createSelectionElement(n,i,h));const c=o-n-1;if(a.appendChild(this._createSelectionElement(n+1,0,this._bufferService.cols,c)),n!==o){const e=r===o?t[0]:this._bufferService.cols;a.appendChild(this._createSelectionElement(o,0,e));}}this._selectionContainer.appendChild(a);}_createSelectionElement(e,t,i,s=1){const r=document.createElement("div");return r.style.height=s*this.dimensions.css.cell.height+"px",r.style.top=e*this.dimensions.css.cell.height+"px",r.style.left=t*this.dimensions.css.cell.width+"px",r.style.width=this.dimensions.css.cell.width*(i-t)+"px",r}handleCursorMove(){}_handleOptionsChanged(){this._updateDimensions(),this._injectCss(this._themeService.colors),this._widthCache.setFont(this._optionsService.rawOptions.fontFamily,this._optionsService.rawOptions.fontSize,this._optionsService.rawOptions.fontWeight,this._optionsService.rawOptions.fontWeightBold),this._setDefaultSpacing();}clear(){for(const e of this._rowElements)e.replaceChildren();}renderRows(e,t){const i=this._bufferService.buffer,s=i.ybase+i.y,r=Math.min(i.x,this._bufferService.cols-1),n=this._optionsService.rawOptions.cursorBlink,o=this._optionsService.rawOptions.cursorStyle,a=this._optionsService.rawOptions.cursorInactiveStyle;for(let h=e;h<=t;h++){const e=h+i.ydisp,t=this._rowElements[h],c=i.lines.get(e);if(!t||!c)break;t.replaceChildren(...this._rowFactory.createRow(c,e,e===s,o,a,r,n,this.dimensions.css.cell.width,this._widthCache,-1,-1));}}get _terminalSelector(){return `.${f}${this._terminalClass}`}_handleLinkHover(e){this._setCellUnderline(e.x1,e.x2,e.y1,e.y2,e.cols,true);}_handleLinkLeave(e){this._setCellUnderline(e.x1,e.x2,e.y1,e.y2,e.cols,false);}_setCellUnderline(e,t,i,s,r,n){i<0&&(e=0),s<0&&(t=0);const o=this._bufferService.rows-1;i=Math.max(Math.min(i,o),0),s=Math.max(Math.min(s,o),0),r=Math.min(r,this._bufferService.cols);const a=this._bufferService.buffer,h=a.ybase+a.y,c=Math.min(a.x,r-1),l=this._optionsService.rawOptions.cursorBlink,d=this._optionsService.rawOptions.cursorStyle,_=this._optionsService.rawOptions.cursorInactiveStyle;for(let o=i;o<=s;++o){const u=o+a.ydisp,f=this._rowElements[o],v=a.lines.get(u);if(!f||!v)break;f.replaceChildren(...this._rowFactory.createRow(v,u,u===h,d,_,c,l,this.dimensions.css.cell.width,this._widthCache,n?o===i?e:0:-1,n?(o===s?t:r)-1:-1));}}};t.DomRenderer=b=s([r(4,u.IInstantiationService),r(5,c.ICharSizeService),r(6,u.IOptionsService),r(7,u.IBufferService),r(8,c.ICoreBrowserService),r(9,c.IThemeService)],b);},3787:function(e,t,i){var s=this&&this.__decorate||function(e,t,i,s){var r,n=arguments.length,o=n<3?t:null===s?s=Object.getOwnPropertyDescriptor(t,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,i,s);else for(var a=e.length-1;a>=0;a--)(r=e[a])&&(o=(n<3?r(o):n>3?r(t,i,o):r(t,i))||o);return n>3&&o&&Object.defineProperty(t,i,o),o},r=this&&this.__param||function(e,t){return function(i,s){t(i,s,e);}};Object.defineProperty(t,"__esModule",{value:true}),t.DomRendererRowFactory=void 0;const n=i(2223),o=i(643),a=i(511),h=i(2585),c=i(8055),l=i(4725),d=i(4269),_=i(6171),u=i(3734);let f=t.DomRendererRowFactory=class{constructor(e,t,i,s,r,n,o){this._document=e,this._characterJoinerService=t,this._optionsService=i,this._coreBrowserService=s,this._coreService=r,this._decorationService=n,this._themeService=o,this._workCell=new a.CellData,this._columnSelectMode=false,this.defaultSpacing=0;}handleSelectionChanged(e,t,i){this._selectionStart=e,this._selectionEnd=t,this._columnSelectMode=i;}createRow(e,t,i,s,r,a,h,l,_,f,p){const g=[],m=this._characterJoinerService.getJoinedCharacters(t),S=this._themeService.colors;let C,b=e.getNoBgTrimmedLength();i&&b<a+1&&(b=a+1);let y=0,w="",E=0,k=0,L=0,D=false,R=0,x=false,A=0;const B=[],T=-1!==f&&-1!==p;for(let M=0;M<b;M++){e.loadCell(M,this._workCell);let b=this._workCell.getWidth();if(0===b)continue;let O=false,P=M,I=this._workCell;if(m.length>0&&M===m[0][0]){O=true;const t=m.shift();I=new d.JoinedCellData(this._workCell,e.translateToString(true,t[0],t[1]),t[1]-t[0]),P=t[1]-1,b=I.getWidth();}const H=this._isCellInSelection(M,t),F=i&&M===a,W=T&&M>=f&&M<=p;let U=false;this._decorationService.forEachDecorationAtCell(M,t,void 0,(e=>{U=true;}));let N=I.getChars()||o.WHITESPACE_CELL_CHAR;if(" "===N&&(I.isUnderline()||I.isOverline())&&(N=" "),A=b*l-_.get(N,I.isBold(),I.isItalic()),C){if(y&&(H&&x||!H&&!x&&I.bg===E)&&(H&&x&&S.selectionForeground||I.fg===k)&&I.extended.ext===L&&W===D&&A===R&&!F&&!O&&!U){w+=N,y++;continue}y&&(C.textContent=w),C=this._document.createElement("span"),y=0,w="";}else C=this._document.createElement("span");if(E=I.bg,k=I.fg,L=I.extended.ext,D=W,R=A,x=H,O&&a>=M&&a<=P&&(a=M),!this._coreService.isCursorHidden&&F)if(B.push("xterm-cursor"),this._coreBrowserService.isFocused)h&&B.push("xterm-cursor-blink"),B.push("bar"===s?"xterm-cursor-bar":"underline"===s?"xterm-cursor-underline":"xterm-cursor-block");else if(r)switch(r){case "outline":B.push("xterm-cursor-outline");break;case "block":B.push("xterm-cursor-block");break;case "bar":B.push("xterm-cursor-bar");break;case "underline":B.push("xterm-cursor-underline");}if(I.isBold()&&B.push("xterm-bold"),I.isItalic()&&B.push("xterm-italic"),I.isDim()&&B.push("xterm-dim"),w=I.isInvisible()?o.WHITESPACE_CELL_CHAR:I.getChars()||o.WHITESPACE_CELL_CHAR,I.isUnderline()&&(B.push(`xterm-underline-${I.extended.underlineStyle}`)," "===w&&(w=" "),!I.isUnderlineColorDefault()))if(I.isUnderlineColorRGB())C.style.textDecorationColor=`rgb(${u.AttributeData.toColorRGB(I.getUnderlineColor()).join(",")})`;else {let e=I.getUnderlineColor();this._optionsService.rawOptions.drawBoldTextInBrightColors&&I.isBold()&&e<8&&(e+=8),C.style.textDecorationColor=S.ansi[e].css;}I.isOverline()&&(B.push("xterm-overline")," "===w&&(w=" ")),I.isStrikethrough()&&B.push("xterm-strikethrough"),W&&(C.style.textDecoration="underline");let $=I.getFgColor(),j=I.getFgColorMode(),z=I.getBgColor(),K=I.getBgColorMode();const q=!!I.isInverse();if(q){const e=$;$=z,z=e;const t=j;j=K,K=t;}let V,G,X,J=false;switch(this._decorationService.forEachDecorationAtCell(M,t,void 0,(e=>{"top"!==e.options.layer&&J||(e.backgroundColorRGB&&(K=50331648,z=e.backgroundColorRGB.rgba>>8&16777215,V=e.backgroundColorRGB),e.foregroundColorRGB&&(j=50331648,$=e.foregroundColorRGB.rgba>>8&16777215,G=e.foregroundColorRGB),J="top"===e.options.layer);})),!J&&H&&(V=this._coreBrowserService.isFocused?S.selectionBackgroundOpaque:S.selectionInactiveBackgroundOpaque,z=V.rgba>>8&16777215,K=50331648,J=true,S.selectionForeground&&(j=50331648,$=S.selectionForeground.rgba>>8&16777215,G=S.selectionForeground)),J&&B.push("xterm-decoration-top"),K){case 16777216:case 33554432:X=S.ansi[z],B.push(`xterm-bg-${z}`);break;case 50331648:X=c.rgba.toColor(z>>16,z>>8&255,255&z),this._addStyle(C,`background-color:#${v((z>>>0).toString(16),"0",6)}`);break;default:q?(X=S.foreground,B.push(`xterm-bg-${n.INVERTED_DEFAULT_COLOR}`)):X=S.background;}switch(V||I.isDim()&&(V=c.color.multiplyOpacity(X,.5)),j){case 16777216:case 33554432:I.isBold()&&$<8&&this._optionsService.rawOptions.drawBoldTextInBrightColors&&($+=8),this._applyMinimumContrast(C,X,S.ansi[$],I,V,void 0)||B.push(`xterm-fg-${$}`);break;case 50331648:const e=c.rgba.toColor($>>16&255,$>>8&255,255&$);this._applyMinimumContrast(C,X,e,I,V,G)||this._addStyle(C,`color:#${v($.toString(16),"0",6)}`);break;default:this._applyMinimumContrast(C,X,S.foreground,I,V,void 0)||q&&B.push(`xterm-fg-${n.INVERTED_DEFAULT_COLOR}`);}B.length&&(C.className=B.join(" "),B.length=0),F||O||U?C.textContent=w:y++,A!==this.defaultSpacing&&(C.style.letterSpacing=`${A}px`),g.push(C),M=P;}return C&&y&&(C.textContent=w),g}_applyMinimumContrast(e,t,i,s,r,n){if(1===this._optionsService.rawOptions.minimumContrastRatio||(0, _.excludeFromContrastRatioDemands)(s.getCode()))return  false;const o=this._getContrastCache(s);let a;if(r||n||(a=o.getColor(t.rgba,i.rgba)),void 0===a){const e=this._optionsService.rawOptions.minimumContrastRatio/(s.isDim()?2:1);a=c.color.ensureContrastRatio(r||t,n||i,e),o.setColor((r||t).rgba,(n||i).rgba,null!=a?a:null);}return !!a&&(this._addStyle(e,`color:${a.css}`),true)}_getContrastCache(e){return e.isDim()?this._themeService.colors.halfContrastCache:this._themeService.colors.contrastCache}_addStyle(e,t){e.setAttribute("style",`${e.getAttribute("style")||""}${t};`);}_isCellInSelection(e,t){const i=this._selectionStart,s=this._selectionEnd;return !(!i||!s)&&(this._columnSelectMode?i[0]<=s[0]?e>=i[0]&&t>=i[1]&&e<s[0]&&t<=s[1]:e<i[0]&&t>=i[1]&&e>=s[0]&&t<=s[1]:t>i[1]&&t<s[1]||i[1]===s[1]&&t===i[1]&&e>=i[0]&&e<s[0]||i[1]<s[1]&&t===s[1]&&e<s[0]||i[1]<s[1]&&t===i[1]&&e>=i[0])}};function v(e,t,i){for(;e.length<i;)e=t+e;return e}t.DomRendererRowFactory=f=s([r(1,l.ICharacterJoinerService),r(2,h.IOptionsService),r(3,l.ICoreBrowserService),r(4,h.ICoreService),r(5,h.IDecorationService),r(6,l.IThemeService)],f);},2550:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.WidthCache=void 0,t.WidthCache=class{constructor(e){this._flat=new Float32Array(256),this._font="",this._fontSize=0,this._weight="normal",this._weightBold="bold",this._measureElements=[],this._container=e.createElement("div"),this._container.style.position="absolute",this._container.style.top="-50000px",this._container.style.width="50000px",this._container.style.whiteSpace="pre",this._container.style.fontKerning="none";const t=e.createElement("span"),i=e.createElement("span");i.style.fontWeight="bold";const s=e.createElement("span");s.style.fontStyle="italic";const r=e.createElement("span");r.style.fontWeight="bold",r.style.fontStyle="italic",this._measureElements=[t,i,s,r],this._container.appendChild(t),this._container.appendChild(i),this._container.appendChild(s),this._container.appendChild(r),e.body.appendChild(this._container),this.clear();}dispose(){this._container.remove(),this._measureElements.length=0,this._holey=void 0;}clear(){this._flat.fill(-9999),this._holey=new Map;}setFont(e,t,i,s){e===this._font&&t===this._fontSize&&i===this._weight&&s===this._weightBold||(this._font=e,this._fontSize=t,this._weight=i,this._weightBold=s,this._container.style.fontFamily=this._font,this._container.style.fontSize=`${this._fontSize}px`,this._measureElements[0].style.fontWeight=`${i}`,this._measureElements[1].style.fontWeight=`${s}`,this._measureElements[2].style.fontWeight=`${i}`,this._measureElements[3].style.fontWeight=`${s}`,this.clear());}get(e,t,i){let s=0;if(!t&&!i&&1===e.length&&(s=e.charCodeAt(0))<256)return  -9999!==this._flat[s]?this._flat[s]:this._flat[s]=this._measure(e,0);let r=e;t&&(r+="B"),i&&(r+="I");let n=this._holey.get(r);if(void 0===n){let s=0;t&&(s|=1),i&&(s|=2),n=this._measure(e,s),this._holey.set(r,n);}return n}_measure(e,t){const i=this._measureElements[t];return i.textContent=e.repeat(32),i.offsetWidth/32}};},2223:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.TEXT_BASELINE=t.DIM_OPACITY=t.INVERTED_DEFAULT_COLOR=void 0;const s=i(6114);t.INVERTED_DEFAULT_COLOR=257,t.DIM_OPACITY=.5,t.TEXT_BASELINE=s.isFirefox||s.isLegacyEdge?"bottom":"ideographic";},6171:(e,t)=>{function i(e){return 57508<=e&&e<=57558}Object.defineProperty(t,"__esModule",{value:true}),t.createRenderDimensions=t.excludeFromContrastRatioDemands=t.isRestrictedPowerlineGlyph=t.isPowerlineGlyph=t.throwIfFalsy=void 0,t.throwIfFalsy=function(e){if(!e)throw new Error("value must not be falsy");return e},t.isPowerlineGlyph=i,t.isRestrictedPowerlineGlyph=function(e){return 57520<=e&&e<=57527},t.excludeFromContrastRatioDemands=function(e){return i(e)||function(e){return 9472<=e&&e<=9631}(e)},t.createRenderDimensions=function(){return {css:{canvas:{width:0,height:0},cell:{width:0,height:0}},device:{canvas:{width:0,height:0},cell:{width:0,height:0},char:{width:0,height:0,left:0,top:0}}}};},456:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.SelectionModel=void 0,t.SelectionModel=class{constructor(e){this._bufferService=e,this.isSelectAllActive=false,this.selectionStartLength=0;}clearSelection(){this.selectionStart=void 0,this.selectionEnd=void 0,this.isSelectAllActive=false,this.selectionStartLength=0;}get finalSelectionStart(){return this.isSelectAllActive?[0,0]:this.selectionEnd&&this.selectionStart&&this.areSelectionValuesReversed()?this.selectionEnd:this.selectionStart}get finalSelectionEnd(){if(this.isSelectAllActive)return [this._bufferService.cols,this._bufferService.buffer.ybase+this._bufferService.rows-1];if(this.selectionStart){if(!this.selectionEnd||this.areSelectionValuesReversed()){const e=this.selectionStart[0]+this.selectionStartLength;return e>this._bufferService.cols?e%this._bufferService.cols==0?[this._bufferService.cols,this.selectionStart[1]+Math.floor(e/this._bufferService.cols)-1]:[e%this._bufferService.cols,this.selectionStart[1]+Math.floor(e/this._bufferService.cols)]:[e,this.selectionStart[1]]}if(this.selectionStartLength&&this.selectionEnd[1]===this.selectionStart[1]){const e=this.selectionStart[0]+this.selectionStartLength;return e>this._bufferService.cols?[e%this._bufferService.cols,this.selectionStart[1]+Math.floor(e/this._bufferService.cols)]:[Math.max(e,this.selectionEnd[0]),this.selectionEnd[1]]}return this.selectionEnd}}areSelectionValuesReversed(){const e=this.selectionStart,t=this.selectionEnd;return !(!e||!t)&&(e[1]>t[1]||e[1]===t[1]&&e[0]>t[0])}handleTrim(e){return this.selectionStart&&(this.selectionStart[1]-=e),this.selectionEnd&&(this.selectionEnd[1]-=e),this.selectionEnd&&this.selectionEnd[1]<0?(this.clearSelection(),true):(this.selectionStart&&this.selectionStart[1]<0&&(this.selectionStart[1]=0),false)}};},428:function(e,t,i){var s=this&&this.__decorate||function(e,t,i,s){var r,n=arguments.length,o=n<3?t:null===s?s=Object.getOwnPropertyDescriptor(t,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,i,s);else for(var a=e.length-1;a>=0;a--)(r=e[a])&&(o=(n<3?r(o):n>3?r(t,i,o):r(t,i))||o);return n>3&&o&&Object.defineProperty(t,i,o),o},r=this&&this.__param||function(e,t){return function(i,s){t(i,s,e);}};Object.defineProperty(t,"__esModule",{value:true}),t.CharSizeService=void 0;const n=i(2585),o=i(8460),a=i(844);let h=t.CharSizeService=class extends a.Disposable{get hasValidSize(){return this.width>0&&this.height>0}constructor(e,t,i){super(),this._optionsService=i,this.width=0,this.height=0,this._onCharSizeChange=this.register(new o.EventEmitter),this.onCharSizeChange=this._onCharSizeChange.event,this._measureStrategy=new c(e,t,this._optionsService),this.register(this._optionsService.onMultipleOptionChange(["fontFamily","fontSize"],(()=>this.measure())));}measure(){const e=this._measureStrategy.measure();e.width===this.width&&e.height===this.height||(this.width=e.width,this.height=e.height,this._onCharSizeChange.fire());}};t.CharSizeService=h=s([r(2,n.IOptionsService)],h);class c{constructor(e,t,i){this._document=e,this._parentElement=t,this._optionsService=i,this._result={width:0,height:0},this._measureElement=this._document.createElement("span"),this._measureElement.classList.add("xterm-char-measure-element"),this._measureElement.textContent="W".repeat(32),this._measureElement.setAttribute("aria-hidden","true"),this._measureElement.style.whiteSpace="pre",this._measureElement.style.fontKerning="none",this._parentElement.appendChild(this._measureElement);}measure(){this._measureElement.style.fontFamily=this._optionsService.rawOptions.fontFamily,this._measureElement.style.fontSize=`${this._optionsService.rawOptions.fontSize}px`;const e={height:Number(this._measureElement.offsetHeight),width:Number(this._measureElement.offsetWidth)};return 0!==e.width&&0!==e.height&&(this._result.width=e.width/32,this._result.height=Math.ceil(e.height)),this._result}}},4269:function(e,t,i){var s=this&&this.__decorate||function(e,t,i,s){var r,n=arguments.length,o=n<3?t:null===s?s=Object.getOwnPropertyDescriptor(t,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,i,s);else for(var a=e.length-1;a>=0;a--)(r=e[a])&&(o=(n<3?r(o):n>3?r(t,i,o):r(t,i))||o);return n>3&&o&&Object.defineProperty(t,i,o),o},r=this&&this.__param||function(e,t){return function(i,s){t(i,s,e);}};Object.defineProperty(t,"__esModule",{value:true}),t.CharacterJoinerService=t.JoinedCellData=void 0;const n=i(3734),o=i(643),a=i(511),h=i(2585);class c extends n.AttributeData{constructor(e,t,i){super(),this.content=0,this.combinedData="",this.fg=e.fg,this.bg=e.bg,this.combinedData=t,this._width=i;}isCombined(){return 2097152}getWidth(){return this._width}getChars(){return this.combinedData}getCode(){return 2097151}setFromCharData(e){throw new Error("not implemented")}getAsCharData(){return [this.fg,this.getChars(),this.getWidth(),this.getCode()]}}t.JoinedCellData=c;let l=t.CharacterJoinerService=class e{constructor(e){this._bufferService=e,this._characterJoiners=[],this._nextCharacterJoinerId=0,this._workCell=new a.CellData;}register(e){const t={id:this._nextCharacterJoinerId++,handler:e};return this._characterJoiners.push(t),t.id}deregister(e){for(let t=0;t<this._characterJoiners.length;t++)if(this._characterJoiners[t].id===e)return this._characterJoiners.splice(t,1),true;return  false}getJoinedCharacters(e){if(0===this._characterJoiners.length)return [];const t=this._bufferService.buffer.lines.get(e);if(!t||0===t.length)return [];const i=[],s=t.translateToString(true);let r=0,n=0,a=0,h=t.getFg(0),c=t.getBg(0);for(let e=0;e<t.getTrimmedLength();e++)if(t.loadCell(e,this._workCell),0!==this._workCell.getWidth()){if(this._workCell.fg!==h||this._workCell.bg!==c){if(e-r>1){const e=this._getJoinedRanges(s,a,n,t,r);for(let t=0;t<e.length;t++)i.push(e[t]);}r=e,a=n,h=this._workCell.fg,c=this._workCell.bg;}n+=this._workCell.getChars().length||o.WHITESPACE_CELL_CHAR.length;}if(this._bufferService.cols-r>1){const e=this._getJoinedRanges(s,a,n,t,r);for(let t=0;t<e.length;t++)i.push(e[t]);}return i}_getJoinedRanges(t,i,s,r,n){const o=t.substring(i,s);let a=[];try{a=this._characterJoiners[0].handler(o);}catch(e){console.error(e);}for(let t=1;t<this._characterJoiners.length;t++)try{const i=this._characterJoiners[t].handler(o);for(let t=0;t<i.length;t++)e._mergeRanges(a,i[t]);}catch(e){console.error(e);}return this._stringRangesToCellRanges(a,r,n),a}_stringRangesToCellRanges(e,t,i){let s=0,r=false,n=0,a=e[s];if(a){for(let h=i;h<this._bufferService.cols;h++){const i=t.getWidth(h),c=t.getString(h).length||o.WHITESPACE_CELL_CHAR.length;if(0!==i){if(!r&&a[0]<=n&&(a[0]=h,r=true),a[1]<=n){if(a[1]=h,a=e[++s],!a)break;a[0]<=n?(a[0]=h,r=true):r=false;}n+=c;}}a&&(a[1]=this._bufferService.cols);}}static _mergeRanges(e,t){let i=false;for(let s=0;s<e.length;s++){const r=e[s];if(i){if(t[1]<=r[0])return e[s-1][1]=t[1],e;if(t[1]<=r[1])return e[s-1][1]=Math.max(t[1],r[1]),e.splice(s,1),e;e.splice(s,1),s--;}else {if(t[1]<=r[0])return e.splice(s,0,t),e;if(t[1]<=r[1])return r[0]=Math.min(t[0],r[0]),e;t[0]<r[1]&&(r[0]=Math.min(t[0],r[0]),i=true);}}return i?e[e.length-1][1]=t[1]:e.push(t),e}};t.CharacterJoinerService=l=s([r(0,h.IBufferService)],l);},5114:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.CoreBrowserService=void 0,t.CoreBrowserService=class{constructor(e,t){this._textarea=e,this.window=t,this._isFocused=false,this._cachedIsFocused=void 0,this._textarea.addEventListener("focus",(()=>this._isFocused=true)),this._textarea.addEventListener("blur",(()=>this._isFocused=false));}get dpr(){return this.window.devicePixelRatio}get isFocused(){return void 0===this._cachedIsFocused&&(this._cachedIsFocused=this._isFocused&&this._textarea.ownerDocument.hasFocus(),queueMicrotask((()=>this._cachedIsFocused=void 0))),this._cachedIsFocused}};},8934:function(e,t,i){var s=this&&this.__decorate||function(e,t,i,s){var r,n=arguments.length,o=n<3?t:null===s?s=Object.getOwnPropertyDescriptor(t,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,i,s);else for(var a=e.length-1;a>=0;a--)(r=e[a])&&(o=(n<3?r(o):n>3?r(t,i,o):r(t,i))||o);return n>3&&o&&Object.defineProperty(t,i,o),o},r=this&&this.__param||function(e,t){return function(i,s){t(i,s,e);}};Object.defineProperty(t,"__esModule",{value:true}),t.MouseService=void 0;const n=i(4725),o=i(9806);let a=t.MouseService=class{constructor(e,t){this._renderService=e,this._charSizeService=t;}getCoords(e,t,i,s,r){return (0, o.getCoords)(window,e,t,i,s,this._charSizeService.hasValidSize,this._renderService.dimensions.css.cell.width,this._renderService.dimensions.css.cell.height,r)}getMouseReportCoords(e,t){const i=(0, o.getCoordsRelativeToElement)(window,e,t);if(this._charSizeService.hasValidSize)return i[0]=Math.min(Math.max(i[0],0),this._renderService.dimensions.css.canvas.width-1),i[1]=Math.min(Math.max(i[1],0),this._renderService.dimensions.css.canvas.height-1),{col:Math.floor(i[0]/this._renderService.dimensions.css.cell.width),row:Math.floor(i[1]/this._renderService.dimensions.css.cell.height),x:Math.floor(i[0]),y:Math.floor(i[1])}}};t.MouseService=a=s([r(0,n.IRenderService),r(1,n.ICharSizeService)],a);},3230:function(e,t,i){var s=this&&this.__decorate||function(e,t,i,s){var r,n=arguments.length,o=n<3?t:null===s?s=Object.getOwnPropertyDescriptor(t,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,i,s);else for(var a=e.length-1;a>=0;a--)(r=e[a])&&(o=(n<3?r(o):n>3?r(t,i,o):r(t,i))||o);return n>3&&o&&Object.defineProperty(t,i,o),o},r=this&&this.__param||function(e,t){return function(i,s){t(i,s,e);}};Object.defineProperty(t,"__esModule",{value:true}),t.RenderService=void 0;const n=i(3656),o=i(6193),a=i(5596),h=i(4725),c=i(8460),l=i(844),d=i(7226),_=i(2585);let u=t.RenderService=class extends l.Disposable{get dimensions(){return this._renderer.value.dimensions}constructor(e,t,i,s,r,h,_,u){if(super(),this._rowCount=e,this._charSizeService=s,this._renderer=this.register(new l.MutableDisposable),this._pausedResizeTask=new d.DebouncedIdleTask,this._isPaused=false,this._needsFullRefresh=false,this._isNextRenderRedrawOnly=true,this._needsSelectionRefresh=false,this._canvasWidth=0,this._canvasHeight=0,this._selectionState={start:void 0,end:void 0,columnSelectMode:false},this._onDimensionsChange=this.register(new c.EventEmitter),this.onDimensionsChange=this._onDimensionsChange.event,this._onRenderedViewportChange=this.register(new c.EventEmitter),this.onRenderedViewportChange=this._onRenderedViewportChange.event,this._onRender=this.register(new c.EventEmitter),this.onRender=this._onRender.event,this._onRefreshRequest=this.register(new c.EventEmitter),this.onRefreshRequest=this._onRefreshRequest.event,this._renderDebouncer=new o.RenderDebouncer(_.window,((e,t)=>this._renderRows(e,t))),this.register(this._renderDebouncer),this._screenDprMonitor=new a.ScreenDprMonitor(_.window),this._screenDprMonitor.setListener((()=>this.handleDevicePixelRatioChange())),this.register(this._screenDprMonitor),this.register(h.onResize((()=>this._fullRefresh()))),this.register(h.buffers.onBufferActivate((()=>{var e;return null===(e=this._renderer.value)||void 0===e?void 0:e.clear()}))),this.register(i.onOptionChange((()=>this._handleOptionsChanged()))),this.register(this._charSizeService.onCharSizeChange((()=>this.handleCharSizeChanged()))),this.register(r.onDecorationRegistered((()=>this._fullRefresh()))),this.register(r.onDecorationRemoved((()=>this._fullRefresh()))),this.register(i.onMultipleOptionChange(["customGlyphs","drawBoldTextInBrightColors","letterSpacing","lineHeight","fontFamily","fontSize","fontWeight","fontWeightBold","minimumContrastRatio"],(()=>{this.clear(),this.handleResize(h.cols,h.rows),this._fullRefresh();}))),this.register(i.onMultipleOptionChange(["cursorBlink","cursorStyle"],(()=>this.refreshRows(h.buffer.y,h.buffer.y,true)))),this.register((0, n.addDisposableDomListener)(_.window,"resize",(()=>this.handleDevicePixelRatioChange()))),this.register(u.onChangeColors((()=>this._fullRefresh()))),"IntersectionObserver"in _.window){const e=new _.window.IntersectionObserver((e=>this._handleIntersectionChange(e[e.length-1])),{threshold:0});e.observe(t),this.register({dispose:()=>e.disconnect()});}}_handleIntersectionChange(e){this._isPaused=void 0===e.isIntersecting?0===e.intersectionRatio:!e.isIntersecting,this._isPaused||this._charSizeService.hasValidSize||this._charSizeService.measure(),!this._isPaused&&this._needsFullRefresh&&(this._pausedResizeTask.flush(),this.refreshRows(0,this._rowCount-1),this._needsFullRefresh=false);}refreshRows(e,t,i=false){this._isPaused?this._needsFullRefresh=true:(i||(this._isNextRenderRedrawOnly=false),this._renderDebouncer.refresh(e,t,this._rowCount));}_renderRows(e,t){this._renderer.value&&(e=Math.min(e,this._rowCount-1),t=Math.min(t,this._rowCount-1),this._renderer.value.renderRows(e,t),this._needsSelectionRefresh&&(this._renderer.value.handleSelectionChanged(this._selectionState.start,this._selectionState.end,this._selectionState.columnSelectMode),this._needsSelectionRefresh=false),this._isNextRenderRedrawOnly||this._onRenderedViewportChange.fire({start:e,end:t}),this._onRender.fire({start:e,end:t}),this._isNextRenderRedrawOnly=true);}resize(e,t){this._rowCount=t,this._fireOnCanvasResize();}_handleOptionsChanged(){this._renderer.value&&(this.refreshRows(0,this._rowCount-1),this._fireOnCanvasResize());}_fireOnCanvasResize(){this._renderer.value&&(this._renderer.value.dimensions.css.canvas.width===this._canvasWidth&&this._renderer.value.dimensions.css.canvas.height===this._canvasHeight||this._onDimensionsChange.fire(this._renderer.value.dimensions));}hasRenderer(){return !!this._renderer.value}setRenderer(e){this._renderer.value=e,this._renderer.value.onRequestRedraw((e=>this.refreshRows(e.start,e.end,true))),this._needsSelectionRefresh=true,this._fullRefresh();}addRefreshCallback(e){return this._renderDebouncer.addRefreshCallback(e)}_fullRefresh(){this._isPaused?this._needsFullRefresh=true:this.refreshRows(0,this._rowCount-1);}clearTextureAtlas(){var e,t;this._renderer.value&&(null===(t=(e=this._renderer.value).clearTextureAtlas)||void 0===t||t.call(e),this._fullRefresh());}handleDevicePixelRatioChange(){this._charSizeService.measure(),this._renderer.value&&(this._renderer.value.handleDevicePixelRatioChange(),this.refreshRows(0,this._rowCount-1));}handleResize(e,t){this._renderer.value&&(this._isPaused?this._pausedResizeTask.set((()=>this._renderer.value.handleResize(e,t))):this._renderer.value.handleResize(e,t),this._fullRefresh());}handleCharSizeChanged(){var e;null===(e=this._renderer.value)||void 0===e||e.handleCharSizeChanged();}handleBlur(){var e;null===(e=this._renderer.value)||void 0===e||e.handleBlur();}handleFocus(){var e;null===(e=this._renderer.value)||void 0===e||e.handleFocus();}handleSelectionChanged(e,t,i){var s;this._selectionState.start=e,this._selectionState.end=t,this._selectionState.columnSelectMode=i,null===(s=this._renderer.value)||void 0===s||s.handleSelectionChanged(e,t,i);}handleCursorMove(){var e;null===(e=this._renderer.value)||void 0===e||e.handleCursorMove();}clear(){var e;null===(e=this._renderer.value)||void 0===e||e.clear();}};t.RenderService=u=s([r(2,_.IOptionsService),r(3,h.ICharSizeService),r(4,_.IDecorationService),r(5,_.IBufferService),r(6,h.ICoreBrowserService),r(7,h.IThemeService)],u);},9312:function(e,t,i){var s=this&&this.__decorate||function(e,t,i,s){var r,n=arguments.length,o=n<3?t:null===s?s=Object.getOwnPropertyDescriptor(t,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,i,s);else for(var a=e.length-1;a>=0;a--)(r=e[a])&&(o=(n<3?r(o):n>3?r(t,i,o):r(t,i))||o);return n>3&&o&&Object.defineProperty(t,i,o),o},r=this&&this.__param||function(e,t){return function(i,s){t(i,s,e);}};Object.defineProperty(t,"__esModule",{value:true}),t.SelectionService=void 0;const n=i(9806),o=i(9504),a=i(456),h=i(4725),c=i(8460),l=i(844),d=i(6114),_=i(4841),u=i(511),f=i(2585),v=String.fromCharCode(160),p=new RegExp(v,"g");let g=t.SelectionService=class extends l.Disposable{constructor(e,t,i,s,r,n,o,h,d){super(),this._element=e,this._screenElement=t,this._linkifier=i,this._bufferService=s,this._coreService=r,this._mouseService=n,this._optionsService=o,this._renderService=h,this._coreBrowserService=d,this._dragScrollAmount=0,this._enabled=true,this._workCell=new u.CellData,this._mouseDownTimeStamp=0,this._oldHasSelection=false,this._oldSelectionStart=void 0,this._oldSelectionEnd=void 0,this._onLinuxMouseSelection=this.register(new c.EventEmitter),this.onLinuxMouseSelection=this._onLinuxMouseSelection.event,this._onRedrawRequest=this.register(new c.EventEmitter),this.onRequestRedraw=this._onRedrawRequest.event,this._onSelectionChange=this.register(new c.EventEmitter),this.onSelectionChange=this._onSelectionChange.event,this._onRequestScrollLines=this.register(new c.EventEmitter),this.onRequestScrollLines=this._onRequestScrollLines.event,this._mouseMoveListener=e=>this._handleMouseMove(e),this._mouseUpListener=e=>this._handleMouseUp(e),this._coreService.onUserInput((()=>{this.hasSelection&&this.clearSelection();})),this._trimListener=this._bufferService.buffer.lines.onTrim((e=>this._handleTrim(e))),this.register(this._bufferService.buffers.onBufferActivate((e=>this._handleBufferActivate(e)))),this.enable(),this._model=new a.SelectionModel(this._bufferService),this._activeSelectionMode=0,this.register((0, l.toDisposable)((()=>{this._removeMouseDownListeners();})));}reset(){this.clearSelection();}disable(){this.clearSelection(),this._enabled=false;}enable(){this._enabled=true;}get selectionStart(){return this._model.finalSelectionStart}get selectionEnd(){return this._model.finalSelectionEnd}get hasSelection(){const e=this._model.finalSelectionStart,t=this._model.finalSelectionEnd;return !(!e||!t||e[0]===t[0]&&e[1]===t[1])}get selectionText(){const e=this._model.finalSelectionStart,t=this._model.finalSelectionEnd;if(!e||!t)return "";const i=this._bufferService.buffer,s=[];if(3===this._activeSelectionMode){if(e[0]===t[0])return "";const r=e[0]<t[0]?e[0]:t[0],n=e[0]<t[0]?t[0]:e[0];for(let o=e[1];o<=t[1];o++){const e=i.translateBufferLineToString(o,true,r,n);s.push(e);}}else {const r=e[1]===t[1]?t[0]:void 0;s.push(i.translateBufferLineToString(e[1],true,e[0],r));for(let r=e[1]+1;r<=t[1]-1;r++){const e=i.lines.get(r),t=i.translateBufferLineToString(r,true);(null==e?void 0:e.isWrapped)?s[s.length-1]+=t:s.push(t);}if(e[1]!==t[1]){const e=i.lines.get(t[1]),r=i.translateBufferLineToString(t[1],true,0,t[0]);e&&e.isWrapped?s[s.length-1]+=r:s.push(r);}}return s.map((e=>e.replace(p," "))).join(d.isWindows?"\r\n":"\n")}clearSelection(){this._model.clearSelection(),this._removeMouseDownListeners(),this.refresh(),this._onSelectionChange.fire();}refresh(e){this._refreshAnimationFrame||(this._refreshAnimationFrame=this._coreBrowserService.window.requestAnimationFrame((()=>this._refresh()))),d.isLinux&&e&&this.selectionText.length&&this._onLinuxMouseSelection.fire(this.selectionText);}_refresh(){this._refreshAnimationFrame=void 0,this._onRedrawRequest.fire({start:this._model.finalSelectionStart,end:this._model.finalSelectionEnd,columnSelectMode:3===this._activeSelectionMode});}_isClickInSelection(e){const t=this._getMouseBufferCoords(e),i=this._model.finalSelectionStart,s=this._model.finalSelectionEnd;return !!(i&&s&&t)&&this._areCoordsInSelection(t,i,s)}isCellInSelection(e,t){const i=this._model.finalSelectionStart,s=this._model.finalSelectionEnd;return !(!i||!s)&&this._areCoordsInSelection([e,t],i,s)}_areCoordsInSelection(e,t,i){return e[1]>t[1]&&e[1]<i[1]||t[1]===i[1]&&e[1]===t[1]&&e[0]>=t[0]&&e[0]<i[0]||t[1]<i[1]&&e[1]===i[1]&&e[0]<i[0]||t[1]<i[1]&&e[1]===t[1]&&e[0]>=t[0]}_selectWordAtCursor(e,t){var i,s;const r=null===(s=null===(i=this._linkifier.currentLink)||void 0===i?void 0:i.link)||void 0===s?void 0:s.range;if(r)return this._model.selectionStart=[r.start.x-1,r.start.y-1],this._model.selectionStartLength=(0, _.getRangeLength)(r,this._bufferService.cols),this._model.selectionEnd=void 0,true;const n=this._getMouseBufferCoords(e);return !!n&&(this._selectWordAt(n,t),this._model.selectionEnd=void 0,true)}selectAll(){this._model.isSelectAllActive=true,this.refresh(),this._onSelectionChange.fire();}selectLines(e,t){this._model.clearSelection(),e=Math.max(e,0),t=Math.min(t,this._bufferService.buffer.lines.length-1),this._model.selectionStart=[0,e],this._model.selectionEnd=[this._bufferService.cols,t],this.refresh(),this._onSelectionChange.fire();}_handleTrim(e){this._model.handleTrim(e)&&this.refresh();}_getMouseBufferCoords(e){const t=this._mouseService.getCoords(e,this._screenElement,this._bufferService.cols,this._bufferService.rows,true);if(t)return t[0]--,t[1]--,t[1]+=this._bufferService.buffer.ydisp,t}_getMouseEventScrollAmount(e){let t=(0, n.getCoordsRelativeToElement)(this._coreBrowserService.window,e,this._screenElement)[1];const i=this._renderService.dimensions.css.canvas.height;return t>=0&&t<=i?0:(t>i&&(t-=i),t=Math.min(Math.max(t,-50),50),t/=50,t/Math.abs(t)+Math.round(14*t))}shouldForceSelection(e){return d.isMac?e.altKey&&this._optionsService.rawOptions.macOptionClickForcesSelection:e.shiftKey}handleMouseDown(e){if(this._mouseDownTimeStamp=e.timeStamp,(2!==e.button||!this.hasSelection)&&0===e.button){if(!this._enabled){if(!this.shouldForceSelection(e))return;e.stopPropagation();}e.preventDefault(),this._dragScrollAmount=0,this._enabled&&e.shiftKey?this._handleIncrementalClick(e):1===e.detail?this._handleSingleClick(e):2===e.detail?this._handleDoubleClick(e):3===e.detail&&this._handleTripleClick(e),this._addMouseDownListeners(),this.refresh(true);}}_addMouseDownListeners(){this._screenElement.ownerDocument&&(this._screenElement.ownerDocument.addEventListener("mousemove",this._mouseMoveListener),this._screenElement.ownerDocument.addEventListener("mouseup",this._mouseUpListener)),this._dragScrollIntervalTimer=this._coreBrowserService.window.setInterval((()=>this._dragScroll()),50);}_removeMouseDownListeners(){this._screenElement.ownerDocument&&(this._screenElement.ownerDocument.removeEventListener("mousemove",this._mouseMoveListener),this._screenElement.ownerDocument.removeEventListener("mouseup",this._mouseUpListener)),this._coreBrowserService.window.clearInterval(this._dragScrollIntervalTimer),this._dragScrollIntervalTimer=void 0;}_handleIncrementalClick(e){this._model.selectionStart&&(this._model.selectionEnd=this._getMouseBufferCoords(e));}_handleSingleClick(e){if(this._model.selectionStartLength=0,this._model.isSelectAllActive=false,this._activeSelectionMode=this.shouldColumnSelect(e)?3:0,this._model.selectionStart=this._getMouseBufferCoords(e),!this._model.selectionStart)return;this._model.selectionEnd=void 0;const t=this._bufferService.buffer.lines.get(this._model.selectionStart[1]);t&&t.length!==this._model.selectionStart[0]&&0===t.hasWidth(this._model.selectionStart[0])&&this._model.selectionStart[0]++;}_handleDoubleClick(e){this._selectWordAtCursor(e,true)&&(this._activeSelectionMode=1);}_handleTripleClick(e){const t=this._getMouseBufferCoords(e);t&&(this._activeSelectionMode=2,this._selectLineAt(t[1]));}shouldColumnSelect(e){return e.altKey&&!(d.isMac&&this._optionsService.rawOptions.macOptionClickForcesSelection)}_handleMouseMove(e){if(e.stopImmediatePropagation(),!this._model.selectionStart)return;const t=this._model.selectionEnd?[this._model.selectionEnd[0],this._model.selectionEnd[1]]:null;if(this._model.selectionEnd=this._getMouseBufferCoords(e),!this._model.selectionEnd)return void this.refresh(true);2===this._activeSelectionMode?this._model.selectionEnd[1]<this._model.selectionStart[1]?this._model.selectionEnd[0]=0:this._model.selectionEnd[0]=this._bufferService.cols:1===this._activeSelectionMode&&this._selectToWordAt(this._model.selectionEnd),this._dragScrollAmount=this._getMouseEventScrollAmount(e),3!==this._activeSelectionMode&&(this._dragScrollAmount>0?this._model.selectionEnd[0]=this._bufferService.cols:this._dragScrollAmount<0&&(this._model.selectionEnd[0]=0));const i=this._bufferService.buffer;if(this._model.selectionEnd[1]<i.lines.length){const e=i.lines.get(this._model.selectionEnd[1]);e&&0===e.hasWidth(this._model.selectionEnd[0])&&this._model.selectionEnd[0]++;}t&&t[0]===this._model.selectionEnd[0]&&t[1]===this._model.selectionEnd[1]||this.refresh(true);}_dragScroll(){if(this._model.selectionEnd&&this._model.selectionStart&&this._dragScrollAmount){this._onRequestScrollLines.fire({amount:this._dragScrollAmount,suppressScrollEvent:false});const e=this._bufferService.buffer;this._dragScrollAmount>0?(3!==this._activeSelectionMode&&(this._model.selectionEnd[0]=this._bufferService.cols),this._model.selectionEnd[1]=Math.min(e.ydisp+this._bufferService.rows,e.lines.length-1)):(3!==this._activeSelectionMode&&(this._model.selectionEnd[0]=0),this._model.selectionEnd[1]=e.ydisp),this.refresh();}}_handleMouseUp(e){const t=e.timeStamp-this._mouseDownTimeStamp;if(this._removeMouseDownListeners(),this.selectionText.length<=1&&t<500&&e.altKey&&this._optionsService.rawOptions.altClickMovesCursor){if(this._bufferService.buffer.ybase===this._bufferService.buffer.ydisp){const t=this._mouseService.getCoords(e,this._element,this._bufferService.cols,this._bufferService.rows,false);if(t&&void 0!==t[0]&&void 0!==t[1]){const e=(0, o.moveToCellSequence)(t[0]-1,t[1]-1,this._bufferService,this._coreService.decPrivateModes.applicationCursorKeys);this._coreService.triggerDataEvent(e,true);}}}else this._fireEventIfSelectionChanged();}_fireEventIfSelectionChanged(){const e=this._model.finalSelectionStart,t=this._model.finalSelectionEnd,i=!(!e||!t||e[0]===t[0]&&e[1]===t[1]);i?e&&t&&(this._oldSelectionStart&&this._oldSelectionEnd&&e[0]===this._oldSelectionStart[0]&&e[1]===this._oldSelectionStart[1]&&t[0]===this._oldSelectionEnd[0]&&t[1]===this._oldSelectionEnd[1]||this._fireOnSelectionChange(e,t,i)):this._oldHasSelection&&this._fireOnSelectionChange(e,t,i);}_fireOnSelectionChange(e,t,i){this._oldSelectionStart=e,this._oldSelectionEnd=t,this._oldHasSelection=i,this._onSelectionChange.fire();}_handleBufferActivate(e){this.clearSelection(),this._trimListener.dispose(),this._trimListener=e.activeBuffer.lines.onTrim((e=>this._handleTrim(e)));}_convertViewportColToCharacterIndex(e,t){let i=t;for(let s=0;t>=s;s++){const r=e.loadCell(s,this._workCell).getChars().length;0===this._workCell.getWidth()?i--:r>1&&t!==s&&(i+=r-1);}return i}setSelection(e,t,i){this._model.clearSelection(),this._removeMouseDownListeners(),this._model.selectionStart=[e,t],this._model.selectionStartLength=i,this.refresh(),this._fireEventIfSelectionChanged();}rightClickSelect(e){this._isClickInSelection(e)||(this._selectWordAtCursor(e,false)&&this.refresh(true),this._fireEventIfSelectionChanged());}_getWordAt(e,t,i=true,s=true){if(e[0]>=this._bufferService.cols)return;const r=this._bufferService.buffer,n=r.lines.get(e[1]);if(!n)return;const o=r.translateBufferLineToString(e[1],false);let a=this._convertViewportColToCharacterIndex(n,e[0]),h=a;const c=e[0]-a;let l=0,d=0,_=0,u=0;if(" "===o.charAt(a)){for(;a>0&&" "===o.charAt(a-1);)a--;for(;h<o.length&&" "===o.charAt(h+1);)h++;}else {let t=e[0],i=e[0];0===n.getWidth(t)&&(l++,t--),2===n.getWidth(i)&&(d++,i++);const s=n.getString(i).length;for(s>1&&(u+=s-1,h+=s-1);t>0&&a>0&&!this._isCharWordSeparator(n.loadCell(t-1,this._workCell));){n.loadCell(t-1,this._workCell);const e=this._workCell.getChars().length;0===this._workCell.getWidth()?(l++,t--):e>1&&(_+=e-1,a-=e-1),a--,t--;}for(;i<n.length&&h+1<o.length&&!this._isCharWordSeparator(n.loadCell(i+1,this._workCell));){n.loadCell(i+1,this._workCell);const e=this._workCell.getChars().length;2===this._workCell.getWidth()?(d++,i++):e>1&&(u+=e-1,h+=e-1),h++,i++;}}h++;let f=a+c-l+_,v=Math.min(this._bufferService.cols,h-a+l+d-_-u);if(t||""!==o.slice(a,h).trim()){if(i&&0===f&&32!==n.getCodePoint(0)){const t=r.lines.get(e[1]-1);if(t&&n.isWrapped&&32!==t.getCodePoint(this._bufferService.cols-1)){const t=this._getWordAt([this._bufferService.cols-1,e[1]-1],false,true,false);if(t){const e=this._bufferService.cols-t.start;f-=e,v+=e;}}}if(s&&f+v===this._bufferService.cols&&32!==n.getCodePoint(this._bufferService.cols-1)){const t=r.lines.get(e[1]+1);if((null==t?void 0:t.isWrapped)&&32!==t.getCodePoint(0)){const t=this._getWordAt([0,e[1]+1],false,false,true);t&&(v+=t.length);}}return {start:f,length:v}}}_selectWordAt(e,t){const i=this._getWordAt(e,t);if(i){for(;i.start<0;)i.start+=this._bufferService.cols,e[1]--;this._model.selectionStart=[i.start,e[1]],this._model.selectionStartLength=i.length;}}_selectToWordAt(e){const t=this._getWordAt(e,true);if(t){let i=e[1];for(;t.start<0;)t.start+=this._bufferService.cols,i--;if(!this._model.areSelectionValuesReversed())for(;t.start+t.length>this._bufferService.cols;)t.length-=this._bufferService.cols,i++;this._model.selectionEnd=[this._model.areSelectionValuesReversed()?t.start:t.start+t.length,i];}}_isCharWordSeparator(e){return 0!==e.getWidth()&&this._optionsService.rawOptions.wordSeparator.indexOf(e.getChars())>=0}_selectLineAt(e){const t=this._bufferService.buffer.getWrappedRangeForLine(e),i={start:{x:0,y:t.first},end:{x:this._bufferService.cols-1,y:t.last}};this._model.selectionStart=[0,t.first],this._model.selectionEnd=void 0,this._model.selectionStartLength=(0, _.getRangeLength)(i,this._bufferService.cols);}};t.SelectionService=g=s([r(3,f.IBufferService),r(4,f.ICoreService),r(5,h.IMouseService),r(6,f.IOptionsService),r(7,h.IRenderService),r(8,h.ICoreBrowserService)],g);},4725:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.IThemeService=t.ICharacterJoinerService=t.ISelectionService=t.IRenderService=t.IMouseService=t.ICoreBrowserService=t.ICharSizeService=void 0;const s=i(8343);t.ICharSizeService=(0, s.createDecorator)("CharSizeService"),t.ICoreBrowserService=(0, s.createDecorator)("CoreBrowserService"),t.IMouseService=(0, s.createDecorator)("MouseService"),t.IRenderService=(0, s.createDecorator)("RenderService"),t.ISelectionService=(0, s.createDecorator)("SelectionService"),t.ICharacterJoinerService=(0, s.createDecorator)("CharacterJoinerService"),t.IThemeService=(0, s.createDecorator)("ThemeService");},6731:function(e,t,i){var s=this&&this.__decorate||function(e,t,i,s){var r,n=arguments.length,o=n<3?t:null===s?s=Object.getOwnPropertyDescriptor(t,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,i,s);else for(var a=e.length-1;a>=0;a--)(r=e[a])&&(o=(n<3?r(o):n>3?r(t,i,o):r(t,i))||o);return n>3&&o&&Object.defineProperty(t,i,o),o},r=this&&this.__param||function(e,t){return function(i,s){t(i,s,e);}};Object.defineProperty(t,"__esModule",{value:true}),t.ThemeService=t.DEFAULT_ANSI_COLORS=void 0;const n=i(7239),o=i(8055),a=i(8460),h=i(844),c=i(2585),l=o.css.toColor("#ffffff"),d=o.css.toColor("#000000"),_=o.css.toColor("#ffffff"),u=o.css.toColor("#000000"),f={css:"rgba(255, 255, 255, 0.3)",rgba:4294967117};t.DEFAULT_ANSI_COLORS=Object.freeze((()=>{const e=[o.css.toColor("#2e3436"),o.css.toColor("#cc0000"),o.css.toColor("#4e9a06"),o.css.toColor("#c4a000"),o.css.toColor("#3465a4"),o.css.toColor("#75507b"),o.css.toColor("#06989a"),o.css.toColor("#d3d7cf"),o.css.toColor("#555753"),o.css.toColor("#ef2929"),o.css.toColor("#8ae234"),o.css.toColor("#fce94f"),o.css.toColor("#729fcf"),o.css.toColor("#ad7fa8"),o.css.toColor("#34e2e2"),o.css.toColor("#eeeeec")],t=[0,95,135,175,215,255];for(let i=0;i<216;i++){const s=t[i/36%6|0],r=t[i/6%6|0],n=t[i%6];e.push({css:o.channels.toCss(s,r,n),rgba:o.channels.toRgba(s,r,n)});}for(let t=0;t<24;t++){const i=8+10*t;e.push({css:o.channels.toCss(i,i,i),rgba:o.channels.toRgba(i,i,i)});}return e})());let v=t.ThemeService=class extends h.Disposable{get colors(){return this._colors}constructor(e){super(),this._optionsService=e,this._contrastCache=new n.ColorContrastCache,this._halfContrastCache=new n.ColorContrastCache,this._onChangeColors=this.register(new a.EventEmitter),this.onChangeColors=this._onChangeColors.event,this._colors={foreground:l,background:d,cursor:_,cursorAccent:u,selectionForeground:void 0,selectionBackgroundTransparent:f,selectionBackgroundOpaque:o.color.blend(d,f),selectionInactiveBackgroundTransparent:f,selectionInactiveBackgroundOpaque:o.color.blend(d,f),ansi:t.DEFAULT_ANSI_COLORS.slice(),contrastCache:this._contrastCache,halfContrastCache:this._halfContrastCache},this._updateRestoreColors(),this._setTheme(this._optionsService.rawOptions.theme),this.register(this._optionsService.onSpecificOptionChange("minimumContrastRatio",(()=>this._contrastCache.clear()))),this.register(this._optionsService.onSpecificOptionChange("theme",(()=>this._setTheme(this._optionsService.rawOptions.theme))));}_setTheme(e={}){const i=this._colors;if(i.foreground=p(e.foreground,l),i.background=p(e.background,d),i.cursor=p(e.cursor,_),i.cursorAccent=p(e.cursorAccent,u),i.selectionBackgroundTransparent=p(e.selectionBackground,f),i.selectionBackgroundOpaque=o.color.blend(i.background,i.selectionBackgroundTransparent),i.selectionInactiveBackgroundTransparent=p(e.selectionInactiveBackground,i.selectionBackgroundTransparent),i.selectionInactiveBackgroundOpaque=o.color.blend(i.background,i.selectionInactiveBackgroundTransparent),i.selectionForeground=e.selectionForeground?p(e.selectionForeground,o.NULL_COLOR):void 0,i.selectionForeground===o.NULL_COLOR&&(i.selectionForeground=void 0),o.color.isOpaque(i.selectionBackgroundTransparent)){const e=.3;i.selectionBackgroundTransparent=o.color.opacity(i.selectionBackgroundTransparent,e);}if(o.color.isOpaque(i.selectionInactiveBackgroundTransparent)){const e=.3;i.selectionInactiveBackgroundTransparent=o.color.opacity(i.selectionInactiveBackgroundTransparent,e);}if(i.ansi=t.DEFAULT_ANSI_COLORS.slice(),i.ansi[0]=p(e.black,t.DEFAULT_ANSI_COLORS[0]),i.ansi[1]=p(e.red,t.DEFAULT_ANSI_COLORS[1]),i.ansi[2]=p(e.green,t.DEFAULT_ANSI_COLORS[2]),i.ansi[3]=p(e.yellow,t.DEFAULT_ANSI_COLORS[3]),i.ansi[4]=p(e.blue,t.DEFAULT_ANSI_COLORS[4]),i.ansi[5]=p(e.magenta,t.DEFAULT_ANSI_COLORS[5]),i.ansi[6]=p(e.cyan,t.DEFAULT_ANSI_COLORS[6]),i.ansi[7]=p(e.white,t.DEFAULT_ANSI_COLORS[7]),i.ansi[8]=p(e.brightBlack,t.DEFAULT_ANSI_COLORS[8]),i.ansi[9]=p(e.brightRed,t.DEFAULT_ANSI_COLORS[9]),i.ansi[10]=p(e.brightGreen,t.DEFAULT_ANSI_COLORS[10]),i.ansi[11]=p(e.brightYellow,t.DEFAULT_ANSI_COLORS[11]),i.ansi[12]=p(e.brightBlue,t.DEFAULT_ANSI_COLORS[12]),i.ansi[13]=p(e.brightMagenta,t.DEFAULT_ANSI_COLORS[13]),i.ansi[14]=p(e.brightCyan,t.DEFAULT_ANSI_COLORS[14]),i.ansi[15]=p(e.brightWhite,t.DEFAULT_ANSI_COLORS[15]),e.extendedAnsi){const s=Math.min(i.ansi.length-16,e.extendedAnsi.length);for(let r=0;r<s;r++)i.ansi[r+16]=p(e.extendedAnsi[r],t.DEFAULT_ANSI_COLORS[r+16]);}this._contrastCache.clear(),this._halfContrastCache.clear(),this._updateRestoreColors(),this._onChangeColors.fire(this.colors);}restoreColor(e){this._restoreColor(e),this._onChangeColors.fire(this.colors);}_restoreColor(e){if(void 0!==e)switch(e){case 256:this._colors.foreground=this._restoreColors.foreground;break;case 257:this._colors.background=this._restoreColors.background;break;case 258:this._colors.cursor=this._restoreColors.cursor;break;default:this._colors.ansi[e]=this._restoreColors.ansi[e];}else for(let e=0;e<this._restoreColors.ansi.length;++e)this._colors.ansi[e]=this._restoreColors.ansi[e];}modifyColors(e){e(this._colors),this._onChangeColors.fire(this.colors);}_updateRestoreColors(){this._restoreColors={foreground:this._colors.foreground,background:this._colors.background,cursor:this._colors.cursor,ansi:this._colors.ansi.slice()};}};function p(e,t){if(void 0!==e)try{return o.css.toColor(e)}catch(e){}return t}t.ThemeService=v=s([r(0,c.IOptionsService)],v);},6349:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.CircularList=void 0;const s=i(8460),r=i(844);class n extends r.Disposable{constructor(e){super(),this._maxLength=e,this.onDeleteEmitter=this.register(new s.EventEmitter),this.onDelete=this.onDeleteEmitter.event,this.onInsertEmitter=this.register(new s.EventEmitter),this.onInsert=this.onInsertEmitter.event,this.onTrimEmitter=this.register(new s.EventEmitter),this.onTrim=this.onTrimEmitter.event,this._array=new Array(this._maxLength),this._startIndex=0,this._length=0;}get maxLength(){return this._maxLength}set maxLength(e){if(this._maxLength===e)return;const t=new Array(e);for(let i=0;i<Math.min(e,this.length);i++)t[i]=this._array[this._getCyclicIndex(i)];this._array=t,this._maxLength=e,this._startIndex=0;}get length(){return this._length}set length(e){if(e>this._length)for(let t=this._length;t<e;t++)this._array[t]=void 0;this._length=e;}get(e){return this._array[this._getCyclicIndex(e)]}set(e,t){this._array[this._getCyclicIndex(e)]=t;}push(e){this._array[this._getCyclicIndex(this._length)]=e,this._length===this._maxLength?(this._startIndex=++this._startIndex%this._maxLength,this.onTrimEmitter.fire(1)):this._length++;}recycle(){if(this._length!==this._maxLength)throw new Error("Can only recycle when the buffer is full");return this._startIndex=++this._startIndex%this._maxLength,this.onTrimEmitter.fire(1),this._array[this._getCyclicIndex(this._length-1)]}get isFull(){return this._length===this._maxLength}pop(){return this._array[this._getCyclicIndex(this._length---1)]}splice(e,t,...i){if(t){for(let i=e;i<this._length-t;i++)this._array[this._getCyclicIndex(i)]=this._array[this._getCyclicIndex(i+t)];this._length-=t,this.onDeleteEmitter.fire({index:e,amount:t});}for(let t=this._length-1;t>=e;t--)this._array[this._getCyclicIndex(t+i.length)]=this._array[this._getCyclicIndex(t)];for(let t=0;t<i.length;t++)this._array[this._getCyclicIndex(e+t)]=i[t];if(i.length&&this.onInsertEmitter.fire({index:e,amount:i.length}),this._length+i.length>this._maxLength){const e=this._length+i.length-this._maxLength;this._startIndex+=e,this._length=this._maxLength,this.onTrimEmitter.fire(e);}else this._length+=i.length;}trimStart(e){e>this._length&&(e=this._length),this._startIndex+=e,this._length-=e,this.onTrimEmitter.fire(e);}shiftElements(e,t,i){if(!(t<=0)){if(e<0||e>=this._length)throw new Error("start argument out of range");if(e+i<0)throw new Error("Cannot shift elements in list beyond index 0");if(i>0){for(let s=t-1;s>=0;s--)this.set(e+s+i,this.get(e+s));const s=e+t+i-this._length;if(s>0)for(this._length+=s;this._length>this._maxLength;)this._length--,this._startIndex++,this.onTrimEmitter.fire(1);}else for(let s=0;s<t;s++)this.set(e+s+i,this.get(e+s));}}_getCyclicIndex(e){return (this._startIndex+e)%this._maxLength}}t.CircularList=n;},1439:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.clone=void 0,t.clone=function e(t,i=5){if("object"!=typeof t)return t;const s=Array.isArray(t)?[]:{};for(const r in t)s[r]=i<=1?t[r]:t[r]&&e(t[r],i-1);return s};},8055:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.contrastRatio=t.toPaddedHex=t.rgba=t.rgb=t.css=t.color=t.channels=t.NULL_COLOR=void 0;const s=i(6114);let r=0,n=0,o=0,a=0;var h,c,l,d,_;function u(e){const t=e.toString(16);return t.length<2?"0"+t:t}function f(e,t){return e<t?(t+.05)/(e+.05):(e+.05)/(t+.05)}t.NULL_COLOR={css:"#00000000",rgba:0},function(e){e.toCss=function(e,t,i,s){return void 0!==s?`#${u(e)}${u(t)}${u(i)}${u(s)}`:`#${u(e)}${u(t)}${u(i)}`},e.toRgba=function(e,t,i,s=255){return (e<<24|t<<16|i<<8|s)>>>0};}(h||(t.channels=h={})),function(e){function t(e,t){return a=Math.round(255*t),[r,n,o]=_.toChannels(e.rgba),{css:h.toCss(r,n,o,a),rgba:h.toRgba(r,n,o,a)}}e.blend=function(e,t){if(a=(255&t.rgba)/255,1===a)return {css:t.css,rgba:t.rgba};const i=t.rgba>>24&255,s=t.rgba>>16&255,c=t.rgba>>8&255,l=e.rgba>>24&255,d=e.rgba>>16&255,_=e.rgba>>8&255;return r=l+Math.round((i-l)*a),n=d+Math.round((s-d)*a),o=_+Math.round((c-_)*a),{css:h.toCss(r,n,o),rgba:h.toRgba(r,n,o)}},e.isOpaque=function(e){return 255==(255&e.rgba)},e.ensureContrastRatio=function(e,t,i){const s=_.ensureContrastRatio(e.rgba,t.rgba,i);if(s)return _.toColor(s>>24&255,s>>16&255,s>>8&255)},e.opaque=function(e){const t=(255|e.rgba)>>>0;return [r,n,o]=_.toChannels(t),{css:h.toCss(r,n,o),rgba:t}},e.opacity=t,e.multiplyOpacity=function(e,i){return a=255&e.rgba,t(e,a*i/255)},e.toColorRGB=function(e){return [e.rgba>>24&255,e.rgba>>16&255,e.rgba>>8&255]};}(c||(t.color=c={})),function(e){let t,i;if(!s.isNode){const e=document.createElement("canvas");e.width=1,e.height=1;const s=e.getContext("2d",{willReadFrequently:true});s&&(t=s,t.globalCompositeOperation="copy",i=t.createLinearGradient(0,0,1,1));}e.toColor=function(e){if(e.match(/#[\da-f]{3,8}/i))switch(e.length){case 4:return r=parseInt(e.slice(1,2).repeat(2),16),n=parseInt(e.slice(2,3).repeat(2),16),o=parseInt(e.slice(3,4).repeat(2),16),_.toColor(r,n,o);case 5:return r=parseInt(e.slice(1,2).repeat(2),16),n=parseInt(e.slice(2,3).repeat(2),16),o=parseInt(e.slice(3,4).repeat(2),16),a=parseInt(e.slice(4,5).repeat(2),16),_.toColor(r,n,o,a);case 7:return {css:e,rgba:(parseInt(e.slice(1),16)<<8|255)>>>0};case 9:return {css:e,rgba:parseInt(e.slice(1),16)>>>0}}const s=e.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*(0|1|\d?\.(\d+))\s*)?\)/);if(s)return r=parseInt(s[1]),n=parseInt(s[2]),o=parseInt(s[3]),a=Math.round(255*(void 0===s[5]?1:parseFloat(s[5]))),_.toColor(r,n,o,a);if(!t||!i)throw new Error("css.toColor: Unsupported css format");if(t.fillStyle=i,t.fillStyle=e,"string"!=typeof t.fillStyle)throw new Error("css.toColor: Unsupported css format");if(t.fillRect(0,0,1,1),[r,n,o,a]=t.getImageData(0,0,1,1).data,255!==a)throw new Error("css.toColor: Unsupported css format");return {rgba:h.toRgba(r,n,o,a),css:e}};}(l||(t.css=l={})),function(e){function t(e,t,i){const s=e/255,r=t/255,n=i/255;return .2126*(s<=.03928?s/12.92:Math.pow((s+.055)/1.055,2.4))+.7152*(r<=.03928?r/12.92:Math.pow((r+.055)/1.055,2.4))+.0722*(n<=.03928?n/12.92:Math.pow((n+.055)/1.055,2.4))}e.relativeLuminance=function(e){return t(e>>16&255,e>>8&255,255&e)},e.relativeLuminance2=t;}(d||(t.rgb=d={})),function(e){function t(e,t,i){const s=e>>24&255,r=e>>16&255,n=e>>8&255;let o=t>>24&255,a=t>>16&255,h=t>>8&255,c=f(d.relativeLuminance2(o,a,h),d.relativeLuminance2(s,r,n));for(;c<i&&(o>0||a>0||h>0);)o-=Math.max(0,Math.ceil(.1*o)),a-=Math.max(0,Math.ceil(.1*a)),h-=Math.max(0,Math.ceil(.1*h)),c=f(d.relativeLuminance2(o,a,h),d.relativeLuminance2(s,r,n));return (o<<24|a<<16|h<<8|255)>>>0}function i(e,t,i){const s=e>>24&255,r=e>>16&255,n=e>>8&255;let o=t>>24&255,a=t>>16&255,h=t>>8&255,c=f(d.relativeLuminance2(o,a,h),d.relativeLuminance2(s,r,n));for(;c<i&&(o<255||a<255||h<255);)o=Math.min(255,o+Math.ceil(.1*(255-o))),a=Math.min(255,a+Math.ceil(.1*(255-a))),h=Math.min(255,h+Math.ceil(.1*(255-h))),c=f(d.relativeLuminance2(o,a,h),d.relativeLuminance2(s,r,n));return (o<<24|a<<16|h<<8|255)>>>0}e.ensureContrastRatio=function(e,s,r){const n=d.relativeLuminance(e>>8),o=d.relativeLuminance(s>>8);if(f(n,o)<r){if(o<n){const o=t(e,s,r),a=f(n,d.relativeLuminance(o>>8));if(a<r){const t=i(e,s,r);return a>f(n,d.relativeLuminance(t>>8))?o:t}return o}const a=i(e,s,r),h=f(n,d.relativeLuminance(a>>8));if(h<r){const i=t(e,s,r);return h>f(n,d.relativeLuminance(i>>8))?a:i}return a}},e.reduceLuminance=t,e.increaseLuminance=i,e.toChannels=function(e){return [e>>24&255,e>>16&255,e>>8&255,255&e]},e.toColor=function(e,t,i,s){return {css:h.toCss(e,t,i,s),rgba:h.toRgba(e,t,i,s)}};}(_||(t.rgba=_={})),t.toPaddedHex=u,t.contrastRatio=f;},8969:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.CoreTerminal=void 0;const s=i(844),r=i(2585),n=i(4348),o=i(7866),a=i(744),h=i(7302),c=i(6975),l=i(8460),d=i(1753),_=i(1480),u=i(7994),f=i(9282),v=i(5435),p=i(5981),g=i(2660);let m=false;class S extends s.Disposable{get onScroll(){return this._onScrollApi||(this._onScrollApi=this.register(new l.EventEmitter),this._onScroll.event((e=>{var t;null===(t=this._onScrollApi)||void 0===t||t.fire(e.position);}))),this._onScrollApi.event}get cols(){return this._bufferService.cols}get rows(){return this._bufferService.rows}get buffers(){return this._bufferService.buffers}get options(){return this.optionsService.options}set options(e){for(const t in e)this.optionsService.options[t]=e[t];}constructor(e){super(),this._windowsWrappingHeuristics=this.register(new s.MutableDisposable),this._onBinary=this.register(new l.EventEmitter),this.onBinary=this._onBinary.event,this._onData=this.register(new l.EventEmitter),this.onData=this._onData.event,this._onLineFeed=this.register(new l.EventEmitter),this.onLineFeed=this._onLineFeed.event,this._onResize=this.register(new l.EventEmitter),this.onResize=this._onResize.event,this._onWriteParsed=this.register(new l.EventEmitter),this.onWriteParsed=this._onWriteParsed.event,this._onScroll=this.register(new l.EventEmitter),this._instantiationService=new n.InstantiationService,this.optionsService=this.register(new h.OptionsService(e)),this._instantiationService.setService(r.IOptionsService,this.optionsService),this._bufferService=this.register(this._instantiationService.createInstance(a.BufferService)),this._instantiationService.setService(r.IBufferService,this._bufferService),this._logService=this.register(this._instantiationService.createInstance(o.LogService)),this._instantiationService.setService(r.ILogService,this._logService),this.coreService=this.register(this._instantiationService.createInstance(c.CoreService)),this._instantiationService.setService(r.ICoreService,this.coreService),this.coreMouseService=this.register(this._instantiationService.createInstance(d.CoreMouseService)),this._instantiationService.setService(r.ICoreMouseService,this.coreMouseService),this.unicodeService=this.register(this._instantiationService.createInstance(_.UnicodeService)),this._instantiationService.setService(r.IUnicodeService,this.unicodeService),this._charsetService=this._instantiationService.createInstance(u.CharsetService),this._instantiationService.setService(r.ICharsetService,this._charsetService),this._oscLinkService=this._instantiationService.createInstance(g.OscLinkService),this._instantiationService.setService(r.IOscLinkService,this._oscLinkService),this._inputHandler=this.register(new v.InputHandler(this._bufferService,this._charsetService,this.coreService,this._logService,this.optionsService,this._oscLinkService,this.coreMouseService,this.unicodeService)),this.register((0, l.forwardEvent)(this._inputHandler.onLineFeed,this._onLineFeed)),this.register(this._inputHandler),this.register((0, l.forwardEvent)(this._bufferService.onResize,this._onResize)),this.register((0, l.forwardEvent)(this.coreService.onData,this._onData)),this.register((0, l.forwardEvent)(this.coreService.onBinary,this._onBinary)),this.register(this.coreService.onRequestScrollToBottom((()=>this.scrollToBottom()))),this.register(this.coreService.onUserInput((()=>this._writeBuffer.handleUserInput()))),this.register(this.optionsService.onMultipleOptionChange(["windowsMode","windowsPty"],(()=>this._handleWindowsPtyOptionChange()))),this.register(this._bufferService.onScroll((e=>{this._onScroll.fire({position:this._bufferService.buffer.ydisp,source:0}),this._inputHandler.markRangeDirty(this._bufferService.buffer.scrollTop,this._bufferService.buffer.scrollBottom);}))),this.register(this._inputHandler.onScroll((e=>{this._onScroll.fire({position:this._bufferService.buffer.ydisp,source:0}),this._inputHandler.markRangeDirty(this._bufferService.buffer.scrollTop,this._bufferService.buffer.scrollBottom);}))),this._writeBuffer=this.register(new p.WriteBuffer(((e,t)=>this._inputHandler.parse(e,t)))),this.register((0, l.forwardEvent)(this._writeBuffer.onWriteParsed,this._onWriteParsed));}write(e,t){this._writeBuffer.write(e,t);}writeSync(e,t){this._logService.logLevel<=r.LogLevelEnum.WARN&&!m&&(this._logService.warn("writeSync is unreliable and will be removed soon."),m=true),this._writeBuffer.writeSync(e,t);}resize(e,t){isNaN(e)||isNaN(t)||(e=Math.max(e,a.MINIMUM_COLS),t=Math.max(t,a.MINIMUM_ROWS),this._bufferService.resize(e,t));}scroll(e,t=false){this._bufferService.scroll(e,t);}scrollLines(e,t,i){this._bufferService.scrollLines(e,t,i);}scrollPages(e){this.scrollLines(e*(this.rows-1));}scrollToTop(){this.scrollLines(-this._bufferService.buffer.ydisp);}scrollToBottom(){this.scrollLines(this._bufferService.buffer.ybase-this._bufferService.buffer.ydisp);}scrollToLine(e){const t=e-this._bufferService.buffer.ydisp;0!==t&&this.scrollLines(t);}registerEscHandler(e,t){return this._inputHandler.registerEscHandler(e,t)}registerDcsHandler(e,t){return this._inputHandler.registerDcsHandler(e,t)}registerCsiHandler(e,t){return this._inputHandler.registerCsiHandler(e,t)}registerOscHandler(e,t){return this._inputHandler.registerOscHandler(e,t)}_setup(){this._handleWindowsPtyOptionChange();}reset(){this._inputHandler.reset(),this._bufferService.reset(),this._charsetService.reset(),this.coreService.reset(),this.coreMouseService.reset();}_handleWindowsPtyOptionChange(){let e=false;const t=this.optionsService.rawOptions.windowsPty;t&&void 0!==t.buildNumber&&void 0!==t.buildNumber?e=!!("conpty"===t.backend&&t.buildNumber<21376):this.optionsService.rawOptions.windowsMode&&(e=true),e?this._enableWindowsWrappingHeuristics():this._windowsWrappingHeuristics.clear();}_enableWindowsWrappingHeuristics(){if(!this._windowsWrappingHeuristics.value){const e=[];e.push(this.onLineFeed(f.updateWindowsModeWrappedState.bind(null,this._bufferService))),e.push(this.registerCsiHandler({final:"H"},(()=>((0, f.updateWindowsModeWrappedState)(this._bufferService),false)))),this._windowsWrappingHeuristics.value=(0, s.toDisposable)((()=>{for(const t of e)t.dispose();}));}}}t.CoreTerminal=S;},8460:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.forwardEvent=t.EventEmitter=void 0,t.EventEmitter=class{constructor(){this._listeners=[],this._disposed=false;}get event(){return this._event||(this._event=e=>(this._listeners.push(e),{dispose:()=>{if(!this._disposed)for(let t=0;t<this._listeners.length;t++)if(this._listeners[t]===e)return void this._listeners.splice(t,1)}})),this._event}fire(e,t){const i=[];for(let e=0;e<this._listeners.length;e++)i.push(this._listeners[e]);for(let s=0;s<i.length;s++)i[s].call(void 0,e,t);}dispose(){this.clearListeners(),this._disposed=true;}clearListeners(){this._listeners&&(this._listeners.length=0);}},t.forwardEvent=function(e,t){return e((e=>t.fire(e)))};},5435:function(e,t,i){var s=this&&this.__decorate||function(e,t,i,s){var r,n=arguments.length,o=n<3?t:null===s?s=Object.getOwnPropertyDescriptor(t,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,i,s);else for(var a=e.length-1;a>=0;a--)(r=e[a])&&(o=(n<3?r(o):n>3?r(t,i,o):r(t,i))||o);return n>3&&o&&Object.defineProperty(t,i,o),o},r=this&&this.__param||function(e,t){return function(i,s){t(i,s,e);}};Object.defineProperty(t,"__esModule",{value:true}),t.InputHandler=t.WindowsOptionsReportType=void 0;const n=i(2584),o=i(7116),a=i(2015),h=i(844),c=i(482),l=i(8437),d=i(8460),_=i(643),u=i(511),f=i(3734),v=i(2585),p=i(6242),g=i(6351),m=i(5941),S={"(":0,")":1,"*":2,"+":3,"-":1,".":2},C=131072;function b(e,t){if(e>24)return t.setWinLines||false;switch(e){case 1:return !!t.restoreWin;case 2:return !!t.minimizeWin;case 3:return !!t.setWinPosition;case 4:return !!t.setWinSizePixels;case 5:return !!t.raiseWin;case 6:return !!t.lowerWin;case 7:return !!t.refreshWin;case 8:return !!t.setWinSizeChars;case 9:return !!t.maximizeWin;case 10:return !!t.fullscreenWin;case 11:return !!t.getWinState;case 13:return !!t.getWinPosition;case 14:return !!t.getWinSizePixels;case 15:return !!t.getScreenSizePixels;case 16:return !!t.getCellSizePixels;case 18:return !!t.getWinSizeChars;case 19:return !!t.getScreenSizeChars;case 20:return !!t.getIconTitle;case 21:return !!t.getWinTitle;case 22:return !!t.pushTitle;case 23:return !!t.popTitle;case 24:return !!t.setWinLines}return  false}var y;!function(e){e[e.GET_WIN_SIZE_PIXELS=0]="GET_WIN_SIZE_PIXELS",e[e.GET_CELL_SIZE_PIXELS=1]="GET_CELL_SIZE_PIXELS";}(y||(t.WindowsOptionsReportType=y={}));let w=0;class E extends h.Disposable{getAttrData(){return this._curAttrData}constructor(e,t,i,s,r,h,_,f,v=new a.EscapeSequenceParser){super(),this._bufferService=e,this._charsetService=t,this._coreService=i,this._logService=s,this._optionsService=r,this._oscLinkService=h,this._coreMouseService=_,this._unicodeService=f,this._parser=v,this._parseBuffer=new Uint32Array(4096),this._stringDecoder=new c.StringToUtf32,this._utf8Decoder=new c.Utf8ToUtf32,this._workCell=new u.CellData,this._windowTitle="",this._iconName="",this._windowTitleStack=[],this._iconNameStack=[],this._curAttrData=l.DEFAULT_ATTR_DATA.clone(),this._eraseAttrDataInternal=l.DEFAULT_ATTR_DATA.clone(),this._onRequestBell=this.register(new d.EventEmitter),this.onRequestBell=this._onRequestBell.event,this._onRequestRefreshRows=this.register(new d.EventEmitter),this.onRequestRefreshRows=this._onRequestRefreshRows.event,this._onRequestReset=this.register(new d.EventEmitter),this.onRequestReset=this._onRequestReset.event,this._onRequestSendFocus=this.register(new d.EventEmitter),this.onRequestSendFocus=this._onRequestSendFocus.event,this._onRequestSyncScrollBar=this.register(new d.EventEmitter),this.onRequestSyncScrollBar=this._onRequestSyncScrollBar.event,this._onRequestWindowsOptionsReport=this.register(new d.EventEmitter),this.onRequestWindowsOptionsReport=this._onRequestWindowsOptionsReport.event,this._onA11yChar=this.register(new d.EventEmitter),this.onA11yChar=this._onA11yChar.event,this._onA11yTab=this.register(new d.EventEmitter),this.onA11yTab=this._onA11yTab.event,this._onCursorMove=this.register(new d.EventEmitter),this.onCursorMove=this._onCursorMove.event,this._onLineFeed=this.register(new d.EventEmitter),this.onLineFeed=this._onLineFeed.event,this._onScroll=this.register(new d.EventEmitter),this.onScroll=this._onScroll.event,this._onTitleChange=this.register(new d.EventEmitter),this.onTitleChange=this._onTitleChange.event,this._onColor=this.register(new d.EventEmitter),this.onColor=this._onColor.event,this._parseStack={paused:false,cursorStartX:0,cursorStartY:0,decodedLength:0,position:0},this._specialColors=[256,257,258],this.register(this._parser),this._dirtyRowTracker=new k(this._bufferService),this._activeBuffer=this._bufferService.buffer,this.register(this._bufferService.buffers.onBufferActivate((e=>this._activeBuffer=e.activeBuffer))),this._parser.setCsiHandlerFallback(((e,t)=>{this._logService.debug("Unknown CSI code: ",{identifier:this._parser.identToString(e),params:t.toArray()});})),this._parser.setEscHandlerFallback((e=>{this._logService.debug("Unknown ESC code: ",{identifier:this._parser.identToString(e)});})),this._parser.setExecuteHandlerFallback((e=>{this._logService.debug("Unknown EXECUTE code: ",{code:e});})),this._parser.setOscHandlerFallback(((e,t,i)=>{this._logService.debug("Unknown OSC code: ",{identifier:e,action:t,data:i});})),this._parser.setDcsHandlerFallback(((e,t,i)=>{"HOOK"===t&&(i=i.toArray()),this._logService.debug("Unknown DCS code: ",{identifier:this._parser.identToString(e),action:t,payload:i});})),this._parser.setPrintHandler(((e,t,i)=>this.print(e,t,i))),this._parser.registerCsiHandler({final:"@"},(e=>this.insertChars(e))),this._parser.registerCsiHandler({intermediates:" ",final:"@"},(e=>this.scrollLeft(e))),this._parser.registerCsiHandler({final:"A"},(e=>this.cursorUp(e))),this._parser.registerCsiHandler({intermediates:" ",final:"A"},(e=>this.scrollRight(e))),this._parser.registerCsiHandler({final:"B"},(e=>this.cursorDown(e))),this._parser.registerCsiHandler({final:"C"},(e=>this.cursorForward(e))),this._parser.registerCsiHandler({final:"D"},(e=>this.cursorBackward(e))),this._parser.registerCsiHandler({final:"E"},(e=>this.cursorNextLine(e))),this._parser.registerCsiHandler({final:"F"},(e=>this.cursorPrecedingLine(e))),this._parser.registerCsiHandler({final:"G"},(e=>this.cursorCharAbsolute(e))),this._parser.registerCsiHandler({final:"H"},(e=>this.cursorPosition(e))),this._parser.registerCsiHandler({final:"I"},(e=>this.cursorForwardTab(e))),this._parser.registerCsiHandler({final:"J"},(e=>this.eraseInDisplay(e,false))),this._parser.registerCsiHandler({prefix:"?",final:"J"},(e=>this.eraseInDisplay(e,true))),this._parser.registerCsiHandler({final:"K"},(e=>this.eraseInLine(e,false))),this._parser.registerCsiHandler({prefix:"?",final:"K"},(e=>this.eraseInLine(e,true))),this._parser.registerCsiHandler({final:"L"},(e=>this.insertLines(e))),this._parser.registerCsiHandler({final:"M"},(e=>this.deleteLines(e))),this._parser.registerCsiHandler({final:"P"},(e=>this.deleteChars(e))),this._parser.registerCsiHandler({final:"S"},(e=>this.scrollUp(e))),this._parser.registerCsiHandler({final:"T"},(e=>this.scrollDown(e))),this._parser.registerCsiHandler({final:"X"},(e=>this.eraseChars(e))),this._parser.registerCsiHandler({final:"Z"},(e=>this.cursorBackwardTab(e))),this._parser.registerCsiHandler({final:"`"},(e=>this.charPosAbsolute(e))),this._parser.registerCsiHandler({final:"a"},(e=>this.hPositionRelative(e))),this._parser.registerCsiHandler({final:"b"},(e=>this.repeatPrecedingCharacter(e))),this._parser.registerCsiHandler({final:"c"},(e=>this.sendDeviceAttributesPrimary(e))),this._parser.registerCsiHandler({prefix:">",final:"c"},(e=>this.sendDeviceAttributesSecondary(e))),this._parser.registerCsiHandler({final:"d"},(e=>this.linePosAbsolute(e))),this._parser.registerCsiHandler({final:"e"},(e=>this.vPositionRelative(e))),this._parser.registerCsiHandler({final:"f"},(e=>this.hVPosition(e))),this._parser.registerCsiHandler({final:"g"},(e=>this.tabClear(e))),this._parser.registerCsiHandler({final:"h"},(e=>this.setMode(e))),this._parser.registerCsiHandler({prefix:"?",final:"h"},(e=>this.setModePrivate(e))),this._parser.registerCsiHandler({final:"l"},(e=>this.resetMode(e))),this._parser.registerCsiHandler({prefix:"?",final:"l"},(e=>this.resetModePrivate(e))),this._parser.registerCsiHandler({final:"m"},(e=>this.charAttributes(e))),this._parser.registerCsiHandler({final:"n"},(e=>this.deviceStatus(e))),this._parser.registerCsiHandler({prefix:"?",final:"n"},(e=>this.deviceStatusPrivate(e))),this._parser.registerCsiHandler({intermediates:"!",final:"p"},(e=>this.softReset(e))),this._parser.registerCsiHandler({intermediates:" ",final:"q"},(e=>this.setCursorStyle(e))),this._parser.registerCsiHandler({final:"r"},(e=>this.setScrollRegion(e))),this._parser.registerCsiHandler({final:"s"},(e=>this.saveCursor(e))),this._parser.registerCsiHandler({final:"t"},(e=>this.windowOptions(e))),this._parser.registerCsiHandler({final:"u"},(e=>this.restoreCursor(e))),this._parser.registerCsiHandler({intermediates:"'",final:"}"},(e=>this.insertColumns(e))),this._parser.registerCsiHandler({intermediates:"'",final:"~"},(e=>this.deleteColumns(e))),this._parser.registerCsiHandler({intermediates:'"',final:"q"},(e=>this.selectProtected(e))),this._parser.registerCsiHandler({intermediates:"$",final:"p"},(e=>this.requestMode(e,true))),this._parser.registerCsiHandler({prefix:"?",intermediates:"$",final:"p"},(e=>this.requestMode(e,false))),this._parser.setExecuteHandler(n.C0.BEL,(()=>this.bell())),this._parser.setExecuteHandler(n.C0.LF,(()=>this.lineFeed())),this._parser.setExecuteHandler(n.C0.VT,(()=>this.lineFeed())),this._parser.setExecuteHandler(n.C0.FF,(()=>this.lineFeed())),this._parser.setExecuteHandler(n.C0.CR,(()=>this.carriageReturn())),this._parser.setExecuteHandler(n.C0.BS,(()=>this.backspace())),this._parser.setExecuteHandler(n.C0.HT,(()=>this.tab())),this._parser.setExecuteHandler(n.C0.SO,(()=>this.shiftOut())),this._parser.setExecuteHandler(n.C0.SI,(()=>this.shiftIn())),this._parser.setExecuteHandler(n.C1.IND,(()=>this.index())),this._parser.setExecuteHandler(n.C1.NEL,(()=>this.nextLine())),this._parser.setExecuteHandler(n.C1.HTS,(()=>this.tabSet())),this._parser.registerOscHandler(0,new p.OscHandler((e=>(this.setTitle(e),this.setIconName(e),true)))),this._parser.registerOscHandler(1,new p.OscHandler((e=>this.setIconName(e)))),this._parser.registerOscHandler(2,new p.OscHandler((e=>this.setTitle(e)))),this._parser.registerOscHandler(4,new p.OscHandler((e=>this.setOrReportIndexedColor(e)))),this._parser.registerOscHandler(8,new p.OscHandler((e=>this.setHyperlink(e)))),this._parser.registerOscHandler(10,new p.OscHandler((e=>this.setOrReportFgColor(e)))),this._parser.registerOscHandler(11,new p.OscHandler((e=>this.setOrReportBgColor(e)))),this._parser.registerOscHandler(12,new p.OscHandler((e=>this.setOrReportCursorColor(e)))),this._parser.registerOscHandler(104,new p.OscHandler((e=>this.restoreIndexedColor(e)))),this._parser.registerOscHandler(110,new p.OscHandler((e=>this.restoreFgColor(e)))),this._parser.registerOscHandler(111,new p.OscHandler((e=>this.restoreBgColor(e)))),this._parser.registerOscHandler(112,new p.OscHandler((e=>this.restoreCursorColor(e)))),this._parser.registerEscHandler({final:"7"},(()=>this.saveCursor())),this._parser.registerEscHandler({final:"8"},(()=>this.restoreCursor())),this._parser.registerEscHandler({final:"D"},(()=>this.index())),this._parser.registerEscHandler({final:"E"},(()=>this.nextLine())),this._parser.registerEscHandler({final:"H"},(()=>this.tabSet())),this._parser.registerEscHandler({final:"M"},(()=>this.reverseIndex())),this._parser.registerEscHandler({final:"="},(()=>this.keypadApplicationMode())),this._parser.registerEscHandler({final:">"},(()=>this.keypadNumericMode())),this._parser.registerEscHandler({final:"c"},(()=>this.fullReset())),this._parser.registerEscHandler({final:"n"},(()=>this.setgLevel(2))),this._parser.registerEscHandler({final:"o"},(()=>this.setgLevel(3))),this._parser.registerEscHandler({final:"|"},(()=>this.setgLevel(3))),this._parser.registerEscHandler({final:"}"},(()=>this.setgLevel(2))),this._parser.registerEscHandler({final:"~"},(()=>this.setgLevel(1))),this._parser.registerEscHandler({intermediates:"%",final:"@"},(()=>this.selectDefaultCharset())),this._parser.registerEscHandler({intermediates:"%",final:"G"},(()=>this.selectDefaultCharset()));for(const e in o.CHARSETS)this._parser.registerEscHandler({intermediates:"(",final:e},(()=>this.selectCharset("("+e))),this._parser.registerEscHandler({intermediates:")",final:e},(()=>this.selectCharset(")"+e))),this._parser.registerEscHandler({intermediates:"*",final:e},(()=>this.selectCharset("*"+e))),this._parser.registerEscHandler({intermediates:"+",final:e},(()=>this.selectCharset("+"+e))),this._parser.registerEscHandler({intermediates:"-",final:e},(()=>this.selectCharset("-"+e))),this._parser.registerEscHandler({intermediates:".",final:e},(()=>this.selectCharset("."+e))),this._parser.registerEscHandler({intermediates:"/",final:e},(()=>this.selectCharset("/"+e)));this._parser.registerEscHandler({intermediates:"#",final:"8"},(()=>this.screenAlignmentPattern())),this._parser.setErrorHandler((e=>(this._logService.error("Parsing error: ",e),e))),this._parser.registerDcsHandler({intermediates:"$",final:"q"},new g.DcsHandler(((e,t)=>this.requestStatusString(e,t))));}_preserveStack(e,t,i,s){this._parseStack.paused=true,this._parseStack.cursorStartX=e,this._parseStack.cursorStartY=t,this._parseStack.decodedLength=i,this._parseStack.position=s;}_logSlowResolvingAsync(e){this._logService.logLevel<=v.LogLevelEnum.WARN&&Promise.race([e,new Promise(((e,t)=>setTimeout((()=>t("#SLOW_TIMEOUT")),5e3)))]).catch((e=>{if("#SLOW_TIMEOUT"!==e)throw e;console.warn("async parser handler taking longer than 5000 ms");}));}_getCurrentLinkId(){return this._curAttrData.extended.urlId}parse(e,t){let i,s=this._activeBuffer.x,r=this._activeBuffer.y,n=0;const o=this._parseStack.paused;if(o){if(i=this._parser.parse(this._parseBuffer,this._parseStack.decodedLength,t))return this._logSlowResolvingAsync(i),i;s=this._parseStack.cursorStartX,r=this._parseStack.cursorStartY,this._parseStack.paused=false,e.length>C&&(n=this._parseStack.position+C);}if(this._logService.logLevel<=v.LogLevelEnum.DEBUG&&this._logService.debug("parsing data"+("string"==typeof e?` "${e}"`:` "${Array.prototype.map.call(e,(e=>String.fromCharCode(e))).join("")}"`),"string"==typeof e?e.split("").map((e=>e.charCodeAt(0))):e),this._parseBuffer.length<e.length&&this._parseBuffer.length<C&&(this._parseBuffer=new Uint32Array(Math.min(e.length,C))),o||this._dirtyRowTracker.clearRange(),e.length>C)for(let t=n;t<e.length;t+=C){const n=t+C<e.length?t+C:e.length,o="string"==typeof e?this._stringDecoder.decode(e.substring(t,n),this._parseBuffer):this._utf8Decoder.decode(e.subarray(t,n),this._parseBuffer);if(i=this._parser.parse(this._parseBuffer,o))return this._preserveStack(s,r,o,t),this._logSlowResolvingAsync(i),i}else if(!o){const t="string"==typeof e?this._stringDecoder.decode(e,this._parseBuffer):this._utf8Decoder.decode(e,this._parseBuffer);if(i=this._parser.parse(this._parseBuffer,t))return this._preserveStack(s,r,t,0),this._logSlowResolvingAsync(i),i}this._activeBuffer.x===s&&this._activeBuffer.y===r||this._onCursorMove.fire(),this._onRequestRefreshRows.fire(this._dirtyRowTracker.start,this._dirtyRowTracker.end);}print(e,t,i){let s,r;const n=this._charsetService.charset,o=this._optionsService.rawOptions.screenReaderMode,a=this._bufferService.cols,h=this._coreService.decPrivateModes.wraparound,l=this._coreService.modes.insertMode,d=this._curAttrData;let u=this._activeBuffer.lines.get(this._activeBuffer.ybase+this._activeBuffer.y);this._dirtyRowTracker.markDirty(this._activeBuffer.y),this._activeBuffer.x&&i-t>0&&2===u.getWidth(this._activeBuffer.x-1)&&u.setCellFromCodePoint(this._activeBuffer.x-1,0,1,d.fg,d.bg,d.extended);for(let f=t;f<i;++f){if(s=e[f],r=this._unicodeService.wcwidth(s),s<127&&n){const e=n[String.fromCharCode(s)];e&&(s=e.charCodeAt(0));}if(o&&this._onA11yChar.fire((0, c.stringFromCodePoint)(s)),this._getCurrentLinkId()&&this._oscLinkService.addLineToLink(this._getCurrentLinkId(),this._activeBuffer.ybase+this._activeBuffer.y),r||!this._activeBuffer.x){if(this._activeBuffer.x+r-1>=a)if(h){for(;this._activeBuffer.x<a;)u.setCellFromCodePoint(this._activeBuffer.x++,0,1,d.fg,d.bg,d.extended);this._activeBuffer.x=0,this._activeBuffer.y++,this._activeBuffer.y===this._activeBuffer.scrollBottom+1?(this._activeBuffer.y--,this._bufferService.scroll(this._eraseAttrData(),true)):(this._activeBuffer.y>=this._bufferService.rows&&(this._activeBuffer.y=this._bufferService.rows-1),this._activeBuffer.lines.get(this._activeBuffer.ybase+this._activeBuffer.y).isWrapped=true),u=this._activeBuffer.lines.get(this._activeBuffer.ybase+this._activeBuffer.y);}else if(this._activeBuffer.x=a-1,2===r)continue;if(l&&(u.insertCells(this._activeBuffer.x,r,this._activeBuffer.getNullCell(d),d),2===u.getWidth(a-1)&&u.setCellFromCodePoint(a-1,_.NULL_CELL_CODE,_.NULL_CELL_WIDTH,d.fg,d.bg,d.extended)),u.setCellFromCodePoint(this._activeBuffer.x++,s,r,d.fg,d.bg,d.extended),r>0)for(;--r;)u.setCellFromCodePoint(this._activeBuffer.x++,0,0,d.fg,d.bg,d.extended);}else u.getWidth(this._activeBuffer.x-1)?u.addCodepointToCell(this._activeBuffer.x-1,s):u.addCodepointToCell(this._activeBuffer.x-2,s);}i-t>0&&(u.loadCell(this._activeBuffer.x-1,this._workCell),2===this._workCell.getWidth()||this._workCell.getCode()>65535?this._parser.precedingCodepoint=0:this._workCell.isCombined()?this._parser.precedingCodepoint=this._workCell.getChars().charCodeAt(0):this._parser.precedingCodepoint=this._workCell.content),this._activeBuffer.x<a&&i-t>0&&0===u.getWidth(this._activeBuffer.x)&&!u.hasContent(this._activeBuffer.x)&&u.setCellFromCodePoint(this._activeBuffer.x,0,1,d.fg,d.bg,d.extended),this._dirtyRowTracker.markDirty(this._activeBuffer.y);}registerCsiHandler(e,t){return "t"!==e.final||e.prefix||e.intermediates?this._parser.registerCsiHandler(e,t):this._parser.registerCsiHandler(e,(e=>!b(e.params[0],this._optionsService.rawOptions.windowOptions)||t(e)))}registerDcsHandler(e,t){return this._parser.registerDcsHandler(e,new g.DcsHandler(t))}registerEscHandler(e,t){return this._parser.registerEscHandler(e,t)}registerOscHandler(e,t){return this._parser.registerOscHandler(e,new p.OscHandler(t))}bell(){return this._onRequestBell.fire(),true}lineFeed(){return this._dirtyRowTracker.markDirty(this._activeBuffer.y),this._optionsService.rawOptions.convertEol&&(this._activeBuffer.x=0),this._activeBuffer.y++,this._activeBuffer.y===this._activeBuffer.scrollBottom+1?(this._activeBuffer.y--,this._bufferService.scroll(this._eraseAttrData())):this._activeBuffer.y>=this._bufferService.rows?this._activeBuffer.y=this._bufferService.rows-1:this._activeBuffer.lines.get(this._activeBuffer.ybase+this._activeBuffer.y).isWrapped=false,this._activeBuffer.x>=this._bufferService.cols&&this._activeBuffer.x--,this._dirtyRowTracker.markDirty(this._activeBuffer.y),this._onLineFeed.fire(),true}carriageReturn(){return this._activeBuffer.x=0,true}backspace(){var e;if(!this._coreService.decPrivateModes.reverseWraparound)return this._restrictCursor(),this._activeBuffer.x>0&&this._activeBuffer.x--,true;if(this._restrictCursor(this._bufferService.cols),this._activeBuffer.x>0)this._activeBuffer.x--;else if(0===this._activeBuffer.x&&this._activeBuffer.y>this._activeBuffer.scrollTop&&this._activeBuffer.y<=this._activeBuffer.scrollBottom&&(null===(e=this._activeBuffer.lines.get(this._activeBuffer.ybase+this._activeBuffer.y))||void 0===e?void 0:e.isWrapped)){this._activeBuffer.lines.get(this._activeBuffer.ybase+this._activeBuffer.y).isWrapped=false,this._activeBuffer.y--,this._activeBuffer.x=this._bufferService.cols-1;const e=this._activeBuffer.lines.get(this._activeBuffer.ybase+this._activeBuffer.y);e.hasWidth(this._activeBuffer.x)&&!e.hasContent(this._activeBuffer.x)&&this._activeBuffer.x--;}return this._restrictCursor(),true}tab(){if(this._activeBuffer.x>=this._bufferService.cols)return  true;const e=this._activeBuffer.x;return this._activeBuffer.x=this._activeBuffer.nextStop(),this._optionsService.rawOptions.screenReaderMode&&this._onA11yTab.fire(this._activeBuffer.x-e),true}shiftOut(){return this._charsetService.setgLevel(1),true}shiftIn(){return this._charsetService.setgLevel(0),true}_restrictCursor(e=this._bufferService.cols-1){this._activeBuffer.x=Math.min(e,Math.max(0,this._activeBuffer.x)),this._activeBuffer.y=this._coreService.decPrivateModes.origin?Math.min(this._activeBuffer.scrollBottom,Math.max(this._activeBuffer.scrollTop,this._activeBuffer.y)):Math.min(this._bufferService.rows-1,Math.max(0,this._activeBuffer.y)),this._dirtyRowTracker.markDirty(this._activeBuffer.y);}_setCursor(e,t){this._dirtyRowTracker.markDirty(this._activeBuffer.y),this._coreService.decPrivateModes.origin?(this._activeBuffer.x=e,this._activeBuffer.y=this._activeBuffer.scrollTop+t):(this._activeBuffer.x=e,this._activeBuffer.y=t),this._restrictCursor(),this._dirtyRowTracker.markDirty(this._activeBuffer.y);}_moveCursor(e,t){this._restrictCursor(),this._setCursor(this._activeBuffer.x+e,this._activeBuffer.y+t);}cursorUp(e){const t=this._activeBuffer.y-this._activeBuffer.scrollTop;return t>=0?this._moveCursor(0,-Math.min(t,e.params[0]||1)):this._moveCursor(0,-(e.params[0]||1)),true}cursorDown(e){const t=this._activeBuffer.scrollBottom-this._activeBuffer.y;return t>=0?this._moveCursor(0,Math.min(t,e.params[0]||1)):this._moveCursor(0,e.params[0]||1),true}cursorForward(e){return this._moveCursor(e.params[0]||1,0),true}cursorBackward(e){return this._moveCursor(-(e.params[0]||1),0),true}cursorNextLine(e){return this.cursorDown(e),this._activeBuffer.x=0,true}cursorPrecedingLine(e){return this.cursorUp(e),this._activeBuffer.x=0,true}cursorCharAbsolute(e){return this._setCursor((e.params[0]||1)-1,this._activeBuffer.y),true}cursorPosition(e){return this._setCursor(e.length>=2?(e.params[1]||1)-1:0,(e.params[0]||1)-1),true}charPosAbsolute(e){return this._setCursor((e.params[0]||1)-1,this._activeBuffer.y),true}hPositionRelative(e){return this._moveCursor(e.params[0]||1,0),true}linePosAbsolute(e){return this._setCursor(this._activeBuffer.x,(e.params[0]||1)-1),true}vPositionRelative(e){return this._moveCursor(0,e.params[0]||1),true}hVPosition(e){return this.cursorPosition(e),true}tabClear(e){const t=e.params[0];return 0===t?delete this._activeBuffer.tabs[this._activeBuffer.x]:3===t&&(this._activeBuffer.tabs={}),true}cursorForwardTab(e){if(this._activeBuffer.x>=this._bufferService.cols)return  true;let t=e.params[0]||1;for(;t--;)this._activeBuffer.x=this._activeBuffer.nextStop();return  true}cursorBackwardTab(e){if(this._activeBuffer.x>=this._bufferService.cols)return  true;let t=e.params[0]||1;for(;t--;)this._activeBuffer.x=this._activeBuffer.prevStop();return  true}selectProtected(e){const t=e.params[0];return 1===t&&(this._curAttrData.bg|=536870912),2!==t&&0!==t||(this._curAttrData.bg&=-536870913),true}_eraseInBufferLine(e,t,i,s=false,r=false){const n=this._activeBuffer.lines.get(this._activeBuffer.ybase+e);n.replaceCells(t,i,this._activeBuffer.getNullCell(this._eraseAttrData()),this._eraseAttrData(),r),s&&(n.isWrapped=false);}_resetBufferLine(e,t=false){const i=this._activeBuffer.lines.get(this._activeBuffer.ybase+e);i&&(i.fill(this._activeBuffer.getNullCell(this._eraseAttrData()),t),this._bufferService.buffer.clearMarkers(this._activeBuffer.ybase+e),i.isWrapped=false);}eraseInDisplay(e,t=false){let i;switch(this._restrictCursor(this._bufferService.cols),e.params[0]){case 0:for(i=this._activeBuffer.y,this._dirtyRowTracker.markDirty(i),this._eraseInBufferLine(i++,this._activeBuffer.x,this._bufferService.cols,0===this._activeBuffer.x,t);i<this._bufferService.rows;i++)this._resetBufferLine(i,t);this._dirtyRowTracker.markDirty(i);break;case 1:for(i=this._activeBuffer.y,this._dirtyRowTracker.markDirty(i),this._eraseInBufferLine(i,0,this._activeBuffer.x+1,true,t),this._activeBuffer.x+1>=this._bufferService.cols&&(this._activeBuffer.lines.get(i+1).isWrapped=false);i--;)this._resetBufferLine(i,t);this._dirtyRowTracker.markDirty(0);break;case 2:for(i=this._bufferService.rows,this._dirtyRowTracker.markDirty(i-1);i--;)this._resetBufferLine(i,t);this._dirtyRowTracker.markDirty(0);break;case 3:const e=this._activeBuffer.lines.length-this._bufferService.rows;e>0&&(this._activeBuffer.lines.trimStart(e),this._activeBuffer.ybase=Math.max(this._activeBuffer.ybase-e,0),this._activeBuffer.ydisp=Math.max(this._activeBuffer.ydisp-e,0),this._onScroll.fire(0));}return  true}eraseInLine(e,t=false){switch(this._restrictCursor(this._bufferService.cols),e.params[0]){case 0:this._eraseInBufferLine(this._activeBuffer.y,this._activeBuffer.x,this._bufferService.cols,0===this._activeBuffer.x,t);break;case 1:this._eraseInBufferLine(this._activeBuffer.y,0,this._activeBuffer.x+1,false,t);break;case 2:this._eraseInBufferLine(this._activeBuffer.y,0,this._bufferService.cols,true,t);}return this._dirtyRowTracker.markDirty(this._activeBuffer.y),true}insertLines(e){this._restrictCursor();let t=e.params[0]||1;if(this._activeBuffer.y>this._activeBuffer.scrollBottom||this._activeBuffer.y<this._activeBuffer.scrollTop)return  true;const i=this._activeBuffer.ybase+this._activeBuffer.y,s=this._bufferService.rows-1-this._activeBuffer.scrollBottom,r=this._bufferService.rows-1+this._activeBuffer.ybase-s+1;for(;t--;)this._activeBuffer.lines.splice(r-1,1),this._activeBuffer.lines.splice(i,0,this._activeBuffer.getBlankLine(this._eraseAttrData()));return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.y,this._activeBuffer.scrollBottom),this._activeBuffer.x=0,true}deleteLines(e){this._restrictCursor();let t=e.params[0]||1;if(this._activeBuffer.y>this._activeBuffer.scrollBottom||this._activeBuffer.y<this._activeBuffer.scrollTop)return  true;const i=this._activeBuffer.ybase+this._activeBuffer.y;let s;for(s=this._bufferService.rows-1-this._activeBuffer.scrollBottom,s=this._bufferService.rows-1+this._activeBuffer.ybase-s;t--;)this._activeBuffer.lines.splice(i,1),this._activeBuffer.lines.splice(s,0,this._activeBuffer.getBlankLine(this._eraseAttrData()));return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.y,this._activeBuffer.scrollBottom),this._activeBuffer.x=0,true}insertChars(e){this._restrictCursor();const t=this._activeBuffer.lines.get(this._activeBuffer.ybase+this._activeBuffer.y);return t&&(t.insertCells(this._activeBuffer.x,e.params[0]||1,this._activeBuffer.getNullCell(this._eraseAttrData()),this._eraseAttrData()),this._dirtyRowTracker.markDirty(this._activeBuffer.y)),true}deleteChars(e){this._restrictCursor();const t=this._activeBuffer.lines.get(this._activeBuffer.ybase+this._activeBuffer.y);return t&&(t.deleteCells(this._activeBuffer.x,e.params[0]||1,this._activeBuffer.getNullCell(this._eraseAttrData()),this._eraseAttrData()),this._dirtyRowTracker.markDirty(this._activeBuffer.y)),true}scrollUp(e){let t=e.params[0]||1;for(;t--;)this._activeBuffer.lines.splice(this._activeBuffer.ybase+this._activeBuffer.scrollTop,1),this._activeBuffer.lines.splice(this._activeBuffer.ybase+this._activeBuffer.scrollBottom,0,this._activeBuffer.getBlankLine(this._eraseAttrData()));return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop,this._activeBuffer.scrollBottom),true}scrollDown(e){let t=e.params[0]||1;for(;t--;)this._activeBuffer.lines.splice(this._activeBuffer.ybase+this._activeBuffer.scrollBottom,1),this._activeBuffer.lines.splice(this._activeBuffer.ybase+this._activeBuffer.scrollTop,0,this._activeBuffer.getBlankLine(l.DEFAULT_ATTR_DATA));return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop,this._activeBuffer.scrollBottom),true}scrollLeft(e){if(this._activeBuffer.y>this._activeBuffer.scrollBottom||this._activeBuffer.y<this._activeBuffer.scrollTop)return  true;const t=e.params[0]||1;for(let e=this._activeBuffer.scrollTop;e<=this._activeBuffer.scrollBottom;++e){const i=this._activeBuffer.lines.get(this._activeBuffer.ybase+e);i.deleteCells(0,t,this._activeBuffer.getNullCell(this._eraseAttrData()),this._eraseAttrData()),i.isWrapped=false;}return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop,this._activeBuffer.scrollBottom),true}scrollRight(e){if(this._activeBuffer.y>this._activeBuffer.scrollBottom||this._activeBuffer.y<this._activeBuffer.scrollTop)return  true;const t=e.params[0]||1;for(let e=this._activeBuffer.scrollTop;e<=this._activeBuffer.scrollBottom;++e){const i=this._activeBuffer.lines.get(this._activeBuffer.ybase+e);i.insertCells(0,t,this._activeBuffer.getNullCell(this._eraseAttrData()),this._eraseAttrData()),i.isWrapped=false;}return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop,this._activeBuffer.scrollBottom),true}insertColumns(e){if(this._activeBuffer.y>this._activeBuffer.scrollBottom||this._activeBuffer.y<this._activeBuffer.scrollTop)return  true;const t=e.params[0]||1;for(let e=this._activeBuffer.scrollTop;e<=this._activeBuffer.scrollBottom;++e){const i=this._activeBuffer.lines.get(this._activeBuffer.ybase+e);i.insertCells(this._activeBuffer.x,t,this._activeBuffer.getNullCell(this._eraseAttrData()),this._eraseAttrData()),i.isWrapped=false;}return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop,this._activeBuffer.scrollBottom),true}deleteColumns(e){if(this._activeBuffer.y>this._activeBuffer.scrollBottom||this._activeBuffer.y<this._activeBuffer.scrollTop)return  true;const t=e.params[0]||1;for(let e=this._activeBuffer.scrollTop;e<=this._activeBuffer.scrollBottom;++e){const i=this._activeBuffer.lines.get(this._activeBuffer.ybase+e);i.deleteCells(this._activeBuffer.x,t,this._activeBuffer.getNullCell(this._eraseAttrData()),this._eraseAttrData()),i.isWrapped=false;}return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop,this._activeBuffer.scrollBottom),true}eraseChars(e){this._restrictCursor();const t=this._activeBuffer.lines.get(this._activeBuffer.ybase+this._activeBuffer.y);return t&&(t.replaceCells(this._activeBuffer.x,this._activeBuffer.x+(e.params[0]||1),this._activeBuffer.getNullCell(this._eraseAttrData()),this._eraseAttrData()),this._dirtyRowTracker.markDirty(this._activeBuffer.y)),true}repeatPrecedingCharacter(e){if(!this._parser.precedingCodepoint)return  true;const t=e.params[0]||1,i=new Uint32Array(t);for(let e=0;e<t;++e)i[e]=this._parser.precedingCodepoint;return this.print(i,0,i.length),true}sendDeviceAttributesPrimary(e){return e.params[0]>0||(this._is("xterm")||this._is("rxvt-unicode")||this._is("screen")?this._coreService.triggerDataEvent(n.C0.ESC+"[?1;2c"):this._is("linux")&&this._coreService.triggerDataEvent(n.C0.ESC+"[?6c")),true}sendDeviceAttributesSecondary(e){return e.params[0]>0||(this._is("xterm")?this._coreService.triggerDataEvent(n.C0.ESC+"[>0;276;0c"):this._is("rxvt-unicode")?this._coreService.triggerDataEvent(n.C0.ESC+"[>85;95;0c"):this._is("linux")?this._coreService.triggerDataEvent(e.params[0]+"c"):this._is("screen")&&this._coreService.triggerDataEvent(n.C0.ESC+"[>83;40003;0c")),true}_is(e){return 0===(this._optionsService.rawOptions.termName+"").indexOf(e)}setMode(e){for(let t=0;t<e.length;t++)switch(e.params[t]){case 4:this._coreService.modes.insertMode=true;break;case 20:this._optionsService.options.convertEol=true;}return  true}setModePrivate(e){for(let t=0;t<e.length;t++)switch(e.params[t]){case 1:this._coreService.decPrivateModes.applicationCursorKeys=true;break;case 2:this._charsetService.setgCharset(0,o.DEFAULT_CHARSET),this._charsetService.setgCharset(1,o.DEFAULT_CHARSET),this._charsetService.setgCharset(2,o.DEFAULT_CHARSET),this._charsetService.setgCharset(3,o.DEFAULT_CHARSET);break;case 3:this._optionsService.rawOptions.windowOptions.setWinLines&&(this._bufferService.resize(132,this._bufferService.rows),this._onRequestReset.fire());break;case 6:this._coreService.decPrivateModes.origin=true,this._setCursor(0,0);break;case 7:this._coreService.decPrivateModes.wraparound=true;break;case 12:this._optionsService.options.cursorBlink=true;break;case 45:this._coreService.decPrivateModes.reverseWraparound=true;break;case 66:this._logService.debug("Serial port requested application keypad."),this._coreService.decPrivateModes.applicationKeypad=true,this._onRequestSyncScrollBar.fire();break;case 9:this._coreMouseService.activeProtocol="X10";break;case 1e3:this._coreMouseService.activeProtocol="VT200";break;case 1002:this._coreMouseService.activeProtocol="DRAG";break;case 1003:this._coreMouseService.activeProtocol="ANY";break;case 1004:this._coreService.decPrivateModes.sendFocus=true,this._onRequestSendFocus.fire();break;case 1005:this._logService.debug("DECSET 1005 not supported (see #2507)");break;case 1006:this._coreMouseService.activeEncoding="SGR";break;case 1015:this._logService.debug("DECSET 1015 not supported (see #2507)");break;case 1016:this._coreMouseService.activeEncoding="SGR_PIXELS";break;case 25:this._coreService.isCursorHidden=false;break;case 1048:this.saveCursor();break;case 1049:this.saveCursor();case 47:case 1047:this._bufferService.buffers.activateAltBuffer(this._eraseAttrData()),this._coreService.isCursorInitialized=true,this._onRequestRefreshRows.fire(0,this._bufferService.rows-1),this._onRequestSyncScrollBar.fire();break;case 2004:this._coreService.decPrivateModes.bracketedPasteMode=true;}return  true}resetMode(e){for(let t=0;t<e.length;t++)switch(e.params[t]){case 4:this._coreService.modes.insertMode=false;break;case 20:this._optionsService.options.convertEol=false;}return  true}resetModePrivate(e){for(let t=0;t<e.length;t++)switch(e.params[t]){case 1:this._coreService.decPrivateModes.applicationCursorKeys=false;break;case 3:this._optionsService.rawOptions.windowOptions.setWinLines&&(this._bufferService.resize(80,this._bufferService.rows),this._onRequestReset.fire());break;case 6:this._coreService.decPrivateModes.origin=false,this._setCursor(0,0);break;case 7:this._coreService.decPrivateModes.wraparound=false;break;case 12:this._optionsService.options.cursorBlink=false;break;case 45:this._coreService.decPrivateModes.reverseWraparound=false;break;case 66:this._logService.debug("Switching back to normal keypad."),this._coreService.decPrivateModes.applicationKeypad=false,this._onRequestSyncScrollBar.fire();break;case 9:case 1e3:case 1002:case 1003:this._coreMouseService.activeProtocol="NONE";break;case 1004:this._coreService.decPrivateModes.sendFocus=false;break;case 1005:this._logService.debug("DECRST 1005 not supported (see #2507)");break;case 1006:case 1016:this._coreMouseService.activeEncoding="DEFAULT";break;case 1015:this._logService.debug("DECRST 1015 not supported (see #2507)");break;case 25:this._coreService.isCursorHidden=true;break;case 1048:this.restoreCursor();break;case 1049:case 47:case 1047:this._bufferService.buffers.activateNormalBuffer(),1049===e.params[t]&&this.restoreCursor(),this._coreService.isCursorInitialized=true,this._onRequestRefreshRows.fire(0,this._bufferService.rows-1),this._onRequestSyncScrollBar.fire();break;case 2004:this._coreService.decPrivateModes.bracketedPasteMode=false;}return  true}requestMode(e,t){const i=this._coreService.decPrivateModes,{activeProtocol:s,activeEncoding:r}=this._coreMouseService,o=this._coreService,{buffers:a,cols:h}=this._bufferService,{active:c,alt:l}=a,d=this._optionsService.rawOptions,_=e=>e?1:2,u=e.params[0];return f=u,v=t?2===u?4:4===u?_(o.modes.insertMode):12===u?3:20===u?_(d.convertEol):0:1===u?_(i.applicationCursorKeys):3===u?d.windowOptions.setWinLines?80===h?2:132===h?1:0:0:6===u?_(i.origin):7===u?_(i.wraparound):8===u?3:9===u?_("X10"===s):12===u?_(d.cursorBlink):25===u?_(!o.isCursorHidden):45===u?_(i.reverseWraparound):66===u?_(i.applicationKeypad):67===u?4:1e3===u?_("VT200"===s):1002===u?_("DRAG"===s):1003===u?_("ANY"===s):1004===u?_(i.sendFocus):1005===u?4:1006===u?_("SGR"===r):1015===u?4:1016===u?_("SGR_PIXELS"===r):1048===u?1:47===u||1047===u||1049===u?_(c===l):2004===u?_(i.bracketedPasteMode):0,o.triggerDataEvent(`${n.C0.ESC}[${t?"":"?"}${f};${v}$y`),true;var f,v;}_updateAttrColor(e,t,i,s,r){return 2===t?(e|=50331648,e&=-16777216,e|=f.AttributeData.fromColorRGB([i,s,r])):5===t&&(e&=-50331904,e|=33554432|255&i),e}_extractColor(e,t,i){const s=[0,0,-1,0,0,0];let r=0,n=0;do{if(s[n+r]=e.params[t+n],e.hasSubParams(t+n)){const i=e.getSubParams(t+n);let o=0;do{5===s[1]&&(r=1),s[n+o+1+r]=i[o];}while(++o<i.length&&o+n+1+r<s.length);break}if(5===s[1]&&n+r>=2||2===s[1]&&n+r>=5)break;s[1]&&(r=1);}while(++n+t<e.length&&n+r<s.length);for(let e=2;e<s.length;++e) -1===s[e]&&(s[e]=0);switch(s[0]){case 38:i.fg=this._updateAttrColor(i.fg,s[1],s[3],s[4],s[5]);break;case 48:i.bg=this._updateAttrColor(i.bg,s[1],s[3],s[4],s[5]);break;case 58:i.extended=i.extended.clone(),i.extended.underlineColor=this._updateAttrColor(i.extended.underlineColor,s[1],s[3],s[4],s[5]);}return n}_processUnderline(e,t){t.extended=t.extended.clone(),(!~e||e>5)&&(e=1),t.extended.underlineStyle=e,t.fg|=268435456,0===e&&(t.fg&=-268435457),t.updateExtended();}_processSGR0(e){e.fg=l.DEFAULT_ATTR_DATA.fg,e.bg=l.DEFAULT_ATTR_DATA.bg,e.extended=e.extended.clone(),e.extended.underlineStyle=0,e.extended.underlineColor&=-67108864,e.updateExtended();}charAttributes(e){if(1===e.length&&0===e.params[0])return this._processSGR0(this._curAttrData),true;const t=e.length;let i;const s=this._curAttrData;for(let r=0;r<t;r++)i=e.params[r],i>=30&&i<=37?(s.fg&=-50331904,s.fg|=16777216|i-30):i>=40&&i<=47?(s.bg&=-50331904,s.bg|=16777216|i-40):i>=90&&i<=97?(s.fg&=-50331904,s.fg|=16777224|i-90):i>=100&&i<=107?(s.bg&=-50331904,s.bg|=16777224|i-100):0===i?this._processSGR0(s):1===i?s.fg|=134217728:3===i?s.bg|=67108864:4===i?(s.fg|=268435456,this._processUnderline(e.hasSubParams(r)?e.getSubParams(r)[0]:1,s)):5===i?s.fg|=536870912:7===i?s.fg|=67108864:8===i?s.fg|=1073741824:9===i?s.fg|=2147483648:2===i?s.bg|=134217728:21===i?this._processUnderline(2,s):22===i?(s.fg&=-134217729,s.bg&=-134217729):23===i?s.bg&=-67108865:24===i?(s.fg&=-268435457,this._processUnderline(0,s)):25===i?s.fg&=-536870913:27===i?s.fg&=-67108865:28===i?s.fg&=-1073741825:29===i?s.fg&=2147483647:39===i?(s.fg&=-67108864,s.fg|=16777215&l.DEFAULT_ATTR_DATA.fg):49===i?(s.bg&=-67108864,s.bg|=16777215&l.DEFAULT_ATTR_DATA.bg):38===i||48===i||58===i?r+=this._extractColor(e,r,s):53===i?s.bg|=1073741824:55===i?s.bg&=-1073741825:59===i?(s.extended=s.extended.clone(),s.extended.underlineColor=-1,s.updateExtended()):100===i?(s.fg&=-67108864,s.fg|=16777215&l.DEFAULT_ATTR_DATA.fg,s.bg&=-67108864,s.bg|=16777215&l.DEFAULT_ATTR_DATA.bg):this._logService.debug("Unknown SGR attribute: %d.",i);return  true}deviceStatus(e){switch(e.params[0]){case 5:this._coreService.triggerDataEvent(`${n.C0.ESC}[0n`);break;case 6:const e=this._activeBuffer.y+1,t=this._activeBuffer.x+1;this._coreService.triggerDataEvent(`${n.C0.ESC}[${e};${t}R`);}return  true}deviceStatusPrivate(e){if(6===e.params[0]){const e=this._activeBuffer.y+1,t=this._activeBuffer.x+1;this._coreService.triggerDataEvent(`${n.C0.ESC}[?${e};${t}R`);}return  true}softReset(e){return this._coreService.isCursorHidden=false,this._onRequestSyncScrollBar.fire(),this._activeBuffer.scrollTop=0,this._activeBuffer.scrollBottom=this._bufferService.rows-1,this._curAttrData=l.DEFAULT_ATTR_DATA.clone(),this._coreService.reset(),this._charsetService.reset(),this._activeBuffer.savedX=0,this._activeBuffer.savedY=this._activeBuffer.ybase,this._activeBuffer.savedCurAttrData.fg=this._curAttrData.fg,this._activeBuffer.savedCurAttrData.bg=this._curAttrData.bg,this._activeBuffer.savedCharset=this._charsetService.charset,this._coreService.decPrivateModes.origin=false,true}setCursorStyle(e){const t=e.params[0]||1;switch(t){case 1:case 2:this._optionsService.options.cursorStyle="block";break;case 3:case 4:this._optionsService.options.cursorStyle="underline";break;case 5:case 6:this._optionsService.options.cursorStyle="bar";}const i=t%2==1;return this._optionsService.options.cursorBlink=i,true}setScrollRegion(e){const t=e.params[0]||1;let i;return (e.length<2||(i=e.params[1])>this._bufferService.rows||0===i)&&(i=this._bufferService.rows),i>t&&(this._activeBuffer.scrollTop=t-1,this._activeBuffer.scrollBottom=i-1,this._setCursor(0,0)),true}windowOptions(e){if(!b(e.params[0],this._optionsService.rawOptions.windowOptions))return  true;const t=e.length>1?e.params[1]:0;switch(e.params[0]){case 14:2!==t&&this._onRequestWindowsOptionsReport.fire(y.GET_WIN_SIZE_PIXELS);break;case 16:this._onRequestWindowsOptionsReport.fire(y.GET_CELL_SIZE_PIXELS);break;case 18:this._bufferService&&this._coreService.triggerDataEvent(`${n.C0.ESC}[8;${this._bufferService.rows};${this._bufferService.cols}t`);break;case 22:0!==t&&2!==t||(this._windowTitleStack.push(this._windowTitle),this._windowTitleStack.length>10&&this._windowTitleStack.shift()),0!==t&&1!==t||(this._iconNameStack.push(this._iconName),this._iconNameStack.length>10&&this._iconNameStack.shift());break;case 23:0!==t&&2!==t||this._windowTitleStack.length&&this.setTitle(this._windowTitleStack.pop()),0!==t&&1!==t||this._iconNameStack.length&&this.setIconName(this._iconNameStack.pop());}return  true}saveCursor(e){return this._activeBuffer.savedX=this._activeBuffer.x,this._activeBuffer.savedY=this._activeBuffer.ybase+this._activeBuffer.y,this._activeBuffer.savedCurAttrData.fg=this._curAttrData.fg,this._activeBuffer.savedCurAttrData.bg=this._curAttrData.bg,this._activeBuffer.savedCharset=this._charsetService.charset,true}restoreCursor(e){return this._activeBuffer.x=this._activeBuffer.savedX||0,this._activeBuffer.y=Math.max(this._activeBuffer.savedY-this._activeBuffer.ybase,0),this._curAttrData.fg=this._activeBuffer.savedCurAttrData.fg,this._curAttrData.bg=this._activeBuffer.savedCurAttrData.bg,this._charsetService.charset=this._savedCharset,this._activeBuffer.savedCharset&&(this._charsetService.charset=this._activeBuffer.savedCharset),this._restrictCursor(),true}setTitle(e){return this._windowTitle=e,this._onTitleChange.fire(e),true}setIconName(e){return this._iconName=e,true}setOrReportIndexedColor(e){const t=[],i=e.split(";");for(;i.length>1;){const e=i.shift(),s=i.shift();if(/^\d+$/.exec(e)){const i=parseInt(e);if(L(i))if("?"===s)t.push({type:0,index:i});else {const e=(0, m.parseColor)(s);e&&t.push({type:1,index:i,color:e});}}}return t.length&&this._onColor.fire(t),true}setHyperlink(e){const t=e.split(";");return !(t.length<2)&&(t[1]?this._createHyperlink(t[0],t[1]):!t[0]&&this._finishHyperlink())}_createHyperlink(e,t){this._getCurrentLinkId()&&this._finishHyperlink();const i=e.split(":");let s;const r=i.findIndex((e=>e.startsWith("id=")));return  -1!==r&&(s=i[r].slice(3)||void 0),this._curAttrData.extended=this._curAttrData.extended.clone(),this._curAttrData.extended.urlId=this._oscLinkService.registerLink({id:s,uri:t}),this._curAttrData.updateExtended(),true}_finishHyperlink(){return this._curAttrData.extended=this._curAttrData.extended.clone(),this._curAttrData.extended.urlId=0,this._curAttrData.updateExtended(),true}_setOrReportSpecialColor(e,t){const i=e.split(";");for(let e=0;e<i.length&&!(t>=this._specialColors.length);++e,++t)if("?"===i[e])this._onColor.fire([{type:0,index:this._specialColors[t]}]);else {const s=(0, m.parseColor)(i[e]);s&&this._onColor.fire([{type:1,index:this._specialColors[t],color:s}]);}return  true}setOrReportFgColor(e){return this._setOrReportSpecialColor(e,0)}setOrReportBgColor(e){return this._setOrReportSpecialColor(e,1)}setOrReportCursorColor(e){return this._setOrReportSpecialColor(e,2)}restoreIndexedColor(e){if(!e)return this._onColor.fire([{type:2}]),true;const t=[],i=e.split(";");for(let e=0;e<i.length;++e)if(/^\d+$/.exec(i[e])){const s=parseInt(i[e]);L(s)&&t.push({type:2,index:s});}return t.length&&this._onColor.fire(t),true}restoreFgColor(e){return this._onColor.fire([{type:2,index:256}]),true}restoreBgColor(e){return this._onColor.fire([{type:2,index:257}]),true}restoreCursorColor(e){return this._onColor.fire([{type:2,index:258}]),true}nextLine(){return this._activeBuffer.x=0,this.index(),true}keypadApplicationMode(){return this._logService.debug("Serial port requested application keypad."),this._coreService.decPrivateModes.applicationKeypad=true,this._onRequestSyncScrollBar.fire(),true}keypadNumericMode(){return this._logService.debug("Switching back to normal keypad."),this._coreService.decPrivateModes.applicationKeypad=false,this._onRequestSyncScrollBar.fire(),true}selectDefaultCharset(){return this._charsetService.setgLevel(0),this._charsetService.setgCharset(0,o.DEFAULT_CHARSET),true}selectCharset(e){return 2!==e.length?(this.selectDefaultCharset(),true):("/"===e[0]||this._charsetService.setgCharset(S[e[0]],o.CHARSETS[e[1]]||o.DEFAULT_CHARSET),true)}index(){return this._restrictCursor(),this._activeBuffer.y++,this._activeBuffer.y===this._activeBuffer.scrollBottom+1?(this._activeBuffer.y--,this._bufferService.scroll(this._eraseAttrData())):this._activeBuffer.y>=this._bufferService.rows&&(this._activeBuffer.y=this._bufferService.rows-1),this._restrictCursor(),true}tabSet(){return this._activeBuffer.tabs[this._activeBuffer.x]=true,true}reverseIndex(){if(this._restrictCursor(),this._activeBuffer.y===this._activeBuffer.scrollTop){const e=this._activeBuffer.scrollBottom-this._activeBuffer.scrollTop;this._activeBuffer.lines.shiftElements(this._activeBuffer.ybase+this._activeBuffer.y,e,1),this._activeBuffer.lines.set(this._activeBuffer.ybase+this._activeBuffer.y,this._activeBuffer.getBlankLine(this._eraseAttrData())),this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop,this._activeBuffer.scrollBottom);}else this._activeBuffer.y--,this._restrictCursor();return  true}fullReset(){return this._parser.reset(),this._onRequestReset.fire(),true}reset(){this._curAttrData=l.DEFAULT_ATTR_DATA.clone(),this._eraseAttrDataInternal=l.DEFAULT_ATTR_DATA.clone();}_eraseAttrData(){return this._eraseAttrDataInternal.bg&=-67108864,this._eraseAttrDataInternal.bg|=67108863&this._curAttrData.bg,this._eraseAttrDataInternal}setgLevel(e){return this._charsetService.setgLevel(e),true}screenAlignmentPattern(){const e=new u.CellData;e.content=1<<22|"E".charCodeAt(0),e.fg=this._curAttrData.fg,e.bg=this._curAttrData.bg,this._setCursor(0,0);for(let t=0;t<this._bufferService.rows;++t){const i=this._activeBuffer.ybase+this._activeBuffer.y+t,s=this._activeBuffer.lines.get(i);s&&(s.fill(e),s.isWrapped=false);}return this._dirtyRowTracker.markAllDirty(),this._setCursor(0,0),true}requestStatusString(e,t){const i=this._bufferService.buffer,s=this._optionsService.rawOptions;return (e=>(this._coreService.triggerDataEvent(`${n.C0.ESC}${e}${n.C0.ESC}\\`),true))('"q'===e?`P1$r${this._curAttrData.isProtected()?1:0}"q`:'"p'===e?'P1$r61;1"p':"r"===e?`P1$r${i.scrollTop+1};${i.scrollBottom+1}r`:"m"===e?"P1$r0m":" q"===e?`P1$r${{block:2,underline:4,bar:6}[s.cursorStyle]-(s.cursorBlink?1:0)} q`:"P0$r")}markRangeDirty(e,t){this._dirtyRowTracker.markRangeDirty(e,t);}}t.InputHandler=E;let k=class{constructor(e){this._bufferService=e,this.clearRange();}clearRange(){this.start=this._bufferService.buffer.y,this.end=this._bufferService.buffer.y;}markDirty(e){e<this.start?this.start=e:e>this.end&&(this.end=e);}markRangeDirty(e,t){e>t&&(w=e,e=t,t=w),e<this.start&&(this.start=e),t>this.end&&(this.end=t);}markAllDirty(){this.markRangeDirty(0,this._bufferService.rows-1);}};function L(e){return 0<=e&&e<256}k=s([r(0,v.IBufferService)],k);},844:(e,t)=>{function i(e){for(const t of e)t.dispose();e.length=0;}Object.defineProperty(t,"__esModule",{value:true}),t.getDisposeArrayDisposable=t.disposeArray=t.toDisposable=t.MutableDisposable=t.Disposable=void 0,t.Disposable=class{constructor(){this._disposables=[],this._isDisposed=false;}dispose(){this._isDisposed=true;for(const e of this._disposables)e.dispose();this._disposables.length=0;}register(e){return this._disposables.push(e),e}unregister(e){const t=this._disposables.indexOf(e);-1!==t&&this._disposables.splice(t,1);}},t.MutableDisposable=class{constructor(){this._isDisposed=false;}get value(){return this._isDisposed?void 0:this._value}set value(e){var t;this._isDisposed||e===this._value||(null===(t=this._value)||void 0===t||t.dispose(),this._value=e);}clear(){this.value=void 0;}dispose(){var e;this._isDisposed=true,null===(e=this._value)||void 0===e||e.dispose(),this._value=void 0;}},t.toDisposable=function(e){return {dispose:e}},t.disposeArray=i,t.getDisposeArrayDisposable=function(e){return {dispose:()=>i(e)}};},1505:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.FourKeyMap=t.TwoKeyMap=void 0;class i{constructor(){this._data={};}set(e,t,i){this._data[e]||(this._data[e]={}),this._data[e][t]=i;}get(e,t){return this._data[e]?this._data[e][t]:void 0}clear(){this._data={};}}t.TwoKeyMap=i,t.FourKeyMap=class{constructor(){this._data=new i;}set(e,t,s,r,n){this._data.get(e,t)||this._data.set(e,t,new i),this._data.get(e,t).set(s,r,n);}get(e,t,i,s){var r;return null===(r=this._data.get(e,t))||void 0===r?void 0:r.get(i,s)}clear(){this._data.clear();}};},6114:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.isChromeOS=t.isLinux=t.isWindows=t.isIphone=t.isIpad=t.isMac=t.getSafariVersion=t.isSafari=t.isLegacyEdge=t.isFirefox=t.isNode=void 0,t.isNode="undefined"==typeof navigator;const i=t.isNode?"node":navigator.userAgent,s=t.isNode?"node":navigator.platform;t.isFirefox=i.includes("Firefox"),t.isLegacyEdge=i.includes("Edge"),t.isSafari=/^((?!chrome|android).)*safari/i.test(i),t.getSafariVersion=function(){if(!t.isSafari)return 0;const e=i.match(/Version\/(\d+)/);return null===e||e.length<2?0:parseInt(e[1])},t.isMac=["Macintosh","MacIntel","MacPPC","Mac68K"].includes(s),t.isIpad="iPad"===s,t.isIphone="iPhone"===s,t.isWindows=["Windows","Win16","Win32","WinCE"].includes(s),t.isLinux=s.indexOf("Linux")>=0,t.isChromeOS=/\bCrOS\b/.test(i);},6106:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.SortedList=void 0;let i=0;t.SortedList=class{constructor(e){this._getKey=e,this._array=[];}clear(){this._array.length=0;}insert(e){0!==this._array.length?(i=this._search(this._getKey(e)),this._array.splice(i,0,e)):this._array.push(e);}delete(e){if(0===this._array.length)return  false;const t=this._getKey(e);if(void 0===t)return  false;if(i=this._search(t),-1===i)return  false;if(this._getKey(this._array[i])!==t)return  false;do{if(this._array[i]===e)return this._array.splice(i,1),true}while(++i<this._array.length&&this._getKey(this._array[i])===t);return  false}*getKeyIterator(e){if(0!==this._array.length&&(i=this._search(e),!(i<0||i>=this._array.length)&&this._getKey(this._array[i])===e))do{yield this._array[i];}while(++i<this._array.length&&this._getKey(this._array[i])===e)}forEachByKey(e,t){if(0!==this._array.length&&(i=this._search(e),!(i<0||i>=this._array.length)&&this._getKey(this._array[i])===e))do{t(this._array[i]);}while(++i<this._array.length&&this._getKey(this._array[i])===e)}values(){return [...this._array].values()}_search(e){let t=0,i=this._array.length-1;for(;i>=t;){let s=t+i>>1;const r=this._getKey(this._array[s]);if(r>e)i=s-1;else {if(!(r<e)){for(;s>0&&this._getKey(this._array[s-1])===e;)s--;return s}t=s+1;}}return t}};},7226:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.DebouncedIdleTask=t.IdleTaskQueue=t.PriorityTaskQueue=void 0;const s=i(6114);class r{constructor(){this._tasks=[],this._i=0;}enqueue(e){this._tasks.push(e),this._start();}flush(){for(;this._i<this._tasks.length;)this._tasks[this._i]()||this._i++;this.clear();}clear(){this._idleCallback&&(this._cancelCallback(this._idleCallback),this._idleCallback=void 0),this._i=0,this._tasks.length=0;}_start(){this._idleCallback||(this._idleCallback=this._requestCallback(this._process.bind(this)));}_process(e){this._idleCallback=void 0;let t=0,i=0,s=e.timeRemaining(),r=0;for(;this._i<this._tasks.length;){if(t=Date.now(),this._tasks[this._i]()||this._i++,t=Math.max(1,Date.now()-t),i=Math.max(t,i),r=e.timeRemaining(),1.5*i>r)return s-t<-20&&console.warn(`task queue exceeded allotted deadline by ${Math.abs(Math.round(s-t))}ms`),void this._start();s=r;}this.clear();}}class n extends r{_requestCallback(e){return setTimeout((()=>e(this._createDeadline(16))))}_cancelCallback(e){clearTimeout(e);}_createDeadline(e){const t=Date.now()+e;return {timeRemaining:()=>Math.max(0,t-Date.now())}}}t.PriorityTaskQueue=n,t.IdleTaskQueue=!s.isNode&&"requestIdleCallback"in window?class extends r{_requestCallback(e){return requestIdleCallback(e)}_cancelCallback(e){cancelIdleCallback(e);}}:n,t.DebouncedIdleTask=class{constructor(){this._queue=new t.IdleTaskQueue;}set(e){this._queue.clear(),this._queue.enqueue(e);}flush(){this._queue.flush();}};},9282:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.updateWindowsModeWrappedState=void 0;const s=i(643);t.updateWindowsModeWrappedState=function(e){const t=e.buffer.lines.get(e.buffer.ybase+e.buffer.y-1),i=null==t?void 0:t.get(e.cols-1),r=e.buffer.lines.get(e.buffer.ybase+e.buffer.y);r&&i&&(r.isWrapped=i[s.CHAR_DATA_CODE_INDEX]!==s.NULL_CELL_CODE&&i[s.CHAR_DATA_CODE_INDEX]!==s.WHITESPACE_CELL_CODE);};},3734:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.ExtendedAttrs=t.AttributeData=void 0;class i{constructor(){this.fg=0,this.bg=0,this.extended=new s;}static toColorRGB(e){return [e>>>16&255,e>>>8&255,255&e]}static fromColorRGB(e){return (255&e[0])<<16|(255&e[1])<<8|255&e[2]}clone(){const e=new i;return e.fg=this.fg,e.bg=this.bg,e.extended=this.extended.clone(),e}isInverse(){return 67108864&this.fg}isBold(){return 134217728&this.fg}isUnderline(){return this.hasExtendedAttrs()&&0!==this.extended.underlineStyle?1:268435456&this.fg}isBlink(){return 536870912&this.fg}isInvisible(){return 1073741824&this.fg}isItalic(){return 67108864&this.bg}isDim(){return 134217728&this.bg}isStrikethrough(){return 2147483648&this.fg}isProtected(){return 536870912&this.bg}isOverline(){return 1073741824&this.bg}getFgColorMode(){return 50331648&this.fg}getBgColorMode(){return 50331648&this.bg}isFgRGB(){return 50331648==(50331648&this.fg)}isBgRGB(){return 50331648==(50331648&this.bg)}isFgPalette(){return 16777216==(50331648&this.fg)||33554432==(50331648&this.fg)}isBgPalette(){return 16777216==(50331648&this.bg)||33554432==(50331648&this.bg)}isFgDefault(){return 0==(50331648&this.fg)}isBgDefault(){return 0==(50331648&this.bg)}isAttributeDefault(){return 0===this.fg&&0===this.bg}getFgColor(){switch(50331648&this.fg){case 16777216:case 33554432:return 255&this.fg;case 50331648:return 16777215&this.fg;default:return  -1}}getBgColor(){switch(50331648&this.bg){case 16777216:case 33554432:return 255&this.bg;case 50331648:return 16777215&this.bg;default:return  -1}}hasExtendedAttrs(){return 268435456&this.bg}updateExtended(){this.extended.isEmpty()?this.bg&=-268435457:this.bg|=268435456;}getUnderlineColor(){if(268435456&this.bg&&~this.extended.underlineColor)switch(50331648&this.extended.underlineColor){case 16777216:case 33554432:return 255&this.extended.underlineColor;case 50331648:return 16777215&this.extended.underlineColor;default:return this.getFgColor()}return this.getFgColor()}getUnderlineColorMode(){return 268435456&this.bg&&~this.extended.underlineColor?50331648&this.extended.underlineColor:this.getFgColorMode()}isUnderlineColorRGB(){return 268435456&this.bg&&~this.extended.underlineColor?50331648==(50331648&this.extended.underlineColor):this.isFgRGB()}isUnderlineColorPalette(){return 268435456&this.bg&&~this.extended.underlineColor?16777216==(50331648&this.extended.underlineColor)||33554432==(50331648&this.extended.underlineColor):this.isFgPalette()}isUnderlineColorDefault(){return 268435456&this.bg&&~this.extended.underlineColor?0==(50331648&this.extended.underlineColor):this.isFgDefault()}getUnderlineStyle(){return 268435456&this.fg?268435456&this.bg?this.extended.underlineStyle:1:0}}t.AttributeData=i;class s{get ext(){return this._urlId?-469762049&this._ext|this.underlineStyle<<26:this._ext}set ext(e){this._ext=e;}get underlineStyle(){return this._urlId?5:(469762048&this._ext)>>26}set underlineStyle(e){this._ext&=-469762049,this._ext|=e<<26&469762048;}get underlineColor(){return 67108863&this._ext}set underlineColor(e){this._ext&=-67108864,this._ext|=67108863&e;}get urlId(){return this._urlId}set urlId(e){this._urlId=e;}constructor(e=0,t=0){this._ext=0,this._urlId=0,this._ext=e,this._urlId=t;}clone(){return new s(this._ext,this._urlId)}isEmpty(){return 0===this.underlineStyle&&0===this._urlId}}t.ExtendedAttrs=s;},9092:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.Buffer=t.MAX_BUFFER_SIZE=void 0;const s=i(6349),r=i(7226),n=i(3734),o=i(8437),a=i(4634),h=i(511),c=i(643),l=i(4863),d=i(7116);t.MAX_BUFFER_SIZE=4294967295,t.Buffer=class{constructor(e,t,i){this._hasScrollback=e,this._optionsService=t,this._bufferService=i,this.ydisp=0,this.ybase=0,this.y=0,this.x=0,this.tabs={},this.savedY=0,this.savedX=0,this.savedCurAttrData=o.DEFAULT_ATTR_DATA.clone(),this.savedCharset=d.DEFAULT_CHARSET,this.markers=[],this._nullCell=h.CellData.fromCharData([0,c.NULL_CELL_CHAR,c.NULL_CELL_WIDTH,c.NULL_CELL_CODE]),this._whitespaceCell=h.CellData.fromCharData([0,c.WHITESPACE_CELL_CHAR,c.WHITESPACE_CELL_WIDTH,c.WHITESPACE_CELL_CODE]),this._isClearing=false,this._memoryCleanupQueue=new r.IdleTaskQueue,this._memoryCleanupPosition=0,this._cols=this._bufferService.cols,this._rows=this._bufferService.rows,this.lines=new s.CircularList(this._getCorrectBufferLength(this._rows)),this.scrollTop=0,this.scrollBottom=this._rows-1,this.setupTabStops();}getNullCell(e){return e?(this._nullCell.fg=e.fg,this._nullCell.bg=e.bg,this._nullCell.extended=e.extended):(this._nullCell.fg=0,this._nullCell.bg=0,this._nullCell.extended=new n.ExtendedAttrs),this._nullCell}getWhitespaceCell(e){return e?(this._whitespaceCell.fg=e.fg,this._whitespaceCell.bg=e.bg,this._whitespaceCell.extended=e.extended):(this._whitespaceCell.fg=0,this._whitespaceCell.bg=0,this._whitespaceCell.extended=new n.ExtendedAttrs),this._whitespaceCell}getBlankLine(e,t){return new o.BufferLine(this._bufferService.cols,this.getNullCell(e),t)}get hasScrollback(){return this._hasScrollback&&this.lines.maxLength>this._rows}get isCursorInViewport(){const e=this.ybase+this.y-this.ydisp;return e>=0&&e<this._rows}_getCorrectBufferLength(e){if(!this._hasScrollback)return e;const i=e+this._optionsService.rawOptions.scrollback;return i>t.MAX_BUFFER_SIZE?t.MAX_BUFFER_SIZE:i}fillViewportRows(e){if(0===this.lines.length){ void 0===e&&(e=o.DEFAULT_ATTR_DATA);let t=this._rows;for(;t--;)this.lines.push(this.getBlankLine(e));}}clear(){this.ydisp=0,this.ybase=0,this.y=0,this.x=0,this.lines=new s.CircularList(this._getCorrectBufferLength(this._rows)),this.scrollTop=0,this.scrollBottom=this._rows-1,this.setupTabStops();}resize(e,t){const i=this.getNullCell(o.DEFAULT_ATTR_DATA);let s=0;const r=this._getCorrectBufferLength(t);if(r>this.lines.maxLength&&(this.lines.maxLength=r),this.lines.length>0){if(this._cols<e)for(let t=0;t<this.lines.length;t++)s+=+this.lines.get(t).resize(e,i);let n=0;if(this._rows<t)for(let s=this._rows;s<t;s++)this.lines.length<t+this.ybase&&(this._optionsService.rawOptions.windowsMode||void 0!==this._optionsService.rawOptions.windowsPty.backend||void 0!==this._optionsService.rawOptions.windowsPty.buildNumber?this.lines.push(new o.BufferLine(e,i)):this.ybase>0&&this.lines.length<=this.ybase+this.y+n+1?(this.ybase--,n++,this.ydisp>0&&this.ydisp--):this.lines.push(new o.BufferLine(e,i)));else for(let e=this._rows;e>t;e--)this.lines.length>t+this.ybase&&(this.lines.length>this.ybase+this.y+1?this.lines.pop():(this.ybase++,this.ydisp++));if(r<this.lines.maxLength){const e=this.lines.length-r;e>0&&(this.lines.trimStart(e),this.ybase=Math.max(this.ybase-e,0),this.ydisp=Math.max(this.ydisp-e,0),this.savedY=Math.max(this.savedY-e,0)),this.lines.maxLength=r;}this.x=Math.min(this.x,e-1),this.y=Math.min(this.y,t-1),n&&(this.y+=n),this.savedX=Math.min(this.savedX,e-1),this.scrollTop=0;}if(this.scrollBottom=t-1,this._isReflowEnabled&&(this._reflow(e,t),this._cols>e))for(let t=0;t<this.lines.length;t++)s+=+this.lines.get(t).resize(e,i);this._cols=e,this._rows=t,this._memoryCleanupQueue.clear(),s>.1*this.lines.length&&(this._memoryCleanupPosition=0,this._memoryCleanupQueue.enqueue((()=>this._batchedMemoryCleanup())));}_batchedMemoryCleanup(){let e=true;this._memoryCleanupPosition>=this.lines.length&&(this._memoryCleanupPosition=0,e=false);let t=0;for(;this._memoryCleanupPosition<this.lines.length;)if(t+=this.lines.get(this._memoryCleanupPosition++).cleanupMemory(),t>100)return  true;return e}get _isReflowEnabled(){const e=this._optionsService.rawOptions.windowsPty;return e&&e.buildNumber?this._hasScrollback&&"conpty"===e.backend&&e.buildNumber>=21376:this._hasScrollback&&!this._optionsService.rawOptions.windowsMode}_reflow(e,t){this._cols!==e&&(e>this._cols?this._reflowLarger(e,t):this._reflowSmaller(e,t));}_reflowLarger(e,t){const i=(0, a.reflowLargerGetLinesToRemove)(this.lines,this._cols,e,this.ybase+this.y,this.getNullCell(o.DEFAULT_ATTR_DATA));if(i.length>0){const s=(0, a.reflowLargerCreateNewLayout)(this.lines,i);(0, a.reflowLargerApplyNewLayout)(this.lines,s.layout),this._reflowLargerAdjustViewport(e,t,s.countRemoved);}}_reflowLargerAdjustViewport(e,t,i){const s=this.getNullCell(o.DEFAULT_ATTR_DATA);let r=i;for(;r-- >0;)0===this.ybase?(this.y>0&&this.y--,this.lines.length<t&&this.lines.push(new o.BufferLine(e,s))):(this.ydisp===this.ybase&&this.ydisp--,this.ybase--);this.savedY=Math.max(this.savedY-i,0);}_reflowSmaller(e,t){const i=this.getNullCell(o.DEFAULT_ATTR_DATA),s=[];let r=0;for(let n=this.lines.length-1;n>=0;n--){let h=this.lines.get(n);if(!h||!h.isWrapped&&h.getTrimmedLength()<=e)continue;const c=[h];for(;h.isWrapped&&n>0;)h=this.lines.get(--n),c.unshift(h);const l=this.ybase+this.y;if(l>=n&&l<n+c.length)continue;const d=c[c.length-1].getTrimmedLength(),_=(0, a.reflowSmallerGetNewLineLengths)(c,this._cols,e),u=_.length-c.length;let f;f=0===this.ybase&&this.y!==this.lines.length-1?Math.max(0,this.y-this.lines.maxLength+u):Math.max(0,this.lines.length-this.lines.maxLength+u);const v=[];for(let e=0;e<u;e++){const e=this.getBlankLine(o.DEFAULT_ATTR_DATA,true);v.push(e);}v.length>0&&(s.push({start:n+c.length+r,newLines:v}),r+=v.length),c.push(...v);let p=_.length-1,g=_[p];0===g&&(p--,g=_[p]);let m=c.length-u-1,S=d;for(;m>=0;){const e=Math.min(S,g);if(void 0===c[p])break;if(c[p].copyCellsFrom(c[m],S-e,g-e,e,true),g-=e,0===g&&(p--,g=_[p]),S-=e,0===S){m--;const e=Math.max(m,0);S=(0, a.getWrappedLineTrimmedLength)(c,e,this._cols);}}for(let t=0;t<c.length;t++)_[t]<e&&c[t].setCell(_[t],i);let C=u-f;for(;C-- >0;)0===this.ybase?this.y<t-1?(this.y++,this.lines.pop()):(this.ybase++,this.ydisp++):this.ybase<Math.min(this.lines.maxLength,this.lines.length+r)-t&&(this.ybase===this.ydisp&&this.ydisp++,this.ybase++);this.savedY=Math.min(this.savedY+u,this.ybase+t-1);}if(s.length>0){const e=[],t=[];for(let e=0;e<this.lines.length;e++)t.push(this.lines.get(e));const i=this.lines.length;let n=i-1,o=0,a=s[o];this.lines.length=Math.min(this.lines.maxLength,this.lines.length+r);let h=0;for(let c=Math.min(this.lines.maxLength-1,i+r-1);c>=0;c--)if(a&&a.start>n+h){for(let e=a.newLines.length-1;e>=0;e--)this.lines.set(c--,a.newLines[e]);c++,e.push({index:n+1,amount:a.newLines.length}),h+=a.newLines.length,a=s[++o];}else this.lines.set(c,t[n--]);let c=0;for(let t=e.length-1;t>=0;t--)e[t].index+=c,this.lines.onInsertEmitter.fire(e[t]),c+=e[t].amount;const l=Math.max(0,i+r-this.lines.maxLength);l>0&&this.lines.onTrimEmitter.fire(l);}}translateBufferLineToString(e,t,i=0,s){const r=this.lines.get(e);return r?r.translateToString(t,i,s):""}getWrappedRangeForLine(e){let t=e,i=e;for(;t>0&&this.lines.get(t).isWrapped;)t--;for(;i+1<this.lines.length&&this.lines.get(i+1).isWrapped;)i++;return {first:t,last:i}}setupTabStops(e){for(null!=e?this.tabs[e]||(e=this.prevStop(e)):(this.tabs={},e=0);e<this._cols;e+=this._optionsService.rawOptions.tabStopWidth)this.tabs[e]=true;}prevStop(e){for(null==e&&(e=this.x);!this.tabs[--e]&&e>0;);return e>=this._cols?this._cols-1:e<0?0:e}nextStop(e){for(null==e&&(e=this.x);!this.tabs[++e]&&e<this._cols;);return e>=this._cols?this._cols-1:e<0?0:e}clearMarkers(e){this._isClearing=true;for(let t=0;t<this.markers.length;t++)this.markers[t].line===e&&(this.markers[t].dispose(),this.markers.splice(t--,1));this._isClearing=false;}clearAllMarkers(){this._isClearing=true;for(let e=0;e<this.markers.length;e++)this.markers[e].dispose(),this.markers.splice(e--,1);this._isClearing=false;}addMarker(e){const t=new l.Marker(e);return this.markers.push(t),t.register(this.lines.onTrim((e=>{t.line-=e,t.line<0&&t.dispose();}))),t.register(this.lines.onInsert((e=>{t.line>=e.index&&(t.line+=e.amount);}))),t.register(this.lines.onDelete((e=>{t.line>=e.index&&t.line<e.index+e.amount&&t.dispose(),t.line>e.index&&(t.line-=e.amount);}))),t.register(t.onDispose((()=>this._removeMarker(t)))),t}_removeMarker(e){this._isClearing||this.markers.splice(this.markers.indexOf(e),1);}};},8437:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.BufferLine=t.DEFAULT_ATTR_DATA=void 0;const s=i(3734),r=i(511),n=i(643),o=i(482);t.DEFAULT_ATTR_DATA=Object.freeze(new s.AttributeData);let a=0;class h{constructor(e,t,i=false){this.isWrapped=i,this._combined={},this._extendedAttrs={},this._data=new Uint32Array(3*e);const s=t||r.CellData.fromCharData([0,n.NULL_CELL_CHAR,n.NULL_CELL_WIDTH,n.NULL_CELL_CODE]);for(let t=0;t<e;++t)this.setCell(t,s);this.length=e;}get(e){const t=this._data[3*e+0],i=2097151&t;return [this._data[3*e+1],2097152&t?this._combined[e]:i?(0, o.stringFromCodePoint)(i):"",t>>22,2097152&t?this._combined[e].charCodeAt(this._combined[e].length-1):i]}set(e,t){this._data[3*e+1]=t[n.CHAR_DATA_ATTR_INDEX],t[n.CHAR_DATA_CHAR_INDEX].length>1?(this._combined[e]=t[1],this._data[3*e+0]=2097152|e|t[n.CHAR_DATA_WIDTH_INDEX]<<22):this._data[3*e+0]=t[n.CHAR_DATA_CHAR_INDEX].charCodeAt(0)|t[n.CHAR_DATA_WIDTH_INDEX]<<22;}getWidth(e){return this._data[3*e+0]>>22}hasWidth(e){return 12582912&this._data[3*e+0]}getFg(e){return this._data[3*e+1]}getBg(e){return this._data[3*e+2]}hasContent(e){return 4194303&this._data[3*e+0]}getCodePoint(e){const t=this._data[3*e+0];return 2097152&t?this._combined[e].charCodeAt(this._combined[e].length-1):2097151&t}isCombined(e){return 2097152&this._data[3*e+0]}getString(e){const t=this._data[3*e+0];return 2097152&t?this._combined[e]:2097151&t?(0, o.stringFromCodePoint)(2097151&t):""}isProtected(e){return 536870912&this._data[3*e+2]}loadCell(e,t){return a=3*e,t.content=this._data[a+0],t.fg=this._data[a+1],t.bg=this._data[a+2],2097152&t.content&&(t.combinedData=this._combined[e]),268435456&t.bg&&(t.extended=this._extendedAttrs[e]),t}setCell(e,t){2097152&t.content&&(this._combined[e]=t.combinedData),268435456&t.bg&&(this._extendedAttrs[e]=t.extended),this._data[3*e+0]=t.content,this._data[3*e+1]=t.fg,this._data[3*e+2]=t.bg;}setCellFromCodePoint(e,t,i,s,r,n){268435456&r&&(this._extendedAttrs[e]=n),this._data[3*e+0]=t|i<<22,this._data[3*e+1]=s,this._data[3*e+2]=r;}addCodepointToCell(e,t){let i=this._data[3*e+0];2097152&i?this._combined[e]+=(0, o.stringFromCodePoint)(t):(2097151&i?(this._combined[e]=(0, o.stringFromCodePoint)(2097151&i)+(0, o.stringFromCodePoint)(t),i&=-2097152,i|=2097152):i=t|1<<22,this._data[3*e+0]=i);}insertCells(e,t,i,n){if((e%=this.length)&&2===this.getWidth(e-1)&&this.setCellFromCodePoint(e-1,0,1,(null==n?void 0:n.fg)||0,(null==n?void 0:n.bg)||0,(null==n?void 0:n.extended)||new s.ExtendedAttrs),t<this.length-e){const s=new r.CellData;for(let i=this.length-e-t-1;i>=0;--i)this.setCell(e+t+i,this.loadCell(e+i,s));for(let s=0;s<t;++s)this.setCell(e+s,i);}else for(let t=e;t<this.length;++t)this.setCell(t,i);2===this.getWidth(this.length-1)&&this.setCellFromCodePoint(this.length-1,0,1,(null==n?void 0:n.fg)||0,(null==n?void 0:n.bg)||0,(null==n?void 0:n.extended)||new s.ExtendedAttrs);}deleteCells(e,t,i,n){if(e%=this.length,t<this.length-e){const s=new r.CellData;for(let i=0;i<this.length-e-t;++i)this.setCell(e+i,this.loadCell(e+t+i,s));for(let e=this.length-t;e<this.length;++e)this.setCell(e,i);}else for(let t=e;t<this.length;++t)this.setCell(t,i);e&&2===this.getWidth(e-1)&&this.setCellFromCodePoint(e-1,0,1,(null==n?void 0:n.fg)||0,(null==n?void 0:n.bg)||0,(null==n?void 0:n.extended)||new s.ExtendedAttrs),0!==this.getWidth(e)||this.hasContent(e)||this.setCellFromCodePoint(e,0,1,(null==n?void 0:n.fg)||0,(null==n?void 0:n.bg)||0,(null==n?void 0:n.extended)||new s.ExtendedAttrs);}replaceCells(e,t,i,r,n=false){if(n)for(e&&2===this.getWidth(e-1)&&!this.isProtected(e-1)&&this.setCellFromCodePoint(e-1,0,1,(null==r?void 0:r.fg)||0,(null==r?void 0:r.bg)||0,(null==r?void 0:r.extended)||new s.ExtendedAttrs),t<this.length&&2===this.getWidth(t-1)&&!this.isProtected(t)&&this.setCellFromCodePoint(t,0,1,(null==r?void 0:r.fg)||0,(null==r?void 0:r.bg)||0,(null==r?void 0:r.extended)||new s.ExtendedAttrs);e<t&&e<this.length;)this.isProtected(e)||this.setCell(e,i),e++;else for(e&&2===this.getWidth(e-1)&&this.setCellFromCodePoint(e-1,0,1,(null==r?void 0:r.fg)||0,(null==r?void 0:r.bg)||0,(null==r?void 0:r.extended)||new s.ExtendedAttrs),t<this.length&&2===this.getWidth(t-1)&&this.setCellFromCodePoint(t,0,1,(null==r?void 0:r.fg)||0,(null==r?void 0:r.bg)||0,(null==r?void 0:r.extended)||new s.ExtendedAttrs);e<t&&e<this.length;)this.setCell(e++,i);}resize(e,t){if(e===this.length)return 4*this._data.length*2<this._data.buffer.byteLength;const i=3*e;if(e>this.length){if(this._data.buffer.byteLength>=4*i)this._data=new Uint32Array(this._data.buffer,0,i);else {const e=new Uint32Array(i);e.set(this._data),this._data=e;}for(let i=this.length;i<e;++i)this.setCell(i,t);}else {this._data=this._data.subarray(0,i);const t=Object.keys(this._combined);for(let i=0;i<t.length;i++){const s=parseInt(t[i],10);s>=e&&delete this._combined[s];}const s=Object.keys(this._extendedAttrs);for(let t=0;t<s.length;t++){const i=parseInt(s[t],10);i>=e&&delete this._extendedAttrs[i];}}return this.length=e,4*i*2<this._data.buffer.byteLength}cleanupMemory(){if(4*this._data.length*2<this._data.buffer.byteLength){const e=new Uint32Array(this._data.length);return e.set(this._data),this._data=e,1}return 0}fill(e,t=false){if(t)for(let t=0;t<this.length;++t)this.isProtected(t)||this.setCell(t,e);else {this._combined={},this._extendedAttrs={};for(let t=0;t<this.length;++t)this.setCell(t,e);}}copyFrom(e){this.length!==e.length?this._data=new Uint32Array(e._data):this._data.set(e._data),this.length=e.length,this._combined={};for(const t in e._combined)this._combined[t]=e._combined[t];this._extendedAttrs={};for(const t in e._extendedAttrs)this._extendedAttrs[t]=e._extendedAttrs[t];this.isWrapped=e.isWrapped;}clone(){const e=new h(0);e._data=new Uint32Array(this._data),e.length=this.length;for(const t in this._combined)e._combined[t]=this._combined[t];for(const t in this._extendedAttrs)e._extendedAttrs[t]=this._extendedAttrs[t];return e.isWrapped=this.isWrapped,e}getTrimmedLength(){for(let e=this.length-1;e>=0;--e)if(4194303&this._data[3*e+0])return e+(this._data[3*e+0]>>22);return 0}getNoBgTrimmedLength(){for(let e=this.length-1;e>=0;--e)if(4194303&this._data[3*e+0]||50331648&this._data[3*e+2])return e+(this._data[3*e+0]>>22);return 0}copyCellsFrom(e,t,i,s,r){const n=e._data;if(r)for(let r=s-1;r>=0;r--){for(let e=0;e<3;e++)this._data[3*(i+r)+e]=n[3*(t+r)+e];268435456&n[3*(t+r)+2]&&(this._extendedAttrs[i+r]=e._extendedAttrs[t+r]);}else for(let r=0;r<s;r++){for(let e=0;e<3;e++)this._data[3*(i+r)+e]=n[3*(t+r)+e];268435456&n[3*(t+r)+2]&&(this._extendedAttrs[i+r]=e._extendedAttrs[t+r]);}const o=Object.keys(e._combined);for(let s=0;s<o.length;s++){const r=parseInt(o[s],10);r>=t&&(this._combined[r-t+i]=e._combined[r]);}}translateToString(e=false,t=0,i=this.length){e&&(i=Math.min(i,this.getTrimmedLength()));let s="";for(;t<i;){const e=this._data[3*t+0],i=2097151&e;s+=2097152&e?this._combined[t]:i?(0, o.stringFromCodePoint)(i):n.WHITESPACE_CELL_CHAR,t+=e>>22||1;}return s}}t.BufferLine=h;},4841:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.getRangeLength=void 0,t.getRangeLength=function(e,t){if(e.start.y>e.end.y)throw new Error(`Buffer range end (${e.end.x}, ${e.end.y}) cannot be before start (${e.start.x}, ${e.start.y})`);return t*(e.end.y-e.start.y)+(e.end.x-e.start.x+1)};},4634:(e,t)=>{function i(e,t,i){if(t===e.length-1)return e[t].getTrimmedLength();const s=!e[t].hasContent(i-1)&&1===e[t].getWidth(i-1),r=2===e[t+1].getWidth(0);return s&&r?i-1:i}Object.defineProperty(t,"__esModule",{value:true}),t.getWrappedLineTrimmedLength=t.reflowSmallerGetNewLineLengths=t.reflowLargerApplyNewLayout=t.reflowLargerCreateNewLayout=t.reflowLargerGetLinesToRemove=void 0,t.reflowLargerGetLinesToRemove=function(e,t,s,r,n){const o=[];for(let a=0;a<e.length-1;a++){let h=a,c=e.get(++h);if(!c.isWrapped)continue;const l=[e.get(a)];for(;h<e.length&&c.isWrapped;)l.push(c),c=e.get(++h);if(r>=a&&r<h){a+=l.length-1;continue}let d=0,_=i(l,d,t),u=1,f=0;for(;u<l.length;){const e=i(l,u,t),r=e-f,o=s-_,a=Math.min(r,o);l[d].copyCellsFrom(l[u],f,_,a,false),_+=a,_===s&&(d++,_=0),f+=a,f===e&&(u++,f=0),0===_&&0!==d&&2===l[d-1].getWidth(s-1)&&(l[d].copyCellsFrom(l[d-1],s-1,_++,1,false),l[d-1].setCell(s-1,n));}l[d].replaceCells(_,s,n);let v=0;for(let e=l.length-1;e>0&&(e>d||0===l[e].getTrimmedLength());e--)v++;v>0&&(o.push(a+l.length-v),o.push(v)),a+=l.length-1;}return o},t.reflowLargerCreateNewLayout=function(e,t){const i=[];let s=0,r=t[s],n=0;for(let o=0;o<e.length;o++)if(r===o){const i=t[++s];e.onDeleteEmitter.fire({index:o-n,amount:i}),o+=i-1,n+=i,r=t[++s];}else i.push(o);return {layout:i,countRemoved:n}},t.reflowLargerApplyNewLayout=function(e,t){const i=[];for(let s=0;s<t.length;s++)i.push(e.get(t[s]));for(let t=0;t<i.length;t++)e.set(t,i[t]);e.length=t.length;},t.reflowSmallerGetNewLineLengths=function(e,t,s){const r=[],n=e.map(((s,r)=>i(e,r,t))).reduce(((e,t)=>e+t));let o=0,a=0,h=0;for(;h<n;){if(n-h<s){r.push(n-h);break}o+=s;const c=i(e,a,t);o>c&&(o-=c,a++);const l=2===e[a].getWidth(o-1);l&&o--;const d=l?s-1:s;r.push(d),h+=d;}return r},t.getWrappedLineTrimmedLength=i;},5295:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.BufferSet=void 0;const s=i(8460),r=i(844),n=i(9092);class o extends r.Disposable{constructor(e,t){super(),this._optionsService=e,this._bufferService=t,this._onBufferActivate=this.register(new s.EventEmitter),this.onBufferActivate=this._onBufferActivate.event,this.reset(),this.register(this._optionsService.onSpecificOptionChange("scrollback",(()=>this.resize(this._bufferService.cols,this._bufferService.rows)))),this.register(this._optionsService.onSpecificOptionChange("tabStopWidth",(()=>this.setupTabStops())));}reset(){this._normal=new n.Buffer(true,this._optionsService,this._bufferService),this._normal.fillViewportRows(),this._alt=new n.Buffer(false,this._optionsService,this._bufferService),this._activeBuffer=this._normal,this._onBufferActivate.fire({activeBuffer:this._normal,inactiveBuffer:this._alt}),this.setupTabStops();}get alt(){return this._alt}get active(){return this._activeBuffer}get normal(){return this._normal}activateNormalBuffer(){this._activeBuffer!==this._normal&&(this._normal.x=this._alt.x,this._normal.y=this._alt.y,this._alt.clearAllMarkers(),this._alt.clear(),this._activeBuffer=this._normal,this._onBufferActivate.fire({activeBuffer:this._normal,inactiveBuffer:this._alt}));}activateAltBuffer(e){this._activeBuffer!==this._alt&&(this._alt.fillViewportRows(e),this._alt.x=this._normal.x,this._alt.y=this._normal.y,this._activeBuffer=this._alt,this._onBufferActivate.fire({activeBuffer:this._alt,inactiveBuffer:this._normal}));}resize(e,t){this._normal.resize(e,t),this._alt.resize(e,t),this.setupTabStops(e);}setupTabStops(e){this._normal.setupTabStops(e),this._alt.setupTabStops(e);}}t.BufferSet=o;},511:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.CellData=void 0;const s=i(482),r=i(643),n=i(3734);class o extends n.AttributeData{constructor(){super(...arguments),this.content=0,this.fg=0,this.bg=0,this.extended=new n.ExtendedAttrs,this.combinedData="";}static fromCharData(e){const t=new o;return t.setFromCharData(e),t}isCombined(){return 2097152&this.content}getWidth(){return this.content>>22}getChars(){return 2097152&this.content?this.combinedData:2097151&this.content?(0, s.stringFromCodePoint)(2097151&this.content):""}getCode(){return this.isCombined()?this.combinedData.charCodeAt(this.combinedData.length-1):2097151&this.content}setFromCharData(e){this.fg=e[r.CHAR_DATA_ATTR_INDEX],this.bg=0;let t=false;if(e[r.CHAR_DATA_CHAR_INDEX].length>2)t=true;else if(2===e[r.CHAR_DATA_CHAR_INDEX].length){const i=e[r.CHAR_DATA_CHAR_INDEX].charCodeAt(0);if(55296<=i&&i<=56319){const s=e[r.CHAR_DATA_CHAR_INDEX].charCodeAt(1);56320<=s&&s<=57343?this.content=1024*(i-55296)+s-56320+65536|e[r.CHAR_DATA_WIDTH_INDEX]<<22:t=true;}else t=true;}else this.content=e[r.CHAR_DATA_CHAR_INDEX].charCodeAt(0)|e[r.CHAR_DATA_WIDTH_INDEX]<<22;t&&(this.combinedData=e[r.CHAR_DATA_CHAR_INDEX],this.content=2097152|e[r.CHAR_DATA_WIDTH_INDEX]<<22);}getAsCharData(){return [this.fg,this.getChars(),this.getWidth(),this.getCode()]}}t.CellData=o;},643:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.WHITESPACE_CELL_CODE=t.WHITESPACE_CELL_WIDTH=t.WHITESPACE_CELL_CHAR=t.NULL_CELL_CODE=t.NULL_CELL_WIDTH=t.NULL_CELL_CHAR=t.CHAR_DATA_CODE_INDEX=t.CHAR_DATA_WIDTH_INDEX=t.CHAR_DATA_CHAR_INDEX=t.CHAR_DATA_ATTR_INDEX=t.DEFAULT_EXT=t.DEFAULT_ATTR=t.DEFAULT_COLOR=void 0,t.DEFAULT_COLOR=0,t.DEFAULT_ATTR=256|t.DEFAULT_COLOR<<9,t.DEFAULT_EXT=0,t.CHAR_DATA_ATTR_INDEX=0,t.CHAR_DATA_CHAR_INDEX=1,t.CHAR_DATA_WIDTH_INDEX=2,t.CHAR_DATA_CODE_INDEX=3,t.NULL_CELL_CHAR="",t.NULL_CELL_WIDTH=1,t.NULL_CELL_CODE=0,t.WHITESPACE_CELL_CHAR=" ",t.WHITESPACE_CELL_WIDTH=1,t.WHITESPACE_CELL_CODE=32;},4863:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.Marker=void 0;const s=i(8460),r=i(844);class n{get id(){return this._id}constructor(e){this.line=e,this.isDisposed=false,this._disposables=[],this._id=n._nextId++,this._onDispose=this.register(new s.EventEmitter),this.onDispose=this._onDispose.event;}dispose(){this.isDisposed||(this.isDisposed=true,this.line=-1,this._onDispose.fire(),(0, r.disposeArray)(this._disposables),this._disposables.length=0);}register(e){return this._disposables.push(e),e}}t.Marker=n,n._nextId=1;},7116:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.DEFAULT_CHARSET=t.CHARSETS=void 0,t.CHARSETS={},t.DEFAULT_CHARSET=t.CHARSETS.B,t.CHARSETS[0]={"`":"◆",a:"▒",b:"␉",c:"␌",d:"␍",e:"␊",f:"°",g:"±",h:"␤",i:"␋",j:"┘",k:"┐",l:"┌",m:"└",n:"┼",o:"⎺",p:"⎻",q:"─",r:"⎼",s:"⎽",t:"├",u:"┤",v:"┴",w:"┬",x:"│",y:"≤",z:"≥","{":"π","|":"≠","}":"£","~":"·"},t.CHARSETS.A={"#":"£"},t.CHARSETS.B=void 0,t.CHARSETS[4]={"#":"£","@":"¾","[":"ij","\\":"½","]":"|","{":"¨","|":"f","}":"¼","~":"´"},t.CHARSETS.C=t.CHARSETS[5]={"[":"Ä","\\":"Ö","]":"Å","^":"Ü","`":"é","{":"ä","|":"ö","}":"å","~":"ü"},t.CHARSETS.R={"#":"£","@":"à","[":"°","\\":"ç","]":"§","{":"é","|":"ù","}":"è","~":"¨"},t.CHARSETS.Q={"@":"à","[":"â","\\":"ç","]":"ê","^":"î","`":"ô","{":"é","|":"ù","}":"è","~":"û"},t.CHARSETS.K={"@":"§","[":"Ä","\\":"Ö","]":"Ü","{":"ä","|":"ö","}":"ü","~":"ß"},t.CHARSETS.Y={"#":"£","@":"§","[":"°","\\":"ç","]":"é","`":"ù","{":"à","|":"ò","}":"è","~":"ì"},t.CHARSETS.E=t.CHARSETS[6]={"@":"Ä","[":"Æ","\\":"Ø","]":"Å","^":"Ü","`":"ä","{":"æ","|":"ø","}":"å","~":"ü"},t.CHARSETS.Z={"#":"£","@":"§","[":"¡","\\":"Ñ","]":"¿","{":"°","|":"ñ","}":"ç"},t.CHARSETS.H=t.CHARSETS[7]={"@":"É","[":"Ä","\\":"Ö","]":"Å","^":"Ü","`":"é","{":"ä","|":"ö","}":"å","~":"ü"},t.CHARSETS["="]={"#":"ù","@":"à","[":"é","\\":"ç","]":"ê","^":"î",_:"è","`":"ô","{":"ä","|":"ö","}":"ü","~":"û"};},2584:(e,t)=>{var i,s,r;Object.defineProperty(t,"__esModule",{value:true}),t.C1_ESCAPED=t.C1=t.C0=void 0,function(e){e.NUL="\0",e.SOH="",e.STX="",e.ETX="",e.EOT="",e.ENQ="",e.ACK="",e.BEL="",e.BS="\b",e.HT="\t",e.LF="\n",e.VT="\v",e.FF="\f",e.CR="\r",e.SO="",e.SI="",e.DLE="",e.DC1="",e.DC2="",e.DC3="",e.DC4="",e.NAK="",e.SYN="",e.ETB="",e.CAN="",e.EM="",e.SUB="",e.ESC="",e.FS="",e.GS="",e.RS="",e.US="",e.SP=" ",e.DEL="";}(i||(t.C0=i={})),function(e){e.PAD="",e.HOP="",e.BPH="",e.NBH="",e.IND="",e.NEL="",e.SSA="",e.ESA="",e.HTS="",e.HTJ="",e.VTS="",e.PLD="",e.PLU="",e.RI="",e.SS2="",e.SS3="",e.DCS="",e.PU1="",e.PU2="",e.STS="",e.CCH="",e.MW="",e.SPA="",e.EPA="",e.SOS="",e.SGCI="",e.SCI="",e.CSI="",e.ST="",e.OSC="",e.PM="",e.APC="";}(s||(t.C1=s={})),function(e){e.ST=`${i.ESC}\\`;}(r||(t.C1_ESCAPED=r={}));},7399:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.evaluateKeyboardEvent=void 0;const s=i(2584),r={48:["0",")"],49:["1","!"],50:["2","@"],51:["3","#"],52:["4","$"],53:["5","%"],54:["6","^"],55:["7","&"],56:["8","*"],57:["9","("],186:[";",":"],187:["=","+"],188:[",","<"],189:["-","_"],190:[".",">"],191:["/","?"],192:["`","~"],219:["[","{"],220:["\\","|"],221:["]","}"],222:["'",'"']};t.evaluateKeyboardEvent=function(e,t,i,n){const o={type:0,cancel:false,key:void 0},a=(e.shiftKey?1:0)|(e.altKey?2:0)|(e.ctrlKey?4:0)|(e.metaKey?8:0);switch(e.keyCode){case 0:"UIKeyInputUpArrow"===e.key?o.key=t?s.C0.ESC+"OA":s.C0.ESC+"[A":"UIKeyInputLeftArrow"===e.key?o.key=t?s.C0.ESC+"OD":s.C0.ESC+"[D":"UIKeyInputRightArrow"===e.key?o.key=t?s.C0.ESC+"OC":s.C0.ESC+"[C":"UIKeyInputDownArrow"===e.key&&(o.key=t?s.C0.ESC+"OB":s.C0.ESC+"[B");break;case 8:if(e.altKey){o.key=s.C0.ESC+s.C0.DEL;break}o.key=s.C0.DEL;break;case 9:if(e.shiftKey){o.key=s.C0.ESC+"[Z";break}o.key=s.C0.HT,o.cancel=true;break;case 13:o.key=e.altKey?s.C0.ESC+s.C0.CR:s.C0.CR,o.cancel=true;break;case 27:o.key=s.C0.ESC,e.altKey&&(o.key=s.C0.ESC+s.C0.ESC),o.cancel=true;break;case 37:if(e.metaKey)break;a?(o.key=s.C0.ESC+"[1;"+(a+1)+"D",o.key===s.C0.ESC+"[1;3D"&&(o.key=s.C0.ESC+(i?"b":"[1;5D"))):o.key=t?s.C0.ESC+"OD":s.C0.ESC+"[D";break;case 39:if(e.metaKey)break;a?(o.key=s.C0.ESC+"[1;"+(a+1)+"C",o.key===s.C0.ESC+"[1;3C"&&(o.key=s.C0.ESC+(i?"f":"[1;5C"))):o.key=t?s.C0.ESC+"OC":s.C0.ESC+"[C";break;case 38:if(e.metaKey)break;a?(o.key=s.C0.ESC+"[1;"+(a+1)+"A",i||o.key!==s.C0.ESC+"[1;3A"||(o.key=s.C0.ESC+"[1;5A")):o.key=t?s.C0.ESC+"OA":s.C0.ESC+"[A";break;case 40:if(e.metaKey)break;a?(o.key=s.C0.ESC+"[1;"+(a+1)+"B",i||o.key!==s.C0.ESC+"[1;3B"||(o.key=s.C0.ESC+"[1;5B")):o.key=t?s.C0.ESC+"OB":s.C0.ESC+"[B";break;case 45:e.shiftKey||e.ctrlKey||(o.key=s.C0.ESC+"[2~");break;case 46:o.key=a?s.C0.ESC+"[3;"+(a+1)+"~":s.C0.ESC+"[3~";break;case 36:o.key=a?s.C0.ESC+"[1;"+(a+1)+"H":t?s.C0.ESC+"OH":s.C0.ESC+"[H";break;case 35:o.key=a?s.C0.ESC+"[1;"+(a+1)+"F":t?s.C0.ESC+"OF":s.C0.ESC+"[F";break;case 33:e.shiftKey?o.type=2:e.ctrlKey?o.key=s.C0.ESC+"[5;"+(a+1)+"~":o.key=s.C0.ESC+"[5~";break;case 34:e.shiftKey?o.type=3:e.ctrlKey?o.key=s.C0.ESC+"[6;"+(a+1)+"~":o.key=s.C0.ESC+"[6~";break;case 112:o.key=a?s.C0.ESC+"[1;"+(a+1)+"P":s.C0.ESC+"OP";break;case 113:o.key=a?s.C0.ESC+"[1;"+(a+1)+"Q":s.C0.ESC+"OQ";break;case 114:o.key=a?s.C0.ESC+"[1;"+(a+1)+"R":s.C0.ESC+"OR";break;case 115:o.key=a?s.C0.ESC+"[1;"+(a+1)+"S":s.C0.ESC+"OS";break;case 116:o.key=a?s.C0.ESC+"[15;"+(a+1)+"~":s.C0.ESC+"[15~";break;case 117:o.key=a?s.C0.ESC+"[17;"+(a+1)+"~":s.C0.ESC+"[17~";break;case 118:o.key=a?s.C0.ESC+"[18;"+(a+1)+"~":s.C0.ESC+"[18~";break;case 119:o.key=a?s.C0.ESC+"[19;"+(a+1)+"~":s.C0.ESC+"[19~";break;case 120:o.key=a?s.C0.ESC+"[20;"+(a+1)+"~":s.C0.ESC+"[20~";break;case 121:o.key=a?s.C0.ESC+"[21;"+(a+1)+"~":s.C0.ESC+"[21~";break;case 122:o.key=a?s.C0.ESC+"[23;"+(a+1)+"~":s.C0.ESC+"[23~";break;case 123:o.key=a?s.C0.ESC+"[24;"+(a+1)+"~":s.C0.ESC+"[24~";break;default:if(!e.ctrlKey||e.shiftKey||e.altKey||e.metaKey)if(i&&!n||!e.altKey||e.metaKey)!i||e.altKey||e.ctrlKey||e.shiftKey||!e.metaKey?e.key&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&e.keyCode>=48&&1===e.key.length?o.key=e.key:e.key&&e.ctrlKey&&("_"===e.key&&(o.key=s.C0.US),"@"===e.key&&(o.key=s.C0.NUL)):65===e.keyCode&&(o.type=1);else {const t=r[e.keyCode],i=null==t?void 0:t[e.shiftKey?1:0];if(i)o.key=s.C0.ESC+i;else if(e.keyCode>=65&&e.keyCode<=90){const t=e.ctrlKey?e.keyCode-64:e.keyCode+32;let i=String.fromCharCode(t);e.shiftKey&&(i=i.toUpperCase()),o.key=s.C0.ESC+i;}else if(32===e.keyCode)o.key=s.C0.ESC+(e.ctrlKey?s.C0.NUL:" ");else if("Dead"===e.key&&e.code.startsWith("Key")){let t=e.code.slice(3,4);e.shiftKey||(t=t.toLowerCase()),o.key=s.C0.ESC+t,o.cancel=true;}}else e.keyCode>=65&&e.keyCode<=90?o.key=String.fromCharCode(e.keyCode-64):32===e.keyCode?o.key=s.C0.NUL:e.keyCode>=51&&e.keyCode<=55?o.key=String.fromCharCode(e.keyCode-51+27):56===e.keyCode?o.key=s.C0.DEL:219===e.keyCode?o.key=s.C0.ESC:220===e.keyCode?o.key=s.C0.FS:221===e.keyCode&&(o.key=s.C0.GS);}return o};},482:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.Utf8ToUtf32=t.StringToUtf32=t.utf32ToString=t.stringFromCodePoint=void 0,t.stringFromCodePoint=function(e){return e>65535?(e-=65536,String.fromCharCode(55296+(e>>10))+String.fromCharCode(e%1024+56320)):String.fromCharCode(e)},t.utf32ToString=function(e,t=0,i=e.length){let s="";for(let r=t;r<i;++r){let t=e[r];t>65535?(t-=65536,s+=String.fromCharCode(55296+(t>>10))+String.fromCharCode(t%1024+56320)):s+=String.fromCharCode(t);}return s},t.StringToUtf32=class{constructor(){this._interim=0;}clear(){this._interim=0;}decode(e,t){const i=e.length;if(!i)return 0;let s=0,r=0;if(this._interim){const i=e.charCodeAt(r++);56320<=i&&i<=57343?t[s++]=1024*(this._interim-55296)+i-56320+65536:(t[s++]=this._interim,t[s++]=i),this._interim=0;}for(let n=r;n<i;++n){const r=e.charCodeAt(n);if(55296<=r&&r<=56319){if(++n>=i)return this._interim=r,s;const o=e.charCodeAt(n);56320<=o&&o<=57343?t[s++]=1024*(r-55296)+o-56320+65536:(t[s++]=r,t[s++]=o);}else 65279!==r&&(t[s++]=r);}return s}},t.Utf8ToUtf32=class{constructor(){this.interim=new Uint8Array(3);}clear(){this.interim.fill(0);}decode(e,t){const i=e.length;if(!i)return 0;let s,r,n,o,a=0,h=0,c=0;if(this.interim[0]){let s=false,r=this.interim[0];r&=192==(224&r)?31:224==(240&r)?15:7;let n,o=0;for(;(n=63&this.interim[++o])&&o<4;)r<<=6,r|=n;const h=192==(224&this.interim[0])?2:224==(240&this.interim[0])?3:4,l=h-o;for(;c<l;){if(c>=i)return 0;if(n=e[c++],128!=(192&n)){c--,s=true;break}this.interim[o++]=n,r<<=6,r|=63&n;}s||(2===h?r<128?c--:t[a++]=r:3===h?r<2048||r>=55296&&r<=57343||65279===r||(t[a++]=r):r<65536||r>1114111||(t[a++]=r)),this.interim.fill(0);}const l=i-4;let d=c;for(;d<i;){for(;!(!(d<l)||128&(s=e[d])||128&(r=e[d+1])||128&(n=e[d+2])||128&(o=e[d+3]));)t[a++]=s,t[a++]=r,t[a++]=n,t[a++]=o,d+=4;if(s=e[d++],s<128)t[a++]=s;else if(192==(224&s)){if(d>=i)return this.interim[0]=s,a;if(r=e[d++],128!=(192&r)){d--;continue}if(h=(31&s)<<6|63&r,h<128){d--;continue}t[a++]=h;}else if(224==(240&s)){if(d>=i)return this.interim[0]=s,a;if(r=e[d++],128!=(192&r)){d--;continue}if(d>=i)return this.interim[0]=s,this.interim[1]=r,a;if(n=e[d++],128!=(192&n)){d--;continue}if(h=(15&s)<<12|(63&r)<<6|63&n,h<2048||h>=55296&&h<=57343||65279===h)continue;t[a++]=h;}else if(240==(248&s)){if(d>=i)return this.interim[0]=s,a;if(r=e[d++],128!=(192&r)){d--;continue}if(d>=i)return this.interim[0]=s,this.interim[1]=r,a;if(n=e[d++],128!=(192&n)){d--;continue}if(d>=i)return this.interim[0]=s,this.interim[1]=r,this.interim[2]=n,a;if(o=e[d++],128!=(192&o)){d--;continue}if(h=(7&s)<<18|(63&r)<<12|(63&n)<<6|63&o,h<65536||h>1114111)continue;t[a++]=h;}}return a}};},225:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.UnicodeV6=void 0;const i=[[768,879],[1155,1158],[1160,1161],[1425,1469],[1471,1471],[1473,1474],[1476,1477],[1479,1479],[1536,1539],[1552,1557],[1611,1630],[1648,1648],[1750,1764],[1767,1768],[1770,1773],[1807,1807],[1809,1809],[1840,1866],[1958,1968],[2027,2035],[2305,2306],[2364,2364],[2369,2376],[2381,2381],[2385,2388],[2402,2403],[2433,2433],[2492,2492],[2497,2500],[2509,2509],[2530,2531],[2561,2562],[2620,2620],[2625,2626],[2631,2632],[2635,2637],[2672,2673],[2689,2690],[2748,2748],[2753,2757],[2759,2760],[2765,2765],[2786,2787],[2817,2817],[2876,2876],[2879,2879],[2881,2883],[2893,2893],[2902,2902],[2946,2946],[3008,3008],[3021,3021],[3134,3136],[3142,3144],[3146,3149],[3157,3158],[3260,3260],[3263,3263],[3270,3270],[3276,3277],[3298,3299],[3393,3395],[3405,3405],[3530,3530],[3538,3540],[3542,3542],[3633,3633],[3636,3642],[3655,3662],[3761,3761],[3764,3769],[3771,3772],[3784,3789],[3864,3865],[3893,3893],[3895,3895],[3897,3897],[3953,3966],[3968,3972],[3974,3975],[3984,3991],[3993,4028],[4038,4038],[4141,4144],[4146,4146],[4150,4151],[4153,4153],[4184,4185],[4448,4607],[4959,4959],[5906,5908],[5938,5940],[5970,5971],[6002,6003],[6068,6069],[6071,6077],[6086,6086],[6089,6099],[6109,6109],[6155,6157],[6313,6313],[6432,6434],[6439,6440],[6450,6450],[6457,6459],[6679,6680],[6912,6915],[6964,6964],[6966,6970],[6972,6972],[6978,6978],[7019,7027],[7616,7626],[7678,7679],[8203,8207],[8234,8238],[8288,8291],[8298,8303],[8400,8431],[12330,12335],[12441,12442],[43014,43014],[43019,43019],[43045,43046],[64286,64286],[65024,65039],[65056,65059],[65279,65279],[65529,65531]],s=[[68097,68099],[68101,68102],[68108,68111],[68152,68154],[68159,68159],[119143,119145],[119155,119170],[119173,119179],[119210,119213],[119362,119364],[917505,917505],[917536,917631],[917760,917999]];let r;t.UnicodeV6=class{constructor(){if(this.version="6",!r){r=new Uint8Array(65536),r.fill(1),r[0]=0,r.fill(0,1,32),r.fill(0,127,160),r.fill(2,4352,4448),r[9001]=2,r[9002]=2,r.fill(2,11904,42192),r[12351]=1,r.fill(2,44032,55204),r.fill(2,63744,64256),r.fill(2,65040,65050),r.fill(2,65072,65136),r.fill(2,65280,65377),r.fill(2,65504,65511);for(let e=0;e<i.length;++e)r.fill(0,i[e][0],i[e][1]+1);}}wcwidth(e){return e<32?0:e<127?1:e<65536?r[e]:function(e,t){let i,s=0,r=t.length-1;if(e<t[0][0]||e>t[r][1])return  false;for(;r>=s;)if(i=s+r>>1,e>t[i][1])s=i+1;else {if(!(e<t[i][0]))return  true;r=i-1;}return  false}(e,s)?0:e>=131072&&e<=196605||e>=196608&&e<=262141?2:1}};},5981:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.WriteBuffer=void 0;const s=i(8460),r=i(844);class n extends r.Disposable{constructor(e){super(),this._action=e,this._writeBuffer=[],this._callbacks=[],this._pendingData=0,this._bufferOffset=0,this._isSyncWriting=false,this._syncCalls=0,this._didUserInput=false,this._onWriteParsed=this.register(new s.EventEmitter),this.onWriteParsed=this._onWriteParsed.event;}handleUserInput(){this._didUserInput=true;}writeSync(e,t){if(void 0!==t&&this._syncCalls>t)return void(this._syncCalls=0);if(this._pendingData+=e.length,this._writeBuffer.push(e),this._callbacks.push(void 0),this._syncCalls++,this._isSyncWriting)return;let i;for(this._isSyncWriting=true;i=this._writeBuffer.shift();){this._action(i);const e=this._callbacks.shift();e&&e();}this._pendingData=0,this._bufferOffset=2147483647,this._isSyncWriting=false,this._syncCalls=0;}write(e,t){if(this._pendingData>5e7)throw new Error("write data discarded, use flow control to avoid losing data");if(!this._writeBuffer.length){if(this._bufferOffset=0,this._didUserInput)return this._didUserInput=false,this._pendingData+=e.length,this._writeBuffer.push(e),this._callbacks.push(t),void this._innerWrite();setTimeout((()=>this._innerWrite()));}this._pendingData+=e.length,this._writeBuffer.push(e),this._callbacks.push(t);}_innerWrite(e=0,t=true){const i=e||Date.now();for(;this._writeBuffer.length>this._bufferOffset;){const e=this._writeBuffer[this._bufferOffset],s=this._action(e,t);if(s){const e=e=>Date.now()-i>=12?setTimeout((()=>this._innerWrite(0,e))):this._innerWrite(i,e);return void s.catch((e=>(queueMicrotask((()=>{throw e})),Promise.resolve(false)))).then(e)}const r=this._callbacks[this._bufferOffset];if(r&&r(),this._bufferOffset++,this._pendingData-=e.length,Date.now()-i>=12)break}this._writeBuffer.length>this._bufferOffset?(this._bufferOffset>50&&(this._writeBuffer=this._writeBuffer.slice(this._bufferOffset),this._callbacks=this._callbacks.slice(this._bufferOffset),this._bufferOffset=0),setTimeout((()=>this._innerWrite()))):(this._writeBuffer.length=0,this._callbacks.length=0,this._pendingData=0,this._bufferOffset=0),this._onWriteParsed.fire();}}t.WriteBuffer=n;},5941:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.toRgbString=t.parseColor=void 0;const i=/^([\da-f])\/([\da-f])\/([\da-f])$|^([\da-f]{2})\/([\da-f]{2})\/([\da-f]{2})$|^([\da-f]{3})\/([\da-f]{3})\/([\da-f]{3})$|^([\da-f]{4})\/([\da-f]{4})\/([\da-f]{4})$/,s=/^[\da-f]+$/;function r(e,t){const i=e.toString(16),s=i.length<2?"0"+i:i;switch(t){case 4:return i[0];case 8:return s;case 12:return (s+s).slice(0,3);default:return s+s}}t.parseColor=function(e){if(!e)return;let t=e.toLowerCase();if(0===t.indexOf("rgb:")){t=t.slice(4);const e=i.exec(t);if(e){const t=e[1]?15:e[4]?255:e[7]?4095:65535;return [Math.round(parseInt(e[1]||e[4]||e[7]||e[10],16)/t*255),Math.round(parseInt(e[2]||e[5]||e[8]||e[11],16)/t*255),Math.round(parseInt(e[3]||e[6]||e[9]||e[12],16)/t*255)]}}else if(0===t.indexOf("#")&&(t=t.slice(1),s.exec(t)&&[3,6,9,12].includes(t.length))){const e=t.length/3,i=[0,0,0];for(let s=0;s<3;++s){const r=parseInt(t.slice(e*s,e*s+e),16);i[s]=1===e?r<<4:2===e?r:3===e?r>>4:r>>8;}return i}},t.toRgbString=function(e,t=16){const[i,s,n]=e;return `rgb:${r(i,t)}/${r(s,t)}/${r(n,t)}`};},5770:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.PAYLOAD_LIMIT=void 0,t.PAYLOAD_LIMIT=1e7;},6351:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.DcsHandler=t.DcsParser=void 0;const s=i(482),r=i(8742),n=i(5770),o=[];t.DcsParser=class{constructor(){this._handlers=Object.create(null),this._active=o,this._ident=0,this._handlerFb=()=>{},this._stack={paused:false,loopPosition:0,fallThrough:false};}dispose(){this._handlers=Object.create(null),this._handlerFb=()=>{},this._active=o;}registerHandler(e,t){ void 0===this._handlers[e]&&(this._handlers[e]=[]);const i=this._handlers[e];return i.push(t),{dispose:()=>{const e=i.indexOf(t);-1!==e&&i.splice(e,1);}}}clearHandler(e){this._handlers[e]&&delete this._handlers[e];}setHandlerFallback(e){this._handlerFb=e;}reset(){if(this._active.length)for(let e=this._stack.paused?this._stack.loopPosition-1:this._active.length-1;e>=0;--e)this._active[e].unhook(false);this._stack.paused=false,this._active=o,this._ident=0;}hook(e,t){if(this.reset(),this._ident=e,this._active=this._handlers[e]||o,this._active.length)for(let e=this._active.length-1;e>=0;e--)this._active[e].hook(t);else this._handlerFb(this._ident,"HOOK",t);}put(e,t,i){if(this._active.length)for(let s=this._active.length-1;s>=0;s--)this._active[s].put(e,t,i);else this._handlerFb(this._ident,"PUT",(0, s.utf32ToString)(e,t,i));}unhook(e,t=true){if(this._active.length){let i=false,s=this._active.length-1,r=false;if(this._stack.paused&&(s=this._stack.loopPosition-1,i=t,r=this._stack.fallThrough,this._stack.paused=false),!r&&false===i){for(;s>=0&&(i=this._active[s].unhook(e),true!==i);s--)if(i instanceof Promise)return this._stack.paused=true,this._stack.loopPosition=s,this._stack.fallThrough=false,i;s--;}for(;s>=0;s--)if(i=this._active[s].unhook(false),i instanceof Promise)return this._stack.paused=true,this._stack.loopPosition=s,this._stack.fallThrough=true,i}else this._handlerFb(this._ident,"UNHOOK",e);this._active=o,this._ident=0;}};const a=new r.Params;a.addParam(0),t.DcsHandler=class{constructor(e){this._handler=e,this._data="",this._params=a,this._hitLimit=false;}hook(e){this._params=e.length>1||e.params[0]?e.clone():a,this._data="",this._hitLimit=false;}put(e,t,i){this._hitLimit||(this._data+=(0, s.utf32ToString)(e,t,i),this._data.length>n.PAYLOAD_LIMIT&&(this._data="",this._hitLimit=true));}unhook(e){let t=false;if(this._hitLimit)t=false;else if(e&&(t=this._handler(this._data,this._params),t instanceof Promise))return t.then((e=>(this._params=a,this._data="",this._hitLimit=false,e)));return this._params=a,this._data="",this._hitLimit=false,t}};},2015:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.EscapeSequenceParser=t.VT500_TRANSITION_TABLE=t.TransitionTable=void 0;const s=i(844),r=i(8742),n=i(6242),o=i(6351);class a{constructor(e){this.table=new Uint8Array(e);}setDefault(e,t){this.table.fill(e<<4|t);}add(e,t,i,s){this.table[t<<8|e]=i<<4|s;}addMany(e,t,i,s){for(let r=0;r<e.length;r++)this.table[t<<8|e[r]]=i<<4|s;}}t.TransitionTable=a;const h=160;t.VT500_TRANSITION_TABLE=function(){const e=new a(4095),t=Array.apply(null,Array(256)).map(((e,t)=>t)),i=(e,i)=>t.slice(e,i),s=i(32,127),r=i(0,24);r.push(25),r.push.apply(r,i(28,32));const n=i(0,14);let o;for(o in e.setDefault(1,0),e.addMany(s,0,2,0),n)e.addMany([24,26,153,154],o,3,0),e.addMany(i(128,144),o,3,0),e.addMany(i(144,152),o,3,0),e.add(156,o,0,0),e.add(27,o,11,1),e.add(157,o,4,8),e.addMany([152,158,159],o,0,7),e.add(155,o,11,3),e.add(144,o,11,9);return e.addMany(r,0,3,0),e.addMany(r,1,3,1),e.add(127,1,0,1),e.addMany(r,8,0,8),e.addMany(r,3,3,3),e.add(127,3,0,3),e.addMany(r,4,3,4),e.add(127,4,0,4),e.addMany(r,6,3,6),e.addMany(r,5,3,5),e.add(127,5,0,5),e.addMany(r,2,3,2),e.add(127,2,0,2),e.add(93,1,4,8),e.addMany(s,8,5,8),e.add(127,8,5,8),e.addMany([156,27,24,26,7],8,6,0),e.addMany(i(28,32),8,0,8),e.addMany([88,94,95],1,0,7),e.addMany(s,7,0,7),e.addMany(r,7,0,7),e.add(156,7,0,0),e.add(127,7,0,7),e.add(91,1,11,3),e.addMany(i(64,127),3,7,0),e.addMany(i(48,60),3,8,4),e.addMany([60,61,62,63],3,9,4),e.addMany(i(48,60),4,8,4),e.addMany(i(64,127),4,7,0),e.addMany([60,61,62,63],4,0,6),e.addMany(i(32,64),6,0,6),e.add(127,6,0,6),e.addMany(i(64,127),6,0,0),e.addMany(i(32,48),3,9,5),e.addMany(i(32,48),5,9,5),e.addMany(i(48,64),5,0,6),e.addMany(i(64,127),5,7,0),e.addMany(i(32,48),4,9,5),e.addMany(i(32,48),1,9,2),e.addMany(i(32,48),2,9,2),e.addMany(i(48,127),2,10,0),e.addMany(i(48,80),1,10,0),e.addMany(i(81,88),1,10,0),e.addMany([89,90,92],1,10,0),e.addMany(i(96,127),1,10,0),e.add(80,1,11,9),e.addMany(r,9,0,9),e.add(127,9,0,9),e.addMany(i(28,32),9,0,9),e.addMany(i(32,48),9,9,12),e.addMany(i(48,60),9,8,10),e.addMany([60,61,62,63],9,9,10),e.addMany(r,11,0,11),e.addMany(i(32,128),11,0,11),e.addMany(i(28,32),11,0,11),e.addMany(r,10,0,10),e.add(127,10,0,10),e.addMany(i(28,32),10,0,10),e.addMany(i(48,60),10,8,10),e.addMany([60,61,62,63],10,0,11),e.addMany(i(32,48),10,9,12),e.addMany(r,12,0,12),e.add(127,12,0,12),e.addMany(i(28,32),12,0,12),e.addMany(i(32,48),12,9,12),e.addMany(i(48,64),12,0,11),e.addMany(i(64,127),12,12,13),e.addMany(i(64,127),10,12,13),e.addMany(i(64,127),9,12,13),e.addMany(r,13,13,13),e.addMany(s,13,13,13),e.add(127,13,0,13),e.addMany([27,156,24,26],13,14,0),e.add(h,0,2,0),e.add(h,8,5,8),e.add(h,6,0,6),e.add(h,11,0,11),e.add(h,13,13,13),e}();class c extends s.Disposable{constructor(e=t.VT500_TRANSITION_TABLE){super(),this._transitions=e,this._parseStack={state:0,handlers:[],handlerPos:0,transition:0,chunkPos:0},this.initialState=0,this.currentState=this.initialState,this._params=new r.Params,this._params.addParam(0),this._collect=0,this.precedingCodepoint=0,this._printHandlerFb=(e,t,i)=>{},this._executeHandlerFb=e=>{},this._csiHandlerFb=(e,t)=>{},this._escHandlerFb=e=>{},this._errorHandlerFb=e=>e,this._printHandler=this._printHandlerFb,this._executeHandlers=Object.create(null),this._csiHandlers=Object.create(null),this._escHandlers=Object.create(null),this.register((0, s.toDisposable)((()=>{this._csiHandlers=Object.create(null),this._executeHandlers=Object.create(null),this._escHandlers=Object.create(null);}))),this._oscParser=this.register(new n.OscParser),this._dcsParser=this.register(new o.DcsParser),this._errorHandler=this._errorHandlerFb,this.registerEscHandler({final:"\\"},(()=>true));}_identifier(e,t=[64,126]){let i=0;if(e.prefix){if(e.prefix.length>1)throw new Error("only one byte as prefix supported");if(i=e.prefix.charCodeAt(0),i&&60>i||i>63)throw new Error("prefix must be in range 0x3c .. 0x3f")}if(e.intermediates){if(e.intermediates.length>2)throw new Error("only two bytes as intermediates are supported");for(let t=0;t<e.intermediates.length;++t){const s=e.intermediates.charCodeAt(t);if(32>s||s>47)throw new Error("intermediate must be in range 0x20 .. 0x2f");i<<=8,i|=s;}}if(1!==e.final.length)throw new Error("final must be a single byte");const s=e.final.charCodeAt(0);if(t[0]>s||s>t[1])throw new Error(`final must be in range ${t[0]} .. ${t[1]}`);return i<<=8,i|=s,i}identToString(e){const t=[];for(;e;)t.push(String.fromCharCode(255&e)),e>>=8;return t.reverse().join("")}setPrintHandler(e){this._printHandler=e;}clearPrintHandler(){this._printHandler=this._printHandlerFb;}registerEscHandler(e,t){const i=this._identifier(e,[48,126]);void 0===this._escHandlers[i]&&(this._escHandlers[i]=[]);const s=this._escHandlers[i];return s.push(t),{dispose:()=>{const e=s.indexOf(t);-1!==e&&s.splice(e,1);}}}clearEscHandler(e){this._escHandlers[this._identifier(e,[48,126])]&&delete this._escHandlers[this._identifier(e,[48,126])];}setEscHandlerFallback(e){this._escHandlerFb=e;}setExecuteHandler(e,t){this._executeHandlers[e.charCodeAt(0)]=t;}clearExecuteHandler(e){this._executeHandlers[e.charCodeAt(0)]&&delete this._executeHandlers[e.charCodeAt(0)];}setExecuteHandlerFallback(e){this._executeHandlerFb=e;}registerCsiHandler(e,t){const i=this._identifier(e);void 0===this._csiHandlers[i]&&(this._csiHandlers[i]=[]);const s=this._csiHandlers[i];return s.push(t),{dispose:()=>{const e=s.indexOf(t);-1!==e&&s.splice(e,1);}}}clearCsiHandler(e){this._csiHandlers[this._identifier(e)]&&delete this._csiHandlers[this._identifier(e)];}setCsiHandlerFallback(e){this._csiHandlerFb=e;}registerDcsHandler(e,t){return this._dcsParser.registerHandler(this._identifier(e),t)}clearDcsHandler(e){this._dcsParser.clearHandler(this._identifier(e));}setDcsHandlerFallback(e){this._dcsParser.setHandlerFallback(e);}registerOscHandler(e,t){return this._oscParser.registerHandler(e,t)}clearOscHandler(e){this._oscParser.clearHandler(e);}setOscHandlerFallback(e){this._oscParser.setHandlerFallback(e);}setErrorHandler(e){this._errorHandler=e;}clearErrorHandler(){this._errorHandler=this._errorHandlerFb;}reset(){this.currentState=this.initialState,this._oscParser.reset(),this._dcsParser.reset(),this._params.reset(),this._params.addParam(0),this._collect=0,this.precedingCodepoint=0,0!==this._parseStack.state&&(this._parseStack.state=2,this._parseStack.handlers=[]);}_preserveStack(e,t,i,s,r){this._parseStack.state=e,this._parseStack.handlers=t,this._parseStack.handlerPos=i,this._parseStack.transition=s,this._parseStack.chunkPos=r;}parse(e,t,i){let s,r=0,n=0,o=0;if(this._parseStack.state)if(2===this._parseStack.state)this._parseStack.state=0,o=this._parseStack.chunkPos+1;else {if(void 0===i||1===this._parseStack.state)throw this._parseStack.state=1,new Error("improper continuation due to previous async handler, giving up parsing");const t=this._parseStack.handlers;let n=this._parseStack.handlerPos-1;switch(this._parseStack.state){case 3:if(false===i&&n>-1)for(;n>=0&&(s=t[n](this._params),true!==s);n--)if(s instanceof Promise)return this._parseStack.handlerPos=n,s;this._parseStack.handlers=[];break;case 4:if(false===i&&n>-1)for(;n>=0&&(s=t[n](),true!==s);n--)if(s instanceof Promise)return this._parseStack.handlerPos=n,s;this._parseStack.handlers=[];break;case 6:if(r=e[this._parseStack.chunkPos],s=this._dcsParser.unhook(24!==r&&26!==r,i),s)return s;27===r&&(this._parseStack.transition|=1),this._params.reset(),this._params.addParam(0),this._collect=0;break;case 5:if(r=e[this._parseStack.chunkPos],s=this._oscParser.end(24!==r&&26!==r,i),s)return s;27===r&&(this._parseStack.transition|=1),this._params.reset(),this._params.addParam(0),this._collect=0;}this._parseStack.state=0,o=this._parseStack.chunkPos+1,this.precedingCodepoint=0,this.currentState=15&this._parseStack.transition;}for(let i=o;i<t;++i){switch(r=e[i],n=this._transitions.table[this.currentState<<8|(r<160?r:h)],n>>4){case 2:for(let s=i+1;;++s){if(s>=t||(r=e[s])<32||r>126&&r<h){this._printHandler(e,i,s),i=s-1;break}if(++s>=t||(r=e[s])<32||r>126&&r<h){this._printHandler(e,i,s),i=s-1;break}if(++s>=t||(r=e[s])<32||r>126&&r<h){this._printHandler(e,i,s),i=s-1;break}if(++s>=t||(r=e[s])<32||r>126&&r<h){this._printHandler(e,i,s),i=s-1;break}}break;case 3:this._executeHandlers[r]?this._executeHandlers[r]():this._executeHandlerFb(r),this.precedingCodepoint=0;break;case 0:break;case 1:if(this._errorHandler({position:i,code:r,currentState:this.currentState,collect:this._collect,params:this._params,abort:false}).abort)return;break;case 7:const o=this._csiHandlers[this._collect<<8|r];let a=o?o.length-1:-1;for(;a>=0&&(s=o[a](this._params),true!==s);a--)if(s instanceof Promise)return this._preserveStack(3,o,a,n,i),s;a<0&&this._csiHandlerFb(this._collect<<8|r,this._params),this.precedingCodepoint=0;break;case 8:do{switch(r){case 59:this._params.addParam(0);break;case 58:this._params.addSubParam(-1);break;default:this._params.addDigit(r-48);}}while(++i<t&&(r=e[i])>47&&r<60);i--;break;case 9:this._collect<<=8,this._collect|=r;break;case 10:const c=this._escHandlers[this._collect<<8|r];let l=c?c.length-1:-1;for(;l>=0&&(s=c[l](),true!==s);l--)if(s instanceof Promise)return this._preserveStack(4,c,l,n,i),s;l<0&&this._escHandlerFb(this._collect<<8|r),this.precedingCodepoint=0;break;case 11:this._params.reset(),this._params.addParam(0),this._collect=0;break;case 12:this._dcsParser.hook(this._collect<<8|r,this._params);break;case 13:for(let s=i+1;;++s)if(s>=t||24===(r=e[s])||26===r||27===r||r>127&&r<h){this._dcsParser.put(e,i,s),i=s-1;break}break;case 14:if(s=this._dcsParser.unhook(24!==r&&26!==r),s)return this._preserveStack(6,[],0,n,i),s;27===r&&(n|=1),this._params.reset(),this._params.addParam(0),this._collect=0,this.precedingCodepoint=0;break;case 4:this._oscParser.start();break;case 5:for(let s=i+1;;s++)if(s>=t||(r=e[s])<32||r>127&&r<h){this._oscParser.put(e,i,s),i=s-1;break}break;case 6:if(s=this._oscParser.end(24!==r&&26!==r),s)return this._preserveStack(5,[],0,n,i),s;27===r&&(n|=1),this._params.reset(),this._params.addParam(0),this._collect=0,this.precedingCodepoint=0;}this.currentState=15&n;}}}t.EscapeSequenceParser=c;},6242:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.OscHandler=t.OscParser=void 0;const s=i(5770),r=i(482),n=[];t.OscParser=class{constructor(){this._state=0,this._active=n,this._id=-1,this._handlers=Object.create(null),this._handlerFb=()=>{},this._stack={paused:false,loopPosition:0,fallThrough:false};}registerHandler(e,t){ void 0===this._handlers[e]&&(this._handlers[e]=[]);const i=this._handlers[e];return i.push(t),{dispose:()=>{const e=i.indexOf(t);-1!==e&&i.splice(e,1);}}}clearHandler(e){this._handlers[e]&&delete this._handlers[e];}setHandlerFallback(e){this._handlerFb=e;}dispose(){this._handlers=Object.create(null),this._handlerFb=()=>{},this._active=n;}reset(){if(2===this._state)for(let e=this._stack.paused?this._stack.loopPosition-1:this._active.length-1;e>=0;--e)this._active[e].end(false);this._stack.paused=false,this._active=n,this._id=-1,this._state=0;}_start(){if(this._active=this._handlers[this._id]||n,this._active.length)for(let e=this._active.length-1;e>=0;e--)this._active[e].start();else this._handlerFb(this._id,"START");}_put(e,t,i){if(this._active.length)for(let s=this._active.length-1;s>=0;s--)this._active[s].put(e,t,i);else this._handlerFb(this._id,"PUT",(0, r.utf32ToString)(e,t,i));}start(){this.reset(),this._state=1;}put(e,t,i){if(3!==this._state){if(1===this._state)for(;t<i;){const i=e[t++];if(59===i){this._state=2,this._start();break}if(i<48||57<i)return void(this._state=3);-1===this._id&&(this._id=0),this._id=10*this._id+i-48;}2===this._state&&i-t>0&&this._put(e,t,i);}}end(e,t=true){if(0!==this._state){if(3!==this._state)if(1===this._state&&this._start(),this._active.length){let i=false,s=this._active.length-1,r=false;if(this._stack.paused&&(s=this._stack.loopPosition-1,i=t,r=this._stack.fallThrough,this._stack.paused=false),!r&&false===i){for(;s>=0&&(i=this._active[s].end(e),true!==i);s--)if(i instanceof Promise)return this._stack.paused=true,this._stack.loopPosition=s,this._stack.fallThrough=false,i;s--;}for(;s>=0;s--)if(i=this._active[s].end(false),i instanceof Promise)return this._stack.paused=true,this._stack.loopPosition=s,this._stack.fallThrough=true,i}else this._handlerFb(this._id,"END",e);this._active=n,this._id=-1,this._state=0;}}},t.OscHandler=class{constructor(e){this._handler=e,this._data="",this._hitLimit=false;}start(){this._data="",this._hitLimit=false;}put(e,t,i){this._hitLimit||(this._data+=(0, r.utf32ToString)(e,t,i),this._data.length>s.PAYLOAD_LIMIT&&(this._data="",this._hitLimit=true));}end(e){let t=false;if(this._hitLimit)t=false;else if(e&&(t=this._handler(this._data),t instanceof Promise))return t.then((e=>(this._data="",this._hitLimit=false,e)));return this._data="",this._hitLimit=false,t}};},8742:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.Params=void 0;const i=2147483647;class s{static fromArray(e){const t=new s;if(!e.length)return t;for(let i=Array.isArray(e[0])?1:0;i<e.length;++i){const s=e[i];if(Array.isArray(s))for(let e=0;e<s.length;++e)t.addSubParam(s[e]);else t.addParam(s);}return t}constructor(e=32,t=32){if(this.maxLength=e,this.maxSubParamsLength=t,t>256)throw new Error("maxSubParamsLength must not be greater than 256");this.params=new Int32Array(e),this.length=0,this._subParams=new Int32Array(t),this._subParamsLength=0,this._subParamsIdx=new Uint16Array(e),this._rejectDigits=false,this._rejectSubDigits=false,this._digitIsSub=false;}clone(){const e=new s(this.maxLength,this.maxSubParamsLength);return e.params.set(this.params),e.length=this.length,e._subParams.set(this._subParams),e._subParamsLength=this._subParamsLength,e._subParamsIdx.set(this._subParamsIdx),e._rejectDigits=this._rejectDigits,e._rejectSubDigits=this._rejectSubDigits,e._digitIsSub=this._digitIsSub,e}toArray(){const e=[];for(let t=0;t<this.length;++t){e.push(this.params[t]);const i=this._subParamsIdx[t]>>8,s=255&this._subParamsIdx[t];s-i>0&&e.push(Array.prototype.slice.call(this._subParams,i,s));}return e}reset(){this.length=0,this._subParamsLength=0,this._rejectDigits=false,this._rejectSubDigits=false,this._digitIsSub=false;}addParam(e){if(this._digitIsSub=false,this.length>=this.maxLength)this._rejectDigits=true;else {if(e<-1)throw new Error("values lesser than -1 are not allowed");this._subParamsIdx[this.length]=this._subParamsLength<<8|this._subParamsLength,this.params[this.length++]=e>i?i:e;}}addSubParam(e){if(this._digitIsSub=true,this.length)if(this._rejectDigits||this._subParamsLength>=this.maxSubParamsLength)this._rejectSubDigits=true;else {if(e<-1)throw new Error("values lesser than -1 are not allowed");this._subParams[this._subParamsLength++]=e>i?i:e,this._subParamsIdx[this.length-1]++;}}hasSubParams(e){return (255&this._subParamsIdx[e])-(this._subParamsIdx[e]>>8)>0}getSubParams(e){const t=this._subParamsIdx[e]>>8,i=255&this._subParamsIdx[e];return i-t>0?this._subParams.subarray(t,i):null}getSubParamsAll(){const e={};for(let t=0;t<this.length;++t){const i=this._subParamsIdx[t]>>8,s=255&this._subParamsIdx[t];s-i>0&&(e[t]=this._subParams.slice(i,s));}return e}addDigit(e){let t;if(this._rejectDigits||!(t=this._digitIsSub?this._subParamsLength:this.length)||this._digitIsSub&&this._rejectSubDigits)return;const s=this._digitIsSub?this._subParams:this.params,r=s[t-1];s[t-1]=~r?Math.min(10*r+e,i):e;}}t.Params=s;},5741:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.AddonManager=void 0,t.AddonManager=class{constructor(){this._addons=[];}dispose(){for(let e=this._addons.length-1;e>=0;e--)this._addons[e].instance.dispose();}loadAddon(e,t){const i={instance:t,dispose:t.dispose,isDisposed:false};this._addons.push(i),t.dispose=()=>this._wrappedAddonDispose(i),t.activate(e);}_wrappedAddonDispose(e){if(e.isDisposed)return;let t=-1;for(let i=0;i<this._addons.length;i++)if(this._addons[i]===e){t=i;break}if(-1===t)throw new Error("Could not dispose an addon that has not been loaded");e.isDisposed=true,e.dispose.apply(e.instance),this._addons.splice(t,1);}};},8771:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.BufferApiView=void 0;const s=i(3785),r=i(511);t.BufferApiView=class{constructor(e,t){this._buffer=e,this.type=t;}init(e){return this._buffer=e,this}get cursorY(){return this._buffer.y}get cursorX(){return this._buffer.x}get viewportY(){return this._buffer.ydisp}get baseY(){return this._buffer.ybase}get length(){return this._buffer.lines.length}getLine(e){const t=this._buffer.lines.get(e);if(t)return new s.BufferLineApiView(t)}getNullCell(){return new r.CellData}};},3785:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.BufferLineApiView=void 0;const s=i(511);t.BufferLineApiView=class{constructor(e){this._line=e;}get isWrapped(){return this._line.isWrapped}get length(){return this._line.length}getCell(e,t){if(!(e<0||e>=this._line.length))return t?(this._line.loadCell(e,t),t):this._line.loadCell(e,new s.CellData)}translateToString(e,t,i){return this._line.translateToString(e,t,i)}};},8285:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.BufferNamespaceApi=void 0;const s=i(8771),r=i(8460),n=i(844);class o extends n.Disposable{constructor(e){super(),this._core=e,this._onBufferChange=this.register(new r.EventEmitter),this.onBufferChange=this._onBufferChange.event,this._normal=new s.BufferApiView(this._core.buffers.normal,"normal"),this._alternate=new s.BufferApiView(this._core.buffers.alt,"alternate"),this._core.buffers.onBufferActivate((()=>this._onBufferChange.fire(this.active)));}get active(){if(this._core.buffers.active===this._core.buffers.normal)return this.normal;if(this._core.buffers.active===this._core.buffers.alt)return this.alternate;throw new Error("Active buffer is neither normal nor alternate")}get normal(){return this._normal.init(this._core.buffers.normal)}get alternate(){return this._alternate.init(this._core.buffers.alt)}}t.BufferNamespaceApi=o;},7975:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.ParserApi=void 0,t.ParserApi=class{constructor(e){this._core=e;}registerCsiHandler(e,t){return this._core.registerCsiHandler(e,(e=>t(e.toArray())))}addCsiHandler(e,t){return this.registerCsiHandler(e,t)}registerDcsHandler(e,t){return this._core.registerDcsHandler(e,((e,i)=>t(e,i.toArray())))}addDcsHandler(e,t){return this.registerDcsHandler(e,t)}registerEscHandler(e,t){return this._core.registerEscHandler(e,t)}addEscHandler(e,t){return this.registerEscHandler(e,t)}registerOscHandler(e,t){return this._core.registerOscHandler(e,t)}addOscHandler(e,t){return this.registerOscHandler(e,t)}};},7090:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.UnicodeApi=void 0,t.UnicodeApi=class{constructor(e){this._core=e;}register(e){this._core.unicodeService.register(e);}get versions(){return this._core.unicodeService.versions}get activeVersion(){return this._core.unicodeService.activeVersion}set activeVersion(e){this._core.unicodeService.activeVersion=e;}};},744:function(e,t,i){var s=this&&this.__decorate||function(e,t,i,s){var r,n=arguments.length,o=n<3?t:null===s?s=Object.getOwnPropertyDescriptor(t,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,i,s);else for(var a=e.length-1;a>=0;a--)(r=e[a])&&(o=(n<3?r(o):n>3?r(t,i,o):r(t,i))||o);return n>3&&o&&Object.defineProperty(t,i,o),o},r=this&&this.__param||function(e,t){return function(i,s){t(i,s,e);}};Object.defineProperty(t,"__esModule",{value:true}),t.BufferService=t.MINIMUM_ROWS=t.MINIMUM_COLS=void 0;const n=i(8460),o=i(844),a=i(5295),h=i(2585);t.MINIMUM_COLS=2,t.MINIMUM_ROWS=1;let c=t.BufferService=class extends o.Disposable{get buffer(){return this.buffers.active}constructor(e){super(),this.isUserScrolling=false,this._onResize=this.register(new n.EventEmitter),this.onResize=this._onResize.event,this._onScroll=this.register(new n.EventEmitter),this.onScroll=this._onScroll.event,this.cols=Math.max(e.rawOptions.cols||0,t.MINIMUM_COLS),this.rows=Math.max(e.rawOptions.rows||0,t.MINIMUM_ROWS),this.buffers=this.register(new a.BufferSet(e,this));}resize(e,t){this.cols=e,this.rows=t,this.buffers.resize(e,t),this._onResize.fire({cols:e,rows:t});}reset(){this.buffers.reset(),this.isUserScrolling=false;}scroll(e,t=false){const i=this.buffer;let s;s=this._cachedBlankLine,s&&s.length===this.cols&&s.getFg(0)===e.fg&&s.getBg(0)===e.bg||(s=i.getBlankLine(e,t),this._cachedBlankLine=s),s.isWrapped=t;const r=i.ybase+i.scrollTop,n=i.ybase+i.scrollBottom;if(0===i.scrollTop){const e=i.lines.isFull;n===i.lines.length-1?e?i.lines.recycle().copyFrom(s):i.lines.push(s.clone()):i.lines.splice(n+1,0,s.clone()),e?this.isUserScrolling&&(i.ydisp=Math.max(i.ydisp-1,0)):(i.ybase++,this.isUserScrolling||i.ydisp++);}else {const e=n-r+1;i.lines.shiftElements(r+1,e-1,-1),i.lines.set(n,s.clone());}this.isUserScrolling||(i.ydisp=i.ybase),this._onScroll.fire(i.ydisp);}scrollLines(e,t,i){const s=this.buffer;if(e<0){if(0===s.ydisp)return;this.isUserScrolling=true;}else e+s.ydisp>=s.ybase&&(this.isUserScrolling=false);const r=s.ydisp;s.ydisp=Math.max(Math.min(s.ydisp+e,s.ybase),0),r!==s.ydisp&&(t||this._onScroll.fire(s.ydisp));}};t.BufferService=c=s([r(0,h.IOptionsService)],c);},7994:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.CharsetService=void 0,t.CharsetService=class{constructor(){this.glevel=0,this._charsets=[];}reset(){this.charset=void 0,this._charsets=[],this.glevel=0;}setgLevel(e){this.glevel=e,this.charset=this._charsets[e];}setgCharset(e,t){this._charsets[e]=t,this.glevel===e&&(this.charset=t);}};},1753:function(e,t,i){var s=this&&this.__decorate||function(e,t,i,s){var r,n=arguments.length,o=n<3?t:null===s?s=Object.getOwnPropertyDescriptor(t,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,i,s);else for(var a=e.length-1;a>=0;a--)(r=e[a])&&(o=(n<3?r(o):n>3?r(t,i,o):r(t,i))||o);return n>3&&o&&Object.defineProperty(t,i,o),o},r=this&&this.__param||function(e,t){return function(i,s){t(i,s,e);}};Object.defineProperty(t,"__esModule",{value:true}),t.CoreMouseService=void 0;const n=i(2585),o=i(8460),a=i(844),h={NONE:{events:0,restrict:()=>false},X10:{events:1,restrict:e=>4!==e.button&&1===e.action&&(e.ctrl=false,e.alt=false,e.shift=false,true)},VT200:{events:19,restrict:e=>32!==e.action},DRAG:{events:23,restrict:e=>32!==e.action||3!==e.button},ANY:{events:31,restrict:e=>true}};function c(e,t){let i=(e.ctrl?16:0)|(e.shift?4:0)|(e.alt?8:0);return 4===e.button?(i|=64,i|=e.action):(i|=3&e.button,4&e.button&&(i|=64),8&e.button&&(i|=128),32===e.action?i|=32:0!==e.action||t||(i|=3)),i}const l=String.fromCharCode,d={DEFAULT:e=>{const t=[c(e,false)+32,e.col+32,e.row+32];return t[0]>255||t[1]>255||t[2]>255?"":`[M${l(t[0])}${l(t[1])}${l(t[2])}`},SGR:e=>{const t=0===e.action&&4!==e.button?"m":"M";return `[<${c(e,true)};${e.col};${e.row}${t}`},SGR_PIXELS:e=>{const t=0===e.action&&4!==e.button?"m":"M";return `[<${c(e,true)};${e.x};${e.y}${t}`}};let _=t.CoreMouseService=class extends a.Disposable{constructor(e,t){super(),this._bufferService=e,this._coreService=t,this._protocols={},this._encodings={},this._activeProtocol="",this._activeEncoding="",this._lastEvent=null,this._onProtocolChange=this.register(new o.EventEmitter),this.onProtocolChange=this._onProtocolChange.event;for(const e of Object.keys(h))this.addProtocol(e,h[e]);for(const e of Object.keys(d))this.addEncoding(e,d[e]);this.reset();}addProtocol(e,t){this._protocols[e]=t;}addEncoding(e,t){this._encodings[e]=t;}get activeProtocol(){return this._activeProtocol}get areMouseEventsActive(){return 0!==this._protocols[this._activeProtocol].events}set activeProtocol(e){if(!this._protocols[e])throw new Error(`unknown protocol "${e}"`);this._activeProtocol=e,this._onProtocolChange.fire(this._protocols[e].events);}get activeEncoding(){return this._activeEncoding}set activeEncoding(e){if(!this._encodings[e])throw new Error(`unknown encoding "${e}"`);this._activeEncoding=e;}reset(){this.activeProtocol="NONE",this.activeEncoding="DEFAULT",this._lastEvent=null;}triggerMouseEvent(e){if(e.col<0||e.col>=this._bufferService.cols||e.row<0||e.row>=this._bufferService.rows)return  false;if(4===e.button&&32===e.action)return  false;if(3===e.button&&32!==e.action)return  false;if(4!==e.button&&(2===e.action||3===e.action))return  false;if(e.col++,e.row++,32===e.action&&this._lastEvent&&this._equalEvents(this._lastEvent,e,"SGR_PIXELS"===this._activeEncoding))return  false;if(!this._protocols[this._activeProtocol].restrict(e))return  false;const t=this._encodings[this._activeEncoding](e);return t&&("DEFAULT"===this._activeEncoding?this._coreService.triggerBinaryEvent(t):this._coreService.triggerDataEvent(t,true)),this._lastEvent=e,true}explainEvents(e){return {down:!!(1&e),up:!!(2&e),drag:!!(4&e),move:!!(8&e),wheel:!!(16&e)}}_equalEvents(e,t,i){if(i){if(e.x!==t.x)return  false;if(e.y!==t.y)return  false}else {if(e.col!==t.col)return  false;if(e.row!==t.row)return  false}return e.button===t.button&&e.action===t.action&&e.ctrl===t.ctrl&&e.alt===t.alt&&e.shift===t.shift}};t.CoreMouseService=_=s([r(0,n.IBufferService),r(1,n.ICoreService)],_);},6975:function(e,t,i){var s=this&&this.__decorate||function(e,t,i,s){var r,n=arguments.length,o=n<3?t:null===s?s=Object.getOwnPropertyDescriptor(t,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,i,s);else for(var a=e.length-1;a>=0;a--)(r=e[a])&&(o=(n<3?r(o):n>3?r(t,i,o):r(t,i))||o);return n>3&&o&&Object.defineProperty(t,i,o),o},r=this&&this.__param||function(e,t){return function(i,s){t(i,s,e);}};Object.defineProperty(t,"__esModule",{value:true}),t.CoreService=void 0;const n=i(1439),o=i(8460),a=i(844),h=i(2585),c=Object.freeze({insertMode:false}),l=Object.freeze({applicationCursorKeys:false,applicationKeypad:false,bracketedPasteMode:false,origin:false,reverseWraparound:false,sendFocus:false,wraparound:true});let d=t.CoreService=class extends a.Disposable{constructor(e,t,i){super(),this._bufferService=e,this._logService=t,this._optionsService=i,this.isCursorInitialized=false,this.isCursorHidden=false,this._onData=this.register(new o.EventEmitter),this.onData=this._onData.event,this._onUserInput=this.register(new o.EventEmitter),this.onUserInput=this._onUserInput.event,this._onBinary=this.register(new o.EventEmitter),this.onBinary=this._onBinary.event,this._onRequestScrollToBottom=this.register(new o.EventEmitter),this.onRequestScrollToBottom=this._onRequestScrollToBottom.event,this.modes=(0, n.clone)(c),this.decPrivateModes=(0, n.clone)(l);}reset(){this.modes=(0, n.clone)(c),this.decPrivateModes=(0, n.clone)(l);}triggerDataEvent(e,t=false){if(this._optionsService.rawOptions.disableStdin)return;const i=this._bufferService.buffer;t&&this._optionsService.rawOptions.scrollOnUserInput&&i.ybase!==i.ydisp&&this._onRequestScrollToBottom.fire(),t&&this._onUserInput.fire(),this._logService.debug(`sending data "${e}"`,(()=>e.split("").map((e=>e.charCodeAt(0))))),this._onData.fire(e);}triggerBinaryEvent(e){this._optionsService.rawOptions.disableStdin||(this._logService.debug(`sending binary "${e}"`,(()=>e.split("").map((e=>e.charCodeAt(0))))),this._onBinary.fire(e));}};t.CoreService=d=s([r(0,h.IBufferService),r(1,h.ILogService),r(2,h.IOptionsService)],d);},9074:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.DecorationService=void 0;const s=i(8055),r=i(8460),n=i(844),o=i(6106);let a=0,h=0;class c extends n.Disposable{get decorations(){return this._decorations.values()}constructor(){super(),this._decorations=new o.SortedList((e=>null==e?void 0:e.marker.line)),this._onDecorationRegistered=this.register(new r.EventEmitter),this.onDecorationRegistered=this._onDecorationRegistered.event,this._onDecorationRemoved=this.register(new r.EventEmitter),this.onDecorationRemoved=this._onDecorationRemoved.event,this.register((0, n.toDisposable)((()=>this.reset())));}registerDecoration(e){if(e.marker.isDisposed)return;const t=new l(e);if(t){const e=t.marker.onDispose((()=>t.dispose()));t.onDispose((()=>{t&&(this._decorations.delete(t)&&this._onDecorationRemoved.fire(t),e.dispose());})),this._decorations.insert(t),this._onDecorationRegistered.fire(t);}return t}reset(){for(const e of this._decorations.values())e.dispose();this._decorations.clear();}*getDecorationsAtCell(e,t,i){var s,r,n;let o=0,a=0;for(const h of this._decorations.getKeyIterator(t))o=null!==(s=h.options.x)&&void 0!==s?s:0,a=o+(null!==(r=h.options.width)&&void 0!==r?r:1),e>=o&&e<a&&(!i||(null!==(n=h.options.layer)&&void 0!==n?n:"bottom")===i)&&(yield h);}forEachDecorationAtCell(e,t,i,s){this._decorations.forEachByKey(t,(t=>{var r,n,o;a=null!==(r=t.options.x)&&void 0!==r?r:0,h=a+(null!==(n=t.options.width)&&void 0!==n?n:1),e>=a&&e<h&&(!i||(null!==(o=t.options.layer)&&void 0!==o?o:"bottom")===i)&&s(t);}));}}t.DecorationService=c;class l extends n.Disposable{get isDisposed(){return this._isDisposed}get backgroundColorRGB(){return null===this._cachedBg&&(this.options.backgroundColor?this._cachedBg=s.css.toColor(this.options.backgroundColor):this._cachedBg=void 0),this._cachedBg}get foregroundColorRGB(){return null===this._cachedFg&&(this.options.foregroundColor?this._cachedFg=s.css.toColor(this.options.foregroundColor):this._cachedFg=void 0),this._cachedFg}constructor(e){super(),this.options=e,this.onRenderEmitter=this.register(new r.EventEmitter),this.onRender=this.onRenderEmitter.event,this._onDispose=this.register(new r.EventEmitter),this.onDispose=this._onDispose.event,this._cachedBg=null,this._cachedFg=null,this.marker=e.marker,this.options.overviewRulerOptions&&!this.options.overviewRulerOptions.position&&(this.options.overviewRulerOptions.position="full");}dispose(){this._onDispose.fire(),super.dispose();}}},4348:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.InstantiationService=t.ServiceCollection=void 0;const s=i(2585),r=i(8343);class n{constructor(...e){this._entries=new Map;for(const[t,i]of e)this.set(t,i);}set(e,t){const i=this._entries.get(e);return this._entries.set(e,t),i}forEach(e){for(const[t,i]of this._entries.entries())e(t,i);}has(e){return this._entries.has(e)}get(e){return this._entries.get(e)}}t.ServiceCollection=n,t.InstantiationService=class{constructor(){this._services=new n,this._services.set(s.IInstantiationService,this);}setService(e,t){this._services.set(e,t);}getService(e){return this._services.get(e)}createInstance(e,...t){const i=(0, r.getServiceDependencies)(e).sort(((e,t)=>e.index-t.index)),s=[];for(const t of i){const i=this._services.get(t.id);if(!i)throw new Error(`[createInstance] ${e.name} depends on UNKNOWN service ${t.id}.`);s.push(i);}const n=i.length>0?i[0].index:t.length;if(t.length!==n)throw new Error(`[createInstance] First service dependency of ${e.name} at position ${n+1} conflicts with ${t.length} static arguments`);return new e(...[...t,...s])}};},7866:function(e,t,i){var s=this&&this.__decorate||function(e,t,i,s){var r,n=arguments.length,o=n<3?t:null===s?s=Object.getOwnPropertyDescriptor(t,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,i,s);else for(var a=e.length-1;a>=0;a--)(r=e[a])&&(o=(n<3?r(o):n>3?r(t,i,o):r(t,i))||o);return n>3&&o&&Object.defineProperty(t,i,o),o},r=this&&this.__param||function(e,t){return function(i,s){t(i,s,e);}};Object.defineProperty(t,"__esModule",{value:true}),t.traceCall=t.setTraceLogger=t.LogService=void 0;const n=i(844),o=i(2585),a={trace:o.LogLevelEnum.TRACE,debug:o.LogLevelEnum.DEBUG,info:o.LogLevelEnum.INFO,warn:o.LogLevelEnum.WARN,error:o.LogLevelEnum.ERROR,off:o.LogLevelEnum.OFF};let h,c=t.LogService=class extends n.Disposable{get logLevel(){return this._logLevel}constructor(e){super(),this._optionsService=e,this._logLevel=o.LogLevelEnum.OFF,this._updateLogLevel(),this.register(this._optionsService.onSpecificOptionChange("logLevel",(()=>this._updateLogLevel()))),h=this;}_updateLogLevel(){this._logLevel=a[this._optionsService.rawOptions.logLevel];}_evalLazyOptionalParams(e){for(let t=0;t<e.length;t++)"function"==typeof e[t]&&(e[t]=e[t]());}_log(e,t,i){this._evalLazyOptionalParams(i),e.call(console,(this._optionsService.options.logger?"":"xterm.js: ")+t,...i);}trace(e,...t){var i,s;this._logLevel<=o.LogLevelEnum.TRACE&&this._log(null!==(s=null===(i=this._optionsService.options.logger)||void 0===i?void 0:i.trace.bind(this._optionsService.options.logger))&&void 0!==s?s:console.log,e,t);}debug(e,...t){var i,s;this._logLevel<=o.LogLevelEnum.DEBUG&&this._log(null!==(s=null===(i=this._optionsService.options.logger)||void 0===i?void 0:i.debug.bind(this._optionsService.options.logger))&&void 0!==s?s:console.log,e,t);}info(e,...t){var i,s;this._logLevel<=o.LogLevelEnum.INFO&&this._log(null!==(s=null===(i=this._optionsService.options.logger)||void 0===i?void 0:i.info.bind(this._optionsService.options.logger))&&void 0!==s?s:console.info,e,t);}warn(e,...t){var i,s;this._logLevel<=o.LogLevelEnum.WARN&&this._log(null!==(s=null===(i=this._optionsService.options.logger)||void 0===i?void 0:i.warn.bind(this._optionsService.options.logger))&&void 0!==s?s:console.warn,e,t);}error(e,...t){var i,s;this._logLevel<=o.LogLevelEnum.ERROR&&this._log(null!==(s=null===(i=this._optionsService.options.logger)||void 0===i?void 0:i.error.bind(this._optionsService.options.logger))&&void 0!==s?s:console.error,e,t);}};t.LogService=c=s([r(0,o.IOptionsService)],c),t.setTraceLogger=function(e){h=e;},t.traceCall=function(e,t,i){if("function"!=typeof i.value)throw new Error("not supported");const s=i.value;i.value=function(...e){if(h.logLevel!==o.LogLevelEnum.TRACE)return s.apply(this,e);h.trace(`GlyphRenderer#${s.name}(${e.map((e=>JSON.stringify(e))).join(", ")})`);const t=s.apply(this,e);return h.trace(`GlyphRenderer#${s.name} return`,t),t};};},7302:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.OptionsService=t.DEFAULT_OPTIONS=void 0;const s=i(8460),r=i(844),n=i(6114);t.DEFAULT_OPTIONS={cols:80,rows:24,cursorBlink:false,cursorStyle:"block",cursorWidth:1,cursorInactiveStyle:"outline",customGlyphs:true,drawBoldTextInBrightColors:true,fastScrollModifier:"alt",fastScrollSensitivity:5,fontFamily:"courier-new, courier, monospace",fontSize:15,fontWeight:"normal",fontWeightBold:"bold",ignoreBracketedPasteMode:false,lineHeight:1,letterSpacing:0,linkHandler:null,logLevel:"info",logger:null,scrollback:1e3,scrollOnUserInput:true,scrollSensitivity:1,screenReaderMode:false,smoothScrollDuration:0,macOptionIsMeta:false,macOptionClickForcesSelection:false,minimumContrastRatio:1,disableStdin:false,allowProposedApi:false,allowTransparency:false,tabStopWidth:8,theme:{},rightClickSelectsWord:n.isMac,windowOptions:{},windowsMode:false,windowsPty:{},wordSeparator:" ()[]{}',\"`",altClickMovesCursor:true,convertEol:false,termName:"xterm",cancelEvents:false,overviewRulerWidth:0};const o=["normal","bold","100","200","300","400","500","600","700","800","900"];class a extends r.Disposable{constructor(e){super(),this._onOptionChange=this.register(new s.EventEmitter),this.onOptionChange=this._onOptionChange.event;const i=Object.assign({},t.DEFAULT_OPTIONS);for(const t in e)if(t in i)try{const s=e[t];i[t]=this._sanitizeAndValidateOption(t,s);}catch(e){console.error(e);}this.rawOptions=i,this.options=Object.assign({},i),this._setupOptions();}onSpecificOptionChange(e,t){return this.onOptionChange((i=>{i===e&&t(this.rawOptions[e]);}))}onMultipleOptionChange(e,t){return this.onOptionChange((i=>{ -1!==e.indexOf(i)&&t();}))}_setupOptions(){const e=e=>{if(!(e in t.DEFAULT_OPTIONS))throw new Error(`No option with key "${e}"`);return this.rawOptions[e]},i=(e,i)=>{if(!(e in t.DEFAULT_OPTIONS))throw new Error(`No option with key "${e}"`);i=this._sanitizeAndValidateOption(e,i),this.rawOptions[e]!==i&&(this.rawOptions[e]=i,this._onOptionChange.fire(e));};for(const t in this.rawOptions){const s={get:e.bind(this,t),set:i.bind(this,t)};Object.defineProperty(this.options,t,s);}}_sanitizeAndValidateOption(e,i){switch(e){case "cursorStyle":if(i||(i=t.DEFAULT_OPTIONS[e]),!function(e){return "block"===e||"underline"===e||"bar"===e}(i))throw new Error(`"${i}" is not a valid value for ${e}`);break;case "wordSeparator":i||(i=t.DEFAULT_OPTIONS[e]);break;case "fontWeight":case "fontWeightBold":if("number"==typeof i&&1<=i&&i<=1e3)break;i=o.includes(i)?i:t.DEFAULT_OPTIONS[e];break;case "cursorWidth":i=Math.floor(i);case "lineHeight":case "tabStopWidth":if(i<1)throw new Error(`${e} cannot be less than 1, value: ${i}`);break;case "minimumContrastRatio":i=Math.max(1,Math.min(21,Math.round(10*i)/10));break;case "scrollback":if((i=Math.min(i,4294967295))<0)throw new Error(`${e} cannot be less than 0, value: ${i}`);break;case "fastScrollSensitivity":case "scrollSensitivity":if(i<=0)throw new Error(`${e} cannot be less than or equal to 0, value: ${i}`);break;case "rows":case "cols":if(!i&&0!==i)throw new Error(`${e} must be numeric, value: ${i}`);break;case "windowsPty":i=null!=i?i:{};}return i}}t.OptionsService=a;},2660:function(e,t,i){var s=this&&this.__decorate||function(e,t,i,s){var r,n=arguments.length,o=n<3?t:null===s?s=Object.getOwnPropertyDescriptor(t,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,i,s);else for(var a=e.length-1;a>=0;a--)(r=e[a])&&(o=(n<3?r(o):n>3?r(t,i,o):r(t,i))||o);return n>3&&o&&Object.defineProperty(t,i,o),o},r=this&&this.__param||function(e,t){return function(i,s){t(i,s,e);}};Object.defineProperty(t,"__esModule",{value:true}),t.OscLinkService=void 0;const n=i(2585);let o=t.OscLinkService=class{constructor(e){this._bufferService=e,this._nextId=1,this._entriesWithId=new Map,this._dataByLinkId=new Map;}registerLink(e){const t=this._bufferService.buffer;if(void 0===e.id){const i=t.addMarker(t.ybase+t.y),s={data:e,id:this._nextId++,lines:[i]};return i.onDispose((()=>this._removeMarkerFromLink(s,i))),this._dataByLinkId.set(s.id,s),s.id}const i=e,s=this._getEntryIdKey(i),r=this._entriesWithId.get(s);if(r)return this.addLineToLink(r.id,t.ybase+t.y),r.id;const n=t.addMarker(t.ybase+t.y),o={id:this._nextId++,key:this._getEntryIdKey(i),data:i,lines:[n]};return n.onDispose((()=>this._removeMarkerFromLink(o,n))),this._entriesWithId.set(o.key,o),this._dataByLinkId.set(o.id,o),o.id}addLineToLink(e,t){const i=this._dataByLinkId.get(e);if(i&&i.lines.every((e=>e.line!==t))){const e=this._bufferService.buffer.addMarker(t);i.lines.push(e),e.onDispose((()=>this._removeMarkerFromLink(i,e)));}}getLinkData(e){var t;return null===(t=this._dataByLinkId.get(e))||void 0===t?void 0:t.data}_getEntryIdKey(e){return `${e.id};;${e.uri}`}_removeMarkerFromLink(e,t){const i=e.lines.indexOf(t);-1!==i&&(e.lines.splice(i,1),0===e.lines.length&&(void 0!==e.data.id&&this._entriesWithId.delete(e.key),this._dataByLinkId.delete(e.id)));}};t.OscLinkService=o=s([r(0,n.IBufferService)],o);},8343:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true}),t.createDecorator=t.getServiceDependencies=t.serviceRegistry=void 0;const i="di$target",s="di$dependencies";t.serviceRegistry=new Map,t.getServiceDependencies=function(e){return e[s]||[]},t.createDecorator=function(e){if(t.serviceRegistry.has(e))return t.serviceRegistry.get(e);const r=function(e,t,n){if(3!==arguments.length)throw new Error("@IServiceName-decorator can only be used to decorate a parameter");!function(e,t,r){t[i]===t?t[s].push({id:e,index:r}):(t[s]=[{id:e,index:r}],t[i]=t);}(r,e,n);};return r.toString=()=>e,t.serviceRegistry.set(e,r),r};},2585:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.IDecorationService=t.IUnicodeService=t.IOscLinkService=t.IOptionsService=t.ILogService=t.LogLevelEnum=t.IInstantiationService=t.ICharsetService=t.ICoreService=t.ICoreMouseService=t.IBufferService=void 0;const s=i(8343);var r;t.IBufferService=(0, s.createDecorator)("BufferService"),t.ICoreMouseService=(0, s.createDecorator)("CoreMouseService"),t.ICoreService=(0, s.createDecorator)("CoreService"),t.ICharsetService=(0, s.createDecorator)("CharsetService"),t.IInstantiationService=(0, s.createDecorator)("InstantiationService"),function(e){e[e.TRACE=0]="TRACE",e[e.DEBUG=1]="DEBUG",e[e.INFO=2]="INFO",e[e.WARN=3]="WARN",e[e.ERROR=4]="ERROR",e[e.OFF=5]="OFF";}(r||(t.LogLevelEnum=r={})),t.ILogService=(0, s.createDecorator)("LogService"),t.IOptionsService=(0, s.createDecorator)("OptionsService"),t.IOscLinkService=(0, s.createDecorator)("OscLinkService"),t.IUnicodeService=(0, s.createDecorator)("UnicodeService"),t.IDecorationService=(0, s.createDecorator)("DecorationService");},1480:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:true}),t.UnicodeService=void 0;const s=i(8460),r=i(225);t.UnicodeService=class{constructor(){this._providers=Object.create(null),this._active="",this._onChange=new s.EventEmitter,this.onChange=this._onChange.event;const e=new r.UnicodeV6;this.register(e),this._active=e.version,this._activeProvider=e;}dispose(){this._onChange.dispose();}get versions(){return Object.keys(this._providers)}get activeVersion(){return this._active}set activeVersion(e){if(!this._providers[e])throw new Error(`unknown Unicode version "${e}"`);this._active=e,this._activeProvider=this._providers[e],this._onChange.fire(e);}register(e){this._providers[e.version]=e;}wcwidth(e){return this._activeProvider.wcwidth(e)}getStringCellWidth(e){let t=0;const i=e.length;for(let s=0;s<i;++s){let r=e.charCodeAt(s);if(55296<=r&&r<=56319){if(++s>=i)return t+this.wcwidth(r);const n=e.charCodeAt(s);56320<=n&&n<=57343?r=1024*(r-55296)+n-56320+65536:t+=this.wcwidth(n);}t+=this.wcwidth(r);}return t}};}},t={};function i(s){var r=t[s];if(void 0!==r)return r.exports;var n=t[s]={exports:{}};return e[s].call(n.exports,n,n.exports,i),n.exports}var s={};return (()=>{var e=s;Object.defineProperty(e,"__esModule",{value:true}),e.Terminal=void 0;const t=i(9042),r=i(3236),n=i(844),o=i(5741),a=i(8285),h=i(7975),c=i(7090),l=["cols","rows"];class d extends n.Disposable{constructor(e){super(),this._core=this.register(new r.Terminal(e)),this._addonManager=this.register(new o.AddonManager),this._publicOptions=Object.assign({},this._core.options);const t=e=>this._core.options[e],i=(e,t)=>{this._checkReadonlyOptions(e),this._core.options[e]=t;};for(const e in this._core.options){const s={get:t.bind(this,e),set:i.bind(this,e)};Object.defineProperty(this._publicOptions,e,s);}}_checkReadonlyOptions(e){if(l.includes(e))throw new Error(`Option "${e}" can only be set in the constructor`)}_checkProposedApi(){if(!this._core.optionsService.rawOptions.allowProposedApi)throw new Error("You must set the allowProposedApi option to true to use proposed API")}get onBell(){return this._core.onBell}get onBinary(){return this._core.onBinary}get onCursorMove(){return this._core.onCursorMove}get onData(){return this._core.onData}get onKey(){return this._core.onKey}get onLineFeed(){return this._core.onLineFeed}get onRender(){return this._core.onRender}get onResize(){return this._core.onResize}get onScroll(){return this._core.onScroll}get onSelectionChange(){return this._core.onSelectionChange}get onTitleChange(){return this._core.onTitleChange}get onWriteParsed(){return this._core.onWriteParsed}get element(){return this._core.element}get parser(){return this._parser||(this._parser=new h.ParserApi(this._core)),this._parser}get unicode(){return this._checkProposedApi(),new c.UnicodeApi(this._core)}get textarea(){return this._core.textarea}get rows(){return this._core.rows}get cols(){return this._core.cols}get buffer(){return this._buffer||(this._buffer=this.register(new a.BufferNamespaceApi(this._core))),this._buffer}get markers(){return this._checkProposedApi(),this._core.markers}get modes(){const e=this._core.coreService.decPrivateModes;let t="none";switch(this._core.coreMouseService.activeProtocol){case "X10":t="x10";break;case "VT200":t="vt200";break;case "DRAG":t="drag";break;case "ANY":t="any";}return {applicationCursorKeysMode:e.applicationCursorKeys,applicationKeypadMode:e.applicationKeypad,bracketedPasteMode:e.bracketedPasteMode,insertMode:this._core.coreService.modes.insertMode,mouseTrackingMode:t,originMode:e.origin,reverseWraparoundMode:e.reverseWraparound,sendFocusMode:e.sendFocus,wraparoundMode:e.wraparound}}get options(){return this._publicOptions}set options(e){for(const t in e)this._publicOptions[t]=e[t];}blur(){this._core.blur();}focus(){this._core.focus();}resize(e,t){this._verifyIntegers(e,t),this._core.resize(e,t);}open(e){this._core.open(e);}attachCustomKeyEventHandler(e){this._core.attachCustomKeyEventHandler(e);}registerLinkProvider(e){return this._core.registerLinkProvider(e)}registerCharacterJoiner(e){return this._checkProposedApi(),this._core.registerCharacterJoiner(e)}deregisterCharacterJoiner(e){this._checkProposedApi(),this._core.deregisterCharacterJoiner(e);}registerMarker(e=0){return this._verifyIntegers(e),this._core.registerMarker(e)}registerDecoration(e){var t,i,s;return this._checkProposedApi(),this._verifyPositiveIntegers(null!==(t=e.x)&&void 0!==t?t:0,null!==(i=e.width)&&void 0!==i?i:0,null!==(s=e.height)&&void 0!==s?s:0),this._core.registerDecoration(e)}hasSelection(){return this._core.hasSelection()}select(e,t,i){this._verifyIntegers(e,t,i),this._core.select(e,t,i);}getSelection(){return this._core.getSelection()}getSelectionPosition(){return this._core.getSelectionPosition()}clearSelection(){this._core.clearSelection();}selectAll(){this._core.selectAll();}selectLines(e,t){this._verifyIntegers(e,t),this._core.selectLines(e,t);}dispose(){super.dispose();}scrollLines(e){this._verifyIntegers(e),this._core.scrollLines(e);}scrollPages(e){this._verifyIntegers(e),this._core.scrollPages(e);}scrollToTop(){this._core.scrollToTop();}scrollToBottom(){this._core.scrollToBottom();}scrollToLine(e){this._verifyIntegers(e),this._core.scrollToLine(e);}clear(){this._core.clear();}write(e,t){this._core.write(e,t);}writeln(e,t){this._core.write(e),this._core.write("\r\n",t);}paste(e){this._core.paste(e);}refresh(e,t){this._verifyIntegers(e,t),this._core.refresh(e,t);}reset(){this._core.reset();}clearTextureAtlas(){this._core.clearTextureAtlas();}loadAddon(e){this._addonManager.loadAddon(this,e);}static get strings(){return t}_verifyIntegers(...e){for(const t of e)if(t===1/0||isNaN(t)||t%1!=0)throw new Error("This API only accepts integers")}_verifyPositiveIntegers(...e){for(const t of e)if(t&&(t===1/0||isNaN(t)||t%1!=0||t<0))throw new Error("This API only accepts positive integers")}}e.Terminal=d;})(),s})()));
	
} (xterm));

var xtermExports = xterm.exports;

var xtermAddonFit = {exports: {}};

(function (module, exports$1) {
	!function(e,t){module.exports=t();}(self,(()=>(()=>{var e={};return (()=>{var t=e;Object.defineProperty(t,"__esModule",{value:true}),t.FitAddon=void 0,t.FitAddon=class{activate(e){this._terminal=e;}dispose(){}fit(){const e=this.proposeDimensions();if(!e||!this._terminal||isNaN(e.cols)||isNaN(e.rows))return;const t=this._terminal._core;this._terminal.rows===e.rows&&this._terminal.cols===e.cols||(t._renderService.clear(),this._terminal.resize(e.cols,e.rows));}proposeDimensions(){if(!this._terminal)return;if(!this._terminal.element||!this._terminal.element.parentElement)return;const e=this._terminal._core,t=e._renderService.dimensions;if(0===t.css.cell.width||0===t.css.cell.height)return;const r=0===this._terminal.options.scrollback?0:e.viewport.scrollBarWidth,i=window.getComputedStyle(this._terminal.element.parentElement),o=parseInt(i.getPropertyValue("height")),s=Math.max(0,parseInt(i.getPropertyValue("width"))),n=window.getComputedStyle(this._terminal.element),l=o-(parseInt(n.getPropertyValue("padding-top"))+parseInt(n.getPropertyValue("padding-bottom"))),a=s-(parseInt(n.getPropertyValue("padding-right"))+parseInt(n.getPropertyValue("padding-left")))-r;return {cols:Math.max(2,Math.floor(a/t.css.cell.width)),rows:Math.max(1,Math.floor(l/t.css.cell.height))}}};})(),e})()));
	
} (xtermAddonFit));

var xtermAddonFitExports = xtermAddonFit.exports;

var _tmpl$$m = /* @__PURE__ */ template(`<div class="mb-2 px-3 py-2 rounded-lg text-sm"style="background:rgba(239, 68, 68, 0.1);color:var(--error-color)">`), _tmpl$2$k = /* @__PURE__ */ template(`<div class="flex flex-col h-full"style=height:100%><div class="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg"style=background:var(--bg-tertiary)><span></span><span class=text-sm style=color:var(--text-secondary)></span><span class="text-sm ml-auto"style=color:var(--text-muted)></span></div><div class="flex-1 rounded-lg overflow-hidden"data-terminal=true tabindex=0 style="background:#0d1117;border:1px solid var(--border-color);padding:8px;minHeight:500px;height:100%;outline:none">`);
const LocalTerminal = (props) => {
  const [connected, setConnected] = createSignal(false);
  const [error, setError] = createSignal(null);
  let ws = null;
  let terminalContainer;
  let term = null;
  let fitAddon = null;
  const initializeTerminal = () => {
    if (!terminalContainer || term) {
      console.log("Terminal init skipped - container:", !!terminalContainer, "term:", !!term);
      return;
    }
    console.log("Initializing terminal...");
    try {
      term = new xtermExports.Terminal({
        theme: {
          background: "#0d1117",
          foreground: "#c9d1d9",
          cursor: "#58a6ff",
          cursorAccent: "#0d1117",
          selection: "rgba(88, 166, 255, 0.3)",
          black: "#484f58",
          red: "#ff7b72",
          green: "#3fb950",
          yellow: "#d29922",
          blue: "#58a6ff",
          magenta: "#bc8cff",
          cyan: "#39c5cf",
          white: "#b1bac4"
        },
        fontFamily: '"SF Mono", Monaco, "Cascadia Code", "Fira Code", monospace',
        fontSize: 13,
        cursorBlink: true,
        cursorStyle: "bar"
      });
      console.log("Terminal created:", term);
      fitAddon = new xtermAddonFitExports.FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalContainer);
      console.log("Terminal opened in container, element:", term.element);
      setTimeout(() => {
        fitAddon?.fit();
        if (term.element) {
          term.element.focus();
          term.element.setAttribute("tabindex", "0");
        }
        term.focus();
        console.log("Terminal fitted and focused, activeElement:", document.activeElement);
        if (props.onReady) {
          props.onReady();
        }
      }, 100);
      term.onData((data) => {
        console.log("TERMINAL INPUT CAPTURED:", data, "char codes:", Array.from(data).map((c) => c.charCodeAt(0)));
        if (ws && ws.readyState === WebSocket.OPEN) {
          const message = JSON.stringify({
            type: "input",
            data
          });
          console.log("Sending to WebSocket:", message);
          ws.send(message);
        } else {
          console.warn("WebSocket not ready, state:", ws?.readyState);
        }
      });
      console.log("Input handler attached to terminal");
      if (terminalContainer) {
        const handleKeyDown = (e) => {
          console.log("Direct keydown on container:", e.key, "code:", e.code);
          if (term && !term.element?.contains(document.activeElement)) {
            term.focus();
          }
        };
        terminalContainer.addEventListener("keydown", handleKeyDown);
        terminalContainer._keydownHandler = handleKeyDown;
      }
    } catch (err) {
      console.error("Failed to initialize terminal:", err);
      setError(`Failed to load terminal: ${err}`);
    }
  };
  const connectWebSocket = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const shellParam = props.preferredShell ? `?shell=${encodeURIComponent(props.preferredShell)}` : "";
    const wsUrl = `${protocol}//${window.location.host}/api/local/terminal${shellParam}`;
    console.log("Connecting to WebSocket:", wsUrl);
    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        console.log("WebSocket connected!");
        setConnected(true);
        setError(null);
        if (term) {
          term.write("\r\n\x1B[32mConnected to local terminal\x1B[0m\r\n\r\n");
          if (fitAddon) {
            fitAddon.fit();
            ws?.send(JSON.stringify({
              type: "resize",
              cols: term.cols,
              rows: term.rows
            }));
          }
          setTimeout(() => {
            term.focus();
            console.log("Terminal focused after connection, element:", term.element);
          }, 100);
        }
      };
      ws.onmessage = (event) => {
        if (term) {
          term.write(event.data);
        }
      };
      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        setError("WebSocket connection failed");
        setConnected(false);
        if (term) {
          term.write("\r\n\x1B[31mConnection error\x1B[0m\r\n");
        }
      };
      ws.onclose = () => {
        console.log("WebSocket closed");
        setConnected(false);
        if (term) {
          term.write("\r\n\x1B[31mConnection closed\x1B[0m\r\n");
        }
      };
    } catch (e) {
      console.error("Failed to create WebSocket:", e);
      setError(`Failed to connect: ${e}`);
    }
  };
  onMount(() => {
    setTimeout(() => {
      initializeTerminal();
      setTimeout(() => {
        connectWebSocket();
      }, 200);
    }, 100);
    const handleResize = () => {
      if (fitAddon && term) {
        fitAddon.fit();
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "resize",
            cols: term.cols,
            rows: term.rows
          }));
        }
      }
    };
    window.addEventListener("resize", handleResize);
    onCleanup(() => {
      window.removeEventListener("resize", handleResize);
    });
  });
  onCleanup(() => {
    if (ws) {
      ws.close();
      ws = null;
    }
    if (term) {
      term.dispose();
      term = null;
    }
    if (terminalContainer && terminalContainer._keydownHandler) {
      terminalContainer.removeEventListener("keydown", terminalContainer._keydownHandler);
      delete terminalContainer._keydownHandler;
    }
    fitAddon = null;
    setConnected(false);
    setError(null);
  });
  return (() => {
    var _el$ = _tmpl$2$k(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling, _el$5 = _el$4.nextSibling, _el$7 = _el$2.nextSibling;
    insert(_el$4, () => connected() ? "Connected" : "Disconnected");
    insert(_el$5, (() => {
      var _c$ = memo(() => !!props.preferredShell);
      return () => _c$() ? `Shell: ${props.preferredShell}` : "Local System Terminal";
    })());
    insert(_el$, createComponent(Show, {
      get when() {
        return error();
      },
      get children() {
        var _el$6 = _tmpl$$m();
        insert(_el$6, error);
        return _el$6;
      }
    }), _el$7);
    _el$7.$$keydown = (e) => {
      console.log("Container keydown:", e.key, "target:", e.target);
      e.stopPropagation();
    };
    _el$7.$$click = (e) => {
      console.log("Container clicked, focusing terminal...");
      e.stopPropagation();
      if (term) {
        term.focus();
        terminalContainer?.focus();
        console.log("Terminal focused, element:", term.element, "activeElement:", document.activeElement);
      }
    };
    var _ref$ = terminalContainer;
    typeof _ref$ === "function" ? use(_ref$, _el$7) : terminalContainer = _el$7;
    createRenderEffect(() => className(_el$3, `w-2 h-2 rounded-full ${connected() ? "bg-green-500" : "bg-red-500"}`));
    return _el$;
  })();
};
delegateEvents(["click", "keydown"]);

var _tmpl$$l = /* @__PURE__ */ template(`<div class="flex flex-col"style=height:80vh;minHeight:600px>`);
const LocalTerminalModal = (props) => {
  const handleClose = () => {
    props.onClose();
  };
  return createComponent(Modal, {
    get isOpen() {
      return props.isOpen;
    },
    onClose: handleClose,
    title: "Local Terminal",
    size: "full",
    get children() {
      var _el$ = _tmpl$$l();
      insert(_el$, createComponent(LocalTerminal, {}));
      return _el$;
    }
  });
};

const FAVORITES_STORAGE_KEY = "kubegraf-favorites";
function getInitialFavorites() {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
  }
  return [];
}
const [favorites, setFavoritesInternal] = createSignal(getInitialFavorites());
createEffect(() => {
  if (typeof window !== "undefined") {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites()));
  }
});
function addFavorite(view) {
  setFavoritesInternal((prev) => {
    if (!prev.includes(view)) {
      return [...prev, view];
    }
    return prev;
  });
}
function removeFavorite(view) {
  setFavoritesInternal((prev) => prev.filter((v) => v !== view));
}
function toggleFavorite(view) {
  if (isFavorite(view)) {
    removeFavorite(view);
  } else {
    addFavorite(view);
  }
}
function isFavorite(view) {
  return favorites().includes(view);
}

const CLOUD_PROVIDER_LOGOS = {
  gcp: {
    name: "Google Cloud Platform",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg",
    altText: "Google Cloud Platform",
    // Fallback SVG - official GCP logo colors
    svgContent: `<svg viewBox="0 0 256 206" xmlns="http://www.w3.org/2000/svg">
      <path d="M170.252 56.819l22.253-22.253 1.483-9.37C153.437-11.677 88.976-7.496 52.42 33.92 42.267 45.423 34.734 59.764 30.717 74.573l7.97-1.123 44.505-7.34 3.436-3.513c19.797-21.742 53.27-24.667 76.128-5.632l7.496-.146z" fill="#EA4335"/>
      <path d="M224.205 73.918a100.249 100.249 0 00-30.217-48.722l-31.232 31.232a55.515 55.515 0 0120.379 44.037v5.544c15.35 0 27.797 12.446 27.797 27.796 0 15.352-12.446 27.573-27.797 27.573h-55.671l-5.466 5.621v33.339l5.466 5.389h55.67c40.143.312 73.076-31.857 73.388-72 .178-23.106-10.736-44.898-29.84-59.653l-2.477.844z" fill="#4285F4"/>
      <path d="M71.87 205.796h55.593V161.29H71.87a27.275 27.275 0 01-11.467-2.545l-7.97 2.468-22.331 22.253-1.949 7.65c12.758 9.603 28.39 14.758 44.484 14.68h-.767z" fill="#34A853"/>
      <path d="M71.87 50.525C31.727 50.837-1.207 84.447.081 124.59c.72 22.632 11.389 43.821 28.925 57.476l32.25-32.25c-16.292-7.378-23.503-26.672-16.125-42.964a31.86 31.86 0 0116.125-16.125l-32.25-32.25A72.002 72.002 0 0071.87 50.525z" fill="#FBBC05"/>
    </svg>`
  },
  aws: {
    name: "Amazon Web Services",
    logoUrl: "https://logo.svgcdn.com/logos/aws.svg",
    altText: "Amazon Web Services",
    // Fallback SVG - AWS logo
    svgContent: `<svg viewBox="0 0 256 153" xmlns="http://www.w3.org/2000/svg">
      <path d="M72.392 55.438c0 3.137.34 5.68.933 7.545a45.373 45.373 0 002.712 6.103c.424.678.593 1.356.593 1.95 0 .847-.508 1.695-1.61 2.543l-5.34 3.56c-.763.509-1.526.763-2.205.763-.847 0-1.695-.424-2.543-1.187a26.224 26.224 0 01-3.051-3.984 65.48 65.48 0 01-2.628-5.001c-6.612 7.798-14.92 11.698-24.922 11.698-7.12 0-12.8-2.035-16.954-6.103-4.153-4.07-6.272-9.495-6.272-16.277 0-7.206 2.543-13.054 7.714-17.462 5.17-4.408 12.037-6.612 20.682-6.612 2.882 0 5.849.254 8.985.678 3.137.424 6.358 1.102 9.749 1.865V29.33c0-6.443-1.356-10.935-3.984-13.563-2.712-2.628-7.29-3.9-13.817-3.9-2.967 0-6.018.34-9.155 1.103-3.136.762-6.188 1.695-9.155 2.882-.763.34-1.441.593-1.95.763-.508.17-.932.254-1.271.254-1.102 0-1.61-.763-1.61-2.374v-4.153c0-1.272.17-2.205.593-2.713.424-.508 1.187-1.017 2.374-1.525 2.967-1.526 6.527-2.798 10.68-3.815C24.922.678 29.33.085 33.992.085c10.256 0 17.716 2.374 22.463 7.12 4.662 4.747 7.036 11.952 7.036 21.615v28.618h-.1z" fill="#252F3E"/>
      <path d="M237.596 145.256c-29.126 21.531-71.418 32.974-107.813 32.974-50.996 0-96.927-18.853-131.65-50.235-2.713-2.459-.339-5.849 2.967-3.9 37.517 21.785 83.787 34.922 131.65 34.922 32.296 0 67.78-6.697 100.414-20.598 4.916-2.12 9.07 3.221 4.432 6.837z" fill="#FF9900"/>
      <path d="M249.548 131.524c-3.73-4.747-24.668-2.289-34.078-1.102-2.882.339-3.306-2.12-.678-3.9 16.7-11.698 43.99-8.308 47.127-4.408 3.136 3.984-.848 31.314-16.531 44.369-2.374 2.035-4.662.932-3.56-1.78 3.475-8.562 11.189-28.449 7.72-33.179z" fill="#FF9900"/>
    </svg>`
  },
  azure: {
    name: "Microsoft Azure",
    logoUrl: "",
    // Use SVG fallback to avoid CORS issues
    altText: "Microsoft Azure",
    svgContent: `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
      <path d="M33.337 6.11L2.305 81.954h21.792L57.67 6.11H33.337z" fill="#0078D4"/>
      <path d="M71.175 26.316H43.09L20.97 82.097h22.125l28.08-55.781z" fill="#0078D4"/>
      <path d="M79.04 6.11L57.8 89.9h18.41l21.484-83.79H79.04z" fill="#0078D4"/>
    </svg>`
  },
  ibm: {
    name: "IBM Cloud",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg",
    altText: "IBM Cloud",
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#0530AD">
      <path d="M0 7.5h4.05v.9H0zm5.4 0v.9H6.3v-.9h-.9zm3.6 0v.9h4.05v-.9H9zm8.1 0v.9h.9v-.9h-.9zm3.6 0v.9H24v-.9h-3.3zM0 9.3h4.05v.9H0zm5.4 0v.9H6.3v-.9h-.9zm3.6 0v.9h4.05v-.9H9zm8.1 0v.9h.9v-.9h-.9zm3.6 0v.9H24v-.9h-3.3z"/>
    </svg>`
  },
  oracle: {
    name: "Oracle Cloud",
    logoUrl: "https://upload.wikimedia.org/wikipedia/en/thumb/5/50/Oracle_logo.svg/440px-Oracle_logo.svg.png",
    altText: "Oracle Cloud",
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#F80000">
      <path d="M6.754 16.15h10.492c2.294 0 4.254-1.96 4.254-4.254S19.54 7.642 17.246 7.642H6.754C4.46 7.642 2.5 9.602 2.5 11.896s1.96 4.254 4.254 4.254zm0-6.204h10.492c1.078 0 1.95.872 1.95 1.95s-.872 1.95-1.95 1.95H6.754c-1.078 0-1.95-.872-1.95-1.95s.872-1.95 1.95-1.95z"/>
    </svg>`
  },
  digitalocean: {
    name: "DigitalOcean",
    logoUrl: "https://www.digitalocean.com/favicon.ico",
    altText: "DigitalOcean",
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#0080FF">
      <path d="M12.04 24v-4.8h-4.8V24H12zm-4.8-4.8v-3.6H3.6v3.6h3.64zm0-3.6v-3.6H3.6v3.6h3.64zm6-3.6v-3.6H9.6v3.6h3.64zm0 0a7.2 7.2 0 007.2-7.2H12.04v4.8h4.8v-4.8h-4.8v7.2z"/>
    </svg>`
  },
  alibaba: {
    name: "Alibaba Cloud",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7a/Alibaba_Cloud_logo.svg",
    altText: "Alibaba Cloud",
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#FF6A00">
      <path d="M21.692 18.5L12 13.5l-9.692 5L0 17l12-6.154L24 17l-2.308 1.5zm0-6L12 7.5l-9.692 5L0 11l12-6.154L24 11l-2.308 1.5z"/>
    </svg>`
  },
  linode: {
    name: "Linode",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9c/Linode_logo.svg",
    altText: "Linode",
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#00A95C">
      <path d="M12 2L2 7l10 5 10-5-10-5zm0 7.5L4.5 7 12 4.5l7.5 2.5L12 9.5z"/>
    </svg>`
  },
  vultr: {
    name: "Vultr",
    logoUrl: "https://www.vultr.com/media/logo.svg",
    altText: "Vultr",
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#007BFC">
      <path d="M19.743 6H23.5l-7 12h-3.757L19.743 6z"/>
    </svg>`
  },
  ovh: {
    name: "OVH Cloud",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/6a/OVH_logo.svg",
    altText: "OVH Cloud",
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#123F6D">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
    </svg>`
  },
  hetzner: {
    name: "Hetzner Cloud",
    logoUrl: "https://www.hetzner.com/assets/theme2018/img/favicon.svg",
    altText: "Hetzner Cloud",
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#D50C2D">
      <path d="M4 4h16v16H4V4zm2 2v12h12V6H6z"/>
    </svg>`
  },
  openshift: {
    name: "Red Hat OpenShift",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/3/3a/OpenShift-LogoType.svg",
    altText: "Red Hat OpenShift",
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#EE0000">
      <path d="M21.665 11.812l-9.027-3.046a.67.67 0 00-.423 0l-9.027 3.046a.67.67 0 00-.445.631v5.545c0 .286.18.542.445.632l9.027 3.046a.67.67 0 00.423 0l9.027-3.046a.67.67 0 00.445-.632v-5.545a.67.67 0 00-.445-.631z"/>
    </svg>`
  },
  rancher: {
    name: "Rancher",
    logoUrl: "https://rancher.com/img/brand/rancher-logo-horiz-color.svg",
    altText: "Rancher",
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#0075A8">
      <path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/>
    </svg>`
  },
  kind: {
    name: "Kind",
    logoUrl: "https://kind.sigs.k8s.io/images/favicon.png",
    altText: "Kind",
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#326CE5">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
    </svg>`
  },
  minikube: {
    name: "Minikube",
    logoUrl: "https://minikube.sigs.k8s.io/images/logo/logo.png",
    altText: "Minikube",
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#326CE5">
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20z"/>
    </svg>`
  },
  "docker-desktop": {
    name: "Docker Desktop",
    logoUrl: "https://www.docker.com/wp-content/uploads/2022/03/vertical-logo-monochromatic.svg",
    altText: "Docker Desktop",
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#2496ED">
      <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185z"/>
    </svg>`
  },
  k3s: {
    name: "K3s",
    logoUrl: "https://k3s.io/img/logo/k3s-logo-light.svg",
    altText: "K3s",
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#FFC61C">
      <path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/>
    </svg>`
  },
  generic: {
    name: "Cloud",
    logoUrl: "",
    altText: "Cloud Provider",
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
    </svg>`
  }
};
function getCloudProviderLogo(provider) {
  const normalizedProvider = provider?.toLowerCase() || "generic";
  return CLOUD_PROVIDER_LOGOS[normalizedProvider] || CLOUD_PROVIDER_LOGOS.generic;
}

var _tmpl$$k = /* @__PURE__ */ template(`<img class="w-full h-full object-contain"loading=lazy decoding=async crossorigin=anonymous style="transition:opacity 0.2s ease-in-out;width:100%;height:100%;objectFit:contain;maxWidth:100%;maxHeight:100%">`, true, false, false), _tmpl$2$j = /* @__PURE__ */ template(`<div class="absolute w-full h-full flex items-center justify-center"style=opacity:0.4;width:100%;height:100%>`), _tmpl$3$i = /* @__PURE__ */ template(`<div class="w-full h-full flex items-center justify-center"style=width:100%;height:100%;display:flex;alignItems:center;justifyContent:center>`), _tmpl$4$g = /* @__PURE__ */ template(`<div>`);
const CloudProviderLogo = (props) => {
  const [imageError, setImageError] = createSignal(false);
  const [imageLoaded, setImageLoaded] = createSignal(false);
  const logoConfig = () => getCloudProviderLogo(props.provider);
  const size = () => props.size || 20;
  const useFallback = () => props.fallbackToSvg !== false;
  const theme = () => currentTheme();
  const isDarkTheme = () => {
    const t = theme();
    return t === "dark" || t === "midnight" || t === "cosmic" || t === "github-dark" || t === "terminal" || t === "terminal-pro";
  };
  createEffect(() => {
    setImageError(false);
    setImageLoaded(false);
    theme();
  });
  const handleImageError = () => {
    setImageError(true);
  };
  const handleImageLoad = () => {
    setImageLoaded(true);
  };
  const shouldUseImage = () => {
    const config = logoConfig();
    return config.logoUrl && !imageError() && useFallback();
  };
  const shouldUseSvg = () => {
    return !shouldUseImage() && logoConfig().svgContent;
  };
  const getContainerStyles = () => {
    const dark = isDarkTheme();
    return {
      width: `${size()}px`,
      height: `${size()}px`,
      minWidth: `${size()}px`,
      minHeight: `${size()}px`,
      // White/light background for dark themes, white background for light themes
      background: dark ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.98)",
      borderRadius: "6px",
      padding: "3px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: dark ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.08)",
      boxShadow: dark ? "0 2px 4px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)" : "0 1px 3px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05)"
    };
  };
  return (() => {
    var _el$ = _tmpl$4$g();
    insert(_el$, createComponent(Show, {
      get when() {
        return shouldUseImage();
      },
      get children() {
        return [(() => {
          var _el$2 = _tmpl$$k();
          _el$2.addEventListener("load", handleImageLoad);
          _el$2.addEventListener("error", handleImageError);
          createRenderEffect((_p$) => {
            var _v$ = logoConfig().logoUrl, _v$2 = logoConfig().altText, _v$3 = imageLoaded() ? 1 : 0, _v$4 = imageLoaded() ? "relative" : "absolute";
            _v$ !== _p$.e && setAttribute(_el$2, "src", _p$.e = _v$);
            _v$2 !== _p$.t && setAttribute(_el$2, "alt", _p$.t = _v$2);
            _v$3 !== _p$.a && setStyleProperty(_el$2, "opacity", _p$.a = _v$3);
            _v$4 !== _p$.o && setStyleProperty(_el$2, "position", _p$.o = _v$4);
            return _p$;
          }, {
            e: void 0,
            t: void 0,
            a: void 0,
            o: void 0
          });
          return _el$2;
        })(), createComponent(Show, {
          get when() {
            return memo(() => !!(!imageLoaded() && !imageError()))() && logoConfig().svgContent;
          },
          get children() {
            var _el$3 = _tmpl$2$j();
            createRenderEffect(() => _el$3.innerHTML = logoConfig().svgContent);
            return _el$3;
          }
        })];
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return shouldUseSvg();
      },
      get children() {
        var _el$4 = _tmpl$3$i();
        createRenderEffect(() => _el$4.innerHTML = logoConfig().svgContent);
        return _el$4;
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$5 = `inline-flex items-center justify-center ${props.class || ""}`, _v$6 = getContainerStyles();
      _v$5 !== _p$.e && className(_el$, _p$.e = _v$5);
      _p$.t = style(_el$, _v$6, _p$.t);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    return _el$;
  })();
};

function useWorkerFilter(items, query, opts) {
  const threshold = opts?.threshold ?? 2e3;
  const [filtered, setFiltered] = createSignal([]);
  const shouldUseWorker = createMemo(() => (items()?.length || 0) > threshold);
  createEffect(() => {
    const list = items() || [];
    const q = query() || "";
    if (!shouldUseWorker()) {
      const s = q.toLowerCase().trim();
      if (!s) {
        setFiltered(list);
      } else {
        setFiltered(list.filter((x) => (x || "").toLowerCase().includes(s)));
      }
      return;
    }
    const worker = new Worker(new URL(/* @vite-ignore */ "/assets/listFilter.worker-B0CrzKhi.js", import.meta.url), { type: "module" });
    const onMessage = (e) => {
      setFiltered(e.data.items || []);
    };
    worker.addEventListener("message", onMessage);
    worker.postMessage({ items: list, query: q });
    onCleanup(() => {
      worker.removeEventListener("message", onMessage);
      worker.terminate();
    });
  });
  return filtered;
}

const defaultFeatureFlags = {
  // Core Features
  enableDiagnostics: true,
  enableCVEVulnerabilities: true,
  enableSecurityChecks: true,
  enableMLRecommendations: true,
  enableEventMonitoring: true,
  // Integrations
  enableMCP: true,
  enableConnectors: true,
  // Advanced Features
  enableAnomalyDetection: true,
  enableCostAnalysis: true,
  enableDriftDetection: true,
  enableTopology: true,
  enableResourceMap: true,
  // UI Features
  enableAIChat: true,
  enableWebTerminal: true,
  enableLogs: true,
  enableMetrics: true,
  showMLTimelineInBrain: true,
  // Monitoring & Alerts
  enableAutoRefresh: true,
  enableNotifications: true,
  enableSoundEffects: true,
  // Sidebar Visibility - All sections visible by default
  showOverviewSection: true,
  showInsightsSection: true,
  showDeploymentsSection: true,
  showWorkloadsSection: true,
  showNetworkingSection: true,
  showConfigStorageSection: true,
  showClusterSection: true,
  showIntegrationsSection: true,
  showExtensionsSection: true,
  // Sidebar Visibility - All items visible by default
  showDashboard: true,
  showAIInsights: true,
  showCostAnalysisMenu: true,
  showSecurityInsights: true,
  showDriftDetectionMenu: true,
  showConnectorsMenu: true,
  showAIAgentsMenu: true,
  showPlugins: true,
  showTerminalMenu: true
};
const SETTINGS_VERSION = 4;
const defaultSettings = {
  ...defaultFeatureFlags,
  theme: "dark",
  compactMode: false,
  sidebarCollapsed: false,
  defaultNamespace: "_all",
  itemsPerPage: 50,
  refreshInterval: 30,
  enableDebugMode: false,
  enablePerformanceMetrics: false
};
function loadSettings() {
  try {
    const storedVersion = localStorage.getItem("kubegraf-settings-version");
    const stored = localStorage.getItem("kubegraf-settings");
    if (!storedVersion || parseInt(storedVersion) < SETTINGS_VERSION) {
      console.log("Settings version mismatch or upgrade needed - resetting to defaults");
      localStorage.setItem("kubegraf-settings-version", SETTINGS_VERSION.toString());
      return defaultSettings;
    }
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultSettings, ...parsed };
    }
  } catch (err) {
    console.error("Failed to load settings:", err);
  }
  return defaultSettings;
}
function saveSettings(settings2) {
  try {
    localStorage.setItem("kubegraf-settings", JSON.stringify(settings2));
  } catch (err) {
    console.error("Failed to save settings:", err);
  }
}
const [settings, setSettings] = createSignal(loadSettings());
createEffect(() => {
  saveSettings(settings());
});
function updateSetting(key, value) {
  setSettings((prev) => ({ ...prev, [key]: value }));
}
function resetSettings() {
  setSettings(defaultSettings);
}

var _tmpl$$j = /* @__PURE__ */ template(`<svg class="w-4 h-4 ml-auto"fill=currentColor viewBox="0 0 20 20"><path fill-rule=evenodd d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"clip-rule=evenodd>`), _tmpl$2$i = /* @__PURE__ */ template(`<div class="px-3 py-4 text-sm text-center"style=color:var(--text-muted)>No namespaces found`), _tmpl$3$h = /* @__PURE__ */ template(`<div class="absolute top-full left-0 mt-1 w-64 rounded-lg shadow-xl z-[200] overflow-hidden"style="background:var(--bg-card);border:1px solid var(--border-color)"><div class="p-2 border-b"style=border-color:var(--border-color)><div class=relative><svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--text-muted)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg><input type=text placeholder="Search namespaces..."class="w-full rounded-md pl-8 pr-3 py-1.5 text-sm"autofocus style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"></div></div><div class="max-h-64 overflow-y-auto"><button class="w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors"><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>All Namespaces</button></div><div class="p-3 border-t flex items-center gap-2"style=border-color:var(--border-color)><button class="flex-1 px-3 py-1.5 rounded-md text-sm"style="border:1px solid var(--border-color);color:var(--text-secondary)">Cancel</button><button class="flex-1 px-3 py-1.5 rounded-md text-sm text-black"style=background:var(--accent-primary)>Apply</button></div><div class="px-3 py-2 text-xs border-t"style=border-color:var(--border-color);color:var(--text-muted)> namespaces available`), _tmpl$4$f = /* @__PURE__ */ template(`<div class="px-3 py-4 text-sm text-center"style=color:var(--text-muted)>No clusters found`), _tmpl$5$f = /* @__PURE__ */ template(`<div class="px-3 py-4 text-sm text-center"style=color:var(--text-muted)>No clusters available`), _tmpl$6$c = /* @__PURE__ */ template(`<div class="absolute top-full right-0 mt-1 w-72 rounded-lg shadow-xl z-[200] overflow-hidden"style="background:var(--bg-card);border:1px solid var(--border-color)"><div class="p-2 border-b"style=border-color:var(--border-color)><div class=relative><svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--text-muted)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg><input type=text placeholder="Search clusters..."class="w-full rounded-md pl-8 pr-3 py-1.5 text-sm"autofocus style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"></div></div><div class="max-h-64 overflow-y-auto"></div><div class="px-3 py-2 text-xs border-t"style=border-color:var(--border-color);color:var(--text-muted)> cluster<!> available`), _tmpl$7$a = /* @__PURE__ */ template(`<div class="absolute top-full right-0 mt-1 w-56 rounded-lg shadow-xl z-[200] overflow-hidden"style="background:var(--bg-card);border:1px solid var(--border-color)"><div class=py-1><a target=_blank rel=noreferrer class="w-full px-4 py-2 text-sm text-left flex items-center gap-2 transition-colors hover:bg-[var(--bg-tertiary)]"style=color:var(--text-primary)><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>Documentation</a><a target=_blank rel=noreferrer class="w-full px-4 py-2 text-sm text-left flex items-center gap-2 transition-colors hover:bg-[var(--bg-tertiary)]"style=color:var(--text-primary)><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>Report a Bug</a><a target=_blank rel=noreferrer class="w-full px-4 py-2 text-sm text-left flex items-center gap-2 transition-colors hover:bg-[var(--bg-tertiary)]"style=color:var(--text-primary)><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>Request a Feature</a><a class="w-full px-4 py-2 text-sm text-left flex items-center gap-2 transition-colors hover:bg-[var(--bg-tertiary)]"style=color:var(--text-primary)><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>Contact Support`), _tmpl$8$8 = /* @__PURE__ */ template(`<header class="h-16 header-glass flex items-center justify-between px-6 relative"style=z-index:100;margin-left:0.75rem><div class="flex items-center gap-4"><div class="flex items-center gap-2 relative"><label class=text-sm style=color:var(--text-secondary)>Namespace:</label><div class="flex items-center gap-2"><button class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm min-w-[180px] justify-between"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><span class=truncate></span><svg fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M19 9l-7 7-7-7"></path></svg></button></div></div><button class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors hover:opacity-80"title="Navigate to different views/pages (⌘K)"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg><span class="hidden sm:inline">Navigate</span><kbd class="hidden sm:inline px-1.5 py-0.5 rounded text-xs font-mono"style="background:var(--bg-tertiary);color:var(--text-muted);border:1px solid var(--border-color)">⌘K</kbd></button></div><div class="flex items-center gap-4"><div class="flex items-center gap-2 relative"><label class=text-sm style=color:var(--text-secondary)>Cluster:</label><button class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm min-w-[220px] justify-between transition-all"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><div class="flex items-center gap-2 text-left"><div class="flex flex-col leading-tight"><span class="text-sm font-medium truncate"></span><span class=text-xs style=color:var(--text-muted)></span></div></div><svg fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M19 9l-7 7-7-7"></path></svg></button></div><div class="flex items-center gap-2"><button class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"style="border:1px solid var(--border-color)"><span></span></button><button class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"title="Manage Connections"style="background:var(--accent-primary);color:#000;border:1px solid var(--accent-primary);boxShadow:0 0 10px rgba(59,130,246,0.35)"><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM12 15a3 3 0 100-6 3 3 0 000 6z"></path></svg></button></div><button class=icon-btn title="Open your local terminal"style=display:flex;alignItems:center;justifyContent:center;minWidth:40px;minHeight:40px><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></button><button class=icon-btn title="Refresh all data"><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button><div class=relative><button class=icon-btn title="Help &amp; Support"><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></button></div><button class="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"title="Open Brain Panel"style="border:1px solid var(--border-color)"><span class=text-lg>🧠</span><span>Brain</span></button><button class="flex items-center gap-2 px-4 py-2 btn-accent rounded-lg"><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg><span>AI`), _tmpl$9$6 = /* @__PURE__ */ template(`<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><div class="rounded-lg border p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"style=background:var(--bg-card);border-color:var(--border-color)><div class="flex items-center justify-between mb-4"><h2 class="text-xl font-bold"style=color:var(--text-primary)>Manage Quick Access</h2><button class="p-2 rounded hover:bg-[var(--bg-tertiary)]"style=color:var(--text-secondary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M6 18L18 6M6 6l12 12"></path></svg></button></div><p class="text-sm mb-4"style=color:var(--text-secondary)>Click the star icon to add or remove items from Quick Access</p><div class=space-y-2>`), _tmpl$0$5 = /* @__PURE__ */ template(`<div class="h-12 flex items-center px-6 gap-0 border-b"style=background:var(--bg-secondary);borderColor:var(--border-color);z-index:99;margin-left:0.75rem><span class="text-xs font-semibold mr-1"style=color:var(--text-muted)>QUICK ACCESS:</span><button class="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-[var(--bg-tertiary)]"title="Manage Favorites"style=color:var(--text-secondary);background:transparent><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg><span>Manage`), _tmpl$1$4 = /* @__PURE__ */ template(`<div class="px-3 py-2 text-sm"style=color:var(--text-muted)>Loading...`), _tmpl$10$3 = /* @__PURE__ */ template(`<label class="w-full px-3 py-2 text-sm flex items-center gap-3 cursor-pointer transition-colors"style=color:var(--text-primary)><input type=checkbox class="w-4 h-4"><span class="truncate flex-1">`), _tmpl$11$2 = /* @__PURE__ */ template(`<span>`), _tmpl$12$2 = /* @__PURE__ */ template(`<div class="px-3 py-2 text-sm"style=color:var(--text-muted)>Loading clusters...`), _tmpl$13$1 = /* @__PURE__ */ template(`<span class=text-xs style=color:var(--text-muted)>`), _tmpl$14$1 = /* @__PURE__ */ template(`<svg class="w-4 h-4 flex-shrink-0"fill=currentColor viewBox="0 0 20 20"><path fill-rule=evenodd d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"clip-rule=evenodd>`), _tmpl$15$1 = /* @__PURE__ */ template(`<button class="w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors"><span></span><div class="flex-1 min-w-0"><span class="truncate block">`), _tmpl$16$1 = /* @__PURE__ */ template(`<div class="flex items-center gap-2 px-3 py-1.5 rounded-lg"title="Loading cloud provider info..."style="background:var(--bg-secondary);border:1px solid var(--border-color)"><span class="text-sm font-medium"style=color:var(--text-primary)>...`), _tmpl$17$1 = /* @__PURE__ */ template(`<button class="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"style="background:var(--bg-secondary);border:1px solid var(--border-color)"><span class="text-sm font-medium"style=color:var(--text-primary)></span><svg class="w-3 h-3 ml-1"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14">`), _tmpl$18$1 = /* @__PURE__ */ template(`<div class="flex items-center gap-2 px-3 py-1.5 rounded-lg opacity-90"style="background:var(--bg-secondary);border:1px solid var(--border-color)"><span class="text-sm font-medium"style=color:var(--text-primary)>`), _tmpl$19$1 = /* @__PURE__ */ template(`<button class="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-[var(--bg-tertiary)]"style=color:var(--text-primary);background:transparent><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2></path></svg><span>`), _tmpl$20$1 = /* @__PURE__ */ template(`<div class="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"><div class="flex items-center gap-3"><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--text-secondary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2></path></svg><span style=color:var(--text-primary)></span></div><button class="p-2 rounded hover:bg-[var(--bg-tertiary)]"><svg class="w-5 h-5"stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z">`);
const Header = () => {
  const [nsDropdownOpen, setNsDropdownOpen] = createSignal(false);
  const [nsSearch, setNsSearch] = createSignal("");
  const [ctxDropdownOpen, setCtxDropdownOpen] = createSignal(false);
  const [ctxSearch, setCtxSearch] = createSignal("");
  const [switching, setSwitching] = createSignal(false);
  const [terminalOpen, setTerminalOpen] = createSignal(false);
  const [nsSelection, setNsSelection] = createSignal([]);
  const [nsSelectionMode, setNsSelectionMode] = createSignal("default");
  const [backendAvailable, setBackendAvailable] = createSignal(null);
  const [helpDropdownOpen, setHelpDropdownOpen] = createSignal(false);
  let nsDropdownRef;
  let nsButtonRef;
  let ctxDropdownRef;
  let ctxButtonRef;
  let helpDropdownRef;
  let helpButtonRef;
  onMount(() => {
    if (api.checkHealth && typeof api.checkHealth === "function") {
      api.checkHealth().then(() => {
        setBackendAvailable(true);
      }).catch(() => {
        setBackendAvailable(false);
      });
    } else {
      api.getStatus().then(() => {
        setBackendAvailable(true);
      }).catch(() => {
        setBackendAvailable(false);
      });
    }
  });
  const [cloudInfo] = createResource(() => api.getCloudInfo().catch(() => null));
  const getProviderShortName = () => {
    const provider = cloudInfo()?.provider?.toLowerCase();
    const shortNames = {
      gcp: "GCP",
      aws: "AWS",
      azure: "Azure",
      ibm: "IBM",
      oracle: "Oracle",
      digitalocean: "DO",
      alibaba: "Alibaba",
      linode: "Linode",
      vultr: "Vultr",
      ovh: "OVH",
      hetzner: "Hetzner",
      kind: "Kind",
      minikube: "Minikube",
      "docker-desktop": "Docker",
      k3s: "K3s",
      rancher: "Rancher",
      openshift: "OpenShift"
    };
    return shortNames[provider || ""] || cloudInfo()?.displayName || "Cloud";
  };
  const filteredNamespaces = useWorkerFilter(namespaces, nsSearch, {
    threshold: 2e3
  });
  const filteredContextNames = useWorkerFilter(() => contexts().map((c) => c.name), ctxSearch, {
    threshold: 2e3
  });
  const filteredContexts = createMemo(() => {
    const names = new Set(filteredContextNames());
    if (!ctxSearch().trim()) return contexts();
    return contexts().filter((c) => names.has(c.name));
  });
  createEffect(() => {
    const ctx = workspaceContext();
    const mode = ctx?.filters?.namespaceMode || (selectedNamespaces().length === 0 ? "default" : "custom");
    if (!nsDropdownOpen()) {
      setNsSelection(selectedNamespaces());
      setNsSelectionMode(mode);
    }
  });
  if (typeof window !== "undefined") {
    const handleClickOutside = (e) => {
      if (nsDropdownOpen() && nsDropdownRef && !nsDropdownRef.contains(e.target) && nsButtonRef && !nsButtonRef.contains(e.target)) {
        setNsDropdownOpen(false);
        setNsSearch("");
      }
      if (ctxDropdownOpen() && ctxDropdownRef && !ctxDropdownRef.contains(e.target) && ctxButtonRef && !ctxButtonRef.contains(e.target)) {
        setCtxDropdownOpen(false);
        setCtxSearch("");
      }
      if (helpDropdownOpen() && helpDropdownRef && !helpDropdownRef.contains(e.target) && helpButtonRef && !helpButtonRef.contains(e.target)) {
        setHelpDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    onCleanup(() => document.removeEventListener("mousedown", handleClickOutside));
  }
  const toggleNamespaceSelection = (ns) => {
    const current = new Set(nsSelection());
    if (current.has(ns)) {
      current.delete(ns);
    } else {
      current.add(ns);
    }
    setNsSelection(Array.from(current));
    setNsSelectionMode("custom");
  };
  const isNamespaceChecked = (ns) => nsSelection().includes(ns);
  const applyNamespaceSelection = async () => {
    try {
      const selected = nsSelectionMode() === "all" || nsSelection().length === 0 ? [] : nsSelection();
      setNamespaces$1(selected);
      if (nsSelectionMode() === "all" || nsSelection().length === 0) {
        setNamespace("All Namespaces");
      } else if (nsSelection().length === 1) {
        setNamespace(nsSelection()[0]);
      } else {
        setNamespace(nsSelection()[0]);
      }
      setSelectedNamespaces(nsSelection(), nsSelectionMode()).catch((err) => {
        console.error("Failed to persist workspace context", err);
      });
      setNsDropdownOpen(false);
      setNsSearch("");
    } catch (err) {
      console.error("Failed to update namespace", err);
      addNotification("Failed to update namespace", "error");
      setNsDropdownOpen(false);
      setNsSearch("");
    }
  };
  const handleSelectAllNamespaces = () => {
    setNsSelection([]);
    setNsSelectionMode("all");
  };
  const getDisplayName = () => namespace();
  const selectContext = async (ctxName) => {
    if (ctxName === currentContext()) {
      setCtxDropdownOpen(false);
      setCtxSearch("");
      return;
    }
    setSwitching(true);
    try {
      await switchContext(ctxName);
      addNotification(`Switched to ${ctxName}`, "success");
    } catch (err) {
      console.error("Failed to switch context:", err);
      addNotification("Failed to switch cluster", "error");
    } finally {
      setSwitching(false);
      setCtxDropdownOpen(false);
      setCtxSearch("");
    }
  };
  const allViews = navSections.flatMap((section) => section.items);
  const getViewLabel = (viewId) => {
    const item = allViews.find((item2) => item2.id === viewId);
    return item?.label || viewId;
  };
  const getViewIcon = (viewId) => {
    const item = allViews.find((item2) => item2.id === viewId);
    return item?.icon || "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2";
  };
  const quickAccessItems = createMemo(() => {
    const favs = favorites();
    if (favs.length > 0) {
      return favs.map((view) => ({
        label: getViewLabel(view),
        view,
        icon: getViewIcon(view)
      }));
    }
    return [{
      label: "Dashboard",
      view: "dashboard",
      icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    }, {
      label: "Pods Health",
      view: "pods",
      icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
    }, {
      label: "Resource Metrics",
      view: "cost",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    }, {
      label: "Security Status",
      view: "security",
      icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    }, {
      label: "Events Log",
      view: "monitoredevents",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
    }];
  });
  const [showFavoritesModal, setShowFavoritesModal] = createSignal(false);
  return [(() => {
    var _el$ = _tmpl$8$8(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.nextSibling, _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild, _el$8 = _el$7.nextSibling, _el$23 = _el$3.nextSibling, _el$24 = _el$23.firstChild, _el$25 = _el$24.nextSibling; _el$25.nextSibling; var _el$27 = _el$2.nextSibling, _el$28 = _el$27.firstChild, _el$29 = _el$28.firstChild, _el$30 = _el$29.nextSibling, _el$31 = _el$30.firstChild, _el$32 = _el$31.firstChild, _el$33 = _el$32.firstChild, _el$34 = _el$33.nextSibling, _el$35 = _el$31.nextSibling, _el$48 = _el$28.nextSibling, _el$49 = _el$48.firstChild, _el$50 = _el$49.firstChild, _el$51 = _el$49.nextSibling, _el$52 = _el$48.nextSibling, _el$53 = _el$52.nextSibling, _el$54 = _el$53.nextSibling, _el$55 = _el$54.firstChild, _el$62 = _el$54.nextSibling, _el$63 = _el$62.nextSibling;
    _el$6.$$click = () => {
      if (!nsDropdownOpen()) {
        setNsSelection(selectedNamespaces());
      }
      setNsDropdownOpen(!nsDropdownOpen());
    };
    var _ref$ = nsButtonRef;
    typeof _ref$ === "function" ? use(_ref$, _el$6) : nsButtonRef = _el$6;
    insert(_el$7, getDisplayName);
    insert(_el$3, createComponent(Show, {
      get when() {
        return nsDropdownOpen();
      },
      get children() {
        var _el$9 = _tmpl$3$h(), _el$0 = _el$9.firstChild, _el$1 = _el$0.firstChild, _el$10 = _el$1.firstChild, _el$11 = _el$10.nextSibling, _el$12 = _el$0.nextSibling, _el$13 = _el$12.firstChild, _el$14 = _el$13.firstChild; _el$14.nextSibling; var _el$18 = _el$12.nextSibling, _el$19 = _el$18.firstChild, _el$20 = _el$19.nextSibling, _el$21 = _el$18.nextSibling, _el$22 = _el$21.firstChild;
        var _ref$2 = nsDropdownRef;
        typeof _ref$2 === "function" ? use(_ref$2, _el$9) : nsDropdownRef = _el$9;
        _el$11.$$input = (e) => setNsSearch(e.target.value);
        _el$13.$$click = handleSelectAllNamespaces;
        insert(_el$13, createComponent(Show, {
          get when() {
            return nsSelectionMode() === "all";
          },
          get children() {
            return _tmpl$$j();
          }
        }), null);
        insert(_el$12, createComponent(Show, {
          get when() {
            return !namespacesResource.loading;
          },
          get fallback() {
            return _tmpl$1$4();
          },
          get children() {
            return createComponent(For, {
              get each() {
                return filteredNamespaces();
              },
              children: (ns) => {
                const checked = createMemo(() => isNamespaceChecked(ns));
                return (() => {
                  var _el$75 = _tmpl$10$3(), _el$76 = _el$75.firstChild, _el$77 = _el$76.nextSibling;
                  _el$76.$$input = () => toggleNamespaceSelection(ns);
                  insert(_el$77, ns);
                  createRenderEffect((_$p) => setStyleProperty(_el$75, "background", checked() ? "var(--bg-tertiary)" : "transparent"));
                  createRenderEffect(() => _el$76.checked = checked());
                  return _el$75;
                })();
              }
            });
          }
        }), null);
        insert(_el$12, createComponent(Show, {
          get when() {
            return memo(() => !!nsSearch())() && filteredNamespaces().length === 0;
          },
          get children() {
            return _tmpl$2$i();
          }
        }), null);
        _el$19.$$click = () => {
          setNsDropdownOpen(false);
          setNsSearch("");
          setNsSelection(selectedNamespaces());
          const ctx = workspaceContext();
          const mode = ctx?.filters?.namespaceMode || (selectedNamespaces().length === 0 ? "default" : "custom");
          setNsSelectionMode(mode);
        };
        _el$20.$$click = applyNamespaceSelection;
        insert(_el$21, () => namespaces().length, _el$22);
        createRenderEffect((_p$) => {
          var _v$ = nsSelectionMode() === "all" ? "var(--bg-tertiary)" : "transparent", _v$2 = nsSelectionMode() === "all" ? "var(--accent-primary)" : "var(--text-primary)";
          _v$ !== _p$.e && setStyleProperty(_el$13, "background", _p$.e = _v$);
          _v$2 !== _p$.t && setStyleProperty(_el$13, "color", _p$.t = _v$2);
          return _p$;
        }, {
          e: void 0,
          t: void 0
        });
        createRenderEffect(() => _el$11.value = nsSearch());
        return _el$9;
      }
    }), null);
    _el$23.$$click = (e) => {
      e.preventDefault();
      openCommandPalette();
    };
    use((el) => {
      setCommandPaletteButtonRef(el);
    }, _el$23);
    _el$30.$$click = () => setCtxDropdownOpen(!ctxDropdownOpen());
    var _ref$3 = ctxButtonRef;
    typeof _ref$3 === "function" ? use(_ref$3, _el$30) : ctxButtonRef = _el$30;
    insert(_el$31, createComponent(Show, {
      get when() {
        return memo(() => !!cloudInfo())() && !cloudInfo.loading;
      },
      get fallback() {
        return (() => {
          var _el$78 = _tmpl$11$2();
          createRenderEffect(() => className(_el$78, `w-2 h-2 rounded-full ${clusterStatus().connected ? "bg-green-500" : "bg-red-500"}`));
          return _el$78;
        })();
      },
      get children() {
        return createComponent(CloudProviderLogo, {
          get provider() {
            return cloudInfo()?.provider;
          },
          size: 20,
          "class": "w-5 h-5"
        });
      }
    }), _el$32);
    insert(_el$33, (() => {
      var _c$ = memo(() => !!switching());
      return () => _c$() ? "Switching..." : currentContext() || "Select cluster";
    })());
    insert(_el$34, () => clusterStatus().connected ? "Connected" : "Disconnected");
    insert(_el$28, createComponent(Show, {
      get when() {
        return ctxDropdownOpen();
      },
      get children() {
        var _el$36 = _tmpl$6$c(), _el$37 = _el$36.firstChild, _el$38 = _el$37.firstChild, _el$39 = _el$38.firstChild, _el$40 = _el$39.nextSibling, _el$41 = _el$37.nextSibling, _el$44 = _el$41.nextSibling, _el$45 = _el$44.firstChild, _el$47 = _el$45.nextSibling; _el$47.nextSibling;
        var _ref$4 = ctxDropdownRef;
        typeof _ref$4 === "function" ? use(_ref$4, _el$36) : ctxDropdownRef = _el$36;
        _el$40.$$input = (e) => setCtxSearch(e.currentTarget.value);
        insert(_el$41, createComponent(Show, {
          get when() {
            return !contextsResource.loading;
          },
          get fallback() {
            return _tmpl$12$2();
          },
          get children() {
            return createComponent(For, {
              get each() {
                return filteredContexts();
              },
              children: (ctx) => (() => {
                var _el$80 = _tmpl$15$1(), _el$81 = _el$80.firstChild, _el$82 = _el$81.nextSibling, _el$83 = _el$82.firstChild;
                _el$80.$$click = () => selectContext(ctx.name);
                insert(_el$83, () => ctx.name);
                insert(_el$82, createComponent(Show, {
                  get when() {
                    return ctx.serverVersion;
                  },
                  get children() {
                    var _el$84 = _tmpl$13$1();
                    insert(_el$84, () => ctx.serverVersion);
                    return _el$84;
                  }
                }), null);
                insert(_el$80, createComponent(Show, {
                  get when() {
                    return ctx.isCurrent;
                  },
                  get children() {
                    return _tmpl$14$1();
                  }
                }), null);
                createRenderEffect((_p$) => {
                  var _v$1 = ctx.isCurrent ? "var(--bg-tertiary)" : "transparent", _v$10 = ctx.isCurrent ? "var(--accent-primary)" : "var(--text-primary)", _v$11 = `w-2 h-2 rounded-full flex-shrink-0 ${ctx.connected ? "bg-green-500" : "bg-red-500"}`;
                  _v$1 !== _p$.e && setStyleProperty(_el$80, "background", _p$.e = _v$1);
                  _v$10 !== _p$.t && setStyleProperty(_el$80, "color", _p$.t = _v$10);
                  _v$11 !== _p$.a && className(_el$81, _p$.a = _v$11);
                  return _p$;
                }, {
                  e: void 0,
                  t: void 0,
                  a: void 0
                });
                return _el$80;
              })()
            });
          }
        }), null);
        insert(_el$41, createComponent(Show, {
          get when() {
            return memo(() => !!ctxSearch())() && filteredContexts().length === 0;
          },
          get children() {
            return _tmpl$4$f();
          }
        }), null);
        insert(_el$41, createComponent(Show, {
          get when() {
            return memo(() => !!!contextsResource.loading)() && contexts().length === 0;
          },
          get children() {
            return _tmpl$5$f();
          }
        }), null);
        insert(_el$44, () => contexts().length, _el$45);
        insert(_el$44, () => contexts().length !== 1 ? "s" : "", _el$47);
        createRenderEffect(() => _el$40.value = ctxSearch());
        return _el$36;
      }
    }), null);
    _el$49.$$click = () => goToClusterManager();
    insert(_el$49, () => clusterManagerStatus()?.connected ?? clusterStatus().connected ? "Cluster Connected" : "Cluster Disconnected", null);
    _el$51.$$click = () => goToClusterManager();
    _el$52.$$click = async () => {
      const preferSystem = settings().preferSystemTerminal;
      const backendOk = backendAvailable();
      if (preferSystem && backendOk) {
        try {
          const result = await api.openNativeTerminal();
          if (result.status === "opened") {
            addNotification(`System terminal opened (${result.os})`, "success");
            return;
          } else {
            addNotification(`Failed to open system terminal: ${result.error || "Unknown error"}. Opening web terminal instead.`, "warning");
            setTerminalOpen(true);
          }
        } catch (error) {
          console.error("[Header] Failed to open native terminal:", error);
          addNotification("Native terminal access requires the local KubēGraf runtime. Opening web terminal instead.", "info");
          setTerminalOpen(true);
        }
      } else if (backendOk === false) {
        addNotification("Native terminal access requires the local KubeGraf runtime. Opening web terminal instead.", "info");
        setTerminalOpen(true);
      } else {
        setTerminalOpen(true);
      }
    };
    _el$53.$$click = (e) => {
      const btn = e.currentTarget;
      btn.classList.add("refreshing");
      setTimeout(() => btn.classList.remove("refreshing"), 500);
      refreshAll();
    };
    _el$55.$$click = () => setHelpDropdownOpen(!helpDropdownOpen());
    var _ref$5 = helpButtonRef;
    typeof _ref$5 === "function" ? use(_ref$5, _el$55) : helpButtonRef = _el$55;
    insert(_el$54, createComponent(Show, {
      get when() {
        return helpDropdownOpen();
      },
      get children() {
        var _el$56 = _tmpl$7$a(), _el$57 = _el$56.firstChild, _el$58 = _el$57.firstChild, _el$59 = _el$58.nextSibling, _el$60 = _el$59.nextSibling, _el$61 = _el$60.nextSibling;
        var _ref$6 = helpDropdownRef;
        typeof _ref$6 === "function" ? use(_ref$6, _el$56) : helpDropdownRef = _el$56;
        _el$58.$$click = () => setHelpDropdownOpen(false);
        setAttribute(_el$58, "href", DOCS_URL);
        _el$59.$$click = () => setHelpDropdownOpen(false);
        setAttribute(_el$59, "href", BUG_URL);
        _el$60.$$click = () => setHelpDropdownOpen(false);
        setAttribute(_el$60, "href", FEATURE_URL);
        _el$61.$$click = () => setHelpDropdownOpen(false);
        setAttribute(_el$61, "href", CONTACT_EMAIL);
        return _el$56;
      }
    }), null);
    insert(_el$27, createComponent(ThemeToggle, {}), _el$62);
    addEventListener(_el$62, "click", toggleBrainPanel, true);
    addEventListener(_el$63, "click", toggleAIPanel, true);
    insert(_el$27, createComponent(Show, {
      get when() {
        return memo(() => !!cloudInfo())() && !cloudInfo.loading;
      },
      get fallback() {
        return (() => {
          var _el$86 = _tmpl$16$1(), _el$87 = _el$86.firstChild;
          insert(_el$86, createComponent(CloudProviderLogo, {
            get provider() {
              return cloudInfo()?.provider;
            },
            size: 20,
            "class": "w-5 h-5"
          }), _el$87);
          return _el$86;
        })();
      },
      get children() {
        return (() => {
          const info = cloudInfo();
          const hasConsoleUrl = info?.consoleUrl && info.consoleUrl.trim() !== "";
          if (hasConsoleUrl) {
            return (() => {
              var _el$88 = _tmpl$17$1(), _el$89 = _el$88.firstChild;
              _el$88.$$click = () => {
                if (info.consoleUrl) {
                  window.open(info.consoleUrl, "_blank", "noopener,noreferrer");
                }
              };
              insert(_el$88, createComponent(CloudProviderLogo, {
                get provider() {
                  return cloudInfo()?.provider;
                },
                size: 20,
                "class": "w-5 h-5"
              }), _el$89);
              insert(_el$89, getProviderShortName);
              createRenderEffect(() => setAttribute(_el$88, "title", `Click to open ${info?.displayName || "Cloud"} Console - ${info?.region || ""}`));
              return _el$88;
            })();
          } else {
            return (() => {
              var _el$90 = _tmpl$18$1(), _el$91 = _el$90.firstChild;
              insert(_el$90, createComponent(CloudProviderLogo, {
                get provider() {
                  return cloudInfo()?.provider;
                },
                size: 20,
                "class": "w-5 h-5"
              }), _el$91);
              insert(_el$91, getProviderShortName);
              createRenderEffect(() => setAttribute(_el$90, "title", `${info?.displayName || "Local"} Cluster - ${info?.region || ""} (no cloud console available)`));
              return _el$90;
            })();
          }
        })();
      }
    }), null);
    insert(_el$, createComponent(LocalTerminalModal, {
      get isOpen() {
        return terminalOpen();
      },
      onClose: () => setTerminalOpen(false)
    }), null);
    createRenderEffect((_p$) => {
      var _v$3 = `w-4 h-4 transition-transform ${nsDropdownOpen() ? "rotate-180" : ""}`, _v$4 = switching() ? 0.7 : 1, _v$5 = `w-4 h-4 transition-transform ${ctxDropdownOpen() ? "rotate-180" : ""}`, _v$6 = clusterManagerStatus()?.connected ?? clusterStatus().connected ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", _v$7 = clusterManagerStatus()?.connected ?? clusterStatus().connected ? "#10b981" : "#ef4444", _v$8 = `w-2 h-2 rounded-full ${clusterManagerStatus()?.connected ?? clusterStatus().connected ? "bg-emerald-400" : "bg-red-500"}`, _v$9 = brainPanelOpen() ? "var(--accent-primary)" : "var(--bg-secondary)", _v$0 = brainPanelOpen() ? "#fff" : "var(--text-primary)";
      _v$3 !== _p$.e && setAttribute(_el$8, "class", _p$.e = _v$3);
      _v$4 !== _p$.t && setStyleProperty(_el$30, "opacity", _p$.t = _v$4);
      _v$5 !== _p$.a && setAttribute(_el$35, "class", _p$.a = _v$5);
      _v$6 !== _p$.o && setStyleProperty(_el$49, "background", _p$.o = _v$6);
      _v$7 !== _p$.i && setStyleProperty(_el$49, "color", _p$.i = _v$7);
      _v$8 !== _p$.n && className(_el$50, _p$.n = _v$8);
      _v$9 !== _p$.s && setStyleProperty(_el$62, "background", _p$.s = _v$9);
      _v$0 !== _p$.h && setStyleProperty(_el$62, "color", _p$.h = _v$0);
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
  })(), (() => {
    var _el$64 = _tmpl$0$5(), _el$65 = _el$64.firstChild, _el$66 = _el$65.nextSibling;
    insert(_el$64, createComponent(For, {
      get each() {
        return quickAccessItems();
      },
      children: (item) => (() => {
        var _el$92 = _tmpl$19$1(), _el$93 = _el$92.firstChild, _el$94 = _el$93.firstChild, _el$95 = _el$93.nextSibling;
        _el$92.$$click = () => setCurrentView(item.view);
        insert(_el$95, () => item.label);
        createRenderEffect((_p$) => {
          var _v$12 = item.label, _v$13 = item.icon;
          _v$12 !== _p$.e && setAttribute(_el$92, "title", _p$.e = _v$12);
          _v$13 !== _p$.t && setAttribute(_el$94, "d", _p$.t = _v$13);
          return _p$;
        }, {
          e: void 0,
          t: void 0
        });
        return _el$92;
      })()
    }), _el$66);
    _el$66.$$click = () => setShowFavoritesModal(true);
    insert(_el$64, createComponent(Show, {
      get when() {
        return showFavoritesModal();
      },
      get children() {
        return createComponent(Portal, {
          get children() {
            var _el$67 = _tmpl$9$6(), _el$68 = _el$67.firstChild, _el$69 = _el$68.firstChild, _el$70 = _el$69.firstChild, _el$71 = _el$70.nextSibling, _el$72 = _el$69.nextSibling, _el$73 = _el$72.nextSibling;
            _el$67.$$click = () => setShowFavoritesModal(false);
            _el$68.$$click = (e) => e.stopPropagation();
            _el$71.$$click = () => setShowFavoritesModal(false);
            insert(_el$73, createComponent(For, {
              each: allViews,
              children: (item) => (() => {
                var _el$96 = _tmpl$20$1(), _el$97 = _el$96.firstChild, _el$98 = _el$97.firstChild, _el$99 = _el$98.firstChild, _el$100 = _el$98.nextSibling, _el$101 = _el$97.nextSibling, _el$102 = _el$101.firstChild;
                insert(_el$100, () => item.label);
                _el$101.$$click = () => toggleFavorite(item.id);
                createRenderEffect((_p$) => {
                  var _v$14 = isFavorite(item.id) ? "var(--bg-secondary)" : "transparent", _v$15 = item.icon, _v$16 = isFavorite(item.id) ? "var(--warning-color)" : "var(--text-muted)", _v$17 = isFavorite(item.id) ? "Remove from favorites" : "Add to favorites", _v$18 = isFavorite(item.id) ? "currentColor" : "none";
                  _v$14 !== _p$.e && setStyleProperty(_el$96, "background", _p$.e = _v$14);
                  _v$15 !== _p$.t && setAttribute(_el$99, "d", _p$.t = _v$15);
                  _v$16 !== _p$.a && setStyleProperty(_el$101, "color", _p$.a = _v$16);
                  _v$17 !== _p$.o && setAttribute(_el$101, "title", _p$.o = _v$17);
                  _v$18 !== _p$.i && setAttribute(_el$102, "fill", _p$.i = _v$18);
                  return _p$;
                }, {
                  e: void 0,
                  t: void 0,
                  a: void 0,
                  o: void 0,
                  i: void 0
                });
                return _el$96;
              })()
            }));
            return _el$67;
          }
        });
      }
    }), null);
    return _el$64;
  })()];
};
delegateEvents(["click", "input"]);

const UpdateBanner = () => {
  const [showModal, setShowModal] = createSignal(false);
  const [dismissed, setDismissed] = createSignal(false);
  onMount(() => {
    const dismissedUntil = localStorage.getItem("kubegraf:updateDismissedUntil");
    if (dismissedUntil) {
      const dismissedTime = parseInt(dismissedUntil, 10);
      if (Date.now() < dismissedTime) {
        setDismissed(true);
      } else {
        localStorage.removeItem("kubegraf:updateDismissedUntil");
      }
    }
  });
  const info = updateInfo();
  return createComponent(Show, {
    get when() {
      return showModal();
    },
    get children() {
      return createComponent(UpdateModal, {
        get isOpen() {
          return showModal();
        },
        onClose: () => setShowModal(false),
        updateInfo: info
      });
    }
  });
};

const WSContext = createContext(null);
function WebSocketProvider(props) {
  const [connected, setConnected] = createSignal(false);
  const [socket] = createSignal(null);
  onMount(() => {
    wsService.connect();
    const unsubscribe = wsService.subscribe((msg) => {
      if (msg.type === "connection") {
        setConnected(msg.data.connected);
      }
      if (msg.type === "event" || msg.type === "monitored_event") {
        registerInsightEvent(1);
      }
    });
    onCleanup(() => {
      unsubscribe();
      wsService.disconnect();
    });
  });
  const value = {
    socket: () => socket(),
    // Returns null as wsService manages the socket internally
    connected,
    subscribe: (handler) => wsService.subscribe(handler),
    send: (message) => wsService.send(message)
  };
  return createComponent(WSContext.Provider, {
    value,
    get children() {
      return props.children;
    }
  });
}
function useWebSocket() {
  const context = useContext(WSContext);
  if (!context) {
    throw new Error("useWebSocket must be used within WebSocketProvider");
  }
  return context;
}

var _tmpl$$i = /* @__PURE__ */ template(`<div class="flex flex-col h-screen overflow-hidden"style=background:var(--bg-primary)><div class="flex flex-1 overflow-hidden"><div class="flex-1 flex flex-col overflow-hidden transition-all duration-300 ml-14">`);
const AppShell = (props) => {
  useWebSocket();
  return (() => {
    var _el$ = _tmpl$$i(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild;
    insert(_el$, createComponent(UpdateBanner, {}), _el$2);
    insert(_el$2, createComponent(SidebarV2, {}), _el$3);
    insert(_el$3, createComponent(Header, {}), null);
    insert(_el$3, () => props.children, null);
    return _el$;
  })();
};

var _tmpl$$h = /* @__PURE__ */ template(`<svg class="w-4 h-4"fill=none viewBox="0 0 24 24"stroke=currentColor style=color:var(--success-color)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z">`), _tmpl$2$h = /* @__PURE__ */ template(`<div class="p-4 space-y-4">`), _tmpl$3$g = /* @__PURE__ */ template(`<div class="p-4 space-y-2 border-t"style=border-color:var(--border-color)><h4 class="text-xs font-semibold mb-3"style=color:var(--text-secondary)>Recent`), _tmpl$4$e = /* @__PURE__ */ template(`<div class=overflow-y-auto style=max-height:520px>`), _tmpl$5$e = /* @__PURE__ */ template(`<div class="fixed right-4 bottom-24 z-[10000] transition-all duration-300"data-version=1.7.29 style="max-width:calc(100vw - 2rem)"><div class="rounded-lg shadow-2xl overflow-hidden backdrop-blur-xl"style="background:var(--bg-card);border:2px solid var(--border-color);box-shadow:0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)"><div class="flex items-center justify-between px-4 py-3 cursor-pointer"style=background:var(--header-bg)><div class="flex items-center gap-3"><svg class="w-5 h-5 animate-spin"fill=none viewBox="0 0 24 24"style=color:var(--primary-color)><circle class=opacity-25 cx=12 cy=12 r=10 stroke=currentColor stroke-width=4></circle><path class=opacity-75 fill=currentColor d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><div><h3 class="text-sm font-semibold"style=color:var(--text-primary)>Deployments (<!>)</h3><p class=text-xs style=color:var(--text-secondary)> active</p></div></div><div class="flex items-center gap-2"><button class="p-1.5 rounded hover:opacity-70 transition-opacity"></button><svg class="w-4 h-4 transition-transform"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--text-secondary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M19 9l-7 7-7-7">`), _tmpl$6$b = /* @__PURE__ */ template(`<svg class="w-4 h-4"fill=none viewBox="0 0 24 24"stroke=currentColor style=color:var(--text-secondary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"clip-rule=evenodd></path><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2">`), _tmpl$7$9 = /* @__PURE__ */ template(`<div class="p-4 rounded-lg"style="background:var(--input-bg);border:1px solid var(--border-color)"><div class="flex items-start justify-between mb-3"><div class=flex-1><h4 class="text-sm font-semibold"style=color:var(--text-primary)></h4><p class="text-xs mt-0.5"style=color:var(--text-secondary)>v<!> → </p></div><button class="text-xs px-2 py-1 rounded hover:opacity-70 transition-opacity"style=background:var(--error-color-alpha);color:var(--error-color)>Cancel</button></div><div class=space-y-2>`), _tmpl$8$7 = /* @__PURE__ */ template(`<div class="mt-1.5 h-1 rounded-full overflow-hidden"style=background:var(--border-color)><div class="h-full transition-all duration-300"style=background:var(--primary-color)>`), _tmpl$9$5 = /* @__PURE__ */ template(`<p class="text-xs mt-1"style=color:var(--text-secondary)>`), _tmpl$0$4 = /* @__PURE__ */ template(`<div class="flex items-center gap-3"><div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"></div><div class="flex-1 min-w-0"><div class="flex items-center justify-between"><p class="text-xs font-medium truncate"style=color:var(--text-primary)></p><span class="text-xs ml-2"style=color:var(--text-secondary)>`), _tmpl$1$3 = /* @__PURE__ */ template(`<div class="flex items-center justify-between p-2 rounded"style=background:var(--input-bg)><div class="flex items-center gap-2 flex-1 min-w-0"><span class=text-sm></span><span class="text-xs truncate"style=color:var(--text-primary)></span></div><button class="text-xs opacity-50 hover:opacity-100 transition-opacity"style=color:var(--text-secondary)>✕`);
const [deployments, setDeployments] = createSignal([]);
const [isMinimized, setIsMinimized] = createSignal(false);
const [soundEnabled, setSoundEnabled] = createSignal(localStorage.getItem("kubegraf_sound_enabled") !== "false");
let audioContext = null;
const initAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
};
const playSuccessSound = () => {
  if (!soundEnabled()) return;
  try {
    const ctx = initAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch (error) {
    console.error("Failed to play success sound:", error);
  }
};
const playErrorSound = () => {
  if (!soundEnabled()) return;
  try {
    const ctx = initAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = 200;
    oscillator.type = "sawtooth";
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  } catch (error) {
    console.error("Failed to play error sound:", error);
  }
};
const addDeployment = (appName, appVersion, namespace, tasks) => {
  const deployment = {
    id: `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    appName,
    appVersion,
    namespace,
    tasks: tasks.map((taskName, index) => ({
      id: `task-${index}`,
      name: taskName,
      status: index === 0 ? "running" : "pending",
      progress: index === 0 ? 10 : 0
    })),
    overallStatus: "running",
    createdAt: Date.now()
  };
  setDeployments((prev) => [...prev, deployment]);
  return deployment.id;
};
const updateDeploymentTask = (deploymentId, taskId, updates) => {
  setDeployments((prev) => prev.map((dep) => {
    if (dep.id !== deploymentId) return dep;
    const updatedTasks = dep.tasks.map((task) => {
      if (task.id !== taskId) return task;
      const updated = {
        ...task,
        ...updates
      };
      if (updated.status === "completed" && task.status !== "completed") {
        updated.endTime = Date.now();
        playSuccessSound();
        const currentIndex = dep.tasks.findIndex((t) => t.id === taskId);
        if (currentIndex < dep.tasks.length - 1) {
          setTimeout(() => {
            updateDeploymentTask(deploymentId, dep.tasks[currentIndex + 1].id, {
              status: "running",
              progress: 10,
              startTime: Date.now()
            });
          }, 300);
        }
      } else if (updated.status === "failed" && task.status !== "failed") {
        updated.endTime = Date.now();
        playErrorSound();
      }
      return updated;
    });
    const allCompleted = updatedTasks.every((t) => t.status === "completed");
    const anyFailed = updatedTasks.some((t) => t.status === "failed");
    return {
      ...dep,
      tasks: updatedTasks,
      overallStatus: anyFailed ? "failed" : allCompleted ? "completed" : "running"
    };
  }));
};
const cancelDeployment = (deploymentId) => {
  setDeployments((prev) => prev.map((dep) => {
    if (dep.id !== deploymentId) return dep;
    return {
      ...dep,
      overallStatus: "cancelled",
      tasks: dep.tasks.map((task) => task.status === "pending" || task.status === "running" ? {
        ...task,
        status: "failed",
        message: "Cancelled by user"
      } : task)
    };
  }));
};
const removeDeployment = (deploymentId) => {
  setDeployments((prev) => prev.filter((dep) => dep.id !== deploymentId));
};
const toggleSound = () => {
  const newValue = !soundEnabled();
  setSoundEnabled(newValue);
  localStorage.setItem("kubegraf_sound_enabled", String(newValue));
};
const DeploymentProgress = () => {
  const activeDeployments = () => deployments().filter((d) => d.overallStatus === "running" || d.overallStatus === "pending");
  const completedDeployments = () => deployments().filter((d) => d.overallStatus === "completed" || d.overallStatus === "failed");
  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "var(--success-color)";
      case "failed":
        return "var(--error-color)";
      case "running":
        return "var(--primary-color)";
      default:
        return "var(--text-secondary)";
    }
  };
  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return "✓";
      case "failed":
        return "✗";
      case "running":
        return "⟳";
      default:
        return "○";
    }
  };
  const formatDuration = (startTime, endTime) => {
    if (!startTime) return "";
    const end = endTime || Date.now();
    const duration = Math.floor((end - startTime) / 1e3);
    if (duration < 60) return `${duration}s`;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}m ${seconds}s`;
  };
  createEffect(() => {
    const completed = completedDeployments();
    completed.forEach((dep) => {
      const lastTask = dep.tasks[dep.tasks.length - 1];
      if (lastTask.endTime && Date.now() - lastTask.endTime > 1e4) {
        removeDeployment(dep.id);
      }
    });
  });
  return createComponent(Show, {
    get when() {
      return deployments().length > 0;
    },
    get children() {
      return createComponent(Portal, {
        get children() {
          var _el$ = _tmpl$5$e(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling, _el$7 = _el$6.firstChild, _el$8 = _el$7.firstChild, _el$0 = _el$8.nextSibling; _el$0.nextSibling; var _el$1 = _el$7.nextSibling, _el$10 = _el$1.firstChild, _el$11 = _el$4.nextSibling, _el$12 = _el$11.firstChild, _el$14 = _el$12.nextSibling;
          _el$3.$$click = () => setIsMinimized(!isMinimized());
          insert(_el$7, () => deployments().length, _el$0);
          insert(_el$1, () => activeDeployments().length, _el$10);
          _el$12.$$click = (e) => {
            e.stopPropagation();
            toggleSound();
          };
          insert(_el$12, createComponent(Show, {
            get when() {
              return soundEnabled();
            },
            get fallback() {
              return _tmpl$6$b();
            },
            get children() {
              return _tmpl$$h();
            }
          }));
          insert(_el$2, createComponent(Show, {
            get when() {
              return !isMinimized();
            },
            get children() {
              var _el$15 = _tmpl$4$e();
              insert(_el$15, createComponent(Show, {
                get when() {
                  return activeDeployments().length > 0;
                },
                get children() {
                  var _el$16 = _tmpl$2$h();
                  insert(_el$16, createComponent(For, {
                    get each() {
                      return activeDeployments();
                    },
                    children: (deployment) => (() => {
                      var _el$20 = _tmpl$7$9(), _el$21 = _el$20.firstChild, _el$22 = _el$21.firstChild, _el$23 = _el$22.firstChild, _el$24 = _el$23.nextSibling, _el$25 = _el$24.firstChild, _el$27 = _el$25.nextSibling; _el$27.nextSibling; var _el$28 = _el$22.nextSibling, _el$29 = _el$21.nextSibling;
                      insert(_el$23, () => deployment.appName);
                      insert(_el$24, () => deployment.appVersion, _el$27);
                      insert(_el$24, () => deployment.namespace, null);
                      _el$28.$$click = () => cancelDeployment(deployment.id);
                      insert(_el$29, createComponent(For, {
                        get each() {
                          return deployment.tasks;
                        },
                        children: (task) => (() => {
                          var _el$30 = _tmpl$0$4(), _el$31 = _el$30.firstChild, _el$32 = _el$31.nextSibling, _el$33 = _el$32.firstChild, _el$34 = _el$33.firstChild, _el$35 = _el$34.nextSibling;
                          insert(_el$31, () => getStatusIcon(task.status));
                          insert(_el$34, () => task.name);
                          insert(_el$35, () => formatDuration(task.startTime, task.endTime));
                          insert(_el$32, createComponent(Show, {
                            get when() {
                              return memo(() => task.status === "running")() && task.progress > 0;
                            },
                            get children() {
                              var _el$36 = _tmpl$8$7(), _el$37 = _el$36.firstChild;
                              createRenderEffect((_$p) => setStyleProperty(_el$37, "width", `${task.progress}%`));
                              return _el$36;
                            }
                          }), null);
                          insert(_el$32, createComponent(Show, {
                            get when() {
                              return task.message;
                            },
                            get children() {
                              var _el$38 = _tmpl$9$5();
                              insert(_el$38, () => task.message);
                              return _el$38;
                            }
                          }), null);
                          createRenderEffect((_p$) => {
                            var _v$7 = task.status === "running" ? "var(--primary-color-alpha)" : "transparent", _v$8 = getStatusColor(task.status), _v$9 = task.status === "pending" ? "1px solid var(--border-color)" : "none", _v$0 = !!(task.status === "running");
                            _v$7 !== _p$.e && setStyleProperty(_el$31, "background", _p$.e = _v$7);
                            _v$8 !== _p$.t && setStyleProperty(_el$31, "color", _p$.t = _v$8);
                            _v$9 !== _p$.a && setStyleProperty(_el$31, "border", _p$.a = _v$9);
                            _v$0 !== _p$.o && _el$31.classList.toggle("animate-pulse", _p$.o = _v$0);
                            return _p$;
                          }, {
                            e: void 0,
                            t: void 0,
                            a: void 0,
                            o: void 0
                          });
                          return _el$30;
                        })()
                      }));
                      return _el$20;
                    })()
                  }));
                  return _el$16;
                }
              }), null);
              insert(_el$15, createComponent(Show, {
                get when() {
                  return completedDeployments().length > 0;
                },
                get children() {
                  var _el$17 = _tmpl$3$g(); _el$17.firstChild;
                  insert(_el$17, createComponent(For, {
                    get each() {
                      return completedDeployments();
                    },
                    children: (deployment) => (() => {
                      var _el$39 = _tmpl$1$3(), _el$40 = _el$39.firstChild, _el$41 = _el$40.firstChild, _el$42 = _el$41.nextSibling, _el$43 = _el$40.nextSibling;
                      insert(_el$41, () => getStatusIcon(deployment.overallStatus));
                      insert(_el$42, () => deployment.appName);
                      _el$43.$$click = () => removeDeployment(deployment.id);
                      createRenderEffect((_$p) => setStyleProperty(_el$41, "color", getStatusColor(deployment.overallStatus)));
                      return _el$39;
                    })()
                  }), null);
                  return _el$17;
                }
              }), null);
              return _el$15;
            }
          }), null);
          createRenderEffect((_p$) => {
            var _v$ = isMinimized() ? "320px" : "420px", _v$2 = isMinimized() ? "60px" : "min(70vh, 600px)", _v$3 = isMinimized() ? "none" : "1px solid var(--border-color)", _v$4 = !!(activeDeployments().length === 0), _v$5 = soundEnabled() ? "Disable sounds" : "Enable sounds", _v$6 = !isMinimized();
            _v$ !== _p$.e && setStyleProperty(_el$, "width", _p$.e = _v$);
            _v$2 !== _p$.t && setStyleProperty(_el$, "max-height", _p$.t = _v$2);
            _v$3 !== _p$.a && setStyleProperty(_el$3, "border-bottom", _p$.a = _v$3);
            _v$4 !== _p$.o && _el$5.classList.toggle("hidden", _p$.o = _v$4);
            _v$5 !== _p$.i && setAttribute(_el$12, "title", _p$.i = _v$5);
            _v$6 !== _p$.n && _el$14.classList.toggle("rotate-180", _p$.n = _v$6);
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
    }
  });
};
delegateEvents(["click"]);

var _tmpl$$g = /* @__PURE__ */ template(`<svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25">`), _tmpl$2$g = /* @__PURE__ */ template(`<div class="fixed bottom-0 left-0 right-0 transition-all duration-300"style="z-index:1000;background:var(--bg-primary);border-top:2px solid var(--border-color);box-shadow:0 -4px 6px -1px rgba(0, 0, 0, 0.1)"><div class="flex items-center justify-between px-4 py-2"style="background:var(--bg-secondary);border-bottom:1px solid var(--border-color)"><div class="flex items-center gap-3"><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--accent-primary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><span class="text-sm font-semibold"style=color:var(--text-primary)>Terminal</span><span class=text-xs style=color:var(--text-secondary)>kubectl ready</span></div><div class="flex items-center gap-2"><button class="p-1.5 rounded transition-colors"title="Open in New Window"style=color:var(--text-secondary);background:transparent><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></button><button class="p-1.5 rounded transition-colors"style=color:var(--text-secondary);background:transparent></button><button class="p-1.5 rounded transition-colors"title=Close style=color:var(--text-secondary);background:transparent><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M6 18L18 6M6 6l12 12"></path></svg></button></div></div><div style="height:calc(100% - 50px);overflow:hidden">`), _tmpl$3$f = /* @__PURE__ */ template(`<svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4">`);
const DockedTerminal = (props) => {
  const [isMaximized, setIsMaximized] = createSignal(false);
  const handleOpenInNewWindow = () => {
    const currentUrl = window.location.origin + window.location.pathname;
    const terminalUrl = `${currentUrl}#terminal`;
    const newWindow = window.open(terminalUrl, "_blank", "width=1200,height=800,menubar=no,toolbar=no,location=no,status=no");
    if (newWindow) {
      newWindow.focus();
    }
  };
  const height = isMaximized() ? "calc(100vh - 60px)" : "400px";
  return createComponent(Show, {
    get when() {
      return props.isOpen;
    },
    get children() {
      return createComponent(Portal, {
        get children() {
          var _el$ = _tmpl$2$g(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.nextSibling; _el$5.nextSibling; var _el$7 = _el$3.nextSibling, _el$8 = _el$7.firstChild, _el$9 = _el$8.nextSibling, _el$1 = _el$9.nextSibling, _el$10 = _el$2.nextSibling;
          setStyleProperty(_el$, "height", height);
          _el$8.addEventListener("mouseleave", (e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          });
          _el$8.addEventListener("mouseenter", (e) => {
            e.currentTarget.style.background = "var(--bg-tertiary)";
            e.currentTarget.style.color = "var(--text-primary)";
          });
          _el$8.$$click = handleOpenInNewWindow;
          _el$9.addEventListener("mouseleave", (e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          });
          _el$9.addEventListener("mouseenter", (e) => {
            e.currentTarget.style.background = "var(--bg-tertiary)";
            e.currentTarget.style.color = "var(--text-primary)";
          });
          _el$9.$$click = () => setIsMaximized(!isMaximized());
          insert(_el$9, createComponent(Show, {
            get when() {
              return isMaximized();
            },
            get fallback() {
              return _tmpl$3$f();
            },
            get children() {
              return _tmpl$$g();
            }
          }));
          _el$1.addEventListener("mouseleave", (e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          });
          _el$1.addEventListener("mouseenter", (e) => {
            e.currentTarget.style.background = "var(--bg-tertiary)";
            e.currentTarget.style.color = "var(--text-primary)";
          });
          addEventListener(_el$1, "click", props.onClose, true);
          insert(_el$10, createComponent(LocalTerminal, {}));
          createRenderEffect(() => setAttribute(_el$9, "title", isMaximized() ? "Restore" : "Maximize"));
          return _el$;
        }
      });
    }
  });
};
delegateEvents(["click"]);

const STORAGE_KEY = "kubegraf-persistent-notifications";
const RETENTION_MS = 24 * 60 * 60 * 1e3;
function loadPersistentNotifications() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const notifications = JSON.parse(stored);
    const now = Date.now();
    const validNotifications = notifications.filter(
      (n) => now - n.timestamp < RETENTION_MS
    );
    if (validNotifications.length !== notifications.length) {
      savePersistentNotifications(validNotifications);
    }
    return validNotifications;
  } catch (error) {
    console.error("Error loading persistent notifications:", error);
    return [];
  }
}
function savePersistentNotifications(notifications) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch (error) {
    console.error("Error saving persistent notifications:", error);
  }
}
function addPersistentNotification(message, type = "info") {
  const notification = {
    id: crypto.randomUUID(),
    type,
    message,
    timestamp: Date.now(),
    read: false
  };
  const notifications = loadPersistentNotifications();
  notifications.unshift(notification);
  savePersistentNotifications(notifications);
  return notification;
}
function markNotificationAsRead(id) {
  const notifications = loadPersistentNotifications();
  const updated = notifications.map(
    (n) => n.id === id ? { ...n, read: true } : n
  );
  savePersistentNotifications(updated);
}
function markAllNotificationsAsRead() {
  const notifications = loadPersistentNotifications();
  const updated = notifications.map((n) => ({ ...n, read: true }));
  savePersistentNotifications(updated);
}
function deleteNotification(id) {
  const notifications = loadPersistentNotifications();
  const filtered = notifications.filter((n) => n.id !== id);
  savePersistentNotifications(filtered);
}
function clearAllNotifications() {
  savePersistentNotifications([]);
}
function getUnreadCount() {
  const notifications = loadPersistentNotifications();
  return notifications.filter((n) => !n.read).length;
}

var _tmpl$$f = /* @__PURE__ */ template(`<span class="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full text-[10px] font-bold min-w-[14px] h-3.5 px-0.5"style=background:var(--error-color);color:#fff>`), _tmpl$2$f = /* @__PURE__ */ template(`<div class=relative><button class="p-1.5 rounded transition-colors hover:bg-[var(--bg-tertiary)] relative"style=color:var(--text-secondary)><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9">`), _tmpl$3$e = /* @__PURE__ */ template(`<span class="px-2 py-0.5 rounded-full text-xs font-medium"style=background:var(--accent-primary);color:#000> new`), _tmpl$4$d = /* @__PURE__ */ template(`<button class="text-xs px-2 py-1 rounded transition-colors hover:bg-[var(--bg-tertiary)]"style=color:var(--text-secondary)>Mark all read`), _tmpl$5$d = /* @__PURE__ */ template(`<button class="text-xs px-2 py-1 rounded transition-colors hover:bg-[var(--bg-tertiary)]"style=color:var(--error-color)>Clear all`), _tmpl$6$a = /* @__PURE__ */ template(`<div class="fixed bottom-12 right-6 z-50 w-96 max-h-[600px] rounded-lg shadow-2xl overflow-hidden"style="background:var(--bg-secondary);border:1px solid var(--border-color)"><div class="flex items-center justify-between p-4 border-b"style=border-color:var(--border-color)><div class="flex items-center gap-2"><h3 class=font-semibold style=color:var(--text-primary)>Notifications</h3></div><div class="flex items-center gap-2"><button class="p-1 rounded transition-colors hover:bg-[var(--bg-tertiary)]"style=color:var(--text-secondary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M6 18L18 6M6 6l12 12"></path></svg></button></div></div><div class="overflow-y-auto max-h-[500px]">`), _tmpl$7$8 = /* @__PURE__ */ template(`<div class="p-8 text-center"style=color:var(--text-muted)><svg class="w-12 h-12 mx-auto mb-2 opacity-50"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg><p>No notifications`), _tmpl$8$6 = /* @__PURE__ */ template(`<div class="mt-2 h-1 rounded-full"style=width:100%>`), _tmpl$9$4 = /* @__PURE__ */ template(`<div style=border-color:var(--border-color)><div class="flex items-start gap-3"><div class="p-2 rounded-lg flex-shrink-0"><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2></path></svg></div><div class="flex-1 min-w-0"><p class=text-sm style=color:var(--text-primary)></p><p class="text-xs mt-1"style=color:var(--text-muted)></p></div><button class="p-1 rounded transition-colors hover:bg-[var(--bg-tertiary)] flex-shrink-0"style=color:var(--text-muted)><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M6 18L18 6M6 6l12 12">`);
const NotificationCenter = () => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [notifications, setNotifications] = createSignal([]);
  onMount(() => {
    refreshNotifications();
    const interval = setInterval(() => {
      refreshNotifications();
    }, 3e4);
    return () => clearInterval(interval);
  });
  const refreshNotifications = () => {
    setNotifications(loadPersistentNotifications());
  };
  const unreadCount = () => getUnreadCount();
  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markNotificationAsRead(notification.id);
      refreshNotifications();
    }
  };
  const handleMarkAllRead = () => {
    markAllNotificationsAsRead();
    refreshNotifications();
  };
  const handleDelete = (id, e) => {
    e.stopPropagation();
    deleteNotification(id);
    refreshNotifications();
  };
  const handleClearAll = () => {
    clearAllNotifications();
    refreshNotifications();
  };
  const getTypeColor = (type) => {
    switch (type) {
      case "success":
        return "var(--success-color)";
      case "error":
        return "var(--error-color)";
      case "warning":
        return "#f59e0b";
      default:
        return "var(--accent-primary)";
    }
  };
  const getTypeIcon = (type) => {
    switch (type) {
      case "success":
        return "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z";
      case "error":
        return "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z";
      case "warning":
        return "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z";
      default:
        return "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z";
    }
  };
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = /* @__PURE__ */ new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 6e4);
    const diffHours = Math.floor(diffMs / 36e5);
    const diffDays = Math.floor(diffMs / 864e5);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 2) return "Yesterday";
    return date.toLocaleDateString();
  };
  return [(() => {
    var _el$ = _tmpl$2$f(), _el$2 = _el$.firstChild; _el$2.firstChild;
    _el$2.$$click = () => setIsOpen(!isOpen());
    insert(_el$2, createComponent(Show, {
      get when() {
        return unreadCount() > 0;
      },
      get children() {
        var _el$4 = _tmpl$$f();
        insert(_el$4, (() => {
          var _c$ = memo(() => unreadCount() > 99);
          return () => _c$() ? "99+" : unreadCount();
        })());
        return _el$4;
      }
    }), null);
    createRenderEffect(() => setAttribute(_el$2, "title", `Notifications (${unreadCount()} unread)`));
    return _el$;
  })(), createComponent(Show, {
    get when() {
      return isOpen();
    },
    get children() {
      var _el$5 = _tmpl$6$a(), _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild; _el$7.firstChild; var _el$1 = _el$7.nextSibling, _el$12 = _el$1.firstChild, _el$13 = _el$6.nextSibling;
      insert(_el$7, createComponent(Show, {
        get when() {
          return unreadCount() > 0;
        },
        get children() {
          var _el$9 = _tmpl$3$e(), _el$0 = _el$9.firstChild;
          insert(_el$9, unreadCount, _el$0);
          return _el$9;
        }
      }), null);
      insert(_el$1, createComponent(Show, {
        get when() {
          return notifications().length > 0;
        },
        get children() {
          return [(() => {
            var _el$10 = _tmpl$4$d();
            _el$10.$$click = handleMarkAllRead;
            return _el$10;
          })(), (() => {
            var _el$11 = _tmpl$5$d();
            _el$11.$$click = handleClearAll;
            return _el$11;
          })()];
        }
      }), _el$12);
      _el$12.$$click = () => setIsOpen(false);
      insert(_el$13, createComponent(Show, {
        get when() {
          return notifications().length > 0;
        },
        get fallback() {
          return _tmpl$7$8();
        },
        get children() {
          return createComponent(For, {
            get each() {
              return notifications();
            },
            children: (notification) => (() => {
              var _el$15 = _tmpl$9$4(), _el$16 = _el$15.firstChild, _el$17 = _el$16.firstChild, _el$18 = _el$17.firstChild, _el$19 = _el$18.firstChild, _el$20 = _el$17.nextSibling, _el$21 = _el$20.firstChild, _el$22 = _el$21.nextSibling, _el$23 = _el$20.nextSibling;
              _el$15.$$click = () => handleNotificationClick(notification);
              insert(_el$21, () => notification.message);
              insert(_el$22, () => formatTime(notification.timestamp));
              _el$23.$$click = (e) => handleDelete(notification.id, e);
              insert(_el$15, createComponent(Show, {
                get when() {
                  return !notification.read;
                },
                get children() {
                  var _el$24 = _tmpl$8$6();
                  createRenderEffect((_$p) => setStyleProperty(_el$24, "background", getTypeColor(notification.type)));
                  return _el$24;
                }
              }), null);
              createRenderEffect((_p$) => {
                var _v$ = `p-4 border-b cursor-pointer transition-colors ${notification.read ? "opacity-60" : "bg-[var(--bg-tertiary)]/30"}`, _v$2 = `${getTypeColor(notification.type)}20`, _v$3 = getTypeColor(notification.type), _v$4 = getTypeIcon(notification.type);
                _v$ !== _p$.e && className(_el$15, _p$.e = _v$);
                _v$2 !== _p$.t && setStyleProperty(_el$17, "background", _p$.t = _v$2);
                _v$3 !== _p$.a && setStyleProperty(_el$18, "color", _p$.a = _v$3);
                _v$4 !== _p$.o && setAttribute(_el$19, "d", _p$.o = _v$4);
                return _p$;
              }, {
                e: void 0,
                t: void 0,
                a: void 0,
                o: void 0
              });
              return _el$15;
            })()
          });
        }
      }));
      return _el$5;
    }
  })];
};
delegateEvents(["click"]);

var _tmpl$$e = /* @__PURE__ */ template(`<div class="card p-4 mb-6 text-left max-w-lg mx-auto"><div class="text-xs font-semibold mb-2 uppercase tracking-wide"style=color:var(--error-color)>Error</div><div class="text-xs font-mono break-all mb-2"style=color:var(--text-secondary)></div><div class="text-sm font-medium mt-3"style=color:var(--text-primary)><div class=mb-2>Check your kubeconfig at:</div><code class="block px-3 py-2 rounded mb-3 text-xs font-mono"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)">~/.kube/config</code><div class=mb-2>Or run this command to verify access:</div><code class="block px-3 py-2 rounded text-xs font-mono"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)">kubectl cluster-info`), _tmpl$2$e = /* @__PURE__ */ template(`<div class="absolute inset-0 z-10 flex items-center justify-center p-8"style=background:var(--bg-primary);pointer-events:auto><div class="max-w-3xl w-full"><div class="text-center mb-8"><div class="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"style="background:rgba(6, 182, 212, 0.15)"><svg class="w-12 h-12"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--accent-primary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg></div><h2 class="text-3xl font-bold mb-3"style=color:var(--text-primary)>No Cluster Connected</h2><p class="text-base mb-8"style=color:var(--text-secondary)>Connect to an existing Kubernetes cluster or create a local one to get started</p></div><div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"><div class="card p-6 hover:border-cyan-500/50 transition-all cursor-pointer"style="border:2px solid var(--border-color)"><div class="flex items-center gap-3 mb-4"><div class="w-12 h-12 rounded-lg flex items-center justify-center"style="background:rgba(6, 182, 212, 0.1)"><svg class="w-6 h-6"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--accent-primary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg></div><h3 class="text-lg font-semibold"style=color:var(--text-primary)>Connect via kubeconfig</h3></div><p class="text-sm mb-4"style=color:var(--text-secondary)>Connect to an existing Kubernetes cluster using your kubeconfig file</p><ul class="text-xs space-y-2 mb-4"style=color:var(--text-muted)><li class="flex items-start gap-2"><span class=mt-1>•</span><span>Ensure kubeconfig is at <code class="px-1 py-0.5 rounded"style=background:var(--bg-tertiary)>~/.kube/config</code></span></li><li class="flex items-start gap-2"><span class=mt-1>•</span><span>Verify with: <code class="px-1 py-0.5 rounded"style=background:var(--bg-tertiary)>kubectl cluster-info</code></span></li><li class="flex items-start gap-2"><span class=mt-1>•</span><span>Click "Retry Connection" below</span></li></ul><button class="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 relative overflow-hidden"></button></div><div class="card p-6 hover:border-cyan-500/50 transition-all cursor-pointer"style="border:2px solid var(--border-color)"><div class="flex items-center gap-3 mb-4"><div class="w-12 h-12 rounded-lg flex items-center justify-center"style="background:rgba(34, 197, 94, 0.1)"><svg class="w-6 h-6"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:#22c55e><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg></div><h3 class="text-lg font-semibold"style=color:var(--text-primary)>Create Local Cluster</h3></div><p class="text-sm mb-4"style=color:var(--text-secondary)>Set up a local Kubernetes cluster using k3d, kind, or minikube</p><ul class="text-xs space-y-2 mb-4"style=color:var(--text-muted)><li class="flex items-start gap-2"><span class=mt-1>•</span><span>Requires Docker Desktop installed and running</span></li><li class="flex items-start gap-2"><span class=mt-1>•</span><span>Choose from k3d, kind, or minikube</span></li><li class="flex items-start gap-2"><span class=mt-1>•</span><span>Automatically connects after creation</span></li></ul><button class="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 flex items-center justify-center gap-2"style=background:#22c55e;color:#000><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>Go to Marketplace</button></div></div><div class="flex items-center justify-center gap-3"><button class="px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 relative overflow-hidden"></button><a href=https://kubegraf.io/docs target=_blank class="px-5 py-2.5 rounded-lg font-medium transition-all hover:opacity-90 flex items-center gap-2"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>Documentation`), _tmpl$3$d = /* @__PURE__ */ template(`<div class="absolute inset-0 opacity-20"style="background:linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.3), transparent);animation:shimmer 2s infinite">`), _tmpl$4$c = /* @__PURE__ */ template(`<svg class="w-5 h-5 animate-spin"fill=none viewBox="0 0 24 24"style=color:var(--accent-primary)><circle class=opacity-25 cx=12 cy=12 r=10 stroke=currentColor stroke-width=4></circle><path class=opacity-75 fill=currentColor d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">`), _tmpl$5$c = /* @__PURE__ */ template(`<span class="relative z-10">`), _tmpl$6$9 = /* @__PURE__ */ template(`<svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15">`), _tmpl$7$7 = /* @__PURE__ */ template(`<div class="absolute inset-0 opacity-20"style="background:linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);animation:shimmer 2s infinite">`), _tmpl$8$5 = /* @__PURE__ */ template(`<svg class="w-5 h-5 animate-spin"fill=none viewBox="0 0 24 24"style=color:white><circle class=opacity-25 cx=12 cy=12 r=10 stroke=currentColor stroke-width=4></circle><path class=opacity-75 fill=currentColor d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">`);
const ConnectionOverlay = (props) => {
  const [isRetrying, setIsRetrying] = createSignal(false);
  const [retryMessage, setRetryMessage] = createSignal("Connecting...");
  const checkConnectionStatus = async (attempt = 0) => {
    const maxAttempts = 20;
    if (attempt >= maxAttempts) {
      setIsRetrying(false);
      setRetryMessage("Connection timeout");
      return;
    }
    try {
      props.refetchStatus();
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      const status = props.connectionStatus();
      if (status?.connected) {
        setIsRetrying(false);
        setRetryMessage("Connected!");
        refreshAll();
        setTimeout(() => setRetryMessage("Connecting..."), 2e3);
        return;
      }
      if (attempt < 3) {
        setRetryMessage("Initializing connection...");
      } else if (attempt < 8) {
        setRetryMessage("Verifying cluster access...");
      } else if (attempt < 15) {
        setRetryMessage("Loading cluster resources...");
      } else {
        setRetryMessage("Finalizing connection...");
      }
      checkConnectionStatus(attempt + 1);
    } catch (err) {
      console.error("Error checking connection:", err);
      setIsRetrying(false);
      setRetryMessage("Connection failed");
      setTimeout(() => setRetryMessage("Connecting..."), 2e3);
    }
  };
  return (() => {
    var _el$ = _tmpl$2$e(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.firstChild; var _el$6 = _el$4.nextSibling; _el$6.nextSibling; var _el$8 = _el$3.nextSibling, _el$9 = _el$8.firstChild, _el$0 = _el$9.firstChild, _el$1 = _el$0.firstChild; _el$1.firstChild; _el$1.nextSibling; var _el$12 = _el$0.nextSibling, _el$13 = _el$12.nextSibling, _el$14 = _el$13.firstChild, _el$15 = _el$14.firstChild, _el$16 = _el$15.nextSibling, _el$17 = _el$16.firstChild; _el$17.nextSibling; var _el$19 = _el$14.nextSibling, _el$20 = _el$19.firstChild, _el$21 = _el$20.nextSibling, _el$22 = _el$21.firstChild; _el$22.nextSibling; var _el$24 = _el$13.nextSibling, _el$25 = _el$9.nextSibling, _el$26 = _el$25.firstChild, _el$27 = _el$26.firstChild; _el$27.firstChild; _el$27.nextSibling; var _el$30 = _el$26.nextSibling, _el$31 = _el$30.nextSibling, _el$32 = _el$31.nextSibling, _el$41 = _el$8.nextSibling, _el$42 = _el$41.firstChild; _el$42.nextSibling;
    _el$9.$$click = () => {
      alert('To connect to an existing cluster:\n\n1. Ensure your kubeconfig is set up (~/.kube/config)\n2. Verify access: kubectl cluster-info\n3. Click "Retry Connection" or refresh the page\n\nKubeGraf will automatically detect and connect to your cluster.');
    };
    _el$24.$$click = async (e) => {
      e.stopPropagation();
      if (isRetrying()) return;
      setIsRetrying(true);
      setRetryMessage("Connecting...");
      try {
        await api.getStatus(true);
        checkConnectionStatus(0);
      } catch (err) {
        console.error("Retry connection failed:", err);
        setIsRetrying(false);
        setRetryMessage("Connection failed");
        props.refetchStatus();
        setTimeout(() => setRetryMessage("Connecting..."), 2e3);
      }
    };
    insert(_el$24, (() => {
      var _c$ = memo(() => !!isRetrying());
      return () => _c$() && _tmpl$3$d();
    })(), null);
    insert(_el$24, (() => {
      var _c$2 = memo(() => !!isRetrying());
      return () => _c$2() ? [_tmpl$4$c(), (() => {
        var _el$46 = _tmpl$5$c();
        insert(_el$46, retryMessage);
        return _el$46;
      })()] : [_tmpl$6$9(), "Retry Connection"];
    })(), null);
    _el$25.$$click = () => {
      sessionStorage.setItem("kubegraf-auto-filter", "local-cluster");
      sessionStorage.setItem("kubegraf-default-tab", "marketplace");
      setCurrentView("apps");
    };
    _el$32.$$click = (e) => {
      e.stopPropagation();
      sessionStorage.setItem("kubegraf-auto-filter", "local-cluster");
      sessionStorage.setItem("kubegraf-default-tab", "marketplace");
      setCurrentView("apps");
    };
    insert(_el$2, createComponent(Show, {
      get when() {
        return props.connectionStatus()?.error;
      },
      get children() {
        var _el$33 = _tmpl$$e(), _el$34 = _el$33.firstChild, _el$35 = _el$34.nextSibling, _el$36 = _el$35.nextSibling, _el$37 = _el$36.firstChild, _el$38 = _el$37.nextSibling, _el$39 = _el$38.nextSibling; _el$39.nextSibling;
        insert(_el$35, () => props.connectionStatus()?.error);
        return _el$33;
      }
    }), _el$41);
    _el$42.$$click = async () => {
      if (isRetrying()) return;
      setIsRetrying(true);
      setRetryMessage("Connecting...");
      try {
        await api.getStatus(true);
        checkConnectionStatus(0);
      } catch (err) {
        console.error("Retry connection failed:", err);
        setIsRetrying(false);
        setRetryMessage("Connection failed");
        props.refetchStatus();
        setTimeout(() => setRetryMessage("Connecting..."), 2e3);
      }
    };
    insert(_el$42, (() => {
      var _c$3 = memo(() => !!isRetrying());
      return () => _c$3() && _tmpl$7$7();
    })(), null);
    insert(_el$42, (() => {
      var _c$4 = memo(() => !!isRetrying());
      return () => _c$4() ? [_tmpl$8$5(), (() => {
        var _el$50 = _tmpl$5$c();
        insert(_el$50, retryMessage);
        return _el$50;
      })()] : [_tmpl$6$9(), "Retry Connection"];
    })(), null);
    createRenderEffect((_p$) => {
      var _v$ = isRetrying(), _v$2 = isRetrying() ? "var(--bg-tertiary)" : "var(--accent-primary)", _v$3 = isRetrying() ? "var(--text-secondary)" : "#000", _v$4 = isRetrying() ? 0.8 : 1, _v$5 = isRetrying() ? "not-allowed" : "pointer", _v$6 = isRetrying(), _v$7 = isRetrying() ? "var(--bg-tertiary)" : "var(--error-color)", _v$8 = isRetrying() ? "var(--text-secondary)" : "white", _v$9 = isRetrying() ? 0.8 : 1, _v$0 = isRetrying() ? "not-allowed" : "pointer";
      _v$ !== _p$.e && (_el$24.disabled = _p$.e = _v$);
      _v$2 !== _p$.t && setStyleProperty(_el$24, "background", _p$.t = _v$2);
      _v$3 !== _p$.a && setStyleProperty(_el$24, "color", _p$.a = _v$3);
      _v$4 !== _p$.o && setStyleProperty(_el$24, "opacity", _p$.o = _v$4);
      _v$5 !== _p$.i && setStyleProperty(_el$24, "cursor", _p$.i = _v$5);
      _v$6 !== _p$.n && (_el$42.disabled = _p$.n = _v$6);
      _v$7 !== _p$.s && setStyleProperty(_el$42, "background", _p$.s = _v$7);
      _v$8 !== _p$.h && setStyleProperty(_el$42, "color", _p$.h = _v$8);
      _v$9 !== _p$.r && setStyleProperty(_el$42, "opacity", _p$.r = _v$9);
      _v$0 !== _p$.d && setStyleProperty(_el$42, "cursor", _p$.d = _v$0);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0,
      i: void 0,
      n: void 0,
      s: void 0,
      h: void 0,
      r: void 0,
      d: void 0
    });
    return _el$;
  })();
};
delegateEvents(["click"]);

let currentSocket = null;
const [panelOpen, setPanelOpen] = createSignal(false);
const [panelExpanded, setPanelExpanded] = createSignal(false);
const [status, setStatus] = createSignal("idle");
const [mode, setMode] = createSignal("apply");
const [sourceLabel, setSourceLabel] = createSignal("shell");
const [label, setLabel] = createSignal(void 0);
const [lines, setLines] = createSignal([]);
const [autoScrollEnabled, setAutoScrollEnabled] = createSignal(true);
const [hasManualScroll, setHasManualScroll] = createSignal(false);
const [summary, setSummary] = createSignal(null);
const [error, setError] = createSignal(null);
const [rawError, setRawError] = createSignal(null);
const [currentExecutionId, setCurrentExecutionId] = createSignal(null);
const [lastRequest, setLastRequest] = createSignal(null);
const [startedAt, setStartedAt] = createSignal(null);
const [completedAt, setCompletedAt] = createSignal(null);
const [recentExecutions, setRecentExecutions] = createSignal([]);
const [loadingExecutions, setLoadingExecutions] = createSignal(false);
const [phases, setPhases] = createSignal([]);
function makeExecutionId() {
  return `exec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function connectWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/api/execution/stream`;
  return new WebSocket(wsUrl);
}
function startExecution(opts) {
  if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
    currentSocket.close();
  }
  const executionId = makeExecutionId();
  setPanelOpen(true);
  setPanelExpanded(true);
  setStatus("planned");
  setMode(opts.mode);
  setSourceLabel(opts.kubernetesEquivalent ? "kubectl-equivalent" : "shell");
  setLabel(opts.label);
  setLines([]);
  setSummary(null);
  setError(null);
  setRawError(null);
  setStartedAt(null);
  setCompletedAt(null);
  setAutoScrollEnabled(true);
  setHasManualScroll(false);
  setCurrentExecutionId(executionId);
  setLastRequest(opts);
  const socket = connectWebSocket();
  currentSocket = socket;
  socket.onopen = () => {
    const payload = {
      type: "start",
      executionId,
      command: opts.command,
      args: opts.args || [],
      mode: opts.mode,
      kubernetesEquivalent: opts.kubernetesEquivalent ?? false,
      workingDir: opts.workingDir || "",
      label: opts.label || "",
      namespace: opts.namespace || "",
      context: opts.context || "",
      userAction: opts.userAction || "",
      dryRun: opts.dryRun ?? opts.mode === "dry-run",
      allowClusterWide: opts.allowClusterWide ?? false,
      resource: opts.resource || "",
      action: opts.action || "",
      intent: opts.intent || "",
      yaml: opts.yaml || ""
    };
    try {
      socket.send(JSON.stringify(payload));
    } catch (err) {
      console.error("[ExecutionPanel] Failed to send start payload:", err);
      setStatus("failed");
      setError("Failed to send execution request");
      setRawError(err instanceof Error ? err.message : String(err));
    }
  };
  socket.onerror = (event) => {
    console.error("[ExecutionPanel] WebSocket error:", event);
    if (status() === "planned" || status() === "running") {
      setStatus("failed");
      setError("Execution stream connection failed");
    }
  };
  socket.onclose = () => {
    if (status() === "planned" || status() === "running") {
      setStatus("failed");
      if (!error()) {
        setError("Execution stream closed unexpectedly");
      }
    }
  };
  socket.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch (err) {
      console.error("[ExecutionPanel] Failed to parse execution message:", err, event.data);
      return;
    }
    if (msg.executionId && msg.executionId !== currentExecutionId()) {
      return;
    }
    switch (msg.type) {
      case "state": {
        const stateMsg = msg;
        if (stateMsg.status === "running") {
          setStatus("running");
        } else if (stateMsg.status === "planned") {
          setStatus("planned");
        }
        setMode(stateMsg.mode);
        setSourceLabel(stateMsg.sourceLabel);
        if (stateMsg.label) {
          setLabel(stateMsg.label);
        }
        setStartedAt(stateMsg.timestamp);
        break;
      }
      case "line": {
        const lineMsg = msg;
        const line = {
          id: `${lineMsg.executionId}-${lines().length}`,
          timestamp: lineMsg.timestamp,
          stream: lineMsg.stream,
          text: lineMsg.text
        };
        setLines((prev) => [...prev, line]);
        if (!startedAt()) {
          setStartedAt(lineMsg.timestamp);
        }
        break;
      }
      case "phase": {
        const phaseMsg = msg;
        setPhases((prev) => [...prev, phaseMsg]);
        break;
      }
      case "complete":
      case "error": {
        const completeMsg = msg;
        setStatus(completeMsg.status === "succeeded" ? "succeeded" : "failed");
        setMode(completeMsg.mode);
        setSourceLabel(completeMsg.sourceLabel);
        if (completeMsg.summary) {
          setSummary(completeMsg.summary);
          setStartedAt(completeMsg.summary.startedAt);
          setCompletedAt(completeMsg.summary.completedAt);
        } else {
          setCompletedAt(completeMsg.timestamp);
        }
        if (completeMsg.error) {
          setError(completeMsg.error);
        }
        if (completeMsg.rawError) {
          setRawError(completeMsg.rawError);
        }
        if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
          currentSocket.close();
        }
        currentSocket = null;
        break;
      }
    }
  };
}
function retryLastExecution() {
  const last = lastRequest();
  if (!last) {
    addNotification("No previous execution to retry", "warning");
    return;
  }
  startExecution(last);
}
function hideExecutionPanel() {
  setPanelOpen(false);
}
function toggleExecutionPanelExpanded() {
  setPanelExpanded((prev) => !prev);
}
function onUserManualScroll() {
  setHasManualScroll(true);
  setAutoScrollEnabled(false);
}
function enableAutoScroll() {
  setHasManualScroll(false);
  setAutoScrollEnabled(true);
}
function clearExecutionOutput() {
  setLines([]);
  setSummary(null);
  setError(null);
  setRawError(null);
}
function setExecutionStateFromResult(opts) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const started = opts.startedAt || now;
  const completed = opts.completedAt || now;
  const duration = opts.durationMs || new Date(completed).getTime() - new Date(started).getTime();
  setPanelOpen(true);
  setPanelExpanded(true);
  setStatus(opts.status);
  setMode("apply");
  setSourceLabel("kubectl-equivalent");
  setLabel(opts.label || "Fix Applied");
  setCurrentExecutionId(opts.executionId);
  setSummary({
    startedAt: started,
    completedAt: completed,
    durationMs: duration,
    exitCode: opts.exitCode || (opts.status === "succeeded" ? 0 : 1),
    resourcesChanged: opts.resourcesChanged || null
  });
  setStartedAt(started);
  setCompletedAt(completed);
  if (opts.status === "failed") {
    setError(opts.error || opts.message);
  } else {
    setError(null);
    setRawError(null);
  }
  let executionLines2 = opts.lines || [];
  executionLines2 = executionLines2.map((line, idx) => ({
    ...line,
    id: line.id || `${opts.executionId}-${idx}`
  }));
  if (opts.message && !opts.lines) {
    executionLines2.push({
      id: `${opts.executionId}-${executionLines2.length}`,
      timestamp: completed,
      stream: "stdout",
      text: opts.message
    });
  }
  if (opts.error && opts.status === "failed" && !opts.lines) {
    executionLines2.push({
      id: `${opts.executionId}-${executionLines2.length}`,
      timestamp: completed,
      stream: "stderr",
      text: opts.error
    });
  }
  setLines(executionLines2);
  setAutoScrollEnabled(true);
  setHasManualScroll(false);
  setPhases([]);
}
function mapBackendStatusToLocal(status2) {
  switch (status2) {
    case "running":
      return "running";
    case "succeeded":
      return "succeeded";
    case "failed":
      return "failed";
    case "planned":
      return "planned";
    default:
      return "idle";
  }
}
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return await res.json();
}
async function loadExecutionLogsInternal(executionId) {
  try {
    const data = await fetchJSON(`/api/executions/logs?executionId=${encodeURIComponent(executionId)}`);
    const newLines = (data.logs || []).map((log, idx) => ({
      id: `${executionId}-${idx}`,
      timestamp: log.timestamp,
      stream: log.stream,
      text: log.text
    }));
    setLines(newLines);
  } catch (err) {
    console.error("[ExecutionPanel] Failed to load execution logs:", err);
    addNotification("Failed to load execution logs", "error");
  }
}
async function loadRecentExecutions(limit = 20) {
  try {
    setLoadingExecutions(true);
    const data = await fetchJSON(`/api/executions?limit=${limit}`);
    setRecentExecutions(Array.isArray(data.executions) ? data.executions : []);
  } catch (err) {
    console.error("[ExecutionPanel] Failed to load recent executions:", err);
    addNotification("Failed to load recent executions", "error");
  } finally {
    setLoadingExecutions(false);
  }
}
async function reattachExecution(record) {
  const executionId = record.executionId;
  setPanelOpen(true);
  setPanelExpanded(true);
  setCurrentExecutionId(executionId);
  setStatus(mapBackendStatusToLocal(record.status));
  setMode(record.summary?.exitCode === 0 ? mode() : mode());
  setSourceLabel("shell");
  setLabel(record.summary ? label() : label());
  setSummary(record.summary ?? null);
  setError(null);
  setRawError(null);
  setAutoScrollEnabled(true);
  setHasManualScroll(false);
  setPhases([]);
  if (record.summary) {
    setStartedAt(record.summary.startedAt);
    setCompletedAt(record.summary.completedAt);
  } else {
    setStartedAt(record.startedAt);
    setCompletedAt(null);
  }
  await loadExecutionLogsInternal(executionId);
}
async function autoReattachMostRecentRunning() {
  await loadRecentExecutions(20);
  const records = recentExecutions();
  if (!records.length) return;
  const running = records.find((r) => r.status === "running");
  if (!running) return;
  await reattachExecution(running);
  addNotification("Execution still running — reattached", "info");
}
const executionPanelOpen = panelOpen;
const executionPanelExpanded = panelExpanded;
const executionStatus = status;
const executionMode = mode;
const executionSourceLabel = sourceLabel;
const executionLabel = label;
const executionLines = lines;
const executionSummaryState = summary;
const executionError = error;
const executionRawError = rawError;
const executionAutoScrollEnabled = autoScrollEnabled;
const executionHasManualScroll = hasManualScroll;
const executionDurationDisplay = createMemo(() => {
  const s = summary();
  if (s && s.durationMs != null) {
    const seconds2 = Math.round(s.durationMs / 100) / 10;
    return `${seconds2.toFixed(1)}s`;
  }
  const start = startedAt();
  const end = completedAt();
  if (!start || !end) return "";
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) return "";
  const seconds = Math.round((endTime - startTime) / 100) / 10;
  return `${seconds.toFixed(1)}s`;
});
const executionCombinedOutput = createMemo(() => {
  return executionLines().map((line) => {
    const time = new Date(line.timestamp);
    const hh = String(time.getHours()).padStart(2, "0");
    const mm = String(time.getMinutes()).padStart(2, "0");
    const ss = String(time.getSeconds()).padStart(2, "0");
    const prefix = `[${hh}:${mm}:${ss}]`;
    return `${prefix} ${line.stream.toUpperCase()}: ${line.text}`;
  }).join("\n");
});
const executionSeveritySummary = createMemo(() => {
  let errors = 0;
  let warnings = 0;
  let infos = 0;
  for (const line of executionLines()) {
    const textLower = line.text.toLowerCase();
    if (line.stream === "stderr") {
      if (textLower.includes("warning") || textLower.includes("deprecated")) {
        warnings++;
      } else {
        errors++;
      }
    } else {
      infos++;
    }
  }
  return { errors, warnings, infos };
});

var _tmpl$$d = /* @__PURE__ */ template(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"><span class="w-1.5 h-1.5 rounded-full">`), _tmpl$2$d = /* @__PURE__ */ template(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide">`), _tmpl$3$c = /* @__PURE__ */ template(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide"style=background:var(--bg-tertiary);color:var(--text-secondary)>`), _tmpl$4$b = /* @__PURE__ */ template(`<div class="flex flex-wrap gap-2 mt-1">`), _tmpl$5$b = /* @__PURE__ */ template(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]"style="background:var(--bg-secondary);border:1px solid var(--border-color)"><span class="uppercase tracking-wide opacity-70"></span><span class=font-semibold>`), _tmpl$6$8 = /* @__PURE__ */ template(`<div class="flex flex-wrap gap-2">`), _tmpl$7$6 = /* @__PURE__ */ template(`<span style=color:var(--text-muted);font-weight:500>(server-side validation)`), _tmpl$8$4 = /* @__PURE__ */ template(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"style="border:1px solid var(--border-color)"><span class="w-1.5 h-1.5 rounded-full">`), _tmpl$9$3 = /* @__PURE__ */ template(`<span class=text-[11px] style=color:var(--text-secondary)>`), _tmpl$0$3 = /* @__PURE__ */ template(`<button class="px-2 py-1 rounded text-[11px]"title="Resume auto-scroll"style=background:var(--bg-tertiary);color:var(--text-secondary)>Auto-scroll`), _tmpl$1$2 = /* @__PURE__ */ template(`<div class="flex items-center gap-1.5"><div class=spinner style=width:14px;height:14px></div><span style=color:var(--text-secondary)>Executing…`), _tmpl$10$2 = /* @__PURE__ */ template(`<span style=color:var(--text-secondary)>Planned &mdash; awaiting execution start`), _tmpl$11$1 = /* @__PURE__ */ template(`<span style=color:var(--success-color)>Execution succeeded`), _tmpl$12$1 = /* @__PURE__ */ template(`<span style=color:var(--error-color)>Execution failed`), _tmpl$13 = /* @__PURE__ */ template(`<span>Started: `), _tmpl$14 = /* @__PURE__ */ template(`<span>Completed: `), _tmpl$15 = /* @__PURE__ */ template(`<button class="px-2 py-1 rounded text-[10px]"style=background:transparent;color:var(--text-secondary)>`), _tmpl$16 = /* @__PURE__ */ template(`<pre class="mt-2 p-2 rounded overflow-auto max-h-32"style="border:1px solid color-mix(in srgb, var(--error-color) 40%, transparent);color:var(--text-primary);background:var(--bg-secondary)">`), _tmpl$17 = /* @__PURE__ */ template(`<div class="mt-2 rounded-md px-3 py-2 text-[11px]"style="background:color-mix(in srgb, var(--error-color) 12%, transparent);color:var(--error-color);border:1px solid color-mix(in srgb, var(--error-color) 40%, transparent)"><div class="flex items-start justify-between gap-2"><div class=flex-1><div class="flex items-center gap-1.5 mb-1"><svg class="w-3.5 h-3.5 flex-shrink-0"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-3L13.74 5a2 2 0 00-3.48 0L3.33 16a2 2 0 001.74 3z"></path></svg><span class=font-semibold>Error</span></div><div></div></div><div class="flex flex-col gap-1 items-end"><button class="px-2 py-1 rounded text-[11px] font-medium"style=background:var(--bg-tertiary);color:var(--text-primary)>Retry`), _tmpl$18 = /* @__PURE__ */ template(`<div class="px-3 pt-2 pb-2 space-y-2 text-xs"><div class="flex items-center justify-between gap-3"><div class="flex items-center gap-3"></div><div class="flex items-center gap-3 text-[11px]"style=color:var(--text-muted)></div></div><div class="mt-2 rounded-md border font-mono text-[11px] leading-relaxed"style=border-color:var(--border-color);background:var(--bg-primary);maxHeight:260px;minHeight:140px;overflow:auto>`), _tmpl$19 = /* @__PURE__ */ template(`<div class="fixed right-4 bottom-24 z-40"style=maxWidth:640px><div class="card shadow-lg border"style=background:var(--bg-card);border-color:var(--border-color)><div class="flex items-center justify-between px-3 py-2 border-b"style=border-color:var(--border-color)><div class="flex items-center gap-2 min-w-0"><div class="w-6 h-6 rounded-md flex items-center justify-center"><svg class="w-3.5 h-3.5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div><div class="flex flex-col min-w-0"><div class="flex items-center gap-2 min-w-0"><span class="text-xs font-semibold truncate"style=color:var(--text-primary)></span></div><div class="flex items-center gap-2 mt-0.5"></div><div class=mt-1></div></div></div><div class="flex items-center gap-1"><button class="p-1.5 rounded transition-colors"title="Clear output"style=color:var(--text-secondary)><svg class="w-3.5 h-3.5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M6 18L18 6M6 6l12 12"></path></svg></button><button class="p-1.5 rounded transition-colors"title="Copy output"style=color:var(--text-secondary)><svg class="w-3.5 h-3.5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></button><button class="p-1.5 rounded transition-colors"style=color:var(--text-secondary)><svg class="w-3.5 h-3.5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2></path></svg></button><button class="p-1.5 rounded transition-colors"title="Hide execution panel"style=color:var(--text-secondary)><svg class="w-3.5 h-3.5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M6 18L18 6M6 6l12 12">`), _tmpl$20 = /* @__PURE__ */ template(`<div class="px-3 py-2 text-[11px]"style=color:var(--text-muted)>`), _tmpl$21 = /* @__PURE__ */ template(`<div class="px-3 py-0.5 whitespace-pre-wrap"><span class=mr-2 style=color:var(--text-muted)>[<!>:<!>:<!>]</span><span class=mr-2></span><span>`);
const ExecutionPanel = () => {
  let containerRef;
  const [showRawError, setShowRawError] = createSignal(false);
  createEffect(() => {
    executionLines();
    if (!executionAutoScrollEnabled() || !containerRef) return;
    queueMicrotask(() => {
      if (!containerRef) return;
      containerRef.scrollTop = containerRef.scrollHeight;
    });
  });
  const handleScroll = () => {
    if (!containerRef) return;
    const nearBottom = containerRef.scrollHeight - containerRef.scrollTop - containerRef.clientHeight < 32;
    if (!nearBottom) {
      onUserManualScroll();
    }
  };
  const handleCopyOutput = async () => {
    try {
      const text = executionCombinedOutput();
      if (!text) {
        addNotification("No output to copy yet", "warning");
        return;
      }
      await navigator.clipboard.writeText(text);
      addNotification("Execution output copied to clipboard", "success");
    } catch (err) {
      console.error("[ExecutionPanel] Failed to copy output:", err);
      addNotification("Failed to copy output to clipboard", "error");
    }
  };
  onCleanup(() => {
    clearExecutionOutput();
  });
  const statusBadge = () => {
    const s = executionStatus();
    const mode = executionMode();
    const label = (() => {
      switch (s) {
        case "planned":
          return "Planned";
        case "running":
          return "Executing…";
        case "succeeded":
          return "Succeeded";
        case "failed":
          return "Failed";
        default:
          return "Idle";
      }
    })();
    const baseColor = s === "failed" ? "var(--error-color)" : s === "succeeded" ? "var(--success-color)" : s === "running" ? "var(--accent-primary)" : "var(--text-muted)";
    const bg = mode === "dry-run" ? "color-mix(in srgb, var(--warning-color) 15%, transparent)" : mode === "apply" ? "color-mix(in srgb, var(--error-color) 12%, transparent)" : "var(--bg-tertiary)";
    return (() => {
      var _el$ = _tmpl$$d(), _el$2 = _el$.firstChild;
      setStyleProperty(_el$, "background", bg);
      setStyleProperty(_el$, "color", baseColor);
      setStyleProperty(_el$2, "background", s === "failed" ? "var(--error-color)" : s === "succeeded" ? "var(--success-color)" : s === "running" ? "var(--accent-primary)" : "var(--text-muted)");
      insert(_el$, label, null);
      return _el$;
    })();
  };
  const modeBadge = () => {
    const mode = executionMode();
    const bg = mode === "dry-run" ? "color-mix(in srgb, var(--warning-color) 15%, transparent)" : "color-mix(in srgb, var(--error-color) 12%, transparent)";
    const color = mode === "dry-run" ? "var(--warning-color)" : "var(--error-color)";
    return (() => {
      var _el$3 = _tmpl$2$d();
      setStyleProperty(_el$3, "background", bg);
      setStyleProperty(_el$3, "color", color);
      setAttribute(_el$3, "title", mode === "dry-run" ? "Dry run (no changes applied)" : "Real apply (changes applied)");
      insert(_el$3, mode === "dry-run" ? "DRY RUN" : "APPLY");
      return _el$3;
    })();
  };
  const sourceLabel = () => {
    const src = executionSourceLabel();
    const label = src === "kubectl-equivalent" ? "kubectl-equivalent" : "Shell";
    return (() => {
      var _el$4 = _tmpl$3$c();
      setAttribute(_el$4, "title", src === "kubectl-equivalent" ? "Execution path is equivalent to kubectl / Kubernetes API calls" : "Execution is running as a local shell command");
      insert(_el$4, label);
      return _el$4;
    })();
  };
  const summaryChips = () => {
    const s = executionSummaryState();
    if (!s) return null;
    const chips = [];
    if (s.exitCode !== void 0 && s.exitCode !== null) {
      chips.push({
        label: "Exit code",
        value: String(s.exitCode),
        color: s.exitCode === 0 ? "var(--success-color)" : "var(--error-color)"
      });
    }
    if (s.durationMs !== void 0 && s.durationMs !== null) {
      chips.push({
        label: "Duration",
        value: executionDurationDisplay() || `${(s.durationMs / 1e3).toFixed(1)}s`,
        color: "var(--text-secondary)"
      });
    }
    if (s.resourcesChanged) {
      const r = s.resourcesChanged;
      if (r.created) {
        chips.push({
          label: "Created",
          value: String(r.created),
          color: "var(--success-color)"
        });
      }
      if (r.configured) {
        chips.push({
          label: "Configured",
          value: String(r.configured),
          color: "var(--accent-secondary)"
        });
      }
      if (r.deleted) {
        chips.push({
          label: "Deleted",
          value: String(r.deleted),
          color: "var(--error-color)"
        });
      }
      if (r.unchanged) {
        chips.push({
          label: "Unchanged",
          value: String(r.unchanged),
          color: "var(--text-secondary)"
        });
      }
    }
    return (() => {
      var _el$5 = _tmpl$4$b();
      insert(_el$5, createComponent(For, {
        each: chips,
        children: (chip) => (() => {
          var _el$6 = _tmpl$5$b(), _el$7 = _el$6.firstChild, _el$8 = _el$7.nextSibling;
          insert(_el$7, () => chip.label);
          insert(_el$8, () => chip.value);
          createRenderEffect((_$p) => setStyleProperty(_el$6, "color", chip.color));
          return _el$6;
        })()
      }));
      return _el$5;
    })();
  };
  const severityChips = () => {
    const sev = executionSeveritySummary();
    if (!sev) return null;
    const chips = [];
    if (sev.errors > 0) {
      chips.push({
        label: "Errors",
        value: sev.errors,
        color: "var(--error-color)"
      });
    }
    if (sev.warnings > 0) {
      chips.push({
        label: "Warnings",
        value: sev.warnings,
        color: "var(--warning-color)"
      });
    }
    if (!chips.length) return null;
    return (() => {
      var _el$9 = _tmpl$4$b();
      insert(_el$9, createComponent(For, {
        each: chips,
        children: (chip) => (() => {
          var _el$0 = _tmpl$5$b(), _el$1 = _el$0.firstChild, _el$10 = _el$1.nextSibling;
          insert(_el$1, () => chip.label);
          insert(_el$10, () => chip.value);
          createRenderEffect((_$p) => setStyleProperty(_el$0, "color", chip.color));
          return _el$0;
        })()
      }));
      return _el$9;
    })();
  };
  const prettyTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString();
  };
  const stepChips = () => {
    const mode = executionMode();
    const isApply = mode === "apply";
    const steps = [{
      key: "preview",
      label: "Preview",
      active: true
    }, {
      key: "dry",
      label: "Dry run",
      active: true
    }, {
      key: "apply",
      label: "Apply",
      active: isApply
    }];
    return (() => {
      var _el$11 = _tmpl$6$8();
      insert(_el$11, createComponent(For, {
        each: steps,
        children: (step) => (() => {
          var _el$12 = _tmpl$8$4(), _el$13 = _el$12.firstChild;
          insert(_el$12, () => step.label, null);
          insert(_el$12, createComponent(Show, {
            get when() {
              return step.key === "dry";
            },
            get children() {
              return _tmpl$7$6();
            }
          }), null);
          createRenderEffect((_p$) => {
            var _v$ = step.active ? "var(--bg-tertiary)" : "var(--bg-secondary)", _v$2 = step.active ? "var(--text-primary)" : "var(--text-secondary)", _v$3 = step.active ? "var(--accent-primary)" : "var(--text-muted)";
            _v$ !== _p$.e && setStyleProperty(_el$12, "background", _p$.e = _v$);
            _v$2 !== _p$.t && setStyleProperty(_el$12, "color", _p$.t = _v$2);
            _v$3 !== _p$.a && setStyleProperty(_el$13, "background", _p$.a = _v$3);
            return _p$;
          }, {
            e: void 0,
            t: void 0,
            a: void 0
          });
          return _el$12;
        })()
      }));
      return _el$11;
    })();
  };
  return createComponent(Show, {
    get when() {
      return executionPanelOpen();
    },
    get children() {
      var _el$15 = _tmpl$19(), _el$16 = _el$15.firstChild, _el$17 = _el$16.firstChild, _el$18 = _el$17.firstChild, _el$19 = _el$18.firstChild, _el$20 = _el$19.nextSibling, _el$21 = _el$20.firstChild, _el$22 = _el$21.firstChild, _el$23 = _el$21.nextSibling, _el$25 = _el$23.nextSibling, _el$26 = _el$18.nextSibling, _el$28 = _el$26.firstChild, _el$29 = _el$28.nextSibling, _el$30 = _el$29.nextSibling, _el$31 = _el$30.firstChild, _el$32 = _el$31.firstChild, _el$33 = _el$30.nextSibling;
      insert(_el$22, () => executionLabel() || "Command execution");
      insert(_el$21, modeBadge, null);
      insert(_el$21, sourceLabel, null);
      insert(_el$23, statusBadge, null);
      insert(_el$23, createComponent(Show, {
        get when() {
          return executionDurationDisplay();
        },
        get children() {
          var _el$24 = _tmpl$9$3();
          insert(_el$24, executionDurationDisplay);
          return _el$24;
        }
      }), null);
      insert(_el$25, stepChips);
      insert(_el$26, createComponent(Show, {
        get when() {
          return executionHasManualScroll();
        },
        get children() {
          var _el$27 = _tmpl$0$3();
          _el$27.$$click = () => enableAutoScroll();
          return _el$27;
        }
      }), _el$28);
      _el$28.addEventListener("mouseleave", (e) => e.currentTarget.style.background = "transparent");
      _el$28.addEventListener("mouseenter", (e) => e.currentTarget.style.background = "var(--bg-tertiary)");
      _el$28.$$click = () => clearExecutionOutput();
      _el$29.addEventListener("mouseleave", (e) => e.currentTarget.style.background = "transparent");
      _el$29.addEventListener("mouseenter", (e) => e.currentTarget.style.background = "var(--bg-tertiary)");
      _el$29.$$click = handleCopyOutput;
      _el$30.addEventListener("mouseleave", (e) => e.currentTarget.style.background = "transparent");
      _el$30.addEventListener("mouseenter", (e) => e.currentTarget.style.background = "var(--bg-tertiary)");
      _el$30.$$click = () => toggleExecutionPanelExpanded();
      _el$33.addEventListener("mouseleave", (e) => e.currentTarget.style.background = "transparent");
      _el$33.addEventListener("mouseenter", (e) => e.currentTarget.style.background = "var(--bg-tertiary)");
      _el$33.$$click = () => hideExecutionPanel();
      insert(_el$16, createComponent(Show, {
        get when() {
          return executionPanelExpanded();
        },
        get children() {
          var _el$34 = _tmpl$18(), _el$35 = _el$34.firstChild, _el$36 = _el$35.firstChild, _el$43 = _el$36.nextSibling, _el$48 = _el$35.nextSibling;
          insert(_el$36, createComponent(Show, {
            get when() {
              return executionStatus() === "running";
            },
            get children() {
              var _el$37 = _tmpl$1$2(), _el$38 = _el$37.firstChild; _el$38.nextSibling;
              return _el$37;
            }
          }), null);
          insert(_el$36, createComponent(Show, {
            get when() {
              return executionStatus() === "planned";
            },
            get children() {
              return _tmpl$10$2();
            }
          }), null);
          insert(_el$36, createComponent(Show, {
            get when() {
              return executionStatus() === "succeeded";
            },
            get children() {
              return _tmpl$11$1();
            }
          }), null);
          insert(_el$36, createComponent(Show, {
            get when() {
              return executionStatus() === "failed";
            },
            get children() {
              return _tmpl$12$1();
            }
          }), null);
          insert(_el$43, createComponent(Show, {
            get when() {
              return executionSummaryState();
            },
            get children() {
              return [(() => {
                var _el$44 = _tmpl$13(); _el$44.firstChild;
                insert(_el$44, () => prettyTime(executionSummaryState()?.startedAt ?? null), null);
                return _el$44;
              })(), (() => {
                var _el$46 = _tmpl$14(); _el$46.firstChild;
                insert(_el$46, () => prettyTime(executionSummaryState()?.completedAt ?? null), null);
                return _el$46;
              })()];
            }
          }));
          insert(_el$34, createComponent(Show, {
            get when() {
              return executionSummaryState();
            },
            get children() {
              return summaryChips();
            }
          }), _el$48);
          insert(_el$34, createComponent(Show, {
            get when() {
              return executionSeveritySummary().errors > 0 || executionSeveritySummary().warnings > 0;
            },
            get children() {
              return severityChips();
            }
          }), _el$48);
          _el$48.addEventListener("scroll", handleScroll);
          var _ref$ = containerRef;
          typeof _ref$ === "function" ? use(_ref$, _el$48) : containerRef = _el$48;
          insert(_el$48, createComponent(Show, {
            get when() {
              return executionLines().length > 0;
            },
            get fallback() {
              return (() => {
                var _el$58 = _tmpl$20();
                insert(_el$58, () => executionMode() === "dry-run" ? "Dry run: server-side validation only. No resources changed." : "Live execution stream. Secrets are masked. Watch for apply progress and outcomes here.");
                return _el$58;
              })();
            },
            get children() {
              return createComponent(For, {
                get each() {
                  return executionLines();
                },
                children: (line) => {
                  const d = new Date(line.timestamp);
                  const hh = String(d.getHours()).padStart(2, "0");
                  const mm = String(d.getMinutes()).padStart(2, "0");
                  const ss = String(d.getSeconds()).padStart(2, "0");
                  return (() => {
                    var _el$59 = _tmpl$21(), _el$60 = _el$59.firstChild, _el$61 = _el$60.firstChild, _el$65 = _el$61.nextSibling, _el$62 = _el$65.nextSibling, _el$66 = _el$62.nextSibling, _el$63 = _el$66.nextSibling, _el$67 = _el$63.nextSibling; _el$67.nextSibling; var _el$68 = _el$60.nextSibling, _el$69 = _el$68.nextSibling;
                    insert(_el$60, hh, _el$65);
                    insert(_el$60, mm, _el$66);
                    insert(_el$60, ss, _el$67);
                    insert(_el$68, () => line.stream === "stderr" ? "ERR" : "OUT");
                    insert(_el$69, () => line.text);
                    createRenderEffect((_p$) => {
                      var _v$9 = line.stream === "stderr" ? "var(--error-color)" : "var(--text-secondary)", _v$0 = line.stream === "stderr" ? "var(--error-color)" : "var(--text-secondary)";
                      _v$9 !== _p$.e && setStyleProperty(_el$59, "color", _p$.e = _v$9);
                      _v$0 !== _p$.t && setStyleProperty(_el$68, "color", _p$.t = _v$0);
                      return _p$;
                    }, {
                      e: void 0,
                      t: void 0
                    });
                    return _el$59;
                  })();
                }
              });
            }
          }));
          insert(_el$34, createComponent(Show, {
            get when() {
              return executionError();
            },
            get children() {
              var _el$49 = _tmpl$17(), _el$50 = _el$49.firstChild, _el$51 = _el$50.firstChild, _el$52 = _el$51.firstChild, _el$53 = _el$52.nextSibling, _el$54 = _el$51.nextSibling, _el$55 = _el$54.firstChild;
              insert(_el$53, executionError);
              _el$55.$$click = () => retryLastExecution();
              insert(_el$54, createComponent(Show, {
                get when() {
                  return executionRawError();
                },
                get children() {
                  var _el$56 = _tmpl$15();
                  _el$56.$$click = () => setShowRawError((prev) => !prev);
                  insert(_el$56, () => showRawError() ? "Hide raw output" : "Show raw output");
                  return _el$56;
                }
              }), null);
              insert(_el$49, createComponent(Show, {
                get when() {
                  return memo(() => !!showRawError())() && executionRawError();
                },
                get children() {
                  var _el$57 = _tmpl$16();
                  insert(_el$57, executionRawError);
                  return _el$57;
                }
              }), null);
              return _el$49;
            }
          }), null);
          return _el$34;
        }
      }), null);
      createRenderEffect((_p$) => {
        var _v$4 = executionPanelExpanded() ? "640px" : "360px", _v$5 = executionMode() === "dry-run" ? "color-mix(in srgb, var(--warning-color) 12%, transparent)" : "color-mix(in srgb, var(--error-color) 12%, transparent)", _v$6 = executionMode() === "dry-run" ? "var(--warning-color)" : "var(--error-color)", _v$7 = executionPanelExpanded() ? "Collapse" : "Expand", _v$8 = executionPanelExpanded() ? "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" : "M3 4h7m0 0V3m0 1L3 11m18 9h-7m0 0v1m0-1l7-7";
        _v$4 !== _p$.e && setStyleProperty(_el$15, "width", _p$.e = _v$4);
        _v$5 !== _p$.t && setStyleProperty(_el$19, "background", _p$.t = _v$5);
        _v$6 !== _p$.a && setStyleProperty(_el$19, "color", _p$.a = _v$6);
        _v$7 !== _p$.o && setAttribute(_el$30, "title", _p$.o = _v$7);
        _v$8 !== _p$.i && setAttribute(_el$32, "d", _p$.i = _v$8);
        return _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0,
        o: void 0,
        i: void 0
      });
      return _el$15;
    }
  });
};
delegateEvents(["click"]);

const scriptRel = 'modulepreload';const assetsURL = function(dep) { return "/"+dep };const seen = {};const __vitePreload = function preload(baseModule, deps, importerUrl) {
  let promise = Promise.resolve();
  if (true && deps && deps.length > 0) {
    document.getElementsByTagName("link");
    const cspNonceMeta = document.querySelector(
      "meta[property=csp-nonce]"
    );
    const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
    promise = Promise.allSettled(
      deps.map((dep) => {
        dep = assetsURL(dep);
        if (dep in seen) return;
        seen[dep] = true;
        const isCss = dep.endsWith(".css");
        const cssSelector = isCss ? '[rel="stylesheet"]' : "";
        if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) {
          return;
        }
        const link = document.createElement("link");
        link.rel = isCss ? "stylesheet" : scriptRel;
        if (!isCss) {
          link.as = "script";
        }
        link.crossOrigin = "";
        link.href = dep;
        if (cspNonce) {
          link.setAttribute("nonce", cspNonce);
        }
        document.head.appendChild(link);
        if (isCss) {
          return new Promise((res, rej) => {
            link.addEventListener("load", res);
            link.addEventListener(
              "error",
              () => rej(new Error(`Unable to preload CSS for ${dep}`))
            );
          });
        }
      })
    );
  }
  function handlePreloadError(err) {
    const e = new Event("vite:preloadError", {
      cancelable: true
    });
    e.payload = err;
    window.dispatchEvent(e);
    if (!e.defaultPrevented) {
      throw err;
    }
  }
  return promise.then((res) => {
    for (const item of res || []) {
      if (item.status !== "rejected") continue;
      handlePreloadError(item.reason);
    }
    return baseModule().catch(handlePreloadError);
  });
};

const Dashboard = lazy(() => __vitePreload(() => import('./Dashboard-8WOzhb4r.js'),true?[]:void 0));
const ClusterOverview = lazy(() => __vitePreload(() => import('./ClusterOverview-DB3zaJvX.js'),true?[]:void 0));
const Pods = lazy(() => __vitePreload(() => import('./Pods-CU_FJW62.js'),true?__vite__mapDeps([0,1,2,3,4,5,6,7,8]):void 0));
const Deployments = lazy(() => __vitePreload(() => import('./Deployments-BPGSvB5Z.js'),true?__vite__mapDeps([9,1,2,3,5,10,6,7,4,11,8]):void 0));
const StatefulSets = lazy(() => __vitePreload(() => import('./StatefulSets-B2JwKsu8.js'),true?__vite__mapDeps([12,13,2,3,5,10,11,8,6,7]):void 0));
const DaemonSets = lazy(() => __vitePreload(() => import('./DaemonSets-DyPisz29.js'),true?__vite__mapDeps([14,13,2,3,5,10,11,8,6,7]):void 0));
const CronJobs = lazy(() => __vitePreload(() => import('./CronJobs-CHeDdW68.js'),true?__vite__mapDeps([15,1,13,2,3,5,6,7]):void 0));
const Jobs = lazy(() => __vitePreload(() => import('./Jobs-CHP3FtV8.js'),true?__vite__mapDeps([16,1,13,2,3,5,10,11,8,6,7]):void 0));
const PDB = lazy(() => __vitePreload(() => import('./PDB-CshyeJ9b.js'),true?__vite__mapDeps([17,1,2,3,5,10,11,8,6,18]):void 0));
const HPA = lazy(() => __vitePreload(() => import('./HPA-DH0OriQq.js'),true?__vite__mapDeps([19,1,2,3,5,10,11,8,6,18]):void 0));
const Services = lazy(() => __vitePreload(() => import('./Services-DzaLwI6q.js'),true?__vite__mapDeps([20,1,13,2,3,4,5,10,6,21,7]):void 0));
const Ingresses = lazy(() => __vitePreload(() => import('./Ingresses-CW3mtysc.js'),true?__vite__mapDeps([22,1,13,2,3,5,10,11,8,6,7]):void 0));
const Namespaces = lazy(() => __vitePreload(() => import('./Namespaces-CDwvXzdI.js'),true?__vite__mapDeps([23,1,13,2,3,5,6,7]):void 0));
const ConfigMaps = lazy(() => __vitePreload(() => import('./ConfigMaps-B9M7GJsW.js'),true?__vite__mapDeps([24,13,1,2,3,4,5,10,11,8,6,7]):void 0));
const Secrets = lazy(() => __vitePreload(() => import('./Secrets-C4y2Zitl.js'),true?__vite__mapDeps([25,13,1,2,3,4,5,10,11,8,6,7]):void 0));
const Certificates = lazy(() => __vitePreload(() => import('./Certificates-HWH3vjDo.js'),true?__vite__mapDeps([26,13,2,3,5,6,27]):void 0));
const Nodes = lazy(() => __vitePreload(() => import('./Nodes-D897WuTj.js'),true?__vite__mapDeps([28,5]):void 0));
const ResourceMap = lazy(() => __vitePreload(() => import('./ResourceMap-DIZUt6FW.js'),true?__vite__mapDeps([29,1,30]):void 0));
const TrafficMapPage = lazy(() => __vitePreload(() => import('./TrafficMapPage-DR7Ahwmw.js'),true?__vite__mapDeps([31,30]):void 0));
const Security = lazy(() => __vitePreload(() => import('./Security-BbBQw-Pa.js'),true?__vite__mapDeps([32,21]):void 0));
const Plugins = lazy(() => __vitePreload(() => import('./Plugins-D3CWEh_H.js'),true?__vite__mapDeps([33,10]):void 0));
const Cost = lazy(() => __vitePreload(() => import('./Cost-BuoEexbb.js'),true?[]:void 0));
const Drift = lazy(() => __vitePreload(() => import('./Drift-Dt9X27bH.js'),true?[]:void 0));
const Events = lazy(() => __vitePreload(() => import('./Events-DDppzn_9.js'),true?[]:void 0));
const MonitoredEvents = lazy(() => __vitePreload(() => import('./MonitoredEvents-CegS_pSJ.js'),true?[]:void 0));
const Connectors = lazy(() => __vitePreload(() => import('./Connectors-B2t5ABJE.js'),true?[]:void 0));
const AIAgents = lazy(() => __vitePreload(() => import('./AIAgents-BfN9XGFt.js'),true?[]:void 0));
const SREAgent = lazy(() => __vitePreload(() => import('./SREAgent-BbLn5Wby.js'),true?[]:void 0));
const Kiali = lazy(() => __vitePreload(() => import('./Kiali-CDwXPu4e.js'),true?[]:void 0));
const MLflow = lazy(() => __vitePreload(() => import('./MLflow-DE3LkriT.js'),true?__vite__mapDeps([34,35]):void 0));
const TrainingJobs = lazy(() => __vitePreload(() => import('./TrainingJobs-CUUD5fG8.js'),true?__vite__mapDeps([36,37]):void 0));
const InferenceServices = lazy(() => __vitePreload(() => import('./InferenceServices-DflYh1p3.js'),true?[]:void 0));
const Feast = lazy(() => __vitePreload(() => import('./Feast-DCGWCa3l.js'),true?__vite__mapDeps([38,39]):void 0));
const GPUDashboard = lazy(() => __vitePreload(() => import('./GPUDashboard-B94EZk_J.js'),true?[]:void 0));
const MLWorkflows = lazy(() => __vitePreload(() => import('./MLWorkflows-Bnk73wgo.js'),true?__vite__mapDeps([40,41]):void 0));
const MultiCluster = lazy(() => __vitePreload(() => import('./MultiCluster-0pL_RLcP.js'),true?[]:void 0));
const KnowledgeBank = lazy(() => __vitePreload(() => import('./KnowledgeBank-DBN_vz2h.js'),true?[]:void 0));
const Logs = lazy(() => __vitePreload(() => import('./Logs-D9vQ8W45.js'),true?[]:void 0));
const Anomalies = lazy(() => __vitePreload(() => import('./Anomalies-BSw3f-dI.js'),true?__vite__mapDeps([42,10,4]):void 0));
const Incidents = lazy(() => __vitePreload(() => import('./Incidents-umPibq7X.js'),true?__vite__mapDeps([43,6]):void 0));
const Continuity = lazy(() => __vitePreload(() => import('./Continuity-CnrL9xBp.js'),true?[]:void 0));
const Timeline = lazy(() => __vitePreload(() => import('./Timeline-Bs3xTurB.js'),true?[]:void 0));
const TimeHelix = lazy(() => __vitePreload(() => import('./TimeHelix-BuiQAaDC.js'),true?[]:void 0));
const ResourceWaterfall = lazy(() => __vitePreload(() => import('./ResourceWaterfall-Cnhb5Q4j.js'),true?[]:void 0));
const Apps = lazy(() => __vitePreload(() => import('./Apps-CaRd_9AS.js'),true?__vite__mapDeps([44,35,39,4,2]):void 0));
const ClusterManager = lazy(() => __vitePreload(() => import('./ClusterManager-DzrvtZtT.js'),true?[]:void 0));
const Storage = lazy(() => __vitePreload(() => import('./Storage-CY5S0IW3.js'),true?__vite__mapDeps([45,2,3,10,11,8,6,13,27,7]):void 0));
const RBAC = lazy(() => __vitePreload(() => import('./RBAC-L4u8A-A_.js'),true?__vite__mapDeps([46,2,3,6]):void 0));
const ServiceAccounts = lazy(() => __vitePreload(() => import('./ServiceAccounts-DQprciAD.js'),true?__vite__mapDeps([47,2,3,6,7]):void 0));
const CustomResources = lazy(() => __vitePreload(() => import('./CustomResources-0FRcFOFQ.js'),true?__vite__mapDeps([48,2,3,6]):void 0));
const NetworkPolicies = lazy(() => __vitePreload(() => import('./NetworkPolicies-h2hqutzP.js'),true?__vite__mapDeps([49,1,13,2,3,5,10,11,8,6,7]):void 0));
const UserManagement = lazy(() => __vitePreload(() => import('./UserManagement-C0SVn2YP.js'),true?[]:void 0));
const Terminal = lazy(() => __vitePreload(() => import('./Terminal-CtQexLlr.js'),true?[]:void 0));
const AutoFix = lazy(() => __vitePreload(() => import('./AutoFix-BYF3gyNC.js'),true?[]:void 0));
const AIAssistant = lazy(() => __vitePreload(() => import('./AIAssistant-CTVw_BZS.js'),true?[]:void 0));
const Settings = lazy(() => __vitePreload(() => import('./Settings-DGQXkjTy.js'),true?[]:void 0));
const Privacy = lazy(() => __vitePreload(() => import('./Privacy-L4yT9MST.js'),true?[]:void 0));
const Documentation = lazy(() => __vitePreload(() => import('./Documentation-XnZXMEQn.js'),true?[]:void 0));
const UIDemo = lazy(() => __vitePreload(() => import('./UIDemo-DneyBTVX.js'),true?[]:void 0));
const Placeholder = lazy(() => __vitePreload(() => import('./Placeholder--r6uK_lq.js'),true?[]:void 0));
const TrainingJobDetails = lazy(() => __vitePreload(() => import('./TrainingJobDetails-BKu-HaS-.js').then(n => n.a),true?[]:void 0));
const Marketplace = () => createComponent(Apps, {});
const CustomApps = () => createComponent(Apps, {});
const DeployApp = () => createComponent(Apps, {});
const Releases = () => createComponent(Placeholder, {
  title: "Releases",
  description: "Manage application releases and track deployment history across your cluster.",
  icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12",
  comingSoon: true,
  features: ["Release history tracking", "Release comparison", "Rollback to previous releases", "Release notes and changelog", "Release approval workflow"]
});
const Rollouts = () => createComponent(Placeholder, {
  title: "Rollouts (Canary / Blue-Green)",
  description: "Advanced deployment strategies including canary and blue-green rollouts for zero-downtime deployments.",
  icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  comingSoon: true,
  features: ["Canary deployments", "Blue-Green deployments", "Traffic splitting", "Automatic rollback on errors", "Progressive delivery", "Integration with Argo Rollouts"]
});
const views = {
  dashboard: Dashboard,
  topology: ClusterOverview,
  monitoredevents: MonitoredEvents,
  incidents: Incidents,
  timeline: Timeline,
  timehelix: TimeHelix,
  resourcewaterfall: ResourceWaterfall,
  anomalies: Anomalies,
  security: Security,
  cost: Cost,
  drift: Drift,
  continuity: Continuity,
  pods: Pods,
  deployments: Deployments,
  statefulsets: StatefulSets,
  daemonsets: DaemonSets,
  jobs: Jobs,
  cronjobs: CronJobs,
  pdb: PDB,
  hpa: HPA,
  services: Services,
  ingresses: Ingresses,
  networkpolicies: NetworkPolicies,
  namespaces: Namespaces,
  configmaps: ConfigMaps,
  secrets: Secrets,
  certificates: Certificates,
  storage: Storage,
  serviceaccounts: ServiceAccounts,
  rbac: RBAC,
  customresources: CustomResources,
  nodes: Nodes,
  usermanagement: UserManagement,
  resourcemap: ResourceMap,
  trafficmap: TrafficMapPage,
  connectors: Connectors,
  plugins: Plugins,
  terminal: Terminal,
  settings: Settings,
  privacy: Privacy,
  documentation: Documentation,
  ai: AIAssistant,
  autofix: AutoFix,
  sreagent: SREAgent,
  aiagents: AIAgents,
  trainingjobs: TrainingJobs,
  trainingjobdetails: TrainingJobDetails,
  inferenceservices: InferenceServices,
  mlworkflows: MLWorkflows,
  mlflow: MLflow,
  feast: Feast,
  gpudashboard: GPUDashboard,
  events: Events,
  logs: Logs,
  apps: Marketplace,
  customapps: CustomApps,
  deployapp: DeployApp,
  clustermanager: ClusterManager,
  kiali: Kiali,
  releases: Releases,
  rollouts: Rollouts,
  uidemo: UIDemo,
  multicluster: MultiCluster,
  knowledgebank: KnowledgeBank
};
const noConnectionViews = /* @__PURE__ */ new Set(["clustermanager", "settings", "logs", "privacy", "documentation", "apps", "plugins"]);

var _tmpl$$c = /* @__PURE__ */ template(`<div class="px-6 py-3 flex items-center gap-3"style="background:rgba(239, 68, 68, 0.1);border-bottom:1px solid rgba(239, 68, 68, 0.2)"><svg class="w-5 h-5 flex-shrink-0"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--error-color)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg><div class="flex-1 min-w-0"><span class=font-medium style=color:var(--error-color)>Cluster not connected</span><span class="text-sm ml-2"style=color:var(--text-muted)>— Connect to a Kubernetes cluster to use KubēGraf</span></div><button class="px-3 py-1.5 rounded text-sm font-medium transition-all hover:opacity-80 flex items-center gap-1.5"style="background:rgba(239, 68, 68, 0.2);color:var(--error-color)"><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>Retry`), _tmpl$2$c = /* @__PURE__ */ template(`<div class="px-4 py-2 flex items-center gap-3"style="background:rgba(6, 182, 212, 0.1);border-bottom:1px solid rgba(6, 182, 212, 0.3);color:var(--accent-primary)"><div class=spinner style=width:16px;height:16px></div><span class="text-sm font-medium">`), _tmpl$3$b = /* @__PURE__ */ template(`<main class="flex-1 overflow-auto p-6 relative">`), _tmpl$4$a = /* @__PURE__ */ template(`<svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15">`), _tmpl$5$a = /* @__PURE__ */ template(`<footer class="header-glass px-6 py-2 border-t flex items-center justify-end text-xs"style=background:var(--bg-secondary);border-color:var(--border-color);color:var(--text-muted);margin-left:0.75rem;margin-right:0.75rem><div class="flex items-center gap-4 w-full justify-end"><button class="p-1.5 rounded hover:bg-bg-hover transition-colors"title="Check for updates"style="color:var(--text-primary);border:1px solid var(--border-color)"></button><span class="flex items-center gap-1"><span></span></span><button class=hover:underline style=color:var(--accent-primary)>Docs</button><button class=hover:underline style=color:var(--accent-primary)>Privacy`), _tmpl$6$7 = /* @__PURE__ */ template(`<div class="fixed bottom-24 right-6 z-50 flex flex-col-reverse gap-3 max-w-md">`), _tmpl$7$5 = /* @__PURE__ */ template(`<div class=p-6 style=background:red;color:white>Error: Component not found for view "<!>"`), _tmpl$8$3 = /* @__PURE__ */ template(`<div class=p-6 style=background:red;color:white>Error rendering <!>: `), _tmpl$9$2 = /* @__PURE__ */ template(`<svg class="w-4 h-4 animate-spin"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15">`), _tmpl$0$2 = /* @__PURE__ */ template(`<div class="flex gap-2 mt-3">`), _tmpl$1$1 = /* @__PURE__ */ template(`<div class="animate-slide-in px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm"><div class="flex items-start gap-2.5"><span class="flex-shrink-0 text-base"></span><div class=flex-1><span class="text-sm break-words leading-relaxed block">`), _tmpl$10$1 = /* @__PURE__ */ template(`<button class="px-3 py-1.5 rounded text-xs font-medium transition-all hover:opacity-90">`);
const AppContent = (props) => {
  const [checkingUpdate, setCheckingUpdate] = createSignal(false);
  const [updateModalOpen, setUpdateModalOpen] = createSignal(false);
  const [updateInfoState, setUpdateInfoState] = createSignal(null);
  const handleFooterUpdateCheck = async () => {
    setCheckingUpdate(true);
    try {
      const info = await api.checkUpdate();
      if (info.updateAvailable) {
        setUpdateInfo(info);
        setUpdateInfoState(info);
        setUpdateModalOpen(true);
      } else {
        addNotification("You're on the latest version 🎉", "success");
      }
    } catch (err) {
      addNotification("Failed to check for updates", "error");
      console.error("Footer update check failed:", err);
    } finally {
      setCheckingUpdate(false);
    }
  };
  return [createComponent(Show, {
    get when() {
      return !props.isConnected();
    },
    get children() {
      var _el$ = _tmpl$$c(), _el$2 = _el$.firstChild, _el$3 = _el$2.nextSibling, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling;
      _el$6.$$click = () => location.reload();
      return _el$;
    }
  }), createComponent(Show, {
    get when() {
      return clusterSwitching();
    },
    get children() {
      var _el$7 = _tmpl$2$c(), _el$8 = _el$7.firstChild, _el$9 = _el$8.nextSibling;
      insert(_el$9, clusterSwitchMessage);
      return _el$7;
    }
  }), (() => {
    var _el$0 = _tmpl$3$b();
    insert(_el$0, createComponent(Show, {
      get when() {
        return props.isConnected() || noConnectionViews.has(currentView());
      },
      get children() {
        return (() => {
          const view = currentView();
          const Component2 = views[view];
          if (!Component2) {
            console.error("[App] Component not found for view:", view);
            return (() => {
              var _el$18 = _tmpl$7$5(), _el$19 = _el$18.firstChild, _el$21 = _el$19.nextSibling; _el$21.nextSibling;
              insert(_el$18, view, _el$21);
              return _el$18;
            })();
          }
          try {
            return createComponent(Dynamic, {
              component: Component2
            });
          } catch (error) {
            console.error("[App] Error rendering component:", error);
            return (() => {
              var _el$22 = _tmpl$8$3(), _el$23 = _el$22.firstChild, _el$25 = _el$23.nextSibling; _el$25.nextSibling;
              insert(_el$22, view, _el$25);
              insert(_el$22, () => String(error), null);
              return _el$22;
            })();
          }
        })();
      }
    }), null);
    insert(_el$0, createComponent(Show, {
      get when() {
        return memo(() => !!(!props.isConnected() && currentView() !== "clustermanager" && currentView() !== "settings" && currentView() !== "logs"))() && currentView() !== "apps";
      },
      get children() {
        return createComponent(ConnectionOverlay, {
          get connectionStatus() {
            return props.connectionStatus;
          },
          get refetchStatus() {
            return props.refetchStatus;
          }
        });
      }
    }), null);
    return _el$0;
  })(), (() => {
    var _el$1 = _tmpl$5$a(), _el$10 = _el$1.firstChild, _el$11 = _el$10.firstChild, _el$13 = _el$11.nextSibling, _el$14 = _el$13.firstChild, _el$15 = _el$13.nextSibling, _el$16 = _el$15.nextSibling;
    insert(_el$10, createComponent(NotificationCenter, {}), _el$11);
    _el$11.$$click = handleFooterUpdateCheck;
    insert(_el$11, createComponent(Show, {
      get when() {
        return !checkingUpdate();
      },
      get fallback() {
        return _tmpl$9$2();
      },
      get children() {
        return _tmpl$4$a();
      }
    }));
    insert(_el$13, () => props.connectionStatus()?.connected ? "Connected" : "Disconnected", null);
    _el$15.$$click = () => setCurrentView("documentation");
    _el$16.$$click = () => setCurrentView("privacy");
    createRenderEffect((_p$) => {
      var _v$ = checkingUpdate(), _v$2 = checkingUpdate() ? 0.7 : 1, _v$3 = `w-2 h-2 rounded-full ${props.connectionStatus()?.connected ? "bg-green-500" : "bg-red-500"}`;
      _v$ !== _p$.e && (_el$11.disabled = _p$.e = _v$);
      _v$2 !== _p$.t && setStyleProperty(_el$11, "opacity", _p$.t = _v$2);
      _v$3 !== _p$.a && className(_el$14, _p$.a = _v$3);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0
    });
    return _el$1;
  })(), createComponent(Show, {
    get when() {
      return memo(() => !!updateModalOpen())() && updateInfoState();
    },
    get children() {
      return createComponent(UpdateModal, {
        get isOpen() {
          return updateModalOpen();
        },
        onClose: () => setUpdateModalOpen(false),
        get updateInfo() {
          return updateInfoState();
        }
      });
    }
  }), (() => {
    var _el$17 = _tmpl$6$7();
    insert(_el$17, createComponent(For, {
      get each() {
        return notifications();
      },
      children: (notification) => (() => {
        var _el$27 = _tmpl$1$1(), _el$28 = _el$27.firstChild, _el$29 = _el$28.firstChild, _el$30 = _el$29.nextSibling, _el$31 = _el$30.firstChild;
        insert(_el$29, (() => {
          var _c$ = memo(() => notification.type === "error");
          return () => _c$() ? "❌" : memo(() => notification.type === "warning")() ? "⚠️" : memo(() => notification.type === "success")() ? "✓" : notification.type === "update" ? "🚀" : "ℹ️";
        })());
        insert(_el$31, () => notification.message);
        insert(_el$30, createComponent(Show, {
          get when() {
            return memo(() => !!notification.actions)() && notification.actions.length > 0;
          },
          get children() {
            var _el$32 = _tmpl$0$2();
            insert(_el$32, createComponent(For, {
              get each() {
                return notification.actions;
              },
              children: (action) => (() => {
                var _el$33 = _tmpl$10$1();
                _el$33.$$click = (e) => {
                  e.stopPropagation();
                  action.onClick();
                };
                insert(_el$33, () => action.label);
                createRenderEffect((_p$) => {
                  var _v$8 = action.variant === "primary" ? "#fff" : "rgba(255, 255, 255, 0.2)", _v$9 = action.variant === "primary" ? notification.type === "update" ? "#6366f1" : "#000" : "#fff", _v$0 = action.variant === "secondary" ? "1px solid rgba(255, 255, 255, 0.3)" : "none";
                  _v$8 !== _p$.e && setStyleProperty(_el$33, "background", _p$.e = _v$8);
                  _v$9 !== _p$.t && setStyleProperty(_el$33, "color", _p$.t = _v$9);
                  _v$0 !== _p$.a && setStyleProperty(_el$33, "border", _p$.a = _v$0);
                  return _p$;
                }, {
                  e: void 0,
                  t: void 0,
                  a: void 0
                });
                return _el$33;
              })()
            }));
            return _el$32;
          }
        }), null);
        createRenderEffect((_p$) => {
          var _v$4 = notification.type === "error" ? "rgba(239, 68, 68, 0.95)" : notification.type === "warning" ? "rgba(245, 158, 11, 0.95)" : notification.type === "success" ? "rgba(34, 197, 94, 0.95)" : notification.type === "update" ? "rgba(99, 102, 241, 0.95)" : "rgba(6, 182, 212, 0.95)", _v$5 = notification.type === "error" ? "rgba(239, 68, 68, 0.5)" : notification.type === "warning" ? "rgba(245, 158, 11, 0.5)" : notification.type === "success" ? "rgba(34, 197, 94, 0.5)" : notification.type === "update" ? "rgba(99, 102, 241, 0.5)" : "rgba(6, 182, 212, 0.5)", _v$6 = notification.type === "error" ? "#fff" : notification.type === "warning" ? "#000" : notification.type === "success" ? "#fff" : notification.type === "update" ? "#fff" : "#000", _v$7 = notification.type === "update" ? "320px" : "auto";
          _v$4 !== _p$.e && setStyleProperty(_el$27, "background", _p$.e = _v$4);
          _v$5 !== _p$.t && setStyleProperty(_el$27, "border-color", _p$.t = _v$5);
          _v$6 !== _p$.a && setStyleProperty(_el$27, "color", _p$.a = _v$6);
          _v$7 !== _p$.o && setStyleProperty(_el$27, "min-width", _p$.o = _v$7);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0,
          o: void 0
        });
        return _el$27;
      })()
    }));
    return _el$17;
  })(), createComponent(DeploymentProgress, {}), createComponent(DockedTerminal, {
    get isOpen() {
      return terminalOpen();
    },
    onClose: () => setTerminalOpen(false)
  }), createComponent(ExecutionPanel, {})];
};
delegateEvents(["click"]);

// src/subscribable.ts
var Subscribable = class {
  constructor() {
    this.listeners = /* @__PURE__ */ new Set();
    this.subscribe = this.subscribe.bind(this);
  }
  subscribe(listener) {
    this.listeners.add(listener);
    this.onSubscribe();
    return () => {
      this.listeners.delete(listener);
      this.onUnsubscribe();
    };
  }
  hasListeners() {
    return this.listeners.size > 0;
  }
  onSubscribe() {
  }
  onUnsubscribe() {
  }
};

var defaultTimeoutProvider = {
  // We need the wrapper function syntax below instead of direct references to
  // global setTimeout etc.
  //
  // BAD: `setTimeout: setTimeout`
  // GOOD: `setTimeout: (cb, delay) => setTimeout(cb, delay)`
  //
  // If we use direct references here, then anything that wants to spy on or
  // replace the global setTimeout (like tests) won't work since we'll already
  // have a hard reference to the original implementation at the time when this
  // file was imported.
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  clearTimeout: (timeoutId) => clearTimeout(timeoutId),
  setInterval: (callback, delay) => setInterval(callback, delay),
  clearInterval: (intervalId) => clearInterval(intervalId)
};
var TimeoutManager = class {
  // We cannot have TimeoutManager<T> as we must instantiate it with a concrete
  // type at app boot; and if we leave that type, then any new timer provider
  // would need to support ReturnType<typeof setTimeout>, which is infeasible.
  //
  // We settle for type safety for the TimeoutProvider type, and accept that
  // this class is unsafe internally to allow for extension.
  #provider = defaultTimeoutProvider;
  #providerCalled = false;
  setTimeoutProvider(provider) {
    this.#provider = provider;
  }
  setTimeout(callback, delay) {
    return this.#provider.setTimeout(callback, delay);
  }
  clearTimeout(timeoutId) {
    this.#provider.clearTimeout(timeoutId);
  }
  setInterval(callback, delay) {
    return this.#provider.setInterval(callback, delay);
  }
  clearInterval(intervalId) {
    this.#provider.clearInterval(intervalId);
  }
};
var timeoutManager = new TimeoutManager();
function systemSetTimeoutZero(callback) {
  setTimeout(callback, 0);
}

var isServer = typeof window === "undefined" || "Deno" in globalThis;
function noop() {
}
function functionalUpdate(updater, input) {
  return typeof updater === "function" ? updater(input) : updater;
}
function isValidTimeout(value) {
  return typeof value === "number" && value >= 0 && value !== Infinity;
}
function timeUntilStale(updatedAt, staleTime) {
  return Math.max(updatedAt + (staleTime || 0) - Date.now(), 0);
}
function resolveStaleTime(staleTime, query) {
  return typeof staleTime === "function" ? staleTime(query) : staleTime;
}
function resolveEnabled(enabled, query) {
  return typeof enabled === "function" ? enabled(query) : enabled;
}
function matchQuery(filters, query) {
  const {
    type = "all",
    exact,
    fetchStatus,
    predicate,
    queryKey,
    stale
  } = filters;
  if (queryKey) {
    if (exact) {
      if (query.queryHash !== hashQueryKeyByOptions(queryKey, query.options)) {
        return false;
      }
    } else if (!partialMatchKey(query.queryKey, queryKey)) {
      return false;
    }
  }
  if (type !== "all") {
    const isActive = query.isActive();
    if (type === "active" && !isActive) {
      return false;
    }
    if (type === "inactive" && isActive) {
      return false;
    }
  }
  if (typeof stale === "boolean" && query.isStale() !== stale) {
    return false;
  }
  if (fetchStatus && fetchStatus !== query.state.fetchStatus) {
    return false;
  }
  if (predicate && !predicate(query)) {
    return false;
  }
  return true;
}
function matchMutation(filters, mutation) {
  const { exact, status, predicate, mutationKey } = filters;
  if (mutationKey) {
    if (!mutation.options.mutationKey) {
      return false;
    }
    if (exact) {
      if (hashKey(mutation.options.mutationKey) !== hashKey(mutationKey)) {
        return false;
      }
    } else if (!partialMatchKey(mutation.options.mutationKey, mutationKey)) {
      return false;
    }
  }
  if (status && mutation.state.status !== status) {
    return false;
  }
  if (predicate && !predicate(mutation)) {
    return false;
  }
  return true;
}
function hashQueryKeyByOptions(queryKey, options) {
  const hashFn = options?.queryKeyHashFn || hashKey;
  return hashFn(queryKey);
}
function hashKey(queryKey) {
  return JSON.stringify(
    queryKey,
    (_, val) => isPlainObject(val) ? Object.keys(val).sort().reduce((result, key) => {
      result[key] = val[key];
      return result;
    }, {}) : val
  );
}
function partialMatchKey(a, b) {
  if (a === b) {
    return true;
  }
  if (typeof a !== typeof b) {
    return false;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    return Object.keys(b).every((key) => partialMatchKey(a[key], b[key]));
  }
  return false;
}
var hasOwn = Object.prototype.hasOwnProperty;
function replaceEqualDeep(a, b) {
  if (a === b) {
    return a;
  }
  const array = isPlainArray(a) && isPlainArray(b);
  if (!array && !(isPlainObject(a) && isPlainObject(b))) return b;
  const aItems = array ? a : Object.keys(a);
  const aSize = aItems.length;
  const bItems = array ? b : Object.keys(b);
  const bSize = bItems.length;
  const copy = array ? new Array(bSize) : {};
  let equalItems = 0;
  for (let i = 0; i < bSize; i++) {
    const key = array ? i : bItems[i];
    const aItem = a[key];
    const bItem = b[key];
    if (aItem === bItem) {
      copy[key] = aItem;
      if (array ? i < aSize : hasOwn.call(a, key)) equalItems++;
      continue;
    }
    if (aItem === null || bItem === null || typeof aItem !== "object" || typeof bItem !== "object") {
      copy[key] = bItem;
      continue;
    }
    const v = replaceEqualDeep(aItem, bItem);
    copy[key] = v;
    if (v === aItem) equalItems++;
  }
  return aSize === bSize && equalItems === aSize ? a : copy;
}
function isPlainArray(value) {
  return Array.isArray(value) && value.length === Object.keys(value).length;
}
function isPlainObject(o) {
  if (!hasObjectPrototype(o)) {
    return false;
  }
  const ctor = o.constructor;
  if (ctor === void 0) {
    return true;
  }
  const prot = ctor.prototype;
  if (!hasObjectPrototype(prot)) {
    return false;
  }
  if (!prot.hasOwnProperty("isPrototypeOf")) {
    return false;
  }
  if (Object.getPrototypeOf(o) !== Object.prototype) {
    return false;
  }
  return true;
}
function hasObjectPrototype(o) {
  return Object.prototype.toString.call(o) === "[object Object]";
}
function sleep(timeout) {
  return new Promise((resolve) => {
    timeoutManager.setTimeout(resolve, timeout);
  });
}
function replaceData(prevData, data, options) {
  if (typeof options.structuralSharing === "function") {
    return options.structuralSharing(prevData, data);
  } else if (options.structuralSharing !== false) {
    return replaceEqualDeep(prevData, data);
  }
  return data;
}
function addToEnd(items, item, max = 0) {
  const newItems = [...items, item];
  return max && newItems.length > max ? newItems.slice(1) : newItems;
}
function addToStart(items, item, max = 0) {
  const newItems = [item, ...items];
  return max && newItems.length > max ? newItems.slice(0, -1) : newItems;
}
var skipToken = Symbol();
function ensureQueryFn(options, fetchOptions) {
  if (!options.queryFn && fetchOptions?.initialPromise) {
    return () => fetchOptions.initialPromise;
  }
  if (!options.queryFn || options.queryFn === skipToken) {
    return () => Promise.reject(new Error(`Missing queryFn: '${options.queryHash}'`));
  }
  return options.queryFn;
}

// src/focusManager.ts
var FocusManager = class extends Subscribable {
  #focused;
  #cleanup;
  #setup;
  constructor() {
    super();
    this.#setup = (onFocus) => {
      if (!isServer && window.addEventListener) {
        const listener = () => onFocus();
        window.addEventListener("visibilitychange", listener, false);
        return () => {
          window.removeEventListener("visibilitychange", listener);
        };
      }
      return;
    };
  }
  onSubscribe() {
    if (!this.#cleanup) {
      this.setEventListener(this.#setup);
    }
  }
  onUnsubscribe() {
    if (!this.hasListeners()) {
      this.#cleanup?.();
      this.#cleanup = void 0;
    }
  }
  setEventListener(setup) {
    this.#setup = setup;
    this.#cleanup?.();
    this.#cleanup = setup((focused) => {
      if (typeof focused === "boolean") {
        this.setFocused(focused);
      } else {
        this.onFocus();
      }
    });
  }
  setFocused(focused) {
    const changed = this.#focused !== focused;
    if (changed) {
      this.#focused = focused;
      this.onFocus();
    }
  }
  onFocus() {
    const isFocused = this.isFocused();
    this.listeners.forEach((listener) => {
      listener(isFocused);
    });
  }
  isFocused() {
    if (typeof this.#focused === "boolean") {
      return this.#focused;
    }
    return globalThis.document?.visibilityState !== "hidden";
  }
};
var focusManager = new FocusManager();

// src/thenable.ts
function pendingThenable() {
  let resolve;
  let reject;
  const thenable = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  thenable.status = "pending";
  thenable.catch(() => {
  });
  function finalize(data) {
    Object.assign(thenable, data);
    delete thenable.resolve;
    delete thenable.reject;
  }
  thenable.resolve = (value) => {
    finalize({
      status: "fulfilled",
      value
    });
    resolve(value);
  };
  thenable.reject = (reason) => {
    finalize({
      status: "rejected",
      reason
    });
    reject(reason);
  };
  return thenable;
}

// src/notifyManager.ts
var defaultScheduler = systemSetTimeoutZero;
function createNotifyManager() {
  let queue = [];
  let transactions = 0;
  let notifyFn = (callback) => {
    callback();
  };
  let batchNotifyFn = (callback) => {
    callback();
  };
  let scheduleFn = defaultScheduler;
  const schedule = (callback) => {
    if (transactions) {
      queue.push(callback);
    } else {
      scheduleFn(() => {
        notifyFn(callback);
      });
    }
  };
  const flush = () => {
    const originalQueue = queue;
    queue = [];
    if (originalQueue.length) {
      scheduleFn(() => {
        batchNotifyFn(() => {
          originalQueue.forEach((callback) => {
            notifyFn(callback);
          });
        });
      });
    }
  };
  return {
    batch: (callback) => {
      let result;
      transactions++;
      try {
        result = callback();
      } finally {
        transactions--;
        if (!transactions) {
          flush();
        }
      }
      return result;
    },
    /**
     * All calls to the wrapped function will be batched.
     */
    batchCalls: (callback) => {
      return (...args) => {
        schedule(() => {
          callback(...args);
        });
      };
    },
    schedule,
    /**
     * Use this method to set a custom notify function.
     * This can be used to for example wrap notifications with `React.act` while running tests.
     */
    setNotifyFunction: (fn) => {
      notifyFn = fn;
    },
    /**
     * Use this method to set a custom function to batch notifications together into a single tick.
     * By default React Query will use the batch function provided by ReactDOM or React Native.
     */
    setBatchNotifyFunction: (fn) => {
      batchNotifyFn = fn;
    },
    setScheduler: (fn) => {
      scheduleFn = fn;
    }
  };
}
var notifyManager = createNotifyManager();

// src/onlineManager.ts
var OnlineManager = class extends Subscribable {
  #online = true;
  #cleanup;
  #setup;
  constructor() {
    super();
    this.#setup = (onOnline) => {
      if (!isServer && window.addEventListener) {
        const onlineListener = () => onOnline(true);
        const offlineListener = () => onOnline(false);
        window.addEventListener("online", onlineListener, false);
        window.addEventListener("offline", offlineListener, false);
        return () => {
          window.removeEventListener("online", onlineListener);
          window.removeEventListener("offline", offlineListener);
        };
      }
      return;
    };
  }
  onSubscribe() {
    if (!this.#cleanup) {
      this.setEventListener(this.#setup);
    }
  }
  onUnsubscribe() {
    if (!this.hasListeners()) {
      this.#cleanup?.();
      this.#cleanup = void 0;
    }
  }
  setEventListener(setup) {
    this.#setup = setup;
    this.#cleanup?.();
    this.#cleanup = setup(this.setOnline.bind(this));
  }
  setOnline(online) {
    const changed = this.#online !== online;
    if (changed) {
      this.#online = online;
      this.listeners.forEach((listener) => {
        listener(online);
      });
    }
  }
  isOnline() {
    return this.#online;
  }
};
var onlineManager = new OnlineManager();

// src/retryer.ts
function defaultRetryDelay(failureCount) {
  return Math.min(1e3 * 2 ** failureCount, 3e4);
}
function canFetch(networkMode) {
  return (networkMode ?? "online") === "online" ? onlineManager.isOnline() : true;
}
var CancelledError = class extends Error {
  constructor(options) {
    super("CancelledError");
    this.revert = options?.revert;
    this.silent = options?.silent;
  }
};
function createRetryer(config) {
  let isRetryCancelled = false;
  let failureCount = 0;
  let continueFn;
  const thenable = pendingThenable();
  const isResolved = () => thenable.status !== "pending";
  const cancel = (cancelOptions) => {
    if (!isResolved()) {
      const error = new CancelledError(cancelOptions);
      reject(error);
      config.onCancel?.(error);
    }
  };
  const cancelRetry = () => {
    isRetryCancelled = true;
  };
  const continueRetry = () => {
    isRetryCancelled = false;
  };
  const canContinue = () => focusManager.isFocused() && (config.networkMode === "always" || onlineManager.isOnline()) && config.canRun();
  const canStart = () => canFetch(config.networkMode) && config.canRun();
  const resolve = (value) => {
    if (!isResolved()) {
      continueFn?.();
      thenable.resolve(value);
    }
  };
  const reject = (value) => {
    if (!isResolved()) {
      continueFn?.();
      thenable.reject(value);
    }
  };
  const pause = () => {
    return new Promise((continueResolve) => {
      continueFn = (value) => {
        if (isResolved() || canContinue()) {
          continueResolve(value);
        }
      };
      config.onPause?.();
    }).then(() => {
      continueFn = void 0;
      if (!isResolved()) {
        config.onContinue?.();
      }
    });
  };
  const run = () => {
    if (isResolved()) {
      return;
    }
    let promiseOrValue;
    const initialPromise = failureCount === 0 ? config.initialPromise : void 0;
    try {
      promiseOrValue = initialPromise ?? config.fn();
    } catch (error) {
      promiseOrValue = Promise.reject(error);
    }
    Promise.resolve(promiseOrValue).then(resolve).catch((error) => {
      if (isResolved()) {
        return;
      }
      const retry = config.retry ?? (isServer ? 0 : 3);
      const retryDelay = config.retryDelay ?? defaultRetryDelay;
      const delay = typeof retryDelay === "function" ? retryDelay(failureCount, error) : retryDelay;
      const shouldRetry = retry === true || typeof retry === "number" && failureCount < retry || typeof retry === "function" && retry(failureCount, error);
      if (isRetryCancelled || !shouldRetry) {
        reject(error);
        return;
      }
      failureCount++;
      config.onFail?.(failureCount, error);
      sleep(delay).then(() => {
        return canContinue() ? void 0 : pause();
      }).then(() => {
        if (isRetryCancelled) {
          reject(error);
        } else {
          run();
        }
      });
    });
  };
  return {
    promise: thenable,
    status: () => thenable.status,
    cancel,
    continue: () => {
      continueFn?.();
      return thenable;
    },
    cancelRetry,
    continueRetry,
    canStart,
    start: () => {
      if (canStart()) {
        run();
      } else {
        pause().then(run);
      }
      return thenable;
    }
  };
}

// src/removable.ts
var Removable = class {
  #gcTimeout;
  destroy() {
    this.clearGcTimeout();
  }
  scheduleGc() {
    this.clearGcTimeout();
    if (isValidTimeout(this.gcTime)) {
      this.#gcTimeout = timeoutManager.setTimeout(() => {
        this.optionalRemove();
      }, this.gcTime);
    }
  }
  updateGcTime(newGcTime) {
    this.gcTime = Math.max(
      this.gcTime || 0,
      newGcTime ?? (isServer ? Infinity : 5 * 60 * 1e3)
    );
  }
  clearGcTimeout() {
    if (this.#gcTimeout) {
      timeoutManager.clearTimeout(this.#gcTimeout);
      this.#gcTimeout = void 0;
    }
  }
};

var Query = class extends Removable {
  #initialState;
  #revertState;
  #cache;
  #client;
  #retryer;
  #defaultOptions;
  #abortSignalConsumed;
  constructor(config) {
    super();
    this.#abortSignalConsumed = false;
    this.#defaultOptions = config.defaultOptions;
    this.setOptions(config.options);
    this.observers = [];
    this.#client = config.client;
    this.#cache = this.#client.getQueryCache();
    this.queryKey = config.queryKey;
    this.queryHash = config.queryHash;
    this.#initialState = getDefaultState$1(this.options);
    this.state = config.state ?? this.#initialState;
    this.scheduleGc();
  }
  get meta() {
    return this.options.meta;
  }
  get promise() {
    return this.#retryer?.promise;
  }
  setOptions(options) {
    this.options = { ...this.#defaultOptions, ...options };
    this.updateGcTime(this.options.gcTime);
    if (this.state && this.state.data === void 0) {
      const defaultState = getDefaultState$1(this.options);
      if (defaultState.data !== void 0) {
        this.setState(
          successState(defaultState.data, defaultState.dataUpdatedAt)
        );
        this.#initialState = defaultState;
      }
    }
  }
  optionalRemove() {
    if (!this.observers.length && this.state.fetchStatus === "idle") {
      this.#cache.remove(this);
    }
  }
  setData(newData, options) {
    const data = replaceData(this.state.data, newData, this.options);
    this.#dispatch({
      data,
      type: "success",
      dataUpdatedAt: options?.updatedAt,
      manual: options?.manual
    });
    return data;
  }
  setState(state, setStateOptions) {
    this.#dispatch({ type: "setState", state, setStateOptions });
  }
  cancel(options) {
    const promise = this.#retryer?.promise;
    this.#retryer?.cancel(options);
    return promise ? promise.then(noop).catch(noop) : Promise.resolve();
  }
  destroy() {
    super.destroy();
    this.cancel({ silent: true });
  }
  reset() {
    this.destroy();
    this.setState(this.#initialState);
  }
  isActive() {
    return this.observers.some(
      (observer) => resolveEnabled(observer.options.enabled, this) !== false
    );
  }
  isDisabled() {
    if (this.getObserversCount() > 0) {
      return !this.isActive();
    }
    return this.options.queryFn === skipToken || this.state.dataUpdateCount + this.state.errorUpdateCount === 0;
  }
  isStatic() {
    if (this.getObserversCount() > 0) {
      return this.observers.some(
        (observer) => resolveStaleTime(observer.options.staleTime, this) === "static"
      );
    }
    return false;
  }
  isStale() {
    if (this.getObserversCount() > 0) {
      return this.observers.some(
        (observer) => observer.getCurrentResult().isStale
      );
    }
    return this.state.data === void 0 || this.state.isInvalidated;
  }
  isStaleByTime(staleTime = 0) {
    if (this.state.data === void 0) {
      return true;
    }
    if (staleTime === "static") {
      return false;
    }
    if (this.state.isInvalidated) {
      return true;
    }
    return !timeUntilStale(this.state.dataUpdatedAt, staleTime);
  }
  onFocus() {
    const observer = this.observers.find((x) => x.shouldFetchOnWindowFocus());
    observer?.refetch({ cancelRefetch: false });
    this.#retryer?.continue();
  }
  onOnline() {
    const observer = this.observers.find((x) => x.shouldFetchOnReconnect());
    observer?.refetch({ cancelRefetch: false });
    this.#retryer?.continue();
  }
  addObserver(observer) {
    if (!this.observers.includes(observer)) {
      this.observers.push(observer);
      this.clearGcTimeout();
      this.#cache.notify({ type: "observerAdded", query: this, observer });
    }
  }
  removeObserver(observer) {
    if (this.observers.includes(observer)) {
      this.observers = this.observers.filter((x) => x !== observer);
      if (!this.observers.length) {
        if (this.#retryer) {
          if (this.#abortSignalConsumed) {
            this.#retryer.cancel({ revert: true });
          } else {
            this.#retryer.cancelRetry();
          }
        }
        this.scheduleGc();
      }
      this.#cache.notify({ type: "observerRemoved", query: this, observer });
    }
  }
  getObserversCount() {
    return this.observers.length;
  }
  invalidate() {
    if (!this.state.isInvalidated) {
      this.#dispatch({ type: "invalidate" });
    }
  }
  async fetch(options, fetchOptions) {
    if (this.state.fetchStatus !== "idle" && // If the promise in the retyer is already rejected, we have to definitely
    // re-start the fetch; there is a chance that the query is still in a
    // pending state when that happens
    this.#retryer?.status() !== "rejected") {
      if (this.state.data !== void 0 && fetchOptions?.cancelRefetch) {
        this.cancel({ silent: true });
      } else if (this.#retryer) {
        this.#retryer.continueRetry();
        return this.#retryer.promise;
      }
    }
    if (options) {
      this.setOptions(options);
    }
    if (!this.options.queryFn) {
      const observer = this.observers.find((x) => x.options.queryFn);
      if (observer) {
        this.setOptions(observer.options);
      }
    }
    const abortController = new AbortController();
    const addSignalProperty = (object) => {
      Object.defineProperty(object, "signal", {
        enumerable: true,
        get: () => {
          this.#abortSignalConsumed = true;
          return abortController.signal;
        }
      });
    };
    const fetchFn = () => {
      const queryFn = ensureQueryFn(this.options, fetchOptions);
      const createQueryFnContext = () => {
        const queryFnContext2 = {
          client: this.#client,
          queryKey: this.queryKey,
          meta: this.meta
        };
        addSignalProperty(queryFnContext2);
        return queryFnContext2;
      };
      const queryFnContext = createQueryFnContext();
      this.#abortSignalConsumed = false;
      if (this.options.persister) {
        return this.options.persister(
          queryFn,
          queryFnContext,
          this
        );
      }
      return queryFn(queryFnContext);
    };
    const createFetchContext = () => {
      const context2 = {
        fetchOptions,
        options: this.options,
        queryKey: this.queryKey,
        client: this.#client,
        state: this.state,
        fetchFn
      };
      addSignalProperty(context2);
      return context2;
    };
    const context = createFetchContext();
    this.options.behavior?.onFetch(context, this);
    this.#revertState = this.state;
    if (this.state.fetchStatus === "idle" || this.state.fetchMeta !== context.fetchOptions?.meta) {
      this.#dispatch({ type: "fetch", meta: context.fetchOptions?.meta });
    }
    this.#retryer = createRetryer({
      initialPromise: fetchOptions?.initialPromise,
      fn: context.fetchFn,
      onCancel: (error) => {
        if (error instanceof CancelledError && error.revert) {
          this.setState({
            ...this.#revertState,
            fetchStatus: "idle"
          });
        }
        abortController.abort();
      },
      onFail: (failureCount, error) => {
        this.#dispatch({ type: "failed", failureCount, error });
      },
      onPause: () => {
        this.#dispatch({ type: "pause" });
      },
      onContinue: () => {
        this.#dispatch({ type: "continue" });
      },
      retry: context.options.retry,
      retryDelay: context.options.retryDelay,
      networkMode: context.options.networkMode,
      canRun: () => true
    });
    try {
      const data = await this.#retryer.start();
      if (data === void 0) {
        if (false) ;
        throw new Error(`${this.queryHash} data is undefined`);
      }
      this.setData(data);
      this.#cache.config.onSuccess?.(data, this);
      this.#cache.config.onSettled?.(
        data,
        this.state.error,
        this
      );
      return data;
    } catch (error) {
      if (error instanceof CancelledError) {
        if (error.silent) {
          return this.#retryer.promise;
        } else if (error.revert) {
          if (this.state.data === void 0) {
            throw error;
          }
          return this.state.data;
        }
      }
      this.#dispatch({
        type: "error",
        error
      });
      this.#cache.config.onError?.(
        error,
        this
      );
      this.#cache.config.onSettled?.(
        this.state.data,
        error,
        this
      );
      throw error;
    } finally {
      this.scheduleGc();
    }
  }
  #dispatch(action) {
    const reducer = (state) => {
      switch (action.type) {
        case "failed":
          return {
            ...state,
            fetchFailureCount: action.failureCount,
            fetchFailureReason: action.error
          };
        case "pause":
          return {
            ...state,
            fetchStatus: "paused"
          };
        case "continue":
          return {
            ...state,
            fetchStatus: "fetching"
          };
        case "fetch":
          return {
            ...state,
            ...fetchState(state.data, this.options),
            fetchMeta: action.meta ?? null
          };
        case "success":
          const newState = {
            ...state,
            ...successState(action.data, action.dataUpdatedAt),
            dataUpdateCount: state.dataUpdateCount + 1,
            ...!action.manual && {
              fetchStatus: "idle",
              fetchFailureCount: 0,
              fetchFailureReason: null
            }
          };
          this.#revertState = action.manual ? newState : void 0;
          return newState;
        case "error":
          const error = action.error;
          return {
            ...state,
            error,
            errorUpdateCount: state.errorUpdateCount + 1,
            errorUpdatedAt: Date.now(),
            fetchFailureCount: state.fetchFailureCount + 1,
            fetchFailureReason: error,
            fetchStatus: "idle",
            status: "error"
          };
        case "invalidate":
          return {
            ...state,
            isInvalidated: true
          };
        case "setState":
          return {
            ...state,
            ...action.state
          };
      }
    };
    this.state = reducer(this.state);
    notifyManager.batch(() => {
      this.observers.forEach((observer) => {
        observer.onQueryUpdate();
      });
      this.#cache.notify({ query: this, type: "updated", action });
    });
  }
};
function fetchState(data, options) {
  return {
    fetchFailureCount: 0,
    fetchFailureReason: null,
    fetchStatus: canFetch(options.networkMode) ? "fetching" : "paused",
    ...data === void 0 && {
      error: null,
      status: "pending"
    }
  };
}
function successState(data, dataUpdatedAt) {
  return {
    data,
    dataUpdatedAt: dataUpdatedAt ?? Date.now(),
    error: null,
    isInvalidated: false,
    status: "success"
  };
}
function getDefaultState$1(options) {
  const data = typeof options.initialData === "function" ? options.initialData() : options.initialData;
  const hasData = data !== void 0;
  const initialDataUpdatedAt = hasData ? typeof options.initialDataUpdatedAt === "function" ? options.initialDataUpdatedAt() : options.initialDataUpdatedAt : 0;
  return {
    data,
    dataUpdateCount: 0,
    dataUpdatedAt: hasData ? initialDataUpdatedAt ?? Date.now() : 0,
    error: null,
    errorUpdateCount: 0,
    errorUpdatedAt: 0,
    fetchFailureCount: 0,
    fetchFailureReason: null,
    fetchMeta: null,
    isInvalidated: false,
    status: hasData ? "success" : "pending",
    fetchStatus: "idle"
  };
}

// src/infiniteQueryBehavior.ts
function infiniteQueryBehavior(pages) {
  return {
    onFetch: (context, query) => {
      const options = context.options;
      const direction = context.fetchOptions?.meta?.fetchMore?.direction;
      const oldPages = context.state.data?.pages || [];
      const oldPageParams = context.state.data?.pageParams || [];
      let result = { pages: [], pageParams: [] };
      let currentPage = 0;
      const fetchFn = async () => {
        let cancelled = false;
        const addSignalProperty = (object) => {
          Object.defineProperty(object, "signal", {
            enumerable: true,
            get: () => {
              if (context.signal.aborted) {
                cancelled = true;
              } else {
                context.signal.addEventListener("abort", () => {
                  cancelled = true;
                });
              }
              return context.signal;
            }
          });
        };
        const queryFn = ensureQueryFn(context.options, context.fetchOptions);
        const fetchPage = async (data, param, previous) => {
          if (cancelled) {
            return Promise.reject();
          }
          if (param == null && data.pages.length) {
            return Promise.resolve(data);
          }
          const createQueryFnContext = () => {
            const queryFnContext2 = {
              client: context.client,
              queryKey: context.queryKey,
              pageParam: param,
              direction: previous ? "backward" : "forward",
              meta: context.options.meta
            };
            addSignalProperty(queryFnContext2);
            return queryFnContext2;
          };
          const queryFnContext = createQueryFnContext();
          const page = await queryFn(queryFnContext);
          const { maxPages } = context.options;
          const addTo = previous ? addToStart : addToEnd;
          return {
            pages: addTo(data.pages, page, maxPages),
            pageParams: addTo(data.pageParams, param, maxPages)
          };
        };
        if (direction && oldPages.length) {
          const previous = direction === "backward";
          const pageParamFn = previous ? getPreviousPageParam : getNextPageParam;
          const oldData = {
            pages: oldPages,
            pageParams: oldPageParams
          };
          const param = pageParamFn(options, oldData);
          result = await fetchPage(oldData, param, previous);
        } else {
          const remainingPages = pages ?? oldPages.length;
          do {
            const param = currentPage === 0 ? oldPageParams[0] ?? options.initialPageParam : getNextPageParam(options, result);
            if (currentPage > 0 && param == null) {
              break;
            }
            result = await fetchPage(result, param);
            currentPage++;
          } while (currentPage < remainingPages);
        }
        return result;
      };
      if (context.options.persister) {
        context.fetchFn = () => {
          return context.options.persister?.(
            fetchFn,
            {
              client: context.client,
              queryKey: context.queryKey,
              meta: context.options.meta,
              signal: context.signal
            },
            query
          );
        };
      } else {
        context.fetchFn = fetchFn;
      }
    }
  };
}
function getNextPageParam(options, { pages, pageParams }) {
  const lastIndex = pages.length - 1;
  return pages.length > 0 ? options.getNextPageParam(
    pages[lastIndex],
    pages,
    pageParams[lastIndex],
    pageParams
  ) : void 0;
}
function getPreviousPageParam(options, { pages, pageParams }) {
  return pages.length > 0 ? options.getPreviousPageParam?.(pages[0], pages, pageParams[0], pageParams) : void 0;
}

// src/mutation.ts
var Mutation = class extends Removable {
  #client;
  #observers;
  #mutationCache;
  #retryer;
  constructor(config) {
    super();
    this.#client = config.client;
    this.mutationId = config.mutationId;
    this.#mutationCache = config.mutationCache;
    this.#observers = [];
    this.state = config.state || getDefaultState();
    this.setOptions(config.options);
    this.scheduleGc();
  }
  setOptions(options) {
    this.options = options;
    this.updateGcTime(this.options.gcTime);
  }
  get meta() {
    return this.options.meta;
  }
  addObserver(observer) {
    if (!this.#observers.includes(observer)) {
      this.#observers.push(observer);
      this.clearGcTimeout();
      this.#mutationCache.notify({
        type: "observerAdded",
        mutation: this,
        observer
      });
    }
  }
  removeObserver(observer) {
    this.#observers = this.#observers.filter((x) => x !== observer);
    this.scheduleGc();
    this.#mutationCache.notify({
      type: "observerRemoved",
      mutation: this,
      observer
    });
  }
  optionalRemove() {
    if (!this.#observers.length) {
      if (this.state.status === "pending") {
        this.scheduleGc();
      } else {
        this.#mutationCache.remove(this);
      }
    }
  }
  continue() {
    return this.#retryer?.continue() ?? // continuing a mutation assumes that variables are set, mutation must have been dehydrated before
    this.execute(this.state.variables);
  }
  async execute(variables) {
    const onContinue = () => {
      this.#dispatch({ type: "continue" });
    };
    const mutationFnContext = {
      client: this.#client,
      meta: this.options.meta,
      mutationKey: this.options.mutationKey
    };
    this.#retryer = createRetryer({
      fn: () => {
        if (!this.options.mutationFn) {
          return Promise.reject(new Error("No mutationFn found"));
        }
        return this.options.mutationFn(variables, mutationFnContext);
      },
      onFail: (failureCount, error) => {
        this.#dispatch({ type: "failed", failureCount, error });
      },
      onPause: () => {
        this.#dispatch({ type: "pause" });
      },
      onContinue,
      retry: this.options.retry ?? 0,
      retryDelay: this.options.retryDelay,
      networkMode: this.options.networkMode,
      canRun: () => this.#mutationCache.canRun(this)
    });
    const restored = this.state.status === "pending";
    const isPaused = !this.#retryer.canStart();
    try {
      if (restored) {
        onContinue();
      } else {
        this.#dispatch({ type: "pending", variables, isPaused });
        await this.#mutationCache.config.onMutate?.(
          variables,
          this,
          mutationFnContext
        );
        const context = await this.options.onMutate?.(
          variables,
          mutationFnContext
        );
        if (context !== this.state.context) {
          this.#dispatch({
            type: "pending",
            context,
            variables,
            isPaused
          });
        }
      }
      const data = await this.#retryer.start();
      await this.#mutationCache.config.onSuccess?.(
        data,
        variables,
        this.state.context,
        this,
        mutationFnContext
      );
      await this.options.onSuccess?.(
        data,
        variables,
        this.state.context,
        mutationFnContext
      );
      await this.#mutationCache.config.onSettled?.(
        data,
        null,
        this.state.variables,
        this.state.context,
        this,
        mutationFnContext
      );
      await this.options.onSettled?.(
        data,
        null,
        variables,
        this.state.context,
        mutationFnContext
      );
      this.#dispatch({ type: "success", data });
      return data;
    } catch (error) {
      try {
        await this.#mutationCache.config.onError?.(
          error,
          variables,
          this.state.context,
          this,
          mutationFnContext
        );
        await this.options.onError?.(
          error,
          variables,
          this.state.context,
          mutationFnContext
        );
        await this.#mutationCache.config.onSettled?.(
          void 0,
          error,
          this.state.variables,
          this.state.context,
          this,
          mutationFnContext
        );
        await this.options.onSettled?.(
          void 0,
          error,
          variables,
          this.state.context,
          mutationFnContext
        );
        throw error;
      } finally {
        this.#dispatch({ type: "error", error });
      }
    } finally {
      this.#mutationCache.runNext(this);
    }
  }
  #dispatch(action) {
    const reducer = (state) => {
      switch (action.type) {
        case "failed":
          return {
            ...state,
            failureCount: action.failureCount,
            failureReason: action.error
          };
        case "pause":
          return {
            ...state,
            isPaused: true
          };
        case "continue":
          return {
            ...state,
            isPaused: false
          };
        case "pending":
          return {
            ...state,
            context: action.context,
            data: void 0,
            failureCount: 0,
            failureReason: null,
            error: null,
            isPaused: action.isPaused,
            status: "pending",
            variables: action.variables,
            submittedAt: Date.now()
          };
        case "success":
          return {
            ...state,
            data: action.data,
            failureCount: 0,
            failureReason: null,
            error: null,
            status: "success",
            isPaused: false
          };
        case "error":
          return {
            ...state,
            data: void 0,
            error: action.error,
            failureCount: state.failureCount + 1,
            failureReason: action.error,
            isPaused: false,
            status: "error"
          };
      }
    };
    this.state = reducer(this.state);
    notifyManager.batch(() => {
      this.#observers.forEach((observer) => {
        observer.onMutationUpdate(action);
      });
      this.#mutationCache.notify({
        mutation: this,
        type: "updated",
        action
      });
    });
  }
};
function getDefaultState() {
  return {
    context: void 0,
    data: void 0,
    error: null,
    failureCount: 0,
    failureReason: null,
    isPaused: false,
    status: "idle",
    variables: void 0,
    submittedAt: 0
  };
}

// src/mutationCache.ts
var MutationCache = class extends Subscribable {
  constructor(config = {}) {
    super();
    this.config = config;
    this.#mutations = /* @__PURE__ */ new Set();
    this.#scopes = /* @__PURE__ */ new Map();
    this.#mutationId = 0;
  }
  #mutations;
  #scopes;
  #mutationId;
  build(client, options, state) {
    const mutation = new Mutation({
      client,
      mutationCache: this,
      mutationId: ++this.#mutationId,
      options: client.defaultMutationOptions(options),
      state
    });
    this.add(mutation);
    return mutation;
  }
  add(mutation) {
    this.#mutations.add(mutation);
    const scope = scopeFor(mutation);
    if (typeof scope === "string") {
      const scopedMutations = this.#scopes.get(scope);
      if (scopedMutations) {
        scopedMutations.push(mutation);
      } else {
        this.#scopes.set(scope, [mutation]);
      }
    }
    this.notify({ type: "added", mutation });
  }
  remove(mutation) {
    if (this.#mutations.delete(mutation)) {
      const scope = scopeFor(mutation);
      if (typeof scope === "string") {
        const scopedMutations = this.#scopes.get(scope);
        if (scopedMutations) {
          if (scopedMutations.length > 1) {
            const index = scopedMutations.indexOf(mutation);
            if (index !== -1) {
              scopedMutations.splice(index, 1);
            }
          } else if (scopedMutations[0] === mutation) {
            this.#scopes.delete(scope);
          }
        }
      }
    }
    this.notify({ type: "removed", mutation });
  }
  canRun(mutation) {
    const scope = scopeFor(mutation);
    if (typeof scope === "string") {
      const mutationsWithSameScope = this.#scopes.get(scope);
      const firstPendingMutation = mutationsWithSameScope?.find(
        (m) => m.state.status === "pending"
      );
      return !firstPendingMutation || firstPendingMutation === mutation;
    } else {
      return true;
    }
  }
  runNext(mutation) {
    const scope = scopeFor(mutation);
    if (typeof scope === "string") {
      const foundMutation = this.#scopes.get(scope)?.find((m) => m !== mutation && m.state.isPaused);
      return foundMutation?.continue() ?? Promise.resolve();
    } else {
      return Promise.resolve();
    }
  }
  clear() {
    notifyManager.batch(() => {
      this.#mutations.forEach((mutation) => {
        this.notify({ type: "removed", mutation });
      });
      this.#mutations.clear();
      this.#scopes.clear();
    });
  }
  getAll() {
    return Array.from(this.#mutations);
  }
  find(filters) {
    const defaultedFilters = { exact: true, ...filters };
    return this.getAll().find(
      (mutation) => matchMutation(defaultedFilters, mutation)
    );
  }
  findAll(filters = {}) {
    return this.getAll().filter((mutation) => matchMutation(filters, mutation));
  }
  notify(event) {
    notifyManager.batch(() => {
      this.listeners.forEach((listener) => {
        listener(event);
      });
    });
  }
  resumePausedMutations() {
    const pausedMutations = this.getAll().filter((x) => x.state.isPaused);
    return notifyManager.batch(
      () => Promise.all(
        pausedMutations.map((mutation) => mutation.continue().catch(noop))
      )
    );
  }
};
function scopeFor(mutation) {
  return mutation.options.scope?.id;
}

// src/queryCache.ts
var QueryCache = class extends Subscribable {
  constructor(config = {}) {
    super();
    this.config = config;
    this.#queries = /* @__PURE__ */ new Map();
  }
  #queries;
  build(client, options, state) {
    const queryKey = options.queryKey;
    const queryHash = options.queryHash ?? hashQueryKeyByOptions(queryKey, options);
    let query = this.get(queryHash);
    if (!query) {
      query = new Query({
        client,
        queryKey,
        queryHash,
        options: client.defaultQueryOptions(options),
        state,
        defaultOptions: client.getQueryDefaults(queryKey)
      });
      this.add(query);
    }
    return query;
  }
  add(query) {
    if (!this.#queries.has(query.queryHash)) {
      this.#queries.set(query.queryHash, query);
      this.notify({
        type: "added",
        query
      });
    }
  }
  remove(query) {
    const queryInMap = this.#queries.get(query.queryHash);
    if (queryInMap) {
      query.destroy();
      if (queryInMap === query) {
        this.#queries.delete(query.queryHash);
      }
      this.notify({ type: "removed", query });
    }
  }
  clear() {
    notifyManager.batch(() => {
      this.getAll().forEach((query) => {
        this.remove(query);
      });
    });
  }
  get(queryHash) {
    return this.#queries.get(queryHash);
  }
  getAll() {
    return [...this.#queries.values()];
  }
  find(filters) {
    const defaultedFilters = { exact: true, ...filters };
    return this.getAll().find(
      (query) => matchQuery(defaultedFilters, query)
    );
  }
  findAll(filters = {}) {
    const queries = this.getAll();
    return Object.keys(filters).length > 0 ? queries.filter((query) => matchQuery(filters, query)) : queries;
  }
  notify(event) {
    notifyManager.batch(() => {
      this.listeners.forEach((listener) => {
        listener(event);
      });
    });
  }
  onFocus() {
    notifyManager.batch(() => {
      this.getAll().forEach((query) => {
        query.onFocus();
      });
    });
  }
  onOnline() {
    notifyManager.batch(() => {
      this.getAll().forEach((query) => {
        query.onOnline();
      });
    });
  }
};

// src/queryClient.ts
var QueryClient$1 = class QueryClient {
  #queryCache;
  #mutationCache;
  #defaultOptions;
  #queryDefaults;
  #mutationDefaults;
  #mountCount;
  #unsubscribeFocus;
  #unsubscribeOnline;
  constructor(config = {}) {
    this.#queryCache = config.queryCache || new QueryCache();
    this.#mutationCache = config.mutationCache || new MutationCache();
    this.#defaultOptions = config.defaultOptions || {};
    this.#queryDefaults = /* @__PURE__ */ new Map();
    this.#mutationDefaults = /* @__PURE__ */ new Map();
    this.#mountCount = 0;
  }
  mount() {
    this.#mountCount++;
    if (this.#mountCount !== 1) return;
    this.#unsubscribeFocus = focusManager.subscribe(async (focused) => {
      if (focused) {
        await this.resumePausedMutations();
        this.#queryCache.onFocus();
      }
    });
    this.#unsubscribeOnline = onlineManager.subscribe(async (online) => {
      if (online) {
        await this.resumePausedMutations();
        this.#queryCache.onOnline();
      }
    });
  }
  unmount() {
    this.#mountCount--;
    if (this.#mountCount !== 0) return;
    this.#unsubscribeFocus?.();
    this.#unsubscribeFocus = void 0;
    this.#unsubscribeOnline?.();
    this.#unsubscribeOnline = void 0;
  }
  isFetching(filters) {
    return this.#queryCache.findAll({ ...filters, fetchStatus: "fetching" }).length;
  }
  isMutating(filters) {
    return this.#mutationCache.findAll({ ...filters, status: "pending" }).length;
  }
  /**
   * Imperative (non-reactive) way to retrieve data for a QueryKey.
   * Should only be used in callbacks or functions where reading the latest data is necessary, e.g. for optimistic updates.
   *
   * Hint: Do not use this function inside a component, because it won't receive updates.
   * Use `useQuery` to create a `QueryObserver` that subscribes to changes.
   */
  getQueryData(queryKey) {
    const options = this.defaultQueryOptions({ queryKey });
    return this.#queryCache.get(options.queryHash)?.state.data;
  }
  ensureQueryData(options) {
    const defaultedOptions = this.defaultQueryOptions(options);
    const query = this.#queryCache.build(this, defaultedOptions);
    const cachedData = query.state.data;
    if (cachedData === void 0) {
      return this.fetchQuery(options);
    }
    if (options.revalidateIfStale && query.isStaleByTime(resolveStaleTime(defaultedOptions.staleTime, query))) {
      void this.prefetchQuery(defaultedOptions);
    }
    return Promise.resolve(cachedData);
  }
  getQueriesData(filters) {
    return this.#queryCache.findAll(filters).map(({ queryKey, state }) => {
      const data = state.data;
      return [queryKey, data];
    });
  }
  setQueryData(queryKey, updater, options) {
    const defaultedOptions = this.defaultQueryOptions({ queryKey });
    const query = this.#queryCache.get(
      defaultedOptions.queryHash
    );
    const prevData = query?.state.data;
    const data = functionalUpdate(updater, prevData);
    if (data === void 0) {
      return void 0;
    }
    return this.#queryCache.build(this, defaultedOptions).setData(data, { ...options, manual: true });
  }
  setQueriesData(filters, updater, options) {
    return notifyManager.batch(
      () => this.#queryCache.findAll(filters).map(({ queryKey }) => [
        queryKey,
        this.setQueryData(queryKey, updater, options)
      ])
    );
  }
  getQueryState(queryKey) {
    const options = this.defaultQueryOptions({ queryKey });
    return this.#queryCache.get(
      options.queryHash
    )?.state;
  }
  removeQueries(filters) {
    const queryCache = this.#queryCache;
    notifyManager.batch(() => {
      queryCache.findAll(filters).forEach((query) => {
        queryCache.remove(query);
      });
    });
  }
  resetQueries(filters, options) {
    const queryCache = this.#queryCache;
    return notifyManager.batch(() => {
      queryCache.findAll(filters).forEach((query) => {
        query.reset();
      });
      return this.refetchQueries(
        {
          type: "active",
          ...filters
        },
        options
      );
    });
  }
  cancelQueries(filters, cancelOptions = {}) {
    const defaultedCancelOptions = { revert: true, ...cancelOptions };
    const promises = notifyManager.batch(
      () => this.#queryCache.findAll(filters).map((query) => query.cancel(defaultedCancelOptions))
    );
    return Promise.all(promises).then(noop).catch(noop);
  }
  invalidateQueries(filters, options = {}) {
    return notifyManager.batch(() => {
      this.#queryCache.findAll(filters).forEach((query) => {
        query.invalidate();
      });
      if (filters?.refetchType === "none") {
        return Promise.resolve();
      }
      return this.refetchQueries(
        {
          ...filters,
          type: filters?.refetchType ?? filters?.type ?? "active"
        },
        options
      );
    });
  }
  refetchQueries(filters, options = {}) {
    const fetchOptions = {
      ...options,
      cancelRefetch: options.cancelRefetch ?? true
    };
    const promises = notifyManager.batch(
      () => this.#queryCache.findAll(filters).filter((query) => !query.isDisabled() && !query.isStatic()).map((query) => {
        let promise = query.fetch(void 0, fetchOptions);
        if (!fetchOptions.throwOnError) {
          promise = promise.catch(noop);
        }
        return query.state.fetchStatus === "paused" ? Promise.resolve() : promise;
      })
    );
    return Promise.all(promises).then(noop);
  }
  fetchQuery(options) {
    const defaultedOptions = this.defaultQueryOptions(options);
    if (defaultedOptions.retry === void 0) {
      defaultedOptions.retry = false;
    }
    const query = this.#queryCache.build(this, defaultedOptions);
    return query.isStaleByTime(
      resolveStaleTime(defaultedOptions.staleTime, query)
    ) ? query.fetch(defaultedOptions) : Promise.resolve(query.state.data);
  }
  prefetchQuery(options) {
    return this.fetchQuery(options).then(noop).catch(noop);
  }
  fetchInfiniteQuery(options) {
    options.behavior = infiniteQueryBehavior(options.pages);
    return this.fetchQuery(options);
  }
  prefetchInfiniteQuery(options) {
    return this.fetchInfiniteQuery(options).then(noop).catch(noop);
  }
  ensureInfiniteQueryData(options) {
    options.behavior = infiniteQueryBehavior(options.pages);
    return this.ensureQueryData(options);
  }
  resumePausedMutations() {
    if (onlineManager.isOnline()) {
      return this.#mutationCache.resumePausedMutations();
    }
    return Promise.resolve();
  }
  getQueryCache() {
    return this.#queryCache;
  }
  getMutationCache() {
    return this.#mutationCache;
  }
  getDefaultOptions() {
    return this.#defaultOptions;
  }
  setDefaultOptions(options) {
    this.#defaultOptions = options;
  }
  setQueryDefaults(queryKey, options) {
    this.#queryDefaults.set(hashKey(queryKey), {
      queryKey,
      defaultOptions: options
    });
  }
  getQueryDefaults(queryKey) {
    const defaults = [...this.#queryDefaults.values()];
    const result = {};
    defaults.forEach((queryDefault) => {
      if (partialMatchKey(queryKey, queryDefault.queryKey)) {
        Object.assign(result, queryDefault.defaultOptions);
      }
    });
    return result;
  }
  setMutationDefaults(mutationKey, options) {
    this.#mutationDefaults.set(hashKey(mutationKey), {
      mutationKey,
      defaultOptions: options
    });
  }
  getMutationDefaults(mutationKey) {
    const defaults = [...this.#mutationDefaults.values()];
    const result = {};
    defaults.forEach((queryDefault) => {
      if (partialMatchKey(mutationKey, queryDefault.mutationKey)) {
        Object.assign(result, queryDefault.defaultOptions);
      }
    });
    return result;
  }
  defaultQueryOptions(options) {
    if (options._defaulted) {
      return options;
    }
    const defaultedOptions = {
      ...this.#defaultOptions.queries,
      ...this.getQueryDefaults(options.queryKey),
      ...options,
      _defaulted: true
    };
    if (!defaultedOptions.queryHash) {
      defaultedOptions.queryHash = hashQueryKeyByOptions(
        defaultedOptions.queryKey,
        defaultedOptions
      );
    }
    if (defaultedOptions.refetchOnReconnect === void 0) {
      defaultedOptions.refetchOnReconnect = defaultedOptions.networkMode !== "always";
    }
    if (defaultedOptions.throwOnError === void 0) {
      defaultedOptions.throwOnError = !!defaultedOptions.suspense;
    }
    if (!defaultedOptions.networkMode && defaultedOptions.persister) {
      defaultedOptions.networkMode = "offlineFirst";
    }
    if (defaultedOptions.queryFn === skipToken) {
      defaultedOptions.enabled = false;
    }
    return defaultedOptions;
  }
  defaultMutationOptions(options) {
    if (options?._defaulted) {
      return options;
    }
    return {
      ...this.#defaultOptions.mutations,
      ...options?.mutationKey && this.getMutationDefaults(options.mutationKey),
      ...options,
      _defaulted: true
    };
  }
  clear() {
    this.#queryCache.clear();
    this.#mutationCache.clear();
  }
};

// src/useQuery.ts
var QueryClientContext = createContext(void 0);
var QueryClientProvider$1 = (props) => {
  createRenderEffect((unmount) => {
    unmount?.();
    props.client.mount();
    return props.client.unmount.bind(props.client);
  });
  onCleanup(() => props.client.unmount());
  return createComponent(QueryClientContext.Provider, {
    value: () => props.client,
    get children() {
      return props.children;
    }
  });
};
var QueryClient = class extends QueryClient$1 {
  constructor(config = {}) {
    super(config);
  }
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1e4,
      // 10 seconds - data is fresh for 10s
      refetchOnWindowFocus: false,
      // Don't refetch on window focus
      refetchOnMount: true,
      // Refetch on mount if data is stale
      retry: 1,
      // Retry failed requests once
      gcTime: 5 * 60 * 1e3
      // Keep unused data in cache for 5 minutes
    },
    mutations: {
      retry: 1
    }
  }
});
const QueryClientProvider = (props) => {
  return createComponent(QueryClientProvider$1, {
    client: queryClient,
    get children() {
      return props.children;
    }
  });
};

/**
 * marked v12.0.2 - a markdown parser
 * Copyright (c) 2011-2024, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/markedjs/marked
 */

/**
 * DO NOT EDIT THIS FILE
 * The code in this file is generated from files in ./src/
 */

/**
 * Gets the original marked default options.
 */
function _getDefaults() {
    return {
        async: false,
        breaks: false,
        extensions: null,
        gfm: true,
        hooks: null,
        pedantic: false,
        renderer: null,
        silent: false,
        tokenizer: null,
        walkTokens: null
    };
}
let _defaults = _getDefaults();
function changeDefaults(newDefaults) {
    _defaults = newDefaults;
}

/**
 * Helpers
 */
const escapeTest = /[&<>"']/;
const escapeReplace = new RegExp(escapeTest.source, 'g');
const escapeTestNoEncode = /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/;
const escapeReplaceNoEncode = new RegExp(escapeTestNoEncode.source, 'g');
const escapeReplacements = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
};
const getEscapeReplacement = (ch) => escapeReplacements[ch];
function escape$1(html, encode) {
    if (encode) {
        if (escapeTest.test(html)) {
            return html.replace(escapeReplace, getEscapeReplacement);
        }
    }
    else {
        if (escapeTestNoEncode.test(html)) {
            return html.replace(escapeReplaceNoEncode, getEscapeReplacement);
        }
    }
    return html;
}
const unescapeTest = /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig;
function unescape(html) {
    // explicitly match decimal, hex, and named HTML entities
    return html.replace(unescapeTest, (_, n) => {
        n = n.toLowerCase();
        if (n === 'colon')
            return ':';
        if (n.charAt(0) === '#') {
            return n.charAt(1) === 'x'
                ? String.fromCharCode(parseInt(n.substring(2), 16))
                : String.fromCharCode(+n.substring(1));
        }
        return '';
    });
}
const caret = /(^|[^\[])\^/g;
function edit(regex, opt) {
    let source = typeof regex === 'string' ? regex : regex.source;
    opt = opt || '';
    const obj = {
        replace: (name, val) => {
            let valSource = typeof val === 'string' ? val : val.source;
            valSource = valSource.replace(caret, '$1');
            source = source.replace(name, valSource);
            return obj;
        },
        getRegex: () => {
            return new RegExp(source, opt);
        }
    };
    return obj;
}
function cleanUrl(href) {
    try {
        href = encodeURI(href).replace(/%25/g, '%');
    }
    catch (e) {
        return null;
    }
    return href;
}
const noopTest = { exec: () => null };
function splitCells(tableRow, count) {
    // ensure that every cell-delimiting pipe has a space
    // before it to distinguish it from an escaped pipe
    const row = tableRow.replace(/\|/g, (match, offset, str) => {
        let escaped = false;
        let curr = offset;
        while (--curr >= 0 && str[curr] === '\\')
            escaped = !escaped;
        if (escaped) {
            // odd number of slashes means | is escaped
            // so we leave it alone
            return '|';
        }
        else {
            // add space before unescaped |
            return ' |';
        }
    }), cells = row.split(/ \|/);
    let i = 0;
    // First/last cell in a row cannot be empty if it has no leading/trailing pipe
    if (!cells[0].trim()) {
        cells.shift();
    }
    if (cells.length > 0 && !cells[cells.length - 1].trim()) {
        cells.pop();
    }
    if (count) {
        if (cells.length > count) {
            cells.splice(count);
        }
        else {
            while (cells.length < count)
                cells.push('');
        }
    }
    for (; i < cells.length; i++) {
        // leading or trailing whitespace is ignored per the gfm spec
        cells[i] = cells[i].trim().replace(/\\\|/g, '|');
    }
    return cells;
}
/**
 * Remove trailing 'c's. Equivalent to str.replace(/c*$/, '').
 * /c*$/ is vulnerable to REDOS.
 *
 * @param str
 * @param c
 * @param invert Remove suffix of non-c chars instead. Default falsey.
 */
function rtrim(str, c, invert) {
    const l = str.length;
    if (l === 0) {
        return '';
    }
    // Length of suffix matching the invert condition.
    let suffLen = 0;
    // Step left until we fail to match the invert condition.
    while (suffLen < l) {
        const currChar = str.charAt(l - suffLen - 1);
        if (currChar === c && true) {
            suffLen++;
        }
        else {
            break;
        }
    }
    return str.slice(0, l - suffLen);
}
function findClosingBracket(str, b) {
    if (str.indexOf(b[1]) === -1) {
        return -1;
    }
    let level = 0;
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '\\') {
            i++;
        }
        else if (str[i] === b[0]) {
            level++;
        }
        else if (str[i] === b[1]) {
            level--;
            if (level < 0) {
                return i;
            }
        }
    }
    return -1;
}

function outputLink(cap, link, raw, lexer) {
    const href = link.href;
    const title = link.title ? escape$1(link.title) : null;
    const text = cap[1].replace(/\\([\[\]])/g, '$1');
    if (cap[0].charAt(0) !== '!') {
        lexer.state.inLink = true;
        const token = {
            type: 'link',
            raw,
            href,
            title,
            text,
            tokens: lexer.inlineTokens(text)
        };
        lexer.state.inLink = false;
        return token;
    }
    return {
        type: 'image',
        raw,
        href,
        title,
        text: escape$1(text)
    };
}
function indentCodeCompensation(raw, text) {
    const matchIndentToCode = raw.match(/^(\s+)(?:```)/);
    if (matchIndentToCode === null) {
        return text;
    }
    const indentToCode = matchIndentToCode[1];
    return text
        .split('\n')
        .map(node => {
        const matchIndentInNode = node.match(/^\s+/);
        if (matchIndentInNode === null) {
            return node;
        }
        const [indentInNode] = matchIndentInNode;
        if (indentInNode.length >= indentToCode.length) {
            return node.slice(indentToCode.length);
        }
        return node;
    })
        .join('\n');
}
/**
 * Tokenizer
 */
class _Tokenizer {
    options;
    rules; // set by the lexer
    lexer; // set by the lexer
    constructor(options) {
        this.options = options || _defaults;
    }
    space(src) {
        const cap = this.rules.block.newline.exec(src);
        if (cap && cap[0].length > 0) {
            return {
                type: 'space',
                raw: cap[0]
            };
        }
    }
    code(src) {
        const cap = this.rules.block.code.exec(src);
        if (cap) {
            const text = cap[0].replace(/^ {1,4}/gm, '');
            return {
                type: 'code',
                raw: cap[0],
                codeBlockStyle: 'indented',
                text: !this.options.pedantic
                    ? rtrim(text, '\n')
                    : text
            };
        }
    }
    fences(src) {
        const cap = this.rules.block.fences.exec(src);
        if (cap) {
            const raw = cap[0];
            const text = indentCodeCompensation(raw, cap[3] || '');
            return {
                type: 'code',
                raw,
                lang: cap[2] ? cap[2].trim().replace(this.rules.inline.anyPunctuation, '$1') : cap[2],
                text
            };
        }
    }
    heading(src) {
        const cap = this.rules.block.heading.exec(src);
        if (cap) {
            let text = cap[2].trim();
            // remove trailing #s
            if (/#$/.test(text)) {
                const trimmed = rtrim(text, '#');
                if (this.options.pedantic) {
                    text = trimmed.trim();
                }
                else if (!trimmed || / $/.test(trimmed)) {
                    // CommonMark requires space before trailing #s
                    text = trimmed.trim();
                }
            }
            return {
                type: 'heading',
                raw: cap[0],
                depth: cap[1].length,
                text,
                tokens: this.lexer.inline(text)
            };
        }
    }
    hr(src) {
        const cap = this.rules.block.hr.exec(src);
        if (cap) {
            return {
                type: 'hr',
                raw: cap[0]
            };
        }
    }
    blockquote(src) {
        const cap = this.rules.block.blockquote.exec(src);
        if (cap) {
            // precede setext continuation with 4 spaces so it isn't a setext
            let text = cap[0].replace(/\n {0,3}((?:=+|-+) *)(?=\n|$)/g, '\n    $1');
            text = rtrim(text.replace(/^ *>[ \t]?/gm, ''), '\n');
            const top = this.lexer.state.top;
            this.lexer.state.top = true;
            const tokens = this.lexer.blockTokens(text);
            this.lexer.state.top = top;
            return {
                type: 'blockquote',
                raw: cap[0],
                tokens,
                text
            };
        }
    }
    list(src) {
        let cap = this.rules.block.list.exec(src);
        if (cap) {
            let bull = cap[1].trim();
            const isordered = bull.length > 1;
            const list = {
                type: 'list',
                raw: '',
                ordered: isordered,
                start: isordered ? +bull.slice(0, -1) : '',
                loose: false,
                items: []
            };
            bull = isordered ? `\\d{1,9}\\${bull.slice(-1)}` : `\\${bull}`;
            if (this.options.pedantic) {
                bull = isordered ? bull : '[*+-]';
            }
            // Get next list item
            const itemRegex = new RegExp(`^( {0,3}${bull})((?:[\t ][^\\n]*)?(?:\\n|$))`);
            let raw = '';
            let itemContents = '';
            let endsWithBlankLine = false;
            // Check if current bullet point can start a new List Item
            while (src) {
                let endEarly = false;
                if (!(cap = itemRegex.exec(src))) {
                    break;
                }
                if (this.rules.block.hr.test(src)) { // End list if bullet was actually HR (possibly move into itemRegex?)
                    break;
                }
                raw = cap[0];
                src = src.substring(raw.length);
                let line = cap[2].split('\n', 1)[0].replace(/^\t+/, (t) => ' '.repeat(3 * t.length));
                let nextLine = src.split('\n', 1)[0];
                let indent = 0;
                if (this.options.pedantic) {
                    indent = 2;
                    itemContents = line.trimStart();
                }
                else {
                    indent = cap[2].search(/[^ ]/); // Find first non-space char
                    indent = indent > 4 ? 1 : indent; // Treat indented code blocks (> 4 spaces) as having only 1 indent
                    itemContents = line.slice(indent);
                    indent += cap[1].length;
                }
                let blankLine = false;
                if (!line && /^ *$/.test(nextLine)) { // Items begin with at most one blank line
                    raw += nextLine + '\n';
                    src = src.substring(nextLine.length + 1);
                    endEarly = true;
                }
                if (!endEarly) {
                    const nextBulletRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ \t][^\\n]*)?(?:\\n|$))`);
                    const hrRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`);
                    const fencesBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:\`\`\`|~~~)`);
                    const headingBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}#`);
                    // Check if following lines should be included in List Item
                    while (src) {
                        const rawLine = src.split('\n', 1)[0];
                        nextLine = rawLine;
                        // Re-align to follow commonmark nesting rules
                        if (this.options.pedantic) {
                            nextLine = nextLine.replace(/^ {1,4}(?=( {4})*[^ ])/g, '  ');
                        }
                        // End list item if found code fences
                        if (fencesBeginRegex.test(nextLine)) {
                            break;
                        }
                        // End list item if found start of new heading
                        if (headingBeginRegex.test(nextLine)) {
                            break;
                        }
                        // End list item if found start of new bullet
                        if (nextBulletRegex.test(nextLine)) {
                            break;
                        }
                        // Horizontal rule found
                        if (hrRegex.test(src)) {
                            break;
                        }
                        if (nextLine.search(/[^ ]/) >= indent || !nextLine.trim()) { // Dedent if possible
                            itemContents += '\n' + nextLine.slice(indent);
                        }
                        else {
                            // not enough indentation
                            if (blankLine) {
                                break;
                            }
                            // paragraph continuation unless last line was a different block level element
                            if (line.search(/[^ ]/) >= 4) { // indented code block
                                break;
                            }
                            if (fencesBeginRegex.test(line)) {
                                break;
                            }
                            if (headingBeginRegex.test(line)) {
                                break;
                            }
                            if (hrRegex.test(line)) {
                                break;
                            }
                            itemContents += '\n' + nextLine;
                        }
                        if (!blankLine && !nextLine.trim()) { // Check if current line is blank
                            blankLine = true;
                        }
                        raw += rawLine + '\n';
                        src = src.substring(rawLine.length + 1);
                        line = nextLine.slice(indent);
                    }
                }
                if (!list.loose) {
                    // If the previous item ended with a blank line, the list is loose
                    if (endsWithBlankLine) {
                        list.loose = true;
                    }
                    else if (/\n *\n *$/.test(raw)) {
                        endsWithBlankLine = true;
                    }
                }
                let istask = null;
                let ischecked;
                // Check for task list items
                if (this.options.gfm) {
                    istask = /^\[[ xX]\] /.exec(itemContents);
                    if (istask) {
                        ischecked = istask[0] !== '[ ] ';
                        itemContents = itemContents.replace(/^\[[ xX]\] +/, '');
                    }
                }
                list.items.push({
                    type: 'list_item',
                    raw,
                    task: !!istask,
                    checked: ischecked,
                    loose: false,
                    text: itemContents,
                    tokens: []
                });
                list.raw += raw;
            }
            // Do not consume newlines at end of final item. Alternatively, make itemRegex *start* with any newlines to simplify/speed up endsWithBlankLine logic
            list.items[list.items.length - 1].raw = raw.trimEnd();
            (list.items[list.items.length - 1]).text = itemContents.trimEnd();
            list.raw = list.raw.trimEnd();
            // Item child tokens handled here at end because we needed to have the final item to trim it first
            for (let i = 0; i < list.items.length; i++) {
                this.lexer.state.top = false;
                list.items[i].tokens = this.lexer.blockTokens(list.items[i].text, []);
                if (!list.loose) {
                    // Check if list should be loose
                    const spacers = list.items[i].tokens.filter(t => t.type === 'space');
                    const hasMultipleLineBreaks = spacers.length > 0 && spacers.some(t => /\n.*\n/.test(t.raw));
                    list.loose = hasMultipleLineBreaks;
                }
            }
            // Set all items to loose if list is loose
            if (list.loose) {
                for (let i = 0; i < list.items.length; i++) {
                    list.items[i].loose = true;
                }
            }
            return list;
        }
    }
    html(src) {
        const cap = this.rules.block.html.exec(src);
        if (cap) {
            const token = {
                type: 'html',
                block: true,
                raw: cap[0],
                pre: cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style',
                text: cap[0]
            };
            return token;
        }
    }
    def(src) {
        const cap = this.rules.block.def.exec(src);
        if (cap) {
            const tag = cap[1].toLowerCase().replace(/\s+/g, ' ');
            const href = cap[2] ? cap[2].replace(/^<(.*)>$/, '$1').replace(this.rules.inline.anyPunctuation, '$1') : '';
            const title = cap[3] ? cap[3].substring(1, cap[3].length - 1).replace(this.rules.inline.anyPunctuation, '$1') : cap[3];
            return {
                type: 'def',
                tag,
                raw: cap[0],
                href,
                title
            };
        }
    }
    table(src) {
        const cap = this.rules.block.table.exec(src);
        if (!cap) {
            return;
        }
        if (!/[:|]/.test(cap[2])) {
            // delimiter row must have a pipe (|) or colon (:) otherwise it is a setext heading
            return;
        }
        const headers = splitCells(cap[1]);
        const aligns = cap[2].replace(/^\||\| *$/g, '').split('|');
        const rows = cap[3] && cap[3].trim() ? cap[3].replace(/\n[ \t]*$/, '').split('\n') : [];
        const item = {
            type: 'table',
            raw: cap[0],
            header: [],
            align: [],
            rows: []
        };
        if (headers.length !== aligns.length) {
            // header and align columns must be equal, rows can be different.
            return;
        }
        for (const align of aligns) {
            if (/^ *-+: *$/.test(align)) {
                item.align.push('right');
            }
            else if (/^ *:-+: *$/.test(align)) {
                item.align.push('center');
            }
            else if (/^ *:-+ *$/.test(align)) {
                item.align.push('left');
            }
            else {
                item.align.push(null);
            }
        }
        for (const header of headers) {
            item.header.push({
                text: header,
                tokens: this.lexer.inline(header)
            });
        }
        for (const row of rows) {
            item.rows.push(splitCells(row, item.header.length).map(cell => {
                return {
                    text: cell,
                    tokens: this.lexer.inline(cell)
                };
            }));
        }
        return item;
    }
    lheading(src) {
        const cap = this.rules.block.lheading.exec(src);
        if (cap) {
            return {
                type: 'heading',
                raw: cap[0],
                depth: cap[2].charAt(0) === '=' ? 1 : 2,
                text: cap[1],
                tokens: this.lexer.inline(cap[1])
            };
        }
    }
    paragraph(src) {
        const cap = this.rules.block.paragraph.exec(src);
        if (cap) {
            const text = cap[1].charAt(cap[1].length - 1) === '\n'
                ? cap[1].slice(0, -1)
                : cap[1];
            return {
                type: 'paragraph',
                raw: cap[0],
                text,
                tokens: this.lexer.inline(text)
            };
        }
    }
    text(src) {
        const cap = this.rules.block.text.exec(src);
        if (cap) {
            return {
                type: 'text',
                raw: cap[0],
                text: cap[0],
                tokens: this.lexer.inline(cap[0])
            };
        }
    }
    escape(src) {
        const cap = this.rules.inline.escape.exec(src);
        if (cap) {
            return {
                type: 'escape',
                raw: cap[0],
                text: escape$1(cap[1])
            };
        }
    }
    tag(src) {
        const cap = this.rules.inline.tag.exec(src);
        if (cap) {
            if (!this.lexer.state.inLink && /^<a /i.test(cap[0])) {
                this.lexer.state.inLink = true;
            }
            else if (this.lexer.state.inLink && /^<\/a>/i.test(cap[0])) {
                this.lexer.state.inLink = false;
            }
            if (!this.lexer.state.inRawBlock && /^<(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
                this.lexer.state.inRawBlock = true;
            }
            else if (this.lexer.state.inRawBlock && /^<\/(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
                this.lexer.state.inRawBlock = false;
            }
            return {
                type: 'html',
                raw: cap[0],
                inLink: this.lexer.state.inLink,
                inRawBlock: this.lexer.state.inRawBlock,
                block: false,
                text: cap[0]
            };
        }
    }
    link(src) {
        const cap = this.rules.inline.link.exec(src);
        if (cap) {
            const trimmedUrl = cap[2].trim();
            if (!this.options.pedantic && /^</.test(trimmedUrl)) {
                // commonmark requires matching angle brackets
                if (!(/>$/.test(trimmedUrl))) {
                    return;
                }
                // ending angle bracket cannot be escaped
                const rtrimSlash = rtrim(trimmedUrl.slice(0, -1), '\\');
                if ((trimmedUrl.length - rtrimSlash.length) % 2 === 0) {
                    return;
                }
            }
            else {
                // find closing parenthesis
                const lastParenIndex = findClosingBracket(cap[2], '()');
                if (lastParenIndex > -1) {
                    const start = cap[0].indexOf('!') === 0 ? 5 : 4;
                    const linkLen = start + cap[1].length + lastParenIndex;
                    cap[2] = cap[2].substring(0, lastParenIndex);
                    cap[0] = cap[0].substring(0, linkLen).trim();
                    cap[3] = '';
                }
            }
            let href = cap[2];
            let title = '';
            if (this.options.pedantic) {
                // split pedantic href and title
                const link = /^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(href);
                if (link) {
                    href = link[1];
                    title = link[3];
                }
            }
            else {
                title = cap[3] ? cap[3].slice(1, -1) : '';
            }
            href = href.trim();
            if (/^</.test(href)) {
                if (this.options.pedantic && !(/>$/.test(trimmedUrl))) {
                    // pedantic allows starting angle bracket without ending angle bracket
                    href = href.slice(1);
                }
                else {
                    href = href.slice(1, -1);
                }
            }
            return outputLink(cap, {
                href: href ? href.replace(this.rules.inline.anyPunctuation, '$1') : href,
                title: title ? title.replace(this.rules.inline.anyPunctuation, '$1') : title
            }, cap[0], this.lexer);
        }
    }
    reflink(src, links) {
        let cap;
        if ((cap = this.rules.inline.reflink.exec(src))
            || (cap = this.rules.inline.nolink.exec(src))) {
            const linkString = (cap[2] || cap[1]).replace(/\s+/g, ' ');
            const link = links[linkString.toLowerCase()];
            if (!link) {
                const text = cap[0].charAt(0);
                return {
                    type: 'text',
                    raw: text,
                    text
                };
            }
            return outputLink(cap, link, cap[0], this.lexer);
        }
    }
    emStrong(src, maskedSrc, prevChar = '') {
        let match = this.rules.inline.emStrongLDelim.exec(src);
        if (!match)
            return;
        // _ can't be between two alphanumerics. \p{L}\p{N} includes non-english alphabet/numbers as well
        if (match[3] && prevChar.match(/[\p{L}\p{N}]/u))
            return;
        const nextChar = match[1] || match[2] || '';
        if (!nextChar || !prevChar || this.rules.inline.punctuation.exec(prevChar)) {
            // unicode Regex counts emoji as 1 char; spread into array for proper count (used multiple times below)
            const lLength = [...match[0]].length - 1;
            let rDelim, rLength, delimTotal = lLength, midDelimTotal = 0;
            const endReg = match[0][0] === '*' ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
            endReg.lastIndex = 0;
            // Clip maskedSrc to same section of string as src (move to lexer?)
            maskedSrc = maskedSrc.slice(-1 * src.length + lLength);
            while ((match = endReg.exec(maskedSrc)) != null) {
                rDelim = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];
                if (!rDelim)
                    continue; // skip single * in __abc*abc__
                rLength = [...rDelim].length;
                if (match[3] || match[4]) { // found another Left Delim
                    delimTotal += rLength;
                    continue;
                }
                else if (match[5] || match[6]) { // either Left or Right Delim
                    if (lLength % 3 && !((lLength + rLength) % 3)) {
                        midDelimTotal += rLength;
                        continue; // CommonMark Emphasis Rules 9-10
                    }
                }
                delimTotal -= rLength;
                if (delimTotal > 0)
                    continue; // Haven't found enough closing delimiters
                // Remove extra characters. *a*** -> *a*
                rLength = Math.min(rLength, rLength + delimTotal + midDelimTotal);
                // char length can be >1 for unicode characters;
                const lastCharLength = [...match[0]][0].length;
                const raw = src.slice(0, lLength + match.index + lastCharLength + rLength);
                // Create `em` if smallest delimiter has odd char count. *a***
                if (Math.min(lLength, rLength) % 2) {
                    const text = raw.slice(1, -1);
                    return {
                        type: 'em',
                        raw,
                        text,
                        tokens: this.lexer.inlineTokens(text)
                    };
                }
                // Create 'strong' if smallest delimiter has even char count. **a***
                const text = raw.slice(2, -2);
                return {
                    type: 'strong',
                    raw,
                    text,
                    tokens: this.lexer.inlineTokens(text)
                };
            }
        }
    }
    codespan(src) {
        const cap = this.rules.inline.code.exec(src);
        if (cap) {
            let text = cap[2].replace(/\n/g, ' ');
            const hasNonSpaceChars = /[^ ]/.test(text);
            const hasSpaceCharsOnBothEnds = /^ /.test(text) && / $/.test(text);
            if (hasNonSpaceChars && hasSpaceCharsOnBothEnds) {
                text = text.substring(1, text.length - 1);
            }
            text = escape$1(text, true);
            return {
                type: 'codespan',
                raw: cap[0],
                text
            };
        }
    }
    br(src) {
        const cap = this.rules.inline.br.exec(src);
        if (cap) {
            return {
                type: 'br',
                raw: cap[0]
            };
        }
    }
    del(src) {
        const cap = this.rules.inline.del.exec(src);
        if (cap) {
            return {
                type: 'del',
                raw: cap[0],
                text: cap[2],
                tokens: this.lexer.inlineTokens(cap[2])
            };
        }
    }
    autolink(src) {
        const cap = this.rules.inline.autolink.exec(src);
        if (cap) {
            let text, href;
            if (cap[2] === '@') {
                text = escape$1(cap[1]);
                href = 'mailto:' + text;
            }
            else {
                text = escape$1(cap[1]);
                href = text;
            }
            return {
                type: 'link',
                raw: cap[0],
                text,
                href,
                tokens: [
                    {
                        type: 'text',
                        raw: text,
                        text
                    }
                ]
            };
        }
    }
    url(src) {
        let cap;
        if (cap = this.rules.inline.url.exec(src)) {
            let text, href;
            if (cap[2] === '@') {
                text = escape$1(cap[0]);
                href = 'mailto:' + text;
            }
            else {
                // do extended autolink path validation
                let prevCapZero;
                do {
                    prevCapZero = cap[0];
                    cap[0] = this.rules.inline._backpedal.exec(cap[0])?.[0] ?? '';
                } while (prevCapZero !== cap[0]);
                text = escape$1(cap[0]);
                if (cap[1] === 'www.') {
                    href = 'http://' + cap[0];
                }
                else {
                    href = cap[0];
                }
            }
            return {
                type: 'link',
                raw: cap[0],
                text,
                href,
                tokens: [
                    {
                        type: 'text',
                        raw: text,
                        text
                    }
                ]
            };
        }
    }
    inlineText(src) {
        const cap = this.rules.inline.text.exec(src);
        if (cap) {
            let text;
            if (this.lexer.state.inRawBlock) {
                text = cap[0];
            }
            else {
                text = escape$1(cap[0]);
            }
            return {
                type: 'text',
                raw: cap[0],
                text
            };
        }
    }
}

/**
 * Block-Level Grammar
 */
const newline = /^(?: *(?:\n|$))+/;
const blockCode = /^( {4}[^\n]+(?:\n(?: *(?:\n|$))*)?)+/;
const fences = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
const hr = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
const heading = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
const bullet = /(?:[*+-]|\d{1,9}[.)])/;
const lheading = edit(/^(?!bull |blockCode|fences|blockquote|heading|html)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html))+?)\n {0,3}(=+|-+) *(?:\n+|$)/)
    .replace(/bull/g, bullet) // lists can interrupt
    .replace(/blockCode/g, / {4}/) // indented code blocks can interrupt
    .replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/) // fenced code blocks can interrupt
    .replace(/blockquote/g, / {0,3}>/) // blockquote can interrupt
    .replace(/heading/g, / {0,3}#{1,6}/) // ATX heading can interrupt
    .replace(/html/g, / {0,3}<[^\n>]+>\n/) // block html can interrupt
    .getRegex();
const _paragraph = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/;
const blockText = /^[^\n]+/;
const _blockLabel = /(?!\s*\])(?:\\.|[^\[\]\\])+/;
const def = edit(/^ {0,3}\[(label)\]: *(?:\n *)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n *)?| *\n *)(title))? *(?:\n+|$)/)
    .replace('label', _blockLabel)
    .replace('title', /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/)
    .getRegex();
const list = edit(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/)
    .replace(/bull/g, bullet)
    .getRegex();
const _tag = 'address|article|aside|base|basefont|blockquote|body|caption'
    + '|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption'
    + '|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe'
    + '|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option'
    + '|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title'
    + '|tr|track|ul';
const _comment = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
const html = edit('^ {0,3}(?:' // optional indentation
    + '<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)' // (1)
    + '|comment[^\\n]*(\\n+|$)' // (2)
    + '|<\\?[\\s\\S]*?(?:\\?>\\n*|$)' // (3)
    + '|<![A-Z][\\s\\S]*?(?:>\\n*|$)' // (4)
    + '|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)' // (5)
    + '|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n *)+\\n|$)' // (6)
    + '|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$)' // (7) open tag
    + '|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$)' // (7) closing tag
    + ')', 'i')
    .replace('comment', _comment)
    .replace('tag', _tag)
    .replace('attribute', / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/)
    .getRegex();
const paragraph = edit(_paragraph)
    .replace('hr', hr)
    .replace('heading', ' {0,3}#{1,6}(?:\\s|$)')
    .replace('|lheading', '') // setext headings don't interrupt commonmark paragraphs
    .replace('|table', '')
    .replace('blockquote', ' {0,3}>')
    .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
    .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
    .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)')
    .replace('tag', _tag) // pars can be interrupted by type (6) html blocks
    .getRegex();
const blockquote = edit(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/)
    .replace('paragraph', paragraph)
    .getRegex();
/**
 * Normal Block Grammar
 */
const blockNormal = {
    blockquote,
    code: blockCode,
    def,
    fences,
    heading,
    hr,
    html,
    lheading,
    list,
    newline,
    paragraph,
    table: noopTest,
    text: blockText
};
/**
 * GFM Block Grammar
 */
const gfmTable = edit('^ *([^\\n ].*)\\n' // Header
    + ' {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)' // Align
    + '(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)') // Cells
    .replace('hr', hr)
    .replace('heading', ' {0,3}#{1,6}(?:\\s|$)')
    .replace('blockquote', ' {0,3}>')
    .replace('code', ' {4}[^\\n]')
    .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
    .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
    .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)')
    .replace('tag', _tag) // tables can be interrupted by type (6) html blocks
    .getRegex();
const blockGfm = {
    ...blockNormal,
    table: gfmTable,
    paragraph: edit(_paragraph)
        .replace('hr', hr)
        .replace('heading', ' {0,3}#{1,6}(?:\\s|$)')
        .replace('|lheading', '') // setext headings don't interrupt commonmark paragraphs
        .replace('table', gfmTable) // interrupt paragraphs with table
        .replace('blockquote', ' {0,3}>')
        .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
        .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
        .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)')
        .replace('tag', _tag) // pars can be interrupted by type (6) html blocks
        .getRegex()
};
/**
 * Pedantic grammar (original John Gruber's loose markdown specification)
 */
const blockPedantic = {
    ...blockNormal,
    html: edit('^ *(?:comment *(?:\\n|\\s*$)'
        + '|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)' // closed tag
        + '|<tag(?:"[^"]*"|\'[^\']*\'|\\s[^\'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))')
        .replace('comment', _comment)
        .replace(/tag/g, '(?!(?:'
        + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub'
        + '|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)'
        + '\\b)\\w+(?!:|[^\\w\\s@]*@)\\b')
        .getRegex(),
    def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
    heading: /^(#{1,6})(.*)(?:\n+|$)/,
    fences: noopTest, // fences not supported
    lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
    paragraph: edit(_paragraph)
        .replace('hr', hr)
        .replace('heading', ' *#{1,6} *[^\n]')
        .replace('lheading', lheading)
        .replace('|table', '')
        .replace('blockquote', ' {0,3}>')
        .replace('|fences', '')
        .replace('|list', '')
        .replace('|html', '')
        .replace('|tag', '')
        .getRegex()
};
/**
 * Inline-Level Grammar
 */
const escape = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
const inlineCode = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
const br = /^( {2,}|\\)\n(?!\s*$)/;
const inlineText = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
// list of unicode punctuation marks, plus any missing characters from CommonMark spec
const _punctuation = '\\p{P}\\p{S}';
const punctuation = edit(/^((?![*_])[\spunctuation])/, 'u')
    .replace(/punctuation/g, _punctuation).getRegex();
// sequences em should skip over [title](link), `code`, <html>
const blockSkip = /\[[^[\]]*?\]\([^\(\)]*?\)|`[^`]*?`|<[^<>]*?>/g;
const emStrongLDelim = edit(/^(?:\*+(?:((?!\*)[punct])|[^\s*]))|^_+(?:((?!_)[punct])|([^\s_]))/, 'u')
    .replace(/punct/g, _punctuation)
    .getRegex();
const emStrongRDelimAst = edit('^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)' // Skip orphan inside strong
    + '|[^*]+(?=[^*])' // Consume to delim
    + '|(?!\\*)[punct](\\*+)(?=[\\s]|$)' // (1) #*** can only be a Right Delimiter
    + '|[^punct\\s](\\*+)(?!\\*)(?=[punct\\s]|$)' // (2) a***#, a*** can only be a Right Delimiter
    + '|(?!\\*)[punct\\s](\\*+)(?=[^punct\\s])' // (3) #***a, ***a can only be Left Delimiter
    + '|[\\s](\\*+)(?!\\*)(?=[punct])' // (4) ***# can only be Left Delimiter
    + '|(?!\\*)[punct](\\*+)(?!\\*)(?=[punct])' // (5) #***# can be either Left or Right Delimiter
    + '|[^punct\\s](\\*+)(?=[^punct\\s])', 'gu') // (6) a***a can be either Left or Right Delimiter
    .replace(/punct/g, _punctuation)
    .getRegex();
// (6) Not allowed for _
const emStrongRDelimUnd = edit('^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)' // Skip orphan inside strong
    + '|[^_]+(?=[^_])' // Consume to delim
    + '|(?!_)[punct](_+)(?=[\\s]|$)' // (1) #___ can only be a Right Delimiter
    + '|[^punct\\s](_+)(?!_)(?=[punct\\s]|$)' // (2) a___#, a___ can only be a Right Delimiter
    + '|(?!_)[punct\\s](_+)(?=[^punct\\s])' // (3) #___a, ___a can only be Left Delimiter
    + '|[\\s](_+)(?!_)(?=[punct])' // (4) ___# can only be Left Delimiter
    + '|(?!_)[punct](_+)(?!_)(?=[punct])', 'gu') // (5) #___# can be either Left or Right Delimiter
    .replace(/punct/g, _punctuation)
    .getRegex();
const anyPunctuation = edit(/\\([punct])/, 'gu')
    .replace(/punct/g, _punctuation)
    .getRegex();
const autolink = edit(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/)
    .replace('scheme', /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/)
    .replace('email', /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/)
    .getRegex();
const _inlineComment = edit(_comment).replace('(?:-->|$)', '-->').getRegex();
const tag = edit('^comment'
    + '|^</[a-zA-Z][\\w:-]*\\s*>' // self-closing tag
    + '|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>' // open tag
    + '|^<\\?[\\s\\S]*?\\?>' // processing instruction, e.g. <?php ?>
    + '|^<![a-zA-Z]+\\s[\\s\\S]*?>' // declaration, e.g. <!DOCTYPE html>
    + '|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>') // CDATA section
    .replace('comment', _inlineComment)
    .replace('attribute', /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/)
    .getRegex();
const _inlineLabel = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/;
const link = edit(/^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/)
    .replace('label', _inlineLabel)
    .replace('href', /<(?:\\.|[^\n<>\\])+>|[^\s\x00-\x1f]*/)
    .replace('title', /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/)
    .getRegex();
const reflink = edit(/^!?\[(label)\]\[(ref)\]/)
    .replace('label', _inlineLabel)
    .replace('ref', _blockLabel)
    .getRegex();
const nolink = edit(/^!?\[(ref)\](?:\[\])?/)
    .replace('ref', _blockLabel)
    .getRegex();
const reflinkSearch = edit('reflink|nolink(?!\\()', 'g')
    .replace('reflink', reflink)
    .replace('nolink', nolink)
    .getRegex();
/**
 * Normal Inline Grammar
 */
const inlineNormal = {
    _backpedal: noopTest, // only used for GFM url
    anyPunctuation,
    autolink,
    blockSkip,
    br,
    code: inlineCode,
    del: noopTest,
    emStrongLDelim,
    emStrongRDelimAst,
    emStrongRDelimUnd,
    escape,
    link,
    nolink,
    punctuation,
    reflink,
    reflinkSearch,
    tag,
    text: inlineText,
    url: noopTest
};
/**
 * Pedantic Inline Grammar
 */
const inlinePedantic = {
    ...inlineNormal,
    link: edit(/^!?\[(label)\]\((.*?)\)/)
        .replace('label', _inlineLabel)
        .getRegex(),
    reflink: edit(/^!?\[(label)\]\s*\[([^\]]*)\]/)
        .replace('label', _inlineLabel)
        .getRegex()
};
/**
 * GFM Inline Grammar
 */
const inlineGfm = {
    ...inlineNormal,
    escape: edit(escape).replace('])', '~|])').getRegex(),
    url: edit(/^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/, 'i')
        .replace('email', /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/)
        .getRegex(),
    _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,
    del: /^(~~?)(?=[^\s~])([\s\S]*?[^\s~])\1(?=[^~]|$)/,
    text: /^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/
};
/**
 * GFM + Line Breaks Inline Grammar
 */
const inlineBreaks = {
    ...inlineGfm,
    br: edit(br).replace('{2,}', '*').getRegex(),
    text: edit(inlineGfm.text)
        .replace('\\b_', '\\b_| {2,}\\n')
        .replace(/\{2,\}/g, '*')
        .getRegex()
};
/**
 * exports
 */
const block = {
    normal: blockNormal,
    gfm: blockGfm,
    pedantic: blockPedantic
};
const inline = {
    normal: inlineNormal,
    gfm: inlineGfm,
    breaks: inlineBreaks,
    pedantic: inlinePedantic
};

/**
 * Block Lexer
 */
class _Lexer {
    tokens;
    options;
    state;
    tokenizer;
    inlineQueue;
    constructor(options) {
        // TokenList cannot be created in one go
        this.tokens = [];
        this.tokens.links = Object.create(null);
        this.options = options || _defaults;
        this.options.tokenizer = this.options.tokenizer || new _Tokenizer();
        this.tokenizer = this.options.tokenizer;
        this.tokenizer.options = this.options;
        this.tokenizer.lexer = this;
        this.inlineQueue = [];
        this.state = {
            inLink: false,
            inRawBlock: false,
            top: true
        };
        const rules = {
            block: block.normal,
            inline: inline.normal
        };
        if (this.options.pedantic) {
            rules.block = block.pedantic;
            rules.inline = inline.pedantic;
        }
        else if (this.options.gfm) {
            rules.block = block.gfm;
            if (this.options.breaks) {
                rules.inline = inline.breaks;
            }
            else {
                rules.inline = inline.gfm;
            }
        }
        this.tokenizer.rules = rules;
    }
    /**
     * Expose Rules
     */
    static get rules() {
        return {
            block,
            inline
        };
    }
    /**
     * Static Lex Method
     */
    static lex(src, options) {
        const lexer = new _Lexer(options);
        return lexer.lex(src);
    }
    /**
     * Static Lex Inline Method
     */
    static lexInline(src, options) {
        const lexer = new _Lexer(options);
        return lexer.inlineTokens(src);
    }
    /**
     * Preprocessing
     */
    lex(src) {
        src = src
            .replace(/\r\n|\r/g, '\n');
        this.blockTokens(src, this.tokens);
        for (let i = 0; i < this.inlineQueue.length; i++) {
            const next = this.inlineQueue[i];
            this.inlineTokens(next.src, next.tokens);
        }
        this.inlineQueue = [];
        return this.tokens;
    }
    blockTokens(src, tokens = []) {
        if (this.options.pedantic) {
            src = src.replace(/\t/g, '    ').replace(/^ +$/gm, '');
        }
        else {
            src = src.replace(/^( *)(\t+)/gm, (_, leading, tabs) => {
                return leading + '    '.repeat(tabs.length);
            });
        }
        let token;
        let lastToken;
        let cutSrc;
        let lastParagraphClipped;
        while (src) {
            if (this.options.extensions
                && this.options.extensions.block
                && this.options.extensions.block.some((extTokenizer) => {
                    if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
                        src = src.substring(token.raw.length);
                        tokens.push(token);
                        return true;
                    }
                    return false;
                })) {
                continue;
            }
            // newline
            if (token = this.tokenizer.space(src)) {
                src = src.substring(token.raw.length);
                if (token.raw.length === 1 && tokens.length > 0) {
                    // if there's a single \n as a spacer, it's terminating the last line,
                    // so move it there so that we don't get unnecessary paragraph tags
                    tokens[tokens.length - 1].raw += '\n';
                }
                else {
                    tokens.push(token);
                }
                continue;
            }
            // code
            if (token = this.tokenizer.code(src)) {
                src = src.substring(token.raw.length);
                lastToken = tokens[tokens.length - 1];
                // An indented code block cannot interrupt a paragraph.
                if (lastToken && (lastToken.type === 'paragraph' || lastToken.type === 'text')) {
                    lastToken.raw += '\n' + token.raw;
                    lastToken.text += '\n' + token.text;
                    this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
                }
                else {
                    tokens.push(token);
                }
                continue;
            }
            // fences
            if (token = this.tokenizer.fences(src)) {
                src = src.substring(token.raw.length);
                tokens.push(token);
                continue;
            }
            // heading
            if (token = this.tokenizer.heading(src)) {
                src = src.substring(token.raw.length);
                tokens.push(token);
                continue;
            }
            // hr
            if (token = this.tokenizer.hr(src)) {
                src = src.substring(token.raw.length);
                tokens.push(token);
                continue;
            }
            // blockquote
            if (token = this.tokenizer.blockquote(src)) {
                src = src.substring(token.raw.length);
                tokens.push(token);
                continue;
            }
            // list
            if (token = this.tokenizer.list(src)) {
                src = src.substring(token.raw.length);
                tokens.push(token);
                continue;
            }
            // html
            if (token = this.tokenizer.html(src)) {
                src = src.substring(token.raw.length);
                tokens.push(token);
                continue;
            }
            // def
            if (token = this.tokenizer.def(src)) {
                src = src.substring(token.raw.length);
                lastToken = tokens[tokens.length - 1];
                if (lastToken && (lastToken.type === 'paragraph' || lastToken.type === 'text')) {
                    lastToken.raw += '\n' + token.raw;
                    lastToken.text += '\n' + token.raw;
                    this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
                }
                else if (!this.tokens.links[token.tag]) {
                    this.tokens.links[token.tag] = {
                        href: token.href,
                        title: token.title
                    };
                }
                continue;
            }
            // table (gfm)
            if (token = this.tokenizer.table(src)) {
                src = src.substring(token.raw.length);
                tokens.push(token);
                continue;
            }
            // lheading
            if (token = this.tokenizer.lheading(src)) {
                src = src.substring(token.raw.length);
                tokens.push(token);
                continue;
            }
            // top-level paragraph
            // prevent paragraph consuming extensions by clipping 'src' to extension start
            cutSrc = src;
            if (this.options.extensions && this.options.extensions.startBlock) {
                let startIndex = Infinity;
                const tempSrc = src.slice(1);
                let tempStart;
                this.options.extensions.startBlock.forEach((getStartIndex) => {
                    tempStart = getStartIndex.call({ lexer: this }, tempSrc);
                    if (typeof tempStart === 'number' && tempStart >= 0) {
                        startIndex = Math.min(startIndex, tempStart);
                    }
                });
                if (startIndex < Infinity && startIndex >= 0) {
                    cutSrc = src.substring(0, startIndex + 1);
                }
            }
            if (this.state.top && (token = this.tokenizer.paragraph(cutSrc))) {
                lastToken = tokens[tokens.length - 1];
                if (lastParagraphClipped && lastToken.type === 'paragraph') {
                    lastToken.raw += '\n' + token.raw;
                    lastToken.text += '\n' + token.text;
                    this.inlineQueue.pop();
                    this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
                }
                else {
                    tokens.push(token);
                }
                lastParagraphClipped = (cutSrc.length !== src.length);
                src = src.substring(token.raw.length);
                continue;
            }
            // text
            if (token = this.tokenizer.text(src)) {
                src = src.substring(token.raw.length);
                lastToken = tokens[tokens.length - 1];
                if (lastToken && lastToken.type === 'text') {
                    lastToken.raw += '\n' + token.raw;
                    lastToken.text += '\n' + token.text;
                    this.inlineQueue.pop();
                    this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
                }
                else {
                    tokens.push(token);
                }
                continue;
            }
            if (src) {
                const errMsg = 'Infinite loop on byte: ' + src.charCodeAt(0);
                if (this.options.silent) {
                    console.error(errMsg);
                    break;
                }
                else {
                    throw new Error(errMsg);
                }
            }
        }
        this.state.top = true;
        return tokens;
    }
    inline(src, tokens = []) {
        this.inlineQueue.push({ src, tokens });
        return tokens;
    }
    /**
     * Lexing/Compiling
     */
    inlineTokens(src, tokens = []) {
        let token, lastToken, cutSrc;
        // String with links masked to avoid interference with em and strong
        let maskedSrc = src;
        let match;
        let keepPrevChar, prevChar;
        // Mask out reflinks
        if (this.tokens.links) {
            const links = Object.keys(this.tokens.links);
            if (links.length > 0) {
                while ((match = this.tokenizer.rules.inline.reflinkSearch.exec(maskedSrc)) != null) {
                    if (links.includes(match[0].slice(match[0].lastIndexOf('[') + 1, -1))) {
                        maskedSrc = maskedSrc.slice(0, match.index) + '[' + 'a'.repeat(match[0].length - 2) + ']' + maskedSrc.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex);
                    }
                }
            }
        }
        // Mask out other blocks
        while ((match = this.tokenizer.rules.inline.blockSkip.exec(maskedSrc)) != null) {
            maskedSrc = maskedSrc.slice(0, match.index) + '[' + 'a'.repeat(match[0].length - 2) + ']' + maskedSrc.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
        }
        // Mask out escaped characters
        while ((match = this.tokenizer.rules.inline.anyPunctuation.exec(maskedSrc)) != null) {
            maskedSrc = maskedSrc.slice(0, match.index) + '++' + maskedSrc.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
        }
        while (src) {
            if (!keepPrevChar) {
                prevChar = '';
            }
            keepPrevChar = false;
            // extensions
            if (this.options.extensions
                && this.options.extensions.inline
                && this.options.extensions.inline.some((extTokenizer) => {
                    if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
                        src = src.substring(token.raw.length);
                        tokens.push(token);
                        return true;
                    }
                    return false;
                })) {
                continue;
            }
            // escape
            if (token = this.tokenizer.escape(src)) {
                src = src.substring(token.raw.length);
                tokens.push(token);
                continue;
            }
            // tag
            if (token = this.tokenizer.tag(src)) {
                src = src.substring(token.raw.length);
                lastToken = tokens[tokens.length - 1];
                if (lastToken && token.type === 'text' && lastToken.type === 'text') {
                    lastToken.raw += token.raw;
                    lastToken.text += token.text;
                }
                else {
                    tokens.push(token);
                }
                continue;
            }
            // link
            if (token = this.tokenizer.link(src)) {
                src = src.substring(token.raw.length);
                tokens.push(token);
                continue;
            }
            // reflink, nolink
            if (token = this.tokenizer.reflink(src, this.tokens.links)) {
                src = src.substring(token.raw.length);
                lastToken = tokens[tokens.length - 1];
                if (lastToken && token.type === 'text' && lastToken.type === 'text') {
                    lastToken.raw += token.raw;
                    lastToken.text += token.text;
                }
                else {
                    tokens.push(token);
                }
                continue;
            }
            // em & strong
            if (token = this.tokenizer.emStrong(src, maskedSrc, prevChar)) {
                src = src.substring(token.raw.length);
                tokens.push(token);
                continue;
            }
            // code
            if (token = this.tokenizer.codespan(src)) {
                src = src.substring(token.raw.length);
                tokens.push(token);
                continue;
            }
            // br
            if (token = this.tokenizer.br(src)) {
                src = src.substring(token.raw.length);
                tokens.push(token);
                continue;
            }
            // del (gfm)
            if (token = this.tokenizer.del(src)) {
                src = src.substring(token.raw.length);
                tokens.push(token);
                continue;
            }
            // autolink
            if (token = this.tokenizer.autolink(src)) {
                src = src.substring(token.raw.length);
                tokens.push(token);
                continue;
            }
            // url (gfm)
            if (!this.state.inLink && (token = this.tokenizer.url(src))) {
                src = src.substring(token.raw.length);
                tokens.push(token);
                continue;
            }
            // text
            // prevent inlineText consuming extensions by clipping 'src' to extension start
            cutSrc = src;
            if (this.options.extensions && this.options.extensions.startInline) {
                let startIndex = Infinity;
                const tempSrc = src.slice(1);
                let tempStart;
                this.options.extensions.startInline.forEach((getStartIndex) => {
                    tempStart = getStartIndex.call({ lexer: this }, tempSrc);
                    if (typeof tempStart === 'number' && tempStart >= 0) {
                        startIndex = Math.min(startIndex, tempStart);
                    }
                });
                if (startIndex < Infinity && startIndex >= 0) {
                    cutSrc = src.substring(0, startIndex + 1);
                }
            }
            if (token = this.tokenizer.inlineText(cutSrc)) {
                src = src.substring(token.raw.length);
                if (token.raw.slice(-1) !== '_') { // Track prevChar before string of ____ started
                    prevChar = token.raw.slice(-1);
                }
                keepPrevChar = true;
                lastToken = tokens[tokens.length - 1];
                if (lastToken && lastToken.type === 'text') {
                    lastToken.raw += token.raw;
                    lastToken.text += token.text;
                }
                else {
                    tokens.push(token);
                }
                continue;
            }
            if (src) {
                const errMsg = 'Infinite loop on byte: ' + src.charCodeAt(0);
                if (this.options.silent) {
                    console.error(errMsg);
                    break;
                }
                else {
                    throw new Error(errMsg);
                }
            }
        }
        return tokens;
    }
}

/**
 * Renderer
 */
class _Renderer {
    options;
    constructor(options) {
        this.options = options || _defaults;
    }
    code(code, infostring, escaped) {
        const lang = (infostring || '').match(/^\S*/)?.[0];
        code = code.replace(/\n$/, '') + '\n';
        if (!lang) {
            return '<pre><code>'
                + (escaped ? code : escape$1(code, true))
                + '</code></pre>\n';
        }
        return '<pre><code class="language-'
            + escape$1(lang)
            + '">'
            + (escaped ? code : escape$1(code, true))
            + '</code></pre>\n';
    }
    blockquote(quote) {
        return `<blockquote>\n${quote}</blockquote>\n`;
    }
    html(html, block) {
        return html;
    }
    heading(text, level, raw) {
        // ignore IDs
        return `<h${level}>${text}</h${level}>\n`;
    }
    hr() {
        return '<hr>\n';
    }
    list(body, ordered, start) {
        const type = ordered ? 'ol' : 'ul';
        const startatt = (ordered && start !== 1) ? (' start="' + start + '"') : '';
        return '<' + type + startatt + '>\n' + body + '</' + type + '>\n';
    }
    listitem(text, task, checked) {
        return `<li>${text}</li>\n`;
    }
    checkbox(checked) {
        return '<input '
            + (checked ? 'checked="" ' : '')
            + 'disabled="" type="checkbox">';
    }
    paragraph(text) {
        return `<p>${text}</p>\n`;
    }
    table(header, body) {
        if (body)
            body = `<tbody>${body}</tbody>`;
        return '<table>\n'
            + '<thead>\n'
            + header
            + '</thead>\n'
            + body
            + '</table>\n';
    }
    tablerow(content) {
        return `<tr>\n${content}</tr>\n`;
    }
    tablecell(content, flags) {
        const type = flags.header ? 'th' : 'td';
        const tag = flags.align
            ? `<${type} align="${flags.align}">`
            : `<${type}>`;
        return tag + content + `</${type}>\n`;
    }
    /**
     * span level renderer
     */
    strong(text) {
        return `<strong>${text}</strong>`;
    }
    em(text) {
        return `<em>${text}</em>`;
    }
    codespan(text) {
        return `<code>${text}</code>`;
    }
    br() {
        return '<br>';
    }
    del(text) {
        return `<del>${text}</del>`;
    }
    link(href, title, text) {
        const cleanHref = cleanUrl(href);
        if (cleanHref === null) {
            return text;
        }
        href = cleanHref;
        let out = '<a href="' + href + '"';
        if (title) {
            out += ' title="' + title + '"';
        }
        out += '>' + text + '</a>';
        return out;
    }
    image(href, title, text) {
        const cleanHref = cleanUrl(href);
        if (cleanHref === null) {
            return text;
        }
        href = cleanHref;
        let out = `<img src="${href}" alt="${text}"`;
        if (title) {
            out += ` title="${title}"`;
        }
        out += '>';
        return out;
    }
    text(text) {
        return text;
    }
}

/**
 * TextRenderer
 * returns only the textual part of the token
 */
class _TextRenderer {
    // no need for block level renderers
    strong(text) {
        return text;
    }
    em(text) {
        return text;
    }
    codespan(text) {
        return text;
    }
    del(text) {
        return text;
    }
    html(text) {
        return text;
    }
    text(text) {
        return text;
    }
    link(href, title, text) {
        return '' + text;
    }
    image(href, title, text) {
        return '' + text;
    }
    br() {
        return '';
    }
}

/**
 * Parsing & Compiling
 */
class _Parser {
    options;
    renderer;
    textRenderer;
    constructor(options) {
        this.options = options || _defaults;
        this.options.renderer = this.options.renderer || new _Renderer();
        this.renderer = this.options.renderer;
        this.renderer.options = this.options;
        this.textRenderer = new _TextRenderer();
    }
    /**
     * Static Parse Method
     */
    static parse(tokens, options) {
        const parser = new _Parser(options);
        return parser.parse(tokens);
    }
    /**
     * Static Parse Inline Method
     */
    static parseInline(tokens, options) {
        const parser = new _Parser(options);
        return parser.parseInline(tokens);
    }
    /**
     * Parse Loop
     */
    parse(tokens, top = true) {
        let out = '';
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            // Run any renderer extensions
            if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[token.type]) {
                const genericToken = token;
                const ret = this.options.extensions.renderers[genericToken.type].call({ parser: this }, genericToken);
                if (ret !== false || !['space', 'hr', 'heading', 'code', 'table', 'blockquote', 'list', 'html', 'paragraph', 'text'].includes(genericToken.type)) {
                    out += ret || '';
                    continue;
                }
            }
            switch (token.type) {
                case 'space': {
                    continue;
                }
                case 'hr': {
                    out += this.renderer.hr();
                    continue;
                }
                case 'heading': {
                    const headingToken = token;
                    out += this.renderer.heading(this.parseInline(headingToken.tokens), headingToken.depth, unescape(this.parseInline(headingToken.tokens, this.textRenderer)));
                    continue;
                }
                case 'code': {
                    const codeToken = token;
                    out += this.renderer.code(codeToken.text, codeToken.lang, !!codeToken.escaped);
                    continue;
                }
                case 'table': {
                    const tableToken = token;
                    let header = '';
                    // header
                    let cell = '';
                    for (let j = 0; j < tableToken.header.length; j++) {
                        cell += this.renderer.tablecell(this.parseInline(tableToken.header[j].tokens), { header: true, align: tableToken.align[j] });
                    }
                    header += this.renderer.tablerow(cell);
                    let body = '';
                    for (let j = 0; j < tableToken.rows.length; j++) {
                        const row = tableToken.rows[j];
                        cell = '';
                        for (let k = 0; k < row.length; k++) {
                            cell += this.renderer.tablecell(this.parseInline(row[k].tokens), { header: false, align: tableToken.align[k] });
                        }
                        body += this.renderer.tablerow(cell);
                    }
                    out += this.renderer.table(header, body);
                    continue;
                }
                case 'blockquote': {
                    const blockquoteToken = token;
                    const body = this.parse(blockquoteToken.tokens);
                    out += this.renderer.blockquote(body);
                    continue;
                }
                case 'list': {
                    const listToken = token;
                    const ordered = listToken.ordered;
                    const start = listToken.start;
                    const loose = listToken.loose;
                    let body = '';
                    for (let j = 0; j < listToken.items.length; j++) {
                        const item = listToken.items[j];
                        const checked = item.checked;
                        const task = item.task;
                        let itemBody = '';
                        if (item.task) {
                            const checkbox = this.renderer.checkbox(!!checked);
                            if (loose) {
                                if (item.tokens.length > 0 && item.tokens[0].type === 'paragraph') {
                                    item.tokens[0].text = checkbox + ' ' + item.tokens[0].text;
                                    if (item.tokens[0].tokens && item.tokens[0].tokens.length > 0 && item.tokens[0].tokens[0].type === 'text') {
                                        item.tokens[0].tokens[0].text = checkbox + ' ' + item.tokens[0].tokens[0].text;
                                    }
                                }
                                else {
                                    item.tokens.unshift({
                                        type: 'text',
                                        text: checkbox + ' '
                                    });
                                }
                            }
                            else {
                                itemBody += checkbox + ' ';
                            }
                        }
                        itemBody += this.parse(item.tokens, loose);
                        body += this.renderer.listitem(itemBody, task, !!checked);
                    }
                    out += this.renderer.list(body, ordered, start);
                    continue;
                }
                case 'html': {
                    const htmlToken = token;
                    out += this.renderer.html(htmlToken.text, htmlToken.block);
                    continue;
                }
                case 'paragraph': {
                    const paragraphToken = token;
                    out += this.renderer.paragraph(this.parseInline(paragraphToken.tokens));
                    continue;
                }
                case 'text': {
                    let textToken = token;
                    let body = textToken.tokens ? this.parseInline(textToken.tokens) : textToken.text;
                    while (i + 1 < tokens.length && tokens[i + 1].type === 'text') {
                        textToken = tokens[++i];
                        body += '\n' + (textToken.tokens ? this.parseInline(textToken.tokens) : textToken.text);
                    }
                    out += top ? this.renderer.paragraph(body) : body;
                    continue;
                }
                default: {
                    const errMsg = 'Token with "' + token.type + '" type was not found.';
                    if (this.options.silent) {
                        console.error(errMsg);
                        return '';
                    }
                    else {
                        throw new Error(errMsg);
                    }
                }
            }
        }
        return out;
    }
    /**
     * Parse Inline Tokens
     */
    parseInline(tokens, renderer) {
        renderer = renderer || this.renderer;
        let out = '';
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            // Run any renderer extensions
            if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[token.type]) {
                const ret = this.options.extensions.renderers[token.type].call({ parser: this }, token);
                if (ret !== false || !['escape', 'html', 'link', 'image', 'strong', 'em', 'codespan', 'br', 'del', 'text'].includes(token.type)) {
                    out += ret || '';
                    continue;
                }
            }
            switch (token.type) {
                case 'escape': {
                    const escapeToken = token;
                    out += renderer.text(escapeToken.text);
                    break;
                }
                case 'html': {
                    const tagToken = token;
                    out += renderer.html(tagToken.text);
                    break;
                }
                case 'link': {
                    const linkToken = token;
                    out += renderer.link(linkToken.href, linkToken.title, this.parseInline(linkToken.tokens, renderer));
                    break;
                }
                case 'image': {
                    const imageToken = token;
                    out += renderer.image(imageToken.href, imageToken.title, imageToken.text);
                    break;
                }
                case 'strong': {
                    const strongToken = token;
                    out += renderer.strong(this.parseInline(strongToken.tokens, renderer));
                    break;
                }
                case 'em': {
                    const emToken = token;
                    out += renderer.em(this.parseInline(emToken.tokens, renderer));
                    break;
                }
                case 'codespan': {
                    const codespanToken = token;
                    out += renderer.codespan(codespanToken.text);
                    break;
                }
                case 'br': {
                    out += renderer.br();
                    break;
                }
                case 'del': {
                    const delToken = token;
                    out += renderer.del(this.parseInline(delToken.tokens, renderer));
                    break;
                }
                case 'text': {
                    const textToken = token;
                    out += renderer.text(textToken.text);
                    break;
                }
                default: {
                    const errMsg = 'Token with "' + token.type + '" type was not found.';
                    if (this.options.silent) {
                        console.error(errMsg);
                        return '';
                    }
                    else {
                        throw new Error(errMsg);
                    }
                }
            }
        }
        return out;
    }
}

class _Hooks {
    options;
    constructor(options) {
        this.options = options || _defaults;
    }
    static passThroughHooks = new Set([
        'preprocess',
        'postprocess',
        'processAllTokens'
    ]);
    /**
     * Process markdown before marked
     */
    preprocess(markdown) {
        return markdown;
    }
    /**
     * Process HTML after marked is finished
     */
    postprocess(html) {
        return html;
    }
    /**
     * Process all tokens before walk tokens
     */
    processAllTokens(tokens) {
        return tokens;
    }
}

class Marked {
    defaults = _getDefaults();
    options = this.setOptions;
    parse = this.#parseMarkdown(_Lexer.lex, _Parser.parse);
    parseInline = this.#parseMarkdown(_Lexer.lexInline, _Parser.parseInline);
    Parser = _Parser;
    Renderer = _Renderer;
    TextRenderer = _TextRenderer;
    Lexer = _Lexer;
    Tokenizer = _Tokenizer;
    Hooks = _Hooks;
    constructor(...args) {
        this.use(...args);
    }
    /**
     * Run callback for every token
     */
    walkTokens(tokens, callback) {
        let values = [];
        for (const token of tokens) {
            values = values.concat(callback.call(this, token));
            switch (token.type) {
                case 'table': {
                    const tableToken = token;
                    for (const cell of tableToken.header) {
                        values = values.concat(this.walkTokens(cell.tokens, callback));
                    }
                    for (const row of tableToken.rows) {
                        for (const cell of row) {
                            values = values.concat(this.walkTokens(cell.tokens, callback));
                        }
                    }
                    break;
                }
                case 'list': {
                    const listToken = token;
                    values = values.concat(this.walkTokens(listToken.items, callback));
                    break;
                }
                default: {
                    const genericToken = token;
                    if (this.defaults.extensions?.childTokens?.[genericToken.type]) {
                        this.defaults.extensions.childTokens[genericToken.type].forEach((childTokens) => {
                            const tokens = genericToken[childTokens].flat(Infinity);
                            values = values.concat(this.walkTokens(tokens, callback));
                        });
                    }
                    else if (genericToken.tokens) {
                        values = values.concat(this.walkTokens(genericToken.tokens, callback));
                    }
                }
            }
        }
        return values;
    }
    use(...args) {
        const extensions = this.defaults.extensions || { renderers: {}, childTokens: {} };
        args.forEach((pack) => {
            // copy options to new object
            const opts = { ...pack };
            // set async to true if it was set to true before
            opts.async = this.defaults.async || opts.async || false;
            // ==-- Parse "addon" extensions --== //
            if (pack.extensions) {
                pack.extensions.forEach((ext) => {
                    if (!ext.name) {
                        throw new Error('extension name required');
                    }
                    if ('renderer' in ext) { // Renderer extensions
                        const prevRenderer = extensions.renderers[ext.name];
                        if (prevRenderer) {
                            // Replace extension with func to run new extension but fall back if false
                            extensions.renderers[ext.name] = function (...args) {
                                let ret = ext.renderer.apply(this, args);
                                if (ret === false) {
                                    ret = prevRenderer.apply(this, args);
                                }
                                return ret;
                            };
                        }
                        else {
                            extensions.renderers[ext.name] = ext.renderer;
                        }
                    }
                    if ('tokenizer' in ext) { // Tokenizer Extensions
                        if (!ext.level || (ext.level !== 'block' && ext.level !== 'inline')) {
                            throw new Error("extension level must be 'block' or 'inline'");
                        }
                        const extLevel = extensions[ext.level];
                        if (extLevel) {
                            extLevel.unshift(ext.tokenizer);
                        }
                        else {
                            extensions[ext.level] = [ext.tokenizer];
                        }
                        if (ext.start) { // Function to check for start of token
                            if (ext.level === 'block') {
                                if (extensions.startBlock) {
                                    extensions.startBlock.push(ext.start);
                                }
                                else {
                                    extensions.startBlock = [ext.start];
                                }
                            }
                            else if (ext.level === 'inline') {
                                if (extensions.startInline) {
                                    extensions.startInline.push(ext.start);
                                }
                                else {
                                    extensions.startInline = [ext.start];
                                }
                            }
                        }
                    }
                    if ('childTokens' in ext && ext.childTokens) { // Child tokens to be visited by walkTokens
                        extensions.childTokens[ext.name] = ext.childTokens;
                    }
                });
                opts.extensions = extensions;
            }
            // ==-- Parse "overwrite" extensions --== //
            if (pack.renderer) {
                const renderer = this.defaults.renderer || new _Renderer(this.defaults);
                for (const prop in pack.renderer) {
                    if (!(prop in renderer)) {
                        throw new Error(`renderer '${prop}' does not exist`);
                    }
                    if (prop === 'options') {
                        // ignore options property
                        continue;
                    }
                    const rendererProp = prop;
                    const rendererFunc = pack.renderer[rendererProp];
                    const prevRenderer = renderer[rendererProp];
                    // Replace renderer with func to run extension, but fall back if false
                    renderer[rendererProp] = (...args) => {
                        let ret = rendererFunc.apply(renderer, args);
                        if (ret === false) {
                            ret = prevRenderer.apply(renderer, args);
                        }
                        return ret || '';
                    };
                }
                opts.renderer = renderer;
            }
            if (pack.tokenizer) {
                const tokenizer = this.defaults.tokenizer || new _Tokenizer(this.defaults);
                for (const prop in pack.tokenizer) {
                    if (!(prop in tokenizer)) {
                        throw new Error(`tokenizer '${prop}' does not exist`);
                    }
                    if (['options', 'rules', 'lexer'].includes(prop)) {
                        // ignore options, rules, and lexer properties
                        continue;
                    }
                    const tokenizerProp = prop;
                    const tokenizerFunc = pack.tokenizer[tokenizerProp];
                    const prevTokenizer = tokenizer[tokenizerProp];
                    // Replace tokenizer with func to run extension, but fall back if false
                    // @ts-expect-error cannot type tokenizer function dynamically
                    tokenizer[tokenizerProp] = (...args) => {
                        let ret = tokenizerFunc.apply(tokenizer, args);
                        if (ret === false) {
                            ret = prevTokenizer.apply(tokenizer, args);
                        }
                        return ret;
                    };
                }
                opts.tokenizer = tokenizer;
            }
            // ==-- Parse Hooks extensions --== //
            if (pack.hooks) {
                const hooks = this.defaults.hooks || new _Hooks();
                for (const prop in pack.hooks) {
                    if (!(prop in hooks)) {
                        throw new Error(`hook '${prop}' does not exist`);
                    }
                    if (prop === 'options') {
                        // ignore options property
                        continue;
                    }
                    const hooksProp = prop;
                    const hooksFunc = pack.hooks[hooksProp];
                    const prevHook = hooks[hooksProp];
                    if (_Hooks.passThroughHooks.has(prop)) {
                        // @ts-expect-error cannot type hook function dynamically
                        hooks[hooksProp] = (arg) => {
                            if (this.defaults.async) {
                                return Promise.resolve(hooksFunc.call(hooks, arg)).then(ret => {
                                    return prevHook.call(hooks, ret);
                                });
                            }
                            const ret = hooksFunc.call(hooks, arg);
                            return prevHook.call(hooks, ret);
                        };
                    }
                    else {
                        // @ts-expect-error cannot type hook function dynamically
                        hooks[hooksProp] = (...args) => {
                            let ret = hooksFunc.apply(hooks, args);
                            if (ret === false) {
                                ret = prevHook.apply(hooks, args);
                            }
                            return ret;
                        };
                    }
                }
                opts.hooks = hooks;
            }
            // ==-- Parse WalkTokens extensions --== //
            if (pack.walkTokens) {
                const walkTokens = this.defaults.walkTokens;
                const packWalktokens = pack.walkTokens;
                opts.walkTokens = function (token) {
                    let values = [];
                    values.push(packWalktokens.call(this, token));
                    if (walkTokens) {
                        values = values.concat(walkTokens.call(this, token));
                    }
                    return values;
                };
            }
            this.defaults = { ...this.defaults, ...opts };
        });
        return this;
    }
    setOptions(opt) {
        this.defaults = { ...this.defaults, ...opt };
        return this;
    }
    lexer(src, options) {
        return _Lexer.lex(src, options ?? this.defaults);
    }
    parser(tokens, options) {
        return _Parser.parse(tokens, options ?? this.defaults);
    }
    #parseMarkdown(lexer, parser) {
        return (src, options) => {
            const origOpt = { ...options };
            const opt = { ...this.defaults, ...origOpt };
            // Show warning if an extension set async to true but the parse was called with async: false
            if (this.defaults.async === true && origOpt.async === false) {
                if (!opt.silent) {
                    console.warn('marked(): The async option was set to true by an extension. The async: false option sent to parse will be ignored.');
                }
                opt.async = true;
            }
            const throwError = this.#onError(!!opt.silent, !!opt.async);
            // throw error in case of non string input
            if (typeof src === 'undefined' || src === null) {
                return throwError(new Error('marked(): input parameter is undefined or null'));
            }
            if (typeof src !== 'string') {
                return throwError(new Error('marked(): input parameter is of type '
                    + Object.prototype.toString.call(src) + ', string expected'));
            }
            if (opt.hooks) {
                opt.hooks.options = opt;
            }
            if (opt.async) {
                return Promise.resolve(opt.hooks ? opt.hooks.preprocess(src) : src)
                    .then(src => lexer(src, opt))
                    .then(tokens => opt.hooks ? opt.hooks.processAllTokens(tokens) : tokens)
                    .then(tokens => opt.walkTokens ? Promise.all(this.walkTokens(tokens, opt.walkTokens)).then(() => tokens) : tokens)
                    .then(tokens => parser(tokens, opt))
                    .then(html => opt.hooks ? opt.hooks.postprocess(html) : html)
                    .catch(throwError);
            }
            try {
                if (opt.hooks) {
                    src = opt.hooks.preprocess(src);
                }
                let tokens = lexer(src, opt);
                if (opt.hooks) {
                    tokens = opt.hooks.processAllTokens(tokens);
                }
                if (opt.walkTokens) {
                    this.walkTokens(tokens, opt.walkTokens);
                }
                let html = parser(tokens, opt);
                if (opt.hooks) {
                    html = opt.hooks.postprocess(html);
                }
                return html;
            }
            catch (e) {
                return throwError(e);
            }
        };
    }
    #onError(silent, async) {
        return (e) => {
            e.message += '\nPlease report this to https://github.com/markedjs/marked.';
            if (silent) {
                const msg = '<p>An error occurred:</p><pre>'
                    + escape$1(e.message + '', true)
                    + '</pre>';
                if (async) {
                    return Promise.resolve(msg);
                }
                return msg;
            }
            if (async) {
                return Promise.reject(e);
            }
            throw e;
        };
    }
}

const markedInstance = new Marked();
function marked(src, opt) {
    return markedInstance.parse(src, opt);
}
/**
 * Sets the default options.
 *
 * @param options Hash of options
 */
marked.options =
    marked.setOptions = function (options) {
        markedInstance.setOptions(options);
        marked.defaults = markedInstance.defaults;
        changeDefaults(marked.defaults);
        return marked;
    };
/**
 * Gets the original marked default options.
 */
marked.getDefaults = _getDefaults;
marked.defaults = _defaults;
/**
 * Use Extension
 */
marked.use = function (...args) {
    markedInstance.use(...args);
    marked.defaults = markedInstance.defaults;
    changeDefaults(marked.defaults);
    return marked;
};
/**
 * Run callback for every token
 */
marked.walkTokens = function (tokens, callback) {
    return markedInstance.walkTokens(tokens, callback);
};
/**
 * Compiles markdown to HTML without enclosing `p` tag.
 *
 * @param src String of markdown source to be compiled
 * @param options Hash of options
 * @return String of compiled HTML
 */
marked.parseInline = markedInstance.parseInline;
/**
 * Expose
 */
marked.Parser = _Parser;
marked.parser = _Parser.parse;
marked.Renderer = _Renderer;
marked.TextRenderer = _TextRenderer;
marked.Lexer = _Lexer;
marked.lexer = _Lexer.lex;
marked.Tokenizer = _Tokenizer;
marked.Hooks = _Hooks;
marked.parse = marked;
marked.options;
marked.setOptions;
marked.use;
marked.walkTokens;
marked.parseInline;
_Parser.parse;
_Lexer.lex;

const [sessionId, setSessionId] = createSignal(null);
const [messages, setMessages] = createSignal([]);
const [isLoading, setIsLoading] = createSignal(false);
const [currentProvider, setCurrentProvider] = createSignal("ollama");
const [providers] = createSignal([
  { id: "ollama", name: "Ollama (Local)", icon: "llama" },
  { id: "openai", name: "OpenAI GPT-4", icon: "openai" },
  { id: "anthropic", name: "Claude", icon: "anthropic" }
]);
async function fetchProviders() {
  try {
    const res = await fetch("/api/ai/status");
    if (res.ok) {
      const data = await res.json();
      if (data.available && data.provider) {
        const providerName = data.provider.split(" ")[0];
        setCurrentProvider(providerName);
      }
    }
  } catch (error) {
    console.error("Failed to fetch AI status:", error);
  }
}
async function sendMessage(content) {
  if (!content.trim() || isLoading()) return;
  const userMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content,
    timestamp: /* @__PURE__ */ new Date()
  };
  setMessages((prev) => [...prev, userMessage]);
  setIsLoading(true);
  try {
    const statusRes = await fetch("/api/ai/status");
    const statusData = await statusRes.json();
    if (!statusData.available) {
      const errorMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "No AI provider available. Configure Ollama (local), OpenAI (OPENAI_API_KEY), or Claude (ANTHROPIC_API_KEY) to enable AI features.",
        timestamp: /* @__PURE__ */ new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }
    const res = await fetch("/api/ai/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: content
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.error) {
        const errorMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Error: ${data.error}`,
          timestamp: /* @__PURE__ */ new Date()
        };
        setMessages((prev) => [...prev, errorMessage]);
      } else {
        const assistantMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.response,
          timestamp: /* @__PURE__ */ new Date()
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } else {
      const errorText = await res.text();
      const errorMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Error: ${errorText}`,
        timestamp: /* @__PURE__ */ new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  } catch (error) {
    const errorMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `Failed to send message: ${error}`,
      timestamp: /* @__PURE__ */ new Date()
    };
    setMessages((prev) => [...prev, errorMessage]);
  } finally {
    setIsLoading(false);
  }
}
function clearChat() {
  setMessages([]);
  setSessionId(null);
}
function switchProvider(providerId) {
  setCurrentProvider(providerId);
  clearChat();
}

var _tmpl$$b = /* @__PURE__ */ template(`<button class="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"title=Close><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M6 18L18 6M6 6l12 12">`), _tmpl$2$b = /* @__PURE__ */ template(`<div class="p-6 space-y-6 max-w-4xl mx-auto"><div class="flex items-center justify-between"><div><h2 class="text-2xl font-bold"style=color:var(--text-primary)>Connect AI Agents</h2><p class="text-sm mt-1"style=color:var(--text-secondary)>Follow these steps to connect and configure AI agents for KubeGraf</p></div></div><div class="card p-4"><div class="flex items-center gap-3"><div></div><div><div class=font-semibold style=color:var(--text-primary)></div><div class=text-sm style=color:var(--text-secondary)></div></div></div></div><div class=space-y-6></div><div class="card p-4"><div class="text-sm font-semibold mb-2"style=color:var(--text-primary)>Need Help?</div><div class="flex gap-4 text-sm"><button class="text-[var(--accent-primary)] hover:underline">View AI Agents Configuration →</button><a href=https://github.com/kubegraf/kubegraf/blob/main/docs/AI_SETUP.md target=_blank class="text-[var(--accent-primary)] hover:underline">Documentation →`), _tmpl$3$a = /* @__PURE__ */ template(`<div class=space-y-4>`), _tmpl$4$9 = /* @__PURE__ */ template(`<ul class="list-disc list-inside space-y-2 text-sm"style=color:var(--text-secondary)>`), _tmpl$5$9 = /* @__PURE__ */ template(`<button class="mt-4 px-4 py-2 rounded-lg font-medium transition-colors"style=background:var(--accent-primary);color:white>Check Status`), _tmpl$6$6 = /* @__PURE__ */ template(`<div class="card p-6"><h3 class="text-lg font-semibold mb-3"style=color:var(--text-primary)></h3><p class="text-sm mb-4"style=color:var(--text-secondary)>`), _tmpl$7$4 = /* @__PURE__ */ template(`<div class=mt-3><div class="text-xs font-medium mb-1"style=color:var(--text-muted)>Environment Variables:`), _tmpl$8$2 = /* @__PURE__ */ template(`<div class="p-4 rounded-lg border"style=background:var(--bg-secondary);borderColor:var(--border-color)><div class="flex items-start justify-between mb-2"><div><div class=font-semibold style=color:var(--text-primary)></div><div class="text-sm mt-1"style=color:var(--text-secondary)></div></div></div><div class="mt-3 space-y-2"><div class="text-xs font-medium"style=color:var(--text-muted)>Setup Steps:</div><ol class="list-decimal list-inside space-y-1 text-sm"style=color:var(--text-secondary)>`), _tmpl$9$1 = /* @__PURE__ */ template(`<li>`), _tmpl$0$1 = /* @__PURE__ */ template(`<code class="block px-2 py-1 rounded text-xs mb-1"style=background:var(--bg-tertiary);color:var(--accent-primary)>`);
const AIConnectionSteps = (props) => {
  const [aiStatus] = createResource(() => api.getAIStatus().catch(() => ({
    available: false,
    provider: null
  })));
  const steps = [{
    title: "1. Choose Your AI Provider",
    description: "Select one of the following AI providers:",
    options: [{
      name: "Ollama (Local)",
      description: "Run AI models locally on your machine",
      setup: ["Install Ollama from https://ollama.ai", "Run: ollama pull llama3.2", "Ensure Ollama is running: ollama serve", "KubeGraf will automatically detect Ollama"],
      envVars: []
    }, {
      name: "OpenAI GPT-4",
      description: "Use OpenAI's GPT-4 for advanced AI capabilities",
      setup: ["Get your API key from https://platform.openai.com/api-keys", 'Set environment variable: export OPENAI_API_KEY="your-key-here"', "Restart KubeGraf", "AI Assistant will use GPT-4 automatically"],
      envVars: ["OPENAI_API_KEY"]
    }, {
      name: "Claude (Anthropic)",
      description: "Use Anthropic's Claude for intelligent assistance",
      setup: ["Get your API key from https://console.anthropic.com/", 'Set environment variable: export ANTHROPIC_API_KEY="your-key-here"', "Restart KubeGraf", "AI Assistant will use Claude automatically"],
      envVars: ["ANTHROPIC_API_KEY"]
    }]
  }, {
    title: "2. Verify Connection",
    description: "Check if your AI provider is connected:",
    action: 'Click "Check Status" below to verify your setup'
  }, {
    title: "3. Start Using AI Assistant",
    description: "Once connected, you can:",
    features: ["Ask questions about your Kubernetes cluster", "Get troubleshooting help", "Request resource analysis", "Receive AI-powered recommendations"]
  }];
  return (() => {
    var _el$ = _tmpl$2$b(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$7 = _el$2.nextSibling, _el$8 = _el$7.firstChild, _el$9 = _el$8.firstChild, _el$0 = _el$9.nextSibling, _el$1 = _el$0.firstChild, _el$10 = _el$1.nextSibling, _el$11 = _el$7.nextSibling, _el$12 = _el$11.nextSibling, _el$13 = _el$12.firstChild, _el$14 = _el$13.nextSibling, _el$15 = _el$14.firstChild;
    insert(_el$2, createComponent(Show, {
      get when() {
        return props.onClose;
      },
      get children() {
        var _el$6 = _tmpl$$b();
        addEventListener(_el$6, "click", props.onClose, true);
        return _el$6;
      }
    }), null);
    insert(_el$1, () => aiStatus()?.available ? "AI Provider Connected" : "No AI Provider Detected");
    insert(_el$10, (() => {
      var _c$ = memo(() => !!aiStatus()?.available);
      return () => _c$() ? `Using: ${aiStatus()?.provider || "Unknown"}` : "Follow the steps below to connect an AI provider";
    })());
    insert(_el$11, createComponent(For, {
      each: steps,
      children: (step, index) => (() => {
        var _el$16 = _tmpl$6$6(), _el$17 = _el$16.firstChild, _el$18 = _el$17.nextSibling;
        insert(_el$17, () => step.title);
        insert(_el$18, () => step.description);
        insert(_el$16, createComponent(Show, {
          get when() {
            return step.options;
          },
          get children() {
            var _el$19 = _tmpl$3$a();
            insert(_el$19, createComponent(For, {
              get each() {
                return step.options;
              },
              children: (option) => (() => {
                var _el$22 = _tmpl$8$2(), _el$23 = _el$22.firstChild, _el$24 = _el$23.firstChild, _el$25 = _el$24.firstChild, _el$26 = _el$25.nextSibling, _el$27 = _el$23.nextSibling, _el$28 = _el$27.firstChild, _el$29 = _el$28.nextSibling;
                insert(_el$25, () => option.name);
                insert(_el$26, () => option.description);
                insert(_el$29, createComponent(For, {
                  get each() {
                    return option.setup;
                  },
                  children: (setupStep) => (() => {
                    var _el$32 = _tmpl$9$1();
                    insert(_el$32, setupStep);
                    return _el$32;
                  })()
                }));
                insert(_el$27, createComponent(Show, {
                  get when() {
                    return memo(() => !!option.envVars)() && option.envVars.length > 0;
                  },
                  get children() {
                    var _el$30 = _tmpl$7$4(); _el$30.firstChild;
                    insert(_el$30, createComponent(For, {
                      get each() {
                        return option.envVars;
                      },
                      children: (envVar) => (() => {
                        var _el$33 = _tmpl$0$1();
                        insert(_el$33, envVar);
                        return _el$33;
                      })()
                    }), null);
                    return _el$30;
                  }
                }), null);
                return _el$22;
              })()
            }));
            return _el$19;
          }
        }), null);
        insert(_el$16, createComponent(Show, {
          get when() {
            return step.features;
          },
          get children() {
            var _el$20 = _tmpl$4$9();
            insert(_el$20, createComponent(For, {
              get each() {
                return step.features;
              },
              children: (feature) => (() => {
                var _el$34 = _tmpl$9$1();
                insert(_el$34, feature);
                return _el$34;
              })()
            }));
            return _el$20;
          }
        }), null);
        insert(_el$16, createComponent(Show, {
          get when() {
            return step.action;
          },
          get children() {
            var _el$21 = _tmpl$5$9();
            _el$21.$$click = () => {
              window.location.reload();
            };
            return _el$21;
          }
        }), null);
        return _el$16;
      })()
    }));
    _el$15.$$click = () => setCurrentView("aiagents");
    createRenderEffect(() => className(_el$9, `w-3 h-3 rounded-full ${aiStatus()?.available ? "bg-green-500" : "bg-red-500"}`));
    return _el$;
  })();
};
delegateEvents(["click"]);

var _tmpl$$a = /* @__PURE__ */ template(`<div class="fixed inset-0 bg-black/50 transition-opacity z-40"style=opacity:1;pointerEvents:auto>`), _tmpl$2$a = /* @__PURE__ */ template(`<svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25">`), _tmpl$3$9 = /* @__PURE__ */ template(`<div class="flex items-center justify-between px-4 py-3 border-b"style=border-color:var(--border-color);background:var(--bg-secondary)><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center"><svg class="w-6 h-6 text-white"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg></div><div><h2 class=font-semibold style=color:var(--text-primary)>AI Assistant</h2><p class=text-xs style=color:var(--text-secondary)>Kubernetes expert</p></div></div><div class="flex items-center gap-2"><select class="rounded-lg px-2 py-1 text-sm focus:outline-none"style="background:var(--bg-input);border:1px solid var(--border-color);color:var(--text-primary)"></select><button class="p-2 rounded-lg transition-colors"title="Clear chat"style=color:var(--text-secondary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button><button class="p-2 rounded-lg transition-colors"style=color:var(--text-secondary)></button><button class="p-2 rounded-lg transition-colors border"title="Close panel"style=color:var(--text-secondary);border-color:transparent><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M6 18L18 6M6 6l12 12">`), _tmpl$4$8 = /* @__PURE__ */ template(`<button class="mb-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors"style=background:var(--accent-primary);color:white>Connect AI Agents`), _tmpl$5$8 = /* @__PURE__ */ template(`<div class="text-center py-8"><div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"style=background:var(--bg-secondary)><svg class="w-8 h-8"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--accent-primary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg></div><h3 class="font-medium mb-2"style=color:var(--text-primary)>How can I help?</h3><p class="text-sm mb-6"style=color:var(--text-secondary)>Ask me about your Kubernetes cluster, resources, or troubleshooting</p><div class=space-y-2>`), _tmpl$6$5 = /* @__PURE__ */ template(`<div class="flex justify-start"><div class="rounded-lg px-4 py-3"style=background:var(--bg-secondary)><div class="flex items-center gap-2"><div class="flex gap-1"><div class="w-2 h-2 rounded-full animate-bounce"style=animation-delay:0ms;background:var(--accent-primary)></div><div class="w-2 h-2 rounded-full animate-bounce"style=animation-delay:150ms;background:var(--accent-primary)></div><div class="w-2 h-2 rounded-full animate-bounce"style=animation-delay:300ms;background:var(--accent-primary)></div></div><span class=text-sm style=color:var(--text-secondary)>Thinking...`), _tmpl$7$3 = /* @__PURE__ */ template(`<div><div class="flex-1 overflow-y-auto p-4 space-y-4"><div></div></div><form class="p-4 border-t"style=border-color:var(--border-color)><div class="flex items-center gap-2"><input type=text placeholder="Ask about your cluster..."class="flex-1 rounded-lg px-4 py-2.5 focus:outline-none disabled:opacity-50"style="background:var(--bg-input);border:1px solid var(--border-color);color:var(--text-primary)"><button type=submit class="p-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"style=background:var(--accent-primary);color:#000><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg></button></div><p class="mt-2 text-xs text-center"style=color:var(--text-muted)>Using `), _tmpl$8$1 = /* @__PURE__ */ template(`<option>`), _tmpl$9 = /* @__PURE__ */ template(`<svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4">`), _tmpl$0 = /* @__PURE__ */ template(`<button class="w-full text-left px-4 py-2 rounded-lg text-sm transition-colors"style=background:var(--bg-secondary);color:var(--text-secondary)>`), _tmpl$1 = /* @__PURE__ */ template(`<div class="prose prose-invert prose-sm max-w-none">`), _tmpl$10 = /* @__PURE__ */ template(`<div class="mt-2 pt-2 border-t text-xs"style=border-color:var(--border-color);color:var(--text-muted)>Tokens: `), _tmpl$11 = /* @__PURE__ */ template(`<div><div class="max-w-[85%] rounded-lg px-4 py-3">`), _tmpl$12 = /* @__PURE__ */ template(`<p class="text-sm whitespace-pre-wrap">`);
const AIChat = (props) => {
  const isInline = () => props.inline ?? false;
  let messagesEndRef;
  let inputRef;
  const [inputValue, setInputValue] = createSignal("");
  const [isMaximized, setIsMaximized] = createSignal(false);
  const [showConnectionSteps, setShowConnectionSteps] = createSignal(false);
  const [aiStatus] = createResource(() => api.getAIStatus().catch(() => ({
    available: false,
    provider: null
  })));
  const suggestions = ["Show me pods with high restart counts", "List deployments not fully available", "What services expose port 80?", "Show cluster resource usage"];
  onMount(() => {
    fetchProviders();
    inputRef?.focus();
  });
  createEffect(() => {
    if (messages().length === 0 && !aiStatus.loading && !aiStatus()?.available) {
      setShowConnectionSteps(true);
    } else if (aiStatus()?.available) {
      setShowConnectionSteps(false);
    }
  });
  createEffect(() => {
    messages();
    setTimeout(() => {
      messagesEndRef?.scrollIntoView({
        behavior: "smooth"
      });
    }, 100);
  });
  async function handleSubmit(e) {
    e.preventDefault();
    const msg = inputValue().trim();
    if (!msg) return;
    setInputValue("");
    await sendMessage(msg);
  }
  function handleSuggestion(suggestion) {
    sendMessage(suggestion);
  }
  function renderMarkdown(content) {
    try {
      return marked.parse(content, {
        async: false
      });
    } catch {
      return content;
    }
  }
  const handleClose = () => {
    if (isInline()) {
      setCurrentView("dashboard");
      setAIPanelOpen(false);
    } else {
      setAIPanelOpen(false);
    }
  };
  return [createComponent(Show, {
    get when() {
      return !isInline();
    },
    get children() {
      var _el$ = _tmpl$$a();
      _el$.$$click = handleClose;
      return _el$;
    }
  }), (() => {
    var _el$2 = _tmpl$7$3(), _el$13 = _el$2.firstChild, _el$29 = _el$13.firstChild, _el$30 = _el$13.nextSibling, _el$31 = _el$30.firstChild, _el$32 = _el$31.firstChild, _el$33 = _el$32.nextSibling, _el$34 = _el$31.nextSibling; _el$34.firstChild;
    _el$2.$$click = (e) => e.stopPropagation();
    insert(_el$2, createComponent(Show, {
      get when() {
        return !isInline();
      },
      get children() {
        var _el$3 = _tmpl$3$9(), _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling, _el$7 = _el$6.firstChild; _el$7.nextSibling; var _el$9 = _el$4.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling, _el$10 = _el$1.nextSibling, _el$12 = _el$10.nextSibling;
        _el$0.addEventListener("change", (e) => switchProvider(e.target.value));
        insert(_el$0, createComponent(For, {
          get each() {
            return providers();
          },
          children: (provider) => (() => {
            var _el$36 = _tmpl$8$1();
            insert(_el$36, () => provider.name);
            createRenderEffect(() => _el$36.value = provider.id);
            return _el$36;
          })()
        }));
        _el$1.addEventListener("mouseleave", (e) => e.currentTarget.style.background = "transparent");
        _el$1.addEventListener("mouseenter", (e) => e.currentTarget.style.background = "var(--bg-tertiary)");
        _el$1.$$click = (e) => {
          e.stopPropagation();
          clearChat();
        };
        _el$10.addEventListener("mouseleave", (e) => e.currentTarget.style.background = "transparent");
        _el$10.addEventListener("mouseenter", (e) => e.currentTarget.style.background = "var(--bg-tertiary)");
        _el$10.$$click = (e) => {
          e.stopPropagation();
          setIsMaximized(!isMaximized());
        };
        insert(_el$10, createComponent(Show, {
          get when() {
            return isMaximized();
          },
          get fallback() {
            return _tmpl$9();
          },
          get children() {
            return _tmpl$2$a();
          }
        }));
        _el$12.addEventListener("mouseleave", (e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.borderColor = "transparent";
          e.currentTarget.style.color = "var(--text-secondary)";
        });
        _el$12.addEventListener("mouseenter", (e) => {
          e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
          e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
          e.currentTarget.style.color = "var(--error-color)";
        });
        _el$12.$$click = (e) => {
          e.stopPropagation();
          handleClose();
        };
        createRenderEffect(() => setAttribute(_el$10, "title", isMaximized() ? "Restore" : "Maximize"));
        createRenderEffect(() => _el$0.value = currentProvider());
        return _el$3;
      }
    }), _el$13);
    insert(_el$13, createComponent(Show, {
      get when() {
        return memo(() => !!showConnectionSteps())() && messages().length === 0;
      },
      get children() {
        return createComponent(AIConnectionSteps, {
          onClose: () => setShowConnectionSteps(false)
        });
      }
    }), _el$29);
    insert(_el$13, createComponent(Show, {
      get when() {
        return memo(() => !!!showConnectionSteps())() && messages().length === 0;
      },
      get children() {
        var _el$14 = _tmpl$5$8(), _el$15 = _el$14.firstChild; _el$15.firstChild; var _el$17 = _el$15.nextSibling, _el$18 = _el$17.nextSibling, _el$20 = _el$18.nextSibling;
        insert(_el$14, createComponent(Show, {
          get when() {
            return !aiStatus()?.available;
          },
          get children() {
            var _el$19 = _tmpl$4$8();
            _el$19.$$click = () => setShowConnectionSteps(true);
            return _el$19;
          }
        }), _el$20);
        insert(_el$20, createComponent(For, {
          each: suggestions,
          children: (suggestion) => (() => {
            var _el$38 = _tmpl$0();
            _el$38.addEventListener("mouseleave", (e) => {
              e.currentTarget.style.background = "var(--bg-secondary)";
              e.currentTarget.style.color = "var(--text-secondary)";
            });
            _el$38.addEventListener("mouseenter", (e) => {
              e.currentTarget.style.background = "var(--bg-tertiary)";
              e.currentTarget.style.color = "var(--text-primary)";
            });
            _el$38.$$click = () => handleSuggestion(suggestion);
            insert(_el$38, suggestion);
            return _el$38;
          })()
        }));
        return _el$14;
      }
    }), _el$29);
    insert(_el$13, createComponent(For, {
      get each() {
        return messages();
      },
      children: (message) => (() => {
        var _el$39 = _tmpl$11(), _el$40 = _el$39.firstChild;
        insert(_el$40, createComponent(Show, {
          get when() {
            return message.role === "assistant";
          },
          get fallback() {
            return (() => {
              var _el$44 = _tmpl$12();
              insert(_el$44, () => message.content);
              return _el$44;
            })();
          },
          get children() {
            return [(() => {
              var _el$41 = _tmpl$1();
              createRenderEffect(() => _el$41.innerHTML = renderMarkdown(message.content));
              return _el$41;
            })(), createComponent(Show, {
              get when() {
                return message.usage;
              },
              get children() {
                var _el$42 = _tmpl$10(); _el$42.firstChild;
                insert(_el$42, () => message.usage?.totalTokens, null);
                return _el$42;
              }
            })];
          }
        }));
        createRenderEffect((_p$) => {
          var _v$5 = `flex ${message.role === "user" ? "justify-end" : "justify-start"}`, _v$6 = message.role === "user" ? "var(--accent-primary)" : "var(--bg-secondary)", _v$7 = message.role === "user" ? "#000" : "var(--text-primary)";
          _v$5 !== _p$.e && className(_el$39, _p$.e = _v$5);
          _v$6 !== _p$.t && setStyleProperty(_el$40, "background", _p$.t = _v$6);
          _v$7 !== _p$.a && setStyleProperty(_el$40, "color", _p$.a = _v$7);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0
        });
        return _el$39;
      })()
    }), _el$29);
    insert(_el$13, createComponent(Show, {
      get when() {
        return isLoading();
      },
      get children() {
        var _el$21 = _tmpl$6$5(), _el$22 = _el$21.firstChild, _el$23 = _el$22.firstChild, _el$24 = _el$23.firstChild, _el$25 = _el$24.firstChild, _el$26 = _el$25.nextSibling; _el$26.nextSibling; _el$24.nextSibling;
        return _el$21;
      }
    }), _el$29);
    var _ref$ = messagesEndRef;
    typeof _ref$ === "function" ? use(_ref$, _el$29) : messagesEndRef = _el$29;
    _el$30.addEventListener("submit", handleSubmit);
    _el$32.$$input = (e) => setInputValue(e.currentTarget.value);
    var _ref$2 = inputRef;
    typeof _ref$2 === "function" ? use(_ref$2, _el$32) : inputRef = _el$32;
    insert(_el$34, () => providers().find((p) => p.id === currentProvider())?.name || "AI", null);
    createRenderEffect((_p$) => {
      var _v$ = `flex flex-col ${isInline() ? "h-full" : "fixed right-0 border-l z-50 animate-slide-in shadow-2xl"}`, _v$2 = isInline() ? {
        background: "transparent"
      } : {
        background: "var(--bg-card)",
        "border-color": "var(--border-color)",
        top: "112px",
        // Header (64px) + Quick Access bar (48px)
        bottom: "0",
        height: "calc(100vh - 112px)",
        width: isMaximized() ? `calc(100vw - ${sidebarCollapsed$1() ? "64px" : "208px"})` : "420px",
        // When maximized, take full width minus sidebar (64px collapsed, 208px expanded)
        transition: "width 0.3s ease-in-out"
      }, _v$3 = isLoading(), _v$4 = isLoading() || !inputValue().trim();
      _v$ !== _p$.e && className(_el$2, _p$.e = _v$);
      _p$.t = style(_el$2, _v$2, _p$.t);
      _v$3 !== _p$.a && (_el$32.disabled = _p$.a = _v$3);
      _v$4 !== _p$.o && (_el$33.disabled = _p$.o = _v$4);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0
    });
    createRenderEffect(() => _el$32.value = inputValue());
    return _el$2;
  })()];
};
delegateEvents(["click", "input"]);

const brainMLService = {
  getTimeline: async (hours = 72) => {
    return fetchAPI(`/brain/ml/timeline?hours=${hours}`);
  },
  getPredictions: async () => {
    return fetchAPI("/brain/ml/predictions");
  },
  getSummary: async (hours = 24) => {
    return fetchAPI(`/brain/ml/summary?hours=${hours}`);
  }
};

async function fetchBrainDataInParallel() {
  const hours = 72;
  const showML = settings().showMLTimelineInBrain;
  const defaultTimeline = [];
  const defaultOOM = { incidents24h: 0, crashLoops24h: 0, topProblematic: [] };
  const defaultSummary = {
    last24hSummary: "Cluster is healthy with no incidents detected in the last 24 hours.",
    topRiskAreas: ["No significant risk areas identified"],
    recommendedActions: ["Continue monitoring cluster health and resource usage"],
    generatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  let timelineEvents = defaultTimeline;
  let oomMetrics = defaultOOM;
  let summary = defaultSummary;
  const [timelineResult, oomResult, summaryResult] = await Promise.allSettled([
    api.getBrainTimeline(hours).catch((err) => {
      console.warn("Brain timeline fetch failed:", err);
      return defaultTimeline;
    }),
    api.getBrainOOMInsights().catch((err) => {
      console.warn("Brain OOM insights fetch failed:", err);
      return defaultOOM;
    }),
    api.getBrainSummary().catch((err) => {
      console.warn("Brain summary fetch failed:", err);
      return defaultSummary;
    })
  ]);
  if (timelineResult.status === "fulfilled") {
    const result2 = timelineResult.value;
    if (Array.isArray(result2)) {
      timelineEvents = result2;
    } else {
      console.warn("Brain timeline returned invalid data, using default");
      timelineEvents = defaultTimeline;
    }
  } else {
    console.warn("Brain timeline promise rejected:", timelineResult.reason);
    timelineEvents = defaultTimeline;
  }
  if (oomResult.status === "fulfilled") {
    const result2 = oomResult.value;
    if (result2 && typeof result2.incidents24h === "number") {
      oomMetrics = result2;
    } else {
      console.warn("Brain OOM insights returned invalid data, using default");
      oomMetrics = defaultOOM;
    }
  } else {
    console.warn("Brain OOM insights promise rejected:", oomResult.reason);
    oomMetrics = defaultOOM;
  }
  if (summaryResult.status === "fulfilled") {
    const result2 = summaryResult.value;
    if (result2 && result2.last24hSummary) {
      summary = result2;
    } else {
      console.warn("Brain summary returned invalid data, using default");
      summary = defaultSummary;
    }
  } else {
    console.warn("Brain summary promise rejected:", summaryResult.reason);
    summary = {
      last24hSummary: "Unable to fetch summary from server. Please check your cluster connection and try again.",
      topRiskAreas: ["Cluster connection may be unavailable"],
      recommendedActions: ["Verify cluster connection and refresh the panel"],
      generatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  const result = {
    timelineEvents,
    oomMetrics,
    summary
  };
  if (showML) {
    try {
      const [mlTimeline, mlPredictions, mlSummary] = await Promise.allSettled([
        brainMLService.getTimeline(hours),
        brainMLService.getPredictions(),
        brainMLService.getSummary(24)
      ]);
      if (mlTimeline.status === "fulfilled") {
        result.mlTimeline = mlTimeline.value;
      }
      if (mlPredictions.status === "fulfilled") {
        result.mlPredictions = mlPredictions.value;
      }
      if (mlSummary.status === "fulfilled") {
        result.mlSummary = mlSummary.value;
      }
    } catch (err) {
      console.warn("ML data fetch failed:", err);
    }
  }
  return result;
}
async function preFetchBrainData() {
  try {
    await Promise.all([
      api.getBrainOOMInsights().catch(() => null)
      // Don't pre-fetch heavy timeline/summary - let them load on demand
    ]);
  } catch (error) {
    console.debug("Brain pre-fetch failed:", error);
  }
}

var _tmpl$$9 = /* @__PURE__ */ template(`<div class=space-y-4><div class="flex items-center justify-between mb-4"><h3 class="text-lg font-bold"style=background:var(--accent-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text>Cluster Timeline</h3><span class=text-xs style=color:var(--text-muted)>Last 72h</span></div><div class="space-y-3 max-h-96 overflow-y-auto"style="scrollbar-width:thin;scrollbar-color:var(--border-color) var(--bg-primary)">`), _tmpl$2$9 = /* @__PURE__ */ template(`<div class="text-center py-8"style=color:var(--text-muted)>No events in the last 72 hours`), _tmpl$3$8 = /* @__PURE__ */ template(`<div class="flex gap-3 p-3 rounded-lg transition-colors"style=background:var(--bg-tertiary)><div class="flex-shrink-0 mt-1"><span class=text-lg></span></div><div class="flex-1 min-w-0"><div class="flex items-start justify-between gap-2 mb-1"><h4 class="font-semibold text-sm"style=color:var(--accent-primary)></h4><span class="text-xs whitespace-nowrap"style=color:var(--text-muted)></span></div><p class="text-xs mb-2"style=color:var(--text-secondary)>`), _tmpl$4$7 = /* @__PURE__ */ template(`<div class=text-xs style=color:var(--text-muted)><span class=capitalize></span> <span class=font-mono>`), _tmpl$5$7 = /* @__PURE__ */ template(`<span class=font-mono>`);
const ClusterTimeline = (props) => {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = /* @__PURE__ */ new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 36e5);
    const diffMins = Math.floor(diffMs % 36e5 / 6e4);
    if (diffHours < 1) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    const days = Math.floor(diffHours / 24);
    return `${days}d ago`;
  };
  const getEventIcon = (type) => {
    switch (type) {
      case "incident":
        return "⚠️";
      case "event_spike":
        return "📊";
      case "scaling":
        return "📈";
      case "deployment":
        return "🚀";
      default:
        return "•";
    }
  };
  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "var(--error-color)";
      case "warning":
        return "var(--warning-color)";
      default:
        return "var(--accent-primary)";
    }
  };
  const sortedEvents = createMemo(() => {
    return [...props.events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  });
  return (() => {
    var _el$ = _tmpl$$9(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild; _el$3.nextSibling; var _el$5 = _el$2.nextSibling;
    insert(_el$5, createComponent(Show, {
      get when() {
        return sortedEvents().length > 0;
      },
      get fallback() {
        return _tmpl$2$9();
      },
      get children() {
        return createComponent(For, {
          get each() {
            return sortedEvents();
          },
          children: (event) => (() => {
            var _el$7 = _tmpl$3$8(), _el$8 = _el$7.firstChild, _el$9 = _el$8.firstChild, _el$0 = _el$8.nextSibling, _el$1 = _el$0.firstChild, _el$10 = _el$1.firstChild, _el$11 = _el$10.nextSibling, _el$12 = _el$1.nextSibling;
            _el$7.addEventListener("mouseleave", (e) => e.currentTarget.style.background = "var(--bg-tertiary)");
            _el$7.addEventListener("mouseenter", (e) => e.currentTarget.style.background = "var(--bg-secondary)");
            insert(_el$9, () => getEventIcon(event.type));
            insert(_el$10, () => event.title);
            insert(_el$11, () => formatTime(event.timestamp));
            insert(_el$12, () => event.description);
            insert(_el$0, (() => {
              var _c$ = memo(() => !!event.resource);
              return () => _c$() && (() => {
                var _el$13 = _tmpl$4$7(), _el$14 = _el$13.firstChild, _el$15 = _el$14.nextSibling, _el$16 = _el$15.nextSibling;
                insert(_el$14, () => event.resource.kind);
                insert(_el$16, () => event.resource.name);
                insert(_el$13, (() => {
                  var _c$2 = memo(() => !!event.resource.namespace);
                  return () => _c$2() && [" ", "in", " ", (() => {
                    var _el$17 = _tmpl$5$7();
                    insert(_el$17, () => event.resource.namespace);
                    return _el$17;
                  })()];
                })(), null);
                return _el$13;
              })();
            })(), null);
            createRenderEffect((_$p) => setStyleProperty(_el$7, "border-left", `3px solid ${getSeverityColor(event.severity)}`));
            return _el$7;
          })()
        });
      }
    }));
    return _el$;
  })();
};

var _tmpl$$8 = /* @__PURE__ */ template(`<div class=space-y-2>`), _tmpl$2$8 = /* @__PURE__ */ template(`<div class=space-y-4><h3 class="text-lg font-bold"style=background:var(--accent-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text>OOM & Reliability Insights</h3><div class="grid grid-cols-2 gap-3"><div class="p-4 rounded-lg"style="background:var(--glass-gradient);border:1px solid var(--border-color)"><div class="text-xs mb-1"style=color:var(--text-muted)>OOM Incidents</div><div class="text-2xl font-bold"style=color:var(--error-color)></div><div class="text-xs mt-1"style=color:var(--text-muted)>Last 24h</div></div><div class="p-4 rounded-lg"style="background:var(--glass-gradient);border:1px solid var(--border-color)"><div class="text-xs mb-1"style=color:var(--text-muted)>CrashLoops</div><div class="text-2xl font-bold"style=color:var(--warning-color)></div><div class="text-xs mt-1"style=color:var(--text-muted)>Last 24h</div></div></div><div><h4 class="text-sm font-semibold mb-3"style=color:var(--accent-primary)>Top 5 Problematic Workloads`), _tmpl$3$7 = /* @__PURE__ */ template(`<div class="text-center py-4 text-sm"style=color:var(--text-muted)>No problematic workloads detected`), _tmpl$4$6 = /* @__PURE__ */ template(`<div class="p-3 rounded-lg text-sm"style="background:var(--bg-tertiary);border:1px solid var(--border-color)"><div class="flex items-start justify-between mb-2"><div class="flex-1 min-w-0"><div class=font-semibold style=color:var(--accent-primary)></div><div class="text-xs mt-1"style=color:var(--text-muted)><span class=capitalize></span> • </div></div><div class="text-xs font-bold px-2 py-1 rounded"style="background:var(--bg-secondary);color:var(--error-color);border:1px solid var(--border-color)">Score: </div></div><div class="flex gap-4 text-xs mt-2"style=color:var(--text-muted)>`), _tmpl$5$6 = /* @__PURE__ */ template(`<span>OOM: `), _tmpl$6$4 = /* @__PURE__ */ template(`<span>Restarts: `), _tmpl$7$2 = /* @__PURE__ */ template(`<span>CrashLoops: `);
const OOMInsights = (props) => {
  const topProblematic = () => props.metrics.topProblematic.slice(0, 5);
  return (() => {
    var _el$ = _tmpl$2$8(), _el$2 = _el$.firstChild, _el$3 = _el$2.nextSibling, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling; _el$6.nextSibling; var _el$8 = _el$4.nextSibling, _el$9 = _el$8.firstChild, _el$0 = _el$9.nextSibling; _el$0.nextSibling; var _el$10 = _el$3.nextSibling; _el$10.firstChild;
    insert(_el$6, () => props.metrics.incidents24h);
    insert(_el$0, () => props.metrics.crashLoops24h);
    insert(_el$10, createComponent(Show, {
      get when() {
        return topProblematic().length > 0;
      },
      get fallback() {
        return _tmpl$3$7();
      },
      get children() {
        var _el$12 = _tmpl$$8();
        insert(_el$12, createComponent(For, {
          get each() {
            return topProblematic();
          },
          children: (workload) => (() => {
            var _el$14 = _tmpl$4$6(), _el$15 = _el$14.firstChild, _el$16 = _el$15.firstChild, _el$17 = _el$16.firstChild, _el$18 = _el$17.nextSibling, _el$19 = _el$18.firstChild; _el$19.nextSibling; var _el$22 = _el$16.nextSibling; _el$22.firstChild; var _el$24 = _el$15.nextSibling;
            insert(_el$17, () => workload.name);
            insert(_el$19, () => workload.kind);
            insert(_el$18, () => workload.namespace, null);
            insert(_el$22, () => workload.score, null);
            insert(_el$24, (() => {
              var _c$ = memo(() => workload.issues.oomKilled > 0);
              return () => _c$() && (() => {
                var _el$25 = _tmpl$5$6(); _el$25.firstChild;
                insert(_el$25, () => workload.issues.oomKilled, null);
                return _el$25;
              })();
            })(), null);
            insert(_el$24, (() => {
              var _c$2 = memo(() => workload.issues.restarts > 0);
              return () => _c$2() && (() => {
                var _el$27 = _tmpl$6$4(); _el$27.firstChild;
                insert(_el$27, () => workload.issues.restarts, null);
                return _el$27;
              })();
            })(), null);
            insert(_el$24, (() => {
              var _c$3 = memo(() => workload.issues.crashLoops > 0);
              return () => _c$3() && (() => {
                var _el$29 = _tmpl$7$2(); _el$29.firstChild;
                insert(_el$29, () => workload.issues.crashLoops, null);
                return _el$29;
              })();
            })(), null);
            return _el$14;
          })()
        }));
        return _el$12;
      }
    }), null);
    return _el$;
  })();
};

var _tmpl$$7 = /* @__PURE__ */ template(`<div class=space-y-2>`), _tmpl$2$7 = /* @__PURE__ */ template(`<div class=space-y-4><h3 class="text-lg font-bold"style=background:var(--accent-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text>Explanation & Suggestions</h3><div class="p-4 rounded-lg"style="background:var(--glass-gradient);border:1px solid var(--border-color)"><h4 class="text-sm font-semibold mb-2"style=color:var(--accent-primary)>Summary of Last 24h</h4><p class=text-sm style=color:var(--text-secondary);line-height:1.6></p></div><div><h4 class="text-sm font-semibold mb-3"style=color:var(--accent-primary)>Top 3 Risk Areas</h4></div><div><h4 class="text-sm font-semibold mb-3"style=color:var(--accent-primary)>Recommended Next Actions</h4></div><div class="text-xs pt-2"style=color:var(--text-muted)>Generated at `), _tmpl$3$6 = /* @__PURE__ */ template(`<div class=text-sm style=color:var(--text-muted)>No significant risk areas identified`), _tmpl$4$5 = /* @__PURE__ */ template(`<div class="flex items-start gap-3 p-3 rounded-lg"style="background:var(--bg-tertiary);border:1px solid var(--border-color)"><div class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"style="background:var(--bg-secondary);color:var(--error-color);border:1px solid var(--border-color)"></div><p class="text-sm flex-1"style=color:var(--text-secondary)>`), _tmpl$5$5 = /* @__PURE__ */ template(`<div class=text-sm style=color:var(--text-muted)>No specific actions recommended at this time`), _tmpl$6$3 = /* @__PURE__ */ template(`<div class="flex items-start gap-3 p-3 rounded-lg"style="background:var(--glass-gradient);border:1px solid var(--border-color)"><div class="flex-shrink-0 mt-0.5"style=color:var(--success-color)>✓</div><p class="text-sm flex-1"style=color:var(--text-secondary)>`);
const Suggestions = (props) => {
  return (() => {
    var _el$ = _tmpl$2$7(), _el$2 = _el$.firstChild, _el$3 = _el$2.nextSibling, _el$4 = _el$3.firstChild, _el$5 = _el$4.nextSibling, _el$6 = _el$3.nextSibling; _el$6.firstChild; var _el$9 = _el$6.nextSibling; _el$9.firstChild; var _el$10 = _el$9.nextSibling; _el$10.firstChild;
    insert(_el$5, () => props.summary.last24hSummary);
    insert(_el$6, createComponent(Show, {
      get when() {
        return props.summary.topRiskAreas.length > 0;
      },
      get fallback() {
        return _tmpl$3$6();
      },
      get children() {
        var _el$8 = _tmpl$$7();
        insert(_el$8, createComponent(For, {
          get each() {
            return props.summary.topRiskAreas;
          },
          children: (risk, index) => (() => {
            var _el$13 = _tmpl$4$5(), _el$14 = _el$13.firstChild, _el$15 = _el$14.nextSibling;
            insert(_el$14, () => index() + 1);
            insert(_el$15, risk);
            return _el$13;
          })()
        }));
        return _el$8;
      }
    }), null);
    insert(_el$9, createComponent(Show, {
      get when() {
        return props.summary.recommendedActions.length > 0;
      },
      get fallback() {
        return _tmpl$5$5();
      },
      get children() {
        var _el$1 = _tmpl$$7();
        insert(_el$1, createComponent(For, {
          get each() {
            return props.summary.recommendedActions;
          },
          children: (action) => (() => {
            var _el$17 = _tmpl$6$3(), _el$18 = _el$17.firstChild, _el$19 = _el$18.nextSibling;
            insert(_el$19, action);
            return _el$17;
          })()
        }));
        return _el$1;
      }
    }), null);
    insert(_el$10, () => new Date(props.summary.generatedAt).toLocaleString(), null);
    return _el$;
  })();
};

var _tmpl$$6 = /* @__PURE__ */ template(`<div class="text-center py-8"style=color:var(--text-muted)><p>No ML events in the selected time range`), _tmpl$2$6 = /* @__PURE__ */ template(`<div class=space-y-4>`), _tmpl$3$5 = /* @__PURE__ */ template(`<div><div class="flex items-center justify-between mb-4"><h3 class="text-lg font-semibold"style=color:var(--text-primary)>ML Timeline</h3><span class="text-sm px-2 py-1 rounded"style="background:var(--glass-gradient);color:var(--info-color);border:1px solid var(--border-color)"> events`), _tmpl$4$4 = /* @__PURE__ */ template(`<span>• `), _tmpl$5$4 = /* @__PURE__ */ template(`<div class="flex items-center gap-2 text-xs"style=color:var(--text-muted)><span class="px-2 py-0.5 rounded"style="background:var(--bg-secondary);color:var(--info-color);border:1px solid var(--border-color)"></span><span>`), _tmpl$6$2 = /* @__PURE__ */ template(`<div class="flex gap-4 p-4 rounded-lg border"style=background:var(--bg-tertiary);borderColor:var(--border-color)><div class="flex flex-col items-center"><div class="w-10 h-10 rounded-full flex items-center justify-center"style=background:var(--bg-secondary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2></path></svg></div><div class="flex-1 w-0.5 mt-2"style=background:var(--border-color)></div></div><div class="flex-1 min-w-0"><div class="flex items-start justify-between gap-2 mb-1"><h4 class=font-medium style=color:var(--text-primary)></h4><span class="text-xs whitespace-nowrap"style=color:var(--text-muted)></span></div><p class="text-sm mb-2"style=color:var(--text-secondary)>`);
const MLTimeline = (props) => {
  const getEventIcon = (type) => {
    switch (type) {
      case "training_failure":
        return "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z";
      case "gpu_spike":
        return "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z";
      case "model_deployment":
        return "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10";
      case "drift_detected":
        return "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4";
      default:
        return "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z";
    }
  };
  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "var(--error-color)";
      case "warning":
        return "var(--warning-color)";
      case "info":
        return "var(--info-color)";
      default:
        return "var(--text-muted)";
    }
  };
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = /* @__PURE__ */ new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1e3 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1e3 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };
  return (() => {
    var _el$ = _tmpl$3$5(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling, _el$5 = _el$4.firstChild;
    insert(_el$4, () => props.events.length, _el$5);
    insert(_el$, createComponent(Show, {
      get when() {
        return props.events.length === 0;
      },
      get children() {
        return _tmpl$$6();
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return props.events.length > 0;
      },
      get children() {
        var _el$7 = _tmpl$2$6();
        insert(_el$7, createComponent(For, {
          get each() {
            return props.events;
          },
          children: (event) => {
            const severityColor = getSeverityColor(event.severity);
            return (() => {
              var _el$8 = _tmpl$6$2(), _el$9 = _el$8.firstChild, _el$0 = _el$9.firstChild, _el$1 = _el$0.firstChild, _el$10 = _el$1.firstChild; _el$0.nextSibling; var _el$12 = _el$9.nextSibling, _el$13 = _el$12.firstChild, _el$14 = _el$13.firstChild, _el$15 = _el$14.nextSibling, _el$16 = _el$13.nextSibling;
              setStyleProperty(_el$0, "border", `2px solid ${severityColor}`);
              setStyleProperty(_el$1, "color", severityColor);
              insert(_el$14, () => event.title);
              insert(_el$15, () => formatTimestamp(event.timestamp));
              insert(_el$16, () => event.description);
              insert(_el$12, createComponent(Show, {
                get when() {
                  return event.resource;
                },
                get children() {
                  var _el$17 = _tmpl$5$4(), _el$18 = _el$17.firstChild, _el$19 = _el$18.nextSibling;
                  insert(_el$18, () => event.resource.kind);
                  insert(_el$19, () => event.resource.name);
                  insert(_el$17, createComponent(Show, {
                    get when() {
                      return event.resource.namespace;
                    },
                    get children() {
                      var _el$20 = _tmpl$4$4(); _el$20.firstChild;
                      insert(_el$20, () => event.resource.namespace, null);
                      return _el$20;
                    }
                  }), null);
                  return _el$17;
                }
              }), null);
              createRenderEffect(() => setAttribute(_el$10, "d", getEventIcon(event.type)));
              return _el$8;
            })();
          }
        }));
        return _el$7;
      }
    }), null);
    return _el$;
  })();
};

function getPredictionNavigationTarget(prediction) {
  switch (prediction.type) {
    case "artifact_growth":
      return {
        view: "storage",
        namespace: prediction.resource?.namespace,
        params: {
          filter: "mlflow",
          resource: prediction.resource?.name || "mlflow-artifacts"
        }
      };
    case "gpu_saturation":
      return {
        view: "nodes",
        params: {
          filter: "gpu",
          resource: prediction.resource?.name
        }
      };
    case "latency_increase":
      return {
        view: "services",
        namespace: prediction.resource?.namespace,
        resource: prediction.resource?.name
      };
    default:
      return {
        view: "dashboard"
      };
  }
}
function navigateToPrediction(prediction) {
  const target = getPredictionNavigationTarget(prediction);
  if (target.namespace) {
    setNamespace(target.namespace);
  }
  setCurrentView(target.view);
  if (target.resource) {
    sessionStorage.setItem(`kubegraf-highlight-${target.view}`, target.resource);
  }
  if (target.params) {
    Object.entries(target.params).forEach(([key, value]) => {
      sessionStorage.setItem(`kubegraf-filter-${target.view}-${key}`, value);
    });
  }
}
function getPredictionActions(prediction) {
  const actions = [];
  switch (prediction.type) {
    case "artifact_growth":
      actions.push(
        {
          label: "View Storage",
          icon: "📦",
          action: () => navigateToPrediction(prediction),
          type: "primary"
        },
        {
          label: "View MLflow",
          icon: "🔬",
          action: () => {
            setCurrentView("mlflow");
          },
          type: "secondary"
        },
        {
          label: "Cleanup Artifacts",
          icon: "🧹",
          action: () => {
            const resource = prediction.resource?.name || "mlflow-artifacts";
            sessionStorage.setItem("kubegraf-cleanup-artifacts", resource);
            setCurrentView("storage");
          },
          type: "secondary"
        }
      );
      break;
    case "gpu_saturation":
      actions.push(
        {
          label: "View Nodes",
          icon: "🖥️",
          action: () => navigateToPrediction(prediction),
          type: "primary"
        },
        {
          label: "View GPU Pods",
          icon: "⚡",
          action: () => {
            setCurrentView("pods");
            if (prediction.resource?.namespace) {
              setNamespace(prediction.resource.namespace);
            }
            sessionStorage.setItem("kubegraf-filter-pods-gpu", "true");
          },
          type: "secondary"
        },
        {
          label: "Scale Resources",
          icon: "📈",
          action: () => {
            setCurrentView("hpa");
            if (prediction.resource?.namespace) {
              setNamespace(prediction.resource.namespace);
            }
          },
          type: "secondary"
        }
      );
      break;
    case "latency_increase":
      actions.push(
        {
          label: "View Service",
          icon: "🔗",
          action: () => navigateToPrediction(prediction),
          type: "primary"
        },
        {
          label: "View Metrics",
          icon: "📊",
          action: () => {
            setCurrentView("dashboard");
            if (prediction.resource) {
              sessionStorage.setItem("kubegraf-view-metrics", prediction.resource.name);
            }
          },
          type: "secondary"
        },
        {
          label: "Scale Up",
          icon: "⬆️",
          action: () => {
            setCurrentView("deployments");
            if (prediction.resource?.namespace) {
              setNamespace(prediction.resource.namespace);
            }
            if (prediction.resource?.name) {
              sessionStorage.setItem("kubegraf-scale-deployment", prediction.resource.name);
            }
          },
          type: "secondary"
        }
      );
      break;
  }
  return actions;
}

function getPredictionRecommendations(prediction) {
  const recommendations = [];
  switch (prediction.type) {
    case "artifact_growth":
      recommendations.push(
        "Review and delete old model artifacts",
        "Configure artifact retention policies",
        "Consider archiving to cold storage",
        "Monitor storage usage trends"
      );
      break;
    case "gpu_saturation":
      recommendations.push(
        "Scale up GPU resources if available",
        "Review GPU allocation policies",
        "Consider using spot instances for non-critical workloads",
        "Optimize model inference to reduce GPU usage"
      );
      break;
    case "latency_increase":
      recommendations.push(
        "Scale up deployment replicas",
        "Review and optimize model inference code",
        "Check for resource constraints (CPU/Memory)",
        "Consider using model caching or batching"
      );
      break;
  }
  return recommendations;
}
function getActionPriority(prediction) {
  switch (prediction.severity) {
    case "critical":
      return "high";
    case "warning":
      return "medium";
    case "info":
      return "low";
    default:
      return "medium";
  }
}

var _tmpl$$5 = /* @__PURE__ */ template(`<span class="px-1.5 py-0.5 rounded text-xs font-medium"style=background:var(--error-color)20;color:var(--error-color)>High Priority`), _tmpl$2$5 = /* @__PURE__ */ template(`<span style=color:var(--text-muted)>• `), _tmpl$3$4 = /* @__PURE__ */ template(`<div class="mt-2 flex items-center gap-2 text-xs"><span class="px-2 py-0.5 rounded"style="background:var(--bg-secondary);color:var(--info-color);border:1px solid var(--border-color)"></span><span style=color:var(--text-muted)>`), _tmpl$4$3 = /* @__PURE__ */ template(`<div class="mt-3 pt-3 border-t flex flex-wrap gap-2"style=borderColor:var(--border-color)>`), _tmpl$5$3 = /* @__PURE__ */ template(`<div class="mt-3 pt-3 border-t"style=borderColor:var(--border-color)><div class="text-xs font-medium mb-2"style=color:var(--text-secondary)>💡 Recommendations:</div><ul class="space-y-1 text-xs"style=color:var(--text-muted)>`), _tmpl$6$1 = /* @__PURE__ */ template(`<div class="p-4 rounded-lg border cursor-pointer transition-all hover:shadow-lg"style=background:var(--bg-tertiary);borderLeftWidth:4px><div class="flex items-start gap-3 mb-3"><div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"style=background:var(--bg-secondary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2></path></svg></div><div class="flex-1 min-w-0"><div class="flex items-start justify-between gap-2 mb-1"><h4 class="font-medium hover:underline"title="Click to navigate to related section"style=color:var(--text-primary)></h4><div class="flex items-center gap-2"><span class="text-xs px-2 py-0.5 rounded"style="background:var(--bg-secondary);border:1px solid var(--border-color)">% confidence</span></div></div><p class="text-sm mb-2"style=color:var(--text-secondary)></p><div class="flex items-center gap-4 text-xs mb-2"style=color:var(--text-muted)><span>Timeframe: <strong style=color:var(--text-primary)></strong></span><span>Trend: <strong>`), _tmpl$7$1 = /* @__PURE__ */ template(`<button class="px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5"><span></span><span>`), _tmpl$8 = /* @__PURE__ */ template(`<li class="flex items-start gap-2"><span>•</span><span>`);
const MLPredictionCard = (props) => {
  const prediction = () => props.prediction;
  const actions = () => getPredictionActions(prediction());
  const recommendations = () => getPredictionRecommendations(prediction());
  const priority = () => getActionPriority(prediction());
  const getPredictionIcon = (type) => {
    switch (type) {
      case "gpu_saturation":
        return "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z";
      case "latency_increase":
        return "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6";
      case "artifact_growth":
        return "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4";
      default:
        return "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z";
    }
  };
  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "var(--error-color)";
      case "warning":
        return "var(--warning-color)";
      case "info":
        return "var(--info-color)";
      default:
        return "var(--text-muted)";
    }
  };
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return "var(--error-color)";
    if (confidence >= 0.6) return "var(--warning-color)";
    return "var(--info-color)";
  };
  const severityColor = () => getSeverityColor(prediction().severity);
  const confidenceColor = () => getConfidenceColor(prediction().confidence);
  return (() => {
    var _el$ = _tmpl$6$1(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$3.nextSibling, _el$7 = _el$6.firstChild, _el$8 = _el$7.firstChild, _el$9 = _el$8.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.firstChild, _el$10 = _el$7.nextSibling, _el$11 = _el$10.nextSibling, _el$12 = _el$11.firstChild, _el$13 = _el$12.firstChild, _el$14 = _el$13.nextSibling, _el$15 = _el$12.nextSibling, _el$16 = _el$15.firstChild, _el$17 = _el$16.nextSibling;
    _el$.$$click = () => navigateToPrediction(prediction());
    insert(_el$8, () => prediction().title);
    insert(_el$0, () => Math.round(prediction().confidence * 100), _el$1);
    insert(_el$10, () => prediction().description);
    insert(_el$14, () => prediction().timeframe);
    insert(_el$17, () => prediction().trend);
    insert(_el$11, createComponent(Show, {
      get when() {
        return priority() === "high";
      },
      get children() {
        return _tmpl$$5();
      }
    }), null);
    insert(_el$6, createComponent(Show, {
      get when() {
        return prediction().resource;
      },
      get children() {
        var _el$19 = _tmpl$3$4(), _el$20 = _el$19.firstChild, _el$21 = _el$20.nextSibling;
        insert(_el$20, () => prediction().resource.kind);
        insert(_el$21, () => prediction().resource.name);
        insert(_el$19, createComponent(Show, {
          get when() {
            return prediction().resource.namespace;
          },
          get children() {
            var _el$22 = _tmpl$2$5(); _el$22.firstChild;
            insert(_el$22, () => prediction().resource.namespace, null);
            return _el$22;
          }
        }), null);
        return _el$19;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return actions().length > 0;
      },
      get children() {
        var _el$24 = _tmpl$4$3();
        insert(_el$24, createComponent(For, {
          get each() {
            return actions();
          },
          children: (action) => (() => {
            var _el$28 = _tmpl$7$1(), _el$29 = _el$28.firstChild, _el$30 = _el$29.nextSibling;
            _el$28.addEventListener("mouseleave", (e) => {
              if (action.type !== "primary") {
                e.currentTarget.style.background = action.type === "danger" ? "var(--error-color)20" : "var(--bg-secondary)";
              }
            });
            _el$28.addEventListener("mouseenter", (e) => {
              if (action.type !== "primary") {
                e.currentTarget.style.background = "var(--bg-tertiary)";
              }
            });
            _el$28.$$click = (e) => {
              e.stopPropagation();
              action.action();
            };
            insert(_el$29, () => action.icon);
            insert(_el$30, () => action.label);
            createRenderEffect((_p$) => {
              var _v$7 = action.type === "primary" ? "var(--accent-primary)" : action.type === "danger" ? "var(--error-color)20" : "var(--bg-secondary)", _v$8 = action.type === "primary" ? "#000" : action.type === "danger" ? "var(--error-color)" : "var(--text-primary)", _v$9 = action.type === "primary" ? "none" : "1px solid var(--border-color)";
              _v$7 !== _p$.e && setStyleProperty(_el$28, "background", _p$.e = _v$7);
              _v$8 !== _p$.t && setStyleProperty(_el$28, "color", _p$.t = _v$8);
              _v$9 !== _p$.a && setStyleProperty(_el$28, "border", _p$.a = _v$9);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0
            });
            return _el$28;
          })()
        }));
        return _el$24;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return recommendations().length > 0;
      },
      get children() {
        var _el$25 = _tmpl$5$3(), _el$26 = _el$25.firstChild, _el$27 = _el$26.nextSibling;
        insert(_el$27, createComponent(For, {
          get each() {
            return recommendations();
          },
          children: (rec) => (() => {
            var _el$31 = _tmpl$8(), _el$32 = _el$31.firstChild, _el$33 = _el$32.nextSibling;
            insert(_el$33, rec);
            return _el$31;
          })()
        }));
        return _el$25;
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$ = severityColor(), _v$2 = `1px solid ${severityColor()}`, _v$3 = severityColor(), _v$4 = getPredictionIcon(prediction().type), _v$5 = confidenceColor(), _v$6 = prediction().trend === "increasing" ? "var(--error-color)" : "var(--success-color)";
      _v$ !== _p$.e && setStyleProperty(_el$, "borderColor", _p$.e = _v$);
      _v$2 !== _p$.t && setStyleProperty(_el$3, "border", _p$.t = _v$2);
      _v$3 !== _p$.a && setStyleProperty(_el$4, "color", _p$.a = _v$3);
      _v$4 !== _p$.o && setAttribute(_el$5, "d", _p$.o = _v$4);
      _v$5 !== _p$.i && setStyleProperty(_el$0, "color", _p$.i = _v$5);
      _v$6 !== _p$.n && setStyleProperty(_el$17, "color", _p$.n = _v$6);
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
  })();
};
delegateEvents(["click"]);

var _tmpl$$4 = /* @__PURE__ */ template(`<div class="text-center py-8"style=color:var(--text-muted)><p>No predictions available at this time`), _tmpl$2$4 = /* @__PURE__ */ template(`<div class=space-y-4>`), _tmpl$3$3 = /* @__PURE__ */ template(`<div><div class="flex items-center justify-between mb-4"><div><h3 class="text-lg font-semibold"style=color:var(--text-primary)>ML Predictions</h3><p class="text-xs mt-1"style=color:var(--text-muted)>Click on any prediction to navigate to the related section</p></div><span class="text-sm px-2 py-1 rounded"style="background:var(--glass-gradient);color:var(--warning-color);border:1px solid var(--border-color)"> forecasts`);
const MLPredictions = (props) => {
  return (() => {
    var _el$ = _tmpl$3$3(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling, _el$7 = _el$6.firstChild;
    insert(_el$6, () => props.predictions.length, _el$7);
    insert(_el$, createComponent(Show, {
      get when() {
        return props.predictions.length === 0;
      },
      get children() {
        return _tmpl$$4();
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return props.predictions.length > 0;
      },
      get children() {
        var _el$9 = _tmpl$2$4();
        insert(_el$9, createComponent(For, {
          get each() {
            return props.predictions;
          },
          children: (prediction) => createComponent(MLPredictionCard, {
            prediction
          })
        }));
        return _el$9;
      }
    }), null);
    return _el$;
  })();
};

var _tmpl$$3 = /* @__PURE__ */ template(`<div><h4 class="font-medium mb-3"style=color:var(--text-primary)>Key Insights</h4><div class=space-y-2>`), _tmpl$2$3 = /* @__PURE__ */ template(`<div><h4 class="font-medium mb-3"style=color:var(--text-primary)>Recommendations</h4><div class=space-y-2>`), _tmpl$3$2 = /* @__PURE__ */ template(`<div><div class="flex items-center justify-between mb-4"><h3 class="text-lg font-semibold"style=color:var(--text-primary)>ML Summary</h3><span class=text-xs style=color:var(--text-muted)></span></div><div class=space-y-6><div class="p-4 rounded-lg border"style=background:var(--bg-tertiary);borderColor:var(--border-color)><h4 class="font-medium mb-2"style=color:var(--text-primary)>Overview</h4><p class="text-sm whitespace-pre-line"style=color:var(--text-secondary)>`), _tmpl$4$2 = /* @__PURE__ */ template(`<div class="flex items-start gap-3 p-3 rounded-lg"style="background:var(--glass-gradient);borderLeft:3px solid var(--info-color);border:1px solid var(--border-color);borderLeftWidth:3px"><svg class="w-5 h-5 flex-shrink-0 mt-0.5"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--info-color)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><p class="text-sm flex-1"style=color:var(--text-secondary)>`), _tmpl$5$2 = /* @__PURE__ */ template(`<div class="flex items-start gap-3 p-3 rounded-lg"style="background:var(--glass-gradient);borderLeft:3px solid var(--warning-color);border:1px solid var(--border-color);borderLeftWidth:3px"><svg class="w-5 h-5 flex-shrink-0 mt-0.5"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--warning-color)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg><p class="text-sm flex-1"style=color:var(--text-secondary)>`);
const MLSummary = (props) => {
  return (() => {
    var _el$ = _tmpl$3$2(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling, _el$5 = _el$2.nextSibling, _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild, _el$8 = _el$7.nextSibling;
    insert(_el$4, () => props.summary.timeRange);
    insert(_el$8, () => props.summary.summary);
    insert(_el$5, createComponent(Show, {
      get when() {
        return memo(() => !!props.summary.keyInsights)() && props.summary.keyInsights.length > 0;
      },
      get children() {
        var _el$9 = _tmpl$$3(), _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling;
        insert(_el$1, createComponent(For, {
          get each() {
            return props.summary.keyInsights;
          },
          children: (insight) => (() => {
            var _el$13 = _tmpl$4$2(), _el$14 = _el$13.firstChild, _el$15 = _el$14.nextSibling;
            insert(_el$15, insight);
            return _el$13;
          })()
        }));
        return _el$9;
      }
    }), null);
    insert(_el$5, createComponent(Show, {
      get when() {
        return memo(() => !!props.summary.recommendations)() && props.summary.recommendations.length > 0;
      },
      get children() {
        var _el$10 = _tmpl$2$3(), _el$11 = _el$10.firstChild, _el$12 = _el$11.nextSibling;
        insert(_el$12, createComponent(For, {
          get each() {
            return props.summary.recommendations;
          },
          children: (recommendation) => (() => {
            var _el$16 = _tmpl$5$2(), _el$17 = _el$16.firstChild, _el$18 = _el$17.nextSibling;
            insert(_el$18, recommendation);
            return _el$16;
          })()
        }));
        return _el$10;
      }
    }), null);
    return _el$;
  })();
};

var _tmpl$$2 = /* @__PURE__ */ template(`<div class="fixed right-0 z-50 flex"style=top:112px;bottom:0><div class="fixed inset-0 transition-opacity"style="background:rgba(0, 0, 0, 0.5)"></div><div class="relative flex flex-col w-full max-w-2xl shadow-xl transition-transform duration-300 ease-in-out"style="borderLeft:1px solid var(--border-color)"><div class="flex items-center justify-between p-4 border-b"style=borderColor:var(--border-color)><div class="flex items-center gap-3"><div class=text-2xl>🧠</div><div><h2 class="text-xl font-bold"style=background:var(--accent-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text>Brain</h2><p class=text-xs style=color:var(--text-muted)>Intelligent SRE insights for your cluster</p></div></div><div class="flex items-center gap-2"><button class="p-2 rounded-lg transition-colors"title="Refresh Brain insights"style=color:var(--text-muted);background:transparent><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button><button class="p-2 rounded-lg transition-colors"style=background:transparent><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"></svg></button><button class="p-2 rounded-lg transition-colors"style=color:var(--text-muted);background:transparent><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M6 18L18 6M6 6l12 12"></path></svg></button></div></div><div class="flex-1 overflow-y-auto p-6 space-y-8"style="scrollbar-width:thin;scrollbar-color:var(--border-color) var(--bg-primary)">`), _tmpl$2$2 = /* @__PURE__ */ template(`<svg><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></svg>`, false, true, false), _tmpl$3$1 = /* @__PURE__ */ template(`<svg><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"fill=none></svg>`, false, true, false), _tmpl$4$1 = /* @__PURE__ */ template(`<div class="flex items-center justify-center h-64"><div class=text-center><div class="inline-block w-8 h-8 border-4 rounded-full animate-spin mx-auto mb-4"style=borderColor:var(--accent-primary);borderTopColor:transparent></div><p style=color:var(--text-muted)>Loading Brain insights...`), _tmpl$5$1 = /* @__PURE__ */ template(`<div class="border-t pt-8"style=borderColor:var(--border-color)>`);
let brainDataCache = {
  data: null,
  timestamp: 0
};
const CACHE_TTL = 6e4;
const BrainPanel = () => {
  const theme = createMemo(() => getTheme());
  let refreshInterval;
  const [brainData, {
    refetch: refetchBrainData
  }] = createResource(() => brainPanelOpen(), async () => {
    if (!brainPanelOpen()) {
      return {
        timelineEvents: [],
        oomMetrics: {
          incidents24h: 0,
          crashLoops24h: 0,
          topProblematic: []
        },
        summary: {
          last24hSummary: "",
          topRiskAreas: [],
          recommendedActions: [],
          generatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      };
    }
    const now = Date.now();
    if (brainDataCache.data && now - brainDataCache.timestamp < CACHE_TTL) {
      console.log("[Brain] Using cached data");
      return brainDataCache.data;
    }
    try {
      console.log("[Brain] Fetching fresh data...");
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Brain data fetch timeout")), 9e4);
      });
      const data = await Promise.race([fetchBrainDataInParallel(), timeoutPromise]);
      brainDataCache = {
        data,
        timestamp: now
      };
      return data;
    } catch (error) {
      console.error("[Brain] Brain data fetch error:", error);
      if (brainDataCache.data) {
        console.log("[Brain] Using expired cache due to fetch error");
        return brainDataCache.data;
      }
      try {
        const data = await fetchBrainDataInParallel();
        brainDataCache = {
          data,
          timestamp: now
        };
        return data;
      } catch (fallbackError) {
        console.error("[Brain] Brain data fallback fetch also failed:", fallbackError);
        return {
          timelineEvents: [],
          oomMetrics: {
            incidents24h: 0,
            crashLoops24h: 0,
            topProblematic: []
          },
          summary: {
            last24hSummary: "Unable to load brain insights. The cluster may be unavailable or the request timed out. Please check your cluster connection and try again.",
            topRiskAreas: ["Cluster connection may be unavailable", "Request may have timed out"],
            recommendedActions: ["Verify cluster connection", "Check if cluster is accessible", "Try refreshing the panel"],
            generatedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        };
      }
    }
  });
  onMount(() => {
    if (brainPanelOpen()) {
      refreshInterval = setInterval(() => {
        if (brainPanelOpen()) {
          console.log("[Brain] Auto-refreshing data...");
          brainDataCache.timestamp = 0;
          refetchBrainData();
        }
      }, 3e5);
    }
  });
  onCleanup(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });
  return createComponent(Show, {
    get when() {
      return brainPanelOpen();
    },
    get children() {
      var _el$ = _tmpl$$2(), _el$2 = _el$.firstChild, _el$3 = _el$2.nextSibling, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$5.firstChild, _el$7 = _el$6.nextSibling, _el$8 = _el$7.firstChild; _el$8.nextSibling; var _el$0 = _el$5.nextSibling, _el$1 = _el$0.firstChild, _el$10 = _el$1.nextSibling, _el$11 = _el$10.firstChild, _el$12 = _el$10.nextSibling, _el$13 = _el$4.nextSibling;
      _el$2.$$click = () => !brainPanelPinned() && toggleBrainPanel();
      _el$1.addEventListener("mouseleave", (e) => e.currentTarget.style.background = "transparent");
      _el$1.addEventListener("mouseenter", (e) => e.currentTarget.style.background = "var(--bg-tertiary)");
      _el$1.$$click = () => {
        brainDataCache.timestamp = 0;
        refetchBrainData();
      };
      _el$10.addEventListener("mouseleave", (e) => e.currentTarget.style.background = "transparent");
      _el$10.addEventListener("mouseenter", (e) => e.currentTarget.style.background = "var(--bg-tertiary)");
      addEventListener(_el$10, "click", toggleBrainPanelPin, true);
      insert(_el$11, (() => {
        var _c$ = memo(() => !!brainPanelPinned());
        return () => _c$() ? _tmpl$2$2() : _tmpl$3$1();
      })());
      _el$12.addEventListener("mouseleave", (e) => e.currentTarget.style.background = "transparent");
      _el$12.addEventListener("mouseenter", (e) => e.currentTarget.style.background = "var(--bg-tertiary)");
      addEventListener(_el$12, "click", toggleBrainPanel, true);
      insert(_el$13, createComponent(Show, {
        get when() {
          return memo(() => !!!brainData.loading)() && brainData();
        },
        get fallback() {
          return (() => {
            var _el$16 = _tmpl$4$1(), _el$17 = _el$16.firstChild, _el$18 = _el$17.firstChild; _el$18.nextSibling;
            return _el$16;
          })();
        },
        get children() {
          return (() => {
            const data = brainData();
            return [createComponent(ClusterTimeline, {
              get events() {
                return data.timelineEvents || [];
              }
            }), (() => {
              var _el$20 = _tmpl$5$1();
              insert(_el$20, createComponent(OOMInsights, {
                get metrics() {
                  return data.oomMetrics || {
                    incidents24h: 0,
                    crashLoops24h: 0,
                    topProblematic: []
                  };
                }
              }));
              return _el$20;
            })(), (() => {
              var _el$21 = _tmpl$5$1();
              insert(_el$21, createComponent(Suggestions, {
                get summary() {
                  return data.summary || {
                    last24hSummary: "",
                    topRiskAreas: [],
                    recommendedActions: [],
                    generatedAt: (/* @__PURE__ */ new Date()).toISOString()
                  };
                }
              }));
              return _el$21;
            })(), createComponent(Show, {
              get when() {
                return memo(() => !!(settings().showMLTimelineInBrain && data.mlTimeline && data.mlPredictions))() && data.mlSummary;
              },
              get children() {
                return [(() => {
                  var _el$22 = _tmpl$5$1();
                  insert(_el$22, createComponent(MLTimeline, {
                    get events() {
                      return data.mlTimeline?.events || [];
                    }
                  }));
                  return _el$22;
                })(), (() => {
                  var _el$23 = _tmpl$5$1();
                  insert(_el$23, createComponent(MLPredictions, {
                    get predictions() {
                      return data.mlPredictions?.predictions || [];
                    }
                  }));
                  return _el$23;
                })(), (() => {
                  var _el$24 = _tmpl$5$1();
                  insert(_el$24, createComponent(MLSummary, {
                    get summary() {
                      return data.mlSummary || {
                        summary: "",
                        keyInsights: [],
                        recommendations: [],
                        generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
                        timeRange: "last 24 hours"
                      };
                    }
                  }));
                  return _el$24;
                })()];
              }
            })];
          })();
        }
      }));
      createRenderEffect((_p$) => {
        var _v$ = brainPanelOpen() ? "auto" : "none", _v$2 = brainPanelOpen() ? 1 : 0, _v$3 = brainPanelOpen() ? "auto" : "none", _v$4 = brainPanelOpen() ? "translateX(0)" : "translateX(100%)", _v$5 = theme().colors.bgCard, _v$6 = theme().colors.textPrimary, _v$7 = brainPanelPinned() ? "Unpin panel" : "Pin panel", _v$8 = brainPanelPinned() ? "var(--accent-primary)" : "var(--text-muted)";
        _v$ !== _p$.e && setStyleProperty(_el$, "pointerEvents", _p$.e = _v$);
        _v$2 !== _p$.t && setStyleProperty(_el$2, "opacity", _p$.t = _v$2);
        _v$3 !== _p$.a && setStyleProperty(_el$2, "pointerEvents", _p$.a = _v$3);
        _v$4 !== _p$.o && setStyleProperty(_el$3, "transform", _p$.o = _v$4);
        _v$5 !== _p$.i && setStyleProperty(_el$3, "background", _p$.i = _v$5);
        _v$6 !== _p$.n && setStyleProperty(_el$3, "color", _p$.n = _v$6);
        _v$7 !== _p$.s && setAttribute(_el$10, "title", _p$.s = _v$7);
        _v$8 !== _p$.h && setStyleProperty(_el$10, "color", _p$.h = _v$8);
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
    }
  });
};
delegateEvents(["click"]);

function parseNamespaceFilter(query) {
  const nsMatch = query.match(/^ns:(\w+)\s*(.*)$/i);
  if (nsMatch) {
    return {
      namespace: nsMatch[1],
      remainingQuery: nsMatch[2].trim()
    };
  }
  return { remainingQuery: query };
}
function matchesQuery(action, query) {
  const lowerQuery = query.toLowerCase();
  const searchableText = [
    action.title,
    action.subtitle,
    ...action.keywords || []
  ].filter(Boolean).join(" ").toLowerCase();
  return searchableText.includes(lowerQuery);
}
function getNavigationActions() {
  const actions = [];
  navSections.forEach((section) => {
    section.items.forEach((item) => {
      actions.push({
        id: `nav-${item.id}`,
        title: item.label,
        subtitle: section.title,
        keywords: [item.id, section.title.toLowerCase()],
        icon: item.icon,
        category: section.title,
        run: () => {
          setCurrentView(item.id);
        }
      });
    });
  });
  return actions;
}
function getCommandActions() {
  return [
    ...getNavigationActions()
    // Add more actions here as needed
  ];
}
function filterActions(actions, query) {
  const { namespace, remainingQuery } = parseNamespaceFilter(query);
  if (!remainingQuery) {
    return actions;
  }
  return actions.filter((action) => matchesQuery(action, remainingQuery));
}
function groupActionsByCategory(actions) {
  const grouped = /* @__PURE__ */ new Map();
  actions.forEach((action) => {
    const category = action.category || "Other";
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category).push(action);
  });
  return grouped;
}

var _tmpl$$1 = /* @__PURE__ */ template(`<button class="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[var(--bg-secondary)]"style=color:var(--text-muted)><svg class="w-3 h-3"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M6 18L18 6M6 6l12 12">`), _tmpl$2$1 = /* @__PURE__ */ template(`<div class="fixed z-[9999]"role=dialog aria-modal=true aria-label="Command Palette"style="width:320px;maxWidth:90vw;animation:slideDown 0.15s ease-out"><div class="rounded-lg shadow-2xl overflow-hidden"style="background:var(--bg-card);border:1px solid var(--border-color)"><div class="p-1.5 border-b"style=border-color:var(--border-color)><div class=relative><svg class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--text-muted)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg><input type=text placeholder=Search... class="w-full pl-7 pr-7 py-1.5 rounded text-xs"autofocus style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"></div></div><div class="max-h-64 overflow-y-auto"style=background:var(--bg-card)></div><div class="px-2 py-1 border-t flex items-center justify-between text-xs"style=border-color:var(--border-color);color:var(--text-muted);background:var(--bg-secondary)><div class="text-xs opacity-70"> results</div><div class="flex items-center gap-1.5 text-xs opacity-70"><span>↑↓</span><span>↵</span><span>Esc`), _tmpl$3 = /* @__PURE__ */ template(`<style>
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-5px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `), _tmpl$4 = /* @__PURE__ */ template(`<div class="p-3 text-center"style=color:var(--text-muted)><p class=text-xs>No results`), _tmpl$5 = /* @__PURE__ */ template(`<div class=py-0.5><div class="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"style=color:var(--text-muted)>`), _tmpl$6 = /* @__PURE__ */ template(`<svg class="w-3.5 h-3.5 flex-shrink-0"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2>`), _tmpl$7 = /* @__PURE__ */ template(`<button class="w-full px-2 py-1 text-left flex items-center gap-1.5 transition-colors"><div class="flex-1 min-w-0"><div class="text-xs font-medium truncate">`);
const CommandPalette = (props) => {
  const [query, setQuery] = createSignal("");
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [position, setPosition] = createSignal({
    top: 0,
    left: 0
  });
  let inputRef;
  let containerRef;
  let previousActiveElement = null;
  const allActions = getCommandActions();
  const filteredActions = createMemo(() => {
    const q = query().trim();
    if (!q) {
      return allActions;
    }
    return filterActions(allActions, q);
  });
  const groupedActions = createMemo(() => {
    return groupActionsByCategory(filteredActions());
  });
  const flatActions = createMemo(() => {
    const flat = [];
    groupedActions().forEach((actions) => {
      flat.push(...actions);
    });
    return flat;
  });
  createEffect(() => {
    query();
    setSelectedIndex(0);
  });
  createEffect(() => {
    if (props.isOpen && props.buttonRef) {
      const rect = props.buttonRef.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        // 4px gap below button
        left: rect.left
        // Align left edge with button
      });
    }
  });
  createEffect(() => {
    if (props.isOpen) {
      previousActiveElement = document.activeElement;
      setTimeout(() => {
        inputRef?.focus();
      }, 0);
    } else {
      if (previousActiveElement) {
        previousActiveElement.focus();
        previousActiveElement = null;
      }
    }
  });
  const handleKeyDown = (e) => {
    if (!props.isOpen) return;
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        props.onClose();
        break;
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => {
          const max = flatActions().length - 1;
          return prev < max ? prev + 1 : prev;
        });
        scrollToSelected();
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => prev > 0 ? prev - 1 : 0);
        scrollToSelected();
        break;
      case "Enter":
        e.preventDefault();
        const selected = flatActions()[selectedIndex()];
        if (selected) {
          selected.run();
          props.onClose();
          setQuery("");
        }
        break;
      case "Tab":
        e.preventDefault();
        break;
    }
  };
  const scrollToSelected = () => {
    const container = containerRef;
    if (!container) return;
    const selectedElement = container.querySelector(`[data-index="${selectedIndex()}"]`);
    if (selectedElement) {
      selectedElement.scrollIntoView({
        block: "nearest",
        behavior: "smooth"
      });
    }
  };
  onMount(() => {
    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => {
      document.removeEventListener("keydown", handleKeyDown);
    });
  });
  createEffect(() => {
    if (props.isOpen) {
      const handleClickOutside = (e) => {
        const target = e.target;
        const paletteElement = containerRef;
        if (paletteElement && !paletteElement.contains(target) && !props.buttonRef?.contains(target)) {
          props.onClose();
        }
      };
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);
      onCleanup(() => {
        document.removeEventListener("mousedown", handleClickOutside);
      });
    }
  });
  return createComponent(Show, {
    get when() {
      return props.isOpen;
    },
    get children() {
      return [createComponent(Portal, {
        get children() {
          var _el$ = _tmpl$2$1(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling, _el$8 = _el$3.nextSibling, _el$9 = _el$8.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.firstChild;
          _el$.$$click = (e) => e.stopPropagation();
          _el$6.$$input = (e) => setQuery(e.currentTarget.value);
          var _ref$ = inputRef;
          typeof _ref$ === "function" ? use(_ref$, _el$6) : inputRef = _el$6;
          insert(_el$4, createComponent(Show, {
            get when() {
              return query();
            },
            get children() {
              var _el$7 = _tmpl$$1();
              _el$7.$$click = () => setQuery("");
              return _el$7;
            }
          }), null);
          var _ref$2 = containerRef;
          typeof _ref$2 === "function" ? use(_ref$2, _el$8) : containerRef = _el$8;
          insert(_el$8, createComponent(Show, {
            get when() {
              return flatActions().length > 0;
            },
            get fallback() {
              return _tmpl$4();
            },
            get children() {
              return createComponent(For, {
                get each() {
                  return Array.from(groupedActions().entries());
                },
                children: ([category, actions]) => (() => {
                  var _el$12 = _tmpl$5(), _el$13 = _el$12.firstChild;
                  insert(_el$13, category);
                  insert(_el$12, createComponent(For, {
                    each: actions,
                    children: (action, localIndex) => {
                      let flatIdx = 0;
                      let found = false;
                      groupedActions().forEach((catActions, cat) => {
                        if (found) return;
                        if (cat === category) {
                          flatIdx += localIndex();
                          found = true;
                        } else {
                          flatIdx += catActions.length;
                        }
                      });
                      const isSelected = () => flatIdx === selectedIndex();
                      return (() => {
                        var _el$14 = _tmpl$7(), _el$17 = _el$14.firstChild, _el$18 = _el$17.firstChild;
                        _el$14.addEventListener("mouseenter", () => setSelectedIndex(flatIdx));
                        _el$14.$$click = () => {
                          action.run();
                          props.onClose();
                          setQuery("");
                        };
                        setAttribute(_el$14, "data-index", flatIdx);
                        insert(_el$14, createComponent(Show, {
                          get when() {
                            return action.icon;
                          },
                          get children() {
                            var _el$15 = _tmpl$6(), _el$16 = _el$15.firstChild;
                            createRenderEffect(() => setAttribute(_el$16, "d", action.icon));
                            return _el$15;
                          }
                        }), _el$17);
                        insert(_el$18, () => action.title);
                        createRenderEffect((_p$) => {
                          var _v$3 = isSelected() ? "var(--bg-tertiary)" : "transparent", _v$4 = isSelected() ? "var(--accent-primary)" : "var(--text-primary)";
                          _v$3 !== _p$.e && setStyleProperty(_el$14, "background", _p$.e = _v$3);
                          _v$4 !== _p$.t && setStyleProperty(_el$14, "color", _p$.t = _v$4);
                          return _p$;
                        }, {
                          e: void 0,
                          t: void 0
                        });
                        return _el$14;
                      })();
                    }
                  }), null);
                  return _el$12;
                })()
              });
            }
          }));
          insert(_el$0, () => flatActions().length, _el$1);
          createRenderEffect((_p$) => {
            var _v$ = `${position().top}px`, _v$2 = `${position().left}px`;
            _v$ !== _p$.e && setStyleProperty(_el$, "top", _p$.e = _v$);
            _v$2 !== _p$.t && setStyleProperty(_el$, "left", _p$.t = _v$2);
            return _p$;
          }, {
            e: void 0,
            t: void 0
          });
          createRenderEffect(() => _el$6.value = query());
          return _el$;
        }
      }), _tmpl$3()];
    }
  });
};
delegateEvents(["click", "input"]);

class BackgroundPrefetchService {
  initialized = false;
  prefetchPromise = null;
  /**
   * Initialize background pre-fetching
   * Runs all critical data fetches in parallel
   */
  async initialize() {
    if (this.initialized) return;
    this.initialized = true;
    this.prefetchPromise = this.prefetchAll();
  }
  /**
   * Pre-fetch all critical data in parallel
   */
  async prefetchAll() {
    try {
      await Promise.allSettled([
        // 1. Cluster status (critical for header)
        api.getStatus().catch(() => null),
        // 2. Namespaces (critical for namespace selector)
        api.getNamespaceNames().catch(() => null),
        // 3. Cloud info (for header badge)
        api.getCloudInfo().catch(() => null),
        // 4. Lightweight Brain data (for faster Brain panel)
        preFetchBrainData(),
        // 5. Contexts (for cluster selector)
        api.getContexts().catch(() => null)
      ]);
      console.debug("Background pre-fetch completed");
    } catch (error) {
      console.debug("Background pre-fetch error:", error);
    }
  }
  /**
   * Wait for pre-fetch to complete (useful for testing)
   */
  async waitForPrefetch() {
    if (this.prefetchPromise) {
      await this.prefetchPromise;
    }
  }
  /**
   * Reset the service (for testing)
   */
  reset() {
    this.initialized = false;
    this.prefetchPromise = null;
  }
}
const backgroundPrefetch = new BackgroundPrefetchService();

var _tmpl$ = /* @__PURE__ */ template(`<div class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"style=background:var(--bg-secondary);color:var(--text-muted)><span></span><span>`), _tmpl$2 = /* @__PURE__ */ template(`<div class="fixed bottom-4 z-50"style=left:80px>`);
const App = () => {
  const [connectionStatus, {
    refetch: refetchStatus
  }] = createResource(() => api.getStatus());
  const [wsConnected, setWsConnected] = createSignal(false);
  onMount(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k" && !e.shiftKey) {
        const target = e.target;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        openCommandPalette();
      }
    };
    document.addEventListener("keydown", handleGlobalKeyDown);
    backgroundPrefetch.initialize();
    refreshClusterStatus();
    setTimeout(() => {
      const status = connectionStatus();
      const view = currentView();
      if (status?.connected) {
        return;
      }
      const noConnectionViews = [
        "clustermanager",
        "settings",
        "logs",
        "privacy",
        "documentation",
        "apps",
        "plugins",
        "uidemo"
        // allow UI demo (including ExecutionPanel) even when not connected
      ];
      if (!noConnectionViews.includes(view)) {
        console.log("[App] Not connected - redirecting to Cluster Manager");
        setCurrentView("clustermanager");
      }
    }, 500);
    api.autoCheckUpdate().then((info) => {
      setUpdateInfo(info);
    }).catch((err) => {
      console.debug("Auto-update check failed:", err);
    });
    autoReattachMostRecentRunning().catch((err) => {
      console.debug("[App] Failed to auto-reattach execution:", err);
    });
    api.getContinuitySummary("7d").then((summary) => {
      try {
        const lastSeenAt = new Date(summary.last_seen_at);
        const now = /* @__PURE__ */ new Date();
        const diffHours = (now.getTime() - lastSeenAt.getTime()) / (1e3 * 60 * 60);
        if (diffHours > 24 && currentView() === "dashboard") {
          setTimeout(() => {
            setCurrentView("continuity");
          }, 1e3);
        }
      } catch (err) {
        console.debug("Failed to check last seen time:", err);
      }
    }).catch((err) => {
      console.debug("Failed to fetch continuity summary for auto-redirect:", err);
    });
    const unsubscribe = wsService.subscribe((msg) => {
      if (msg.type === "connection") {
        setWsConnected(msg.data.connected);
      }
    });
    return () => {
      unsubscribe();
      wsService.disconnect();
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  });
  const isConnected = () => connectionStatus()?.connected !== false;
  return createComponent(QueryClientProvider, {
    get children() {
      return createComponent(WebSocketProvider, {
        get children() {
          return [createComponent(AppShell, {
            get children() {
              return createComponent(AppContent, {
                isConnected,
                connectionStatus: () => connectionStatus(),
                refetchStatus
              });
            }
          }), createComponent(Show, {
            get when() {
              return aiPanelOpen();
            },
            get children() {
              return createComponent(AIChat, {});
            }
          }), createComponent(BrainPanel, {}), createComponent(CommandPalette, {
            get isOpen() {
              return isOpen();
            },
            onClose: closeCommandPalette,
            get buttonRef() {
              return buttonRef();
            }
          }), (() => {
            var _el$ = _tmpl$2();
            insert(_el$, createComponent(Show, {
              get when() {
                return sidebarCollapsed$1();
              },
              get children() {
                var _el$2 = _tmpl$(), _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling;
                insert(_el$4, () => wsConnected() ? "Live" : "Offline");
                createRenderEffect(() => className(_el$3, `w-2 h-2 rounded-full ${wsConnected() ? "bg-green-500" : "bg-red-500"}`));
                return _el$2;
              }
            }));
            return _el$;
          })()];
        }
      });
    }
  });
};

const root = document.getElementById("root");
if (root) {
  render(() => createComponent(App, {}), root);
}

export { classList as $, refetchNodes as A, podsResource as B, deploymentsResource as C, servicesResource as D, onCleanup as E, For as F, addNotification as G, selectedNamespaces$1 as H, setNamespaces$1 as I, searchQuery as J, setSearchQuery as K, use as L, Modal as M, setGlobalLoading as N, startExecution as O, namespace as P, searchQuery$1 as Q, Switch as R, Show as S, Match as T, on as U, settings as V, wsService as W, getCacheKey as X, getCachedResource as Y, setCachedResource as Z, Portal as _, createMemo as a, themes as a0, currentTheme as a1, fetchAPI as a2, setSelectedResource as a3, setExecutionStateFromResult as a4, setNamespace as a5, onClusterSwitch as a6, currentView as a7, addDeployment as a8, updateDeploymentTask as a9, addPersistentNotification as aa, refreshClusterData as ab, refreshClusterStatus as ac, clusterManagerStatus as ad, disconnectActiveCluster as ae, clusterLoading as af, discoveredClusters as ag, clusters as ah, connectToCluster as ai, setDefaultCluster as aj, runtimeContexts as ak, switchContext as al, LocalTerminal as am, setAIPanelOpen as an, AIChat as ao, visibleThemes as ap, namespaces as aq, resetSettings as ar, setTheme as as, updateSetting as at, mergeProps as au, batch as b, createSignal as c, createComponent as d, setAttribute as e, createRenderEffect as f, className as g, setStyleProperty as h, insert as i, createResource as j, api as k, currentContext as l, memo as m, createEffect as n, onMount as o, nodesResource as p, style as q, refreshTrigger as r, setCurrentView as s, template as t, addEventListener as u, delegateEvents as v, clusterStatus as w, refetchPods as x, refetchDeployments as y, refetchServices as z };
//# sourceMappingURL=index-B8I71-mz.js.map
