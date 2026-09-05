const ADMIN_USER = { username: 'admin', password: 'admin123' };
const WHATSAPP_NUMBER = '5491112345678'; // ⚠️ Cambiar por tu número real (con código país, sin +)

// Clientes precargados (el admin puede agregar más después)
let clients = JSON.parse(localStorage.getItem('clients')) || [
{ username: 'cliente1', password: 'cliente1', name: 'Juan Pérez' },
{ username: 'cliente2', password: 'cliente2', name: 'María López' }
];
// ============================================
// ESTADO GLOBAL
// ============================================
let currentUser = null;
let products = JSON.parse(localStorage.getItem('products')) || [];
let carts = JSON.parse(localStorage.getItem('carts')) || {};
let orders = JSON.parse(localStorage.getItem('orders')) || [];
// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
// Login form
document.getElementById('login-form').addEventListener('submit', (e) => {
e.preventDefault();
login();
});
// Product form
document.getElementById('product-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveProduct();
});

// Preview de imagen
document.getElementById('prod-img').addEventListener('change', handleImagePreview);

// Restaurar sesión si existe
const savedUser = localStorage.getItem('currentUser');
if (savedUser) {
    currentUser = JSON.parse(savedUser);
    if (currentUser.type === 'admin') {
        showScreen('admin-screen');
        renderAdminProducts();
        renderPendingOrders();
    } else {
        showScreen('client-screen');
        renderClientProducts();
        updateCartCount();
    }
}
});
// ============================================
// AUTENTICACIÓN
// ============================================
function login() {
const username = document.getElementById('login-user').value.trim();
const password = document.getElementById('login-pass').value;
const errorEl = document.getElementById('login-error');
errorEl.textContent = '';
// ¿Es admin?
if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
    currentUser = { type: 'admin', username: 'admin', name: 'Administrador' };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showScreen('admin-screen');
    renderAdminProducts();
    renderPendingOrders();
    return;
}

// ¿Es cliente?
const client = clients.find(c => c.username === username && c.password === password);
if (client) {
    currentUser = { type: 'client', ...client };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showScreen('client-screen');
    renderClientProducts();
    updateCartCount();
    return;
}

