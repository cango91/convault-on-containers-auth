const User = require('../models/user');
const tokenService = require('../utilities/token-service');
const utils = require('../utilities/utils');

const redisClient = require('../utilities/redis-client');
const { getChannel } = require('../utilities/rabbit-mq');

const create = async (req, res, next) => {
    try {
        const user = new User(req.body);
        await user.save();
        const { accessToken, refreshToken } = await handleUserAuthentication(user, res);

        // publish user created message
        const channel = getChannel();
        const exchange = 'user_events';
        const routingKey = 'user.created';
        channel.assertExchange(exchange, 'topic', { durable: false });
        channel.publish(exchange, routingKey, Buffer.from(JSON.stringify({ userId: user._id, username: user.username })));

        res.status(201).json({ accessToken, refreshToken });
    } catch (error) {
        console.error(error);
        utils.respondWithStatus(res, 400, error.message);
    }
}

const login = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user || !(await user.verifyPassword(password))) {
            return utils.respondWithStatus(res, 401, 'Invalid Credentials');
        }
        const tokens = await handleUserAuthentication(user, res);
        res.json(tokens);
    } catch (error) {
        console.error(error);
        utils.respondWithStatus(res, 400, error.message);
    }
}

const logout = async (req, res, next) => {
    try {
        const { accessToken, refreshToken } = req.body;
        await tokenService.revokeRefreshToken(accessToken, refreshToken);
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error(error);
        utils.respondWithStatus(res, 400, error.message);
    }
}

const refresh = async (req, res, next) => {
    try {
        const { accessToken, refreshToken } = req.body;
        if (!refreshToken || !accessToken) return res.status(401).json({ message: 'Unauthorized' });
        const tokens = await tokenService.refreshTokens({ accessToken, refreshToken });
        res.json(tokens);
    } catch (error) {
        console.error(error);
        utils.respondWithStatus(res, 400, error.message);
    }
}

const deleteOne = async (req, res, next) => {
    try {
        const { userId } = req.body;
        const user = await User.findOne({ _id: userId });
        if (!user) return utils.respondWithStatus(res, 404, "User not found");
        await user.deleteOne();

        // publish user deleted message
        const channel = getChannel();
        const exchange = 'user_events';
        const routingKey = 'user.deleted';
        channel.assertExchange(exchange, 'topic', { durable: false });
        channel.publish(exchange, routingKey, Buffer.from(JSON.stringify({ userId })));

        res.status(204).json({});
    } catch (error) {
        console.error(error);
        utils.respondWithStatus(res, 400, error.message);
    }
}

async function handleUserAuthentication(user, res) {
    const accessToken = tokenService.createJwt(user, process.env.JWT_EXP);
    const refreshToken = await tokenService.createRefreshToken(user, process.env.REFRESH_EXP);
    await redisClient.set(`refresh:${user._id}`, JSON.stringify(refreshToken), 'NX', 'EX', utils.toSeconds(process.env.REFRESH_EXP));
    return { accessToken, refreshToken };
}

module.exports = {
    create,
    login,
    logout,
    refresh,
    delete: deleteOne,
}