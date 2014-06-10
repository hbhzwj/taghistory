/*jslint browser: true, vars:true*/
/*global TH, chrome*/
"use strict";
var Util = TH.Util;
var Models = TH.Models;

Models.sortByTags = function (historyItems, storedTags, tags) {
    var i = 0, N, item, tstr, item_key;
    var tg = '', tagsInfo = {};
    N = tags.length;
    for (i = 0; i < N; ++i) {
        tagsInfo[tags[i]] = [];
    }

    N = historyItems.length;
    for (i = 0; i < N; ++i) {
        item = historyItems[i];
        tstr = (new Date(item.lastVisitTime)).toLocaleString();
        item.tstr = tstr;
        item_key = Models.getVisitItemKey(item);
        tg = storedTags[item_key];
        if (tg !== undefined) {
            tagsInfo[tg.tag_name].push(item);
        }
    }
    return tagsInfo;
};

Models.massage = function (historyItems, groups, storedTags) {
// function massage(historyItems, groups, storedTags) {
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
//
    var group, history = [];
    var urlInfo;
    var i, j;
    var idx, item;
    var visits;
    var firstTimeInGroup;
    var groupDate;

    var IDMap = {};
    var visitId, groupID, visitTime, tag, vk;
    var visitItem;
    var groupItem;

    var gLen = groups.length;
    for (i = 0; i < gLen; i += 1) {
        group = groups[i];
        visits = [];
        for (j = 0; j < group.length; j += 1) {
            idx = group[j];
            item = historyItems[idx];
            urlInfo = Util.parseURL(item.url);
            visitId = 'c' + i.toString() + '-' + j.toString();
            visitTime = (new Date(item.lastVisitTime)).toLocaleString();
            vk = Models.getVisitItemKey(item);
            if (storedTags[vk] === undefined) {
                tag = [];
            } else {
                tag = storedTags[vk];
                // console.log('there is stored Tags for: ' + visitTime + ': ' + tag);
                // debugger;
            }
            // tag = [{tag_name:"test"}];
            visitItem = {
                isGrouped: false,
                url: item.url,
                domain: urlInfo.host,
                title: Util.truncStr(item.title, 80),
                host: urlInfo.host,
                path: urlInfo.path,
                id: visitId,
                tag: tag,
                time: visitTime,
                seconds: item.lastVisitTime
            };
            visits.push(visitItem);
            IDMap[visitId] = visitItem;
        }

        firstTimeInGroup = historyItems[group[0]].lastVisitTime;
        groupDate = new Date(firstTimeInGroup);
        groupID = 'i-' + i.toString();
        groupItem = {
            timeStamp: firstTimeInGroup,
            time: groupDate.toLocaleString(),
            id: 'i-' + i.toString(),
            visits: visits,
            interval_id: groupID,
        };
        history.push(groupItem);
        IDMap[groupID] = groupItem;
    }


    history.sort(function (a, b) {return b.timeStamp - a.timeStamp; });
    return {
        history: history,
        IDMap: IDMap
    };
};


// search dataset.id recursively. At most 2 levels.
// function searchDatasetID(target, i) {
Models.searchDatasetID = function (target, i) {
    var id = target.dataset.id;
    if ((id === undefined) && (i <= 2)) {
        return Models.searchDatasetID(target.parentElement, i + 1);
    }
    console.log("id: " + id);
    return id;
};




/*jslint unparam: false*/

// fetchAllData Required
// function fetchAllData(searchQuery, callback, paras) {
Models.fetchAllData = function (searchQuery, callback, paras) {
    chrome.history.search(searchQuery, function (historyItems) {
        var i = 0,
            k = "",
            keys = [],
            N = historyItems.length;
        for (i = 0; i < N; ++i) {
            k = Models.getVisitItemKey(historyItems[i]);
            keys.push(k);
        }
        chrome.storage.sync.get(keys, function (storedTags) {

            chrome.storage.sync.get('tagList', function (tagList) {
                if (undefined === tagList.tagList) {
                    tagList.tagList = [];
                }
                callback({historyItems: historyItems,
                          storedTags: storedTags,
                          tagList: tagList}, paras);
            });
        });
    });
};


Models.getVisitItemKey = function (visit) {
    // return timeStamp;
    // function GetBaseUrl(url) {
    //     try {
    //         var start = url.indexOf('//');
    //         if (start < 0)
    //             start = 0 
    //         else 
    //             start = start + 2;

    //         var end = url.indexOf('/', start);
    //         if (end < 0) end = url.length - start;

    //         var baseURL = url.substring(start, end);
    //         return baseURL;
    //     }
    //     catch (arg) {
    //         return null;
    //     }
    // }
    // debugger;
    return visit.url.split("#")[0].split("&")[0].split('?')[0];
    // return GetBaseUrl(visit.url);
};

Models.addTag = function (visit, tag, callback) {
    visit.tag = {tag_name: tag}; // Only allow one tag for each visit
    // debugger;

    var obj = {};
    var key = Models.getVisitItemKey(visit);
    console.log("store: k: " + key + " val: " + visit.tag);
    obj[key] = visit.tag;
    ++Models.addTag.prototype.visitNum;
    chrome.storage.sync.set(obj, function () {
        --Models.addTag.prototype.visitNum;
        console.log("addTag.prototype.visitNum: " + Models.addTag.prototype.visitNum);
        if (Models.addTag.prototype.visitNum === 0) {
            console.log("run callback");
            callback();
            // callbackHandle();
        }
    });
    console.log("addTag.prototype.visitNum: " + Models.addTag.prototype.visitNum);
};

Models.divideData = function (storedInfo, interval) {
    var groups = Util.groupItems(Util.getTimeStamps(storedInfo.historyItems, 0),
                                 interval);
    return Models.massage(storedInfo.historyItems,
                             groups,
                             storedInfo.storedTags);
};

// function init(TH) {
Models.init = function () {
    // var microsecondsPerWeek = 1000 * 60 * 60 * 24 * 7;
    var oneWeekAgo = (new Date()).getTime() - TH.Para.query_time;
    var searchQuery = {
        'text': '',
        'startTime': oneWeekAgo,
    };


    Models.fetchAllData(searchQuery, function (storedInfo) {
        var interval = TH.Views.intervalValue();
        console.log("interval: " + interval);
        var massageInfo = TH.Models.divideData(storedInfo, interval);
        Models.massageInfo = massageInfo;
        TH.Store.storedInfo = storedInfo;

        TH.Views.renderHistory(massageInfo);
        TH.Views.renderTagsMenu(massageInfo, storedInfo.tagList.tagList,
                                function () { TH.Views.renderHistory(massageInfo); });
    });


};

Models.updateTagList = function (tagList, callback) {
    chrome.storage.sync.set({tagList: tagList}, callback);
};

Models.deleteTag = function (tag) {
    chrome.storage.sync.get('tagList', function (obj) {
        if (undefined === obj.tagList) {
            obj.tagList = [];
        }

            // debugger;
        // remove tags from an array
        var newTagList = [];
        var tagListLen = obj.tagList.length;
        var tl;
        var i;
        for (i = 0; i < tagListLen; ++i) {
            tl = obj.tagList[i];
            if (tl.tag_name !== tag) {
                newTagList.push(tl);
            }
        }
        // update tag
        console.log("remove tag: " + tag);
        Models.updateTagList(newTagList);
        // TH.Views.refreshTagsMenu(newTagList);
        TH.Views.renderTagsMenu(Models.massageInfo, newTagList);
    });
};


