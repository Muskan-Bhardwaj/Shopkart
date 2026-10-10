import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useCart } from '../context/CartContext';

const EMPTY_ADDRESS = {
  fullName: '',
  phone: '',
  addressLine1: '',
  city: '',
  state: '',
  pincode: '',
};
const FALLBACK_IMAGE = 'https://via.placeholder.com/120?text=ShopKart';

function getHeaders() {
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

function priceText(value) {
  const price = Number(value);
  return `₹${Number.isFinite(price) ? price.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0'}`;
}

function getErrorMessage(error) {
  return error?.response?.data?.message || error?.message || 'Something went wrong. Please try again.';
}

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(Boolean(window.Razorpay)), { once: true });
      existingScript.addEventListener('error', () => resolve(false), { once: true });
      if (window.Razorpay) resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function validateAddress(address) {
  const errors = {};
  const requiredFields = ['fullName', 'phone', 'addressLine1', 'city', 'state', 'pincode'];
  requiredFields.forEach((field) => {
    if (!address[field].trim()) errors[field] = 'This field is required.';
  });
  if (address.phone.trim() && !/^\d{10}$/.test(address.phone.trim())) {
    errors.phone = 'Enter a valid 10-digit phone number.';
  }
  if (address.pincode.trim() && !/^\d{6}$/.test(address.pincode.trim())) {
    errors.pincode = 'Enter a valid 6-digit pincode.';
  }
  return errors;
}

