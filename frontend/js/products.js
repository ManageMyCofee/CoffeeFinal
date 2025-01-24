document.addEventListener('DOMContentLoaded', () => {
    const basketItems = document.getElementById('basketItems');
    const placeOrderButton = document.getElementById('placeOrderButton');
    const checkoutButton = document.getElementById('checkoutButton');
    const checkoutSpinner = document.getElementById('checkoutSpinner');
    const totalPriceElement = document.createElement('p');
    const basketPrice = document.createElement('p');
    const discount = document.createElement('p');
    const user_id = localStorage.getItem('id');

    discount.id = 'discount';
    basketPrice.id = 'basketPrice';
    totalPriceElement.id = 'totalPrice';

    basketItems.appendChild(basketPrice);
    basketItems.appendChild(discount);
    basketItems.appendChild(totalPriceElement);

    if(!user_id){
        placeOrderButton.style.display = 'none';
        checkoutButton.style.display = 'block';
    } 

    // Sample coffee beans data
    const coffeeBeans = [
        { id: 1, name: 'Arabica', price: 10.99, image: 'arabica.png' },
        { id: 2, name: 'Robusta', price: 8.99, image: 'robusta.png' },
        { id: 3, name: 'Liberica', price: 12.99, image: 'liberica.png' },
        { id: 4, name: 'Excelsa', price: 11.99, image: 'excelsa.png' },
        { id: 5, name: 'Typica', price: 9.99, image: 'typica.png' },
        { id: 6, name: 'Geisha', price: 13.99, image: 'geisha.png' }
    ];

    function getProductNameById(productId) {
        const product = coffeeBeans.find(bean => bean.id === productId);
        return product ? product.name : null;
    }

    // Load cart from localStorage when page loads
    function loadCartFromStorage() {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        cart.forEach(item => {
            displayBasketItem(item.id, item.quantity, false); // false means don't update storage
        });
        updateTotalPrice(user_id);
    }

    // Function to save cart to localStorage
    function saveCartToStorage() {
        const cart = [];
        document.querySelectorAll('.basket-item').forEach(item => {
            const id = parseInt(item.id.split('-')[2]);
            const quantity = parseInt(item.dataset.quantity);
            const bean = coffeeBeans.find(b => b.id === id);
            cart.push({
                id: bean.id,
                name: bean.name,
                price: bean.price,
                image: bean.image,
                quantity: quantity
            });
        });
        localStorage.setItem('cart', JSON.stringify(cart));
    }

    // Function to display basket item
    function displayBasketItem(id, quantity, shouldSave = true) {
        const bean = coffeeBeans.find(b => b.id === id);
        const totalPrice = (bean.price * quantity).toFixed(2);

        // Check if the item already exists in the basket
        const existingItem = document.getElementById(`basket-item-${id}`);
        if (existingItem) {
            const existingQuantity = parseInt(existingItem.dataset.quantity);
            const newQuantity = existingQuantity + quantity;
            const newTotalPrice = (bean.price * newQuantity).toFixed(2);
            existingItem.dataset.quantity = newQuantity;
            existingItem.innerHTML = `
                <p>${bean.name} - $${bean.price.toFixed(2)} x ${newQuantity} = $${newTotalPrice}</p>
                <div class="action-buttons">
                    <button class="edit-button" onclick="editBasketItem(${id})"><i class="fas fa-edit"></i></button>
                    <button class="remove-button" onclick="removeFromBasket(${id})"><i class="fas fa-trash"></i></button>
                </div>
            `;
        } else {
            const basketItem = document.createElement('div');
            basketItem.className = 'basket-item';
            basketItem.id = `basket-item-${id}`;
            basketItem.dataset.quantity = quantity;
            basketItem.innerHTML = `
                <p>${bean.name} - $${bean.price.toFixed(2)} x ${quantity} = $${totalPrice}</p>
                <div class="action-buttons">
                    <button class="edit-button" onclick="editBasketItem(${id})"><i class="fas fa-edit"></i></button>
                    <button class="remove-button" onclick="removeFromBasket(${id})"><i class="fas fa-trash"></i></button>
                </div>
            `;
            basketItems.appendChild(basketItem);
        }
        
        if (shouldSave) {
            saveCartToStorage();
        }
        updateTotalPrice(user_id);
    }

    // Function to add item to basket
    window.addToBasket = function(id) {
        const quantityInput = document.getElementById(`quantity-${id}`);
        const quantity = parseInt(quantityInput.value);
        
        if (quantity < 1) {
            showError('Please select a valid quantity');
            return;
        }

        displayBasketItem(id, quantity);
    }

    // Function to edit item in basket
    window.editBasketItem = function(id) {
        const existingItem = document.getElementById(`basket-item-${id}`);
        const bean = coffeeBeans.find(b => b.id === id);
        const existingQuantity = parseInt(existingItem.dataset.quantity);
        const newQuantity = prompt(`Enter new quantity for ${bean.name}:`, existingQuantity);
        
        if (newQuantity !== null && newQuantity > 0) {
            existingItem.dataset.quantity = newQuantity;
            const newTotalPrice = (bean.price * newQuantity).toFixed(2);
            existingItem.innerHTML = `
                <p>${bean.name} - $${bean.price.toFixed(2)} x ${newQuantity} = $${newTotalPrice}</p>
                <div class="action-buttons">
                    <button class="edit-button" onclick="editBasketItem(${id})"><i class="fas fa-edit"></i></button>
                    <button class="remove-button" onclick="removeFromBasket(${id})"><i class="fas fa-trash"></i></button>
                </div>
            `;
            saveCartToStorage();
            updateTotalPrice(user_id);
        }
    }

    // Function to remove item from basket
    window.removeFromBasket = function(id) {
        const basketItem = document.getElementById(`basket-item-${id}`);
        basketItems.removeChild(basketItem);
        saveCartToStorage();
        updateTotalPrice(user_id);
    }

    // Function to update total price
    async function updateTotalPrice(user_id=null) {
        // Calculate basket subtotal
        let subtotal = 0;
        const basketItems = document.querySelectorAll('.basket-item');
        
        basketItems.forEach(item => {
            const id = parseInt(item.id.split('-')[2]);
            const quantity = parseInt(item.dataset.quantity);
            const bean = coffeeBeans.find(b => b.id === id);
            subtotal += quantity * bean.price;
        });
    
        // Calculate discount in $25 chunks
        const userPoints = await getUserPoints();
        const maxDiscountChunks = Math.floor(userPoints / 100); // Each chunk is $25 for 100 points
        const neededDiscountChunks = Math.floor(subtotal / 25);
        const usedDiscountChunks = Math.min(maxDiscountChunks, neededDiscountChunks);
    
        const maxDiscountAmount = maxDiscountChunks * 25;
        const usedDiscount = usedDiscountChunks * 25;
    
        // Update display elements
        basketPrice.textContent = `Basket Price: $${subtotal.toFixed(2)}`;
        
        if (user_id) {
            discount.textContent = `Available Discount: $${maxDiscountAmount.toFixed(2)} | Using Discount: $${usedDiscount.toFixed(2)}`;
        } else {
            discount.textContent = `With a membership, you could qualify for a discount`;
        }
    
        const finalPrice = Math.max(0, subtotal - usedDiscount);
        totalPriceElement.textContent = `Final Price: $${finalPrice.toFixed(2)}`;
    
        // Points used is simply chunks * 100
        const pointsToUse = usedDiscountChunks * 100;
    
        return {
            finalPrice,
            pointsToUse,
            discountAmount: maxDiscountAmount,
            subtotal
        };
    }

    // Function to calculate points
    function calculatePoints(total) {
        points =  Math.floor(total / 50) * 10;
        if (points < 10) {
            points = 10;
        }
        return points;
    }   

    // Function to update user points
    async function updateUserPoints(points) {
        const response = await fetch(`/api/update-user-points/${user_id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ points })  
        });
        if (!response.ok) {
            showError('Failed to update user points');
        }
    }

    async function getUserPoints() {
        const id = localStorage.getItem('id');
        if (!id) return 0;
    
        try {
            const response = await fetch(`/api/get-user-points/${id}`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) return 0;
            const data = await response.json();
            return data.points;
        } catch (error) {
            console.error('Error fetching user points:', error);
            return 0;
        }
    }

    async function deductUserPoints(pointsToDeduct) {
        const id = localStorage.getItem('id');
        const response = await fetch(`/api/use-points/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ pointsUsed: pointsToDeduct })
        });
        
        if (!response.ok) {
            throw new Error('Failed to deduct points');
        }
        return await response.json();
    }

    // Function to send email
    async function sendEmail(to, subject, text) {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ to, subject, text })
        });

        if (!response.ok) {
            throw new Error('Failed to send email');
        }
    }

    // Function to handle checkout
    async function handleCheckout() {
        try {
            const user_email = localStorage.getItem('email');
            const user_id = localStorage.getItem('id');
            checkoutSpinner.style.display = 'inline-block'; // Show spinner
            if (placeOrderButton) placeOrderButton.disabled = true; // Disable button
            if (checkoutButton) checkoutButton.disabled = true; // Disable button

            const basketItems = document.querySelectorAll('.basket-item');
            if (basketItems.length === 0) {
                showWarning(title='Your basket is empty', message='Please add items to your basket before checking out.');
                return;
            }
            if (!user_id) {
                window.location.href = '/cart.html';
                return;
            }
            // Get the final total and points information
            const { finalPrice, pointsToUse, discountAmount, subtotal } = await updateTotalPrice(user_id);
            const newPoints = calculatePoints(finalPrice);

            const orderItems = [];
            basketItems.forEach(item => {
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
                const orderData = {
                    user_id:user_id,
                    total_amount: finalPrice,
                    items: orderItems
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
            } catch (error) {
                console.error('Error processing order:', error);
                showError('Failed to process order. Please try again.');
            }
            await updateUserPoints(newPoints);

            let message = `Order placed successfully! Earned ${calculatePoints(finalPrice)} new points!`;

            if (pointsToUse > 0){
                await deductUserPoints(pointsToUse);
                message = `Order placed successfully! Used ${pointsToUse} points for a discount.`;
            }
    
            // Send order details email
            const orderDetails = orderItems.map(item => {
                const productName = getProductNameById(item.product_id);
                return `${item.quantity} x ${productName} - $${item.unit_price.toFixed(2)} each`;
            }).join(' | ');
            const emailText = `Thank you for your order!<p>Order Details:</p><p>${orderDetails}</p><p>Total: $${finalPrice.toFixed(2)}</p>`;
            await sendEmail(user_email, 'Your Order Details', emailText);

            // Check if user reached a milestone
            const userPoints = await getUserPoints();
            if (userPoints % 100 === 0) {
                const milestoneEmailText = `Congratulations! You have reached ${userPoints} points. Thank you for being a loyal customer.`;
                await sendEmail(user_email, 'Milestone Reached!', milestoneEmailText);
            }
    
            localStorage.removeItem('cart');
            basketItems.innerHTML = '';
            
            basketPrice.textContent = 'Basket Price: $0.00';
            discount.textContent = 'Available Discount: $0.00 (0 points)';
            totalPriceElement.textContent = 'Final Price: $0.00';
            
                
            showSuccessMessage(title='Order Placed', message=message).then(() => {
                window.location.href = '/';
            });
        } catch (error) {
            console.error('Checkout error:', error);
            showError('Failed to process order. Please try again.');
        } finally {
            checkoutSpinner.style.display = 'none'; // Hide spinner
            if (placeOrderButton) placeOrderButton.disabled = false; // Enable button
            if (checkoutButton) checkoutButton.disabled = false; // Enable button
        }
    }

    // Add event listeners for both buttons
    if (placeOrderButton) {
        placeOrderButton.addEventListener('click', handleCheckout);
    }
    if (checkoutButton) {
        checkoutButton.addEventListener('click', handleCheckout);
    }

    // Load cart when page loads
    loadCartFromStorage();
});