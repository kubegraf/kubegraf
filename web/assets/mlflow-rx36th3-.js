import { a2 as fetchAPI } from './index-B8I71-mz.js';

const mlflowService = {
  getStatus: async () => {
    return fetchAPI("/mlflow/status");
  },
  install: async (request) => {
    return fetchAPI("/mlflow/install", {
      method: "POST",
      body: JSON.stringify(request)
    });
  },
  getVersions: async () => {
    return fetchAPI("/mlflow/versions");
  },
  upgrade: async (namespace, version) => {
    return fetchAPI("/mlflow/upgrade", {
      method: "POST",
      body: JSON.stringify({ namespace, version })
    });
  },
  proxy: async (path, options) => {
    return fetch(`/api/mlflow/proxy${path}`, options);
  }
};

export { mlflowService as m };
//# sourceMappingURL=mlflow-rx36th3-.js.map
