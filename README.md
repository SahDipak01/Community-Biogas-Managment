# Rural Community Biogas Feasibility and Resource Management System

A full-stack, responsive web application engineered for rural communities, Gram Panchayats, dairy cooperatives, and farming households. The system quantitatively evaluates the techno-economic feasibility of establishing domestic and community biogas digesters, manages organic biomass feedstock, pools resources among neighboring households, monitors active plant kinetics, tracks government subsidies, and provides GIS spatial mapping.

---

## 1. Technology Stack

- **Frontend:**
  - **Framework:** React.js 18 with Vite
  - **Styling:** Tailwind CSS (Clean, modern agricultural green `#059669` and crisp white aesthetic)
  - **Visualizations:** Recharts (Area charts for production trends, Donut charts for feedstock breakdown, Multi-line charts for temperature/pH kinetics)
  - **Geographical GIS:** Leaflet & OpenStreetMap (`react-leaflet`) with custom SVG color-coded markers
  - **Icons:** Lucide React icons
  - **Routing:** React Router DOM v6
  - **HTTP Client:** Axios with JWT Bearer request interceptors

- **Backend:**
  - **Runtime:** Node.js & Express.js
  - **Database:** MongoDB & Mongoose ODM
  - **Authentication:** JSON Web Tokens (JWT) & bcrypt.js password hashing
  - **Zero-Setup Database Engine:** Embedded `mongodb-memory-server` fallback — seamlessly runs and self-seeds out of the box if no external MongoDB daemon is active
  - **Architecture:** Clean MVC pattern with modular controllers, routes, models, and calculation engines

---

## 2. Default User Roles & Demo Credentials

