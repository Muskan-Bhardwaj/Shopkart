import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useCart } from '../context/CartContext';

const FALLBACK_IMAGE = 'https://via.placeholder.com/200?text=ShopKart';

function getAuthHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

function extractCart(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.cart)) return data.cart;
  if (Array.isArray(data?.data?.cart)) return data.data.cart;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function productOf(item) {
  if (item?.productId && typeof item.productId === 'object') return item.productId;
  if (item?.product && typeof item.product === 'object') return item.product;
  return item || {};
}

function productIdOf(item, product) {
  if (typeof item?.productId === 'string') return item.productId;
  return product?._id || product?.id || item?.product?._id || item?._id || '';
}

function formatPrice(value) {
  const number = Number(value);
  return `₹${Number.isFinite(number) ? number.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0'}`;
}

function getErrorMessage(error) {
  return error?.response?.data?.message || error?.message || 'Please try again.';
}

export default function Cart() {
  const navigate = useNavigate();
  const { fetchCart: refreshNavbarCart } = useCart();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyItems, setBusyItems] = useState({});

  const fetchItems = useCallback(async () => {
    try {
      const response = await api.get('/cart', { headers: getAuthHeaders() });
      setItems(extractCart(response?.data));
      setError('');
    } catch (requestError) {
      setItems([]);
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) return fetchItems();
      return undefined;
    });
    return () => {
      active = false;
    };
  }, [fetchItems]);

  const safeItems = Array.isArray(items) ? items : [];
  const totalPrice = useMemo(
    () => (Array.isArray(items) ? items : []).reduce((total, item) => {
      const product = productOf(item);
      const price = Number(product?.price) || 0;
      const quantity = Math.max(0, Number(item?.quantity) || 0);
      return total + price * quantity;
    }, 0),
    [items],
  );

  const updateItem = async (item, operation) => {
    const product = productOf(item);
    const productId = productIdOf(item, product);
    if (!productId) {
      setError('A cart item is missing its product ID and cannot be changed.');
      return;
    }
    if (!localStorage.getItem('token')) {
      window.alert('Please log in to update your cart.');
      navigate('/login');
      return;
    }

    setBusyItems((current) => ({ ...current, [productId]: true }));
    setError('');
    try {
      if (operation === 'increase') {
        await api.post(`/cart/${productId}`, {}, { headers: getAuthHeaders() });
      } else if (operation === 'decrease') {
        await api.post(`/cart/decrease/${productId}`, {}, { headers: getAuthHeaders() });
      } else {
        await api.delete(`/cart/${productId}`, { headers: getAuthHeaders() });
      }
      await Promise.all([fetchItems(), refreshNavbarCart()]);
    } catch (requestError) {
      setError(`Unable to update your cart. ${getErrorMessage(requestError)}`);
    } finally {
      setBusyItems((current) => ({ ...current, [productId]: false }));
    }
  };

  const handleBuyNow = () => {
    if (safeItems.length === 0) {
      window.alert('Add an item to your cart before checkout.');
      return;
    }
    navigate('/checkout');
  };

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>YOUR PICKS, READY TO GO</p>
          <h1 style={styles.title}>Shopping Cart</h1>
        </div>
        <Link to="/products" style={styles.continueLink}>Continue shopping</Link>
      </header>

      {loading ? (
        <section aria-label="Loading cart" aria-live="polite" style={styles.loadingPanel}>
          <svg width="36" height="36" viewBox="0 0 36 36" role="presentation" aria-hidden="true">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#eadbd4" strokeWidth="4" />
            <path d="M18 3a15 15 0 0 1 15 15" fill="none" stroke="#754b43" strokeWidth="4" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="0.8s" repeatCount="indefinite" />
            </path>
          </svg>
          <p>Loading your cart...</p>
        </section>
      ) : error && safeItems.length === 0 ? (
        <section role="alert" style={styles.statePanel}>
          <h2>We couldn't load your cart</h2>
          <p>{error}</p>
          <button type="button" onClick={() => { setLoading(true); fetchItems(); }} style={styles.primaryButton}>Try again</button>
        </section>
      ) : safeItems.length === 0 ? (
        <section style={styles.statePanel}>
          <h2>Your cart is empty</h2>
          <p>Find something you'll love in our collection.</p>
          <Link to="/products" style={styles.primaryLink}>Browse products</Link>
        </section>
      ) : (
        <>
          {error && <p role="alert" style={styles.errorNotice}>{error}</p>}
          <div style={styles.layout}>
            <section aria-label="Items in your cart" style={styles.itemList}>
              {(Array.isArray(items) ? items : []).map((item, index) => {
                if (!item || typeof item !== 'object') return null;
                const product = productOf(item);
                const productId = productIdOf(item, product) || `cart-${index}`;
                const quantity = Math.max(1, Number(item?.quantity) || 1);
                const price = Number(product?.price) || 0;

                return (
                  <article key={productId} style={styles.item}>
                    <img
                      src={product?.imageUrl || product?.image || FALLBACK_IMAGE}
                      alt={product?.name || 'ShopKart product'}
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = FALLBACK_IMAGE;
                      }}
                      style={styles.image}
                    />
                    <div style={styles.itemInfo}>
                      <p style={styles.category}>{product?.category || 'ShopKart'}</p>
                      <h2 style={styles.productName}>{product?.name || 'Untitled product'}</h2>
                      <p style={styles.price}>Unit price: {formatPrice(price)}</p>
                      <div style={styles.controls}>
                        <button type="button" aria-label={`Decrease ${product?.name || 'item'} quantity`} disabled={Boolean(busyItems[productId])} onClick={() => updateItem(item, 'decrease')} style={styles.quantityButton}>−</button>
                        <span aria-live="polite" style={styles.quantity}>{quantity}</span>
                        <button type="button" aria-label={`Increase ${product?.name || 'item'} quantity`} disabled={Boolean(busyItems[productId])} onClick={() => updateItem(item, 'increase')} style={styles.quantityButton}>+</button>
                        <button type="button" disabled={Boolean(busyItems[productId])} onClick={() => updateItem(item, 'delete')} style={styles.deleteButton}>
                          {busyItems[productId] ? 'Updating...' : 'Delete from Cart'}
                        </button>
                      </div>
                    </div>
                    <p style={styles.linePrice}>{formatPrice(price * quantity)}</p>
                  </article>
                );
              })}
            </section>

            <aside style={styles.summary} aria-label="Cart total">
              <h2 style={styles.summaryTitle}>Order Summary</h2>
              <div style={styles.totalRow}><span>Items</span><span>{safeItems.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0)}</span></div>
              <div style={styles.totalRow}><strong>Total Price</strong><strong>{formatPrice(totalPrice)}</strong></div>
              <button type="button" onClick={handleBuyNow} style={styles.buyButton}>Buy Now</button>
              <p style={styles.note}>Taxes and delivery details are confirmed during checkout.</p>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}

