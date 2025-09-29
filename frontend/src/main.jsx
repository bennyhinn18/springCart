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
import "./index.css";
import { FaBox, FaSearch, FaPlus, FaEdit, FaTrash } from "react-icons/fa";

/**
 * main.jsx
 *
 * Modernized frontend entry. Replaces the DashboardPage with a Tailwind-driven,
 * card-based product grid and refreshed summary cards. Keeps the existing
 * dummy auth, Admin CRUD and other pages intact.
 *
 * Note: This file expects the Tailwind CSS pipeline to be set up and
 * `./index.css` to provide the Tailwind directives (already created).
 */

/* -------------------------
   API helper (simple)
   ------------------------- */
const API_BASE = (import.meta?.env?.VITE_API_BASE_URL || "").trim(); // empty means Vite proxy

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

/* -------------------------
   Auth (dummy)
   ------------------------- */
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
      // ignore
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

/* -------------------------
   Layout
   ------------------------- */
function Header() {
  const { auth, logout } = useAuth();
  return (
    <header className="app-header">
      <div className="flex items-center gap-3">
        <div className="app-title">SpringCart</div>
        {/* <div className="text-sm text-slate-500">• Lightweight demo</div>*/}
      </div>

      <nav className="app-nav flex items-center gap-4">
        {auth?.token ? (
          <>
            <Link
              to="/dashboard"
              className="text-sm text-slate-700 hover:text-slate-900"
            >
              Dashboard
            </Link>
            <Link
              to="/admin"
              className="text-sm text-slate-700 hover:text-slate-900"
            >
              Admin
            </Link>
            <button
              onClick={logout}
              className="btn btn-outline"
              title="Logout"
              aria-label="Logout"
            >
              Logout
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="text-sm text-slate-700 hover:text-slate-900"
          >
            Login
          </Link>
        )}
      </nav>
    </header>
  );
}

function Layout({ children }) {
  return (
    <div className="app-container">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}

/* -------------------------
   ProductCard (modern)
   ------------------------- */
function ProductCard({ product, onEdit }) {
  return (
    <article className="card flex flex-col">
      <div className="product-media">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="text-slate-400">
            <FaBox size={36} />
          </div>
        )}
      </div>

      <div className="mt-3 flex-1 flex flex-col">
        <h3 className="card-title">{product.name}</h3>
        <p className="card-desc truncate-2">
          {product.description || "No description"}
        </p>
      </div>

      <div className="product-meta mt-4 items-center">
        <div className="text-sm text-slate-600">
          <span className="badge">Stock</span>{" "}
          <span className="font-medium ml-2">
            {product.totalItemsInStock ?? 0}
          </span>
        </div>
        <div className="text-lg font-bold text-brand-500">
          {Intl.NumberFormat(undefined, {
            style: "currency",
            currency: "INR",
          }).format(Number(product.price ?? 0))}
        </div>
      </div>

      {/* <div className="mt-3 flex gap-2">
        <button
          onClick={() => onEdit && onEdit(product)}
          className="btn btn-outline flex items-center gap-2"
        >
          <FaEdit />
          Edit
        </button>
        <Link
          to={`/admin`}
          className="btn btn-primary flex items-center gap-2 ml-auto"
        >
          <FaPlus />
          Add to Catalog
        </Link>
      </div>*/}
    </article>
  );
}

/* -------------------------
   DashboardPage (modernized)
   ------------------------- */
