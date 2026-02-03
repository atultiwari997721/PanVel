# PanVel - Ride Sharing App

A MERN stack ride-sharing application with real-time tracking, partner interface, and admin dashboard.

## Prerequisites

- Node.js (v18+)
- Supabase Account (URL and Anon Key required)

## Project Structure

- `backend/` - Node.js + Express + Socket.io server
- `frontend/` - React + Vite + Tailwind CSS client

## How to Run

### 1. Start the Backend

Open a terminal in the `backend` folder:

```bash
cd backend
npm install
node server.js
```

The server runs on **http://localhost:5000**.

### 2. Start the Frontend

Open a NEW terminal in the `frontend` folder:

```bash
cd frontend
npm install
npm run dev
```

The app runs on **http://localhost:5173**.

## Features

- **User**: Book rides, view live price estimates, track driver.
- **Partner**: "Go Online" to receive ride requests, view pickup/drop locations.
- **Admin**: View all active/past rides, monitor active drivers, cancel rides.

## Troubleshooting

- **White Screen?**
  - Run `npm install` in frontend to ensure dependencies are present.
  - Check browser console for errors.
- **Map not loading?**
  - Ensure internet connection (loading OpenStreetMap tiles).
  - Verify `leaflet` and `react-leaflet` versions are compatible (fixed in package.json).