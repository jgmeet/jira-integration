import fetch from 'node-fetch'
import dotenv from 'dotenv';
import {projectApps, appRepos} from './config.js'

dotenv.config();

const email = process.env.EMAIL;
const apiToken = process.env.API_TOKEN;
const jira_ids = process.env.JIRRA_IDS.split(','); // jira project id's
const cm_ids = process.env.CM_IDS.split(','); // change management id's
const repo_name = process.env.REPO_NAME;

async function checkIdandRepoMapping(issue_id, isJiraIssue) {

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
            return false;
        }

        // Check if data.fields is undefined or empty
        if (!data.fields) {
            console.log('Issue not found!');
            return false;
        }

        // Get the issue status
        const dataFields = data.fields
        const status = dataFields.status.name.toLowerCase()
        const statusCategory = dataFields.status.statusCategory.name.toLowerCase()
        const projectKey = dataFields.project.key

        // Check if the issue status is not in the valid states
        if (!isJiraIssue && status !== 'approved') {
            console.log(`Issue '${issue_id}' is in '${status}' status, can not proceed`)
            return false;
        }
        if(isJiraIssue && statusCategory !== 'in progress') {
            console.log(`For issue-id '${issue_id}', statusCategory is '${status}', can not proceed`);
            return false;
        }

        // check developer making changes to one of the defined repositories
        if(!(projectKey in projectApps)) {
            console.error(`Project Id '${projectKey}' is not mapped to any application, check config.js file for Project keys to applications mapping`);
            return false;
        }
        
        // checking repo mapping for jira id's and CM id's
        var applications = [];
        if(isJiraIssue) applications = projectApps[projectKey];
        else {
            const applicationsField = dataFields.customfield_10334
            var size = Object.keys(applicationsField).length;
            for(let i=0; i<size; i++) {
                applications.push(applicationsField[i].value);
            }
        }

        var foundRepo = false;
        for(let i=0; i<applications.length; i++) {
            if(appRepos[applications[i]].includes(repo_name)) {
                foundRepo = true;
                break;
            }
        }

        if(!foundRepo) {
            console.error(`Repository '${repo_name}' is not mapped to project key '${projectKey}'`);
            return false;
        }

        // check that Jira Id's provided in PR description
        // are exact with the ones mentioned in CM issue
        

    } catch (error) {
        console.error(error);
        return false;
    }

    return true;
}

// check provided CM ID's are correct
for(let i=0; i<cm_ids.length; i++) {
    const resp = await checkIdandRepoMapping(cm_ids[i], false);
    if(!resp) {
        console.log(`Check failed at issue id: ${cm_ids[i]}`)
        process.exit(1);
    }
}

// check provided JIRA ID's are correct
for(let i=0; i<jira_ids.length; i++) {
    const resp = await checkIdandRepoMapping(jira_ids[i], true);
    if(!resp) {
        console.log(`Check failed at issue id: ${jira_ids[i]}`)
        process.exit(1);
    }
}

console.log('Verification Successful')


