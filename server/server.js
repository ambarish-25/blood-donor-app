require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Donor = require('./models/donor.model');
const Request = require('./models/request.model');
const nodemailer = require('nodemailer');
const NodeGeocoder = require('node-geocoder');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

const geocoderOptions = {
    provider: 'locationiq',
    apiKey: process.env.LOCATIONIQ_API_KEY,
};
console.log("Checking API Key on Render:", process.env.LOCATIONIQ_API_KEY);
const geocoder = NodeGeocoder(geocoderOptions);

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected successfully."))
    .catch(err => console.error("MongoDB connection error:", err));

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// --- API Endpoints ---

app.post('/api/geocode', async (req, res) => {
    try {
        const { address } = req.body;
        if (!address) return res.status(400).json({ message: 'Address is required.' });
        const data = await geocoder.geocode(address);
        if (data.length === 0) return res.status(404).json({ message: 'Location not found.' });
        const { latitude, longitude } = data[0];
        res.status(200).json({ latitude, longitude });
    } catch (error) {
        res.status(500).json({ message: 'Geocoding service error.', error: error.message });
    }
});

app.post('/api/donors', async (req, res) => {
    try {
        const { name, email, phone, bloodType, latitude, longitude } = req.body;
        const newDonor = new Donor({
            name, email, phone, bloodType, isAvailable: true,
            location: { type: 'Point', coordinates: [longitude, latitude] }
        });
        await newDonor.save();
        res.status(201).json({ message: "Donor registered successfully!", donor: newDonor });
    } catch (error) {
        res.status(500).json({ message: "Error registering donor", error: error.message });
    }
});

app.post('/api/requests', async (req, res) => {
    try {
        const { requesterName, requesterEmail, requesterPhone, bloodType, latitude, longitude } = req.body;
        const newRequest = new Request({
            requesterName, requesterEmail, requesterPhone, bloodType,
            location: { type: 'Point', coordinates: [longitude, latitude] },
            status: 'open'
        });
        await newRequest.save();

        const nearbyDonors = await Donor.find({
            bloodType, isAvailable: true,
            location: {
                $near: {
                    $geometry: { type: 'Point', coordinates: [longitude, latitude] },
                    $maxDistance: 20000 // 20km
                }
            }
        });

        for (const donor of nearbyDonors) {
            const confirmationLink = `http://localhost:5001/api/confirm/${newRequest._id}/${donor._id}`;
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: donor.email,
                subject: `URGENT: Blood Type ${bloodType} Needed Near You!`,
                html: `<p>Hello ${donor.name},</p><p>An urgent request has been made. If you are available, please click the button below to confirm and receive the requester's details.</p><a href="${confirmationLink}" style="background-color: #4CAF50; color: white; padding: 14px 25px; text-align: center; text-decoration: none; display: inline-block; border-radius: 8px;">Yes, I Can Donate Now</a>`
            };
            transporter.sendMail(mailOptions).catch(err => console.error("Error sending email:", err));
        }

        res.status(201).json({
            message: 'Request sent! Searching for a confirmed match...',
            requestId: newRequest._id,
            potentialDonors: nearbyDonors
        });
    } catch (error) {
        console.error("Error in /api/requests:", error);
        res.status(500).json({ message: 'Server error creating request.', error: error.message });
    }
});

app.get('/api/requests/status/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const request = await Request.findById(id).populate('matchedDonor');
        if (!request) {
            return res.status(404).json({ message: 'Request not found.' });
        }
        res.status(200).json(request);
    } catch (error) {
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
});

app.get('/api/confirm/:requestId/:donorId', async (req, res) => {
    try {
        const { requestId, donorId } = req.params;
        const updatedRequest = await Request.findOneAndUpdate(
            { _id: requestId, status: 'open' },
            { status: 'matched', matchedDonor: donorId },
            { new: true }
        ).populate('matchedDonor');

        if (!updatedRequest) {
            return res.send('<h1>Too Late!</h1><p>This request has already been matched.</p>');
        }

        const donor = updatedRequest.matchedDonor;
        await Donor.findByIdAndUpdate(donor._id, { isAvailable: false });

        const mailToDonor = {
            from: process.env.EMAIL_USER,
            to: donor.email,
            subject: 'You Are a Match! - Contact the Requester Now',
            html: `<p>Thank you, ${donor.name}!</p><p>You have been successfully matched. Please contact the person in need immediately:</p><ul><li>Name: ${updatedRequest.requesterName}</li><li>Phone: ${updatedRequest.requesterPhone}</li></ul><p>Thank you for your heroic act.</p>`
        };
        await transporter.sendMail(mailToDonor);

        const mailToRequester = {
            from: process.env.EMAIL_USER,
            to: updatedRequest.requesterEmail,
            subject: 'Success! A Donor Has Been Found!',
            html: `<p>Hello ${updatedRequest.requesterName},</p><p>Great news! A donor has confirmed they are available and will be contacting you shortly.</p><ul><li>Donor's Name: ${donor.name}</li><li>Blood Type: ${donor.bloodType}</li></ul><p>Please keep your phone line open.</p>`
        };
        await transporter.sendMail(mailToRequester);

        res.send('<h1>Confirmed!</h1><p>You are a match! We have sent the requester\'s contact details to your email and sent your details to the requester.</p>');
    } catch (error) {
        console.error("Error in /api/confirm:", error);
        res.status(500).send('<h1>Error</h1><p>An error occurred.</p>');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});