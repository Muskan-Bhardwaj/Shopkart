import { useCart } from '../context/CartContext';

export default function ProductCard({ product }) {
  const { addToCart, decreaseQuantity, getItemQuantity } = useCart();
  const quantity = getItemQuantity(product._id);

  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: '10px',
      padding: '16px',
      width: '220px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      textAlign: 'center',
      fontFamily: 'sans-serif'
    }}>
      <h3 style={{ fontSize: '18px', margin: '0 0 8px 0' }}>{product.name}</h3>
      <p style={{ fontWeight: 'bold', color: '#28a745', fontSize: '16px', margin: '0 0 16px 0' }}>
        ₹{product.price}
      </p>

      {quantity === 0 ? (
        // Render "Add to Cart" button when item is not in cart
        <button
          onClick={() => addToCart(product._id)}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Add to Cart
        </button>
      ) : (
        // Render [- quantity +] counter when item is in cart
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          gap: '12px',
          backgroundColor: '#f8f9fa',
          padding: '6px 12px',
          borderRadius: '6px',
          border: '1px solid #ced4da'
        }}>
          <button
            onClick={() => decreaseQuantity(product._id)}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#dc3545',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justify: 'center'
            }}
          >
            -
          </button>

          <span style={{ fontSize: '16px', fontWeight: 'bold', minWidth: '20px' }}>
            {quantity}
          </span>

          <button
            onClick={() => addToCart(product._id)}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justify: 'center'
            }}
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}