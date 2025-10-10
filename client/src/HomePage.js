import React from 'react';

function HomePage({ setView }) {
    return (
        <div>
            <h1>Emergency Blood Finder</h1>
            <h2>How can we help you today?</h2>
            <div className="button-container">
                <button onClick={() => setView('requester')}>I Need Blood</button>
                <button onClick={() => setView('donor')}>I Want to Donate</button>
            </div>
        </div>
    );
}

export default HomePage;