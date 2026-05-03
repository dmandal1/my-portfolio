# 🚀 Deep Portfolio & Admin CMS

A high-end, premium portfolio template featuring a fully-integrated **Admin Dashboard CMS**. This project is designed for software developers who want a beautiful, glassmorphic portfolio combined with the power of a professional content management system.

---

## ✨ Key Features

### 💎 Premium Portfolio UI
- **Modern Aesthetics**: Sleek glassmorphic design with smooth transitions and cinematic animations.
- **Dynamic Content**: Sections for Projects, Experience, Education, Certifications, and Open Source contributions.
- **GitHub Integration**: Automatically fetches your real-time GitHub contributions, PRs, and pinned projects.
- **Responsive & Accessible**: Fully optimized for mobile, tablet, and desktop with dark/light mode support.

### 🔐 Admin Panel (CMS)
- **Content Management**: Create, edit, and delete blog posts with a rich-text editor.
- **Media Library**: Manage images and assets directly from the dashboard.
- **Comment Moderation**: Approve or remove comments on your posts.
- **SEO & Analytics**: Built-in tools to track performance and optimize your presence.
- **Maintenance Mode**: One-click "Under Maintenance" toggle with a smart bypass for administrators.
- **Enterprise-Grade Security**: Supports **Two-Factor Authentication (2FA)** and password recovery.

---

## 🛠️ Tech Stack

- **Frontend**: [React](https://reactjs.org/), [Vite](https://vitejs.dev/), [Styled Components](https://styled-components.com/)
- **Backend**: PHP/MySQL (API Layer)
- **Deployment**: Integrated FTP Deployment Scripts
- **Animations**: [Anime.js](https://animejs.com/), CSS3 Transitions

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v16+)
- **NPM** or **Yarn**
- **PHP/MySQL Host** (For the Admin Panel/Database)

### 2. Local Installation
```bash
# Clone the repository
git clone https://github.com/dmandal1/my-portfolio.git

# Install dependencies
npm install

# Start the development server
npm start
```

### 3. Configuration
1.  **Environment Variables**: Create a `.env` file in the root directory based on `.env.example`.
    - `VITE_API_URL`: Path to your backend API.
    - `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`: Credentials for deployment.
2.  **Personal Information**: Edit `src/portfolio.js` to update your name, skills, and links.
3.  **GitHub Data**: Update `git_data_fetcher.mjs` with your username and run:
    ```bash
    node git_data_fetcher.mjs
    ```

---

## 🧙‍♂️ Setup Wizard & Initial Configuration

This project includes a built-in **Setup Wizard** to help you get your database and admin panel running in minutes.

### 1. Database Preparation
- Create a new **MySQL Database** on your hosting server (e.g., via cPanel or Hostinger Dashboard).
- Note down your **Database Name**, **Username**, and **Password**.

### 2. Running the Installer
1.  Deploy the backend files to your server.
2.  Navigate to your site at `yourdomain.com/#/install`.
3.  The Setup Wizard will guide you through:
    - **Environment Check**: Verifying server compatibility.
    - **Database Connection**: Linking your site to your MySQL database.
    - **Admin Setup**: Creating your primary administrative account (Username & Password).

### 3. Post-Installation
- Once finished, the installer will automatically generate a `config.php` file on your server and lock itself for security.
- You can now log in to the **Admin Dashboard** at `yourdomain.com/#/admin/login`.

---

## 📤 Deployment

The project includes a simplified deployment pipeline:

```bash
# Deploy only the frontend
npm run deploy:frontend

# Deploy only the backend
npm run deploy:backend

# Deploy everything
npm run deploy
```

---

## ⚙️ Maintenance Mode
You can enable maintenance mode via the **Admin Settings**. 
- **Visitor View**: Sees a premium maintenance countdown and status bar.
- **Admin Bypass**: You can always access `/admin` even when maintenance mode is active, ensuring you are never locked out.

---

## 📄 License
This project is licensed under the MIT License.

## 👏 Acknowledgments
- Inspired by the MasterPortfolio template.
- Icons by [FontAwesome](https://fontawesome.com/) and [Iconify](https://iconify.design/).
