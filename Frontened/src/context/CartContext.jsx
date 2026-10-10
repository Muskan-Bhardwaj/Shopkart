import { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const CartContext = createContext();

const getCartArray = (data) => {
  const cartData = data?.cart || data?.data?.cart || data?.data || data;
  return Array.isArray(cartData) ? cartData : [];
};

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  const fetchCart = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setCart([]);
      return [];
    }

    try {
      const res = await api.get('/cart', {
        headers: getAuthHeaders(),
      });
      const nextCart = getCartArray(res.data);
      setCart(nextCart);
      return nextCart;
    } catch (err) {
      console.error('Error fetching cart:', err);
      throw err;
    }
  };

  // Add / Increment quantity
  const addToCart = async (productId) => {
    if (!localStorage.getItem('token')) {
      window.alert('Please log in to add items to your cart.');
      return false;
    }

    try {
      const res = await api.post(`/cart/${productId}`, {}, {
        headers: getAuthHeaders(),
      });
      setCart(getCartArray(res.data));
      return res.data;
    } catch (err) {
      console.error('Error adding to cart:', err);
      window.alert(err.response?.data?.message || 'Unable to add this item to your cart.');
      return false;
    }
  };

  // Decrease quantity / Remove
  const decreaseQuantity = async (productId) => {
    if (!localStorage.getItem('token')) {
      window.alert('Please log in to update your cart.');
      return false;
    }

    try {
      const res = await api.post(`/cart/decrease/${productId}`, {}, {
        headers: getAuthHeaders(),
      });
      setCart(getCartArray(res.data));
      return res.data;
    } catch (err) {
      console.error('Error decreasing cart item:', err);
      window.alert(err.response?.data?.message || 'Unable to update this cart item.');
      return false;
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  // Helper to find the current count of a product in cart
  const getItemQuantity = (productId) => {
    const safeCart = Array.isArray(cart) ? cart : [];
    const item = safeCart.find((cartItem) => {
      const itemId = cartItem?.productId?._id || cartItem?.productId || cartItem?.product?._id || cartItem?._id;
      return itemId != null && productId != null && String(itemId) === String(productId);
    });
    return Number(item?.quantity) || 0;
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchCart().catch((error) => {
        console.error('Initial cart load failed:', error);
      });
    });
  }, []);

  const safeCart = Array.isArray(cart) ? cart : [];
  const cartCount = safeCart.reduce((sum, item) => sum + (Number(item?.quantity) || 1), 0);

  return (
    <CartContext.Provider value={{ cart: safeCart, cartCount, addToCart, decreaseQuantity, getItemQuantity, fetchCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);