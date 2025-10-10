const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
    requesterName: { type: String, required: true },
    requesterEmail: { type: String, required: true }, // Add this line
    requesterPhone: { type: String, required: true },
    bloodType: { type: String, required: true },
    location: { /* ... */ },
    status: { type: String, enum: ['open', 'matched', 'closed'], default: 'open' },
    matchedDonor: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' }
}, { timestamps: true });

requestSchema.index({ location: '2dsphere' });

const Request = mongoose.model('Request', requestSchema);

module.exports = Request;