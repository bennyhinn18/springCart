# SpringCart

E-commerce project scaffold with a React frontend and a Spring Boot (Maven) backend.

- Backend: Spring Boot 3, REST API, JPA/Hibernate, H2 (dev) and PostgreSQL (prod-ready).
- Frontend: React (recommended with Vite). CORS is already configured to allow http://localhost:3000 and http://localhost:5173.

## Prerequisites

- Java 17+
- Maven 3.9+ on PATH (or add Maven Wrapper later)
- Node.js 18+ and npm (or yarn/pnpm)
- Git (optional but recommended)
- PostgreSQL (for production or when you want to switch from H2)

## Project structure


    SpringCart/

    ├─ backend/

    │  ├─ pom.xml

    │  └─ src/

    │     └─ main/

    │        ├─ java/

    │        │  └─ com/springcart/

    │        │     ├─ SpringCartApplication.java

    │        │     └─ product/

    │        │        └─ Product.java

    │        └─ resources/

    │           ├─ application-dev.properties

    │           ├─ application-prod.properties

    │           ├─ application-docker.properties
    │           └─ data.sql

    ├─ docker/
    │  └─ postgres/
    │     └─ init.sql
    ├─ docker-compose.yml
    └─ frontend/    (empty scaffold placeholder – see frontend setup)


Notes:
- The backend currently exposes a basic Product CRUD API and seeds sample products in dev via data.sql.
- CORS allows the frontend on ports 3000 (CRA) and 5173 (Vite).

---

## Backend setup (Spring Boot + Maven)


Recommended: use the Docker profile with PostgreSQL (docker-compose) for seeded data; the H2 data.sql is intentionally empty. From the project root:


1) Change into backend

    cd backend

2) Run in dev profile (H2 in-memory DB, sample data)

    mvn spring-boot:run -Pdev

- App runs on http://localhost:8080
- H2 console available at http://localhost:8080/h2-console
  - JDBC URL: jdbc:h2:mem:springcart
  - User: sa
  - Password: (empty)

3) Build a jar

    mvn -DskipTests clean package

4) Run the jar (dev profile)

    java -jar target/springcart-backend-0.0.1-SNAPSHOT.jar --spring.profiles.active=dev

### Switching to PostgreSQL (prod profile)

In production, configure via environment variables (recommended):

