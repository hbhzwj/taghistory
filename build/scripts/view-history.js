// group items according the timestamps for each item.
// item (i) and (i+1) belongs to different groups if t[i+1]  - t[i] > delta
// UNIT: the unit of delta is milliseconds
// ASSUMPTION: timeStamps is in descending order
function groupItems(timeStamps, delta) {
    var lastTime = 0;
    var groups = {}, group = [];
    var j = 0;
    var interval;
    for(var i = timeStamps.length; i >=0 ; --i) {
        interval = timeStamps[i] - lastTime;
        if (interval < delta) {
            group.push(i);
        } else if (group.length > 0){
            // groups.push(group);
            groups[j] = group;
            ++j;
            group = [i];
        } else {
            // ignore
        }
        lastTime = timeStamps[i];

    }
    group[j] = group;
    return groups;
}

function parseURL(url) {
    var pathArray = url.split('/');
    var host = pathArray[2] + '/';
    var path = pathArray[3];

    return {
        host: host, 
        path: path
    };
}


function massage(historyItems, groups) {

    var group, history = [];
    var urlInfo;
    for (i in groups) {
        group = groups[i];
        var idx, item;
        var visits = [];
        for(var j = 0; j < group.length; ++j) {
            idx = group[j];
            item = historyItems[idx];
            urlInfo = parseURL(item.url);
            visits.push({
                isGrouped: false,
                url: item.url,
                domain: urlInfo.host,
                title: item.title,
                host: urlInfo.host,
                path: urlInfo.path,
                id: 'c' + i.toString() + '-' + j.toString()
            });

        }


        var firstTimeInGroup = historyItems[group[0]].lastVisitTime;
        groupDate = new Date(firstTimeInGroup);
        history.push({
            time: groupDate.toISOString(),
            id: 'id',
            visits: visits
        });

    }

    return history;
}

function buildHistoryData(divName) {
    var microsecondsPerWeek = 1000 * 60 * 60 * 24 * 7;
    var oneWeekAgo = (new Date).getTime() - microsecondsPerWeek;

    var searchQuery = {
        'text': '',
        'startTime': oneWeekAgo,
    };

    var data = {
        i18n_prompt_delete_button: 'delete',
        i18n_expand_button: 'button',
        i18n_collapse_button: 'collapse',
        i18n_search_by_domain: 'More for this site',
        i18n_prompt_delete_button: 'prompt_delete',
    };

    function doneSearchQuery(historyItems) {
        // FOr each history iterm, get deails
        var history = []
        var item, visits, lastVisitDate, bundle;


        // Get Time information About Each Visit
        // FIXME now only the last visit time for each history Item
        var timeStamps = []
        for(var i = 0; i < historyItems.length; ++i) {
            timeStamps.push(historyItems[i].lastVisitTime);
        }

        var groups = groupItems(timeStamps, 100000);
        // console.log("groups: " + groups);
        globalGroups = groups;
        data['history'] = massage(historyItems, groups);

        var template = BH.Templates['day_results'];
        var html = Mustache.to_html(template, data);
        //
        document.getElementById(divName).innerHTML = html;
    }

    chrome.history.search(searchQuery, doneSearchQuery)
}

buildHistoryData("history_items");
