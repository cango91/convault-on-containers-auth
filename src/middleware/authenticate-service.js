const secret = process.env.SERVICE_SECRET;
if (!secret) {
    console.error('Required app configuration environment variables missing');
    process.exit(1);
}

const authenticateService = (req, res, next) => {
    const serviceSecret = req.headers['x-service-secret'];
    if (serviceSecret && serviceSecret === secret) {
        next();
    } else {
        res.status(401).send('Unauthorized');
    }
};

module.exports = authenticateService;