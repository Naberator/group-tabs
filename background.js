async function getTabGroups() {
     return await chrome.tabGroups.query({});
}

function getTabGroupsMap(tabGroups) {
    const map = {};
    for(const group in tabGroups) {
        map[group.title] = group.id;
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

    return await chrome.tabs.query(queryInfo);
}

const domainRegEx = /\/\/(\w*?\.\w+).*/i;
function getDomain(tab) {
    const matches = tab.url.match(domainRegEx);

    return matches[0]; // TODO gotta be a finer way
}

async function changeGroupName(groupId, domain) {
   const updateProperties = {};
   const startIndex = domain.indexOf("www.");
   updateProperties['title'] = startIndex === -1 ? domain : domain.substring(startIndex);

   await chrome.tabGroups.update(
       groupId,
       updateProperties,
       (groupId) => {
           console.log(`Created group: ${groupId}`)
       }
   );
}

chrome.commands.onCommand.addListener((command) => {
    if ('group-tabs' !== command) {
        return;
    }

    const tabGroups = getTabGroups();
    const tabGroupsMap = getTabGroupsMap(tabGroups);
    moveAllGroups(tabGroups, -1);

    const tabs = getAllFreeTabs();

    for (const tab of tabs) {
        const domain = getDomain(tab);
        const options = {};
        let afterCreation = () => {};
        if (tabGroupsMap[domain]) {
            options['groupId'] = tabGroupsMap[domain];
        } else {
            afterCreation = (groupId) => {
                changeGroupName(groupId, domain);
            }
        }

        chrome.tabs.group(options, afterCreation);
    }
});


