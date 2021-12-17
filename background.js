async function getTabGroups() {
     return chrome.tabGroups.query({});
}

function getTabGroupsMap(tabGroups) {
    const map = {};
    for(const group in tabGroups) {
        map[group.title] = {
            id: group.id
        };
    }

    return map;
}

function moveAllGroups(tabGroups, index) {
    if (!tabGroups || tabGroups < 1) {
        return;
    }

    const moveProperties = {
        index: index
    };

    for (const group of tabGroups) {
        chrome.tabGroups.move(group.id, moveProperties);
    }
}

async function getAllFreeTabs() {
    const queryInfo = {
        groupId: chrome.tabGroups.TAB_GROUP_ID_NONE
    };

    return chrome.tabs.query(queryInfo);
}

const domainRegEx = /\/\/(\w*?\.\w+).*/i;
function getDomain(url) {
    const matches = url.match(domainRegEx);
    const result = (matches && matches.length > 1) ? matches[1] : "unknown";

    return result // TODO gotta be a finer way
}

async function changeGroupName(groupId, domain) {
   const updateProperties = {};
   const startIndex = domain.indexOf("www.");
   updateProperties.title = startIndex === -1 ? domain : domain.substring(startIndex);

   await chrome.tabGroups.update(
       groupId,
       updateProperties,
       (groupId) => {
           console.log(`Created group: ${groupId}`)
       }
   );
}

chrome.commands.onCommand.addListener(async (command) => {
    if ('group-tabs' !== command) {
        return;
    }

    const tabGroups = await getTabGroups();
    const tabGroupsMap = getTabGroupsMap(tabGroups);
    moveAllGroups(tabGroups, -1);

    const tabs = await getAllFreeTabs();
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

    for (const domain of Object.keys(freeTabsByDomainMap)) {
        const options = {};
        const groupId = tabGroupsMap[domain];
        options.tabIds = freeTabsByDomainMap[domain].tabIds;

        if (groupId) {
            options.groupId = groupId;
            await chrome.tabs.group(options);
        } else {
            await chrome.tabs.group(options, (groupId) => changeGroupName(groupId, domain));
        }
    }
});
