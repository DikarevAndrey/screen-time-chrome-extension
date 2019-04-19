'use strict';

//TODO: разделить код на файлы-бэкграунд скрипты
chrome.runtime.onInstalled.addListener(function() {
    console.log('installed');
    chrome.storage.local.clear();
    // development
    chrome.storage.sync.clear();
    chrome.storage.sync.get('screenTimeHistory', function(screenTimeData) {
        if (!screenTimeData['screenTimeHistory']) {
            chrome.storage.sync.set({
                'screenTimeHistory': null,
            });
        }
    });
});

// смена вкладок
chrome.tabs.onActivated.addListener(function(activeInfo) {
    console.log('tab switched');

    // добавить в историю предыдущий просмотр
    chrome.storage.local.get('activeView', function(activeViewData) {
        if (activeViewData['activeView'] === undefined) {
            return;
        }
        const prevViewDuration = Math.floor((Date.now() - activeViewData['activeView']['startTime']) / 1000);
        const prevViewDomainPath = activeViewData['activeView']['domainPath'];

        addToHistory({ viewDomainPath: prevViewDomainPath, viewDuration: prevViewDuration });
    });

    // запись информации о новой вкладке в локальное хранилище
    chrome.tabs.get(activeInfo.tabId, function(activeTab) {
        if (activeTab === undefined) {
            const activeView = createActiveViewObject(undefined);
            chrome.storage.local.set({activeView});
            return;
        }

        const url = activeTab.url;
        const re = /^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^:\/?\n]+)/;
        const domainPath = url.match(re)[1];

        let activeView = undefined;
        if (domainPath !== 'chrome') {
            activeView = createActiveViewObject(domainPath);
        } else {
            activeView = createActiveViewObject(undefined);
        }
        chrome.storage.local.set({activeView});
    });
});

// изменение урла вкладки или ее обновление
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, activeTab) {
    chrome.tabs.query({active: true, lastFocusedWindow: true}, function (arrayOfTabs) {
        if (tabId === arrayOfTabs[0].id) {
            if (changeInfo.status == 'complete' && activeTab.status == 'complete' && activeTab.url != undefined) {
                console.log('tab updated');

                chrome.storage.local.get('activeView', function(activeViewData) {
                    if (activeViewData['activeView'] === undefined) {
                        return;
                    }
                    const prevViewDuration = Math.floor((Date.now() - activeViewData['activeView']['startTime']) / 1000);
                    const prevViewDomainPath = activeViewData['activeView']['domainPath'];

                    addToHistory({ viewDomainPath: prevViewDomainPath, viewDuration: prevViewDuration });
                });

                const url = activeTab.url;
                const re = /^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^:\/?\n]+)/;
                const domainPath = url.match(re)[1];

                let activeView = undefined;
                if (domainPath !== 'chrome') {
                    activeView = createActiveViewObject(domainPath);
                } else {
                    activeView = createActiveViewObject(undefined);
                }
                chrome.storage.local.set({activeView});
            }
        }
    });
});

// смена фокуса на окне
chrome.windows.onFocusChanged.addListener(function(windowId) {
    if (windowId === -1) {
        console.log('out of chrome');
        chrome.storage.local.get('activeView', function(activeViewData) {
            if (!activeViewData['activeView']) {
                return;
            }
            const prevViewDuration = Math.floor((Date.now() - activeViewData['activeView']['startTime']) / 1000);
            const prevViewDomainPath = activeViewData['activeView']['domainPath'];

            addToHistory({ viewDomainPath: prevViewDomainPath, viewDuration: prevViewDuration });
            let activeView = createActiveViewObject(undefined);
            chrome.storage.local.set({activeView});
        });
    } else {
        console.log('in chrome, window', windowId);
        chrome.tabs.query({active: true, lastFocusedWindow: true}, function (arrayOfTabs) {
            let activeTab = arrayOfTabs[0];
            let url = activeTab.url;
            let domainPath = undefined;
            let re = /^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^:\/?\n]+)/;
            if (url !== undefined) {
                domainPath = url.match(re)[1];
            }
            let activeView = undefined;
            if (domainPath !== 'chrome') {
                activeView = createActiveViewObject(domainPath);
            } else {
                activeView = createActiveViewObject(undefined);
            }
            chrome.storage.local.set({activeView});
        });
    }
});

// закрытие окна - запускается после смены фокуса
chrome.windows.onRemoved.addListener(function(windowId) {
    console.log('window closed', windowId);
    chrome.storage.local.get('activeView', function(activeViewData) {
        chrome.windows.getLastFocused(function(window) {
            if (window.id === windowId) {
                if (!activeViewData['activeView']) {
                    return;
                }
                const prevViewDuration = Math.floor((Date.now() - activeViewData['activeView']['startTime']) / 1000);
                const prevViewDomainPath = activeViewData['activeView']['domainPath'];

                addToHistory({ viewDomainPath: prevViewDomainPath, viewDuration: prevViewDuration });
                let activeView = createActiveViewObject(undefined);
                chrome.storage.local.set({activeView});
            }
        });
    });
});

// добавляет в историю домен и время, проведенное на нем
function addToHistory({ viewDomainPath, viewDuration }) {
    chrome.storage.sync.get('screenTimeHistory', function(screenTimeData) {
        if (screenTimeData['screenTimeHistory'] != null) {
            if (screenTimeData['screenTimeHistory'][viewDomainPath]) {
                screenTimeData['screenTimeHistory'][viewDomainPath] += viewDuration;
            } else {
                screenTimeData['screenTimeHistory'][viewDomainPath] = viewDuration;
            }
        } else {
            screenTimeData['screenTimeHistory'] = {[viewDomainPath]: viewDuration};
        }

        chrome.storage.sync.set({
            'screenTimeHistory': screenTimeData['screenTimeHistory'],
        });
    });
}

// создает объект активного view
function createActiveViewObject(domainPath) {
    let activeView = Object.create(null);
    if (domainPath === undefined) {
        activeView['startTime'] = undefined;
        activeView['domainPath'] = undefined;
    } else {
        activeView['startTime'] = Date.now();
        activeView['domainPath'] = domainPath;
    }
    return activeView;
}