export default function Checkout() {
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const safeItems = Array.isArray(cartItems) ? cartItems : [];

  const fetchCart = useCallback(async () => {
    try {
      const response = await api.get('/cart', { headers: getHeaders() });
      setCartItems(extractCart(response?.data));
      setError('');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) return fetchCart();
      return undefined;
    });
    return () => {
      active = false;
    };
  }, [fetchCart]);

  const total = useMemo(
    () => (Array.isArray(cartItems) ? cartItems : []).reduce((sum, item) => {
      const product = productOf(item);
      return sum + (Number(product?.price) || 0) * (Number(item?.quantity) || 0);
    }, 0),
    [cartItems],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setAddress((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateAddress(address);
    setFieldErrors(validationErrors);
    setError('');
    setNotice('');
    if (Object.keys(validationErrors).length > 0) {
      setError('Please correct the highlighted shipping address fields.');
      return;
    }
    if (safeItems.length === 0) {
      setError('Your cart is empty. Add items before checking out.');
      return;
    }

    setSubmitting(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error('Unable to load Razorpay checkout. Check your internet connection and try again.');

      const response = await api.post(
        '/orders/create-payment-order',
        { shippingAddress: address },
        { headers: getHeaders() },
      );
      const paymentOrder = response?.data;
      if (!paymentOrder?.success || !paymentOrder?.key || !paymentOrder?.razorpayOrderId) {
        throw new Error(paymentOrder?.message || 'The server did not return a valid payment order.');
      }

      const isTestMode = String(paymentOrder.key).startsWith('rzp_test_');
      setPaymentMode(isTestMode ? 'test' : 'live');
      if (isTestMode) {
        setNotice('Razorpay test mode is active. Use the test payment details shown below; real cards and bank payments will not complete.');
      }

      const options = {
        key: paymentOrder.key,
        amount: Math.round(Number(paymentOrder.amount)),
        currency: paymentOrder.currency || 'INR',
        name: 'ShopKart',
        description: isTestMode ? 'ShopKart TEST payment - use test payment details' : 'ShopKart order payment',
        order_id: String(paymentOrder.razorpayOrderId),
        prefill: {
          name: address.fullName,
          contact: address.phone ? String(address.phone).replace(/\D/g, '') : '',
        },
        notes: {
          shopKartOrderId: String(paymentOrder.shopKartOrderId),
        },
        handler: async (paymentResponse) => {
          try {
            const verificationResponse = await api.post(
              '/orders/verify-payment',
              {
                shopKartOrderId: paymentOrder.shopKartOrderId,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
              },
              { headers: getHeaders() },
            );
            if (!verificationResponse?.data?.success || !verificationResponse?.data?.order?._id) {
              throw new Error(verificationResponse?.data?.message || 'Payment verification was unsuccessful.');
            }
            clearCart();
            navigate(`/orders/${verificationResponse.data.order._id}`, {
              replace: true,
              state: { order: verificationResponse.data.order },
            });
          } catch (verificationError) {
            setError(`Payment was received, but order verification failed. Keep this page open and contact support with payment ID ${paymentResponse.razorpay_payment_id}. ${getErrorMessage(verificationError)}`);
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            setNotice('Payment was cancelled. Your cart is unchanged.');
            setSubmitting(false);
          },
        },
        theme: { color: '#754b43' },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', (paymentFailure) => {
        const failure = paymentFailure?.error;
        const reason = [
          failure?.description,
          failure?.reason && `Reason: ${failure.reason}`,
          failure?.code && `Code: ${failure.code}`,
        ].filter(Boolean).join(' ');
        setNotice(
          `${reason || 'Razorpay could not complete this payment.'} Your cart is unchanged.${
            isTestMode ? ' Test mode is active: use a Razorpay test payment method, not a real card or bank account.' : ''
          }`,
        );
        setSubmitting(false);
      });
      razorpay.open();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setSubmitting(false);
    }
  };

  const fields = [
    { name: 'fullName', label: 'Full Name', type: 'text', autoComplete: 'name' },
    { name: 'phone', label: 'Phone (10 digits)', type: 'tel', autoComplete: 'tel', inputMode: 'numeric', maxLength: 10 },
    { name: 'addressLine1', label: 'Address Line 1', type: 'text', autoComplete: 'street-address' },
    { name: 'city', label: 'City', type: 'text', autoComplete: 'address-level2' },
    { name: 'state', label: 'State', type: 'text', autoComplete: 'address-level1' },
    { name: 'pincode', label: 'Pincode (6 digits)', type: 'text', autoComplete: 'postal-code', inputMode: 'numeric', maxLength: 6 },
  ];

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>SECURE CHECKOUT</p>
          <h1 style={styles.title}>Delivery & Payment</h1>
        </div>
        <Link to="/cart" style={styles.backLink}>Back to cart</Link>
      </header>

      {loading ? (
        <section role="status" style={styles.statePanel}>Loading your order summary...</section>
      ) : (
        <>
          {error && <p role="alert" style={styles.error}>{error}</p>}
          {notice && <p role="status" style={styles.notice}>{notice}</p>}
          {paymentMode === 'test' && (
            <aside role="note" style={styles.testModeNotice}>
              <strong>Razorpay test mode is active.</strong>
              <span>Select Netbanking → SBI → Success or UPI → success@razorpay to complete testing. No real payment will be made.</span>
            </aside>
          )}
          {safeItems.length === 0 ? (
            <section style={styles.statePanel}>
              <h2>Your cart is empty</h2>
              <p>Add products to your cart before checkout.</p>
              <Link to="/products" style={styles.buttonLink}>Browse products</Link>
            </section>
          ) : (
            <div style={styles.columns}>
              <form onSubmit={handleSubmit} noValidate style={styles.form}>
                <h2 style={styles.sectionTitle}>Shipping Address</h2>
                <div style={styles.fields}>
                  {fields.map((field) => (
                    <label key={field.name} style={styles.label}>
                      <span>{field.label}</span>
                      <input
                        name={field.name}
                        type={field.type}
                        value={address[field.name]}
                        onChange={handleChange}
                        autoComplete={field.autoComplete}
                        inputMode={field.inputMode}
                        maxLength={field.maxLength}
                        aria-invalid={Boolean(fieldErrors[field.name])}
                        aria-describedby={fieldErrors[field.name] ? `${field.name}-error` : undefined}
                        style={{ ...styles.input, ...(fieldErrors[field.name] ? styles.invalidInput : {}) }}
                      />
                      {fieldErrors[field.name] && (
                        <span id={`${field.name}-error`} role="alert" style={styles.fieldError}>{fieldErrors[field.name]}</span>
                      )}
                    </label>
                  ))}
                </div>
                <button type="submit" disabled={submitting} style={styles.primaryButton}>
                  {submitting ? 'Opening secure payment...' : 'Place Order'}
                </button>
                <p style={styles.secureNote}>Payments are processed securely by Razorpay. Card and UPI details are never sent to ShopKart.</p>
              </form>

              <aside style={styles.summary}>
                <h2 style={styles.sectionTitle}>Order Summary</h2>
                <div style={styles.items}>
                  {(Array.isArray(cartItems) ? cartItems : []).map((item, index) => {
                    const product = productOf(item);
                    const productId = product?._id || product?.id || `checkout-item-${index}`;
                    const quantity = Number(item?.quantity) || 0;
                    const price = Number(product?.price) || 0;
                    return (
                      <article key={productId} style={styles.item}>
                        <img
                          src={product?.imageUrl || product?.image || FALLBACK_IMAGE}
                          alt={product?.name || 'Product'}
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = FALLBACK_IMAGE;
                          }}
                          style={styles.image}
                        />
                        <div style={styles.itemDescription}>
                          <strong>{product?.name || 'Product'}</strong>
                          <span>{quantity} × {priceText(price)}</span>
                        </div>
                        <strong>{priceText(quantity * price)}</strong>
                      </article>
                    );
                  })}
                </div>
                <div style={styles.total}><strong>Total</strong><strong>{priceText(total)}</strong></div>
                <p style={styles.serverPriceNote}>Final pricing and stock are verified by ShopKart before payment.</p>
              </aside>
            </div>
          )}
        </>
      )}
    </main>
  );
}

