// jira-project-keys -> applications
// applications -> github repos

const projectApps = {
    'CM': ['Wizr'],
    'LS2': ['Eduvanz']
}

const appRepos = {
    'Wizr': ['repo1', 'jira-integration', 'repo2'],
    'Eduvanz': ['repo3', 'repo4', 'repo2']
}

const requiredStatus = ['approved']
// ToDo requiredJiraIdStatus

export {projectApps, appRepos, requiredStatus};