# SpringCart Frontend

Minimal placeholder and instructions to bootstrap a React frontend that talks to the Spring Boot backend.

Backend defaults:
- Base API: http://localhost:8080
- CORS allowed in backend for: http://localhost:3000 (CRA) and http://localhost:5173 (Vite)

If you haven’t started the backend yet, follow the main project README to run it with the dev profile.

---

## Option A — Quick start with Vite (recommended)

1) Initialize the app inside `frontend`:

    cd frontend
    npm create vite@latest . -- --template react
    npm install

2) Run the dev server:

    npm run dev

3) Configure the backend API URL via `.env`:

    echo VITE_API_BASE_URL=http://localhost:8080 > .env

4) Replace `src/App.jsx` with a minimal product listing (optional quick test):

    import { useEffect, useState } from 'react';

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

    export default function App() {
      const [products, setProducts] = useState([]);
      const [q, setQ] = useState('');
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState(null);

      async function fetchProducts(query) {
        setLoading(true);
        setError(null);
        try {
          const url = query
            ? `${API_BASE_URL}/api/products?q=${encodeURIComponent(query)}`
            : `${API_BASE_URL}/api/products`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Request failed: ${res.status}`);
          const data = await res.json();
          setProducts(data);
        } catch (err) {
          setError(err.message || 'Unknown error');
        } finally {
          setLoading(false);
        }
      }

      useEffect(() => {
        fetchProducts('');
      }, []);

      return (
        <div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, "Apple Color Emoji", "Segoe UI Emoji"' }}>
          <h1>SpringCart Frontend</h1>
          <p>Backend API: {API_BASE_URL}</p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchProducts(q);
            }}
            style={{ marginBottom: 16 }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products..."
              style={{ padding: 8, width: 240, marginRight: 8 }}
            />
            <button type="submit" style={{ padding: '8px 12px' }}>Search</button>
            <button
              type="button"
              onClick={() => { setQ(''); fetchProducts(''); }}
              style={{ padding: '8px 12px', marginLeft: 8 }}
            >
              Reset
            </button>
          </form>

          {loading && <p>Loading…</p>}
          {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}
          {!loading && !error && (
            <ul style={{ padding: 0, listStyle: 'none', display: 'grid', gap: 12 }}>
              {products.map(p => (
                <li key={p.id} style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
                  <strong>{p.name}</strong>
                  <div style={{ fontSize: 14, color: '#555' }}>{p.description}</div>
                  <div style={{ marginTop: 6 }}>${p.price}</div>
                  {p.imageUrl && (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      style={{ display: 'block', width: 160, height: 160, objectFit: 'cover', marginTop: 8 }}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

5) Optional: dev proxy (avoid CORS/explicit base URL). Create `vite.config.js`:

    import { defineConfig } from 'vite';
    import react from '@vitejs/plugin-react';

    export default defineConfig({
      plugins: [react()],
      server: {
        proxy: {
          '/api': {
            target: 'http://localhost:8080',
            changeOrigin: true,
          },
        },
      },
    });

Then you can call relative URLs like `fetch('/api/products')` and omit `VITE_API_BASE_URL`.

Build and preview:

    npm run build
    npm run preview

---

## Option B — Minimal files without scaffolder

If you prefer not to use a scaffolding command, you can create the smallest viable Vite + React setup.

1) Create these files:

- package.json

      {
        "name": "springcart-frontend",
        "private": true,
        "version": "0.0.1",
        "type": "module",
        "scripts": {
          "dev": "vite",
          "build": "vite build",
          "preview": "vite preview"
        },
        "dependencies": {
          "react": "^18.3.1",
          "react-dom": "^18.3.1"
        },
        "devDependencies": {
          "@vitejs/plugin-react": "^4.3.1",
          "vite": "^5.4.2"
        }
      }

- index.html

      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>SpringCart Frontend</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" src="/src/main.jsx"></script>
        </body>
      </html>

- src/main.jsx

      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import App from './App.jsx';

      const root = createRoot(document.getElementById('root'));
      root.render(<App />);

- src/App.jsx

      import { useEffect, useState } from 'react';

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

      export default function App() {
        const [products, setProducts] = useState([]);
        const [error, setError] = useState(null);

        useEffect(() => {
          (async () => {
            try {
              const res = await fetch(`${API_BASE_URL}/api/products`);
              if (!res.ok) throw new Error(`Request failed: ${res.status}`);
              setProducts(await res.json());
            } catch (e) {
              setError(e.message || 'Unknown error');
            }
          })();
        }, []);

        return (
          <div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, "Apple Color Emoji", "Segoe UI Emoji"' }}>
            <h1>SpringCart Frontend</h1>
            <p>Backend API: {API_BASE_URL}</p>
            {error ? (
              <p style={{ color: 'crimson' }}>Error: {error}</p>
            ) : (
              <ul>
                {products.map(p => <li key={p.id}>{p.name} — ${p.price}</li>)}
              </ul>
            )}
          </div>
        );
      }

- vite.config.js

      import { defineConfig } from 'vite';
      import react from '@vitejs/plugin-react';

      export default defineConfig({
        plugins: [react()],
      });

- .env.example

      VITE_API_BASE_URL=http://localhost:8080

2) Install and run:

    npm install
    npm run dev

Optionally copy `.env.example` to `.env` and adjust `VITE_API_BASE_URL` for your environment.

---

## Troubleshooting

- CORS error in browser:
  - Ensure the frontend runs on http://localhost:5173 (Vite) or http://localhost:3000 (CRA), which are allowed by the backend.
  - Or use Vite’s dev proxy and call relative URLs (`/api/...`).

- Backend not reachable:
  - Verify the backend is running on port 8080 and started with the `dev` profile per the main README.

- Port conflicts:
  - Vite: run `npm run dev -- --port=5174` or another port.
  - Backend: change `server.port` in `application-dev.properties` or run with `--server.port=8081`.

---

## Next steps

- Build product listing UI with pagination and filters.
- Add Product detail page and a simple cart.
- Integrate authentication/authorization when backend supports it.
- Add UI components, theming, and a design system.

Happy building!