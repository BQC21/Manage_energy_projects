# Manage Energy Projects — PERN Stack CRUD with Neon

Full-stack application to manage solar energy projects. Built with the **PERN** stack (PostgreSQL · Express · React · Node.js) using **Prisma ORM** and a **Neon** serverless Postgres database.

---

## Tech Stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Database | PostgreSQL hosted on **Neon**           |
| ORM      | Prisma 6                                |
| Backend  | Node.js + Express 5                     |
| Frontend | React 19 + Vite + Tailwind CSS 4        |
| Routing  | React Router DOM 7                      |

---

## Project Structure

```
Manage_energy_projects/
├── server/                  # Express API
│   ├── controllers/         # Business logic (CRUD handlers)
│   ├── routes/              # Route definitions
│   ├── middlewares/         # logger, successHandler, errorHandler, notFound
│   ├── db_client/           # Prisma client singleton
│   ├── prisma/
│   │   ├── schema.prisma    # Data model
│   │   └── migrations/      # Migration history
│   └── index.js             # Server entry point
└── client/                  # React SPA
    └── src/
        ├── api/             # Fetch wrappers (projects.api.js)
        ├── components/      # Shared UI components
        ├── pages/           # Page-level components
        └── App.jsx          # Route declarations
```

---

## 1. Neon — Database Setup

1. Create a free account at [neon.tech](https://neon.tech).
2. Create a new **Project** and a **Database** (e.g. `energy_db`).
3. From the Neon dashboard, copy the two connection strings:
   - **Connection string** → pooled connection (used by Prisma at runtime).
   - **Direct URL** → non-pooled connection (used by Prisma Migrate).

---

## 2. Environment Variables

Create a `.env` file inside `server/`:

```env
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/energy_db?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/energy_db?sslmode=require"
```

> Neon requires both `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) so that Prisma Migrate can bypass the connection pooler.

---

## 3. Prisma Schema

`server/prisma/schema.prisma` defines the data source using both URLs and the `Project` model:

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../generated/prisma"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model Project {
  id         Int      @id @default(autoincrement())
  project    String   @db.VarChar(255)
  energy_kwh Float
  price      Float
  nro_panels Int
  status     String   @db.VarChar(50)
  created_at DateTime @default(now()) @db.Timestamptz(6)
  updated_at DateTime @default(now()) @db.Timestamptz(6)

  @@map("project")
}
```

---

## 4. Run Migrations & Generate Client

```bash
cd server
npm install

# Push schema to Neon and create migration history
npm run migrate
# → runs: prisma migrate dev

# Generate the Prisma Client (also runs automatically via postinstall)
npm run generate
# → runs: prisma generate
```

After running `migrate`, Prisma creates the `project` table on your Neon database and saves the migration file under `server/prisma/migrations/`.

The generated client is output to `server/generated/prisma/` and imported as a singleton:

```js
// server/db_client/prisma.js
import { PrismaClient } from "../generated/prisma/index.js";
export const prisma = new PrismaClient();
```

---

## 5. Express Server

`server/index.js` wires together middlewares and routes:

```js
import "dotenv/config";
import express from "express";
import cors from "cors";
import projectRoutes from "./routes/projects.routes.js";
import { logger }         from "./middlewares/logger.middleware.js";
import { successHandler } from "./middlewares/successHandler.middleware.js";
import { notFound }       from "./middlewares/notFound.middleware.js";
import { errorHandler }   from "./middlewares/errorHandler.middleware.js";

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());
app.use(logger);
app.use(successHandler);

app.use("/api", projectRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(process.env.PORT || 3000);
```

**Custom middlewares:**

| Middleware       | Purpose                                                        |
|------------------|----------------------------------------------------------------|
| `logger`         | Logs every request with method, URL and timestamp             |
| `successHandler` | Adds `res.success(data, message, statusCode)` helper          |
| `notFound`       | Returns 404 JSON for unmatched routes                         |
| `errorHandler`   | Catches errors, reads `err.statusCode`, returns JSON response |

---

## 6. REST API — Routes & Controllers

### Routes (`server/routes/projects.routes.js`)

```
GET    /api/projects        → getProjects   (list all)
GET    /api/projects/:id    → getProject    (get one)
POST   /api/projects        → createProject (create)
PUT    /api/projects/:id    → updateProject (update)
DELETE /api/projects/:id    → deleteProject (delete)
```

### Controller logic (`server/controllers/projects.controllers.js`)

Each handler follows the same pattern: validate input → call `prisma.<model>.<operation>()` → respond via `res.success()` or forward to `next(err)`.

**Validation** — `validateProjectBody` checks for required fields and correct types before hitting the database:

```js
const REQUIRED_FIELDS = ["project", "LCOE", "Price", "Nro_panels", "status"];
```

**CRUD operations with Prisma:**

| Operation | Prisma call                                     |
|-----------|-------------------------------------------------|
| Create    | `prisma.project.create({ data: req.body })`     |
| Read all  | `prisma.project.findMany()`                     |
| Read one  | `prisma.project.findUnique({ where: { id } })`  |
| Update    | `prisma.project.update({ where: { id }, data })` |
| Delete    | `prisma.project.delete({ where: { id } })`      |

**Unified response envelope:**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Projects retrieved",
  "data": [ ... ]
}
```

---

## 7. React Client

### API layer (`client/src/api/projects.api.js`)

Thin `fetch` wrappers — one function per CRUD operation:

```js
const API = "http://localhost:3000/api/projects";

export const getProjectsRequest  = ()            => fetch(API);
export const getProjectRequest   = (id)          => fetch(`${API}/${id}`);
export const createProjectRequest = (project)    => fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(project) });
export const updateProjectRequest = (id, project)=> fetch(`${API}/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(project) });
export const deleteProjectRequest = (id)         => fetch(`${API}/${id}`, { method: "DELETE" });
```

### Page example (`client/src/pages/Home.jsx`)

Uses `useEffect` + `useState` to fetch and display projects on mount:

```jsx
useEffect(() => {
    const loadProjects = async () => {
        const response = await getProjectsRequest();
        const payload  = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.message);
        setProjects(payload.data);
    };
    loadProjects();
}, []);
```

### Routing (`client/src/App.jsx`)

```jsx
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";

function App() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
        </Routes>
    );
}
```

---

## 8. Running the Project

### Backend

```bash
cd server
npm install
npm run migrate    # first time only — creates tables on Neon
npm run dev        # starts server with nodemon on port 3000
```

### Frontend

```bash
cd client
npm install
npm run dev        # starts Vite dev server on port 5173
```

Open `http://localhost:5173` in the browser.

---

## 9. Data Flow Summary

```
Browser (React)
    │  fetch()
    ▼
Express API  (Node.js)
    │  Prisma Client
    ▼
Neon (PostgreSQL serverless)
```

1. React calls a function from `projects.api.js`.
2. Express receives the request, runs middlewares (logger → successHandler).
3. The router delegates to the matching controller.
4. The controller validates the input, then calls `prisma.<operation>()`.
5. Prisma translates the call into SQL and executes it against the Neon database over the `DATABASE_URL` connection.
6. The result travels back through `res.success()` as a unified JSON envelope.
7. React reads `payload.data` and updates state.
