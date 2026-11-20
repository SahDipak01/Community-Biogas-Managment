# Rural Community Biogas Feasibility and Resource Management System

## About the Project

A full-stack MERN-based web application designed to help rural communities assess biogas plant feasibility, manage organic waste resources, monitor biogas production, and promote sustainable energy generation through community-based resource sharing.

The system supports households, village coordinators, and administrators through centralized resource management, feasibility analysis, plant monitoring, and geographical visualization.

## Key Features

- **Admin Management:** Manage villages, users, households, biogas plants, and government schemes.
- **Village Management:** Maintain village information, household registrations, cattle records, and community resources.
- **Biogas Feasibility Calculator:** Evaluate biogas production potential, recommended plant capacity, installation costs, subsidies, savings, and estimated payback period.
- **Feedstock Management:** Track daily organic waste collection, including cattle dung, agricultural residues, and kitchen waste.
- **Community Resource Sharing:** Combine organic waste contributions from multiple households to support shared biogas plants.
- **Plant Monitoring:** Track feedstock input, gas production, temperature, pH levels, and plant operating conditions with automated alerts.
- **GIS Mapping:** Visualize households, biogas plants, waste collection points, and potential community plant locations using interactive maps.
- **Government Schemes:** Explore bioenergy programs, subsidy information, and eligibility details.
- **Digestate Management:** Track bio-slurry distribution and household contributions.
- **Reports and Analytics:** Monitor biogas production, resource availability, household contributions, and overall system performance.

## User Roles

- **Administrator:** Manages the overall system, users, villages, plants, government schemes, and reports.
- **Village Coordinator:** Manages village households, cattle records, daily waste collection, community contributions, and plant monitoring.
- **Household User:** Manages household information, tracks cattle and waste contributions, evaluates biogas feasibility, and monitors plant performance.

## Demo Login Credentials

Use the following credentials to access the application with different user roles.

| User Role | Email | Password |
|---|---|---|
| Administrator | admin@biogas.gov.in | Admin@123 |
| Village Coordinator | coordinator@biogas.gov.in | Coord@123 |
| Household User | household@biogas.gov.in | House@123 |

**Note:** These are demonstration credentials. Use them only for testing and evaluation. Do not use real government accounts or production credentials.

## Technology Stack

- **Frontend:** React.js 18, Vite, Tailwind CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB, Mongoose
- **Authentication:** JWT, bcrypt.js
- **Libraries:** Axios, React Router DOM, Recharts, Leaflet, OpenStreetMap, Lucide React

## Installation & Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/rural-community-biogas-management.git
cd rural-community-biogas-management
```

### 2. Install Dependencies
```bash
# Install both backend and frontend dependencies
npm run install:all
```

### 3. Environment Configuration
Copy the placeholder environment configuration:
```bash
cp .env.example backend/.env
```
> **Zero-Setup Database Notice:** If a local MongoDB instance is not active, the backend automatically starts an in-memory MongoDB database pre-seeded with all 14 operational collections (households, plants, feedstock, schemes, and telemetry) for immediate evaluation.

### 4. Start the Application
```bash
# Option A: Start backend server
npm run server

# Option B: Start frontend client
npm run client
```
Open [http://localhost:3000](http://localhost:3000) (or Vite assigned port) in your browser.

## Testing & Quality Assurance

The system includes a master automated test suite verifying all 12 system domains (Authentication, RBAC, Feasibility Calculator, Feedstock CRUD, Resource Sharing, Monitoring Alerts, GIS, Schemes, Digestate, Analytics, Security, and E2E Workflows):

```bash
# Run full automated test suite
npm test
```

## Project Objective

To develop a centralized digital platform that promotes renewable energy adoption in rural communities by evaluating biogas feasibility, improving organic waste management, encouraging community resource sharing, and supporting sustainable rural development.
