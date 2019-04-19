// перезаписать время начала текущего view
chrome.storage.local.get('activeView', function(activeViewData) {
    if (activeViewData['activeView'] && activeViewData['activeView']['domainPath']) {
        const activeViewStartTime = activeViewData['activeView']['startTime'];
        const activeViewDomainPath = activeViewData['activeView']['domainPath'];
        const activeViewDuration = Math.floor((Date.now() - activeViewStartTime) / 1000);

        chrome.storage.sync.get('screenTimeHistory', function(screenTimeData) {
            if (screenTimeData['screenTimeHistory'] != null) {
                if (screenTimeData['screenTimeHistory'][activeViewDomainPath]) {
                    screenTimeData['screenTimeHistory'][activeViewDomainPath] += activeViewDuration;
                } else {
                    screenTimeData['screenTimeHistory'][activeViewDomainPath] = activeViewDuration;
                }
            } else {
                screenTimeData['screenTimeHistory'] = {[activeViewDomainPath]: activeViewDuration};
            }

            chrome.storage.sync.set({
                'screenTimeHistory': screenTimeData['screenTimeHistory'],
            }, function () {
                displayScreenTime(screenTimeData['screenTimeHistory']);
            });
        });

        const activeViewObject = {
            'startTime': Date.now(),
            'domainPath': activeViewDomainPath,
        };
        chrome.storage.local.set({'activeView': activeViewObject});
    } else {
        chrome.storage.sync.get('screenTimeHistory', function(screenTimeData) {
            if (screenTimeData['screenTimeHistory']) {
                displayScreenTime(screenTimeData['screenTimeHistory']);
            } else {
                displayScreenTime(null);
            }
        });
    }
});


function displayScreenTime(screenTimeData) {
    if (screenTimeData && !(Object.keys(screenTimeData).length === 0 && screenTimeData.constructor === Object)) {
        const labels = Object.keys(screenTimeData)
            .sort((a, b) => {
                return screenTimeData[b] - screenTimeData[a]
            })
            .slice(0, 5);

        const data = labels.map((key) => (screenTimeData[key]));

        let canvas = document.getElementById('historyChart');
        canvas.hidden = false;

        let ctx = document.getElementById('historyChart').getContext('2d');
        let chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data,
                    backgroundColor: [
                        'rgba(0, 63, 92, 0.5)',
                        'rgba(88, 80, 141, 0.5)',
                        'rgba(188, 80, 144, 0.5)',
                        'rgba(255, 99, 97, 0.5)',
                        'rgba(255, 166, 0, 0.5)',
                    ],
                    borderColor: [
                        'rgba(0, 63, 92, 1)',
                        'rgba(88, 80, 141, 1)',
                        'rgba(188, 80, 144, 1)',
                        'rgba(255, 99, 97, 1)',
                        'rgba(255, 166, 0, 1)',
                    ],
                    borderWidth: 1,
                }],
                labels,
            },
            options: {
                legend: {
                    display: true,
                    position: 'right',
                },
                tooltips: {
                    callbacks: {
                        label: (tooltipItem, data) => {
                            let seconds = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
                            let domain = data.labels[tooltipItem.index];
                            return `${domain}: ${secondsToMinutesAndSeconds(seconds)}`;
                        }
                    },
                },
                title: {
                    display: true,
                    fontSize: 20,
                    text: 'Screen Time',
                },
            }
        });
    } else {
        document.getElementById('info').innerText = 'Please come back later when we collect some data.';
    }
}

function secondsToMinutesAndSeconds(secs) {
    let minutes = Math.floor(secs / 60);
    let seconds = (secs % 60).toFixed(0);
    return `${minutes} minutes ${seconds} seconds`;
}