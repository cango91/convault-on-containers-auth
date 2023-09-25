const express = require('express');
const router = express.Router();
const usersCtrl = require('../controllers/users-controller');

router.post('/signup', usersCtrl.create);
router.post('/login', usersCtrl.login);
router.post('/logout', usersCtrl.logout);
router.post('/refresh', usersCtrl.refresh);

router.get('/resolve/:username', usersCtrl.resolveUsername);

module.exports = router;