import { c as createSignal, d as createComponent, _ as Portal, t as template, u as addEventListener, i as insert, S as Show, f as createRenderEffect, m as memo, G as addNotification, v as delegateEvents, h as setStyleProperty } from './index-Bh-O-sIc.js';

var _tmpl$$1 = /* @__PURE__ */ template(`<div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Email</label><input type=email class="w-full px-4 py-2 rounded-lg"placeholder=your@email.com style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)">`), _tmpl$2$1 = /* @__PURE__ */ template(`<div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Role</label><select class="w-full px-4 py-2 rounded-lg"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=viewer>Viewer (Read-only)</option><option value=developer>Developer (Read/Write)</option><option value=admin>Admin (Full Access)</option></select><p class="text-xs mt-1"style=color:var(--text-muted)>Choose your access level`), _tmpl$3$1 = /* @__PURE__ */ template(`<div class="mt-6 p-4 rounded-lg text-sm"style="background:var(--bg-tertiary);border:1px solid var(--border-color)"><p class="font-medium mb-2"style=color:var(--text-primary)>ℹ️ First Time Setup</p><p style=color:var(--text-secondary)>If this is your first time, create an admin account by clicking "Create one" below, or use the default credentials if configured.`), _tmpl$4$1 = /* @__PURE__ */ template(`<div class="fixed inset-0 flex items-center justify-center"style="background:rgba(0, 0, 0, 0.7);z-index:9999;pointer-events:auto"><div class="card p-8 max-w-md w-full mx-4"style=background:var(--bg-card)><div class=mb-6><h2 class="text-2xl font-bold mb-2"style=color:var(--text-primary)></h2><p class=text-sm style=color:var(--text-secondary)></p></div><form class=space-y-4><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Username</label><input type=text required class="w-full px-4 py-2 rounded-lg"placeholder="Enter username"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Password</label><input type=password required class="w-full px-4 py-2 rounded-lg"placeholder="Enter password"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"></div><button type=submit class="w-full py-3 rounded-lg font-medium transition-opacity disabled:opacity-50"style=background:var(--accent-primary);color:white></button></form><div class="mt-4 text-center"><button class="text-sm hover:underline"style=color:var(--accent-primary)>`);
const LoginModal = (props) => {
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [isRegister, setIsRegister] = createSignal(false);
  const [email, setEmail] = createSignal("");
  const [role, setRole] = createSignal("viewer");
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          username: username(),
          password: password()
        })
      });
      if (!response.ok) {
        throw new Error("Invalid credentials");
      }
      const data = await response.json();
      localStorage.setItem("kubegraf_token", data.token);
      localStorage.setItem("kubegraf_user", JSON.stringify(data.user));
      addNotification(`✅ Welcome back, ${data.user.username}!`, "success");
      props.onLoginSuccess(data.user);
      props.onClose();
    } catch (error) {
      addNotification(`❌ Login failed: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    } finally {
      setLoading(false);
    }
  };
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: username(),
          password: password(),
          email: email(),
          role: role()
        })
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Registration failed");
      }
      addNotification("✅ Account created! Please login.", "success");
      setIsRegister(false);
      setPassword("");
    } catch (error) {
      addNotification(`❌ Registration failed: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    } finally {
      setLoading(false);
    }
  };
  console.log("[LoginModal] Render called - isOpen:", props.isOpen);
  return createComponent(Show, {
    get when() {
      return props.isOpen;
    },
    get children() {
      return createComponent(Portal, {
        get children() {
          var _el$ = _tmpl$4$1(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.nextSibling, _el$6 = _el$3.nextSibling, _el$7 = _el$6.firstChild, _el$8 = _el$7.firstChild, _el$9 = _el$8.nextSibling, _el$11 = _el$7.nextSibling, _el$12 = _el$11.firstChild, _el$13 = _el$12.nextSibling, _el$18 = _el$11.nextSibling, _el$19 = _el$6.nextSibling, _el$20 = _el$19.firstChild;
          addEventListener(_el$, "click", props.onClose, true);
          _el$2.$$click = (e) => e.stopPropagation();
          insert(_el$4, () => isRegister() ? "🔐 Create Account" : "🔑 Login to KubēGraf");
          insert(_el$5, () => isRegister() ? "Create a new account to access KubēGraf" : "Enter your credentials to continue");
          addEventListener(_el$6, "submit", isRegister() ? handleRegister : handleLogin);
          _el$9.$$input = (e) => setUsername(e.currentTarget.value);
          insert(_el$6, createComponent(Show, {
            get when() {
              return isRegister();
            },
            get children() {
              var _el$0 = _tmpl$$1(), _el$1 = _el$0.firstChild, _el$10 = _el$1.nextSibling;
              _el$10.$$input = (e) => setEmail(e.currentTarget.value);
              createRenderEffect((_p$) => {
                var _v$ = isRegister(), _v$2 = loading();
                _v$ !== _p$.e && (_el$10.required = _p$.e = _v$);
                _v$2 !== _p$.t && (_el$10.disabled = _p$.t = _v$2);
                return _p$;
              }, {
                e: void 0,
                t: void 0
              });
              createRenderEffect(() => _el$10.value = email());
              return _el$0;
            }
          }), _el$11);
          _el$13.$$input = (e) => setPassword(e.currentTarget.value);
          insert(_el$6, createComponent(Show, {
            get when() {
              return isRegister();
            },
            get children() {
              var _el$14 = _tmpl$2$1(), _el$15 = _el$14.firstChild, _el$16 = _el$15.nextSibling; _el$16.nextSibling;
              _el$16.addEventListener("change", (e) => setRole(e.currentTarget.value));
              createRenderEffect(() => _el$16.disabled = loading());
              createRenderEffect(() => _el$16.value = role());
              return _el$14;
            }
          }), _el$18);
          insert(_el$18, (() => {
            var _c$ = memo(() => !!loading());
            return () => _c$() ? "⏳ Processing..." : isRegister() ? "🔐 Create Account" : "🔑 Login";
          })());
          _el$20.$$click = () => {
            setIsRegister(!isRegister());
            setPassword("");
            setEmail("");
          };
          insert(_el$20, () => isRegister() ? "← Back to Login" : "Don't have an account? Create one →");
          insert(_el$2, createComponent(Show, {
            get when() {
              return !isRegister();
            },
            get children() {
              var _el$21 = _tmpl$3$1(), _el$22 = _el$21.firstChild; _el$22.nextSibling;
              return _el$21;
            }
          }), null);
          createRenderEffect((_p$) => {
            var _v$3 = loading(), _v$4 = loading(), _v$5 = loading(), _v$6 = loading();
            _v$3 !== _p$.e && (_el$9.disabled = _p$.e = _v$3);
            _v$4 !== _p$.t && (_el$13.disabled = _p$.t = _v$4);
            _v$5 !== _p$.a && (_el$18.disabled = _p$.a = _v$5);
            _v$6 !== _p$.o && (_el$20.disabled = _p$.o = _v$6);
            return _p$;
          }, {
            e: void 0,
            t: void 0,
            a: void 0,
            o: void 0
          });
          createRenderEffect(() => _el$9.value = username());
          createRenderEffect(() => _el$13.value = password());
          return _el$;
        }
      });
    }
  });
};
delegateEvents(["click", "input"]);

