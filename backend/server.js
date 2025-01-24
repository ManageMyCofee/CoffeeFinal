const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('../frontend')); 


// Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true // Allow multiple SQL statements
});

function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db.connect((err) => {
            if (err) {
                console.error('Error connecting to the database:', err);
                return reject(err);
            }
            db.query('SHOW DATABASES LIKE "coffee_shop"', (err, results) => {
                if (err) {
                    console.error('Error checking for database existence:', err);
                    return reject(err);
                }

                if (results.length === 0) {
                    const schemaPath = path.join(__dirname, 'schema.sql');
                    const schema = fs.readFileSync(schemaPath, 'utf-8');

                    db.query(schema, (err) => {
                        if (err) {
                            console.error('Error executing schema:', err);
                            return reject(err);
                        }
                        db.changeUser({database : 'coffee_shop'}, (err) => {
                            if (err) {
                                console.error('Error selecting database:', err);
                                return reject(err);
                            }
                            resolve();
                        });
                    });
                } else {
                    console.log('Database already exists.');
                    db.changeUser({database : 'coffee_shop'}, (err) => {
                        if (err) {
                            console.error('Error selecting database:', err);
                            return reject(err);
                        }
                        resolve();
                    });
                }
            });
        });
    });
}

app.post('/api/send-email', async (req, res) => {
    const { to, subject, text } = req.body;
    const mailOptions = {
        from: "onboarding@resend.dev",
        to: process.env.RESEND_PERSONAL_EMAIL,
        subject: subject,
        html: `<p>${text}</p><p>Best regards,</p><p><strong>Coffee Shop Team</strong></p>`
      };
      try {
        const response = await resend.emails.send(mailOptions);
        res.status(200).json({ message: 'Email sent successfully' });
        } catch (error) {
        res.status(500).json({ error: 'Failed to send email' });
        }
});app.post('/api/register', async (req, res) => {
    const { firstName, lastName, email, password, phone, city, address, role } = req.body;
    
    if (!['customer', 'employee', 'manager'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Special handling for customer registration
        if (role === 'customer') {
            // First check if email exists as guest
            const checkGuest = () => {
                return new Promise((resolve, reject) => {
                    db.query('SELECT * FROM users WHERE email = ? AND role = "guest"', [email], 
                        (err, results) => {
                            if (err) reject(err);
                            else resolve(results);
                        });
                });
            };

            const updateGuest = () => {
                return new Promise((resolve, reject) => {
                    const updateQuery = `
                        UPDATE users 
                        SET first_name = ?, 
                            last_name = ?, 
                            password = ?,
                            phone = ?,
                            city = ?,
                            address = ?,
                            role = 'customer'
                        WHERE email = ? AND role = "guest"`;

                    db.query(updateQuery, 
                        [firstName, lastName, hashedPassword, phone, city, address, email], 
                        (err, result) => {
                            if (err) reject(err);
                            else resolve(result);
                        });
                });
            };

            try {
                const guestResults = await checkGuest();
                
                if (guestResults.length > 0) {
                    await updateGuest();
                    return res.status(200).json({ 
                        message: 'Guest account upgraded to customer successfully' 
                    });
                }
            } catch (err) {
                console.error('Error during guest check/update:', err);
                return res.status(500).json({ error: 'Error during registration' });
            }
        }

        // Regular registration for all roles (including new customers)
        let query;
        let params = [firstName, lastName, email, hashedPassword];

        if (role === 'customer' || role === 'employee') {
            query = `INSERT INTO users (first_name, last_name, email, password, phone, city, address, role) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
            params.push(phone, city, address, role);
        } else if (role === 'manager') {
            query = `INSERT INTO users (first_name, last_name, email, password, phone, role) 
                     VALUES (?, ?, ?, ?, ?, ?)`;
            params.push(phone, role);
        }

        db.query(query, params, (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ error: 'Email already exists' });
                }
                console.error('Error registering user:', err);
                return res.status(500).json({ error: 'Error registering user' });
            }
            res.status(201).json({ message: 'User registered successfully' });
        });

    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ error: 'Error during registration' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], async (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = results[0];
        //if user is guest then return error
        if (user.role === 'guest') {
            return res.status(401).json({ error: 'Please Register As Customer' });
        }
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json({
            id: user.id,
            role: user.role,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email
        });
    });
});


app.get('/api/users/:role', (req, res) => {
    const { role } = req.params;
    const query = 'SELECT id, first_name, last_name FROM users WHERE role = ?';
    
    db.query(query, [role], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Error fetching users' });
            return;
        }
        res.json(results);
    });
});

//add new user as guest
app.post('/api/add-guest', async (req, res) => {
    const { firstName, lastName, email, phone,city, address } = req.body;
    try {
        const query = `INSERT INTO users (first_name, last_name, email, phone, city, address, role) VALUES (?, ?, ?, ?, ?, ?, 'guest')`;
        db.query(query, [firstName, lastName, email, phone, city,address], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    res.status(409).json({ error: 'Email already exists' });
                } else {
                    console.error('Error registering user:', err);
                    res.status(500).json({ error: 'Error registering user' });
                }
                return;
            }
            res.status(201).json({ message: 'User registered successfully' });
        });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ error: 'Error during registration' });
    }
});

//get all managers
app.get('/api/email-managers', (req, res) => {
    const query = 'SELECT email FROM users WHERE role = "manager"';
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Error fetching managers' });
            return;
        }
        res.json({ managers: results });
    });
});

//get user-id by email
app.get('/api/user-id/:userEmail', async (req, res) => {
    const query = 'SELECT id FROM users WHERE email = ?';
    db.query(query, [req.params.userEmail], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Error fetching user ID' });
            return;
        }
        if (results.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json(results[0]);
    });
});

//get user by id
app.get('/api/user/:userId', (req, res) => {
    const query = 'SELECT * FROM users WHERE id = ?';
    db.query(query, [req.params.userId], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Error fetching user' });
            return;
        }
        res.json(results[0]);
    });
});

// Customer Management Routes
app.post('/api/process-order', async (req, res) => {
    const { user_id, total_amount, items } = req.body;
    let userId = user_id;
    try {
        
        // Insert into orders table
        const [orderResult] = await db.promise().query(
            'INSERT INTO orders (user_id, total_amount) VALUES (?, ?)',
            [userId, total_amount]
        );
        
        const orderId = orderResult.insertId;

        // Insert order items
        for (const item of items) {
            await db.promise().query(
                'INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
                [orderId, item.product_id, item.quantity, item.unit_price, item.total_price]
            );
        }

        // Commit transaction
        await db.promise().commit();

        res.status(201).json({ 
            message: 'Order processed successfully',
            orderId: orderId
        });

    } catch (error) {
        // Rollback transaction on error
        await db.promise().rollback();
        console.error('Error processing order:', error);
        res.status(500).json({ error: 'Failed to process order' });
    }
});

app.get('/api/orders', async (req, res) => {
    try {
        const [orders] = await db.promise().query(
            `SELECT o.*, oi.quantity, oi.unit_price, oi.total_price, p.name as product_name 
             FROM orders o 
             JOIN order_items oi ON o.id = oi.order_id 
             JOIN products p ON oi.product_id = p.id 
             ORDER BY o.order_date DESC`
        );
        
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Fetch user details
app.get('/api/user-details/:id', (req, res) => {
    const userId = req.params.id; 
    const query = 'SELECT first_name, last_name, address, email, points FROM users WHERE id = ?';
    db.query(query, [userId], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Error fetching user details' });
            return;
        }
        if (results.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json(results[0]);
    });
});

app.post('/api/update-user-points/:id', (req, res) => {
    const userId = req.params.id; 
    const { points } = req.body;
    if (!points || isNaN(points)) {
        return res.status(400).json({ error: 'Invalid points value' });
    }

    const query = 'UPDATE users SET points = points + ? WHERE id = ?';
    db.query(query, [points, userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error updating user points' });
        }
        res.json({ message: 'User points updated successfully' });
    });
});

app.get('/api/get-user-points/:id', (req, res) => {
    const userId = req.params.id;
    const query = 'SELECT points FROM users WHERE id = ?';
    
    db.query(query, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching user points' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ points: results[0].points });
    });
});

app.post('/api/use-points/:id', (req, res) => {
    const userId = req.params.id;
    const { pointsUsed } = req.body;
    
    if (!pointsUsed || isNaN(pointsUsed)) {
        return res.status(400).json({ error: 'Invalid points value' });
    }

    const query = 'UPDATE users SET points = points - ? WHERE id = ? AND points >= ?';
    
    db.query(query, [pointsUsed, userId, pointsUsed], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error updating user points' });
        }
        if (results.affectedRows === 0) {
            return res.status(400).json({ error: 'Insufficient points' });
        }
        res.json({ message: 'Points deducted successfully' });
    });
});

// Inventory Management Routes
app.get('/api/inventory', (req, res) => {
    const query = 'SELECT * FROM inventory';
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Error fetching inventory' });
            return;
        }
        res.json(results);
    });
});

// get item by id
app.get('/api/inventory/:itemId', (req, res) => {
    const query = 'SELECT * FROM inventory WHERE id = ?';
    db.query(query, [req.params.itemId], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Error fetching item' });
            return;
        }
        res.json(results[0]);
    });
});

app.post('/api/inventory', (req, res) => {
    const { item_name, quantity, minimum_quantity, unit_price} = req.body;

    const query = 'INSERT INTO inventory (item_name, quantity, minimum_quantity, unit_price) VALUES (?, ?, ?, ?)';
    db.query(query, [item_name, quantity, minimum_quantity, unit_price], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                res.status(409).json({ error: 'Item Already Exists' });
                return;
            }
            res.status(500).json({ error: 'Error adding item' });
            return;
        }
        res.status(201).json({ id: result.insertId, item_name, quantity, minimum_quantity, unit_price });
    });
});

//update item by id
app.put('/api/inventory/:itemId', (req, res) => {
    const { item_name, quantity, minimum_quantity, unit_price } = req.body;
    const query = 'UPDATE inventory SET item_name = ?, quantity = ?, minimum_quantity = ?, unit_price = ? WHERE id = ?';
    db.query(query, [item_name, quantity, minimum_quantity, unit_price, req.params.itemId], (err) => {
        if (err) {
            res.status(500).json({ error: 'Error updating item' });
            return;
        }
        // After successful update, fetch and return the updated item
        const selectQuery = 'SELECT * FROM inventory WHERE id = ?';
        db.query(selectQuery, [req.params.itemId], (err, results) => {
            if (err) {
                res.status(500).json({ error: 'Error fetching updated item' });
                return;
            }
            res.json(results[0]);
        });
    });
});

//delete item by id
app.delete('/api/inventory/:itemId', (req, res) => {
    const query = 'DELETE FROM inventory WHERE id = ?';
    db.query(query, [req.params.itemId], (err) => {
        if (err) {
            res.status(500).json({ error: 'Error deleting item' });
            return;
        }
        res.json({ message: 'Item deleted successfully' });
    });
});


app.get('/api/shifts/manager', (req, res) => {
    let query = 'SELECT * FROM shifts';
    db.query(query, [], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Error fetching shifts' });
            return;
        }
        res.json(results);
    });
});

app.get('/api/shifts/employee/:employeeId', (req, res) => {
    let query = 'SELECT * FROM shifts WHERE employee_id = ?';
    let params = [req.params.employeeId];

    db.query(query, params, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Error fetching shifts' });
            return;
        }
        res.json(results);
    });
});
// Add a new shift
app.post('/api/shifts', (req, res) => {
    const { employeeId, startTime, endTime } = req.body;

    // Validate input data
    if (!employeeId || !startTime || !endTime) {
        return res.status(400).json({ error: 'Invalid input data' });
    }

    // Convert ISO 8601 datetime to MySQL datetime format
    const formattedStartTime = new Date(startTime).toISOString().slice(0, 19).replace('T', ' ');
    const formattedEndTime = new Date(endTime).toISOString().slice(0, 19).replace('T', ' ');

    const query = 'INSERT INTO shifts (employee_id, start_time, end_time) VALUES (?, ?, ?)';

    db.query(query, [employeeId, formattedStartTime, formattedEndTime], (err, result) => {
        if (err) {
            console.error('Error creating shift:', err);
            res.status(500).json({ error: 'Error creating shift' });
            return;
        }
        res.status(201).json({ shiftId: result.insertId });
    });
});

// Delete a shift
app.delete('/api/shifts/:shiftId', (req, res) => {
    const query = 'DELETE FROM shifts WHERE id = ?';
    db.query(query, [req.params.shiftId], (err) => {
        if (err) {
            res.status(500).json({ error: 'Error deleting shift' });
            return;
        }
        res.json({ message: 'Shift deleted successfully' });
    });
});

// Start server
const PORT = process.env.PORT || 3000;
initializeDatabase().then(() => {
    console.log('Database setup complete. Starting server...');
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch((err) => {
    console.error('Failed to initialize database:', err);
});


