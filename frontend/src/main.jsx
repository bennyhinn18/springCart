import React, {
  useEffect,
  useMemo,
  useState,
  createContext,
  useContext,
} from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  Link,
  useNavigate,
} from "react-router-dom";

// ---------------------------------------------
// API helper
// ---------------------------------------------
const API_BASE = (import.meta?.env?.VITE_API_BASE_URL || "").trim(); // e.g., http://localhost:8080; empty means use Vite proxy

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const message = text || `Request failed: ${res.status}`;
    throw new Error(message);
  }
  const contentType = res.headers.get("content-type") || "";
  return contentType.includes("application/json") ? res.json() : res.text();
}

// ---------------------------------------------
// Auth context (dummy auth)
// ---------------------------------------------
const AuthContext = createContext(null);

function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try {
      const raw = localStorage.getItem("auth");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const login = async (username, password) => {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    const next = {
      token: data.token,
      username: data.username,
      role: data.role,
    };
    setAuth(next);
    localStorage.setItem("auth", JSON.stringify(next));
    return next;
  };

  const logout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore any error for dummy logout
    }
    setAuth(null);
    localStorage.removeItem("auth");
  };

  const value = useMemo(() => ({ auth, login, logout }), [auth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function RequireAuth() {
  const { auth } = useAuth();
  if (!auth?.token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

// ---------------------------------------------
// UI components
// ---------------------------------------------
function Layout({ children }) {
  const { auth, logout } = useAuth();
  return (
    <div
      style={{
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 12,
          borderBottom: "1px solid #ddd",
        }}
      >
        <div>
          <strong>SpringCart</strong>
        </div>
        <nav style={{ display: "flex", gap: 12 }}>
          {auth?.token ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/admin">Admin</Link>
              <button
                onClick={logout}
                style={{ padding: "6px 10px", cursor: "pointer" }}
                title="Logout"
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </nav>
      </header>
      <main style={{ padding: 16 }}>{children}</main>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { auth, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Only redirect to dashboard when the user is authenticated.
    // This prevents navigating away while the user is still on the login page.
    if (auth?.token) {
      navigate("/dashboard", { replace: true });
    }
  }, [auth, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login(username, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <h1>Login</h1>
      <p>Use any dummy username and password to log in.</p>
      <form
        onSubmit={onSubmit}
        style={{ display: "grid", gap: 12, maxWidth: 360 }}
      >
        <label>
          Username
          <input
            style={{ width: "100%", padding: 8, marginTop: 4 }}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            style={{ width: "100%", padding: 8, marginTop: 4 }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          style={{ padding: "8px 12px", cursor: "pointer" }}
        >
          {submitting ? "Logging in…" : "Login"}
        </button>
        {error ? <div style={{ color: "crimson" }}>{error}</div> : null}
      </form>
    </Layout>
  );
}

function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await apiFetch("/api/dashboard");
        if (alive) setSummary(data);
      } catch (err) {
        if (alive) setError(err?.message || "Failed to load dashboard");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const load = async (query = "") => {
    setLoading(true);
    setError("");
    try {
      const url = query
        ? `/api/products?q=${encodeURIComponent(query)}`
        : "/api/products";
      const data = await apiFetch(url);
      setProducts(data);
    } catch (err) {
      setError(err?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout>
      <h1>Dashboard</h1>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      {!loading && !error && summary && (
        <div style={{ display: "grid", gap: 16 }}>
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <div style={cardStyle}>
              <div style={cardTitleStyle}>Total Number of Products</div>
              <div style={cardValueStyle}>{summary.totalProducts}</div>
            </div>
            <div style={cardStyle}>
              <div style={cardTitleStyle}>Total items in Stock</div>
              <div style={cardValueStyle}>{summary.totalItemsInStock}</div>
            </div>
            <div style={cardStyle}>
              <div style={cardTitleStyle}>Total Value of all Products</div>
              <div style={cardValueStyle}>
                {Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: "INR",
                }).format(Number(summary.totalInventoryValue || 0))}
              </div>
            </div>
          </section>

          <section>
            <h2>Categories</h2>
            {Array.isArray(summary.categories) &&
            summary.categories.length > 0 ? (
              <ul>
                {summary.categories.map((c) => (
                  <li key={c.id}>{c.name}</li>
                ))}
              </ul>
            ) : (
              <p>No categories found.</p>
            )}
          </section>
          {!loading && !error && (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  minWidth: 720,
                }}
              >
                <thead>
                  <tr>
                    <th style={thStyle}>ID</th>
                    <th style={thStyle}>Product name</th>
                    <th style={thStyle}>Category</th>
                    <th style={thStyle}>Price</th>
                    <th style={thStyle}>Total items in Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td style={tdStyle}>{p.id}</td>
                      <td style={tdStyle}>{p.name}</td>
                      <td style={tdStyle}>{p.category?.name ?? "-"}</td>
                      <td style={tdStyle}>
                        {Intl.NumberFormat(undefined, {
                          style: "currency",
                          currency: "INR",
                        }).format(Number(p.price || 0))}
                      </td>
                      <td style={tdStyle}>{p.totalItemsInStock ?? 0}</td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          ...tdStyle,
                          textAlign: "center",
                          color: "#777",
                        }}
                      >
                        No products found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  // CRUD form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // product being edited or null for create
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    imageUrl: "",
    totalItemsInStock: "",
    categoryId: "",
  });

  const [categories, setCategories] = useState([]);

  const load = async (query = "") => {
    setLoading(true);
    setError("");
    try {
      const url = query
        ? `/api/products?q=${encodeURIComponent(query)}`
        : "/api/products";
      const data = await apiFetch(url);
      setProducts(data);
    } catch (err) {
      setError(err?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await apiFetch("/api/categories");
      setCategories(data);
    } catch (err) {
      // don't break admin if categories fail — show empty list
      console.error("Failed to load categories", err);
    }
  };

  useEffect(() => {
    load("");
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      description: "",
      price: "",
      imageUrl: "",
      totalItemsInStock: "",
      categoryId: categories.length ? categories[0].id : "",
    });
    setShowForm(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name ?? "",
      description: product.description ?? "",
      price: product.price ?? "",
      imageUrl: product.imageUrl ?? "",
      totalItemsInStock: product.totalItemsInStock ?? "",
      categoryId: product.category?.id ?? "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleChange = (field, value) => {
    setForm((s) => ({ ...s, [field]: value }));
  };

  const submitForm = async (e) => {
    e?.preventDefault?.();
    setError("");
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        imageUrl: form.imageUrl,
        totalItemsInStock:
          form.totalItemsInStock === "" ? null : Number(form.totalItemsInStock),
        categoryId: form.categoryId === "" ? null : Number(form.categoryId),
      };

      if (editing && editing.id) {
        await apiFetch(`/api/products/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      await load(q);
      closeForm();
    } catch (err) {
      setError(err?.message || "Save failed");
    }
  };

  const deleteProduct = async (id) => {
    if (!confirm("Delete product? This action cannot be undone.")) return;
    setError("");
    try {
      await apiFetch(`/api/products/${id}`, { method: "DELETE" });
      await load(q);
    } catch (err) {
      setError(err?.message || "Delete failed");
    }
  };

  return (
    <Layout>
      <h1>Admin</h1>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(q);
          }}
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products by name"
            style={{ padding: 8, minWidth: 280 }}
          />
          <button
            type="submit"
            style={{ padding: "8px 12px", cursor: "pointer" }}
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              setQ("");
              load("");
            }}
            style={{ padding: "8px 12px", cursor: "pointer" }}
          >
            Reset
          </button>
        </form>

        <div>
          <button
            onClick={openCreate}
            style={{ padding: "8px 12px", cursor: "pointer" }}
          >
            Create Product
          </button>
        </div>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {/* Form panel (simple inline modal-like) */}
      {showForm && (
        <div
          style={{
            border: "1px solid #ddd",
            padding: 12,
            marginBottom: 12,
            borderRadius: 8,
            background: "#fff",
          }}
        >
          <h3>{editing ? `Edit Product #${editing.id}` : "Create Product"}</h3>
          <form onSubmit={submitForm} style={{ display: "grid", gap: 8 }}>
            <label>
              Name
              <input
                required
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                style={{ width: "100%", padding: 8 }}
              />
            </label>

            <label>
              Description
              <textarea
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                style={{ width: "100%", padding: 8 }}
              />
            </label>

            <label>
              Price
              <input
                required
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => handleChange("price", e.target.value)}
                style={{ width: "100%", padding: 8 }}
              />
            </label>

            <label>
              Image URL
              <input
                value={form.imageUrl}
                onChange={(e) => handleChange("imageUrl", e.target.value)}
                style={{ width: "100%", padding: 8 }}
              />
            </label>

            <label>
              Total items in Stock
              <input
                type="number"
                value={form.totalItemsInStock}
                onChange={(e) =>
                  handleChange("totalItemsInStock", e.target.value)
                }
                style={{ width: "100%", padding: 8 }}
              />
            </label>

            <label>
              Category
              <select
                value={form.categoryId}
                onChange={(e) => handleChange("categoryId", e.target.value)}
                style={{ width: "100%", padding: 8 }}
              >
                <option value="">-- none --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                type="submit"
                style={{ padding: "8px 12px", cursor: "pointer" }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={closeForm}
                style={{ padding: "8px 12px", cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {!loading && !error && (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ borderCollapse: "collapse", width: "100%", minWidth: 720 }}
          >
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Product name</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Price</th>
                <th style={thStyle}>Total items in Stock</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td style={tdStyle}>{p.id}</td>
                  <td style={tdStyle}>{p.name}</td>
                  <td style={tdStyle}>{p.category?.name ?? "-"}</td>
                  <td style={tdStyle}>
                    {Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: "USD",
                    }).format(Number(p.price || 0))}
                  </td>
                  <td style={tdStyle}>{p.totalItemsInStock ?? 0}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => openEdit(p)}
                      style={{
                        marginRight: 8,
                        padding: "6px 10px",
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteProduct(p.id)}
                      style={{
                        padding: "6px 10px",
                        cursor: "pointer",
                        background: "#ffecec",
                        border: "1px solid #f5c2c2",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{ ...tdStyle, textAlign: "center", color: "#777" }}
                  >
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}

// ---------------------------------------------
// Styles
// ---------------------------------------------
const cardStyle = {
  border: "1px solid #eee",
  borderRadius: 8,
  padding: 12,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const cardTitleStyle = {
  fontSize: 12,
  textTransform: "uppercase",
  color: "#666",
  marginBottom: 6,
};

const cardValueStyle = {
  fontSize: 22,
  fontWeight: 600,
};

const thStyle = {
  textAlign: "left",
  borderBottom: "1px solid #ddd",
  padding: "10px 8px",
  background: "#fafafa",
};

const tdStyle = {
  borderBottom: "1px solid #f0f0f0",
  padding: "10px 8px",
};

// ---------------------------------------------
// App / Router
// ---------------------------------------------
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

// ---------------------------------------------
// Bootstrap
// ---------------------------------------------
const rootEl = document.getElementById("root");
const root = createRoot(rootEl);
root.render(<App />);
