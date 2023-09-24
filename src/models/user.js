const mongoose = require('mongoose');
// TODO: Investigate dependency injection for this use-case in Node/Express
const crypt = require('../utilities/crypto-service');


function validateEmailPattern(val) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/gi.test(val);
}

function usernameHasNoWhitespace(val) {
    return !/\s/g.test(val);
}

function validatePasswordPattern(val) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\.\*!@_\-\(\)\[\]\=\?\'\"\\\/\#\$\%\|\^\&\+\:\;\!\<\>])[a-zA-Z\d\.\*!@_\-\(\)\[\]\=\?\'\"\\\/\#\$\%\|\^\&\+\:\;\!\<\>]{8,}$/.test(val);
}

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        validate: [usernameHasNoWhitespace, "{PATH} must not contain whitespace"]
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        validate: [validateEmailPattern, "{PATH} does not match acceptable email pattern"],
    },
    password: {
        type: String,
        trim: true,
        minLength: 8,
        required: true,
    },
    salt: {
        type: String,
    },
    publicKey: {
        type: String,
    },
},
    {
        timestamps: true,
        toJSON: {
            transform: function (_, ret) {
                delete ret.password;
                delete ret.email;
                delete ret.salt;
                if(ret.publicKey){
                    ret.hasPublicKey = true;
                }
                delete ret.publicKey;
                return ret;
            }
        }
    });

userSchema.pre('save', async function (next) {
    // 'this' is the user document
    if (!this.isModified('password')) return next();
    // Replace the password with the computed hash
    try {
        if(!validatePasswordPattern(this.password)) throw new Error("Password too insecure");
        this.password = await crypt.hashString(this.password);
        return next();
    } catch (error) {
        console.error(error);
        return next(error);
    }
});

userSchema.pre('save', async function (next) {
    if (this.isNew || this.isModified('username')) {
        const existingUser = await this.constructor.findOne({ username: new RegExp(`^${this.username}$`, 'i') });
        if (existingUser && existingUser._id.toString() !== this._id.toString()) {
            return next(new Error('Username already exists'));
        } 
    } 
    return next();
});

userSchema.pre('save', async function (next){
    if(this.isModified('publicKey')){
        if(!crypt.verifyPublicKeyFormat(this.publicKey)){
            return next(new Error('Invalid key'));
        }
    }
    return next();
});

userSchema.methods.verifyPassword = async function (password) {
    try {
        const verified = await crypt.compareHash(password, this.password);
        return verified;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports = mongoose.model('User', userSchema);