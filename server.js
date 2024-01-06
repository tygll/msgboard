var express = require('express');
var session = require('express-session');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var bodyParser = require('body-parser');

var routes = require('./routes');

var app = express();

const PORT = process.env.PORT || 3000;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.locals.pretty = true;

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true
}));

// Use body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));

app.use(routes);

app.use(express.static(path.join(__dirname, 'public')));

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));

app.listen(PORT, (err) => {
    if (err) console.log(err);
    else {
        console.log(`Server listening on port: ${PORT} CNTL:-C to stop`);
        console.log('http://localhost:3000/index');
        console.log('http://localhost:3000/');
        console.log('http://localhost:3000/login');
        console.log('http://localhost:3000/register');
    }
});
