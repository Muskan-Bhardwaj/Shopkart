import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useCart } from '../context/CartContext';

const FALLBACK_IMAGE = 'https://via.placeholder.com/200';

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function extractArray(payload, key) {
  const candidates = [
    payload?.[key],
    payload?.data?.[key],
    payload?.data?.data?.[key],
    payload?.data,
    payload?.items,
    payload,
  ];
  return candidates.find((candidate) => Array.isArray(candidate)) || [];
}

function getProduct(item) {
  if (item?.productId && typeof item.productId === 'object') return item.productId;
  if (item?.product && typeof item.product === 'object') return item.product;
  return item || {};
}

function getProductId(item, product) {
  if (typeof item?.productId === 'string') return item.productId;
  return product?._id || product?.id || item?.product?._id || item?._id || '';
}

function formatPrice(value) {
  const price = Number(value);
  return `₹${Number.isFinite(price) ? price.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0'}`;
}

function getAuthHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

export default function Wishlist() {
  const navigate = useNavigate();
  const { fetchCart: refreshSharedCart } = useCart();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyItems, setBusyItems] = useState({});

  const token = localStorage.getItem('token');
  const safeWishlist = Array.isArray(wishlist) ? wishlist : [];

  const fetchWishlist = useCallback(async () => {
    try {
      const response = await api.get('/wishlist', { headers: getAuthHeaders() });
      setError('');
      setWishlist(extractArray(response?.data, 'wishlist'));
    } catch (requestError) {
      setWishlist([]);
      setError(getErrorMessage(requestError, 'Unable to load your wishlist. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (localStorage.getItem('token')) {
      Promise.resolve().then(() => {
        if (active) return fetchWishlist();
        return undefined;
      });
    }
    return () => {
      active = false;
    };
  }, [fetchWishlist]);

  const runAction = async (item, action) => {
    const product = getProduct(item);
    const productId = getProductId(item, product);
    if (!productId) {
      setActionError('This wishlist item has no product ID and cannot be updated.');
      return;
    }

    if (!localStorage.getItem('token')) {
      window.alert('Please log in to update your wishlist.');
      navigate('/login');
      return;
    }

    setActionError('');
    setBusyItems((current) => ({ ...current, [productId]: action }));

    try {
      if (action === 'move') {
        await api.post(`/cart/${productId}`, {}, { headers: getAuthHeaders() });
        await api.delete(`/wishlist/${productId}`, { headers: getAuthHeaders() });
        await refreshSharedCart();
      } else {
        await api.delete(`/wishlist/${productId}`, { headers: getAuthHeaders() });
      }
      setLoading(true);
      await fetchWishlist();
    } catch (requestError) {
      const message = action === 'move'
        ? `Unable to complete move to cart: ${getErrorMessage(requestError, 'please try again.')}`
        : getErrorMessage(requestError, 'Unable to remove this item. Please try again.');
      setActionError(message);
      await fetchWishlist();
    } finally {
      setBusyItems((current) => ({ ...current, [productId]: false }));
    }
  };

  if (!token) {
    return (
      <main style={styles.page}>
        <section style={styles.emptyState}>
          <h1 style={styles.heading}>Your wishlist</h1>
          <p>Please log in to view and manage your saved items.</p>
          <Link to="/login" style={styles.primaryLink}>Log in</Link>
        </section>
      </main>
    );
  }

  if (loading && safeWishlist.length === 0) {
    return <main style={styles.page}><p role="status" style={styles.state}>Loading your wishlist...</p></main>;
  }

  if (error && safeWishlist.length === 0) {
    return (
      <main style={styles.page}>
        <section role="alert" style={styles.errorState}>
          <h1 style={styles.heading}>Unable to load your wishlist</h1>
          <p>{error}</p>
          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              await fetchWishlist();
            }}
            style={styles.primaryButton}
          >Try again</button>
        </section>
      </main>
    );
  }

  if (!loading && safeWishlist.length === 0) {
    return (
      <main style={styles.page}>
        <section style={styles.emptyState}>
          <h1 style={styles.heading}>Your wishlist is empty</h1>
          <p>Save products you love and find them here later.</p>
          <Link to="/products" style={styles.primaryLink}>Explore products</Link>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>YOUR SAVED FAVORITES</p>
          <h1 style={styles.heading}>My Wishlist</h1>
        </div>
        <Link to="/products" style={styles.continueLink}>Continue shopping</Link>
      </header>

      {error && <p role="alert" style={styles.inlineError}>{error}</p>}
      {actionError && <p role="alert" style={styles.inlineError}>{actionError}</p>}

      <section aria-label="Wishlist items" style={styles.grid}>
        {(Array.isArray(wishlist) ? wishlist : []).map((item, index) => {
          if (!item || typeof item !== 'object') return null;
          const product = getProduct(item);
          const productId = getProductId(item, product) || `wishlist-item-${index}`;
          const action = busyItems[productId];

          return (
            <article key={productId} style={styles.card}>
              <img
                src={product.imageUrl || product.image || FALLBACK_IMAGE}
                alt={product.name || 'ShopKart product'}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = FALLBACK_IMAGE;
                }}
                style={styles.image}
              />
              <div style={styles.cardBody}>
                <p style={styles.category}>{product.category || 'General'}</p>
                <h2 style={styles.productName}>{product.name || 'Untitled product'}</h2>
                <p style={styles.price}>{formatPrice(product.price)}</p>
                <div style={styles.actions}>
                  <button
                    type="button"
                    onClick={() => runAction(item, 'move')}
                    disabled={Boolean(action)}
                    style={styles.primaryButton}
                  >
                    {action === 'move' ? 'Moving...' : 'Move to Cart'}
                  </button>
                  <button
                    type="button"
                    onClick={() => runAction(item, 'delete')}
                    disabled={Boolean(action)}
                    style={styles.removeButton}
                  >
                    {action ? 'Please wait...' : 'Remove'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

const styles = {
  page: { width: 'min(1180px, calc(100% - 32px))', margin: '0 auto', padding: '42px 0 64px', color: '#2c1a1d', fontFamily: 'Arial, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' },
  eyebrow: { color: '#a35e68', fontSize: '12px', fontWeight: 700, letterSpacing: '2px', margin: '0 0 8px' },
  heading: { margin: 0, fontFamily: 'Georgia, serif', fontSize: 'clamp(30px, 5vw, 40px)' },
  continueLink: { color: '#783b46', fontWeight: 700, textDecoration: 'none', padding: '10px 0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 245px), 1fr))', gap: '22px' },
  card: { overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff', border: '1px solid #f0e3e5', borderRadius: '12px', boxShadow: '0 6px 22px rgba(44, 26, 29, 0.06)' },
  image: { display: 'block', width: '100%', height: '220px', objectFit: 'cover', background: '#f8f1f2' },
  cardBody: { display: 'flex', flex: 1, flexDirection: 'column', padding: '16px' },
  category: { margin: '0 0 7px', color: '#a35e68', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' },
  productName: { margin: '0 0 12px', fontSize: '18px', lineHeight: 1.35 },
  price: { margin: 'auto 0 16px', fontSize: '19px', fontWeight: 700 },
  actions: { display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' },
  primaryButton: { minHeight: '40px', border: 0, borderRadius: '7px', padding: '9px 12px', background: '#783b46', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  removeButton: { minHeight: '40px', border: '1px solid #dec8cb', borderRadius: '7px', padding: '9px 10px', background: '#fff', color: '#783b46', fontWeight: 700, cursor: 'pointer' },
  state: { padding: '45px 20px', textAlign: 'center', color: '#725f62', background: '#fff8f8', borderRadius: '10px' },
  emptyState: { maxWidth: '550px', margin: '30px auto', padding: '42px 20px', textAlign: 'center', background: '#fff8f8', borderRadius: '12px' },
  primaryLink: { display: 'inline-block', marginTop: '12px', padding: '11px 18px', borderRadius: '7px', background: '#783b46', color: '#fff', fontWeight: 700, textDecoration: 'none' },
  errorState: { maxWidth: '550px', margin: '30px auto', padding: '30px 20px', color: '#7c2525', textAlign: 'center', background: '#fff0f0', borderRadius: '10px' },
  inlineError: { padding: '12px 14px', color: '#7c2525', background: '#fff0f0', borderRadius: '7px' },
};
