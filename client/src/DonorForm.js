import React, { useState, useEffect } from 'react';
import axios from 'axios';

function DonorForm({ setView }) {
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', bloodType: 'A+' });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [coordinates, setCoordinates] = useState(null);
    const [locationError, setLocationError] = useState(false);
    const [manualAddress, setManualAddress] = useState('');

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setCoordinates({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            },
            () => {
                setLocationError(true);
            },
            { timeout: 10000 }
        );
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        let finalCoordinates = coordinates;

        if (!finalCoordinates) {
            if (manualAddress) {
                try {
                    const geoResponse = await axios.post('http://localhost:5001/api/geocode', { address: manualAddress });
                    finalCoordinates = geoResponse.data;
                } catch (err) {
                    setIsError(true);
                    setMessage('Could not find that location. Please be more specific.');
                    setIsLoading(false);
                    return;
                }
            } else {
                setIsError(true);
                setMessage('Location is required. Please enable or enter it manually.');
                setIsLoading(false);
                return;
            }
        }

        const finalData = { ...formData, ...finalCoordinates };
        axios.post('http://localhost:5001/api/donors', finalData)
            .then(response => {
                setIsError(false);
                setMessage('Thank you! You have been registered successfully.');
                setIsLoading(false);
            })
            .catch(error => {
                setIsError(true);
                setMessage('Registration failed. The server might be down or the email is already in use.');
                setIsLoading(false);
            });
    };

    return (
        <div>
            <h2>Register as a Donor</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Name</label>
                    <input type="text" name="name" onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label>Email</label>
                    <input type="email" name="email" onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label>Phone Number</label>
                    <input type="tel" name="phone" onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label>Blood Type</label>
                    <select name="bloodType" onChange={handleChange} required>
                        <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                        <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                    </select>
                </div>

                {locationError && (
                    <div className="form-group">
                        <label>Your City or Address</label>
                        <input
                            type="text"
                            placeholder="e.g., Hyderabad"
                            value={manualAddress}
                            onChange={(e) => setManualAddress(e.target.value)}
                            required
                        />
                         <p style={{fontSize: '12px', color: '#666'}}>Automatic location failed. Please enter manually.</p>
                    </div>
                )}

                <button type="submit" className="submit-button" disabled={isLoading}>
                    {isLoading ? 'Registering...' : 'Become a Donor'}
                </button>
            </form>
            {message && <p className={`message ${isError ? 'error' : 'success'}`}>{message}</p>}
            <button className="back-button" onClick={() => setView('home')}>← Go Back</button>
        </div>
    );
}

export default DonorForm;