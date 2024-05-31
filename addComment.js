import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const email = process.env.EMAIL;
const apiToken = process.env.API_TOKEN;
const issue_id = process.env.ISSUE_ID;
const commit_id = process.env.COMMIT_ID;
const repo_name = process.env.REPO_NAME;
const branch_name = process.env.BRANCH_NAME;

const bodyData = JSON.stringify({
    "body": {
        "type": "doc",
        "version": 1,
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {
                        "type": "text",
                        "text": `Repository: ${repo_name}\nBranch: ${branch_name}\nCommit ID: ${commit_id}`
                    }
                ]
            }
        ]
    }
});
// comment
async function postComment() {
    console.log(`Issue ID: ${issue_id}`);
    try {
        const response = await fetch(`https://eduvanz.atlassian.net/rest/api/3/issue/${issue_id}/comment`, {
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

postComment();
