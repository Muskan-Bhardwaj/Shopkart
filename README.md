# 🛒 Shopkart — MERN Stack E-Commerce Platform

A full-stack e-commerce web application built using the MERN stack (MongoDB, Express, React, Node.js) featuring secure online payment integration via Razorpay.

---

## ✨ Features

- **Product Management:** Browse products, view details, filter, and search.
- **Cart & Checkout:** Dynamic cart management and order summary calculations.
- **Razorpay Payment Integration:** Seamless checkout using Razorpay payment gateway API with test card & UPI verification routines.
- **Responsive UI:** Built with modern CSS/Tailwind components and React Vite.
- **Backend API:** RESTful API architecture powered by Node.js, Express, and MongoDB Mongoose models.

---

## 🛠️ Tech Stack

- **Frontend:** React.js, Vite, Tailwind CSS / CSS Modules, Axios
- **Backend:** Node.js, Express.js
- **Database:** MongoDB & Mongoose ORM
- **Payment Gateway:** Razorpay API

---

## 📁 Project Structure

```text
Shopkart/
├── backened/          # Express API server, controllers, models, routes
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   └── index.js
├── Frontened/         # React SPA frontend (Vite)
│   ├── public/
│   ├── src/
│   └── vite.config.js
└── package.json       # Root dependency management