errorEl.textContent = 'Usuario o contraseña incorrectos';
}
function logout() {
currentUser = null;
localStorage.removeItem('currentUser');
showScreen('login-screen');
document.getElementById('login-form').reset();
document.getElementById('login-error').textContent = '';
}
function showScreen(screenId) {
document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
document.getElementById(screenId).classList.add('active');
}
// ============================================
// MODALES
// ============================================
function openModal(id) {
document.getElementById(id).classList.add('active');
}
function closeModal(id) {
document.getElementById(id).classList.remove('active');
}
// ============================================
// PRODUCTOS - ADMIN
// ============================================
function renderAdminProducts() {
const container = document.getElementById('admin-products');
if (products.length === 0) {
    container.innerHTML = '<p class="empty-msg">No hay productos todavía. Agregá el primero.</p>';
    return;
}

container.innerHTML = products.map(p => `
    <div class="product-card">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" class="product-img">` : `<div class="product-img no-img">📦</div>`}
        <div class="product-info">
            <h3>${p.name}</h3>
            <p class="product-desc">${p.description || 'Sin descripción'}</p>
            <div class="product-meta">
                <span class="price">$${p.price.toFixed(2)}</span>
                <span class="stock">Stock: ${p.stock}</span>
            </div>
            <div class="product-actions">
                <button class="btn-edit" onclick="editProduct(${p.id})">Editar</button>
                <button class="btn-delete" onclick="deleteProduct(${p.id})">Eliminar</button>
            </div>
        </div>
    </div>
`).join('');
}
function openProductForm() {
document.getElementById('modal-product-title').textContent = 'Nuevo producto';
document.getElementById('product-form').reset();
document.getElementById('prod-id').value = '';
document.getElementById('prod-img-preview').removeAttribute('src');
openModal('modal-product');
}
function editProduct(id) {
const p = products.find(x => x.id === id);
if (!p) return;
document.getElementById('modal-product-title').textContent = 'Editar producto';
document.getElementById('prod-id').value = p.id;
document.getElementById('prod-name').value = p.name;
document.getElementById('prod-price').value = p.price;
document.getElementById('prod-stock').value = p.stock;
document.getElementById('prod-desc').value = p.description || '';

const preview = document.getElementById('prod-img-preview');
if (p.image) {
    preview.src = p.image;
} else {
    preview.removeAttribute('src');
}

openModal('modal-product');
}
function saveProduct() {
const id = document.getElementById('prod-id').value;
const name = document.getElementById('prod-name').value.trim();
const price = parseFloat(document.getElementById('prod-price').value);
const stock = parseInt(document.getElementById('prod-stock').value);
const description = document.getElementById('prod-desc').value.trim();
const fileInput = document.getElementById('prod-img');
const preview = document.getElementById('prod-img-preview');
const finishSave = (imageData) => {
    if (id) {
        // Editar
        const p = products.find(x => x.id === parseInt(id));
        p.name = name;
        p.price = price;
        p.stock = stock;
        p.description = description;
        if (imageData) p.image = imageData;
    } else {
        // Nuevo
        products.push({
            id: Date.now(),
            name,
            price,
            stock,
            description,
            image: imageData || null
        });
    }

    localStorage.setItem('products', JSON.stringify(products));
    closeModal('modal-product');
    renderAdminProducts();
};

if (fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => finishSave(e.target.result);
    reader.readAsDataURL(fileInput.files[0]);
} else {
    // Si hay preview pero no archivo nuevo, mantener la imagen existente
    const existingImage = preview.src && preview.src !== window.location.href ? preview.src : null;
    finishSave(existingImage);
}
}
function deleteProduct(id) {
if (!confirm('¿Eliminar este producto?')) return;
products = products.filter(p => p.id !== id);
localStorage.setItem('products', JSON.stringify(products));
renderAdminProducts();
}
function handleImagePreview(e) {
const file = e.target.files[0];
const preview = document.getElementById('prod-img-preview');
if (file) {
const reader = new FileReader();
reader.onload = (ev) => {
preview.src = ev.target.result;
};
reader.readAsDataURL(file);
}
}
// ============================================
// PRODUCTOS - CLIENTE
// ============================================
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
            <button class="btn-add-cart" onclick="addToCart(${p.id})" ${p.stock === 0 ? 'disabled' : ''}>
                ${p.stock === 0 ? 'Sin stock' : '+ Añadir al carrito'}
            </button>
        </div>
    </div>
`).join('');
}
// ============================================
// CARRITO
// ============================================
function getCart() {
if (!currentUser) return [];
return carts[currentUser.username] || [];
}
function saveCart(cart) {
if (!currentUser) return;
carts[currentUser.username] = cart;
localStorage.setItem('carts', JSON.stringify(carts));
updateCartCount();
}
function addToCart(productId) {
const product = products.find(p => p.id === productId);
if (!product || product.stock === 0) return;
const cart = getCart();
const existing = cart.find(item => item.productId === productId);

if (existing) {
    if (existing.quantity >= product.stock) {
        alert('No hay más stock disponible de este producto');
        return;
    }
    existing.quantity++;
} else {
    cart.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
    });
}

