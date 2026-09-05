import { db, collection, doc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot, query, where } from './firebase-config.js';

const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser || currentUser.type !== 'admin') {
    window.location.href = 'index.html';
}

let products = [];
let clients = [];
let orders = [];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('product-form').addEventListener('submit', async (e) => { e.preventDefault(); await saveProduct(); });
    document.getElementById('client-form').addEventListener('submit', async (e) => { e.preventDefault(); await saveClient(); });
    document.getElementById('prod-img').addEventListener('change', handleImagePreview);

    listenToProducts();
    listenToOrders();
    listenToClients();
});

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// --- PRODUCTOS ---
function listenToProducts() {
    onSnapshot(collection(db, 'products'), (snapshot) => {
        products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAdminProducts();
    });
}

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
                    <button class="btn-edit" onclick="editProduct('${p.id}')">Editar</button>
                    <button class="btn-delete" onclick="deleteProduct('${p.id}')">Eliminar</button>
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
    if (p.image) preview.src = p.image;
    else preview.removeAttribute('src');
    openModal('modal-product');
}

async function saveProduct() {
    const id = document.getElementById('prod-id').value;
    const name = document.getElementById('prod-name').value.trim();
    const price = parseFloat(document.getElementById('prod-price').value);
    const stock = parseInt(document.getElementById('prod-stock').value);
    const description = document.getElementById('prod-desc').value.trim();
    const fileInput = document.getElementById('prod-img');
    const preview = document.getElementById('prod-img-preview');

    const saveToFirestore = async (imageData) => {
        const productData = { name, price, stock, description, image: imageData || null, updatedAt: new Date().toISOString() };
        if (id) {
            await updateDoc(doc(db, 'products', id), productData);
        } else {
            await setDoc(doc(collection(db, 'products')), { ...productData, createdAt: new Date().toISOString() });
        }
        closeModal('modal-product');
    };

    if (fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => saveToFirestore(e.target.result);
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        const existingImage = preview.src && preview.src !== window.location.href ? preview.src : null;
        await saveToFirestore(existingImage);
    }
}

async function deleteProduct(id) {
    if (!confirm('¿Eliminar este producto?')) return;
    await deleteDoc(doc(db, 'products', id));
}

function handleImagePreview(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('prod-img-preview');
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => { preview.src = ev.target.result; };
        reader.readAsDataURL(file);
    }
}

// --- CLIENTES ---
function listenToClients() {
    onSnapshot(collection(db, 'clients'), (snapshot) => {
        clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderClients();
    });
}

function renderClients() {
    const container = document.getElementById('admin-clients');
    if (clients.length === 0) {
        container.innerHTML = '<p class="empty-msg">No hay clientes registrados</p>';
        return;
    }
    container.innerHTML = clients.map(c => `
        <div class="client-item">
            <div class="client-info">
                <h4>${c.name}</h4>
                <p>Usuario: ${c.username} | Contraseña: ${c.password}</p>
            </div>
            <div class="client-actions">
                <button class="btn-edit" onclick="editClient('${c.id}')">Editar</button>
                <button class="btn-delete" onclick="deleteClient('${c.id}')">Eliminar</button>
            </div>
        </div>
    `).join('');
}

function openClientForm() {
    document.getElementById('modal-client-title').textContent = 'Nuevo cliente';
    document.getElementById('client-form').reset();
    document.getElementById('client-id').value = '';
    openModal('modal-client');
}

function editClient(id) {
    const c = clients.find(x => x.id === id);
    if (!c) return;
    document.getElementById('modal-client-title').textContent = 'Editar cliente';
    document.getElementById('client-id').value = id;
    document.getElementById('client-name').value = c.name;
    document.getElementById('client-user').value = c.username;
    document.getElementById('client-pass').value = c.password;
    openModal('modal-client');
}

async function saveClient() {
    const id = document.getElementById('client-id').value;
    const name = document.getElementById('client-name').value.trim();
    const username = document.getElementById('client-user').value.trim();
    const password = document.getElementById('client-pass').value;
    const clientData = { name, username, password };

    if (id) {
        await updateDoc(doc(db, 'clients', id), clientData);
    } else {
        await setDoc(doc(collection(db, 'clients')), clientData);
    }
    closeModal('modal-client');
}

async function deleteClient(id) {
    if (!confirm('¿Eliminar este cliente?')) return;
    await deleteDoc(doc(db, 'clients', id));
}

// --- PEDIDOS ---
function listenToOrders() {
    const q = query(collection(db, 'orders'), where('status', '==', 'pending'));
    onSnapshot(q, (snapshot) => {
        orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderPendingOrders();
    });
}

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
                ${o.items.map(i => `<div class="order-item-row"><span>${i.name} x${i.quantity}</span><span>$${(i.price * i.quantity).toFixed(2)}</span></div>`).join('')}
            </div>
            <div class="order-total">Total: $${o.total.toFixed(2)}</div>
            <button class="btn-accept" onclick="acceptOrder('${o.id}')">✓ Aceptar pedido</button>
        </div>
    `).join('');
}

async function acceptOrder(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    for (const item of order.items) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
            const newStock = Math.max(0, product.stock - item.quantity);
            await updateDoc(doc(db, 'products', product.id), { stock: newStock });
        }
    }
    await updateDoc(doc(db, 'orders', orderId), { status: 'accepted' });
    alert('✅ Pedido aceptado. Stock actualizado.');
}

// ⚠️ AGREGAR ESTO AL FINAL PARA QUE FUNCIONEN LOS onclick
window.logout = logout;
window.openProductForm = openProductForm;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.openClientForm = openClientForm;
window.editClient = editClient;
window.deleteClient = deleteClient;
window.acceptOrder = acceptOrder;
window.closeModal = closeModal;
