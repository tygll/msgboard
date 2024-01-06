# Simple Message Board

A very basic messaging board I developed as a final project in a web applications class. It was designed around meeting the requirements of the assignment, so the functionality is intentionally limited.

Users can create accounts, log in, and post messages on individual forums. Messages are stored in an SQL database and can be viewed by other users. Users with the "admin" role can access a list of all users. The application uses the World Time API to generate timestamps for each message.

 ## Table of Contents

- [Installation](#installation)
- [Launching](#launching)
- [Testing](#testing)
- [Default Admin Credentials](#default-admin-credentials)

## Installation

To install the necessary dependencies, run the following command:

```bash
npm install
```

## Launching

To launch the server, run the following command:

```bash
node server.js
```

## Testing

You can test the application by visiting the following URLs:

- [http://localhost:3000/index](http://localhost:3000/index)
- [http://localhost:3000/login](http://localhost:3000/login)
- [http://localhost:3000/register](http://localhost:3000/register)

## Default Admin Credentials

If no user named "admin" already exists, a user with admin privileges will be created. Use the following default admin credentials:

- Username: admin
- Password: admin

Make sure to change the default password for security reasons after the initial setup.
