let inventoryItems = [];
let isViewOnly = false;  // Set this to true for employees who can only view inventory

async function loadInventory() {
    try {
        const response = await fetch(`/api/inventory`, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            showError('Error loading inventory');
        }

        inventoryItems = await response.json();
        renderInventory();
    } catch (error) {
        showError('Error loading inventory');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
    // Reset any form inside the modal
    const form = modal.querySelector('form');
    if (form) {
        form.reset();
    }
}

async function getItemById(itemId) {
    try {
        const response = await fetch(`/api/inventory/${itemId}`, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            showError('Error fetching item details');
            return null;
        }

        return await response.json();
    } catch (error) {
        showError('Error fetching item details');
        return null;
    }
}

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

function renderInventory() {
    const inventoryList = document.getElementById('inventoryList').querySelector('tbody');
    inventoryList.innerHTML = inventoryItems.map(item => `
        <tr>
            <td>${item.item_name}</td>
            <td>${item.quantity}</td>
            <td>$${item.unit_price}</td>
            <td>
                ${!isViewOnly ? `
                <div class="action-buttons">
                    <button class="edit-button" onclick="editItem('${item.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="remove-button" onclick="deleteItem('${item.id}')" ${isViewOnly ? 'style="display:none;"' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                ` : `
                <div class="action-buttons">
                    <button class="edit-button" onclick="editItem('${item.id}', true)">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
                `}
            </td>
        </tr>
    `).join('');
}

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const role = localStorage.getItem('role');

    const addItemBtn = document.getElementById('addItemBtn');
    const addItemForm = document.getElementById('addItemForm');
    const saveItemBtn = document.getElementById('saveItemBtn');
    const editItemForm = document.getElementById('editItemForm');
    const updateItemBtn = document.getElementById('updateItemBtn');
    const logoutLink = document.getElementById('logoutLink');  
    const employeeDashboardLink = document.getElementById('employeeDashboardLink');
    const managerDashboardLink = document.getElementById('managerDashboardLink');

    if (role) {
        if (role === 'manager') {
            managerDashboardLink.style.display = 'inline';
        } else if (role === 'employee') {
            employeeDashboardLink.style.display = 'inline';
            isViewOnly = true;
            addItemBtn.style.display = 'none';
        }
    } else {
        window.location.href = '/';
    }

    // Toggle Add Item Form
    addItemBtn.addEventListener('click', () => {
        document.getElementById('addItemForm').classList.add('show');
    });

    // Save New Item
    saveItemBtn.addEventListener('click', async () => {
        const itemName = document.getElementById('itemName').value;
        const itemQuantity = document.getElementById('itemQuantity').value;
        const itemPrice = document.getElementById('itemPrice').value;
        const itemMinQuantity = document.getElementById('itemMinQuantity').value;
        
        try {
            const response = await fetch(`/api/inventory`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    item_name: itemName,
                    quantity: itemQuantity,
                    minimum_quantity: itemMinQuantity,
                    unit_price: itemPrice
                })
            });
            
            if (response.ok) {
                const newItem = await response.json();
                inventoryItems.push(newItem);
                renderInventory();
                
                // Reset the form
                document.getElementById('itemName').value = '';
                document.getElementById('itemQuantity').value = '';
                document.getElementById('itemPrice').value = '';
                document.getElementById('itemMinQuantity').value = '';
                
                // Close modal using the existing function
                closeModal('addItemForm');
            } else {
                if (response.status === 409) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Item Already Exists',
                        text: 'The item you are trying to add already exists in the inventory.',
                    });
                }
            }
        } catch (error) {
            showError('Error adding item');
        }
    });

    // Update Existing Item
    updateItemBtn.addEventListener('click', async () => {
        const itemId = updateItemBtn.dataset.itemId;
        const itemName = document.getElementById('editItemName').value;
        const itemQuantity = document.getElementById('editItemQuantity').value;
        const itemPrice = document.getElementById('editItemPrice').value;
        const itemMinQuantity = document.getElementById('editItemMinQuantity').value;
        try {
            const response = await fetch(`/api/inventory/${itemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    item_name: itemName,
                    quantity: itemQuantity,
                    minimum_quantity: itemMinQuantity,
                    unit_price: itemPrice
                })
            });
            if (response.ok) {
                const updatedItem = await response.json();
                const index = inventoryItems.findIndex(item => item.id === parseInt(itemId));
                if (index !== -1) {
                    inventoryItems[index] = updatedItem;
                    renderInventory();
                    editItemForm.style.display = 'none';

                    if (updatedItem.quantity < updatedItem.minimum_quantity) {
                        const managerEmail = 'manager@gmail.com'; 
                        const subject = `Inventory Alert: ${updatedItem.item_name}`;
                        const text = `The inventory for ${updatedItem.item_name} is below 10 units. Current quantity: ${updatedItem.quantity}.`;
                        await sendEmail(managerEmail, subject, text);
                    }
                    closeModal('editItemForm');
                }
            } else {
                showError('Error updating item');
            }
        } catch (error) {
            showError('Error updating item');
        }
    });

    // Load the inventory on page load
    loadInventory();
});

// Edit Item
async function editItem(itemId, isEmployee = false) {
    const item = await getItemById(itemId);
    console.log(item);
    if (item) {
        document.getElementById('editItemName').value = item.item_name;
        document.getElementById('editItemQuantity').value = item.quantity;
        document.getElementById('editItemPrice').value = item.unit_price;
        document.getElementById('editItemMinQuantity').value = item.minimum_quantity;
        document.getElementById('editItemForm').classList.add('show');
        document.getElementById('updateItemBtn').dataset.itemId = itemId;

        if (isEmployee) {
            document.getElementById('editItemName').disabled = true;
            document.getElementById('editItemPrice').disabled = true;
            document.getElementById('editItemMinQuantity').disabled = true;
        } else {
            document.getElementById('editItemName').disabled = false;
            document.getElementById('editItemPrice').disabled = false;
            document.getElementById('editItemMinQuantity').disabled = false;
        }
    }
}

// Delete Item
async function deleteItem(itemId) {
    try {
        const response = await fetch(`/api/inventory/${itemId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.ok) {  
            const index = inventoryItems.findIndex(item => item.id === itemId);
            if (index !== -1) {
                inventoryItems.splice(index, 1);
            }
            renderInventory();
        } else {
            showError('Error deleting item');
        }
    } catch (error) {
        showError('Error deleting item');
    }
    loadInventory();
}