saveCart(cart);
alert(`✅ ${product.name} añadido al carrito`);
}
function updateCartCount() {
const cart = getCart();
const count = cart.reduce((sum, item) => sum + item.quantity, 0);
document.getElementById('cart-count').textContent = count;
}
function openCart() {
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
            <button class="qty-btn" onclick="changeQty(${item.productId}, -1)">−</button>
            <span class="qty">${item.quantity}</span>
            <button class="qty-btn" onclick="changeQty(${item.productId}, 1)">+</button>
            <button class="btn-remove" onclick="removeFromCart(${item.productId})">🗑️</button>
        </div>
    </div>
`).join('');

const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
document.getElementById('cart-total').textContent = total.toFixed(2);
}
function changeQty(productId, delta) {
const cart = getCart();
const item = cart.find(i => i.productId === productId);
const product = products.find(p => p.id === productId);
if (!item) return;
item.quantity += delta;

if (item.quantity <= 0) {
    removeFromCart(productId);
    return;
}

if (item.quantity > product.stock) {
    alert('No hay más stock disponible');
    item.quantity = product.stock;
}

saveCart(cart);
renderCart();
}
function removeFromCart(productId) {
const cart = getCart().filter(i => i.productId !== productId);
saveCart(cart);
renderCart();
}
function cancelPurchase() {
if (!confirm('¿Seguro que querés cancelar la compra? Se vaciará el carrito.')) return;
saveCart([]);
closeModal('modal-cart');
}
// ============================================
// ENVIAR PEDIDO POR WHATSAPP
// ============================================
function sendWhatsApp() {
const cart = getCart();
if (cart.length === 0) {
alert('El carrito está vacío');
return;
}
const now = new Date();
const fecha = now.toLocaleDateString('es-AR');
const hora = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

let msg = `*🛒 NUEVO PEDIDO*\n\n`;
msg += `*Cliente:* ${currentUser.name}\n`;
msg += `*Fecha:* ${fecha}\n`;
msg += `*Hora:* ${hora}\n\n`;
msg += `*Productos:*\n`;

cart.forEach(item => {
    msg += `• ${item.name} x${item.quantity} — $${(item.price * item.quantity).toFixed(2)}\n`;
});

const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
msg += `\n*TOTAL: $${total.toFixed(2)}*`;

// Guardar pedido como pendiente
const order = {
    id: Date.now(),
    clientUsername: currentUser.username,
    clientName: currentUser.name,
    items: cart.map(i => ({ ...i })),
    total,
    date: now.toISOString(),
    status: 'pending'
};
orders.push(order);
localStorage.setItem('orders', JSON.stringify(orders));

// Abrir WhatsApp
const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
window.open(url, '_blank');

// Vaciar carrito
saveCart([]);
closeModal('modal-cart');
alert('✅ Pedido enviado por WhatsApp. Esperá la confirmación del administrador.');
}
// ============================================
// PEDIDOS - ADMIN
// ============================================
function renderPendingOrders() {
const container = document.getElementById('admin-pending-orders');
const pending = orders.filter(o => o.status === 'pending');
if (pending.length === 0) {
    container.innerHTML = '<p class="empty-msg">No hay pedidos pendientes</p>';
    return;
}

container.innerHTML = pending.map(o => `
    <div class="order-card">
        <div class="order-header">
            <div>
                <strong>${o.clientName}</strong><br>
                <small>${new Date(o.date).toLocaleString('es-AR')}</small>
            </div>
            <span class="badge badge-pending">Pendiente</span>
        </div>
        <div class="order-items">
            ${o.items.map(i => `
                <div class="order-item-row">
                    <span>${i.name} x${i.quantity}</span>
                    <span>$${(i.price * i.quantity).toFixed(2)}</span>
                </div>
            `).join('')}
        </div>
        <div class="order-total">Total: $${o.total.toFixed(2)}</div>
        <button class="btn-accept" onclick="acceptOrder(${o.id})">✓ Aceptar pedido</button>
    </div>
`).join('');
}
function acceptOrder(orderId) {
const order = orders.find(o => o.id === orderId);
if (!order) return;
// Descontar stock
order.items.forEach(item => {
    const product = products.find(p => p.id === item.productId);
    if (product) {
        product.stock = Math.max(0, product.stock - item.quantity);
    }
});

order.status = 'accepted';
localStorage.setItem('products', JSON.stringify(products));
localStorage.setItem('orders', JSON.stringify(orders));

renderPendingOrders();
renderAdminProducts();
alert('✅ Pedido aceptado. Stock actualizado.');
}
// ============================================
// PEDIDOS - CLIENTE (historial)
// ============================================
function openMyOrders() {
const container = document.getElementById('my-orders-list');
const myOrders = orders
.filter(o => o.clientUsername === currentUser.username)
.sort((a, b) => new Date(b.date) - new Date(a.date));
if (myOrders.length === 0) {
    container.innerHTML = '<p class="empty-msg">Todavía no tenés pedidos</p>';
} else {
    container.innerHTML = myOrders.map(o => `
        <div class="order-card">
            <div class="order-header">
                <div>
                    <strong>Pedido #${o.id}</strong><br>
                    <small>${new Date(o.date).toLocaleString('es-AR')}</small>
                </div>
                <span class="badge ${o.status === 'pending' ? 'badge-pending' : 'badge-accepted'}">
                    ${o.status === 'pending' ? 'Pendiente' : 'Aceptado'}
                </span>
            </div>
            <div class="order-items">
                ${o.items.map(i => `
                    <div class="order-item-row">
                        <span>${i.name} x${i.quantity}</span>
                        <span>$${(i.price * i.quantity).toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
            <div class="order-total">Total: $${o.total.toFixed(2)}</div>
        </div>
    `).join('');
}

openModal('modal-orders');
}