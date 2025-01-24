function showError(message, formId = 'loginForm') {
    alert(message);
    const errorElement = document.createElement('p');
    errorElement.classList.add('error');
    errorElement.textContent = message;
  
    const form = document.getElementById(formId);
    if (form) {
        form.appendChild(errorElement);
        setTimeout(() => errorElement.remove(), 3000);
    }
}

// Handle login
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('id', data.id);
            localStorage.setItem('role', data.role);
            localStorage.setItem('firstName', data.firstName);
            localStorage.setItem('lastName', data.lastName);
            localStorage.setItem('email', data.email);
            // const idResponse = await fetch(`/api/user-id/${data.email}`, { method: 'GET' });
            // const idData = await idResponse.json();
            // localStorage.setItem('id', idData.id);
            
            // Redirect based on role
            switch (data.role) {
                case 'customer': window.location.href = '/customerDashboard.html'; break;
                case 'employee': window.location.href = '/employeeDashboard.html'; break;
                case 'manager': window.location.href = '/managerDashboard.html'; break;
            }
        } else {
            showError('Login failed', 'loginForm');
        }
    } catch (error) {
        showError('An error occurred. Please try again.', 'loginForm');
    }
});

async function handleRegisterForm(e, role) {
    e.preventDefault();
    
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const phone = document.getElementById('phone')?.value;
    const city = document.getElementById('city')?.value;
    const address = document.getElementById('address')?.value;

    const curr_role = localStorage.getItem('role');
    
    const body = { firstName, lastName, email,phone, password, role };
    if (role !== 'manager') {
        body.city = city;
        body.address = address;
    }
    try {
        const response = await fetch(`/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (curr_role === 'manager') {
                window.location.href = '/managerDashboard.html';
            } else {
            window.location.href = '/login.html';
            }
        } else {
            showError(data.error, `${role}RegisterForm`);
        }
    } catch (error) {
        showError('An error occurred. Please try again.', `${role}RegisterForm`);
    }
}

document.getElementById('customerRegisterForm')?.addEventListener('submit', (e) => handleRegisterForm(e, 'customer'));
document.getElementById('employeeRegisterForm')?.addEventListener('submit', (e) => handleRegisterForm(e, 'employee'));
document.getElementById('managerRegisterForm')?.addEventListener('submit', (e) => handleRegisterForm(e, 'manager'));