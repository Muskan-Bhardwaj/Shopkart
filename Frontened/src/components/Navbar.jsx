import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  useEffect(() => {
    const syncToken = () => setToken(localStorage.getItem('token'));
    window.addEventListener('shopkart-auth-change', syncToken);
    window.addEventListener('storage', syncToken);
    return () => {
      window.removeEventListener('shopkart-auth-change', syncToken);
      window.removeEventListener('storage', syncToken);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    window.dispatchEvent(new Event('shopkart-auth-change'));
    navigate('/login');
  };

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem 2rem',
      backgroundColor: '#ffebee',
      borderBottom: '1px solid #ffcdd2'
    }}>
      <Link to={token ? '/home' : '/login'} style={{ fontSize: '1.5rem', fontWeight: 'bold', textDecoration: 'none', color: '#2c3e50' }}>
        ShopKart
      </Link>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        {token && (
          <>
            <Link to="/products" style={{ textDecoration: 'none', color: '#333', fontWeight: '500' }}>Products</Link>
            <Link to="/cart" style={{ textDecoration: 'none', color: '#333', fontWeight: '500' }}>Cart</Link>
            <Link to="/wishlist" style={{ textDecoration: 'none', color: '#333', fontWeight: '500' }}>Wishlist</Link>
            <Link to="/orders" style={{ textDecoration: 'none', color: '#333', fontWeight: '500' }}>My Orders</Link>
          </>
        )}

        {token ? (
          <button 
            onClick={handleLogout} 
            style={{ padding: '0.4rem 0.8rem', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Logout
          </button>
        ) : (
          <>
            <Link to="/login" style={{ textDecoration: 'none', color: '#007bff', fontWeight: '500' }}>Login</Link>
            <Link to="/register" style={{ textDecoration: 'none', color: '#28a745', fontWeight: '500' }}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;