import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMapPin, FiCreditCard, FiCheck } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { formatCurrency, isValidPhone, isValidPincode } from '../utils/helpers';
import { toast } from 'react-toastify';
import './Checkout.css';

const CATEGORY_IMAGES = {
  paints: '/images/products/berger-silk-glamour-price.webp',
  cement: '/images/products/cement.webp',
  steel_bars: '/images/products/steel.webp',
  tools: '/images/products/steel.webp',
  hardware: '/images/products/gi-binding-wire.webp',
  accessories: '/images/products/berger-silk-glamour-price.webp'
};

const HARD_FALLBACK_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450">' +
    '<rect width="100%" height="100%" fill="#f1f5f9"/>' +
    '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" ' +
    'font-family="Arial, sans-serif" font-size="20" fill="#64748b">' +
    'Image unavailable' +
    '</text>' +
  '</svg>'
)}`;

const getCategoryImage = (category) => CATEGORY_IMAGES[category] || CATEGORY_IMAGES.paints;

const handleCheckoutImageError = (e, category) => {
  const img = e.currentTarget;
  const stage = img.dataset.fallbackStage;

  if (!stage) {
    img.dataset.fallbackStage = 'category';
    img.src = getCategoryImage(category);
    return;
  }

  if (stage === 'category') {
    img.dataset.fallbackStage = 'hard';
    img.src = HARD_FALLBACK_IMAGE;
  }
};

const Checkout = () => {
  const { cart, getSubtotal, getGstTotal, getCartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    street: user?.address?.street || '',
    city: user?.address?.city || 'Karur',
    state: user?.address?.state || 'Tamil Nadu',
    pincode: user?.address?.pincode || ''
  });
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [errors, setErrors] = useState({});

  const deliveryCharge = getSubtotal() >= 5000 ? 0 : 100;
  const totalAmount = getCartTotal() + deliveryCharge;

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setShippingAddress(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateAddress = () => {
    const newErrors = {};
    if (!shippingAddress.name.trim()) newErrors.name = 'Name is required';
    if (!isValidPhone(shippingAddress.phone)) newErrors.phone = 'Valid phone required';
    if (!shippingAddress.street.trim()) newErrors.street = 'Address is required';
    if (!isValidPincode(shippingAddress.pincode)) newErrors.pincode = 'Valid pincode required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateAddress()) {
      setStep(2);
    }
  };

  const handlePlaceOrder = async () => {
    setLoading(true);

    try {
      const orderData = {
        items: cart.map(item => ({
          productId: item.product._id,
          quantity: item.quantity,
          colorCode:
            item.colorCode ||
            item.product.specifications?.color ||
            (item.product.category === 'paints' ? '#ff7a18' : null)
        })),
        shippingAddress,
        paymentMethod
      };

      const response = await api.post('/orders', orderData);
      const order = response.data.data;

      // TESTING MODE: backend auto-confirms "online" orders without a real
      // payment gateway, so both payment methods finish the same way here.
      clearCart();
      toast.success(
        paymentMethod === 'online'
          ? 'Payment auto-confirmed (test mode). Order placed!'
          : 'Order placed successfully!'
      );
      navigate('/orders/' + order._id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="checkout-page">
      <div className="container">
        <h1 className="checkout-title">Checkout</h1>

        <div className="checkout-steps">
          <div className={`checkout-step ${step >= 1 ? 'active' : ''}`}>
            <div className="step-number">{step > 1 ? <FiCheck /> : '1'}</div>
            <span>Delivery Address</span>
          </div>
          <div className="step-line"></div>
          <div className={`checkout-step ${step >= 2 ? 'active' : ''}`}>
            <div className="step-number">{step > 2 ? <FiCheck /> : '2'}</div>
            <span>Payment</span>
          </div>
        </div>

        <div className="checkout-layout">
          <div className="checkout-main">
            {step === 1 && (
              <div className="checkout-section">
                <div className="section-header">
                  <FiMapPin />
                  <h2>Delivery Address</h2>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={shippingAddress.name}
                      onChange={handleAddressChange}
                      className={`form-input ${errors.name ? 'error' : ''}`}
                      placeholder="Recipient name"
                    />
                    {errors.name && <span className="form-error">{errors.name}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={shippingAddress.phone}
                      onChange={handleAddressChange}
                      className={`form-input ${errors.phone ? 'error' : ''}`}
                      placeholder="10-digit mobile"
                      maxLength={10}
                    />
                    {errors.phone && <span className="form-error">{errors.phone}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Street Address *</label>
                  <textarea
                    name="street"
                    value={shippingAddress.street}
                    onChange={handleAddressChange}
                    className={`form-textarea ${errors.street ? 'error' : ''}`}
                    placeholder="House no, Street name, Landmark"
                    rows={3}
                  />
                  {errors.street && <span className="form-error">{errors.street}</span>}
                </div>

                <div className="form-row form-row-3">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      name="city"
                      value={shippingAddress.city}
                      onChange={handleAddressChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input
                      type="text"
                      name="state"
                      value={shippingAddress.state}
                      onChange={handleAddressChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode *</label>
                    <input
                      type="text"
                      name="pincode"
                      value={shippingAddress.pincode}
                      onChange={handleAddressChange}
                      className={`form-input ${errors.pincode ? 'error' : ''}`}
                      placeholder="6-digit"
                      maxLength={6}
                    />
                    {errors.pincode && <span className="form-error">{errors.pincode}</span>}
                  </div>
                </div>

                <button className="btn btn-primary btn-lg" onClick={handleContinue}>
                  Continue to Payment
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="checkout-section">
                <div className="section-header">
                  <FiCreditCard />
                  <h2>Payment Method</h2>
                </div>

                <div className="payment-options">
                  <label className={`payment-option ${paymentMethod === 'online' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="payment"
                      value="online"
                      checked={paymentMethod === 'online'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <div className="payment-content">
                      <span className="payment-title">Pay Online</span>
                      <span className="payment-desc">
                        Test mode — payment will be auto-confirmed, no real gateway
                      </span>
                    </div>
                  </label>

                  <label className={`payment-option ${paymentMethod === 'cod' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="payment"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <div className="payment-content">
                      <span className="payment-title">Cash on Delivery</span>
                      <span className="payment-desc">Pay when you receive the order</span>
                    </div>
                  </label>
                </div>

                <div className="delivery-address-summary">
                  <h4>Delivering to:</h4>
                  <p><strong>{shippingAddress.name}</strong></p>
                  <p>{shippingAddress.street}</p>
                  <p>{shippingAddress.city}, {shippingAddress.state} - {shippingAddress.pincode}</p>
                  <p>Phone: {shippingAddress.phone}</p>
                  <button className="btn btn-outline btn-sm" onClick={() => setStep(1)}>
                    Change
                  </button>
                </div>

                <button 
                  className="btn btn-primary btn-lg"
                  onClick={handlePlaceOrder}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : `Pay ${formatCurrency(totalAmount)}`}
                </button>
              </div>
            )}
          </div>

          <div className="checkout-summary">
            <h3 className="summary-title">Order Summary</h3>
            
            <div className="summary-items">
              {cart.map(item => (
                <div key={item.product._id} className="summary-item">
                  <img 
                    src={item.product.images?.[0] || getCategoryImage(item.product.category)} 
                    alt={item.product.name}
                    onError={(e) => handleCheckoutImageError(e, item.product.category)}
                  />
                  <div className="summary-item-details">
                    <span className="summary-item-name">{item.product.name}</span>
                    <span className="summary-item-qty">Qty: {item.quantity}</span>
                    {item.product.category === 'paints' && (
                      <span className="summary-item-color">
                        Shade: {item.colorCode || item.product.specifications?.color || '#ff7a18'}
                      </span>
                    )}
                  </div>
                  <span className="summary-item-price">
                    {formatCurrency(
                      (item.product.price - (item.product.price * (item.product.discount || 0) / 100)) *
                      (1 + (item.product.gst || 18) / 100) * item.quantity
                    )}
                  </span>
                </div>
              ))}
            </div>

            <div className="summary-divider"></div>

            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatCurrency(getSubtotal())}</span>
            </div>
            <div className="summary-row">
              <span>GST</span>
              <span>{formatCurrency(getGstTotal())}</span>
            </div>
            <div className="summary-row">
              <span>Delivery</span>
              <span>{deliveryCharge === 0 ? 'FREE' : formatCurrency(deliveryCharge)}</span>
            </div>

            <div className="summary-divider"></div>

            <div className="summary-row summary-total">
              <span>Total</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
