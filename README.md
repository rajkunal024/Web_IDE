# 🌌 Aether Studio — Premium Multi-File Online IDE

Aether Studio is a state-of-the-art, browser-based online development environment (IDE) built for compiling and running code in real-time. Featuring a polished responsive design, dynamic light/dark theme aesthetics, robust file hierarchies, and isolated backend code execution, it provides developers with an experience similar to local editors without any local setup.

---

## 🌟 Key Capabilities

- **⚡ Isolated Code Execution**: Stream compilation logs and outputs in real-time via Socket.IO sandboxing fallbacks. Supports execution timers and standard input (stdin) piping.
- **📚 11+ Supported Languages**: Ready-to-go boilerplates and execution support for **Python, C, C++, Java, Go, Rust, JavaScript, TypeScript, Ruby, R, and PHP**.
- **📂 Nested File Explorer**: Create, nested-folder organize, duplicate, rename, delete, and download full project structures as a `.zip` bundle.
- **🎨 Curated Theme Systems**: Dynamic switches between premium themes, including high-contrast light modes (Aether Light) and refined dark modes (Aether Dark, Midnight, Ocean, and Forest).
- **🔒 Secure Guest Mode & Auth**: Confines guest users strictly to an isolated sandbox playground with client-side localStorage persistency, while allowing authenticated users full dashboard projects, profile avatars, and preferences.
- **🖼️ ImageKit Profile customizer**: Upload and host user avatars using the integrated **ImageKit** Node SDK base64 pipeline, updating the user settings dashboard in real-time.
- **🔑 OTP Password Recovery**: Multi-stage numeric 6-digit OTP generation in backend logs and validation interfaces for password recovery.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), Monaco Editor (`@monaco-editor/react`), TailwindCSS, Framer Motion, Axios, Socket.IO Client.
- **Backend**: Express (Node.js), Socket.IO, ImageKit Node SDK, Dockerode, JSON Web Tokens (JWT), BCryptJS, Mongoose.
- **Database**: MongoDB (Atlas cloud store).

---

## 📁 Repository Directory Structure

```
Web_IDE/
├── backend/               # Express REST API & Socket.IO server
│   ├── bin/               # Server run entry-point (www)
│   ├── config/            # DB settings
│   ├── middleware/        # JWT auth protection
│   ├── models/            # Mongoose collections (User, File, Project, etc.)
│   ├── routes/            # REST API endpoints (auth, files, projects)
│   ├── services/          # child_process local compilation fallbacks
│   └── socket/            # Socket.IO live console logs stream
├── frontend/              # React Vite SPA Client
│   ├── src/
│   │   ├── context/       # State contexts (Auth, Preferences)
│   │   ├── pages/         # UI layouts (Home/Dashboard, Editor, Playground, Auth)
│   │   └── services/      # Axios request configs
│   ├── index.html
│   └── vite.config.js
└── .gitignore             # Git files ignore config
```

---

## 🚀 Setting Up Locally

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MongoDB](https://www.mongodb.com/) (Local instance or Atlas Connection string)

### 2. Environment Configuration
Create a `.env` file inside the `backend/` directory with the following variables:

```env
MONGODB_URI="your_mongodb_connection_string"
JWT_SECRET="your_jwt_signing_secret"
PORT=3000
PISTON_URL="https://emkc.org"

# ImageKit Credentials
IMAGEKIT_PUBLIC_KEY="your_imagekit_public_key"
IMAGEKIT_PRIVATE_KEY="your_imagekit_private_key"
IMAGEKIT_URL_ENDPOINT="https://ik.imagekit.io/your_imagekit_id"
```

### 3. Run the Entire Project
From the root workspace directory, install dependencies and run the start script:
```bash
npm install
npm start
```
This will concurrently start both the Node.js backend server and the React dev environment.

Navigate to the local client URL (usually `http://localhost:5174`) to launch the workspace IDE.
