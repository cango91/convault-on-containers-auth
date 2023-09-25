const express = require('express');
const router = express.Router();
const usersCtrl = require('../controllers/users-controller');

router.post('/', usersCtrl.create);
router.post('/login', usersCtrl.login);
router.post('/logout', usersCtrl.logout);
router.post('/refresh', usersCtrl.refresh);
router.delete('/', usersCtrl.delete);

module.exports = router;