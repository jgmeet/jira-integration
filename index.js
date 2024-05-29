import fetch from 'node-fetch'
import dotenv from 'dotenv';

dotenv.config();

const email = process.env.EMAIL;
const apiToken = process.env.API_TOKEN;
const issue_id = process.env.ISSUE_ID;

async function getStatus() {
    // console.log(`API Token: ${apiToken}`)
    console.log(`Issue ID: ${issue_id}`);

    try {
        const response = await fetch(`https://eduvanz.atlassian.net/rest/api/2/issue/${issue_id}`,{
            method: 'GET',
            headers: {
                'Authorization': `Basic ${Buffer.from(
                `${email}:${apiToken}`
                ).toString('base64')}`,
                'Accept': 'application/json'
            }
        })

        // Parse response JSON
        const data = await response.json();

        // Check if data is empty or undefined
        if (!data || Object.keys(data).length === 0) {
            console.log('No data received from the server');
            process.exit(1); 
        }

        // Check if data.fields is undefined or empty
        if (!data.fields) {
            console.log('Issue not found!');
            process.exit(1);
        }

        // Get the issue status
        const status = data.fields.status.name
        
        // Check if the issue status is not pending-approval or approved
        if (status !== 'Pending Approval' && status !== 'Approved') {
            console.log(`Issue is in ${status} status`);
            process.exit(1);
        }
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

getStatus();