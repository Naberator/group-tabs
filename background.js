async function getTabGroups() {
     return chrome.tabGroups.query({});
}

async function getAllFreeTabs() {
    const queryInfo = {
        groupId: chrome.tabGroups.TAB_GROUP_ID_NONE
    };

    return chrome.tabs.query(queryInfo);
}

const www = "www.";
async function changeGroupName(groupId, domain) {
   const updateProperties = {};
   const startIndex = domain.indexOf(www);
   updateProperties.title = startIndex === -1 ? domain : domain.substring(startIndex + www.length);

   return chrome.tabGroups.update(groupId, updateProperties);
}

function getTabGroupsMap(tabGroups) {
    return tabGroups.reduce((map, group) => (map[group.title] = group.id,  map), {});
}

const domainRegEx = /\/\/(\w*\.?\w+)\..*/i;
function getDomain(url) {
    const matches = url.match(domainRegEx);
    return (matches && matches.length > 1) ? matches[1] : "unknown" // TODO gotta be a finer way
}

function getTabsByDomainMap (tabs) {
    const freeTabsByDomainMap = {};
    for (const tab of tabs) {
        const domain = getDomain(tab.url);
        if (!freeTabsByDomainMap[domain]) {
            freeTabsByDomainMap[domain] = {
                tabIds: []
            };
        }

        freeTabsByDomainMap[domain].tabIds.push(tab.id);
    }

    return freeTabsByDomainMap;
}

chrome.commands.onCommand.addListener(async (command) => {
    if ('group-tabs' !== command) {
        return;
    }

    const tabGroups = await getTabGroups();
    const tabGroupsMap = getTabGroupsMap(tabGroups);

    const tabs = await getAllFreeTabs();
    const freeTabsByDomainMap = getTabsByDomainMap(tabs);

    const domains = Object.keys(freeTabsByDomainMap)
    for (const domain of domains) {
        const options = {};
        const groupId = tabGroupsMap[domain];
        options.tabIds = freeTabsByDomainMap[domain].tabIds;

        if (groupId) {
            options.groupId = groupId;
            chrome.tabs.group(options);
        } else {
            const newGroupId = await chrome.tabs.group(options);
            await changeGroupName(newGroupId, domain);
        }
    }
});
