const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/refresh-token');
const User = require('../models/user');
const { quickDigest } = require('./crypto-service');
const { toSeconds } = require('./utils');

const redisClient = require('./redis-client');

const { JWT_EXP, JWT_SECRET, REFRESH_EXP, REFRESH_SECRET } = process.env;

if (!JWT_EXP || !JWT_SECRET || !REFRESH_EXP || !REFRESH_SECRET) {
    console.error('Required app configuration environment variables missing');
    process.exit(1);
}


/**
 * Refresh accessToken and rotate refreshToken if refreshToken is valid. Idempotent within 60 seconds
 * @param {{accessToken: string, refreshToken: string}} tokens 
 * @returns {Promise<{accessToken: string, refreshToken:string>}}
 */
async function refreshTokens({ accessToken, refreshToken }) {
    const key = quickDigest(accessToken + "::" + refreshToken);

    // Try to acquire lock in Redis
    if (!(await redisClient.set(key, 'lock', 'NX', 'EX', 60))) {
        throw new Error('Could not acquire lock');
    }

    try {
        const cachedTokens = await redisClient.get(`idempotency:${key}`);
        if (cachedTokens) {
            return JSON.parse(cachedTokens);
        }

        if (verifySignature(accessToken, JWT_SECRET) &&
            verifySignature(refreshToken, REFRESH_SECRET)) {

            await verifyJwt(refreshToken, REFRESH_SECRET);
            const user = await User.findById(getUserFromToken(accessToken));

            // Try to fetch storedToken from Redis first
            const storedTokenRedis = await redisClient.get(`refresh:${user._id}`);
            let storedToken = storedTokenRedis ? JSON.parse(storedTokenRedis) : null;

            if (!storedToken) {
                storedToken = await RefreshToken.findOne({ token: refreshToken });
                await redisClient.set(`refresh:${user._id}`, JSON.stringify(storedToken), 'EX', toSeconds(REFRESH_EXP));
            }

            if (!storedToken || storedToken.status !== 'valid' || !storedToken.user._id.equals(user._id)) {
                throw new Error('Invalid token');
            }

            const newRefreshToken = signRefreshToken(user);
            const newJwt = createJwt(user, JWT_EXP);
            storedToken.token = newRefreshToken;
            storedToken.expiresAt = new Date(parseJwt(newRefreshToken).exp * 1000);
            await storedToken.save();
            // Save the new refresh token in Redis
            await redisClient.set(`refresh:${user._id}`, JSON.stringify(storedToken), 'EX', toSeconds(REFRESH_EXP));

            const tokens = { accessToken: newJwt, refreshToken: newRefreshToken };

            await redisClient.set(`idempotency:${key}`, JSON.stringify(tokens), 'EX', 60);
            return tokens;
        } else {
            throw new Error('Invalid Signature');
        }
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        // Release the lock
        await redisClient.del(key);
    }
}


function signRefreshToken(user) {
    return jwt.sign(
        { user, timestamp: process.hrtime.bigint().toString() },
        REFRESH_SECRET,
        { expiresIn: REFRESH_EXP }
    );
}

/**
 * Parses a given jwt using base64url and returns its payload
 * @param {*} token 
 * @returns {payload}
 */
function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}
/**
 * Creates a new stateless jwt with the provided user as payload
 * @param {user} user 
 * @param {String} expiresIn 
 * @returns {jwt}
 */
function createJwt(user, expiresIn) {
    return jwt.sign(
        { user },
        JWT_SECRET,
        { expiresIn }
    );
}

/**
 * Creates a stateful jwt, stored in RefreshToken collection
 * @param {user} user 
 * @param {String} expiresIn 
 * @returns {jwt}
 */
async function createRefreshToken(user, expiresIn) {
    try {
        const token = signRefreshToken(user);
        const refreshToken = new RefreshToken({
            token,
            user: user.id,
            expiresAt: new Date(Date.now() + toSeconds(expiresIn) * 1000)
        });

        await refreshToken.save();
        return token;
    } catch (error) {
        console.error(error);
        throw error;
    }
}



/**
 * Gets the user by parsing the provided jwt 
 * @param {*} token 
 * @returns {user}
 */
function getUserFromToken(token) {
    if (token && token.startsWith('Bearer ')) {
        token = token.replace('Bearer ', '');
    }
    return token ? parseJwt(token).user : null;
}

/**
 * Checks if a jwt is valid. Returns decoded token if valid. Rejects promise with error if not.
 * @param {String} token 
 * @param {String} secret 
 * @returns {Promise}
 */
function verifyJwt(token, secret = JWT_SECRET) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, secret, (error, decodedToken) => {
            if (error) {
                reject(error);
            } else {
                resolve(decodedToken);
            }
        })
    });
}

function verifySignature(token, secret = JWT_SECRET) {
    try {
        jwt.verify(token, secret, { algorithms: ["HS256"], ignoreExpiration: true });
        return true;
    } catch (error) {
        return false;
    }
}

async function revokeRefreshToken(accessToken, refreshToken) {
    const key = quickDigest(accessToken + "::" + refreshToken);

    // Try to acquire lock in Redis
    if (!(await redisClient.set(key, 'lock', 'NX', 'EX', 60))) {
        throw new Error('Could not acquire lock');
    }
    try {
        await verifyJwt(refreshToken, REFRESH_SECRET);
        const revoked = await RefreshToken.findOneAndUpdate({ token: refreshToken }, { status: 'revoked' }, { new: true });
        // update idemotency and refresh caches
        await redisClient.del(`idempotency:${key}`);
        await redisClient.set(`refresh:${revoked.user}`, JSON.stringify(revoked), 'EX', 600);
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        await redisClient.del(key);
    }
}

module.exports = {
    parseJwt,
    createJwt,
    createRefreshToken,
    getUserFromToken,
    refreshTokens,
    verifyJwt,
    // setCookie,
    verifySignature,
    revokeRefreshToken,
}