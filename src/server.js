require('dotenv').config();

const express = require('express');
const logger = require('morgan');
const sanitize = require('express-mongo-sanitize');
const connectDB = require('./utilities/db');
const authenticateService = require('./middleware/authenticate-service');
const usersRouter = require('./routes/users-router');

const TEST = process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'test'
const DEBUG = process.env.NODE_ENV ? process.env.NODE_ENV.toLocaleLowerCase() !== 'production' : true;
const PORT = process.env.PORT || 3000;

const configureApp = (middleware) => {

    const app = express();
    app.use(logger('dev'));
    app.use(express.json());
    app.use(sanitize());

    if (middleware) app.use(middleware);

    return app;
}

const app = configureApp();

app.use(authenticateService);
app.use('/services/authentication/api', usersRouter);

if (!TEST) {
    connectDB();
    app.listen(PORT, () => {
        console.log(`Authentication microservice running on port ${PORT}`);
    });
}

module.exports = { app, configureApp }
