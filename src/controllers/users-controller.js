const User = require('../models/user');
const tokenService = require('../utilities/token-service');
const utils = require('../utilities/utils');

const redisClient = require('../utilities/redis-client');


const create = async (req, res, next) => {
    try {
        const user = new User(req.body);
        await user.save();
        await handleUserAuthentication(user, res)
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
        await handleUserAuthentication(user, res);
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

const resolveUsername = async (req, res, next) => {
    try {
        const username = req.params.username;
        const user = await User.findOne({ username: new RegExp(`^${username}$`, 'i') });
        if (!user) {
            return utils.respondWithStatus(res, 404, "username not found");
        }
        res.json({username, _id: user._id});
    } catch (error) {
        console.error(error);
        utils.respondWithStatus(res, 400, error.message);
    }
}

async function handleUserAuthentication(user, res) {
    const accessToken = tokenService.createJwt(user, process.env.JWT_EXP);
    const refreshToken = await tokenService.createRefreshToken(user, process.env.REFRESH_EXP);
    await redisClient.set(`refresh:${user._id}`, JSON.stringify(refreshToken), 'NX', 'EX', utils.toSeconds(process.env.REFRESH_EXP));
    res.json({ accessToken, refreshToken });
}

module.exports = {
    create,
    login,
    logout,
    refresh,
    resolveUsername,
}