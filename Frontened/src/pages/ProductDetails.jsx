import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useCart } from '../context/CartContext';

export default function ProductDetails() {
  const { id } = useParams(); 
  const { addToCart } = useCart();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [btnText, setBtnText] = useState("Add to Cart");

  useEffect(() => {
    const fetchSingleProduct = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get(`/products/${id}`);
        
        // Flexibly extracts product from response.data.product or response.data
        const productData = response.data?.product || response.data;
        
        if (productData && productData._id) {
          setProduct(productData);
        } else {
          setError("Product details could not be found.");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Product not found or server error.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchSingleProduct();
    }
  }, [id]);

  const handleAddToCart = async () => {
    if (!product) return;
    setAdding(true);
    try {
      await addToCart(product._id);
      setBtnText("Added to Cart! ✓");
      setTimeout(() => setBtnText("Add to Cart"), 2000);
    } catch (err) {
      alert(err.message || "Could not add item to cart.");
    } finally {
      setAdding(false);
    }
  };

  // 1. Loading State
  if (loading) return <p style={{ padding: '40px', textAlign: 'center' }}>Loading product details...</p>;
  
  // 2. Error State
  if (error) return <p style={{ padding: '40px', textAlign: 'center', color: 'red' }}>{error}</p>;

  // 3. Null Guard (Prevents White Screen Crash)
  if (!product) return <p style={{ padding: '40px', textAlign: 'center' }}>Product not found.</p>;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <Link to="/products" style={{ textDecoration: 'none', color: '#007bff', marginBottom: '20px', display: 'inline-block' }}>
        &larr; Back to Products
      </Link>
      
      <div style={{ display: 'flex', gap: '40px', marginTop: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '300px' }}>
          <img 
            src={product.image || 'https://via.placeholder.com/300'} 
            alt={product.name || 'Product'} 
            style={{ width: '100%', borderRadius: '8px', objectFit: 'cover' }} 
          />
        </div>
        
        <div style={{ flex: '1', minWidth: '300px' }}>
          <h2>{product.name}</h2>
          <p style={{ color: 'gray', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '1px' }}>
            {product.category}
          </p>
          
          <h3 style={{ color: '#28a745', fontSize: '28px', marginTop: '10px' }}>₹{product.price}</h3>
          
          <p style={{ marginTop: '20px', lineHeight: '1.6' }}>{product.description}</p>
          
          <div style={{ marginTop: '20px' }}>
            {product.stock > 0 ? (
              <p style={{ color: 'green', fontWeight: 'bold' }}>In Stock: {product.stock} units available</p>
            ) : (
              <p style={{ color: 'red', fontWeight: 'bold' }}>Out of Stock</p>
            )}
          </div>

          <button 
            onClick={handleAddToCart}
            disabled={product.stock === 0 || adding}
            style={{ 
              marginTop: '30px', 
              padding: '15px 30px', 
              backgroundColor: product.stock === 0 ? '#ccc' : '#2C1A1D', 
              color: '#FFF0F3', 
              border: 'none', 
              borderRadius: '4px', 
              fontSize: '16px',
              cursor: product.stock === 0 || adding ? 'not-allowed' : 'pointer',
              width: '100%'
            }}
          >
            {product.stock === 0 ? 'Currently Unavailable' : adding ? 'Adding...' : btnText}
          </button>
        </div>
      </div>
    </div>
  );
}