- SPRING_DATASOURCE_URL (e.g., jdbc:postgresql://localhost:5432/springcart)
- SPRING_DATASOURCE_USERNAME
- SPRING_DATASOURCE_PASSWORD
- Optional tuning:
  - SPRING_DATASOURCE_MAX_POOL_SIZE, SPRING_DATASOURCE_MIN_IDLE, etc.

Run with prod profile:

    java -jar target/springcart-backend-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod

Or using Maven:

    mvn spring-boot:run -Pprod

Make sure the target database exists and the credentials are correct. For schema management in prod, consider Flyway or Liquibase instead of relying on ddl-auto.


### PostgreSQL via Docker (Docker profile)

- Start Postgres with seed data:
      docker compose up -d
  This uses ./docker-compose.yml and runs ./docker/postgres/init.sql on first start to create tables and seed:
  - Categories: Food, Mobiles, Electronics, Stationery
  - Products: Cake, Phone, Laptop, Book

- Connection details (defaults from docker-compose):
  - Host: localhost
  - Port: 5432
  - Database: springcart
  - Username: springcart
  - Password: springcart

- Run backend against Dockerized Postgres (Windows PowerShell):
      cd backend
      $env:DB_HOST="localhost"
      $env:DB_PORT="5432"
      $env:DB_NAME="springcart"
      $env:DB_USER="springcart"
      $env:DB_PASSWORD="springcart"
      mvn spring-boot:run -Pdocker

  Or with the jar:
      java -jar target/springcart-backend-0.0.1-SNAPSHOT.jar --spring.profiles.active=docker

  Note: On Unix shells, export env vars and use \ for line breaks.

- Verifying:
      psql -h localhost -U springcart -d springcart -c "SELECT COUNT(*) FROM products;"

### Available API endpoints (Product)


Base URL: http://localhost:8080/api/products

- GET /api/products
- GET /api/products?q=term
- GET /api/products/{id}
- POST /api/products
  - JSON example:
        {
          "name": "New Product",
          "description": "Short description",
          "price": 29.99,
          "imageUrl": "https://example.com/image.jpg"
        }
- PUT /api/products/{id}
- DELETE /api/products/{id}


CORS allowed origins:
- http://localhost:3000
- http://localhost:5173

### Dashboard and Auth endpoints

Dashboard:
- GET /api/dashboard
  - Returns: totalProducts, totalItemsInStock, totalInventoryValue, categories

Auth (dummy open auth):
- POST /api/auth/login
  - Body:
        { "username": "any", "password": "any" }
  - Returns: token, username, role
- POST /api/auth/logout
  - Returns 204 No Content

- http://localhost:3000
- http://localhost:5173

---

## Frontend setup (React)

The frontend directory is a placeholder. You can scaffold a React app inside it with Vite or Create React App. Vite is recommended for speed and simplicity.

Option A — Vite (recommended):

    cd frontend
    npm create vite@latest . -- --template react
    npm install
    npm run dev

This will start the dev server (default on http://localhost:5173), which matches one of the backend’s allowed CORS origins.

Option B — Create React App:

    cd frontend
    npx create-react-app . 
    npm start

CRA defaults to http://localhost:3000, which is also permitted by the backend CORS policy.

### Connect frontend to backend

Quick fetch example (inside your React code):

    const API_BASE_URL = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8080';

    async function fetchProducts(q) {
      const url = q ? `${API_BASE_URL}/api/products?q=${encodeURIComponent(q)}` : `${API_BASE_URL}/api/products`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      return await res.json();
    }

Recommended: set a Vite environment variable in frontend/.env

    VITE_API_BASE_URL=http://localhost:8080

With this, the same code will point to the backend URL from your environment.

### Optional: Vite dev proxy (no CORS changes required)

Instead of setting VITE_API_BASE_URL, you can proxy API calls to the backend to avoid CORS and simplify URLs.

- Create or update vite.config.js:

        import { defineConfig } from 'vite';
        import react from '@vitejs/plugin-react';

        export default defineConfig({
          plugins: [react()],
          server: {
            proxy: {
              '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true
              }
            }
          }
        });

- Then in your React code, call relative paths like fetch('/api/products').

---

## Testing the API quickly

- List products:

      curl http://localhost:8080/api/products

- Create a product:

      curl -X POST http://localhost:8080/api/products ^
        -H "Content-Type: application/json" ^
        -d "{ \"name\": \"Sample\", \"description\": \"Desc\", \"price\": 9.99, \"imageUrl\": \"https://example.com/img.jpg\" }"

(Use ^ line breaks in PowerShell, or \ in Bash.)

---

## Common issues

- Port already in use:
  - Backend: change server.port in application-*.properties or set SERVER_PORT env var.
  - Frontend: Vite chooses the next open port or use --port.
- CORS error in browser:
  - Ensure your frontend runs on http://localhost:3000 or http://localhost:5173, or update @CrossOrigin in the backend.
- H2 console not accessible:
  - Confirm spring.h2.console.enabled=true in application-dev.properties and the correct URL path (/h2-console).
- PostgreSQL connection failures:
  - Validate SPRING_DATASOURCE_URL/USERNAME/PASSWORD and that the DB is reachable.
- Data not loading in dev:
  - Ensure you launched with the dev profile and spring.sql.init.mode=always (default in provided dev config).

---

## Next steps

- Build out domain (users, orders, categories, carts).
- Add authentication/authorization (e.g., Spring Security + JWT).
- Introduce pagination and filtering for product listings.
- Add validation and error handling patterns (problem+json).
- Add database migrations (Flyway/Liquibase) for non-dev environments.
- Containerize with Docker and compose a dev stack (db + backend + frontend).
- Add unit/integration tests and CI.

---

## Quick commands reference

Backend:


    cd backend

    mvn spring-boot:run -Pdev

    mvn -DskipTests clean package

    java -jar target/springcart-backend-0.0.1-SNAPSHOT.jar --spring.profiles.active=dev

    # Run against Dockerized Postgres (Docker profile, Windows PowerShell)
    $env:DB_HOST="localhost"
    $env:DB_PORT="5432"
    $env:DB_NAME="springcart"
    $env:DB_USER="springcart"
    $env:DB_PASSWORD="springcart"
    mvn spring-boot:run -Pdocker


Frontend (Vite):

    cd frontend
    npm create vite@latest . -- --template react
    npm install
    npm run dev