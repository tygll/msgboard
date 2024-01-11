const express = require('express');
const router = express.Router();
const sqlite3 = require("sqlite3");

const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'data');

// Check if the "data" directory exists
if (!fs.existsSync(directoryPath)) {
    // If not, create the "data" directory
    fs.mkdirSync(directoryPath);
    console.log('Directory "data" created successfully.');
} else {
    console.log('Directory "data" already exists.');
}

const db = new sqlite3.Database('data/messageboard.db');
const axios = require('axios');


// Database initialization
db.serialize(() => {
    // Create the users table if it doesn't exist
    db.run("CREATE TABLE IF NOT EXISTS users (userid INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, role TEXT)");

    // Add an admin user if it doesn't exist
    const adminUsername = 'admin';
    const adminPassword = 'admin';
    const adminRole = 'admin';

    db.get("SELECT * FROM users WHERE username = ?", [adminUsername], function (err, row) {
        if (err) {
            console.error(err);
            return;
        }

        if (!row) {
            // User doesn't exist, insert the admin user
            db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", [adminUsername, adminPassword, adminRole], function (err) {
                if (err) {
                    console.error(err);
                    return;
                }

                console.log('Admin user added to the users table.');
            });
        }
    });

    // Create the forums table if it doesn't exist
    db.run("CREATE TABLE IF NOT EXISTS forums (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT)");

    // Check if there are any forums
    db.get("SELECT COUNT(*) AS count FROM forums", function (err, row) {
        if (err) {
            console.error(err);
            return;
        }

        if (row.count === 0) {
            // No forums found, create a default forum
            db.run("INSERT INTO forums (title) VALUES (?)", ['General Discussion'], function (err) {
                if (err) {
                    console.error(err);
                    return;
                }

                console.log('Default forum created.');
            });
        }
    });

    // Create the messages table if it doesn't exist
    db.run("CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, forumId INTEGER, userId INTEGER, message TEXT, timestamp TEXT, FOREIGN KEY (forumId) REFERENCES forums(id), FOREIGN KEY (userId) REFERENCES users(userid))");

});

function isAuthenticated(req, res, next) {
    if (req.session.user) {
        // User is authenticated, set isAdmin property based on the user's role
        req.session.user.isAdmin = req.session.user.role === 'admin';
        next();
    } else {
        // User is not authenticated, redirect to the login page
        res.redirect('/login');
    }
}

// Index route
router.get(['/index', '/'], isAuthenticated, function (req, res) {
    // Check if a user is logged in
    const loggedInUser = req.session.user;

    // Fetch open forums from the database
    db.all("SELECT * FROM forums", function (err, forums) {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
            return;
        }

        res.render('index', { title: 'Messaging Board', user: loggedInUser, forums: forums });
    });
});

// Forum-specific route
router.get('/forums/:forumId', isAuthenticated, function (req, res) {
    const forumId = req.params.forumId;

    // Fetch forum details from the database based on forumId
    db.get("SELECT * FROM forums WHERE id = ?", [forumId], function (err, forum) {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
            return;
        }

        if (!forum) {
            // Forum not found, handle accordingly (e.g., render an error page)
            res.status(404).render('error', { title: 'Forum Not Found', message: 'Forum not found.' });
            return;
        }

        // Fetch messages for the specific forum with user information
        db.all(`
            SELECT messages.*, users.username
            FROM messages
            JOIN users ON messages.userId = users.userid
            WHERE messages.forumId = ?
            ORDER BY messages.timestamp ASC  -- Order messages by timestamp (oldest first)
        `, [forumId], function (err, messages) {
            if (err) {
                console.error(err);
                res.status(500).send('Internal Server Error');
                return;
            }

            // Render the forum template with forum details and messages
            res.render('forum', { title: 'Forum', forum: forum, messages: messages });
        });
    });
});

// Route for posting messages in a forum
router.post('/forums/:forumId/post', isAuthenticated, async function (req, res) {
    const forumId = req.params.forumId;

    // Ensure that userId is present in the session
    if (!req.session.user || !req.session.user.userid) {
        res.status(401).send('Unauthorized');
        return;
    }

    const userId = req.session.user.userid;
    const message = req.body.message;

    try {
        // Make an asynchronous request to the WorldTimeAPI to get the current time in Toronto
        const response = await axios.get('https://worldtimeapi.org/api/timezone/America/Toronto');
        const timestamp = response.data.utc_datetime;

        // Insert the message into the database with the timestamp
        db.run('INSERT INTO messages (forumId, userId, message, timestamp) VALUES (?, ?, ?, ?)', [forumId, userId, message, timestamp], function (err) {
            if (err) {
                console.error(err);
                res.status(500).send('Internal Server Error');
                return;
            }

            // Redirect back to the forum page after posting the message
            res.redirect(`/forums/${forumId}`);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching timestamp from WorldTimeAPI');
    }
});


router.get('/users', isAuthenticated,
    function (req, res) {
    // Check if the user is an admin
    if (req.session.user && req.session.user.role === 'admin') {
        // Fetch all users from the database
        db.all("SELECT userid, username, role FROM users", function (err, rows) {
            if (err) {
                console.error(err);
                res.status(500).json({ error: 'Internal Server Error' });
            } else {
                // Render the 'users' view with user details
                res.render('users', { title: 'Users', userEntries: rows });
            }
        });
    } else {
        // User is not an admin, send a 403 Forbidden response
        res.status(403).json({ error: 'Permission denied. Admin privileges required.' });
    }
});

// Register route
router.get('/register', function (req, res) {
    res.render('register', { title: 'Register' });
});

// Register route
router.post('/register', function (req, res) {
    const { username, password, confirmPassword } = req.body;

    // Validate the input
    if (password !== confirmPassword) {
        // Passwords do not match, render the registration form with an error message
        res.render('register', { title: 'Register', error: 'Passwords do not match.' });
        return;
    }

    // Insert the new user into the database
    db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, password, 'guest'],
        function (err) {
            if (err) {
                console.error(err);

                // Check for duplicate key violation (username already exists)
                if (err.message.includes('UNIQUE constraint failed')) {
                    res.render('register', { title: 'Register', error: 'Username already exists. Please choose a different one.' });
                } else {
                    res.render('register', { title: 'Register', error: 'Registration failed. Please try again.' });
                }
                return;
            }

            // Redirect to the login page after successful registration
            res.redirect('/login');
        });
});


// Login route
router.get('/login', function (req, res) {
    res.render('login', { title: 'Login' });
});

router.post('/login', function (req, res) {
    const { username, password } = req.body;

    // Check user credentials in the database
    db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password],
        function (err, row) {
            if (err || !row) {
                // Authentication failed, redirect to the login page with an error message
                console.error(err);
                res.render('login', { title: 'Login', error: 'Invalid username or password' });
                return;
            }

            // Set user information in the session
            req.session.user = { username: row.username, role: row.role, userid: row.userid };

            // Redirect to the main application page after successful login
            res.redirect('/index');
        });
});

// Logout route
router.get('/logout', function (req, res) {
    // Destroy the session
    req.session.destroy(function (err) {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
            return;
        }

        // Redirect to the login page after logout
        res.redirect('/login');
    });
});

// Export the router
module.exports = router;
