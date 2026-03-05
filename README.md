# IUT Digital Yearbook (Student Project)

This project is a digital yearbook platform designed for IUT students to capture, share, & preserve university memories. It features a scrapbook-inspired interface & a robust backend to h&le student registrations, memory sharing, & community interactions.

## 🎓 Project Overview

This is a full-stack web application developed as a student project. It aims to modernize the traditional yearbook experience by providing an interactive, digital space for students, clubs, & departments.

## ✨ Features

### For Students

- **OTP-Gated Registration:** Secure sign-up using university emails (`@iut-dhaka.edu`) with OTP verification.
- **Personalized Profiles:** Custom student profiles with display photos, bios, & mottos.
- **Memory Sharing:** A "Scrapbook" style posting flow for sharing text & images.
- **Privacy Controls:** Option to share memories publicly or restrict them to specific departments, batches, or clubs.
- **Tagging System:** Tag friends in memories & manage tag approval notifications.

### For Clubs & Departments

- **Club Directory:** Browse & join university clubs to see club-specific events & memories.
- **Department Feeds:** View memories & updates specifically from your academic department.

### Admin & Moderation

- **Yearbook Studio:** Tools for admins to manage yearbook releases, assign editors, & moderate submissions.
- **Dashboard:** Centralized view for managing student registrations, batches, & system configurations.

## 🛠️ Tech Stack

- **Frontend:** React 18 (Vite), React Router, Axios, CSS Modules.
- **Backend:** Node.js (Express), MongoDB (`mongoose`), JWT Authentication.
- **Media & Email:** Cloudinary (Image storage), Nodemailer (OTP delivery).
- **Environment:** ES Modules throughout.

## 🚀 Getting Started

### Prerequisites

- **Node.js:** v18 or higher
- **Database:** MongoDB instance (Local or Atlas)
- **Storage:** Cloudinary account (Free tier works)
- **Email:** SMTP server (e.g., Gmail App Password)

### 1. Clone & Install

```bash
git clone https://github.com/your-username/Web-Project-Yearbook.git
cd Web-Project-Yearbook

# Install Backend dependencies
cd backend && npm install

# Install Frontend dependencies
cd ../frontend && npm install
```

### 2. Environment Setup

Create a `.env` file in the `backend/` directory. You can use the provided `.env.example` as a template:

```bash
cp backend/.env.example backend/.env
```

Fill in your database credentials, JWT secret, Cloudinary API keys, & SMTP details.

### 3. Database Initialization (Optional)

If you want to start with sample data, use the provided scripts in the `scripts/` directory:

```bash
# From the project root
node scripts/seed-minimal.mjs
```

### 4. Running the Application

You will need two terminal windows:

**Terminal 1 (Backend):**

```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**

```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:3000`.

## 📂 Project Structure

- `/backend`: Express API, controllers, & database services.
- `/frontend`: React client with scrapbook-themed UI.
- `/scripts`: Database seeding & maintenance utilities.
- `AGENTS.md`: Technical h&book for development conventions.

## 📝 License

Distributed under the GPL-2.0-only license. See `LICENSE` for details.
