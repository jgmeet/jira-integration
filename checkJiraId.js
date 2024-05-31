import fetch from 'node-fetch'
import dotenv from 'dotenv';
import {projectApps, appRepos, requiredStatus} from './config.js'


dotenv.config();

const email = process.env.EMAIL;
const apiToken = process.env.API_TOKEN;
const issue_id = process.env.ISSUE_ID;
const repo_name = process.env.REPO_NAME;

async function checkIdandRepoMapping() {

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
        const status = dataFields.status.name.toLowerCase()
        const projectKey = dataFields.project.key

        // check developer making changes to one of the defined repositories
        if(!(projectKey in projectApps)) {
            console.error(`'${projectKey}' is not mapped to any application`);
            process.exit(1);
        }

        const applications = projectApps[projectKey];
        var foundRepo = false;
        for(let i=0; i<applications.length; i++) {
            if(appRepos[applications[i]].includes(repo_name)) {
                foundRepo = true;
                break;
            }
        }

        if(!foundRepo) {
            console.error(`Repository '${repo_name}' is not mapped to project key '${projectKey}'`);
            process.exit(1);
        }

        // ** future enhancement **
        // const applicationsField = dataFields.customfield_10334
        // var size = Object.keys(applicationsField).length;
        // const applications = [];
        // for(let i=0; i<size; i++) {
        //     applications.push(applicationsField[i].value);
        // }
        
        // Check if the issue status is not in the valid states
        if (!requiredStatus.includes(status)) {
            console.log(`Issue '${issue_id}' is in '${status}' status, can not proceed`);
            process.exit(1);
        }
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkIdandRepoMapping();