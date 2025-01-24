document.addEventListener('DOMContentLoaded', () => {
    const cartItemsContainer = document.getElementById('cartItems');
    const cartTotalElement = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const continueShoppingBtn = document.getElementById('continueShoppingBtn');
    const guestCheckoutForm = document.getElementById('guestCheckoutForm');

    const coffeeBeans = [
        { id: 1, name: 'Arabica', price: 10.99, image: 'arabica.png' },
        { id: 2, name: 'Robusta', price: 8.99, image: 'robusta.png' },
        { id: 3, name: 'Liberica', price: 12.99, image: 'liberica.png' },
        { id: 4, name: 'Excelsa', price: 11.99, image: 'excelsa.png' },
        { id: 5, name: 'Typica', price: 9.99, image: 'typica.png' },
        { id: 6, name: 'Geisha', price: 13.99, image: 'geisha.png' }
    ];

    function loadCartItems() {
        const cartItems = JSON.parse(localStorage.getItem('cart')) || [];
        cartItemsContainer.innerHTML = '';

        if (cartItems.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
            checkoutBtn.disabled = true;
            return;
        }

        cartItems.forEach((item) => {
            const bean = coffeeBeans.find(b => b.id === item.id);
            const itemTotal = (bean.price * item.quantity).toFixed(2);
            
            const cartItemElement = document.createElement('div');
            cartItemElement.className = 'basket-item';
            cartItemElement.id = `basket-item-${item.id}`;
            cartItemElement.dataset.quantity = item.quantity;
            
            cartItemElement.innerHTML = `
                <p>${bean.name} - $${bean.price.toFixed(2)} x ${item.quantity} = $${itemTotal}</p>
                <div class="action-buttons">
                    <button class="edit-button" onclick="editCartItem(${item.id})"><i class="fas fa-edit"></i></button>
                    <button class="remove-button" onclick="removeCartItem(${item.id})"><i class="fas fa-trash"></i></button>
                </div>
            `;
            
            cartItemsContainer.appendChild(cartItemElement);
        });

        updateTotalPrice();
    }

    window.updateQuantity = function(id, change) {
        const item = document.getElementById(`basket-item-${id}`);
        let quantity = parseInt(item.dataset.quantity);
        quantity += change;

        if (quantity < 1) return;

        item.dataset.quantity = quantity;
        updateCartStorage();
        loadCartItems();
    };

    window.editCartItem = function(id) {
        const existingItem = document.getElementById(`basket-item-${id}`);
        const bean = coffeeBeans.find(b => b.id === id);
        const existingQuantity = parseInt(existingItem.dataset.quantity);
        const newQuantity = prompt(`Enter new quantity for ${bean.name}:`, existingQuantity);

        if (newQuantity !== null && newQuantity > 0) {
            existingItem.dataset.quantity = newQuantity;
            updateCartStorage();
            loadCartItems();
        }
    };

    window.removeCartItem = function(id) {
        const itemToRemove = document.getElementById(`basket-item-${id}`);
        itemToRemove.remove();
        updateCartStorage();
        updateTotalPrice();
        
        if (document.querySelectorAll('.basket-item').length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
            checkoutBtn.disabled = true;
            guestCheckoutForm.style.display = 'none';
            checkoutBtn.style.display = 'block';
        }
    };

    function updateTotalPrice() {
        let total = 0;
        const basketItems = document.querySelectorAll('.basket-item');
        
        basketItems.forEach(item => {
            const id = parseInt(item.id.split('-')[2]);
            const bean = coffeeBeans.find(b => b.id === id);
            const quantity = parseInt(item.dataset.quantity);
            total += bean.price * quantity;
        });

        cartTotalElement.textContent = `$${total.toFixed(2)}`;
        checkoutBtn.disabled = total === 0;
    }

    function updateCartStorage() {
        const cart = [];
        document.querySelectorAll('.basket-item').forEach(item => {
            const id = parseInt(item.id.split('-')[2]);
            const quantity = parseInt(item.dataset.quantity);
            cart.push({ id, quantity });
        });
        localStorage.setItem('cart', JSON.stringify(cart));
    }

    async function processOrder(guestInfo = null) {
        const cartItems = document.querySelectorAll('.basket-item');
        const total = parseFloat(cartTotalElement.textContent.replace('$', ''));
        const orderItems = [];

        // Collect order items
        cartItems.forEach(item => {
            const id = parseInt(item.id.split('-')[2]);
            const quantity = parseInt(item.dataset.quantity);
            const bean = coffeeBeans.find(b => b.id === id);
            
            orderItems.push({
                product_id: bean.id,
                quantity: quantity,
                unit_price: bean.price,
                total_price: bean.price * quantity
            });
        });

        try {

            //add new user as guest
            const response_guest = await fetch('/api/add-guest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(guestInfo)
            });

            if (!response_guest.ok) {
                //check if already exists
                if (response_guest.status === 409) {
                    console.log('User already exists');
                } else {
                throw new Error('Guest creation failed');
                }
            }
            const email = encodeURIComponent(guestInfo.email);
            const user_id_response = await fetch(`/api/user-id/${email}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!user_id_response.ok) {
                throw new Error('User ID retrieval failed');
            }

            // Prepare order data
            const userData = await user_id_response.json();
            const orderData = {
                user_id: userData.id,
                total_amount: total,
                items: orderItems,
            };

            // Send order to server
            const response = await fetch('/api/process-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });

            if (!response.ok) {
                throw new Error('Order processing failed');
            }

            // Clear cart and show success message
            localStorage.removeItem('cart');
            cartItemsContainer.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
            cartTotalElement.textContent = '$0.00';
            checkoutBtn.disabled = true;
            
            showSuccessMessage(title='Order processed', message='Thank you for your purchase!').then(() => {
                window.location.href = '/';
            });

        } catch (error) {
            console.error('Error processing order:', error);
            showError('Failed to process order. Please try again.');
        }
    }

    checkoutBtn.addEventListener('click', async () => {
        guestCheckoutForm.style.display = 'flex';
        checkoutBtn.style.display = 'none';
    });

    if (guestCheckoutForm) {
        guestCheckoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const guestInfo = {
                firstName: e.target.firstName.value,
                lastName: e.target.lastName.value,
                email: e.target.email.value,
                phone: e.target.phone.value,
                city: e.target.city.value,
                address: e.target.address.value
            };
            await processOrder(guestInfo);
        });
    }

    continueShoppingBtn.addEventListener('click', () => {
        window.location.href = '/';
    });

    loadCartItems();
});