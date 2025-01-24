let currentDate = new Date();
let shifts = [];

document.addEventListener('DOMContentLoaded', function() {
    const role = localStorage.getItem('role');
    const managerDashboardLink = document.getElementById('managerDashboardLink');
    const employeeDashboardLink = document.getElementById('employeeDashboardLink');
    const shiftForm = document.getElementById('addShiftForm')

    if (!role) {
        window.location.href = '/login.html';
        return;
    }
    if (role === 'manager') {
        managerDashboardLink.style.display = 'inline';
    }
    else if (role === 'employee') {
        employeeDashboardLink.style.display = 'inline';
    }
    

    // Show add shift form only for managers
    if (role === 'manager') {
        shiftForm.style.display = 'flex';
        shiftForm.classList.add('manager-view');
        loadEmployees();
    }

    // Initialize calendar
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    // Add shift form submission handler
    if (role === 'manager') {
        document.getElementById('shiftForm').addEventListener('submit', handleAddShift);
    }

    // Initial render
    fetchShifts().then(() => renderCalendar());
});

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Update header
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;
    
    // Get first day of month and total days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    // Build calendar body
    const calendarBody = document.getElementById('calendarBody');
    calendarBody.innerHTML = '';
    
    let date = 1;
    for (let i = 0; i < 6; i++) {
        const row = document.createElement('tr');
        
        for (let j = 0; j < 7; j++) {
            const cell = document.createElement('td');
            
            if (i === 0 && j < startingDay) {
                // Add days from previous month
                const prevMonthDays = new Date(year, month, 0).getDate();
                const prevDay = prevMonthDays - (startingDay - j - 1);
                cell.textContent = prevDay;
                cell.classList.add('other-month');
            } else if (date > totalDays) {
                // Add days from next month
                cell.textContent = date - totalDays;
                cell.classList.add('other-month');
                date++;
            } else {
                // Current month days
                if (date <= totalDays) {
                    cell.textContent = date;
                    
                    // Check if it's today
                    const today = new Date();
                    if (date === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                        cell.classList.add('today');
                    }
                    
                    // Add shifts for this day
                    const dayShifts = shifts.filter(shift => {
                        const shiftDate = new Date(shift.start_time);
                        return shiftDate.getDate() === date && 
                               shiftDate.getMonth() === month && 
                               shiftDate.getFullYear() === year;
                    });
                    
                    dayShifts.forEach(shift => {
                        const shiftDiv = document.createElement('div');
                        shiftDiv.classList.add('shift-entry');
                        const startTime = new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const endTime = new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        shiftDiv.innerHTML = `${startTime} - ${endTime} (${shift.employeeName})`;
                        
                        if (localStorage.getItem('role') === 'manager') {
                            const deleteButton = document.createElement('button');
                            deleteButton.innerHTML = '<i class="fas fa-times"></i>';
                            deleteButton.classList.add('delete-button');
                            deleteButton.onclick = (e) => {
                                e.stopPropagation();
                                showDeleteConfirmation('Are you sure?', 'Do you want to delete this shift?',() => deleteShift(shift.id));
                            };
                            shiftDiv.appendChild(deleteButton);
                        }
                        
                        cell.appendChild(shiftDiv);
                    });
                    
                    date++;
                }
            }
            row.appendChild(cell);
        }
        calendarBody.appendChild(row);
    }
}

async function fetchShifts() {
    try {
        const role = localStorage.getItem('role');
        const user_id = localStorage.getItem('id');
        if (role === 'employee') {
            const response = await fetch(`/api/shifts/employee/${user_id}`, { method: 'GET' });
            if (!response.ok) {
                throw new Error('Failed to fetch shifts');
            }
            shifts = await response.json();
        }
        else {
            const response = await fetch(`/api/shifts/manager`, { method: 'GET' });
            if (!response.ok) {
                throw new Error('Failed to fetch shifts');
            }
            shifts = await response.json();
        }
 
        for (let shift of shifts) {
            const employeeResponse = await fetch(`/api/user/${shift.employee_id}`, { method: 'GET' });
            if (employeeResponse.ok) {
                const employee = await employeeResponse.json();
                shift.employeeName = `${employee.first_name} ${employee.last_name}`;
            } else {
                shift.employeeName = 'Unknown';
            }
        }
        renderCalendar();
    } catch (error) {
        console.error('Error fetching shifts:', error);
    }
}

async function loadEmployees() {
    try {
        const response = await fetch(`/api/users/employee`, { method: 'GET'});

        if (!response.ok) {
            throw new Error('Failed to fetch employees');
        }

        const employees = await response.json();
        const select = document.getElementById('employeeSelect');
        
        employees.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id;
            option.textContent = `${employee.first_name} ${employee.last_name}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

async function handleAddShift(e) {
    e.preventDefault();

    const employeeId = document.getElementById('employeeSelect').value;
    const shiftDate = document.getElementById('shiftDate').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;

    // Combine date and time
    const startDateTime = new Date(`${shiftDate}T${startTime}`);
    const endDateTime = new Date(`${shiftDate}T${endTime}`);

    // Show spinner
    const spinner = document.getElementById('spinner');
    spinner.style.display = 'inline-block';

    try {
        const response = await fetch(`/api/shifts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                employeeId,
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString()
            })
        });

        if (!response.ok) {
            throw new Error('Failed to add shift');
        }

        // Refresh shifts and calendar
        await fetchShifts();
        
        // Reset form
        e.target.reset();
        
        showSuccessMessage(title = 'Shift added', message = 'Shift added successfully');

        const employeeResponse = await fetch(`/api/user/${employeeId}`, { method: 'GET' });
        if (!employeeResponse.ok) {
            throw new Error('Failed to fetch employee details');
        }
        const employee = await employeeResponse.json();

        const emailResponse = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: employee.email,
                subject: 'New Shift Assigned',
                text: `Dear ${employee.first_name},\n\nYou have been assigned a new shift on ${shiftDate} from ${startTime} to ${endTime}.`
            })
        });

        if (!emailResponse.ok) {
            throw new Error('Failed to send email');
        }

    } catch (error) {
        console.error('Error adding shift:', error);
        showError(title= 'Failed to add shift', message='Please try again.');
    } finally {
        // Hide spinner
        spinner.style.display = 'none';
    }
}

async function deleteShift(shiftId) {
    try {
        const response = await fetch(`/api/shifts/${shiftId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete shift');
        }

        // Refresh shifts and calendar
        await fetchShifts();
        
        showSuccessMessage(title = 'Shift deleted', message = 'Shift deleted successfully');
    } catch (error) {
        console.error('Error deleting shift:', error);
        showError(title= 'Failed to delete shift', message='Please try again.');
    }
}