var _tmpl$ = /* @__PURE__ */ template(`<div class="flex items-center gap-3"><div class=text-right><div class="text-sm font-medium"style=color:var(--text-primary)></div><div class=text-xs style=color:var(--text-secondary)></div></div><button class="px-4 py-2 rounded-lg text-sm"style="background:var(--bg-tertiary);border:1px solid var(--border-color);color:var(--text-primary)">Logout`), _tmpl$2 = /* @__PURE__ */ template(`<div class="p-4 rounded-lg"style="background:var(--bg-tertiary);border:1px solid var(--border-color)"><div class="grid grid-cols-2 gap-4"><div><div class=text-xs style=color:var(--text-muted)>Username</div><div class=font-medium style=color:var(--text-primary)></div></div><div><div class=text-xs style=color:var(--text-muted)>Email</div><div class=font-medium style=color:var(--text-primary)></div></div><div><div class=text-xs style=color:var(--text-muted)>Role</div><div><span class="inline-flex px-2 py-1 rounded text-xs font-medium"></span></div></div><div><div class=text-xs style=color:var(--text-muted)>Status</div><div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-500"></span><span class=text-sm style=color:var(--text-primary)>Active`), _tmpl$3 = /* @__PURE__ */ template(`<div class="card p-6"><h3 class="text-lg font-semibold mb-4"style=color:var(--text-primary)>🚀 Quick Setup Guide</h3><div class=space-y-4><div class="flex items-start gap-3"><div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"style=background:var(--accent-primary);color:white>1</div><div><div class="font-medium mb-1"style=color:var(--text-primary)>Create Admin Account</div><div class=text-sm style=color:var(--text-secondary)>Click "Login" button → "Create one" → Fill details → Select "Admin" role</div></div></div><div class="flex items-start gap-3"><div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"style=background:var(--accent-primary);color:white>2</div><div><div class="font-medium mb-1"style=color:var(--text-primary)>Login</div><div class=text-sm style=color:var(--text-secondary)>Use your credentials to login → Session valid for 24 hours</div></div></div><div class="flex items-start gap-3"><div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"style=background:var(--accent-primary);color:white>3</div><div><div class="font-medium mb-1"style=color:var(--text-primary)>Create Additional Users</div><div class=text-sm style=color:var(--text-secondary)>As admin, create accounts for team members with appropriate roles</div></div></div></div><div class="mt-6 p-4 rounded-lg"style="background:var(--bg-tertiary);border:1px solid var(--border-color)"><div class="flex items-start gap-2"><span>💡</span><div class=text-sm style=color:var(--text-secondary)><strong>First Time?</strong> If IAM is enabled but you don't have credentials, you'll need to create the first admin account. Click the Login button above to get started.`), _tmpl$4 = /* @__PURE__ */ template(`<div class="space-y-6 p-6"><div class="flex items-center justify-between"><div><h1 class="text-3xl font-bold"style=color:var(--text-primary)>👥 User Management</h1><p class="text-sm mt-2"style=color:var(--text-secondary)>Manage users, roles, and authentication</p></div></div><div class="card p-6"><div class="flex items-center justify-between mb-4"><div class="flex items-center gap-3"><div class="w-12 h-12 rounded-full flex items-center justify-center"style=background:var(--accent-primary)><span class=text-2xl>🔐</span></div><div><h2 class="text-xl font-semibold"style=color:var(--text-primary)>Local IAM System</h2><p class=text-sm style=color:var(--text-secondary)>Identity and Access Management</p></div></div></div></div><div class="card p-6"><h3 class="text-lg font-semibold mb-4"style=color:var(--text-primary)>📋 Roles & Permissions</h3><div class=space-y-3><div class="p-4 rounded-lg"style="background:var(--bg-tertiary);border:1px solid var(--border-color)"><div class="flex items-center gap-3 mb-2"><span class="px-2 py-1 rounded text-xs font-medium"style="background:rgba(239, 68, 68, 0.1);color:#ef4444">Admin</span><span class="text-sm font-medium"style=color:var(--text-primary)>Full Access</span></div><p class=text-sm style=color:var(--text-secondary)>Complete control over all resources, users, and settings. Can create/delete users, modify any resource, and access all namespaces.</p></div><div class="p-4 rounded-lg"style="background:var(--bg-tertiary);border:1px solid var(--border-color)"><div class="flex items-center gap-3 mb-2"><span class="px-2 py-1 rounded text-xs font-medium"style="background:rgba(59, 130, 246, 0.1);color:#3b82f6">Developer</span><span class="text-sm font-medium"style=color:var(--text-primary)>Read/Write Access</span></div><p class=text-sm style=color:var(--text-secondary)>Can create, update, and delete pods, deployments, services, and config maps. Can view all resources but cannot manage users or cluster settings.</p></div><div class="p-4 rounded-lg"style="background:var(--bg-tertiary);border:1px solid var(--border-color)"><div class="flex items-center gap-3 mb-2"><span class="px-2 py-1 rounded text-xs font-medium"style="background:rgba(34, 197, 94, 0.1);color:#22c55b">Viewer</span><span class="text-sm font-medium"style=color:var(--text-primary)>Read-Only Access</span></div><p class=text-sm style=color:var(--text-secondary)>Can view all resources, logs, and metrics. Cannot create, update, or delete any resources. Perfect for monitoring and auditing purposes.`), _tmpl$5 = /* @__PURE__ */ template(`<button class="px-6 py-2 rounded-lg font-medium transition-all hover:opacity-90"type=button style=background:var(--accent-primary);color:white;cursor:pointer;border:none>🔑 Login`);
const UserManagement = () => {
  const [showLoginModal, setShowLoginModal] = createSignal(false);
  const [currentUser, setCurrentUser] = createSignal(null);
  createSignal(false);
  const checkAuth = () => {
    const token = localStorage.getItem("kubegraf_token");
    const user = localStorage.getItem("kubegraf_user");
    if (token && user) {
      setCurrentUser(JSON.parse(user));
      return true;
    }
    return false;
  };
  checkAuth();
  const handleLogout = () => {
    fetch("/api/logout", {
      method: "POST",
      credentials: "include"
    });
    localStorage.removeItem("kubegraf_token");
    localStorage.removeItem("kubegraf_user");
    setCurrentUser(null);
    addNotification("👋 Logged out successfully", "success");
  };
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
  };
  return (() => {
    var _el$ = _tmpl$4(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$2.nextSibling, _el$7 = _el$6.firstChild, _el$8 = _el$7.firstChild, _el$9 = _el$8.firstChild, _el$0 = _el$9.nextSibling, _el$1 = _el$0.firstChild; _el$1.nextSibling; var _el$55 = _el$6.nextSibling, _el$56 = _el$55.firstChild, _el$57 = _el$56.nextSibling, _el$58 = _el$57.firstChild, _el$59 = _el$58.firstChild, _el$60 = _el$59.firstChild; _el$60.nextSibling; _el$59.nextSibling; var _el$63 = _el$58.nextSibling, _el$64 = _el$63.firstChild, _el$65 = _el$64.firstChild; _el$65.nextSibling; _el$64.nextSibling; var _el$68 = _el$63.nextSibling, _el$69 = _el$68.firstChild, _el$70 = _el$69.firstChild; _el$70.nextSibling; _el$69.nextSibling;
    insert(_el$7, createComponent(Show, {
      get when() {
        return currentUser();
      },
      get fallback() {
        return (() => {
          var _el$73 = _tmpl$5();
          _el$73.$$click = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("Login button clicked! Current state:", showLoginModal());
            setShowLoginModal(true);
            console.log("After setState:", showLoginModal());
            setTimeout(() => {
              console.log("After timeout:", showLoginModal());
            }, 0);
          };
          return _el$73;
        })();
      },
      get children() {
        var _el$11 = _tmpl$(), _el$12 = _el$11.firstChild, _el$13 = _el$12.firstChild, _el$14 = _el$13.nextSibling, _el$15 = _el$12.nextSibling;
        insert(_el$13, () => currentUser()?.username);
        insert(_el$14, () => currentUser()?.role);
        _el$15.$$click = handleLogout;
        return _el$11;
      }
    }), null);
    insert(_el$6, createComponent(Show, {
      get when() {
        return currentUser();
      },
      get children() {
        var _el$16 = _tmpl$2(), _el$17 = _el$16.firstChild, _el$18 = _el$17.firstChild, _el$19 = _el$18.firstChild, _el$20 = _el$19.nextSibling, _el$21 = _el$18.nextSibling, _el$22 = _el$21.firstChild, _el$23 = _el$22.nextSibling, _el$24 = _el$21.nextSibling, _el$25 = _el$24.firstChild, _el$26 = _el$25.nextSibling, _el$27 = _el$26.firstChild, _el$28 = _el$24.nextSibling, _el$29 = _el$28.firstChild, _el$30 = _el$29.nextSibling, _el$31 = _el$30.firstChild; _el$31.nextSibling;
        insert(_el$20, () => currentUser()?.username);
        insert(_el$23, () => currentUser()?.email || "Not set");
        insert(_el$27, () => currentUser()?.role);
        createRenderEffect((_p$) => {
          var _v$ = currentUser()?.role === "admin" ? "rgba(239, 68, 68, 0.1)" : currentUser()?.role === "developer" ? "rgba(59, 130, 246, 0.1)" : "rgba(34, 197, 94, 0.1)", _v$2 = currentUser()?.role === "admin" ? "#ef4444" : currentUser()?.role === "developer" ? "#3b82f6" : "#22c55b";
          _v$ !== _p$.e && setStyleProperty(_el$27, "background", _p$.e = _v$);
          _v$2 !== _p$.t && setStyleProperty(_el$27, "color", _p$.t = _v$2);
          return _p$;
        }, {
          e: void 0,
          t: void 0
        });
        return _el$16;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return !currentUser();
      },
      get children() {
        var _el$33 = _tmpl$3(), _el$34 = _el$33.firstChild, _el$35 = _el$34.nextSibling, _el$36 = _el$35.firstChild, _el$37 = _el$36.firstChild, _el$38 = _el$37.nextSibling, _el$39 = _el$38.firstChild; _el$39.nextSibling; var _el$41 = _el$36.nextSibling, _el$42 = _el$41.firstChild, _el$43 = _el$42.nextSibling, _el$44 = _el$43.firstChild; _el$44.nextSibling; var _el$46 = _el$41.nextSibling, _el$47 = _el$46.firstChild, _el$48 = _el$47.nextSibling, _el$49 = _el$48.firstChild; _el$49.nextSibling; var _el$51 = _el$35.nextSibling, _el$52 = _el$51.firstChild, _el$53 = _el$52.firstChild; _el$53.nextSibling;
        return _el$33;
      }
    }), _el$55);
    insert(_el$, createComponent(Show, {
      when: true,
      get children() {
        return createComponent(LoginModal, {
          get isOpen() {
            return showLoginModal();
          },
          onClose: () => {
            console.log("Closing login modal");
            setShowLoginModal(false);
          },
          onLoginSuccess: handleLoginSuccess
        });
      }
    }), null);
    return _el$;
  })();
};
delegateEvents(["click"]);

export { UserManagement as default };
//# sourceMappingURL=UserManagement-DEeY_eq_.js.map
