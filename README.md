# 🖌️ Collaborative Whiteboard

A real-time collaborative whiteboard application where multiple users can join a room, draw together on a shared canvas, and see each other’s changes instantly. Built for seamless remote collaboration — perfect for teaching, brainstorming, or sketching with friends.

## 🚀 Features

* 🔗 Join rooms using a unique room code
* 👥 Live user count per room
* ✏️ Real-time drawing synchronization across all users
* 🎨 Toolbar with color and stroke width selection
* 🖱️ Cursor tracking for all connected users
* 🧹 Clear canvas option (syncs for everyone)
* ♻️ Persistent storage so drawings reload after refresh or rejoin

## 🛠️ Tech Stack

* **Frontend:** React
* **Backend:** Node.js, Express
* **Real-time Communication:** Socket.IO
* **Database:** MongoDB

## 📦 Getting Started

1. Clone the repo

   ```bash
   git clone https://github.com/your-username/collaborative-whiteboard.git
   cd collaborative-whiteboard
   ```
2. Install dependencies for both client and server

   ```bash
   cd server && npm install  
   cd ../client && npm install  
   ```
3. Start the backend server

   ```bash
   cd server  
   npm run dev  
   ```
4. Start the frontend client

   ```bash
   cd client  
   npm start  
   ```
5. Open `http://localhost:3000`, join a room, and start drawing!

---

⚡ **Try it out with two browser windows to see live collaboration in action.**

---
