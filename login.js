import { db, collection, doc, setDoc, getDocs, query, where } from './firebase-config.js';

const ADMIN_USER = { username: 'admin', password: 'admin123' };

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await login();
});

async function login() {
    const username = document.getElementById('login-user').value.trim();
    const password = document.getElementById('login-pass').value;
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';

    if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
        localStorage.setItem('currentUser', JSON.stringify({ type: 'admin', username: 'admin', name: 'Administrador' }));
        window.location.href = 'admin.html';
        return;
    }

    try {
        const clientsRef = collection(db, 'clients');
        const q = query(clientsRef, where('username', '==', username), where('password', '==', password));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const clientDoc = querySnapshot.docs[0];
            const clientData = clientDoc.data();
            
            localStorage.setItem('currentUser', JSON.stringify({
                type: 'client',
                username: clientData.username,
                name: clientData.name,
                id: clientDoc.id
            }));
            window.location.href = 'client.html';
            return;
        }
        errorEl.textContent = 'Usuario o contraseña incorrectos';
    } catch (error) {
        console.error('Error en login:', error);
        errorEl.textContent = 'Error de conexión.';
    }
}

// Crear clientes iniciales si no existen en la base de datos
async function initClients() {
    const initialClients = [
        { username: 'cliente1', password: 'cliente1', name: 'Juan Pérez' },
        { username: 'cliente2', password: 'cliente2', name: 'María López' }
    ];

    for (const client of initialClients) {
        const q = query(collection(db, 'clients'), where('username', '==', client.username));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            await setDoc(doc(collection(db, 'clients')), client);
        }
    }
}

initClients();