const styles = {
  page: { width: 'min(1120px, calc(100% - 36px))', margin: '0 auto', padding: '42px 0 68px', color: '#322522', fontFamily: 'Arial, sans-serif' },
  header: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' },
  eyebrow: { margin: '0 0 7px', color: '#a26959', fontSize: '11px', fontWeight: 700, letterSpacing: '2px' },
  title: { margin: 0, fontFamily: 'Georgia, serif', fontSize: 'clamp(32px, 5vw, 44px)' },
  backLink: { color: '#754b43', fontWeight: 700, textDecoration: 'none' },
  columns: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(290px, 0.8fr)', alignItems: 'start', gap: '26px' },
  form: { padding: '24px', border: '1px solid #eadbd4', borderRadius: '11px', background: '#fff' },
  sectionTitle: { margin: '0 0 20px', fontFamily: 'Georgia, serif', fontSize: '23px' },
  fields: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: '15px' },
  label: { display: 'flex', flexDirection: 'column', gap: '7px', color: '#594a45', fontSize: '13px', fontWeight: 700 },
  input: { boxSizing: 'border-box', width: '100%', minHeight: '42px', padding: '9px 11px', border: '1px solid #ddcec7', borderRadius: '6px', color: '#322522', fontSize: '15px' },
  invalidInput: { borderColor: '#bd4040', background: '#fffafa' },
  fieldError: { color: '#a52b2b', fontSize: '12px', fontWeight: 400 },
  primaryButton: { width: '100%', minHeight: '46px', marginTop: '22px', border: 0, borderRadius: '7px', background: '#754b43', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer' },
  secureNote: { margin: '12px 0 0', color: '#887975', fontSize: '12px', lineHeight: 1.5 },
  summary: { padding: '23px', border: '1px solid #eadbd4', borderRadius: '11px', background: '#fff9f5' },
  items: { display: 'flex', flexDirection: 'column', gap: '14px' },
  item: { display: 'grid', gridTemplateColumns: '58px minmax(0, 1fr) auto', alignItems: 'center', gap: '11px', paddingBottom: '13px', borderBottom: '1px solid #eee3de', fontSize: '13px' },
  image: { width: '58px', height: '58px', borderRadius: '6px', objectFit: 'cover', background: '#f5eee9' },
  itemDescription: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: '5px' },
  total: { display: 'flex', justifyContent: 'space-between', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #ddcec7', fontSize: '17px' },
  serverPriceNote: { margin: '14px 0 0', color: '#887975', fontSize: '12px', lineHeight: 1.5 },
  statePanel: { padding: '36px 20px', borderRadius: '11px', background: '#fff9f5', textAlign: 'center', color: '#756763' },
  buttonLink: { display: 'inline-block', marginTop: '10px', padding: '11px 18px', borderRadius: '6px', background: '#754b43', color: '#fff', fontWeight: 700, textDecoration: 'none' },
  error: { padding: '12px 14px', borderRadius: '7px', background: '#fff0f0', color: '#852a2a' },
  notice: { padding: '12px 14px', borderRadius: '7px', background: '#fff8e9', color: '#795518' },
  testModeNotice: { display: 'grid', gap: '6px', margin: '12px 0', padding: '12px 16px', borderRadius: '8px', background: '#eef5ff', color: '#25466d', fontSize: '14px', lineHeight: 1.5 },
};