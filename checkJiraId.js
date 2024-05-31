import fetch from 'node-fetch'
import dotenv from 'dotenv';
import projectRepos from './config.js';


dotenv.config();

const email = process.env.EMAIL;
const apiToken = process.env.API_TOKEN;
const issue_id = process.env.ISSUE_ID;
const repo_name = process.env.REPO_NAME;

async function getStatus() {
    // console.log(`API Token: ${apiToken}`)
    console.log(`Issue ID: ${issue_id}`);

    try {
        const response = await fetch(`https://eduvanz.atlassian.net/rest/api/3/issue/${issue_id}`,{
            method: 'GET',
            headers: {
                'Authorization': `Basic ${Buffer.from(
                `${email}:${apiToken}`
                ).toString('base64')}`,
                'Accept': 'application/json'
            }
        })

        // Parse JSON response
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
        const dataFields = data.fields
        const status = dataFields.status.name
        const projectKey = dataFields.project.key

        // check developer making changes to one of the defined repositories
        if(!projectRepos[projectKey].includes(repo_name)) {
            console.error(`Repository '${repo_name}' is not valid for project key '${projectKey}'`);
            process.exit(1);
        }

        // ** future enhancement **
        // const applicationsField = dataFields.customfield_10334
        // var size = Object.keys(applicationsField).length;
        // const applications = [];
        // for(let i=0; i<size; i++) {
        //     applications.push(applicationsField[i].value);
        // }
        
        // Check if the issue status is not pending-approval or approved
        if (status !== 'Pending Approval' && status !== 'Approved') {
            console.log(`Issue '${issue_id}' in '${status}' status`);
            process.exit(1);
        }
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

getStatus();