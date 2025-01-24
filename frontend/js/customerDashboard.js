document.addEventListener('DOMContentLoaded', async () => {
    // Set the customer's name
    const customerName = localStorage.getItem('firstName');
    document.getElementById('customerName').textContent = customerName;

    // Fetch and display user details
    const id = localStorage.getItem('id');
    try {
        const response = await fetch(`/api/user-details/${id}`, {method: 'GET'});
    
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
    
        const data = await response.json();
        document.getElementById('userFirstName').textContent = data.first_name;
        document.getElementById('userLastName').textContent = data.last_name;
        document.getElementById('userAddress').textContent = data.address;
        document.getElementById('userEmail').textContent = data.email;
        document.getElementById('loyaltyPoints').textContent = data.points;

        const currentPoints = data.points;
        const nextRewardPoints = Math.max(100, Math.ceil(currentPoints / 100) * 100);
        document.getElementById('nextReward').textContent = nextRewardPoints;

        // Calculate and display available discount
        const availableDiscount = Math.floor(currentPoints / 100) * 25;
        document.getElementById('availableDiscount').textContent = availableDiscount;
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
    }
});