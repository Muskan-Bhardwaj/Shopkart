import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function getHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

function extractOrders(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.orders)) return data.orders;
  if (Array.isArray(data?.data?.orders)) return data.data.orders;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function priceText(value) {
  const price = Number(value);
  return `₹${Number.isFinite(price) ? price.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0'}`;
}

function dateText(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrders = useCallback(async () => {
    try {
      const response = await api.get('/orders', { headers: getHeaders() });
      setOrders(extractOrders(response?.data));
      setError('');
    } catch (requestError) {
      setOrders([]);
      setError(requestError?.response?.data?.message || requestError?.message || 'Unable to load your orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) return fetchOrders();
      return undefined;
    });
    return () => {
      active = false;
    };
  }, [fetchOrders]);

  const safeOrders = Array.isArray(orders) ? orders : [];

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>YOUR SHOPKART PURCHASES</p>
          <h1 style={styles.title}>My Orders</h1>
        </div>
        <Link to="/products" style={styles.link}>Continue shopping</Link>
      </header>

      {loading ? (
        <section role="status" style={styles.state}>Loading your orders...</section>
      ) : error ? (
        <section role="alert" style={styles.state}>
          <p>{error}</p>
          <button type="button" onClick={() => { setLoading(true); fetchOrders(); }} style={styles.button}>Try again</button>
        </section>
      ) : safeOrders.length === 0 ? (
        <section style={styles.state}>
          <h2>You have not placed any orders yet.</h2>
          <p>Your successfully paid orders will appear here.</p>
          <Link to="/products" style={styles.buttonLink}>Browse products</Link>
        </section>
      ) : (
        <section aria-label="Your orders" style={styles.list}>
          {(Array.isArray(orders) ? orders : []).map((order, index) => {
            if (!order || typeof order !== 'object') return null;
            const orderId = order?._id || order?.id || `order-${index}`;
            const itemNames = (Array.isArray(order?.items) ? order.items : [])
              .map((item) => item?.name || 'Product')
              .slice(0, 3);
            const extraItems = Math.max(0, (Array.isArray(order?.items) ? order.items.length : 0) - itemNames.length);
            const status = order?.status || 'PENDING_PAYMENT';

            return (
              <article key={orderId} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <p style={styles.orderLabel}>ORDER ID</p>
                    <h2 style={styles.orderId}>{orderId}</h2>
                    <p style={styles.date}>{dateText(order?.createdAt)}</p>
                  </div>
                  <span style={status === 'PLACED' ? styles.status : styles.pendingStatus}>{status.replaceAll('_', ' ')}</span>
                </div>
                <div style={styles.cardFooter}>
                  <p style={styles.summary}>
                    {(Array.isArray(itemNames) ? itemNames : []).join(', ') || 'Order items'}
                    {extraItems > 0 ? ` + ${extraItems} more` : ''}
                  </p>
                  <div style={styles.amountAndLink}>
                    <strong style={styles.amount}>{priceText(order?.totalAmount)}</strong>
                    <Link to={`/orders/${orderId}`} style={styles.buttonLink}>View Details</Link>
                  </div>
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
  page: { width: 'min(1000px, calc(100% - 36px))', margin: '0 auto', padding: '42px 0 68px', color: '#322522', fontFamily: 'Arial, sans-serif' },
  header: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' },
  eyebrow: { margin: '0 0 7px', color: '#a26959', fontSize: '11px', fontWeight: 700, letterSpacing: '2px' },
  title: { margin: 0, fontFamily: 'Georgia, serif', fontSize: 'clamp(32px, 5vw, 44px)' },
  link: { color: '#754b43', fontWeight: 700, textDecoration: 'none' },
  list: { display: 'grid', gap: '16px' },
  card: { padding: '20px 22px', border: '1px solid #eadbd4', borderRadius: '11px', background: '#fff' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', paddingBottom: '15px', borderBottom: '1px solid #eee3de' },
  orderLabel: { margin: '0 0 5px', color: '#a26959', fontSize: '10px', fontWeight: 700, letterSpacing: '1.4px' },
  orderId: { margin: 0, fontSize: '14px', overflowWrap: 'anywhere' },
  date: { margin: '6px 0 0', color: '#887975', fontSize: '13px' },
  status: { padding: '6px 10px', borderRadius: '20px', background: '#e8f4e9', color: '#28633b', fontSize: '11px', fontWeight: 700 },
  pendingStatus: { padding: '6px 10px', borderRadius: '20px', background: '#fff4dd', color: '#805b16', fontSize: '11px', fontWeight: 700 },
  cardFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', paddingTop: '14px' },
  summary: { margin: 0, color: '#675550', fontSize: '14px' },
  amountAndLink: { display: 'flex', alignItems: 'center', gap: '16px' },
  amount: { fontSize: '17px' },
  buttonLink: { display: 'inline-block', padding: '9px 13px', borderRadius: '6px', background: '#754b43', color: '#fff', fontSize: '13px', fontWeight: 700, textDecoration: 'none' },
  state: { padding: '36px 20px', borderRadius: '11px', background: '#fff9f5', textAlign: 'center', color: '#756763' },
  button: { padding: '10px 16px', border: 0, borderRadius: '6px', background: '#754b43', color: '#fff', fontWeight: 700, cursor: 'pointer' },
};
