const fetch = require('node-fetch')
const dotenv = require('dotenv')

dotenv.config();

const email = process.env.EMAIL;
const apiToken = process.env.API_TOKEN;
var jira_ids = process.env.JIRA_IDS; // Jira project IDs
const cm_ids = process.env.CM_IDS.split(','); // Change management IDs
const repo_name = process.env.REPO_NAME;
const jira_url = process.env.JIRA_URL;

var ids = cm_ids
const numOfCM_IDS = cm_ids.length;

if(jira_ids) {
    jira_ids = jira_ids.split(',');
    ids = cm_ids.concat(jira_ids)
    jira_ids.sort(); // sorted to check if linked issues in Change Request
    // match jira ids provided in PR description
}

async function checkMapping(asset, isJiraIssue) {
    try {
        const resp = await fetch(`${jira_url}/rest/api/3/search?jql=project=CMDB`,{
            method: 'GET',
            headers: {
                'Authorization': `Basic ${Buffer.from(
                `${email}:${apiToken}`
                ).toString('base64')}`,
                'Accept': 'application/json'
            }
        })

        if(!resp.ok) {
            console.log('Request failed!')
            return false;
        }

        const response = await resp.json()
        // console.log(response.issues.fields)
        const assets = response.issues
        var foundMapping = false;
        for(let i=0; i<assets.length; i++) {
            const status = assets[i].fields.status.statusCategory.name
            if(status !== 'Done') {
                continue;
            }

            const application = assets[i].fields.customfield_10342
            const projectID = assets[i].fields.customfield_10344
            const githubRepo = assets[i].fields.customfield_10341
            if(!isJiraIssue && application == asset) {
                if(githubRepo == repo_name) {
                    foundMapping = true;
                    break;
                }
            }
            if(isJiraIssue && projectID == asset) {
                if(githubRepo == repo_name) {
                    foundMapping = true;
                    break;
                }
            }
        }

        if(!foundMapping) {
            console.log(`Mapping of '${asset}' to repo '${repo_name}' not found in CMDB...`)
        } else  {
            console.log(`Mapping of '${asset}' to repo '${repo_name}' found...`)
            return true;
        }

    } catch (error) {
        console.error(`Request failed: ${error}`);
    }

    return false;
}

async function checkIdandRepoMapping(issue_id, isJiraIssue) {

    try {
        const response = await fetch(`${jira_url}/rest/api/3/issue/${issue_id}`,{
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
            console.log('Issue does not exist or Invalid credentials');
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
            console.log(`For issue-id '${issue_id}', statusCategory is '${statusCategory}', can not proceed`);
            return false;
        }
        
        // checking repo mapping for jira id's and CM id's
        var foundRepo = false;
        if(isJiraIssue) {
            foundRepo = await checkMapping(projectKey, true);
        }
        else {
            const applicationsField = dataFields.customfield_10337
            if(applicationsField == null) {
                console.log(`No Impacted Applications mentioned in the change request issue '${issue_id}'`)
                return false;
            }

            const size = Object.keys(applicationsField).length;
            for(let i=0; i<size; i++) {
                foundRepo = await checkMapping(applicationsField[i].value, false);
                if(foundRepo) break;
            }
        }

        if(!foundRepo) {
            console.log('You are not making changes in correct repo!')
            return false;
        } else {
            console.log('You are making changes in correct repo...')
        }

        if(!isJiraIssue) {
            // if request type is emergency, then no need to check
            // for jira id's in description
            const requestType = dataFields.customfield_10333;
            if(requestType !== null && requestType.value == 'Emergency') {
                return true;
            }

            // check that Jira Id's provided in PR description
            // are exact with the ones mentioned in CM linked issues
            const issueLinks = dataFields.issuelinks
            const numOfLinkedIssues = Object.keys(issueLinks).length
            if(numOfLinkedIssues == 0) {
                console.log('Linked issues not mentioned in Change Management request')
                return false;
            }
    
            const linked_issues = []
            for(let i=0; i<numOfLinkedIssues; i++) {
                if(issueLinks[i].inwardIssue !== undefined) {
                    const linked_issue = issueLinks[i].inwardIssue.key;
                    if(!linked_issues.includes(linked_issue)) {
                        linked_issues.push(linked_issue)
                    }
                }
                if(issueLinks[i].outwardIssue !== undefined) {
                    const linked_issue = issueLinks[i].outwardIssue.key;
                    if(!linked_issues.includes(linked_issue)) {
                        linked_issues.push(linked_issue)
                    }
                }
            }

            // jira_ids.sort();
            linked_issues.sort();
            const equalValues = (jira_ids.length === linked_issues.length) && jira_ids.every((value, index) => value === linked_issues[index])

            if(!equalValues) {
                console.log(`Jira id/s: '${jira_ids}' is/are not matching the Linked issue ids: '${linked_issues}'`);
                return false;
            }
        }

    } catch (error) {
        console.error(`Request failed: ${error}`);
        return false;
    }

    return true;
}


async function main() {
    console.log('Checking Issue IDs...');

    for(let i=0; i<ids.length; i++) {
        isJiraIssue = true;
        if(i<numOfCM_IDS) isJiraIssue = false;
        issue_id = ids[i];

        console.log('checking issue id: ', issue_id);
        const response = await checkIdandRepoMapping(issue_id, isJiraIssue);
        if(!response) {
            console.log(`Check failed at issue id: ${issue_id}`)
            process.exit(1);
        }
        console.log(`Check successful for issue id: ${issue_id}`)
    }
}

main();