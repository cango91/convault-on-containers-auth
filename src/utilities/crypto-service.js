const crypto = require('crypto');

const HASH_SALT_LENGTH = parseInt(process.env.HASH_SALT_LENGTH, 10);
const HASH_ITERS = Number(process.env.HASH_ITER_ROUNDS);
const HASH_KEY_LEN = Number(process.env.HASH_KEY_LENGTH);
const HASH_DIGEST = process.env.HASH_DIGEST;

const hashString = (password) => {
    const salt = crypto.randomBytes(HASH_SALT_LENGTH).toString('hex');
    return new Promise((resolve, reject) => crypto.pbkdf2(password, salt, HASH_ITERS, HASH_KEY_LEN, HASH_DIGEST, (err, key) => {
        if (err) {
            reject(err);
        }
        resolve(`${salt}:${key.toString('hex')}`);
    }));
}

const compareHash = (password, hash) => {
    const [salt, key] = hash.split(':');
    return new Promise((resolve, reject) => crypto.pbkdf2(password, salt, HASH_ITERS, HASH_KEY_LEN, HASH_DIGEST, (err, compKey) => {
        if (err) {
            reject(err);
        }
        resolve(key === compKey.toString('hex'));
    }));
}

const quickDigest = data => {
    return crypto.createHash('sha256').update(data).digest('hex');
}

const encrypt = plainText => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(process.env.CIPHER_ALGO, process.env.CIPHER_KEY, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

const decrypt = cipherText =>{
    const [ivHex, encrypted] = cipherText.split(':');
    const iv = Buffer.from(ivHex,'hex');
    const decipher = crypto.createDecipheriv(process.env.CIPHER_ALGO,process.env.CIPHER_KEY,iv);
    let decrypted = decipher.update(encrypted, 'hex','utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}


module.exports = {
    hashString,
    compareHash,
    quickDigest,
    encrypt,
    decrypt,
}