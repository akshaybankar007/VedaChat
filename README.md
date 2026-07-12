# VedaChat

A real-time, full-stack chat application built to demonstrate seamless websockets integration, secure authentication, and scalable MERN architecture. 

## 🚀 Live Demo & Proof of Concept
- **Frontend (Vercel):** [\[Insert your Vercel URL here\]](https://veda-chat.vercel.app)
- **Backend (Render):** [\[Insert your Render URL here\]](https://vedachat.onrender.com)
- **Video Walkthrough:** [Coming soon]

## ✨ Features
- **Real-Time Communication:** Bi-directional event-based communication utilizing Socket.io for zero-latency messaging.
- **Secure Authentication:** JWT-based stateless authentication with bcrypt password hashing.
- **Active Presence Tracking:** Live online/offline status and typing indicators broadcasted across active clients.
- **Automated Security Alerts:** Asynchronous SMTP integration via Nodemailer to alert users of new account access.
- **Responsive UI:** Modern, mobile-first design system optimized for accessibility and aesthetic engagement.

## 🛠️ Technical Stack
**Client-Side (Frontend)**
- React.js (Vite)
- Socket.io-client
- Axios for HTTP requests
- CSS3 (Custom Design System)

**Server-Side (Backend)**
- Node.js & Express.js
- Socket.io
- MongoDB Atlas & Mongoose
- JSON Web Tokens (JWT) & Bcrypt
- Nodemailer

## ⚙️ Local Development Setup

### 1. Clone the Repository
\`\`\`bash
git clone https://github.com/akshaybankar007/VedaChat.git
cd VedaChat
\`\`\`

### 2. Environment Configuration
Create a `.env` file in both the frontend and backend directories.

**Backend `.env`:**
\`\`\`env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secure_jwt_secret
CLIENT_URL=http://localhost:5173
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password
\`\`\`

**Frontend `.env`:**
\`\`\`env
VITE_API_URL=http://localhost:5000
\`\`\`

### 3. Installation & Execution
Open two terminal instances.

**Terminal 1 (Backend):**
\`\`\`bash
cd server
npm install
npm run dev
\`\`\`

**Terminal 2 (Frontend):**
\`\`\`bash
cd client
npm install
npm run dev
\`\`\`

## 👨‍💻 Author
**Akshay Yogeshwar Bankar**
- GitHub: [akshaybankar007](https://github.com/akshaybankar007)
- LinkedIn: [akshay--bankar](https://www.linkedin.com/in/akshay--bankar)