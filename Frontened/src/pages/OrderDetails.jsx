import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import api from '../services/api';

function getHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

function priceText(value) {
  const price = Number(value);
  return `₹${Number.isFinite(price) ? price.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0'}`;
}

export default function OrderDetails() {
  const { id } = useParams();
  const location = useLocation();
  const initialOrder = location.state?.order?._id === id ? location.state.order : null;
  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(!initialOrder);
  const [error, setError] = useState('');

  const fetchOrder = useCallback(async () => {
    try {
      const response = await api.get(`/orders/${id}`, { headers: getHeaders() });
      const orderData = response?.data?.order || response?.data?.data?.order;
      if (!orderData || typeof orderData !== 'object') throw new Error('Order details were not included in the server response.');
      setOrder(orderData);
      setError('');
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || 'Unable to load order details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) return fetchOrder();
      return undefined;
    });
    return () => {
      active = false;
    };
  }, [fetchOrder]);

  const safeItems = Array.isArray(order?.items) ? order.items : [];
  const address = order?.shippingAddress || {};

  return (
    <main style={styles.page}>
      {loading ? (
        <section role="status" style={styles.state}>Loading order details...</section>
      ) : error && !order ? (
        <section role="alert" style={styles.state}>
          <h1>Unable to load this order</h1>
          <p>{error}</p>
          <button type="button" onClick={() => { setLoading(true); fetchOrder(); }} style={styles.button}>Try again</button>
        </section>
      ) : !order ? (
        <section style={styles.state}><h1>Order not found</h1><p>We couldn't find this order.</p></section>
      ) : (
        <>
          <header style={styles.successHeader}>
            {order?.paymentStatus === 'PAID' && order?.status === 'PLACED' ? (
              <>
                <span style={styles.successBadge}>✓ Payment successful</span>
                <h1 style={styles.title}>Your order has been placed!</h1>
                <p style={styles.successMessage}>Thank you for shopping with ShopKart. Your payment is confirmed and your cart has been cleared.</p>
              </>
            ) : (
              <>
                <span style={styles.pendingBadge}>Payment pending</span>
                <h1 style={styles.title}>Your order is not confirmed yet</h1>
                <p style={styles.successMessage}>This order will be placed after payment is successfully completed and verified.</p>
              </>
            )}
            <p style={styles.orderId}>Order ID: {order?._id || id}</p>
            <p style={order?.status === 'PLACED' ? styles.status : styles.pendingStatus}>
              Order status: {(order?.status || 'PENDING_PAYMENT').replaceAll('_', ' ')}
            </p>
          </header>

          <div style={styles.columns}>
            <section style={styles.panel}>
              <h2 style={styles.sectionTitle}>Items Ordered</h2>
              {(Array.isArray(safeItems) ? safeItems : []).map((item, index) => (
                <article key={item?.product || `${item?.name || 'item'}-${index}`} style={styles.item}>
                  <div>
                    <h3 style={styles.itemName}>{item?.name || 'Product'}</h3>
                    <p style={styles.itemMeta}>{Number(item?.quantity) || 0} × {priceText(item?.price)}</p>
                  </div>
                  <strong>{priceText((Number(item?.quantity) || 0) * (Number(item?.price) || 0))}</strong>
                </article>
              ))}
              <div style={styles.total}><strong>Total Amount</strong><strong>{priceText(order?.totalAmount)}</strong></div>
            </section>

            <section style={styles.panel}>
              <h2 style={styles.sectionTitle}>Shipping Address</h2>
              <address style={styles.address}>
                <strong>{address?.fullName || '—'}</strong>
                <span>{address?.phone || '—'}</span>
                <span>{address?.addressLine1 || '—'}</span>
                <span>{[address?.city, address?.state, address?.pincode].filter(Boolean).join(', ') || '—'}</span>
              </address>
            </section>
          </div>

          <nav aria-label="Order next steps" style={styles.actions}>
            <Link to="/orders" style={styles.buttonLink}>View My Orders</Link>
            <Link to="/products" style={styles.secondaryLink}>Continue Shopping</Link>
          </nav>
        </>
      )}
    </main>
  );
}

const styles = {
  page: { width: 'min(1000px, calc(100% - 36px))', margin: '0 auto', padding: '42px 0 68px', color: '#322522', fontFamily: 'Arial, sans-serif' },
  successHeader: { marginBottom: '28px', padding: '28px 20px', borderRadius: '12px', background: '#f0f7ef', textAlign: 'center' },
  successBadge: { display: 'inline-block', padding: '7px 13px', borderRadius: '20px', background: '#dff0de', color: '#28633b', fontSize: '13px', fontWeight: 700 },
  pendingBadge: { display: 'inline-block', padding: '7px 13px', borderRadius: '20px', background: '#fff1cf', color: '#805b16', fontSize: '13px', fontWeight: 700 },
  title: { margin: '15px 0 8px', fontFamily: 'Georgia, serif', fontSize: 'clamp(30px, 5vw, 40px)' },
  successMessage: { margin: '8px auto', maxWidth: '620px', color: '#52634f', lineHeight: 1.5 },
  orderId: { margin: '8px 0', color: '#675550', overflowWrap: 'anywhere' },
  status: { margin: '8px 0 0', color: '#28633b', fontWeight: 700 },
  pendingStatus: { margin: '8px 0 0', color: '#805b16', fontWeight: 700 },
  columns: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(260px, 0.8fr)', alignItems: 'start', gap: '20px' },
  panel: { padding: '22px', border: '1px solid #eadbd4', borderRadius: '11px', background: '#fff' },
  sectionTitle: { margin: '0 0 18px', fontFamily: 'Georgia, serif', fontSize: '22px' },
  item: { display: 'flex', justifyContent: 'space-between', gap: '15px', padding: '13px 0', borderBottom: '1px solid #eee3de' },
  itemName: { margin: 0, fontSize: '15px' },
  itemMeta: { margin: '6px 0 0', color: '#887975', fontSize: '13px' },
  total: { display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '17px', fontSize: '17px' },
  address: { display: 'flex', flexDirection: 'column', gap: '9px', color: '#675550', fontStyle: 'normal', lineHeight: 1.5 },
  actions: { display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginTop: '26px' },
  buttonLink: { display: 'inline-block', padding: '12px 18px', borderRadius: '6px', background: '#754b43', color: '#fff', fontWeight: 700, textDecoration: 'none' },
  secondaryLink: { display: 'inline-block', padding: '11px 17px', border: '1px solid #754b43', borderRadius: '6px', color: '#754b43', fontWeight: 700, textDecoration: 'none' },
  state: { padding: '36px 20px', borderRadius: '11px', background: '#fff9f5', textAlign: 'center', color: '#756763' },
  button: { padding: '10px 16px', border: 0, borderRadius: '6px', background: '#754b43', color: '#fff', fontWeight: 700, cursor: 'pointer' },
};
