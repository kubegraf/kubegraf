import { c as createSignal, j as createResource, k as api, t as template, i as insert, d as createComponent, f as createRenderEffect, h as setStyleProperty, e as setAttribute, F as For, m as memo, S as Show, v as delegateEvents } from './index-NnaOo1cf.js';

var _tmpl$ = /* @__PURE__ */ template(`<div><h2 class="text-xl font-semibold mb-4"style=color:var(--text-primary)>Configured Connectors</h2><div class=space-y-4>`), _tmpl$2 = /* @__PURE__ */ template(`<div class="space-y-6 p-6"style=minHeight:100vh;background:var(--bg-primary)><div class="flex items-center justify-between"><div><h1 class="text-3xl font-bold"style=color:var(--text-primary)>Connectors</h1><p style=color:var(--text-secondary)>Connect KubeGraf to external services for notifications and integrations</p></div></div><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">`), _tmpl$3 = /* @__PURE__ */ template(`<div class="card p-4 cursor-pointer hover:scale-105 transition-transform"><div class="flex items-center gap-3 mb-2"><div class="w-10 h-10 rounded-lg flex items-center justify-center"><svg class="w-6 h-6"fill=currentColor viewBox="0 0 24 24"><path></path></svg></div><div class=flex-1><h3 class=font-semibold style=color:var(--text-primary)></h3><p class=text-sm style=color:var(--text-muted)>`), _tmpl$4 = /* @__PURE__ */ template(`<div class="card p-4"><div class="flex items-center justify-between"><div class="flex items-center gap-4 flex-1"><div class="w-12 h-12 rounded-lg flex items-center justify-center"><svg class="w-6 h-6"fill=currentColor viewBox="0 0 24 24"><path></path></svg></div><div class=flex-1><div class="flex items-center gap-2 mb-1"><h3 class=font-semibold style=color:var(--text-primary)></h3><span class="px-2 py-1 rounded text-xs font-medium"></span><span class="px-2 py-1 rounded text-xs font-medium"></span></div><p class=text-sm style=color:var(--text-muted)>Type: <!> | Created: </p></div></div><div class="flex items-center gap-2"><button class="px-3 py-2 rounded text-sm font-medium"style=background:var(--bg-secondary);color:var(--text-primary)></button><button class="px-3 py-2 rounded text-sm font-medium"></button><button class="px-3 py-2 rounded text-sm font-medium"style=background:var(--bg-secondary);color:var(--text-primary)>Edit</button><button class="px-3 py-2 rounded text-sm font-medium"style=background:#ef444420;color:#ef4444>Delete`), _tmpl$5 = /* @__PURE__ */ template(`<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div class="card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"><div class="flex items-center justify-between mb-4"><h2 class="text-2xl font-bold"style=color:var(--text-primary)> <!> Connector</h2><button class=text-2xl style=color:var(--text-muted)>×</button></div><div class=space-y-4><div><label class="block text-sm font-medium mb-1"style=color:var(--text-secondary)>Connector Name</label><input type=text class="w-full px-3 py-2 rounded border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)></div><div class="flex justify-end gap-2 mt-6"><button class="px-4 py-2 rounded text-sm font-medium"style=background:var(--bg-secondary);color:var(--text-primary)>Cancel</button><button class="px-4 py-2 rounded text-sm font-medium text-white"style=background:var(--accent-primary)> Connector`), _tmpl$6 = /* @__PURE__ */ template(`<div><label class="block text-sm font-medium mb-1"style=color:var(--text-secondary)> `), _tmpl$7 = /* @__PURE__ */ template(`<span style=color:#ef4444>*`), _tmpl$8 = /* @__PURE__ */ template(`<select class="w-full px-3 py-2 rounded border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)><option value>Select...`), _tmpl$9 = /* @__PURE__ */ template(`<option>`), _tmpl$0 = /* @__PURE__ */ template(`<input class="w-full px-3 py-2 rounded border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)>`);
const connectorTypes = [{
  id: "github",
  name: "GitHub",
  description: "Connect to GitHub repositories for issue tracking and webhooks",
  icon: "M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z",
  color: "#24292e",
  fields: [{
    key: "token",
    label: "Personal Access Token",
    type: "password",
    required: true,
    placeholder: "ghp_..."
  }, {
    key: "repository",
    label: "Repository (owner/repo)",
    type: "text",
    required: true,
    placeholder: "owner/repo"
  }, {
    key: "webhook_url",
    label: "Webhook URL (optional)",
    type: "url",
    required: false,
    placeholder: "https://..."
  }]
}, {
  id: "slack",
  name: "Slack",
  description: "Send alerts and notifications to Slack channels",
  icon: "M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52 2.527 2.527 0 012.52 2.52zM9.075 15.165a2.527 2.527 0 01-2.521-2.52 2.527 2.527 0 012.521-2.521 2.528 2.528 0 012.523 2.521 2.528 2.528 0 01-2.523 2.52zM5.042 11.143a2.528 2.528 0 01-2.52-2.523A2.528 2.528 0 015.042 6.098a2.527 2.527 0 012.52 2.522 2.527 2.527 0 01-2.52 2.523z",
  color: "#4A154B",
  fields: [{
    key: "webhook_url",
    label: "Webhook URL",
    type: "url",
    required: true,
    placeholder: "https://hooks.slack.com/services/..."
  }, {
    key: "channel",
    label: "Channel (optional)",
    type: "text",
    required: false,
    placeholder: "#alerts"
  }, {
    key: "username",
    label: "Bot Username (optional)",
    type: "text",
    required: false,
    placeholder: "KubeGraf"
  }]
}, {
  id: "pagerduty",
  name: "PagerDuty",
  description: "Create incidents and alerts in PagerDuty",
  icon: "M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22c-5.514 0-10-4.486-10-10S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z",
  color: "#06AC38",
  fields: [{
    key: "integration_key",
    label: "Integration Key",
    type: "text",
    required: true,
    placeholder: "Your PagerDuty integration key"
  }, {
    key: "service_id",
    label: "Service ID (optional)",
    type: "text",
    required: false,
    placeholder: "Service ID"
  }]
}, {
  id: "webhook",
  name: "Generic Webhook",
  description: "Send events to any webhook endpoint",
  icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
  color: "#6366f1",
  fields: [{
    key: "url",
    label: "Webhook URL",
    type: "url",
    required: true,
    placeholder: "https://..."
  }, {
    key: "method",
    label: "HTTP Method",
    type: "select",
    required: true,
    options: [{
      value: "POST",
      label: "POST"
    }, {
      value: "PUT",
      label: "PUT"
    }, {
      value: "PATCH",
      label: "PATCH"
    }]
  }, {
    key: "headers",
    label: "Custom Headers (JSON)",
    type: "text",
    required: false,
    placeholder: '{"Authorization": "Bearer token"}'
  }]
}, {
  id: "email",
  name: "Email",
  description: "Send email notifications via SMTP",
  icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  color: "#3b82f6",
  fields: [{
    key: "smtp_host",
    label: "SMTP Host",
    type: "text",
    required: true,
    placeholder: "smtp.gmail.com"
  }, {
    key: "smtp_port",
    label: "SMTP Port",
    type: "text",
    required: true,
    placeholder: "587"
  }, {
    key: "username",
    label: "Username",
    type: "text",
    required: true,
    placeholder: "your-email@example.com"
  }, {
    key: "password",
    label: "Password",
    type: "password",
    required: true
  }, {
    key: "from_email",
    label: "From Email",
    type: "text",
    required: true,
    placeholder: "alerts@example.com"
  }, {
    key: "to_emails",
    label: "To Emails (comma-separated)",
    type: "text",
    required: true,
    placeholder: "admin@example.com,team@example.com"
  }]
}, {
  id: "teams",
  name: "Microsoft Teams",
  description: "Send notifications to Microsoft Teams channels",
  icon: "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-2 14H6v-4h12v4zm0-6H6v-4h12v4zm0-6H6V6h12v4z",
  color: "#6264A7",
  fields: [{
    key: "webhook_url",
    label: "Webhook URL",
    type: "url",
    required: true,
    placeholder: "https://outlook.office.com/webhook/..."
  }, {
    key: "channel",
    label: "Channel Name (optional)",
    type: "text",
    required: false,
    placeholder: "Alerts"
  }]
}, {
  id: "discord",
  name: "Discord",
  description: "Send alerts to Discord channels via webhook",
  icon: "M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.24-.444.464-.68.7a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.68-.7.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C2.67 6.018 2.32 7.724 2.11 9.424a.082.082 0 00.031.084 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.007-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.128 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.083c-.216-1.7-.571-3.406-1.535-5.026a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z",
  color: "#5865F2",
  fields: [{
    key: "webhook_url",
    label: "Webhook URL",
    type: "url",
    required: true,
    placeholder: "https://discord.com/api/webhooks/..."
  }, {
    key: "username",
    label: "Bot Username (optional)",
    type: "text",
    required: false,
    placeholder: "KubeGraf Bot"
  }]
}];
const Connectors = () => {
  const [selectedType, setSelectedType] = createSignal(null);
  const [showAddModal, setShowAddModal] = createSignal(false);
  const [editingConnector, setEditingConnector] = createSignal(null);
  const [formData, setFormData] = createSignal({});
  const [testing, setTesting] = createSignal(null);
  const [connectors, {
    refetch: refetchConnectors
  }] = createResource(async () => {
    try {
      return await api.getConnectors();
    } catch (err) {
      console.error("[Connectors] Failed to fetch connectors:", err);
      return [];
    }
  });
  const handleAddConnector = (type) => {
    setSelectedType(type);
    setFormData({});
    setEditingConnector(null);
    setShowAddModal(true);
  };
  const handleEditConnector = (connector) => {
    setSelectedType(connector.type);
    setFormData(connector.config || {});
    setEditingConnector(connector);
    setShowAddModal(true);
  };
  const handleSaveConnector = async () => {
    const type = selectedType();
    if (!type) return;
    try {
      if (editingConnector()) {
        await api.updateConnector(editingConnector().id, {
          name: formData().name || connectorTypes.find((t) => t.id === type)?.name || "",
          config: formData()
        });
      } else {
        await api.createConnector({
          type,
          name: formData().name || connectorTypes.find((t) => t.id === type)?.name || "",
          config: formData()
        });
      }
      setShowAddModal(false);
      refetchConnectors();
    } catch (err) {
      alert(`Failed to save connector: ${err.message}`);
    }
  };
  const handleTestConnector = async (connector) => {
    setTesting(connector.id);
    try {
      const result = await api.testConnector(connector.id);
      if (result.success) {
        alert("Connector test successful!");
      } else {
        alert(`Connector test failed: ${result.error || "Unknown error"}`);
      }
      refetchConnectors();
    } catch (err) {
      alert(`Failed to test connector: ${err.message}`);
    } finally {
      setTesting(null);
    }
  };
  const handleToggleConnector = async (connector) => {
    try {
      await api.updateConnector(connector.id, {
        enabled: !connector.enabled
      });
      refetchConnectors();
    } catch (err) {
      alert(`Failed to toggle connector: ${err.message}`);
    }
  };
  const handleDeleteConnector = async (connector) => {
    if (!confirm(`Are you sure you want to delete connector "${connector.name}"?`)) {
      return;
    }
    try {
      await api.deleteConnector(connector.id);
      refetchConnectors();
    } catch (err) {
      alert(`Failed to delete connector: ${err.message}`);
    }
  };
  const getConnectorType = (type) => {
    return connectorTypes.find((t) => t.id === type);
  };
  const getStatusColor = (status) => {
    switch (status) {
      case "connected":
        return "#22c55e";
      case "error":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };
  return (() => {
    var _el$ = _tmpl$2(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$2.nextSibling;
    insert(_el$6, createComponent(For, {
      each: connectorTypes,
      children: (type) => (() => {
        var _el$0 = _tmpl$3(), _el$1 = _el$0.firstChild, _el$10 = _el$1.firstChild, _el$11 = _el$10.firstChild, _el$12 = _el$11.firstChild, _el$13 = _el$10.nextSibling, _el$14 = _el$13.firstChild, _el$15 = _el$14.nextSibling;
        _el$0.$$click = () => handleAddConnector(type.id);
        insert(_el$14, () => type.name);
        insert(_el$15, () => type.description);
        createRenderEffect((_p$) => {
          var _v$ = `${type.color}20`, _v$2 = type.color, _v$3 = type.icon;
          _v$ !== _p$.e && setStyleProperty(_el$10, "background", _p$.e = _v$);
          _v$2 !== _p$.t && setStyleProperty(_el$11, "color", _p$.t = _v$2);
          _v$3 !== _p$.a && setAttribute(_el$12, "d", _p$.a = _v$3);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0
        });
        return _el$0;
      })()
    }));
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!connectors())() && connectors().length > 0;
      },
      get children() {
        var _el$7 = _tmpl$(), _el$8 = _el$7.firstChild, _el$9 = _el$8.nextSibling;
        insert(_el$9, createComponent(For, {
          get each() {
            return connectors();
          },
          children: (connector) => {
            const type = getConnectorType(connector.type);
            return (() => {
              var _el$16 = _tmpl$4(), _el$17 = _el$16.firstChild, _el$18 = _el$17.firstChild, _el$19 = _el$18.firstChild, _el$20 = _el$19.firstChild, _el$21 = _el$20.firstChild, _el$22 = _el$19.nextSibling, _el$23 = _el$22.firstChild, _el$24 = _el$23.firstChild, _el$25 = _el$24.nextSibling, _el$26 = _el$25.nextSibling, _el$27 = _el$23.nextSibling, _el$28 = _el$27.firstChild, _el$30 = _el$28.nextSibling; _el$30.nextSibling; var _el$31 = _el$18.nextSibling, _el$32 = _el$31.firstChild, _el$33 = _el$32.nextSibling, _el$34 = _el$33.nextSibling, _el$35 = _el$34.nextSibling;
              insert(_el$24, () => connector.name);
              insert(_el$25, () => connector.enabled ? "Enabled" : "Disabled");
              insert(_el$26, () => connector.status);
              insert(_el$27, () => type?.name || connector.type, _el$30);
              insert(_el$27, () => new Date(connector.createdAt).toLocaleDateString(), null);
              _el$32.$$click = () => handleTestConnector(connector);
              insert(_el$32, () => testing() === connector.id ? "Testing..." : "Test");
              _el$33.$$click = () => handleToggleConnector(connector);
              insert(_el$33, () => connector.enabled ? "Disable" : "Enable");
              _el$34.$$click = () => handleEditConnector(connector);
              _el$35.$$click = () => handleDeleteConnector(connector);
              createRenderEffect((_p$) => {
                var _v$4 = `${type?.color || "#6366f1"}20`, _v$5 = type?.color || "#6366f1", _v$6 = type?.icon || "", _v$7 = connector.enabled ? "#22c55e20" : "#6b728020", _v$8 = connector.enabled ? "#22c55e" : "#6b7280", _v$9 = `${getStatusColor(connector.status)}20`, _v$0 = getStatusColor(connector.status), _v$1 = testing() === connector.id, _v$10 = connector.enabled ? "#ef444420" : "#22c55e20", _v$11 = connector.enabled ? "#ef4444" : "#22c55e";
                _v$4 !== _p$.e && setStyleProperty(_el$19, "background", _p$.e = _v$4);
                _v$5 !== _p$.t && setStyleProperty(_el$20, "color", _p$.t = _v$5);
                _v$6 !== _p$.a && setAttribute(_el$21, "d", _p$.a = _v$6);
                _v$7 !== _p$.o && setStyleProperty(_el$25, "background", _p$.o = _v$7);
                _v$8 !== _p$.i && setStyleProperty(_el$25, "color", _p$.i = _v$8);
                _v$9 !== _p$.n && setStyleProperty(_el$26, "background", _p$.n = _v$9);
                _v$0 !== _p$.s && setStyleProperty(_el$26, "color", _p$.s = _v$0);
                _v$1 !== _p$.h && (_el$32.disabled = _p$.h = _v$1);
                _v$10 !== _p$.r && setStyleProperty(_el$33, "background", _p$.r = _v$10);
                _v$11 !== _p$.d && setStyleProperty(_el$33, "color", _p$.d = _v$11);
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
              return _el$16;
            })();
          }
        }));
        return _el$7;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!showAddModal())() && selectedType();
      },
      children: () => {
        const type = connectorTypes.find((t) => t.id === selectedType());
        if (!type) return null;
        return (() => {
          var _el$36 = _tmpl$5(), _el$37 = _el$36.firstChild, _el$38 = _el$37.firstChild, _el$39 = _el$38.firstChild, _el$40 = _el$39.firstChild, _el$42 = _el$40.nextSibling; _el$42.nextSibling; var _el$43 = _el$39.nextSibling, _el$44 = _el$38.nextSibling, _el$45 = _el$44.firstChild, _el$46 = _el$45.firstChild, _el$47 = _el$46.nextSibling, _el$48 = _el$45.nextSibling, _el$49 = _el$48.firstChild, _el$50 = _el$49.nextSibling, _el$51 = _el$50.firstChild;
          _el$36.$$click = () => setShowAddModal(false);
          _el$37.$$click = (e) => e.stopPropagation();
          insert(_el$39, () => editingConnector() ? "Edit" : "Add", _el$40);
          insert(_el$39, () => type.name, _el$42);
          _el$43.$$click = () => setShowAddModal(false);
          _el$47.$$input = (e) => setFormData({
            ...formData(),
            name: e.currentTarget.value
          });
          insert(_el$44, createComponent(For, {
            get each() {
              return type.fields;
            },
            children: (field) => (() => {
              var _el$52 = _tmpl$6(), _el$53 = _el$52.firstChild, _el$54 = _el$53.firstChild;
              insert(_el$53, () => field.label, _el$54);
              insert(_el$53, (() => {
                var _c$ = memo(() => !!field.required);
                return () => _c$() && _tmpl$7();
              })(), null);
              insert(_el$52, (() => {
                var _c$2 = memo(() => field.type === "select");
                return () => _c$2() ? (() => {
                  var _el$56 = _tmpl$8(); _el$56.firstChild;
                  _el$56.addEventListener("change", (e) => setFormData({
                    ...formData(),
                    [field.key]: e.currentTarget.value
                  }));
                  insert(_el$56, createComponent(For, {
                    get each() {
                      return field.options;
                    },
                    children: (opt) => (() => {
                      var _el$58 = _tmpl$9();
                      insert(_el$58, () => opt.label);
                      createRenderEffect(() => _el$58.value = opt.value);
                      return _el$58;
                    })()
                  }), null);
                  createRenderEffect(() => _el$56.value = formData()[field.key] || "");
                  return _el$56;
                })() : (() => {
                  var _el$59 = _tmpl$0();
                  _el$59.$$input = (e) => setFormData({
                    ...formData(),
                    [field.key]: e.currentTarget.value
                  });
                  createRenderEffect((_p$) => {
                    var _v$12 = field.type, _v$13 = field.placeholder, _v$14 = field.required;
                    _v$12 !== _p$.e && setAttribute(_el$59, "type", _p$.e = _v$12);
                    _v$13 !== _p$.t && setAttribute(_el$59, "placeholder", _p$.t = _v$13);
                    _v$14 !== _p$.a && (_el$59.required = _p$.a = _v$14);
                    return _p$;
                  }, {
                    e: void 0,
                    t: void 0,
                    a: void 0
                  });
                  createRenderEffect(() => _el$59.value = formData()[field.key] || "");
                  return _el$59;
                })();
              })(), null);
              return _el$52;
            })()
          }), _el$48);
          _el$49.$$click = () => setShowAddModal(false);
          _el$50.$$click = handleSaveConnector;
          insert(_el$50, () => editingConnector() ? "Update" : "Create", _el$51);
          createRenderEffect(() => setAttribute(_el$47, "placeholder", type.name));
          createRenderEffect(() => _el$47.value = formData().name || "");
          return _el$36;
        })();
      }
    }), null);
    return _el$;
  })();
};
delegateEvents(["click", "input"]);

export { Connectors as default };
//# sourceMappingURL=Connectors-DxP6N7-l.js.map