function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await apiFetch("/api/dashboard");
        if (alive) setSummary(s);
      } catch (err) {
        if (alive) setError(err?.message || "Failed to load dashboard");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const loadProducts = async (search = "") => {
    setLoadingProducts(true);
    setError("");
    try {
      const url = search
        ? `/api/products?q=${encodeURIComponent(search)}`
        : "/api/products";
      const data = await apiFetch(url);
      setProducts(data);
    } catch (err) {
      setError(err?.message || "Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadProducts("");
  }, []);

  const onSearch = (e) => {
    e.preventDefault();
    loadProducts(q);
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 gap-6">
        {/* Top summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">Total Products</div>
                <div className="text-2xl font-semibold mt-1">
                  {summary?.totalProducts ?? "—"}
                </div>
              </div>
              <div className="p-3 bg-brand-50 rounded-md">
                <FaBox className="text-brand-500" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="text-sm text-slate-500">Total Items in Stock</div>
            <div className="text-2xl font-semibold mt-2">
              {summary?.totalItemsInStock ?? "—"}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              Across all products
            </div>
          </div>

          <div className="card">
            <div className="text-sm text-slate-500">Total Inventory Value</div>
            <div className="text-2xl font-semibold mt-2">
              {Intl.NumberFormat(undefined, {
                style: "currency",
                currency: "INR",
              }).format(Number(summary?.totalInventoryValue ?? 0))}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              Sum(price × stock)
            </div>
          </div>
        </div>

        {/* Search & categories */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <form
            onSubmit={onSearch}
            className="flex items-center gap-2 w-full sm:w-1/2"
          >
            <div className="relative w-full">
              <input
                className="input pr-10"
                placeholder="Search products..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button
                type="submit"
                className="absolute right-1 top-1/2 -translate-y-1/2 btn btn-outline"
                aria-label="Search"
              >
                <FaSearch />
              </button>
            </div>
          </form>

          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-600">Categories</div>
            <div className="badge">{summary?.categories?.length ?? 0}</div>
          </div>
        </div>

        {/* Product grid */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Products</h2>

          {loadingProducts ? (
            <div className="panel empty-state">Loading products…</div>
          ) : error ? (
            <div className="panel empty-state text-red-600">{error}</div>
          ) : products.length === 0 ? (
            <div className="panel empty-state">No products found.</div>
          ) : (
            <div className="product-grid">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

/* -------------------------
   LoginPage
   ------------------------- */
function LoginPage() {
  const navigate = useNavigate();
  const { auth, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
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
      <div className="max-w-md mx-auto panel">
        <h1 className="text-2xl font-semibold mb-2">Welcome back</h1>
        <p className="text-sm text-slate-500 mb-4">
          Sign in with any dummy username and password.
        </p>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="form-label">Username</label>
            <input
              required
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="form-label">Password</label>
            <input
              required
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a password"
            />
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="flex items-center justify-between">
            <button className="btn btn-primary" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </button>
            <Link to="/admin" className="text-sm text-slate-500">
              Admin (demo)
            </Link>
          </div>
        </form>
      </div>
    </Layout>
  );
}

/* -------------------------
   AdminPage (existing CRUD UI kept)
   ------------------------- */
function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  // CRUD form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
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
    } catch {
      // silently ignore
    }
  };

  useEffect(() => {
    load("");
    loadCategories();
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <div>
          <button
            onClick={openCreate}
            className="btn btn-primary flex items-center gap-2"
          >
            <FaPlus />
            Create Product
          </button>
        </div>
      </div>

      {showForm && (
        <div className="panel mb-4">
          <h3 className="text-lg font-semibold mb-2">
            {editing ? `Edit #${editing.id}` : "Create Product"}
          </h3>
          <form onSubmit={submitForm} className="grid gap-3">
            <div>
              <label className="form-label">Name</label>
              <input
                required
                className="input"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Description</label>
              <textarea
                className="input"
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Price</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  className="input"
                  value={form.price}
                  onChange={(e) => handleChange("price", e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Total items in Stock</label>
                <input
                  type="number"
                  className="input"
                  value={form.totalItemsInStock}
                  onChange={(e) =>
                    handleChange("totalItemsInStock", e.target.value)
                  }
                />
              </div>
            </div>

            <div>
              <label className="form-label">Image URL</label>
              <input
                className="input"
                value={form.imageUrl}
                onChange={(e) => handleChange("imageUrl", e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Category</label>
              <select
                className="input"
                value={form.categoryId}
                onChange={(e) => handleChange("categoryId", e.target.value)}
              >
                <option value="">-- none --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                Save
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="btn btn-outline"
              >
                Cancel
              </button>
            </div>
            {error && <div className="text-red-600 mt-2">{error}</div>}
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg overflow-hidden">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium">ID</th>
              <th className="px-4 py-2 text-left text-sm font-medium">
                Product
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium">
                Category
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium">Price</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Stock</th>
              <th className="px-4 py-2 text-left text-sm font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="px-4 py-3 text-sm">{p.id}</td>
                <td className="px-4 py-3 text-sm">{p.name}</td>
                <td className="px-4 py-3 text-sm">{p.category?.name ?? "-"}</td>
                <td className="px-4 py-3 text-sm">
                  {Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: "INR",
                  }).format(Number(p.price || 0))}
                </td>
                <td className="px-4 py-3 text-sm">
                  {p.totalItemsInStock ?? 0}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="btn btn-outline flex items-center gap-2"
                    >
                      <FaEdit />
                      Edit
                    </button>
                    <button
                      onClick={() => deleteProduct(p.id)}
                      className="btn btn-danger flex items-center gap-2"
                    >
                      <FaTrash />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

/* -------------------------
   App & mount
   ------------------------- */
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

const rootEl = document.getElementById("root");
const root = createRoot(rootEl);
root.render(<App />);
