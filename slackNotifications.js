const fetch = require('node-fetch')
const dotenv = require('dotenv')
const { IncomingWebhook } = require('@slack/webhook');

dotenv.config();

const email = process.env.EMAIL;
const apiToken = process.env.API_TOKEN;
const cm_ids = process.env.CM_IDS.split(',');
const pr_url = process.env.PR_URL
const workflowChanged = process.env.IS_WORKFLOW_YML_CHANGED;
const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
const workflowRun = process.env.WORKFLOW_RUN;
const slackInfraChannel = process.env.SLACK_INFRA_CHANNEL;
const userName = process.env.SLACK_AGENT_NAME;
const jira_url = process.env.JIRA_URL;
const slackChannels = [];


async function getChannels(asset) {

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
        return;
    }

    const response = await resp.json()
    const assets = response.issues
    for(let i=0; i<assets.length; i++) {
        const status = assets[i].fields.status.statusCategory.name
        if(status !== 'Done') {
            continue;
        }

        const application = assets[i].fields.customfield_10342
        const slackChannel = assets[i].fields.customfield_10351

        if(slackChannel !== null && application == asset && !slackChannels.includes(slackChannel)) {
            slackChannels.push(slackChannel)
        }
    }
}

async function getSlackChannels(issue_id) {
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
        return;
    }

    // Check if data.fields is undefined or empty
    if (!data.fields) {
        return;
    }

    // Get the issue status
    const dataFields = data.fields
    const applicationsField = dataFields.customfield_10337
    if(applicationsField == null) {
        return;
    }

    const size = Object.keys(applicationsField).length;
    for(let i=0; i<size; i++) {
        await getChannels(applicationsField[i].value);
    }
}


const message_EditedWorkflow = {
    channel: slackInfraChannel,
    username: userName,
    icon_emoji: 'neutral_face',
    text: `Alert: workflow.yml file has been edited in the pull request!`,
    blocks: [{type: "section",text: {type: "mrkdwn",text: `*Alert: workflow.yml file* has been modified in the pull request!\n<${pr_url}|View PR>`}}]
}

async function main() {

    for(let i=0; i<cm_ids.length; i++) {
        await getSlackChannels(cm_ids[i]);
    }

    for(let i=0; i<slackChannels.length; i++) {
        const message_OpenedPR = {
            channel: slackChannels[i],
            username: userName,
            icon_emoji: 'neutral_face',
            text: `A new Pull Request is raised!`,
            blocks: [ {type: "section",text: {type: "mrkdwn",text: `A new Pull Request is raised!\n<${pr_url}|View PR>`}}]
        }
        
        const message_MergedPR = {
            channel: slackChannels[i],
            username: userName,
            icon_emoji: 'neutral_face',
            text: `A new Pull Request is merged!`,
            blocks: [ {type: "section",text: {type: "mrkdwn",text: `*A new Pull Request is merged!*\n<${pr_url}|View PR>`}}]
        }

        const webhook = new IncomingWebhook(slackWebhookUrl);
        var message = message_MergedPR;
        if(workflowRun == 'opened') message = message_OpenedPR;
        await webhook.send(message);
    }

    if(workflowChanged == 'yes') {
        const webhook = new IncomingWebhook(slackWebhookUrl);
        await webhook.send(message_EditedWorkflow);
        console.log('Error: workflow.yml file has been edited in this PR')
        process.exit(1);
    }
}

main();