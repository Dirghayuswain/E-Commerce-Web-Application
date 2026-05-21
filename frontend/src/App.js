import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:5000/api';

function App() {
  // Navigation & User State
  const [view, setView] = useState('shop'); // shop, cart, orders, login, admin
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdminRegister, setIsAdminRegister] = useState(false);

  // Shop & Data State
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);

  // Admin Form State
  const [newProd, setNewProd] = useState({ name: '', price: '', description: '' });

  useEffect(() => {
    fetchProducts();
    if (user) fetchOrders();
  }, [user]);

  const fetchProducts = async () => {
    const res = await fetch(`${API_URL}/products`);
    const data = await res.json();
    setProducts(data);
  };

  const fetchOrders = async () => {
    const res = await fetch(`${API_URL}/orders`, {
      headers: { 'Authorization': `Bearer ${user.token}` }
    });
    const data = await res.json();
    setOrders(data);
  };

  // --- Auth Actions ---
  const handleAuth = async (type) => {
    const url = `${API_URL}/auth/${type}`;
    const body = type === 'register' ? { email, password, role: isAdminRegister ? 'Admin' : 'User' } : { email, password };
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (type === 'login' && data.token) {
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
      setView(data.role === 'Admin' ? 'admin' : 'shop');
    } else {
      alert(data.message || 'Action executed successfully. You can login now.');
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setCart([]);
    setOrders([]);
    setView('shop');
  };

  // --- Cart Actions ---
  const addToCart = (product) => {
    const existing = cart.find(item => item._id === product._id);
    if (existing) {
      setCart(cart.map(item => item._id === product._id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const checkout = async () => {
    if (!user) return setView('login');
    const orderData = {
      items: cart.map(i => ({ productId: i._id, quantity: i.qty })),
      totalAmount: cart.reduce((sum, i) => sum + (i.price * i.qty), 0)
    };

    const res = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`
      },
      body: JSON.stringify(orderData)
    });

    if (res.ok) {
      alert('Order Placed Successfully!');
      setCart([]);
      fetchOrders();
      setView('orders');
    }
  };

  // --- Admin Actions ---
  const addProduct = async (e) => {
    e.preventDefault();
    await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`
      },
      body: JSON.stringify(newProd)
    });
    setNewProd({ name: '', price: '', description: '' });
    fetchProducts();
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    await fetch(`${API_URL}/orders/${orderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    fetchOrders();
  };

  return (
    <div>
      <nav>
        <h2>⚡ SwiftStore</h2>
        <div>
          <button onClick={() => setView('shop')}>Catalog</button>
          <button onClick={() => setView('cart')}>Cart ({cart.reduce((a, b) => a + b.qty, 0)})</button>
          {user && <button onClick={() => setView('orders')}>My Orders</button>}
          {user && user.role === 'Admin' && <button onClick={() => setView('admin')}>Admin Dashboard</button>}
          {user ? (
            <button onClick={logout} style={{ color: '#ff4d4d' }}>Logout ({user.email})</button>
          ) : (
            <button onClick={() => setView('login')}>Login / Register</button>
          )}
        </div>
      </nav>

      <div className="container">
        {/* SHOP CATALOG VIEW */}
        {view === 'shop' && (
          <div>
            <h3>Product Catalog</h3>
            <div className="grid">
              {products.map(p => (
                <div key={p._id} className="card">
                  <h4>{p.name}</h4>
                  <p>{p.description}</p>
                  <p><strong>${p.price}</strong></p>
                  <button className="btn" onClick={() => addToCart(p)}>Add to Cart</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CART VIEW */}
        {view === 'cart' && (
          <div>
            <h3>Your Shopping Cart</h3>
            {cart.length === 0 ? <p>Your cart is empty.</p> : (
              <div>
                {cart.map(item => (
                  <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #ddd' }}>
                    <span>{item.name} (x{item.qty})</span>
                    <span>${item.price * item.qty}</span>
                  </div>
                ))}
                <h4>Total: ${cart.reduce((sum, i) => sum + (i.price * i.qty), 0)}</h4>
                <button className="btn" onClick={checkout}>Proceed to Checkout / Place Order</button>
              </div>
            )}
          </div>
        )}

        {/* ORDER TRACKING VIEW */}
        {view === 'orders' && (
          <div>
            <h3>Your Orders & Tracking</h3>
            {orders.map(o => (
              <div key={o._id} className="card" style={{ textAlign: 'left', margin: '10px 0' }}>
                <p><strong>Order ID:</strong> {o._id}</p>
                <p><strong>Total Amount:</strong> ${o.totalAmount}</p>
                <p><strong>Status:</strong> <span style={{ color: o.status === 'Delivered' ? 'green' : 'orange' }}>{o.status}</span></p>
              </div>
            ))}
          </div>
        )}

        {/* LOGIN / REGISTER VIEW */}
        {view === 'login' && (
          <div style={{ maxWidth: '400px', margin: '0 auto' }}>
            <h3>Login / Register</h3>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
            <label style={{ display: 'block', margin: '10px 0' }}>
              <input type="checkbox" checked={isAdminRegister} onChange={e => setIsAdminRegister(e.target.checked)} style={{ width: 'auto', marginRight: '5px' }} />
              Register as Admin
            </label>
            <button className="btn" onClick={() => handleAuth('login')} style={{ marginRight: '10px' }}>Login</button>
            <button className="btn" onClick={() => handleAuth('register')} style={{ background: '#28a745' }}>Register</button>
          </div>
        )}

        {/* ADMIN DASHBOARD */}
        {view === 'admin' && user?.role === 'Admin' && (
          <div className="flex-split">
            <div className="flex-child">
              <h3>Add New Product</h3>
              <form onSubmit={addProduct}>
                <input type="text" placeholder="Product Name" value={newProd.name} onChange={e => setNewProd({ ...newProd, name: e.target.value })} required />
                <input type="number" placeholder="Price" value={newProd.price} onChange={e => setNewProd({ ...newProd, price: e.target.value })} required />
                <input type="text" placeholder="Description" value={newProd.description} onChange={e => setNewProd({ ...newProd, description: e.target.value })} />
                <button type="submit" className="btn">Create Product</button>
              </form>
            </div>
            <div className="flex-child">
              <h3>Manage Incoming Customer Orders</h3>
              {orders.map(o => (
                <div key={o._id} className="card" style={{ textAlign: 'left', margin: '10px 0' }}>
                  <p><strong>User:</strong> {o.userId?.email || 'Customer'}</p>
                  <p><strong>Total:</strong> ${o.totalAmount}</p>
                  <p><strong>Current Status:</strong> {o.status}</p>
                  <select value={o.status} onChange={(e) => updateOrderStatus(o._id, e.target.value)}>
                    <option value="Pending">Pending</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
