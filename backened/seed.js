const mongoose = require('mongoose');
const Product = require('./models/product.model'); // Ensure this file exists in models folder
require('dotenv').config();

// Use 127.0.0.1 instead of localhost for Node 18+ compatibility
const MONGO_URI = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shopkart';

const sampleProducts = [
  {
    name: "RGB Mechanical Keyboard",
    price: 2999,
    description: "Tactile mechanical switches with customizable RGB backlighting and durable keycaps.",
    category: "Electronics",
    stock: 15,
    imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&q=80"
  },
  {
    name: "Wireless Noise-Canceling Headphones",
    price: 4999,
    description: "Over-ear bluetooth headphones with deep bass and active noise cancellation.",
    category: "Electronics",
    stock: 10,
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80"
  },
  {
    name: "Ergonomic Smart Watch",
    price: 1999,
    description: "Tracks heart rate, sleep, steps, and sports activities with a sleek AMOLED display.",
    category: "Electronics",
    stock: 8,
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80"
  },
  {
    name: "Classic Denim Jacket",
    price: 2499,
    description: "Premium cotton denim jacket styled for a relaxed, comfortable everyday fit.",
    category: "Fashion",
    stock: 20,
    imageUrl: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500&q=80"
  },
  {
    name: "Waterproof Travel Backpack",
    price: 1499,
    description: "Durable travel backpack with laptop compartment and anti-theft zipper pockets.",
    category: "Fashion",
    stock: 12,
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&q=80"
  },
  {
    name: "Minimalist Desk Lamp",
    price: 899,
    description: "Dimmable LED desk lamp with adjustable arm and warm light modes for reading.",
    category: "Home",
    stock: 5,
    imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500&q=80"
  }
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await Product.deleteMany({});
    console.log("Cleared existing products from collection.");

    await Product.insertMany(sampleProducts);
    console.log("Sample products seeded successfully! 🎉");

    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error.message);
    process.exit(1);
  }
};

seedDatabase();