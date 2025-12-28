(function () {
  'use strict';

  self.onmessage = (event) => {
    const { items, query } = event.data;
    const q = (query || "").toLowerCase().trim();
    if (!q) {
      self.postMessage({ items });
      return;
    }
    const filtered = items.filter((x) => (x || "").toLowerCase().includes(q));
    self.postMessage({ items: filtered });
  };

})();
//# sourceMappingURL=listFilter.worker-B0CrzKhi.js.map
