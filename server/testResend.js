require('dotenv').config();
const { Resend } = require('resend');

async function testEmail() {
    console.log("Initializing Resend with the key from your .env file...");
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        console.log("Attempting to send a test email...");
        const { data, error } = await resend.emails.send({
            from: 'Blood Donor App <onboarding@resend.dev>',
            to: 'mym20utube@gmail.com', // <-- IMPORTANT: REPLACE WITH YOUR EMAIL
            subject: 'Resend Test From VS Code',
            html: '<strong>If you received this email, your API key and connection are working perfectly!</strong>',
        });

        if (error) {
            console.error('--- RESEND API ERROR ---');
            console.error(error);
            return;
        }

        console.log('--- SUCCESS! ---');
        console.log('Email sent successfully:', data);

    } catch (e) {
        console.error('--- A CRITICAL ERROR OCCURRED ---');
        console.error(e);
    }
}

testEmail();