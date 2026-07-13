# VedaChat

A production-ready, real-time 1-on-1 chat application demonstrating scalable MERN architecture, secure WebSockets, and modern UX design. 

## 🚀 Live Demo
- **Frontend (Vercel):** [https://veda-chat.vercel.app](https://veda-chat.vercel.app)
- **Backend (Render):** [https://vedachat.onrender.com](https://vedachat.onrender.com)
- **Video Walkthrough:** [Watch on Google Drive](https://drive.google.com/file/d/1CiiyHA5mFiGDEyEQq24Y-HMa-gPMJGbz/view?usp=sharing)

## ✨ Key Features
- **Private 1-on-1 Messaging:** Isolated socket rooms for secure, zero-latency communication.
- **Modern UX/UI:** Smart timestamps, animated typing indicators, seamless auto-scrolling, and dark/light mode toggles.
- **Advanced Interactions:** Custom context menus for message copying and synchronized deletion across clients.
- **State Management & Notifications:** Real-time unread message badges, read receipts, and a custom toast notification system.
- **Secure & Optimized:** JWT-based stateless authentication, Axios interceptors for session management, and compound MongoDB indexing for high-performance querying.
- **Graceful Error Handling:** REST API fallbacks for when Socket.IO drops, plus graceful server shutdowns to prevent memory leaks.
- **Responsive Design:** Mobile-first, accessible interface built entirely with a custom CSS design system.

## 🛠️ Technical Stack
**Client-Side (Frontend)**
- React.js (Vite)
- Socket.io-client
- Axios (with Interceptors)
- React Router DOM
- CSS3 (Custom Design System, No UI Libraries)

**Server-Side (Backend)**
- Node.js & Express.js
- Socket.io
- MongoDB Atlas & Mongoose
- JSON Web Tokens (JWT) & Bcrypt

## ⚙️ Local Development Setup

### 1. Clone the Repository
\`\`\`bash
git clone https://github.com/akshaybankar007/VedaChat.git
cd VedaChat
\`\`\`

### 2. Backend Setup
Open a terminal and navigate to the backend directory (if separated, or root if combined). Install dependencies:
\`\`\`bash
npm install
\`\`\`

Create a `.env` file in the backend root directory and add the following:
\`\`\`env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
CLIENT_URL=http://localhost:5173
\`\`\`

Start the backend server:
\`\`\`bash
npm run dev
\`\`\`

### 3. Frontend Setup
Open a new terminal, navigate to your frontend directory (e.g., `client` or `src` depending on your structure), and install dependencies:
\`\`\`bash
npm install
\`\`\`

Create a `.env` file in the frontend root directory:
\`\`\`env
VITE_API_URL=http://localhost:5000
\`\`\`

Start the Vite development server:
\`\`\`bash
npm run dev
\`\`\`

### 4. Usage
Open `http://localhost:5173` in your browser. Create two separate accounts (use incognito for the second one) and start chatting.

## 🤝 Author
**Akshay Bankar**
- GitHub: [@akshaybankar007](https://github.com/akshaybankar007)
- LinkedIn: [Akshay Bankar](https://www.linkedin.com/in/akshay--bankar)