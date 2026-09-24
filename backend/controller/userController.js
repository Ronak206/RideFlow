const User = require("../model/user");

// Get own profile
async function handleGetUser(req, res) {
    try {
        const userId = req.user._id;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        return res.status(200).json({
            message: "User fetched successfully",
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
}

// Get user by id
async function handleGetUserById(req, res) {
    try {
        const userId = req.params.id;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        return res.status(200).json({
            message: "User fetched successfully",
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
}

// Update own profile
async function handleUpdateUser(req, res) {
    try {
        const userId = req.user._id;
        const { name, email } = req.body;

        const updates = {};
        if (name) updates.name = name;
        if (email) updates.email = email;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                message: "No fields to update",
            });
        }

        const user = await User.findByIdAndUpdate(userId, updates, {
            new: true,
            runValidators: true
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        return res.status(200).json({
            message: "User updated successfully",
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "Email already in use",
            });
        }
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
}

// Delete own account
async function handleDeleteUser(req, res) {
    try {
        const targetId = req.params.id;
        const requesterId = req.user._id.toString();

        if (targetId !== requesterId) {
            return res.status(403).json({
                message: "You can only delete your own account",
            });
        }

        const user = await User.findByIdAndDelete(targetId);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        return res.status(200).json({
            message: "User deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
}

module.exports = { handleGetUser, handleGetUserById, handleUpdateUser, handleDeleteUser };