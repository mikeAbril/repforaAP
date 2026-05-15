import mongoose from "mongoose";

const driveCredentialsSchema = new mongoose.Schema({
    accessToken: {
        type: String,
        required: true
    },
    refreshToken: {
        type: String,
        required: true
    },
    expiryDate: {
        type: Date,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware para actualizar updatedAt antes de guardar
driveCredentialsSchema.pre("save", function () {
    this.updatedAt = new Date();
});

export default mongoose.model("DriveCredentials", driveCredentialsSchema);