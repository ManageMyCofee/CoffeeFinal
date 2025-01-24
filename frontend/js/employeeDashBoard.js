async function fetchEmployeeShifts() {
    try {
        const employeeId = localStorage.getItem('id');
        const response = await fetch(`/api/shifts/employee/${employeeId}`);
        const shifts = await response.json();
        return shifts;
    } catch (error) {
        console.error('Error fetching shifts:', error);
        return [];
    }
}

function calculateShiftDuration(start, end) {
    const startTime = new Date(start);
    const endTime = new Date(end);
    return (endTime - startTime) / (1000 * 60 * 60); // Convert to hours
}
function calculateShiftMetrics(shifts) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Initialize metrics objects
    const monthlyMetrics = {
        totalShifts: 0,
        totalHours: 0,
        averageShiftLength: 0,
        earnings: 0,
        top3LongestShifts: []
    };

    const yearlyMetrics = {
        totalShifts: 0,
        totalHours: 0,
        averageShiftLength: 0,
        monthlyBreakdown: Array(12).fill(0),
        earnings: 0
    };

    shifts.forEach(shift => {
        const shiftDate = new Date(shift.start_time);
        const shiftMonth = shiftDate.getMonth();
        const shiftYear = shiftDate.getFullYear();
        const hours = calculateShiftDuration(shift.start_time, shift.end_time);

        if (shiftMonth === currentMonth && shiftYear === currentYear) {
            monthlyMetrics.totalShifts++;
            monthlyMetrics.totalHours += hours;
            monthlyMetrics.earnings += hours * 40;

            monthlyMetrics.top3LongestShifts.push({ start: shift.start_time, end: shift.end_time, duration: hours });
            monthlyMetrics.top3LongestShifts.sort((a, b) => b.duration - a.duration);
            if (monthlyMetrics.top3LongestShifts.length > 3) {
                monthlyMetrics.top3LongestShifts.pop();
            }
        }

        if (shiftYear === currentYear) {
            yearlyMetrics.totalShifts++;
            yearlyMetrics.totalHours += hours;
            yearlyMetrics.monthlyBreakdown[shiftMonth]++;
            yearlyMetrics.earnings += hours * 40;
        }
    });

    // Calculate averages
    monthlyMetrics.averageShiftLength = monthlyMetrics.totalHours / monthlyMetrics.totalShifts || 0;
    yearlyMetrics.averageShiftLength = yearlyMetrics.totalHours / yearlyMetrics.totalShifts || 0;

    return { monthlyMetrics, yearlyMetrics };
}

function displayShiftMetrics(monthlyMetrics, yearlyMetrics) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = monthNames[new Date().getMonth()];

    const metricsHTML = `
        <div class="metrics-container">
            <div class="metrics-section monthly-metrics">
                <h3>${currentMonth} Metrics</h3>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <h4>Total Shifts</h4>
                        <p>${monthlyMetrics.totalShifts}</p>
                    </div>
                    <div class="metric-card">
                        <h4>Total Hours</h4>
                        <p>${monthlyMetrics.totalHours.toFixed(1)}</p>
                    </div>
                    <div class="metric-card">
                        <h4>Average Shift Length</h4>
                        <p>${monthlyMetrics.averageShiftLength.toFixed(1)} hours</p>
                    </div>
                    <div class="metric-card">
                        <h4>Estimated Earnings</h4>
                        <p>₪${monthlyMetrics.earnings.toFixed(2)}</p>
                    </div>
                </div>
                <div class="metric-card-list">
                    <h4>Top 3 Longest Shifts</h4>
                    <ul>
                        ${monthlyMetrics.top3LongestShifts.map(shift => `
                            <li>${new Date(shift.start).toLocaleDateString()} - (${shift.duration.toFixed(1)} hours)</li>
                        `).join('')}
                    </ul>
                </div>
            </div>

            <div class="metrics-section yearly-metrics">
                <h3>${new Date().getFullYear()} Year-to-Date Metrics</h3>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <h4>Total Shifts</h4>
                        <p>${yearlyMetrics.totalShifts}</p>
                    </div>
                    <div class="metric-card">
                        <h4>Total Hours</h4>
                        <p>${yearlyMetrics.totalHours.toFixed(1)}</p>
                    </div>
                    <div class="metric-card">
                        <h4>Average Shift Length</h4>
                        <p>${yearlyMetrics.averageShiftLength.toFixed(1)} hours</p>
                    </div>
                    <div class="metric-card">
                        <h4>Yearly Earnings</h4>
                        <p>₪${yearlyMetrics.earnings.toFixed(2)}</p>
                    </div>
                </div>
                <div class="monthly-breakdown">
                    <h4>Monthly Breakdown</h4>
                    <div class="breakdown-chart">
                        ${yearlyMetrics.monthlyBreakdown.map((count, index) => `
                            <div class="chart-bar" style="height: ${(count / Math.max(...yearlyMetrics.monthlyBreakdown) * 100) || 0}%">
                                <span class="bar-label">${count}</span>
                                <span class="month-label">${monthNames[index].substr(0, 3)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('shiftsMetrics').innerHTML = metricsHTML;
}



document.addEventListener('DOMContentLoaded', async () => {
    // Set the employee's name
    const employeeName = localStorage.getItem('firstName');
    document.querySelector('h2').textContent = `Welcome, ${employeeName}`;


    // Navigate to new HTML pages
    const manageInventoryCard = document.getElementById('manageInventoryCard');
    const shiftsCard = document.getElementById('shiftsCard');
    const reportDamageCard = document.getElementById('reportDamageCard');

    manageInventoryCard.addEventListener('click', () => {
        window.location.href = '/inventory.html';
    });

    shiftsCard.addEventListener('click', () => {
        window.location.href = '/shifts.html';
    });

    reportDamageCard.addEventListener('click', () => {
        window.location.href = '/reportDamage.html';
    });

    const shifts = await fetchEmployeeShifts();
    const metrics = calculateShiftMetrics(shifts);
    displayShiftMetrics(metrics.monthlyMetrics, metrics.yearlyMetrics);
});