# iPromo 3D Product Configurator

> Generate photorealistic, interactive 3D mockups from any iPromo product URL — with live color switching, logo placement, shareable links, and one-click PDF export.

![iPromo 3D Configurator](https://www.ipromo.com/skin/frontend/ultimo/ipromo/images/logo.png)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔗 **URL-to-3D** | Paste any iPromo product URL — the app scrapes product data and generates a 3D model automatically |
| 🎨 **Live Color Switching** | Instantly recolor the 3D model using scraped color swatches |
| 🖼 **Logo Upload** | Drag-and-drop PNG / JPG / SVG logos placed as decals on the model |
| 📐 **Logo Controls** | Resize and reposition the logo with sliders |
| 🔗 **Shareable Links** | Encode the full config (product + color + logo) into a URL — no login needed |
| 📄 **PDF Export** | Download a branded iPromo mockup PDF with product details |
| ⚡ **Model Caching** | Generated models are cached — second load is instant |

---

## 🏗 Project Structure

```
leo-ipromo-3d-model/
├── backend/                  # Node.js / Express API
│   ├── server.js             # Main server — routes & job queue
│   ├── scraper.js            # iPromo product page scraper (Cheerio)
│   ├── tripo.js              # Tripo3D API integration (image → GLB)
│   ├── colorMap.js           # Color name → hex lookup table
│   ├── package.json
│   └── .env.example          # Environment variable template
│
├── frontend/                 # React app
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.jsx           # Root component — state machine
│   │   ├── index.js          # React entry point
│   │   ├── Viewer3D.jsx      # Three.js 3D viewer with decals
│   │   ├── ColorPanel.jsx    # Color swatch selector
│   │   ├── LogoUploader.jsx  # Drag-and-drop logo + sliders
│   │   ├── URLInput.jsx      # Landing / URL input screen
│   │   ├── LoadingScreen.jsx # Generation progress screen
│   │   ├── api.js            # Axios API client
│   │   ├── pdfExport.js      # jsPDF branded export
│   │   └── shareLink.js      # URL encode/decode for sharing
│   ├── package.json
│   └── .env.example
│
├── render.yaml               # Render.com backend deployment config
├── vercel.json               # Vercel frontend deployment config
├── package.json              # Root — monorepo scripts
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ (if running locally)
- **Docker** and **Docker Compose** (for containerized deployment)
- A **Tripo3D API key** — get one at [platform.tripo3d.ai](https://platform.tripo3d.ai/)

### 1. Clone the repository

```bash
git clone https://github.com/Cplus-Soft-Limited/leo-ipromo-3d-model.git
cd leo-ipromo-3d-model
```

### 2. Install all dependencies

```bash
npm run install:all
```

This installs root, backend, and frontend dependencies in one command.

### 3. Configure environment variables

**Backend:**
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
TRIPO_API_KEY=your_tripo_api_key_here
PORT=3001
```

**Frontend:**
```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:3001
```

### 4. Run in development mode

```bash
npm run dev
```

This starts both the backend (port `3001`) and frontend (port `3000`) concurrently.

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ How It Works

```
User pastes iPromo URL
        ↓
Backend scrapes product page (Cheerio)
  → product name, primary image, color swatches, SKU
        ↓
Backend downloads product image → uploads to Tripo3D API
  → submits image_to_model task (v3.1 best quality)
  → polls until complete → returns .glb URL
        ↓
Frontend loads .glb in Three.js
  → applies fabric PBR material (roughness=0.85, metalness=0)
  → color tinting via material.color blend
  → logo decal via DecalGeometry
        ↓
User can: switch colors, upload logo, share link, export PDF
```

---

## 🐳 Docker Deployment (Recommended)

This is the fastest way to get the full stack running on any machine or VM.

### 1. Configure Environment
Make sure your env files are set up:
- **Backend**: `backend/.env` should contain `TRIPO_API_KEY`.
- **Frontend**: `frontend/.env.local` should contain `REACT_APP_API_URL=http://<VM_IP_OR_LOCALHOST>:3001`.

### 2. Launch
Run the following command from the root directory:
```bash
docker compose up --build -d
```

### 3. Access the App
- **Frontend**: [http://localhost:3000](http://localhost:3000) (or your VM IP)
- **Backend**: [http://localhost:3001](http://localhost:3001) (or your VM IP)

> [!TIP]
> This setup includes volume mounting for the `backend/` and `frontend/` folders, meaning any code changes you save will automatically reflect in the running containers via Hot Module Replacement (HMR) and Nodemon.

---

## 🌐 Deployment

### Backend → Render.com

1. Push to GitHub (this repo)
2. Create a new **Web Service** on [render.com](https://render.com)
3. Connect this repository — Render auto-detects `render.yaml`
4. Add `TRIPO_API_KEY` in the Render dashboard under **Environment**
5. Deploy — note your backend URL (e.g. `https://ipromo-configurator-backend.onrender.com`)

### Frontend → Vercel

1. Import this repo on [vercel.com](https://vercel.com)
2. Set the environment variable:
   ```
   REACT_APP_API_URL=https://your-backend-url.onrender.com
   ```
3. Deploy — Vercel uses `vercel.json` for build config automatically

---

## 🔌 API Reference

### `POST /api/scrape`
Scrape product data from an iPromo URL.

**Request:**
```json
{ "url": "https://www.ipromo.com/crosswind-quarter-zip-sweatshirt.html" }
```

**Response:**
```json
{
  "productName": "Crosswind Quarter-Zip Sweatshirt",
  "primaryImage": "https://www.ipromo.com/...",
  "colors": [
    { "name": "Navy", "hex": "#001f5b" },
    { "name": "Black", "hex": "#1a1a1a" }
  ],
  "sku": "S101",
  "sourceUrl": "https://www.ipromo.com/..."
}
```

### `POST /api/generate`
Start 3D model generation. Returns a job ID immediately.

**Request:**
```json
{ "imageUrl": "https://...", "productUrl": "https://..." }
```

**Response:**
```json
{ "jobId": "abc123", "status": "PENDING" }
```

### `GET /api/status/:jobId`
Poll generation progress.

**Response:**
```json
{
  "status": "SUCCEEDED",
  "progress": 100,
  "glbUrl": "/api/proxy-glb?url=https://...",
  "thumbnail": "https://..."
}
```

### `GET /api/health`
Health check / status overview.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Three.js, @react-three/fiber |
| 3D Rendering | Three.js — GLTFLoader, OrbitControls, DecalGeometry |
| Backend | Node.js, Express |
| Scraping | Axios, Cheerio |
| 3D Generation | [Tripo3D API](https://platform.tripo3d.ai/) (image_to_model) |
| PDF Export | jsPDF |
| Frontend Hosting | Vercel |
| Backend Hosting | Render.com |

---