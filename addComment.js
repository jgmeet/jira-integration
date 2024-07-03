const fetch = require('node-fetch')
const dotenv = require('dotenv')

dotenv.config();

const email = process.env.EMAIL;
const apiToken = process.env.API_TOKEN;
var jira_ids = process.env.JIRA_IDS; // Jira project IDs
const cm_ids = process.env.CM_IDS.split(','); // change management id's
const repo_name = process.env.REPO_NAME;
const branch_name = process.env.BRANCH_NAME;
const pr_url = process.env.PR_URL;
const jira_url = process.env.JIRA_URL;
const developerUsername = process.env.DEVELOPER_USERNAME;

var ids = cm_ids
const numOfCM_IDS = cm_ids.length;

if(jira_ids) {
    jira_ids = jira_ids.split(',');
    ids = cm_ids.concat(jira_ids)
}

async function main() {

    var developerFullname = null
    async function getDeveloperName() {

        const response = await fetch(`https://api.github.com/users/${developerUsername}`,{method: 'GET'});
        if(!response.ok) {
            console.log(`Developer's information not found!`)
        } else {
            const developer = await response.json();
            if(developer.name !== null) {
                developerFullname = developer.name;
            }
        }
    }

    await getDeveloperName();

    const bodyDataCM = JSON.stringify({
        "body": {
            "type": "doc",
            "version": 1,
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        { "type": "text", "text": "Changes are merged successfully. Pull Request details:-" },
                        { "type": "hardBreak" },
                        { "type": "text", "text": "Developer username: ", "marks": [{ "type": "strong" }] },
                        { "type": "text", "text": `${developerUsername}` },
                        { "type": "text", "text": ", Fullname: ", "marks": [{ "type": "strong" }] },
                        { "type": "text", "text": `${developerFullname}` },
                        { "type": "hardBreak" },
                        { "type": "text", "text": "Repository: ", "marks": [{ "type": "strong" }] },
                        { "type": "text", "text": `${repo_name}` },
                        { "type": "text", "text": ", Branch: ", "marks": [{ "type": "strong" }] },
                        { "type": "text", "text": `${branch_name}` },
                        { "type": "hardBreak" },
                        { "type": "text", "text": "PR URL: ", "marks": [{ "type": "strong" }] },
                        { "type": "text", "text": `${pr_url}` },
                        { "type": "hardBreak" },
                        { "type": "text", "text": "Worked on Jira issues: ", "marks": [{ "type": "strong" }] },
                        { "type": "text", "text": `${jira_ids}` }
                    ]
                }
            ]
        }
    });    

    const bodyDataJiraIssue = JSON.stringify({
        "body": {
            "type": "doc",
            "version": 1,
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        { "type": "text", "text": "Changes are merged successfully. Pull Request details:-" },
                        { "type": "hardBreak" },
                        { "type": "text", "text": "Developer username: ", "marks": [{ "type": "strong" }] },
                        { "type": "text", "text": `${developerUsername}` },
                        { "type": "text", "text": ", Fullname: ", "marks": [{ "type": "strong" }] },
                        { "type": "text", "text": `${developerFullname}` },
                        { "type": "hardBreak" },
                        { "type": "text", "text": "Repository: ", "marks": [{ "type": "strong" }] },
                        { "type": "text", "text": `${repo_name}` },
                        { "type": "text", "text": ", Branch: ", "marks": [{ "type": "strong" }] },
                        { "type": "text", "text": `${branch_name}` },
                        { "type": "hardBreak" },
                        { "type": "text", "text": "PR URL: ", "marks": [{ "type": "strong" }] },
                        { "type": "text", "text": `${pr_url}` },
                        { "type": "hardBreak" },
                        { "type": "text", "text": "Change Requests: ", "marks": [{ "type": "strong" }] },
                        { "type": "text", "text": `${cm_ids}` }
                    ]
                }
            ]
        }
    });    

    const bodyData = JSON.stringify({
        "transition": {
            "id": "7"
        },
    })

    async function postComment(issue_id, isJiraIssue) {

        console.log(`Issue ID: ${issue_id}`);
        var bodyData = bodyDataCM
        if(isJiraIssue) {
            bodyData = bodyDataJiraIssue
        }

        try {
            const response = await fetch(`${jira_url}/rest/api/3/issue/${issue_id}/comment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: bodyData
            });

            if (!response.ok) {
                console.log(`Error: ${response.status} ${response.statusText}`);
            } else {
                console.log('Comment added successfully');
            }
        } catch (error) {
            console.error(`Request failed: ${error}`);
        }
    }

    async function transitionIssue(issue_id) {
        try {
            const response = await fetch(`${jira_url}/rest/api/3/issue/${issue_id}/transitions`,{
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: bodyData
            })

            if (!response.ok) {
                console.log(`Error: ${response.status} ${response.statusText}`);
            } else {
                console.log(`Change Request '${issue_id}' transitioned successfully to 'Completed' status`);
            }
        } catch (error) {
            console.error(`Request failed: ${error}`);
        }
    }

    for(let i=0; i<ids.length; i++) {
        issue_id = ids[i];
        isJiraIssue = true;
        if(i<numOfCM_IDS) {
            isJiraIssue = false;
            // transition the Change Requests Status from 'Approved' to 'Done'
            await transitionIssue(issue_id);
        }

        // add comment
        await postComment(issue_id, isJiraIssue);
    }
}

main();