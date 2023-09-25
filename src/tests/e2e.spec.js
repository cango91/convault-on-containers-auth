const path = require('path');
require('dotenv').config(path.join('./', '../.env'));
const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const User = require('../models/user');
let userData, accessToken, refreshToken;
const SERVICE_SECRET = process.env.AUTH_SERVICE_SECRET;

beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__, { useNewUrlParser: true, useUnifiedTopology: true });
    await User.deleteMany({});
    userData = {
        username: 'testUser',
        password: 'strongPassword1!',
        email: 'test@email.com',
    };
});

afterAll(async () => {
    const redisClient = require('../utilities/redis-client');
    await mongoose.connection.close();
    await redisClient.quit();
});

describe('Auth Endpoints', () => {
    it('should create a new user', async () => {
        // Test for /api/signup
        const payload = userData;
        const response = await request(app).post('/services/authentication/api/signup')
            .set('x-service-secret', SERVICE_SECRET)
            .send(payload);
        expect(response.statusCode).toEqual(200);
        const user = await User.findOne({ email: 'test@email.com' });
        expect(user).not.toBeNull();

    });

    it('should login the user', async () => {
        // Test for /api/login
        const payload = { ...userData };
        delete payload.email;
        const response = await request(app).post('/services/authentication/api/login')
            .set('x-service-secret', SERVICE_SECRET)
            .send(payload);
        expect(response.statusCode).toEqual(200);
        expect(response.body.refreshToken).not.toBeNull();
        expect(response.body.accessToken).not.toBeNull();
        refreshToken = response.body.refreshToken;
        accessToken = response.body.accessToken;

    });

    it('should logout the user', async () => {
        // Test for /api/logout
        const payload = { refreshToken, accessToken };
        const response = await request(app).post('/services/authentication/api/logout')
            .set('x-service-secret', SERVICE_SECRET)
            .send(payload);
        expect(response.status).toEqual(200);
    });

    it('should refresh tokens', async () => {
        // Test for /api/refresh
        // login the user
        const payload = { ...userData };
        delete payload.email;
        const response = await request(app).post('/services/authentication/api/login')
            .set('x-service-secret', SERVICE_SECRET)
            .send(payload);
        expect(response.statusCode).toEqual(200);
        refreshToken = response.body.refreshToken;
        accessToken = response.body.accessToken;
        // get refreshed tokens
        const refresh1 = await request(app).post('/services/authentication/api/refresh')
            .set('x-service-secret', SERVICE_SECRET)
            .send({ accessToken, refreshToken });
        expect(refresh1.statusCode).toEqual(200);
        const { newAccessToken, newRefreshToken } = refresh1.body;
        expect(newAccessToken).not.toBeNull();
        expect(newRefreshToken).not.toBeNull();
        expect(newRefreshToken).not.toEqual(refreshToken);
        expect(newAccessToken).not.toEqual(accessToken);
        // idempotency check
        const refresh2 = await request(app).post('/services/authentication/api/refresh')
            .set('x-service-secret', SERVICE_SECRET)
            .send({ accessToken, refreshToken });
        const {secondNewAccessToken, secondNewRefreshToken} = refresh2.body;
        expect(secondNewAccessToken).toEqual(newAccessToken);
        expect(secondNewRefreshToken).toEqual(newRefreshToken);
    });
});