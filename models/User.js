const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
    },
    username: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    phone: {
        type: String,
        unique: true,
    },
    birthDate: { 
        type: Date 
    },
    profileImage: {
        type: String,
        default: 'https://i.pinimg.com/736x/47/a5/ce/47a5ceb8164f8a6707cf66f43685ecef.jpg',
    },
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    pendingSentRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    pendingReceivedRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
}, {timestamps: true});

module.exports = mongoose.model('User', userSchema);
