import { db, collection, doc, getDocs, setDoc, updateDoc, onSnapshot, query, where } from './firebase-config.js';

const WHATSAPP_NUMBER = '5491112345678'; // ⚠️ Cambiar por tu número real

const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser || currentUser.type !== 'client') {
    window.location.href = 'index.html';
}

let products = [];
let carts = {};
let orders = [];

// ===== FUNCIÓN TOAST (CARTELITO) =====
function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

document.addEventListener('DOMContentLoaded', () => {
    listenToProducts();
    listenToOrders();
    loadCart();
    updateCartCount();
});

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function listenToProducts() {
    onSnapshot(collection(db, 'products'), (snapshot) => {
        products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderClientProducts();
    });
}

function listenToOrders() {
    const q = query(collection(db, 'orders'), where('clientUsername', '==', currentUser.username));
    onSnapshot(q, (snapshot) => {
        orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });
}

function renderClientProducts() {
    const container = document.getElementById('client-products');
    if (products.length === 0) {
        container.innerHTML = '<p class="empty-msg">No hay productos disponibles todavía.</p>';
        return;
    }
    container.innerHTML = products.map(p => `
        <div class="product-card">
            ${p.image ? `<img src="${p.image}" alt="${p.name}" class="product-img">` : `<div class="product-img no-img">📦</div>`}
            <div class="product-info">
                <h3>${p.name}</h3>
                <p class="product-desc">${p.description || ''}</p>
                <div class="product-meta">
                    <span class="price">$${p.price.toFixed(2)}</span>
                    <span class="stock">Stock: ${p.stock}</span>
                </div>
                <button class="btn-add-cart" onclick="addToCart('${p.id}')" ${p.stock === 0 ? 'disabled' : ''}>
                    ${p.stock === 0 ? 'Sin stock' : '+ Añadir al carrito'}
                </button>
            </div>
        </div>
    `).join('');
}

async function loadCart() {
    try {
        const cartRef = doc(db, 'carts', currentUser.username);
        const { getDoc } = await import('./firebase-config.js');
        const cartSnap = await getDoc(cartRef);
        if (cartSnap.exists()) {
            carts[currentUser.username] = cartSnap.data().items || [];
        } else {
            carts[currentUser.username] = [];
        }
    } catch (error) {
        console.error('Error cargando carrito:', error);
        carts[currentUser.username] = [];
    }
    updateCartCount();
}

function getCart() { return carts[currentUser.username] || []; }

async function saveCart(cart) {
    carts[currentUser.username] = cart;
    try {
        await setDoc(doc(db, 'carts', currentUser.username), {
            items: cart,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error guardando carrito:', error);
    }
    updateCartCount();
}

async function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock === 0) {
        showToast('❌ Producto no disponible');
        return;
    }

    const cart = getCart();
    const existing = cart.find(item => item.productId === productId);

    if (existing) {
        if (existing.quantity >= product.stock) {
            showToast('⚠️ Sin más stock');
            return;
        }
        existing.quantity++;
    } else {
        cart.push({ productId: product.id, name: product.name, price: product.price, quantity: 1 });
    }

    await saveCart(cart);
    showToast('✅ Añadido al carrito');
}

function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').textContent = count;
}

async function openCart() {
    await loadCart();
    renderCart();
    openModal('modal-cart');
}

function renderCart() {
    const cart = getCart();
    const container = document.getElementById('cart-items');
    if (cart.length === 0) {
        container.innerHTML = '<p class="empty-msg">Tu carrito está vacío</p>';
        document.getElementById('cart-total').textContent = '0.00';
        return;
    }
    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <strong>${item.name}</strong>
                <p>$${item.price.toFixed(2)} c/u</p>
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" onclick="changeQty('${item.productId}', -1)">−</button>
                <span class="qty">${item.quantity}</span>
                <button class="qty-btn" onclick="changeQty('${item.productId}', 1)">+</button>
                <button class="btn-remove" onclick="removeFromCart('${item.productId}')">🗑️</button>
            </div>
        </div>
    `).join('');
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    document.getElementById('cart-total').textContent = total.toFixed(2);
}

async function changeQty(productId, delta) {
    const cart = getCart();
    const item = cart.find(i => i.productId === productId);
    const product = products.find(p => p.id === productId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
        await removeFromCart(productId);
        return;
    }
    if (product && item.quantity > product.stock) {
        showToast('⚠️ Sin más stock');
        item.quantity = product.stock;
    }
    await saveCart(cart);
    renderCart();
}

async function removeFromCart(productId) {
    const cart = getCart().filter(i => i.productId !== productId);
    await saveCart(cart);
    renderCart();
}

async function cancelPurchase() {
    if (!confirm('¿Seguro que querés cancelar la compra? Se vaciará el carrito.')) return;
    await saveCart([]);
    closeModal('modal-cart');
    showToast('️ Compra cancelada');
}

async function sendWhatsApp() {
    const cart = getCart();
    if (cart.length === 0) {
        showToast('⚠️ Carrito vacío');
        return;
    }

    const now = new Date();
    const fecha = now.toLocaleDateString('es-AR');
    const hora = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    let msg = `*🛒 NUEVO PEDIDO*\n\n*Cliente:* ${currentUser.name}\n*Fecha:* ${fecha}\n*Hora:* ${hora}\n\n*Productos:*\n`;
    cart.forEach(item => {
        msg += `• ${item.name} x${item.quantity} — $${(item.price * item.quantity).toFixed(2)}\n`;
    });
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    msg += `\n*TOTAL: $${total.toFixed(2)}*`;

    const order = {
        clientUsername: currentUser.username,
        clientName: currentUser.name,
        items: cart.map(i => ({ ...i })),
        total,
        date: now.toISOString(),
        status: 'pending'
    };
    
    await setDoc(doc(collection(db, 'orders')), order);

    // ⚠️ CAMBIO CLAVE: usar window.location.href para abrir directo la app
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.location.href = url;

    await saveCart([]);
    closeModal('modal-cart');
    showToast('✅ Pedido enviado');
}

function openMyOrders() {
    const container = document.getElementById('my-orders-list');
    const myOrders = orders.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (myOrders.length === 0) {
        container.innerHTML = '<p class="empty-msg">Todavía no tenés pedidos</p>';
    } else {
        container.innerHTML = myOrders.map(o => `
            <div class="order-card">
                <div class="order-header">
                    <div>
                        <strong>Pedido #${o.id.slice(-6)}</strong><br>
                        <small>${new Date(o.date).toLocaleString('es-AR')}</small>
                    </div>
                    <span class="badge ${o.status === 'pending' ? 'badge-pending' : 'badge-accepted'}">
                        ${o.status === 'pending' ? 'Pendiente' : 'Aceptado'}
                    </span>
                </div>
                <div class="order-items">
                    ${o.items.map(i => `<div class="order-item-row"><span>${i.name} x${i.quantity}</span><span>$${(i.price * i.quantity).toFixed(2)}</span></div>`).join('')}
                </div>
                <div class="order-total">Total: $${o.total.toFixed(2)}</div>
            </div>
        `).join('');
    }
    openModal('modal-orders');
}

// ⚠️ EXPOSICIÓN GLOBAL PARA onclick
window.logout = logout;
window.openCart = openCart;
window.openMyOrders = openMyOrders;
window.addToCart = addToCart;
window.changeQty = changeQty;
window.removeFromCart = removeFromCart;
window.cancelPurchase = cancelPurchase;
window.sendWhatsApp = sendWhatsApp;
window.closeModal = closeModal;
window.showToast = showToast;