The platform implements role-based access control (RBAC). For testing and demonstration, quick one-click login buttons are provided directly on the Login page:

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@biogas.gov.in` | `Admin@123` | Full system governance, all villages & plants, user access control, government scheme CRUD, global reports. |
| **Village Coordinator** | `coordinator@biogas.gov.in` | `Coord@123` | Gram Panchayat level management, household & cattle registry, daily feedstock collection logging, community pooling management, plant alerts. |
| **Household User** | `household@biogas.gov.in` | `House@123` | Household profile, bovine dung tracking, feasibility calculator, plant performance monitoring, bio-slurry entitlement tracking. |

---

## 3. Core Modules & Functional Capabilities

### A. Main Executive Dashboard
- **Aggregate Metrics:** Live counters for registered households, total bovine cattle, daily dung availability (kg/day), registered biogas plants, active/inactive units, daily gas yield (m³/day), and monthly financial savings in INR.
- **Interactive Visualizations:** 7-day actual vs. target biogas production area chart, 30-day feedstock composition donut chart, and plant operating status distribution.
- **Village-Level Filter:** Instantly filter global metrics by individual Gram Panchayat.
- **Live Anomaly Feed:** Real-time notifications for digesters requiring technical attention.

### B. Biogas Feasibility Calculator
- **Inputs:** Cattle population (custom breakdown for Cows, Buffaloes, Bullocks, Calves), average dung per animal, agricultural crop residues, household organic scrap, participating families, daily water availability, and capital installation budget.
- **Outputs:**
  - Total daily dung & organic waste (kg/day)
  - Estimated continuous biogas production (m³/day)
  - Recommended plant capacity ($1\text{ m}^3$ to $85\text{ m}^3$) & model recommendation (Fixed Dome Deenabandhu vs. Floating Drum KVIC)
  - Water adequacy rating (based on 1:1 dilution ratio)
  - Gross installation cost & applicable Central Financial Assistance (CFA) subsidy
  - Monthly savings breakdown: LPG cylinder replacement savings + bio-slurry organic fertilizer savings
  - Estimated financial payback period in years
  - Annual greenhouse gas reduction ($\text{kg CO}_2\text{ equivalent avoided}$)
- **Feasibility Verdict:** Dynamic categorization into **Highly Feasible** (Green), **Moderately Feasible** (Amber), or **Not Feasible** (Red), with contextual engineering explanations and recommendations.
- **Assumptions Modal:** Full technical disclosure of digestion kinetics (mesophilic 25-35°C, $0.037\text{ m}^3\text{/kg}$ dung, $1\text{ m}^3\text{ gas} \approx 0.43\text{ kg LPG}$).

### C. Feedstock & Resource Management
- **Daily Collection Logging:** Record batches of animal dung, agricultural residue, and kitchen scrap with collector verification.
- **Seasonal Analysis:** Tracks fluctuations across Summer, Monsoon, and Winter seasons.
- **Utilization Status:** Monitors biomass recorded, fed into digesters, or composted.
- **Search, Filters & CSV Export:** Search logs by collector, filter by season or status, and export full records to CSV.

### D. Community Resource Sharing & Pooling
- **Resource Pooling Engine:** Multi-household biomass aggregation allowing smallholder families with 1-2 cattle to combine feedstock for a shared $6\text{ m}^3$ to $85\text{ m}^3$ community digester.
- **Bio-Slurry Dividends:** Automatic calculation of daily organic nutrient slurry return allocation based on proportional contribution.
- **Community Plant Site Centroid:** Geospatial centroid algorithm evaluates participating household GPS coordinates, road access, and water proximity to recommend optimal physical locations for community digester construction.

### E. Biogas Plant Monitoring & Alert Engine
- **Telemetry Tracking:** Daily feedstock input, gas volume produced, digester temperature (°C), slurry pH level ($0-14$), and slurry discharge volume.
- **Manual vs. Simulated Distinction:** Explicit tags identifying manually logged field entries from simulated IoT telemetry streams.
- **Automated Biochemical Alerts:**
  - **Low Temperature Alert:** Digester temperature $< 20^\circ\text{C}$ (Mesophilic methanogen inhibition).
  - **Acidification Alert:** pH $< 6.5$ (Excess volatile fatty acid buildup).
  - **High Alkalinity / Ammonia Alert:** pH $> 8.0$.
  - **Reduced Gas Production Warning:** Production $< 70\%$ of design capacity despite normal feeding.
  - **Possible Gas Leakage:** Low gas volume and line pressure drop despite normal feeding.
  - **Blocked Pipes:** Zero slurry outflow with elevated internal digester pressure.

### F. Geographical GIS Mapping
- Built with **Leaflet** and **OpenStreetMap**.
- Custom SVG marker pins distinguishing:
  - Active Biogas Plants (Emerald pin with flame)
  - Plants Under Maintenance (Amber warning pin)
  - Potential Community Plant Sites (Blue star pin)
  - Organic Waste Collection Depots (Purple recycle pin)
  - Registered Farming Households (Slate home pin)
- Clickable popup dialogs with plant codes, models, capacities, and household contact info.

### G. Government Schemes & Subsidy Management
- Verified repository of government bioenergy programs:
  - **National Bioenergy Programme (MNRE):** Central Financial Assistance (₹9,800 to ₹22,000 via DBT).
  - **GOBAR-DHAN (Ministry of Jal Shakti):** Up to ₹50 Lakhs for cluster-scale community digesters.
  - **SATAT Initiative (MoP&NG):** Commercial bio-CNG subsidies and assured OMC offtake.
  - **State Bioenergy Mission Top-up Subsidies.**
- Direct links to official ministry portals, documentation checklists, and Admin CRUD management.

### H. Reports & Analytics
- Monthly biogas production vs. biomass consumed comparison bar charts.
- Gram Panchayat resource availability summary tables.
- Household contribution leaderboards.
- One-click CSV report downloads and clean printable PDF reports (`window.print`).

---

## 4. Project Folder Structure

```
Community Biogas Managment/
├── backend/
│   ├── config/
│   │   └── db.js                       # Mongoose connection & in-memory fallback
│   ├── controllers/
│   │   ├── authController.js           # JWT registration & authentication
│   │   ├── dashboardController.js      # Aggregated metrics & chart feeds
│   │   ├── calculatorController.js     # Biogas feasibility & sizing
│   │   ├── feedstockController.js      # Biomass logs & seasonal variance
│   │   ├── communityController.js      # Resource pooling & site selection
│   │   ├── monitoringController.js     # Plant telemetry & alert engine
│   │   ├── mapController.js            # Spatial GIS GeoJSON & marker feeds
│   │   ├── schemeController.js         # Government subsidies CRUD
│   │   ├── reportController.js         # CSV & analytics endpoints
│   │   ├── householdController.js      # Household & cattle registry
│   │   ├── villageController.js        # Village metadata & coordinates
│   │   └── userController.js           # Role access control (Admin)
│   ├── models/                         # 10 Mongoose schemas
│   ├── middleware/                     # JWT auth & error handlers
│   ├── utils/
│   │   ├── biogasCalculator.js         # Thermodynamics & kinetic engine
│   │   └── alertEngine.js              # Biochemical anomaly detection
│   ├── seeds/
│   │   └── seedData.js                 # Realistic seed data generator
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/                 # Modals, Badges, Charts, GIS Map, Navigation
│   │   ├── context/                    # AuthContext & NotificationContext
│   │   ├── pages/                      # 11 Full-Featured Module Pages
│   │   ├── services/                   # Axios API service layer
│   │   ├── App.jsx                     # Routes & ProtectedRoute guard
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── .env.example
├── package.json                        # Orchestration scripts
└── README.md
```

---

## 5. Installation & Setup Instructions

### Prerequisites
- **Node.js** (v18.0.0 or later, v24 recommended)
- **npm** (v9.0.0 or later)
- *Optional:* Local MongoDB daemon or MongoDB Atlas URI (If omitted, the server automatically starts an in-memory MongoDB instance with full schema validation and auto-seeding).

---

### Step 1: Install Dependencies

Open a terminal in the root directory:

```bash
# Install backend packages
cd backend
npm install

