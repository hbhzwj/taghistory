// Massage the history data into format required by Mustache
// Parameters
// ---------------
// historyItems : array
// groups : array of array 
//      Each element in groups is an array, which itselft consists of several ints.
//
// Returns
// --------------
// history : array of objects
//       timeStamp: 
//       time
//       id
//       visits
//       interval_id
//
// idToPos : array of array
//      map id to position of the records.
function massage(historyItems, groups) {

    var group, history = [];
    var urlInfo;
    var i, j;
    var idx, item;
    var visits;
    var firstTimeInGroup;
    var groupDate;

    var idToPos = {};
    var visitId, groupID;

    for(i = 0; i < groups.length; ++i) {
        group = groups[i];
        visits = [];
        for(j = 0; j < group.length; ++j) {
            idx = group[j];
            item = historyItems[idx];
            urlInfo = parseURL(item.url);
            visitId = 'c' + i.toString() + '-' + j.toString();
            
            visits.push({
                isGrouped: false,
                url: item.url,
                domain: urlInfo.host,
                title: item.title,
                host: urlInfo.host,
                path: urlInfo.path,
                id: visitId,
                tag: [],
                time: (new Date(item.lastVisitTime)).toLocaleString()
            });
            idToPos[visitId] = [i, j];
        }

        firstTimeInGroup = historyItems[group[0]].lastVisitTime;
        groupDate = new Date(firstTimeInGroup);
        groupID = 'i-' + i.toString();
        history.push({
            timeStamp: firstTimeInGroup,
            time: groupDate.toLocaleString(),
            id: 'i-' + i.toString(),
            visits: visits,
            interval_id: groupID,
        });
        idToPos[groupID] = [i];
    }


    history.sort(function (a, b){return b.timeStamp - a.timeStamp;});
    return {history: history, 
        idToPos: idToPos};
}


function dragAndTag(info) {
    console.log('run dragAndTag');
    function process_visit(i, visit) {
        visit.addEventListener('dragstart', 
                               function (ev) {
                                   ev.dataTransfer.setData("itemID", ev.target.dataset.id);
                                   console.log("dragstart run");
                               },
                               false);
    }

    $('.history').each(process_visit);

    function addTags(itemPos, tag) {
        console.log("run addTags");
        addTag = function (i, j, tag) {
            console.log("Add (" + i + ", " + j + ")");
            var visit = info.history[i].visits[j];
            visit.tag.push({tag_name: tag});
            // info.history[i].visits[j].tag.push({tag_name: tag});
            // FIXME Synchronize it into chrome storage.
            chrome.storage.sync.set(visit.time, visit.tag);
        }

        var j;
        if (itemPos.length === 1) { // group item
            groupItem = info.history[itemPos[0]];
            for (j = 0; j < groupItem.visits.length; ++j) {
                addTag(itemPos[0], j, tag);
            }
        } else if (itemPos.length === 2) { // visit item
            addTag(itemPos[0], itemPos[1], tag);
        }
    }

    function tagAnimate(target, left, top) {
        var rect = target.getBoundingClientRect();
        $("p.speech").css("left", rect.right);
        $("p.speech").css("top", rect.bottom);
        $("p.speech").animate({top:"+=30px", opacity:"1"});
        $("p.speech").animate({top:"-=30px", opacity:"0"});

        var orig_style = target.style;
        target.setAttribute('style', 'background: #15C; color: white;');
        var showTime = 200;
        window.setInterval(function (){target.setAttribute('style', orig_style);}, showTime);
    }

    function addTagEventListener(idx, tag) {
        tag.addEventListener('dragover', function (ev) {ev.preventDefault();}, false);
        tag.addEventListener('drop', function (ev) {
            ev.preventDefault();
            var itemID = ev.dataTransfer.getData("itemID");
            var itemPos = info.idToPos[itemID];
            if (itemPos === undefined) { debugger;}
            var tag = ev.target.textContent;
            addTags(itemPos, tag);
            tagAnimate(ev.target);

        }, false);
    }
    $('.navigation #tags_menus #tag1').each(addTagEventListener);

}

function getTimeStamps(historyItems) {
    // Get Time information About Each Visit
    // FIXME now only the last visit time for each history Item
    var timeStamps = [];
    var i;
    for(i = 0; i < historyItems.length; ++i) {
        timeStamps.push(historyItems[i].lastVisitTime);
    }
    return timeStamps;
}

function display(historyItems, template, data, divName, storedTags, timeStamps) {
    var groups = groupItems(timeStamps, 100000);
    var massageInfo = massage(historyItems, groups);
    data.history = massageInfo.history;
    var html = Mustache.to_html(template, data);
    document.getElementById(divName).innerHTML = html;
    dragAndTag(massageInfo);
}

function buildHistoryData(divName, searchQuery) {
    var data = {
        i18n_expand_button: 'button',
        i18n_collapse_button: 'collapse',
        i18n_search_by_domain: 'More for this site',
        i18n_prompt_delete_button: 'prompt_delete',
    };

    chrome.history.search(searchQuery, function(history_items) {
        var timeStamps = getTimeStamps(history_items);
        chrome.storage.sync.get(timeStamps, function(storedTags) {
            display(historyItems, BH.Templates.day_results, data, divName, 
                    storedTags, timeStamps);
        });
    });
}

var microsecondsPerWeek = 1000 * 60 * 60 * 24 * 7;
var oneWeekAgo = (new Date()).getTime() - microsecondsPerWeek;
var searchQuery = {
    'text': '',
    'startTime': oneWeekAgo,
};

buildHistoryData("history_items", searchQuery);
document.getElementById("refresh_display").onclick = function() {
    alert('refresh');
}
