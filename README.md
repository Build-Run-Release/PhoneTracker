# Phone Tracker - Persistent ID Version

This is a real-time location tracking application using **Node.js**, **Socket.io**, and **Leaflet Maps**.
It uses **Generated Persistent IDs** to identify devices, meaning you can track your phone even if it's stolen, provided you have saved your unique Device ID.

## Features
- **Real-time Tracking**: Uses HTML5 Geolocation to stream location data.
- **Persistent IDs**: Auto-generates a unique ID (e.g., `X9Z-23A`) on first visit.
- **Stolen Phone Recovery**: If you know your ID, you can track your device remotely.
- **PostgreSQL Integration**: Logs active sessions (optional).

## Local Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Server**:
   ```bash
   node server.js
   ```

3. **Open Application**:
   - Go to `http://localhost:3000` on your phone (or simulator).
   - Click **Start Sharing Location**.
   - Note down the **Device ID**.
   - Open `http://localhost:3000` on another device.
   - Enter the ID and click **Start Tracking**.

## Deployment on Railway

This app is ready for [Railway.app](https://railway.app/).

### 1. Push to GitHub
Upload this code to a GitHub repository.

### 2. Create Project on Railway
1. Log in to [Railway Dashboard](https://railway.app/).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select your repository.
4. Click **Deploy Now**.

### 3. Add a Database (Optional)
To log device sessions persistently:
1. In your Railway project view, right-click (or click "New") -> **Database** -> **Add PostgreSQL**.
2. Railway will automatically set the `DATABASE_URL` environment variable for your app.
3. Redeploy the app (it usually auto-deploys).
4. The server will now connect to the DB and create the `sessions` table automatically.

### 4. Public Access
1. Go to your App service settings.
2. Under **Networking**, click **Generate Domain**.
3. You now have a public URL (e.g., `phone-tracker-production.up.railway.app`) to share with your devices.
