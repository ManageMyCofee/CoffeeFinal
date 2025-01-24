async function fetchSalesData() {
    try {
        const response = await fetch('/api/orders');
        const orders = await response.json();
        return orders;
    } catch (error) {
        console.error('Error fetching sales data:', error);
        return [];
    }
}

function calculateSalesMetrics(orders) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Initialize metrics objects
    const monthlyMetrics = {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        bestSellingProducts: {},
        dailyRevenue: {},
        totalItems: 0
    };

    const yearlyMetrics = {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        monthlyRevenue: Array(12).fill(0),
        monthlyOrders: Array(12).fill(0),
        bestSellingProducts: {},
        totalItems: 0
    };

    orders.forEach(order => {
        const orderDate = new Date(order.order_date);
        const orderMonth = orderDate.getMonth();
        const orderYear = orderDate.getFullYear();
        const orderDay = orderDate.getDate();

        // Track best-selling products
        if (!monthlyMetrics.bestSellingProducts[order.product_name]) {
            monthlyMetrics.bestSellingProducts[order.product_name] = 0;
        }
        if (!yearlyMetrics.bestSellingProducts[order.product_name]) {
            yearlyMetrics.bestSellingProducts[order.product_name] = 0;
        }

        // Monthly metrics
        const totalPrice = parseFloat(order.total_price);
        if (orderMonth === currentMonth && orderYear === currentYear) {
            monthlyMetrics.totalOrders++;
            monthlyMetrics.totalRevenue += totalPrice;
            monthlyMetrics.totalItems += order.quantity;
            monthlyMetrics.bestSellingProducts[order.product_name] += order.quantity;

            // Track daily revenue
            const dayKey = orderDay.toString();
            monthlyMetrics.dailyRevenue[dayKey] = (monthlyMetrics.dailyRevenue[dayKey] || 0) + totalPrice;
        }

        // Yearly metrics
        if (orderYear === currentYear) {
            yearlyMetrics.totalOrders++;
            yearlyMetrics.totalRevenue += totalPrice;
            yearlyMetrics.monthlyRevenue[orderMonth] += totalPrice;
            yearlyMetrics.monthlyOrders[orderMonth]++;
            yearlyMetrics.bestSellingProducts[order.product_name] += order.quantity;
            yearlyMetrics.totalItems += order.quantity;
        }
    });

    // Calculate averages
    monthlyMetrics.averageOrderValue = monthlyMetrics.totalRevenue / monthlyMetrics.totalOrders || 0;
    yearlyMetrics.averageOrderValue = yearlyMetrics.totalRevenue / yearlyMetrics.totalOrders || 0;

    // Sort best-selling products
    monthlyMetrics.bestSellingProducts = Object.entries(monthlyMetrics.bestSellingProducts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    yearlyMetrics.bestSellingProducts = Object.entries(yearlyMetrics.bestSellingProducts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);


    return { monthlyMetrics, yearlyMetrics };
}

function displaySalesMetrics(monthlyMetrics, yearlyMetrics) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = monthNames[new Date().getMonth()];

    const metricsHTML = `
        <div class="metrics-container">
            <div class="metrics-section monthly-metrics">
                <h3>${currentMonth} Sales Metrics</h3>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <h4>Total Orders</h4>
                        <p>${monthlyMetrics.totalOrders}</p>
                    </div>
                    <div class="metric-card">
                        <h4>Total Revenue</h4>
                        <p>₪${monthlyMetrics.totalRevenue.toFixed(2)}</p>
                    </div>
                    <div class="metric-card">
                        <h4>Average Order Value</h4>
                        <p>₪${monthlyMetrics.averageOrderValue.toFixed(2)}</p>
                    </div>
                    <div class="metric-card">
                        <h4>Total Items Sold</h4>
                        <p>${monthlyMetrics.totalItems}</p>
                    </div>
                </div>
                <div class="metric-card-list">
                    <h4>Top 3 Selling Products</h4>
                    <ul>
                        ${monthlyMetrics.bestSellingProducts.map(([product, quantity]) => `
                            <li>${product}: ${quantity} units</li>
                        `).join('')}
                    </ul>
                </div>
            </div>

            <div class="metrics-section yearly-metrics">
                <h3>${new Date().getFullYear()} Year-to-Date Metrics</h3>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <h4>Total Orders</h4>
                        <p>${yearlyMetrics.totalOrders}</p>
                    </div>
                    <div class="metric-card">
                        <h4>Total Revenue</h4>
                        <p>₪${yearlyMetrics.totalRevenue.toFixed(2)}</p>
                    </div>
                    <div class="metric-card">
                        <h4>Average Order Value</h4>
                        <p>₪${yearlyMetrics.averageOrderValue.toFixed(2)}</p>
                    </div>
                    <div class="metric-card">
                        <h4>Total Items Sold</h4> <!-- Add this section -->
                        <p>${yearlyMetrics.totalItems}</p>
                    </div>
                </div>
                <div class="monthly-breakdown">
                    <h4>Monthly Revenue Breakdown</h4>
                    <div class="breakdown-chart">
                        ${yearlyMetrics.monthlyRevenue.map((revenue, index) => `
                            <div class="chart-bar" style="height: ${(revenue / Math.max(...yearlyMetrics.monthlyRevenue) * 100) || 0}%">
                                <span class="bar-label">₪${revenue.toFixed(0)}</span>
                                <span class="month-label">${monthNames[index].substr(0, 3)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('salesMetrics').innerHTML = metricsHTML;
}


document.addEventListener('DOMContentLoaded', async() => {
    const orders = await fetchSalesData();
    const metrics = calculateSalesMetrics(orders);
    displaySalesMetrics(metrics.monthlyMetrics, metrics.yearlyMetrics);
    const employeeName = localStorage.getItem('firstName');
    document.querySelector('h2').textContent = `Welcome, ${employeeName}`;
    // Logout functionality
    const logoutLink = document.getElementById('logoutLink');
    logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        showShortSuccess('Logged out successfully');
    });

    // Navigate to new HTML pages
    const manageInventoryCard = document.getElementById('manageInventoryCard');
    const manageShiftCard = document.getElementById('shiftsManagementCard');
    const addEmployeeCard = document.getElementById('addEmployeeCard');

    manageInventoryCard.addEventListener('click', () => {
        window.location.href = '/inventory.html';
    });

    addEmployeeCard.addEventListener('click', () => {
        window.location.href = '/employeeRegister.html';
    });

    manageShiftCard.addEventListener('click', () => {
        window.location.href = '/shifts.html';
    });


});