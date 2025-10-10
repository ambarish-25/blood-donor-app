const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true }, 
    bloodType: { type: String, required: true },
    isAvailable: { type: Boolean, default: true },
    location: { /* ... */ }
}, { timestamps: true });

// ... rest of file

donorSchema.index({ location: '2dsphere' });

const Donor = mongoose.model('Donor', donorSchema);

module.exports = Donor;