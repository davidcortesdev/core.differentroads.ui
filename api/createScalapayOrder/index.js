const fetch = require('node-fetch');

module.exports = async function (context, req) {
    context.log('Processing Scalapay order request');

    try {
        // Get the request body
        const orderData = req.body;
        
        // Validate the request
        if (!orderData) {
            context.res = {
                status: 400,
                body: { error: "Request body is required" }
            };
            return;
        }

        // Prepare the request to Scalapay
        const scalapayUrl = process.env.SCALAPAY_API_URL + '/v2/orders';
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${process.env.SCALAPAY_API_KEY}`
        };

        // Make the request to Scalapay
        const response = await fetch(scalapayUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(orderData)
        });

        // Get the response data
        const responseData = await response.json();

        // Return the response
        context.res = {
            status: response.status,
            headers: {
                'Content-Type': 'application/json'
            },
            body: responseData
        };
    } catch (error) {
        context.log.error('Error processing Scalapay order:', error);
        
        context.res = {
            status: 500,
            body: { 
                error: "An error occurred while processing the request",
                details: error.message
            }
        };
    }
};