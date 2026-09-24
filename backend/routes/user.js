const express = require('express');
const router = express.Router();
const {
    handleGetUser,
    handleGetUserById,
    handleUpdateUser,
    handleDeleteUser,
} = require("../controller/userController");
const authMiddleware = require("../middleware/authMiddleware"); 

router.get('/', authMiddleware, handleGetUser);
router.get('/:id', authMiddleware, handleGetUserById);
router.patch('/', authMiddleware, handleUpdateUser);
router.delete('/:id', authMiddleware, handleDeleteUser);

module.exports = router;