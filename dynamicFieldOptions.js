const fetch = require('node-fetch')
const dotenv = require('dotenv')

dotenv.config()

const email = process.env.EMAIL;
const apiToken = process.env.API_TOKEN;
const jira_url = process.env.JIRA_URL;


async function addOption(application) {
    const bodyData = JSON.stringify({
        "options": [
        {
            "disabled": false,
            "value": `${application}`
        },
        ]
    })

    try {
        const response = await fetch(`${jira_url}/rest/api/3/field/customfield_10337/context/10571/option`, {
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
            console.log('Option added successfully')
            const resp = await response.json()
            console.log(resp)
        }
    } catch (error) {
        console.error(`Request failed: ${error}`);
    }
}

async function deleteOption(optionId) {
    try {
        const response = await fetch(`${jira_url}/rest/api/3/field/customfield_10337/context/10571/option/${optionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            // body: bodyData
        });

        if (!response.ok) {
            console.log(`Error: ${response.status} ${response.statusText}`);
        }

    } catch (error) {
        console.error(`Request failed: ${error}`);
    }
}

const reqApplications = [];
async function getReqApplications() {

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
            return;
        }

        const response = await resp.json()
        const assets = response.issues
        for(let i=0; i<assets.length; i++) {
            const application = assets[i].fields.customfield_10342
            const status = assets[i].fields.status.statusCategory.name
            if(status == 'Done' && application != null) {
                reqApplications.push(application)
            }
        }

        console.log('Req Applications: ', reqApplications)

    } catch (error) {
        console.error(`Request failed: ${error}`);
    }

}

const curApplications = [];
async function getCurApplications() {
    
    try {
        const resp = await fetch(`${jira_url}/rest/api/3/field/customfield_10337/context/10571/option`, {
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
            return;
        }

        const response = await resp.json();
        const applications = response.values;
        for(let i=0; i<applications.length; i++) {
            // if(!reqApplications.includes(applications[i].value)) {
            //     await deleteOption(applications[i].id);
            //     console.log(`Application '${applications[i].value}' deleted successfully`);
            // }
            curApplications.push(applications[i].value)
        }

        console.log('Cur Applications: ', curApplications)

    } catch(error) {
        console.log(`Request failed: Error: ${error}`)
    }
}

async function main() {

    await getReqApplications();
    await getCurApplications();

    // add application options that are in CMDB but not in Change-Management options
    for(let i=0; i<reqApplications.length; i++) {
        if(!curApplications.includes(reqApplications[i])) {
            await addOption(reqApplications[i])
        }
    }
}

main();
