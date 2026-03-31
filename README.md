# Manage Energy Projects — PERN Stack CRUD with Neon

Full-stack application to manage solar energy projects. Built with the **PERN** stack (PostgreSQL · Express · React · Node.js) using **Prisma ORM** and a **Neon** serverless database.

---

## Events
  1- Select Excel file from local folders
  
  2- Click on "Subir Excel" button to upload DB_proyectos and show productivity graphs
  
  3- Click on "X" button to delete project
  
  4- Click on "Generar PDF" from quote or finantial attribute of DB_proyectos
  
  5- Click on "Excel file" from Excel attribute of DB_proyectos
  
  6- Change status clicking on "Cambiar estado" button

---

## System Architecture

The application is divided into three main layers according to the system design:

- **Client (Frontend)**: React.js application that manages user interaction and consumes services via HTTP requests.
- **Services Layer (Backend)**:
  - **Server - Express.js**: Responsible for data management, credential validation, and CRUD operations.
  - **Server - FastAPI**: Specialized in data processing, Excel scraping, and PDF report generation.
- **Data Layer**: Persistent storage with dedicated databases for Projects and Authentication.

---

---

## Tech Stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Database | PostgreSQL hosted on **Neon**           |
| ORM (Express)    | Prisma 6                                |
| ORM (Python)     | SQLalchemy                                |
| Backend  | Node.js + Express 5                     |
| Backend (Python) | Fast API                   |
| Frontend | React 19 + Vite       |
| Routing  | React Router DOM 7                      |
| bcrypt   | authentication on Express                    |
| chartjs  | Statistical graphs               |

---

## Project Structure

```
Manage_energy_projects/
├── client/ # React Application (Frontend)
│ └── src/
│ ├── api/ # Backend Communication Services
│ ├── components/ # Reusable Interface Components
│ ├── context/ # Manage user access
│ ├── pages/ # Main Application Views
│ ├── styles/ # stylization of DOM elements
│ └── App.jsx # Route and Navigation Configuration
| ...
├── server/ # Express.js Server (Data Management)
│ ├── controllers/ # CRUD Controller Logic
│ ├── routes/ # API Endpoint Definition
│ ├── middlewares/ # Intermediate functions (Auth, etc.)
│ ├── db_client/ # Prisma client configuration
│ ├── prisma/ # Database schemas and migrations
│ └── index.js # Node server entry point
| ...
├── python_server/ # FastAPI server (Processing and PDF)
│ ├── app/ # CRUD Controller Logic
│   ├── api/ # API Endpoint and routing
│   ├── core/ # (Excel scrapping and PDF generation) Controller Logic
|   └── db/ # Database schemas and connection with SQLalchemy
|   └── main.py # setting FastAPI server (middlecore, ports)
```

---

## Database Setting

### 1. Neon — Database Setup

1. Create a free account at [neon.tech](https://neon.tech).
2. Create a new **Project** and a **Database** (e.g. `energy_db`).
3. From the Neon dashboard, copy the two connection strings:
   - **Connection string** → pooled connection (used by Prisma at runtime).
   - **Direct URL** → non-pooled connection (used by Prisma Migrate).

### 2. Environment Variables

Create a `.env` file inside both servers (`server/` & `python_server/`):

```env
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/energy_db?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/energy_db?sslmode=require"
```

> Neon requires both `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) so that Prisma Migrate can bypass the connection pooler.


### 3. Prisma Schema

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

model User {
  id        Int      @id @default(autoincrement())
  name      String   @db.VarChar(255)
  email     String   @unique @db.VarChar(255)
  password  String   @db.VarChar(255)
  created_at DateTime @default(now()) @db.Timestamptz(6)
  updated_at DateTime @default(now()) @db.Timestamptz(6)

  @@map("user")
}

model Project {
  id               Int      @id @default(autoincrement())
  project          String   @db.VarChar(255)
  LCOE             Float
  price            Float
  nro_panels       Int
  status           String   @db.VarChar(50)
  excel_file_path  String?  @db.VarChar(500)
  pdf_quote        String?  @db.VarChar(500)
  pdf_finantial    String?  @db.VarChar(500)
  created_at       DateTime @default(now()) @db.Timestamptz(6)
  updated_at       DateTime @default(now()) @db.Timestamptz(6)

  @@map("project")
}
```

### 4. Run Migrations & Generate Client

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

## Backend instalation

### Express server

```bash
cd server
npm install
cd prisma
npm run generate
npm run dev
```

### FastAPI server
```bash
cd python_server
pip install -r requirements.txt
python3 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000  
```

FastAPI now reads `DATABASE_URL` (for Neon) from environment variables.  
It automatically loads `.env` from:

- `python_server/.env`
- `server/.env` (recommended, already used by Prisma)

It also exposes:

- `GET /health` (API health)
- `GET /health/db` (Neon/PostgreSQL connectivity check)

---

## React Client installation

```bash
cd client
npm install
npm run dev
```

Optional environment variable for Express API base URL in frontend:

```env
VITE_SERVER_API_URL="http://localhost:3000"
```

Open `http://localhost:5173` in the browser.

---

## Workflow

1. **UI Interaction**: The user performs actions in the React client.
2. **Data Management**: Validation and CRUD requests are sent to the Express server.
3. **Processing**: Heavy-duty scraping and document generation tasks are delegated to FastAPI.
4. **Persistence**: Data is validated and queried in the PostgreSQL data layer.

---

## Features

- Comprehensive energy project management.
- User authentication and validation.
- Data import via Excel file scraping.
- Export of results and reports in PDF format.
- Show statistical graphs with charjs
