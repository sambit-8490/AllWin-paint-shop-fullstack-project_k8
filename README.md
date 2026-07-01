# All Win Paint Shop 🎨

A full-stack e-commerce platform for a building materials and paint shop based in Karur, Tamil Nadu. Supports buyers, managers, and shop owners with role-based dashboards, product catalog management, order processing, and sales tracking.

## Tech Stack

**Frontend**
- React 18
- React Router
- Axios
- React Toastify
- React Icons

**Backend**
- Node.js + Express
- MongoDB with Mongoose
- JWT-based authentication
- Helmet, CORS, Compression (security & performance middleware)

**Infrastructure**
- Docker & Docker Compose
- MongoDB 7 (containerized)

## Features

- 🔐 Role-based authentication (Buyer / Manager / Owner)
- 🛒 Product catalog with categories: Paints, Cement, Steel Bars, Tools, Hardware, Accessories
- 📦 Cart, checkout, and order management with status tracking
- 💳 Online and Cash-on-Delivery payment options
- 📊 Owner/Manager dashboards for sales and inventory oversight
- 📩 Contact form with complaint registration and tracking
- 🖼️ Product image handling with graceful fallbacks

## Project Structure

```
├── backend
│   ├── config          # Database connection
│   ├── controllers      # Route logic (auth, orders, products, sales, dashboard, contact)
│   ├── middleware        # Auth protection & role guards
│   ├── models           # Mongoose schemas (User, Product, Order, Sale, Complaint)
│   ├── routes            # Express route definitions
│   ├── seed.js            # Demo data seeding script
│   └── server.js          # App entry point
├── frontend
│   ├── public             # Static assets & product images
│   └── src
│       ├── components      # Navbar, Sidebar, Footer, ProductCard
│       ├── context          # Auth & Cart context providers
│       ├── pages             # Buyer, Manager, Owner, and shared pages
│       └── utils              # API client & helper functions
└── docker-compose.yml
```

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ (if running outside Docker)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd AllWin-paint-shop
```

### 2. Configure environment variables

Create a `.env` file inside the `backend` folder:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://mongo:27017/allwin_paint_shop
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
```

> Online payment (Razorpay) and email notifications (SMTP) are optional integrations. Without them configured, the app runs in a simplified mode: online orders are marked confirmed directly, and contact form submissions are logged on the server instead of emailed.

### 3. Start the application

```bash
docker-compose up --build
```

This starts three containers:
| Service  | Port |
|----------|------|
| Frontend | 3000 |
| Backend  | 5000 |
| MongoDB  | 27017 |

### 4. Seed demo data

From the `backend` folder (or inside the backend container):

```bash
docker exec -it backend node seed.js
```

This creates demo accounts and a sample product catalog.

To re-seed and overwrite existing demo data:

```bash
SEED_FORCE=true node seed.js
```

## Demo Accounts

| Role    | Email                | Password    |
|---------|-----------------------|-------------|
| Owner   | owner@allwin.com      | password123 |
| Manager | manager@allwin.com    | password123 |
| Buyer   | buyer@allwin.com      | password123 |

## API Overview

Base URL: `http://localhost:5000/api`

| Endpoint             | Description                          |
|-----------------------|---------------------------------------|
| `/auth`               | Register, login, profile management  |
| `/products`           | Product catalog CRUD                 |
| `/orders`             | Order creation, tracking, cancellation |
| `/sales`              | Sales records and reporting          |
| `/dashboard`          | Owner/Manager analytics              |
| `/contact`            | Contact form and complaints          |
| `/health`             | Server health check                  |

## Useful Commands

```bash
# View running containers
docker ps

# View backend logs
docker logs backend

# Restart a single service
docker-compose restart backend

# Rebuild after dependency changes
docker-compose up --build
```

## License

This project is for internal/demo use by All Win Paint Shop, Karur, Tamil Nadu.
