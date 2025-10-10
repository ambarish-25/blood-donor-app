import React, { useState, useEffect } from 'react';
import axios from 'axios';

function RequesterForm({ setView }) {
    const [formData, setFormData] = useState({ requesterName: '', requesterEmail: '', requesterPhone: '', bloodType: 'A+' });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [coordinates, setCoordinates] = useState(null);
    const [locationError, setLocationError] = useState(false);
    const [manualAddress, setManualAddress] = useState('');
    
    // State to manage the two-stage results
    const [submitted, setSubmitted] = useState(false);
    const [potentialDonors, setPotentialDonors] = useState([]);
    const [matchedDonor, setMatchedDonor] = useState(null);
    const [requestId, setRequestId] = useState(null);

    // This useEffect is for the status polling
    useEffect(() => {
        if (!requestId || matchedDonor) return; // Only run if we have a requestID and no match yet

        const intervalId = setInterval(() => {
            axios.get(`http://localhost:5001/api/requests/status/${requestId}`)
            .then(response => {
                if (response.data.status === 'matched') {
                    setMatchedDonor(response.data.matchedDonor);
                    clearInterval(intervalId); // Stop polling once a match is found
                }
            }).catch(err => {
                console.error("Polling error:", err);
                clearInterval(intervalId); // Stop on error too
            });
        }, 5000); // Check every 5 seconds

        return () => clearInterval(intervalId); // Cleanup when component unmounts
    }, [requestId, matchedDonor]);

    // This useEffect is for initial location detection
    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (position) => { setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude }); },
            () => { setLocationError(true); }
        );
    }, []);

    const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        let finalCoordinates = coordinates;

        if (!finalCoordinates && manualAddress) {
            try {
                const geoResponse = await axios.post('http://localhost:5001/api/geocode', { address: manualAddress });
                finalCoordinates = geoResponse.data;
            } catch (err) {
                setError('Could not find that location. Please be more specific.');
                setIsLoading(false);
                return;
            }
        }
        if (!finalCoordinates) {
            setError('Location is required. Please enable or enter it manually.');
            setIsLoading(false);
            return;
        }
        
        const finalData = { ...formData, ...finalCoordinates };
        axios.post('http://localhost:5001/api/requests', finalData)
            .then(response => {
                setPotentialDonors(response.data.potentialDonors);
                setRequestId(response.data.requestId); // Save the request ID to start polling
                setSubmitted(true);
                setIsLoading(false);
            })
            .catch(err => {
                setError('Request failed. The server might be down. Please try again.');
                setIsLoading(false);
            });
    };

    // VIEW 3: A donor has been confirmed
    if (matchedDonor) {
        return (
            <div>
                <h2 style={{color: '#28a745'}}>✓ Donor Confirmed!</h2>
                <p><strong>{matchedDonor.name}</strong> has confirmed they are available and will call you shortly.</p>
                <p>The list below has been updated to show the confirmed donor.</p>

                <h3 style={{marginTop: '30px'}}>Donors Notified</h3>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #333' }}><th style={{ padding: '8px' }}>Name</th><th style={{ padding: '8px' }}>Phone</th><th style={{ padding: '8px' }}>Status</th></tr>
                    </thead>
                    <tbody>
                        {potentialDonors.map(donor => (
                            <tr key={donor._id} style={{ background: matchedDonor._id === donor._id ? '#d4edda' : 'transparent', borderBottom: '1px solid #ddd' }}>
                                <td style={{ padding: '8px' }}>{donor.name}</td>
                                <td style={{ padding: '8px' }}>{donor.phone}</td>
                                <td style={{ padding: '8px', fontWeight: 'bold', color: matchedDonor._id === donor._id ? '#155724' : '#333' }}>
                                    {matchedDonor._id === donor._id ? 'Confirmed' : 'Notified'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button className="back-button" onClick={() => { setView('home'); window.location.reload(); }}>← Start a New Search</button>
            </div>
        );
    }
    
    // VIEW 2: Form submitted, waiting for confirmation
    if (submitted) {
        return (
            <div>
                <h2>Searching for a Confirmation...</h2>
                <p>We've sent alerts to the donors below. This page will update automatically when one confirms.</p>

                <h3 style={{marginTop: '30px'}}>Potential Donors Nearby</h3>
                <p>In an emergency, you can also try contacting them directly.</p>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #333' }}><th style={{ padding: '8px' }}>Name</th><th style={{ padding: '8px' }}>Phone</th><th style={{ padding: '8px' }}>Blood Type</th></tr>
                    </thead>
                    <tbody>
                        {potentialDonors.length > 0 ? potentialDonors.map(donor => (
                            <tr key={donor._id} style={{ borderBottom: '1px solid #ddd' }}>
                                <td style={{ padding: '8px' }}>{donor.name}</td>
                                <td style={{ padding: '8px' }}>{donor.phone}</td>
                                <td style={{ padding: '8px' }}>{donor.bloodType}</td>
                            </tr>
                        )) : <tr><td colSpan="3" style={{padding: '12px'}}>No available donors found for this blood type nearby.</td></tr>}
                    </tbody>
                </table>
                <button className="back-button" onClick={() => { setView('home'); window.location.reload(); }}>← Start a New Search</button>
            </div>
        );
    }
    
    // VIEW 1: Initial Form
    return (
        <div>
            <h2>Request for Blood</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Your Name</label>
                    <input type="text" name="requesterName" onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label>Your Email</label>
                    <input type="email" name="requesterEmail" onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label>Your Phone Number</label>
                    <input type="tel" name="requesterPhone" onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label>Blood Type Needed</label>
                    <select name="bloodType" onChange={handleChange} required>
                        <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                        <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                    </select>
                </div>
                {locationError && (
                    <div className="form-group">
                        <label>Your City or Address</label>
                        <input type="text" placeholder="e.g., Hyderabad" value={manualAddress} onChange={(e) => setManualAddress(e.target.value)} required />
                        <p style={{fontSize: '12px', color: '#666'}}>Automatic location failed. Please enter manually.</p>
                    </div>
                )}
                <button type="submit" className="submit-button" disabled={isLoading}>{isLoading ? 'Searching...' : 'Find Donors & Send Alerts'}</button>
            </form>
            {error && <p className="message error">{error}</p>}
            <button className="back-button" onClick={() => setView('home')}>← Go Back</button>
        </div>
    );
}

export default RequesterForm;