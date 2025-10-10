import React, { useState } from 'react';
import './App.css';
import HomePage from './HomePage';
import DonorForm from './DonorForm';
import RequesterForm from './RequesterForm';

function App() {
    // This state variable decides which view to show: 'home', 'donor', or 'requester'
    const [view, setView] = useState('home');

    // Function to render the correct component based on the 'view' state
    const renderView = () => {
        switch (view) {
            case 'donor':
                return <DonorForm setView={setView} />;
            case 'requester':
                return <RequesterForm setView={setView} />;
            default:
                return <HomePage setView={setView} />;
        }
    };

    return (
        <div className="container">
            {renderView()}
        </div>
    );
}

export default App;