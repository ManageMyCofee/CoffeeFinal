document.addEventListener('DOMContentLoaded', () => {
    const managerEmailSelect = document.getElementById('managerEmail');

    // Fetch managers from the database
    fetch('/api/email-managers')
        .then(response => response.json())
        .then(data => {
            data.managers.forEach(manager => {
                const option = document.createElement('option');
                option.value = manager.email;
                option.textContent = manager.email;
                managerEmailSelect.appendChild(option);
            });
        })
        .catch(error => console.error('Error fetching managers:', error));

    // Handle form submission
    document.getElementById('reportDamageForm').addEventListener('submit', async(event) => {
        event.preventDefault();

        const submitButton = document.querySelector('button[type="submit"]');
        const spinner = document.getElementById('spinner');
        submitButton.disabled = true;
        spinner.style.display = 'inline-block';
        const workerFirstName = localStorage.getItem('firstName');
        const workerLastName = localStorage.getItem('lastName');
        const workerName = `${workerFirstName} ${workerLastName}`;

        const reportData = {
            subject: document.getElementById('subject').value,
            reportText: document.getElementById('reportText').value,
            managerEmail: document.getElementById('managerEmail').value
        };
        const mailData = {
            to: reportData.managerEmail,
            subject: reportData.subject,
            text: `<p>Dear Manager,</p><p>${workerName} has reported a damage with the following details:</p><p>${reportData.reportText}</p>`,
        };
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(mailData)
        });

        submitButton.disabled = false;
        spinner.style.display = 'none';
        
        if (response.ok) {
            showSuccessMessage(title='Email sent successfully', text='The manager has been notified of the damage').then(() => {
                document.getElementById('reportDamageForm').reset();
                window.location.href = '/employeeDashboard.html';
            });
        }
        else {
            showError(title='Error sending Email', text='There was an error sending the Email');
        }
    });
});