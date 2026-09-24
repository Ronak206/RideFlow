const express = require('express');
const router = express.Router();
const { handleSignUp, 
        handleLogin, 
        handleLogOut,
        handleMe
} = require("../controller/authController")

router.get('/me', handleMe);
router.post('/signup', handleSignUp);
router.post('/login', handleLogin);
router.post('/logout', handleLogOut);

module.exports = router;