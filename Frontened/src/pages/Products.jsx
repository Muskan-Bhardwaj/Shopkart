import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useCart } from '../context/CartContext';

const FALLBACK_IMAGE = 'https://via.placeholder.com/400x300?text=ShopKart';

function extractProducts(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.data?.products)) return data.data.products;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function errorMessage(error) {
  return error?.response?.data?.message || error?.message || 'Unable to load products. Please try again.';
}

function getHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

function priceText(price) {
  const value = Number(price);
  return `₹${Number.isFinite(value) ? value.toLocaleString('en-IN') : '0'}`;
}

export default function Products() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState({});
  const [notice, setNotice] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [wishlistIds, setWishlistIds] = useState([]);

  useEffect(() => {
    let active = true;
    const fetchProducts = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/products');
        if (active) setProducts(extractProducts(response?.data));
      } catch (requestError) {
        if (active) {
          setProducts([]);
          setError(errorMessage(requestError));
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchProducts();
    return () => {
      active = false;
    };
  }, [retryCount]);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const fetchWishlist = async () => {
      try {
        const response = await api.get('/wishlist', { headers: getHeaders() });
        const wishlistItems = Array.isArray(response?.data?.wishlist)
          ? response.data.wishlist
          : Array.isArray(response?.data)
            ? response.data
            : [];
        const ids = wishlistItems.map((item) => {
          if (typeof item?.productId === 'string') return item.productId;
          return item?.productId?._id || item?.product?._id || item?._id || item?.id;
        }).filter(Boolean).map(String);
        if (active) setWishlistIds(ids);
      } catch (requestError) {
        console.error('Unable to load saved wishlist items:', requestError);
      }
    };

    fetchWishlist();
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => [...new Set((Array.isArray(products) ? products : []).map((product) => product?.category).filter(Boolean))],
    [products],
  );
  const filteredProducts = useMemo(() => {
    const safeList = Array.isArray(products) ? products : [];
    const normalizedSearch = search.trim().toLowerCase();
    return safeList.filter((product) => {
      const matchesSearch = !normalizedSearch
        || String(product?.name || '').toLowerCase().includes(normalizedSearch)
        || String(product?.description || '').toLowerCase().includes(normalizedSearch);
      const matchesCategory = !category || product?.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  const requireLogin = () => {
    if (localStorage.getItem('token')) return true;
    window.alert('Please log in to use your cart and wishlist.');
    navigate('/login');
    return false;
  };

  const handleAddToCart = async (product) => {
    const productId = product?._id || product?.id;
    if (!productId || !requireLogin()) return;
    setNotice('');
    setBusy((current) => ({ ...current, [`cart-${productId}`]: true }));
    try {
      const result = await addToCart(productId);
      if (result !== false) setNotice(`${product?.name || 'Item'} added to your cart.`);
    } catch (requestError) {
      setNotice(errorMessage(requestError));
    } finally {
      setBusy((current) => ({ ...current, [`cart-${productId}`]: false }));
    }
  };

  const handleWishlist = async (product) => {
    const productId = product?._id || product?.id;
    if (!productId || !requireLogin()) return;
    const normalizedProductId = String(productId);
    const wasSaved = wishlistIds.includes(normalizedProductId);
    setNotice('');
    setBusy((current) => ({ ...current, [`wishlist-${productId}`]: true }));
    setWishlistIds((current) => (
      wasSaved
        ? current.filter((savedId) => savedId !== normalizedProductId)
        : [...current, normalizedProductId]
    ));
    try {
      if (wasSaved) {
        await api.delete(`/wishlist/${productId}`, { headers: getHeaders() });
        setNotice(`${product?.name || 'Item'} removed from your wishlist.`);
      } else {
        await api.post(`/wishlist/${productId}`, {}, { headers: getHeaders() });
        setNotice(`${product?.name || 'Item'} saved to your wishlist.`);
      }
    } catch (requestError) {
      setWishlistIds((current) => (
        wasSaved
          ? [...new Set([...current, normalizedProductId])]
          : current.filter((savedId) => savedId !== normalizedProductId)
      ));
      setNotice(errorMessage(requestError));
    } finally {
      setBusy((current) => ({ ...current, [`wishlist-${productId}`]: false }));
    }
  };

  const safeProducts = Array.isArray(products) ? products : [];

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <p style={styles.kicker}>SHOP THE LATEST</p>
        <h1 style={styles.title}>Our Collection</h1>
        <p style={styles.subtitle}>Everyday favorites, handpicked for you.</p>
      </header>

      {notice && <p role="status" style={styles.notice}>{notice}</p>}
      <section aria-label="Filter products" style={styles.filters}>
        <label style={styles.searchLabel}>
          <span style={styles.visuallyHidden}>Search products</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products..."
            style={styles.searchInput}
          />
        </label>
        <label>
          <span style={styles.visuallyHidden}>Filter by category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)} style={styles.categorySelect}>
            <option value="">All categories</option>
            {(Array.isArray(categories) ? categories : []).map((itemCategory) => (
              <option key={itemCategory} value={itemCategory}>{itemCategory}</option>
            ))}
          </select>
        </label>
      </section>

      {loading ? (
        <section aria-label="Loading products" aria-live="polite" style={styles.grid}>
          {Array.from({ length: 6 }, (_, index) => (
            <article key={`skeleton-${index}`} style={styles.skeletonCard}>
              <div style={styles.skeletonImage} />
              <div style={styles.skeletonLine} />
              <div style={{ ...styles.skeletonLine, width: '55%' }} />
            </article>
          ))}
        </section>
      ) : error ? (
        <section role="alert" style={styles.messageBox}>
          <p>{error}</p>
          <button type="button" onClick={() => setRetryCount((count) => count + 1)} style={styles.retryButton}>Try again</button>
        </section>
      ) : filteredProducts.length === 0 ? (
        <section style={styles.messageBox}><p>{safeProducts.length ? 'No products match these filters.' : 'No products are available right now.'}</p></section>
      ) : (
        <section aria-label="Product collection" style={styles.grid}>
          {(Array.isArray(filteredProducts) ? filteredProducts : []).map((product, index) => {
            if (!product || typeof product !== 'object') return null;
            const productId = product?._id || product?.id || `product-${index}`;
            const ratingValue = Number(product?.rating ?? product?.averageRating ?? 4.5);
            const rating = Math.min(5, Math.max(0, Number.isFinite(ratingValue) ? ratingValue : 4.5));
            const image = product?.imageUrl || product?.image || FALLBACK_IMAGE;

            return (
              <article key={productId} style={styles.card}>
                <div style={styles.imageFrame}>
                  <Link to={product?._id || product?.id ? `/products/${product?._id || product?.id}` : '/products'} aria-label={`View ${product?.name || 'product'}`}>
                    <img
                      src={image}
                      alt={product?.name || 'ShopKart product'}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = FALLBACK_IMAGE;
                      }}
                      style={styles.image}
                    />
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleWishlist(product)}
                    disabled={Boolean(busy[`wishlist-${productId}`])}
                    aria-label={`${wishlistIds.includes(String(product?._id || product?.id || '')) ? 'Remove' : 'Add'} ${product?.name || 'product'} ${wishlistIds.includes(String(product?._id || product?.id || '')) ? 'from' : 'to'} wishlist`}
                    aria-pressed={wishlistIds.includes(String(product?._id || product?.id || ''))}
                    title={wishlistIds.includes(String(product?._id || product?.id || '')) ? 'Remove from wishlist' : 'Add to wishlist'}
                    style={{
                      ...styles.heartButton,
                      ...(wishlistIds.includes(String(product?._id || product?.id || '')) ? styles.savedHeartButton : {}),
                    }}
                  >{busy[`wishlist-${productId}`] ? '…' : wishlistIds.includes(String(product?._id || product?.id || '')) ? '♥' : '♡'}</button>
                </div>
                <div style={styles.cardBody}>
                  <p style={styles.category}>{product?.category || 'ShopKart'}</p>
                  <h2 style={styles.name}>{product?.name || 'Untitled product'}</h2>
                  <div aria-label={`${rating.toFixed(1)} out of 5 stars`} style={styles.rating}>
                    <span aria-hidden="true">{'★'.repeat(Math.floor(rating))}{'☆'.repeat(5 - Math.floor(rating))}</span>
                    <span style={styles.ratingNumber}>{rating.toFixed(1)}</span>
                  </div>
                  <p style={styles.price}>{priceText(product?.price)}</p>
                  <button
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    disabled={Boolean(busy[`cart-${productId}`]) || Number(product?.stock) === 0}
                    style={styles.addButton}
                  >
                    {Number(product?.stock) === 0
                      ? 'Out of Stock'
                      : busy[`cart-${productId}`]
                        ? 'Adding...'
                        : 'Add to Cart'}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

const styles = {
  page: { width: 'min(1200px, calc(100% - 36px))', margin: '0 auto', padding: '46px 0 70px', color: '#302323', fontFamily: 'Arial, sans-serif' },
  header: { marginBottom: '30px', textAlign: 'center' },
  kicker: { margin: '0 0 8px', color: '#a26959', fontSize: '11px', fontWeight: 700, letterSpacing: '3px' },
  title: { margin: 0, fontFamily: 'Georgia, serif', fontSize: 'clamp(34px, 5vw, 48px)' },
  subtitle: { margin: '10px 0 0', color: '#806f6b', fontSize: '15px' },
  notice: { padding: '12px 16px', borderRadius: '8px', background: '#edf7ed', color: '#2d6634' },
  filters: { display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', margin: '0 0 26px' },
  searchLabel: { flex: '0 1 340px' },
  searchInput: { boxSizing: 'border-box', width: '100%', minHeight: '42px', padding: '9px 13px', border: '1px solid #ddcec7', borderRadius: '7px', fontSize: '14px' },
  categorySelect: { minHeight: '42px', padding: '9px 32px 9px 12px', border: '1px solid #ddcec7', borderRadius: '7px', background: '#fff', color: '#302323', fontSize: '14px' },
  visuallyHidden: { position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 },
  messageBox: { padding: '28px', textAlign: 'center', color: '#725f62', background: '#fff8f5', borderRadius: '10px' },
  retryButton: { padding: '9px 16px', border: 0, borderRadius: '6px', background: '#754b43', color: '#fff', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 245px), 1fr))', gap: '22px' },
  card: { overflow: 'hidden', border: '1px solid #eee4df', borderRadius: '12px', background: '#fff', boxShadow: '0 5px 22px rgba(52, 35, 29, 0.07)' },
  imageFrame: { position: 'relative', height: '245px', overflow: 'hidden', background: '#f6f0ec' },
  image: { display: 'block', width: '100%', height: '100%', objectFit: 'cover' },
  heartButton: { position: 'absolute', top: '12px', right: '12px', width: '40px', height: '40px', border: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.94)', color: '#9c4e52', fontSize: '25px', lineHeight: 1, cursor: 'pointer' },
  savedHeartButton: { color: '#e11d48' },
  cardBody: { padding: '16px' },
  category: { margin: '0 0 6px', color: '#a26959', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' },
  name: { minHeight: '46px', margin: '0 0 8px', fontSize: '17px', lineHeight: 1.35 },
  rating: { display: 'flex', alignItems: 'center', gap: '7px', color: '#dd9b26', fontSize: '17px' },
  ratingNumber: { color: '#7c6f68', fontSize: '12px' },
  price: { margin: '12px 0 15px', fontSize: '20px', fontWeight: 700 },
  addButton: { width: '100%', minHeight: '43px', border: 0, borderRadius: '7px', background: '#754b43', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  skeletonCard: { padding: '12px', border: '1px solid #eee4df', borderRadius: '12px' },
  skeletonImage: { height: '220px', borderRadius: '8px', background: 'linear-gradient(90deg, #f0e9e5 25%, #faf7f5 50%, #f0e9e5 75%)', backgroundSize: '200% 100%' },
  skeletonLine: { width: '80%', height: '14px', marginTop: '14px', borderRadius: '5px', background: '#f0e9e5' },
};
