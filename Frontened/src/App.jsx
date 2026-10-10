import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Cart from './pages/Cart';
import Wishlist from './pages/Wishlist';
import ProtectedRoute from './components/ProtectedRoute';
import Products from './pages/Products';
import Navbar from './components/Navbar';
import { CartProvider } from './context/CartContext';
import ProductDetails from './pages/ProductDetails';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import OrderDetails from './pages/OrderDetails';

function App() {
  return (
    <Router>
      <CartProvider>
        <Navbar />
        <Routes>
          {/* Public Routes */}
          <Route
            path="/"
            element={<Navigate to={localStorage.getItem('token') ? '/home' : '/login'} replace />}
          />
          <Route
            path="/login"
            element={localStorage.getItem('token') ? <Navigate to="/home" replace /> : <Login />}
          />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes (Require Login) */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <Products />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/:id"
            element={
              <ProtectedRoute>
                <ProductDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cart"
            element={
              <ProtectedRoute>
                <Cart />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute>
                <OrderDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={<Navigate to={localStorage.getItem('token') ? '/home' : '/login'} replace />}
          />
          <Route
            path="/wishlist"
            element={
              <ProtectedRoute>
                <Wishlist />
              </ProtectedRoute>
            }
          />
        </Routes>
      </CartProvider>
    </Router>
  );
}

export default App;