const styles = {
  page: { width: 'min(1120px, calc(100% - 36px))', margin: '0 auto', padding: '42px 0 68px', color: '#322522', fontFamily: 'Arial, sans-serif' },
  header: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '30px' },
  eyebrow: { margin: '0 0 7px', color: '#a26959', fontSize: '11px', fontWeight: 700, letterSpacing: '2px' },
  title: { margin: 0, fontFamily: 'Georgia, serif', fontSize: 'clamp(32px, 5vw, 44px)' },
  continueLink: { color: '#754b43', fontWeight: 700, textDecoration: 'none' },
  layout: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(250px, 0.8fr)', alignItems: 'start', gap: '30px' },
  itemList: { minWidth: 0 },
  item: { display: 'grid', gridTemplateColumns: '110px minmax(0, 1fr) auto', alignItems: 'center', gap: '18px', padding: '18px 0', borderBottom: '1px solid #ece1dc' },
  image: { width: '110px', height: '110px', borderRadius: '9px', objectFit: 'cover', background: '#f5eee9' },
  itemInfo: { minWidth: 0 },
  category: { margin: '0 0 6px', color: '#a26959', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' },
  productName: { margin: '0 0 8px', fontSize: '17px' },
  price: { margin: '0 0 12px', color: '#756763', fontSize: '13px' },
  controls: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  quantityButton: { width: '31px', height: '31px', border: '1px solid #ddcec7', borderRadius: '5px', background: '#fff', color: '#754b43', fontSize: '18px', cursor: 'pointer' },
  quantity: { minWidth: '18px', textAlign: 'center', fontWeight: 700 },
  deleteButton: { marginLeft: '8px', padding: '6px 0', border: 0, background: 'transparent', color: '#a13e42', fontWeight: 700, cursor: 'pointer' },
  linePrice: { margin: 0, fontWeight: 700, whiteSpace: 'nowrap' },
  summary: { padding: '23px', border: '1px solid #eadbd4', borderRadius: '11px', background: '#fff9f5' },
  summaryTitle: { margin: '0 0 22px', fontFamily: 'Georgia, serif', fontSize: '23px' },
  totalRow: { display: 'flex', justifyContent: 'space-between', gap: '12px', margin: '17px 0', color: '#594a45' },
  buyButton: { width: '100%', minHeight: '46px', marginTop: '12px', border: 0, borderRadius: '7px', background: '#754b43', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer' },
  note: { margin: '15px 0 0', color: '#887975', fontSize: '12px', lineHeight: 1.5 },
  loadingPanel: { minHeight: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#756763', background: '#fff9f5', borderRadius: '12px' },
  statePanel: { padding: '38px 20px', borderRadius: '12px', background: '#fff9f5', textAlign: 'center', color: '#756763' },
  primaryLink: { display: 'inline-block', marginTop: '10px', padding: '11px 18px', borderRadius: '6px', background: '#754b43', color: '#fff', fontWeight: 700, textDecoration: 'none' },
  primaryButton: { padding: '10px 16px', border: 0, borderRadius: '6px', background: '#754b43', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  errorNotice: { padding: '12px 14px', color: '#7c2525', background: '#fff0f0', borderRadius: '7px' },
};
