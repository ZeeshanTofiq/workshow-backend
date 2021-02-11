const express = require('express');
// const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.get('/islogin', authController.protect, authController.isLogin);

router.post('/forgotPassword', authController.forgotPassword);
router.post('/resetPassword/:email', authController.resetPassword);
router.post('/verifyAccount', authController.VerifyAccount);

module.exports = router;