# Install frontend packages
cd ../frontend
npm install

# Return to root
cd ..
```

---

### Step 2: Environment Configuration

Copy the example environment files:

```bash
# In the root directory or backend directory:
cp backend/.env.example backend/.env
```

Default configuration in `backend/.env`:
```ini
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/biogas_db
JWT_SECRET=rural_biogas_jwt_super_secure_secret_key_2026
JWT_EXPIRE=30d
```

---

### Step 3: Run the Application

You can start the backend and frontend in separate terminals:

#### Terminal 1: Start Backend Server
```bash
cd backend
npm start
```
*Output will display:*
```
[Database] MongoDB Connected / In-memory MongoDB Server successfully active
[Seed] Database successfully seeded with 3 villages, 3 roles, households, cattle, plants, monitoring logs, community pools, schemes & alerts.
[Server] Rural Biogas Backend Server running on port 5000
[Server] API Base URL: http://localhost:5000/api
```

#### Terminal 2: Start Frontend Application
```bash
cd frontend
npm run dev
```
*Output will display:*
```
  VITE v6.1.0  ready in 320 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

Now open **http://localhost:3000** in your browser.

---

## 6. Testing & Demonstration Guide

1. **Sign In:**
   - Navigate to `http://localhost:3000/login`.
   - Click the **"Admin"** button for instant one-click login as Dr. Rajeshwar Sharma (`admin@biogas.gov.in`).
2. **Explore Dashboard:**
   - Review live KPI metric cards (Households, Cattle count, Dung availability, Plants, Gas production, Economic savings).
   - Use the **Gram Panchayat dropdown** to toggle between national aggregated metrics and individual villages (e.g., Rampur, Sundarpur, Shanti Gram).
3. **Test Feasibility Calculator:**
   - Click **"Feasibility Tool"** in the sidebar.
   - Adjust cattle counts (e.g., 5 cows, 2 buffaloes), agricultural waste, and water availability.
   - Observe real-time sizing adjustments (recommended capacity in $m^3$, capital cost, applicable subsidy, monthly LPG savings, payback timeline, and feasibility verdict).
   - Click **"Engineering Assumptions"** to verify calculation parameters.
4. **Feedstock Management:**
   - Navigate to **"Feedstock & Waste"**.
   - Review 30-day logs of bovine dung, crop waste, and food scrap.
   - Click **"Record Daily Waste"** to log a new daily batch.
   - Click **"Export CSV"** to download the dataset.
5. **Community Resource Pooling:**
   - Navigate to **"Community Sharing"**.
   - View collective feedstock availability across households in Rampur.
   - Inspect recommended physical community plant locations with geospatial suitability scores.
   - Click **"Join Resource Pool"** to register a new household commitment.
6. **Plant Monitoring & Health Telemetry:**
   - Navigate to **"Plant Monitoring"**.
   - Review operational alerts (low temperature, pH acidification warnings).
   - Click **"Log Plant Reading"**, toggle between **Manual Entry** and **IoT Simulated Stream**, and test entering abnormal values (e.g., Temperature 16°C or pH 6.1) to observe automatic alert triggers.
7. **Geographical GIS Map:**
   - Navigate to **"Geographical Map"**.
   - Inspect interactive Leaflet pins across the village boundary. Click any marker to view digester specifications, capacity, or household details.
8. **Government Schemes:**
   - Navigate to **"Government Schemes"**.
   - Browse National Bioenergy Programme and GOBARdhan guidelines, click **"View Full Criteria"**, or test adding a new subsidy scheme (as Admin).
9. **Reports & Analytics:**
   - Navigate to **"Reports & Analytics"**.
   - Review 12-month production comparisons and click **"Print Report (PDF)"** or **"Export CSV"**.
10. **Role Switching:**
    - Log out and log in as **"Village Coordinator"** (`coordinator@biogas.gov.in`) or **"Household User"** (`household@biogas.gov.in`) to verify role-based permissions and scoped navigation.

---

## 7. Production Build & Deployment

To prepare the application for production deployment:

```bash
# Build optimized frontend bundle
cd frontend
npm run build
```

The compiled static assets will be created in `frontend/dist/`. In production, you can configure Express in `backend/server.js` or an NGINX reverse proxy to serve `frontend/dist` on port 80/443.
