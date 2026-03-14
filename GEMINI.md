# SoHoaBBK Project Context

This project, **SoHoaBBK**, is a comprehensive Quality Control System (KCS) designed to digitize inspection processes, reporting, and catalog management. It consists of a unified backend serving both a web-based management portal and a mobile application for floor-level inspections.

## Project Overview

### Architecture & Tech Stack
- **Backend (`/server`)**: 
  - **Runtime**: Node.js with Express.
  - **Database**: SQL Server (`mssql`) using Stored Procedures for business logic and data access.
  - **Security**: JWT-based authentication with `argon2` password hashing.
  - **Middleware**: Custom authentication and permission-based authorization.
- **Web Frontend (`/sohoa-bbk-web`)**:
  - **Framework**: React 19 with Vite.
  - **UI Library**: Material UI (MUI) v7.
  - **Routing**: React Router v7.
  - **Purpose**: Administrative management, catalog configuration, and detailed reporting.
- **Mobile App (`/kcs-mobile`)**:
  - **Framework**: Expo / React Native.
  - **UI Library**: React Native Paper.
  - **Navigation**: React Navigation.
  - **Purpose**: Real-time inspection execution ("Phieu Kiem") by workers on the production floor.

## Key Features
- **Authentication**: Role-based access control (RBAC) with specific permissions (e.g., `XEM_PHIEU_KIEM`, `THUC_HIEN_KIEM`, `XAC_NHAN_PX`).
- **Inspection Management ("Phieu Kiem")**: Creation, assignment, AQL calculation, and multi-stage confirmation (KCS -> PX -> Kiem Nghiem).
- **Incident Reporting ("Bien Ban")**: Tracking defects, assigning responsibilities, and proposing corrective actions.
- **Catalog Management ("DanhMuc")**: CRUD operations for Products, Inspection Groups, Check Items, and Defect types.

## Development & Execution

### Prerequisites
- Node.js (v18+ recommended)
- SQL Server (with the required stored procedures and schema)

### Backend
- **Path**: `server/`
- **Commands**:
  - `npm install`: Install dependencies.
  - `npm run server`: Start development server with `nodemon`.
- **Config**: Requires a `.env` file with `JWT_SECRET`, `PORT`, and DB connection details.

### Web Frontend
- **Path**: `sohoa-bbk-web/`
- **Commands**:
  - `npm install`: Install dependencies.
  - `npm run dev`: Start Vite development server.
  - `npm run build`: Build for production.
- **Config**: API endpoint is configured in `src/api/axiosClient.js`.

### Mobile App
- **Path**: `kcs-mobile/`
- **Commands**:
  - `npm install`: Install dependencies.
  - `npx expo start`: Start Expo development server.
- **Config**: API `baseURL` in `src/api/axiosClient.js` needs to be set to the server's local IP address for physical device testing.

## Development Conventions
- **Database Logic**: Avoid writing complex SQL queries in the Express routes. Use Stored Procedures (`sp_...`) via `pool.request().execute('sp_Name')`.
- **API Client**: Always use the centralized `axiosClient` in both Web and Mobile to ensure consistent token handling and error processing.
- **Styling**: 
  - Web: Use MUI components and Emotion for styling.
  - Mobile: Use React Native Paper components for a consistent Material Design feel.
- **Permissions**: Use the `authorize` middleware in the backend to protect routes based on permission codes.
