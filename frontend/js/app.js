document.addEventListener('DOMContentLoaded', () => {
    const role = localStorage.getItem('role');
    
    // Update navigation based on authentication and role
    const loginLink = document.getElementById('loginLink');
    const registerLink = document.getElementById('registerLink');
    const logoutLink = document.getElementById('logoutLink');

    const managerDashboardLink = document.getElementById('managerDashboardLink');
    const employeeDashboardLink = document.getElementById('employeeDashboardLink');
    const profileLink = document.getElementById('profileLink');
    const cartLink = document.getElementById('cartLink');

    if (role) {
        loginLink.style.display = 'none';
        registerLink.style.display = 'none';
        logoutLink.style.display = 'inline';
        cartLink.style.display = 'none';
        
        if (role === 'manager') {
            managerDashboardLink.style.display = 'inline';
        } else if (role === 'employee') {
            employeeDashboardLink.style.display = 'inline';
        }
        else if (role === 'customer') {
            profileLink.style.display = 'inline';
    } else {
        loginLink.style.display = 'inline';
        registerLink.style.display = 'inline';
        logoutLink.style.display = 'none';
        managerDashboardLink.style.display = 'none';
        employeeDashboardLink.style.display = 'none';
        profileLink.style.display = 'none';
    }
    }
});

// Utility functions
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}
