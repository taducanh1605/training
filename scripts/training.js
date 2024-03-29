var inputCSV = new Vue({
    el: '#upper-content',
    data: {
        textMode: 'free',
        loaded: 0,
        selectSex: '',
        selectLvl: '',
        select: '',

        checkHIIT: 0,

        dataMale: [],
        dataFemale: [],
        dataPers: [],
        dataCal: [],

        listProgMale: [],
        listProgFemale: [],
        listProgPers: [],
        listProgCal: [],

        loadDataMale: fetch("./FullBodyMale.json").
            then(response => {
                return response.json();
            }).
            then(jsondata => {
                inputCSV.dataMale = jsondata;
                tempGroup = [];
                tempEx = [];
                flag = 0;
                Object.keys(jsondata).forEach(prog => {
                    if (jsondata[prog].length > 0) {
                        tempEx.push(prog);
                    }
                    else if (flag > 0) {
                        tempGroup.push(tempEx);
                        inputCSV.listProgMale.push(tempGroup);

                        tempGroup = [];
                        tempEx = [];

                        tempGroup.push(prog);
                    }
                    else {
                        tempGroup.push(prog);
                        flag = 1;
                    }
                });
                tempGroup.push(tempEx);
                inputCSV.listProgMale.push(tempGroup);
            }),
        loadDataFemale: fetch("./FullBodyFemale.json").
            then(response => {
                return response.json();
            }).
            then(jsondata => {
                inputCSV.dataFemale = jsondata;
                tempGroup = [];
                tempEx = [];
                flag = 0;
                Object.keys(jsondata).forEach(prog => {
                    if (jsondata[prog].length > 0) {
                        tempEx.push(prog);
                    }
                    else if (flag > 0) {
                        tempGroup.push(tempEx);
                        inputCSV.listProgFemale.push(tempGroup);

                        tempGroup = [];
                        tempEx = [];

                        tempGroup.push(prog);
                    }
                    else {
                        tempGroup.push(prog);
                        flag = 1;
                    }
                });
                tempGroup.push(tempEx);
                inputCSV.listProgFemale.push(tempGroup);
            }),
        loadDataPers: fetch("./FullBodyPers.json").
            then(response => {
                return response.json();
            }).
            then(jsondata => {
                inputCSV.dataPers = jsondata;
                tempGroup = [];
                tempEx = [];
                flag = 0;
                Object.keys(jsondata).forEach(prog => {
                    if (jsondata[prog].length > 0) {
                        tempEx.push(prog);
                    }
                    else if (flag > 0) {
                        tempGroup.push(tempEx);
                        inputCSV.listProgPers.push(tempGroup);

                        tempGroup = [];
                        tempEx = [];

                        tempGroup.push(prog);
                    }
                    else {
                        tempGroup.push(prog);
                        flag = 1;
                    }
                });
                tempGroup.push(tempEx);
                inputCSV.listProgPers.push(tempGroup);
            }),
        loadDataCal: fetch("./Calisthenic.json").
            then(response => {
                return response.json();
            }).
            then(jsondata => {
                inputCSV.dataCal = jsondata;
                tempGroup = [];
                tempEx = [];
                flag = 0;
                Object.keys(jsondata).forEach(prog => {
                    if (jsondata[prog].length > 0) {
                        tempEx.push(prog);
                    }
                    else if (flag > 0) {
                        tempGroup.push(tempEx);
                        inputCSV.listProgCal.push(tempGroup);

                        tempGroup = [];
                        tempEx = [];

                        tempGroup.push(prog);
                    }
                    else {
                        tempGroup.push(prog);
                        flag = 1;
                    }
                });
                tempGroup.push(tempEx);
                inputCSV.listProgCal.push(tempGroup);
            }),
        programName: '',
        exLinkSearch: [],
        fileInput: '',
        exNameOnly: []
    },
    methods: {
        init() {
            this.exLinkSearch = [];
            this.exNameOnly = [];
        },
        //read file csv
        onFileChange(e) {
            var files = e.target.files || e.dataTransfer.files;
            if (!files.length)
                return;
            this.createInput(files[0]);
        },
        createInput(file) {
            //get name of program
            this.programName = file.name.replace('.csv', '');

            //wait for reading
            let promise = new Promise((resolve, reject) => {
                var reader = new FileReader();
                reader.onload = e => {
                    resolve((this.fileInput = reader.result));
                };
                reader.readAsText(file);
            });

            //get result
            promise.then(
                result => {

                    //clear list
                    p = document.getElementById('myExList');
                    p.innerHTML = "";

                    //handle a successful result
                    this.init();
                    vm.init();
                    this.csvToArray();
                    //console.log(this.exLinkSearch);
                    //console.log(this.exNameOnly);

                    this.listExHandle();
                },
                error => {
                    //handle an error
                    console.log(error);
                }
            );
        },

        //parse file csv from text
        csvToArray(delimiter = ",") {
            const rows = this.fileInput.slice(this.fileInput.indexOf("\n") + 1).split("\r\n");
            (rows[rows.length - 1] == '') ? rows.pop() : null;

            //load data in each array
            rows.forEach(row => {
                temp = row.split(',');
                tempName = temp[0].split('+');
                for (var i = 0, nameI; (nameI = tempName[i]); i++) {
                    if (nameI.indexOf('?') > -1) {
                        this.checkHIIT = 1;

                        // [2022-09-10-DA] pour replacer x?[-?-?]
                        var nbrIn = (nameI.match(/[?]-/g) || []).length;
                        for (var y = nbrIn; y > 0; y--) {
                            var repS = nameI.length - nameI.split("").reverse().join("").indexOf('-?'),
                                repE = nameI.indexOf('?', repS),
                                rep = parseInt(nameI.slice(repS, repE));
                            nameI = nameI.substring(0, repS - 1) + ' -' + nameI.substring(repS + nameI.substring(repS).indexOf('?')).replace('?', `<input class="inHIIT" onInput="goal(${rows.indexOf(row)},${i}, this.value, ${y})" type="number" min="0" value="${rep}">`);
                        }

                        // [2022-09-10-DA] pour replacer [x?]-?-?
                        var repS = nameI.indexOf(' x') + 2,
                            repE = nameI.indexOf('?'),
                            rep = parseInt(nameI.slice(repS, repE));
                        nameI = nameI.substring(0, repS) + nameI.substring(repS + nameI.substring(repS).indexOf('?')).replace('?', `<input class="inHIIT" onInput="goal(${rows.indexOf(row)},${i}, this.value)" type="number" min="0" value="${rep}">`);
                        tempName[i] = nameI.replaceAll(' -', '-');
                    }
                }
                tempNameOnly = [];
                tempLinkSearch = [];
                //make set of original name
                tempName.forEach(name => {
                    newName = name.split('').reverse().join('').replace('x', '*').split('*')[1].split('').reverse().join('');
                    tempNameOnly.push(newName);
                    tempLinkSearch.push('https://www.google.com/search?q=gym+exercise+tutorial+' + newName.split(' ').join('+'));
                });
                this.exNameOnly.push(tempNameOnly);
                this.exLinkSearch.push(tempLinkSearch);
                vm.exName.push(tempName);
                vm.exSet.push(Number(temp[1]));
                vm.exRest.push(Number(temp[2]));
                vm.exSumSet += Number(temp[1]);
            });
        },

        selectHandle(selectSex) {

            if (selectSex == "Male") {
                data = this.dataMale;
            }
            else if (selectSex == "Female") {
                data = this.dataFemale;
            }
            else if (selectSex == "Pers") {
                data = this.dataPers;
            }
            else if (selectSex == "Cal") {
                data = this.dataCal;
            }

            //clear list
            p = document.getElementById('myExList');
            p.innerHTML = "";

            //parse data
            this.programName = this.select;
            this.init();
            vm.init();

            data[this.select][0].forEach(exercise => {
                tempName = exercise.split('+');
                for (var i = 0, nameI; (nameI = tempName[i]); i++) {
                    if (nameI.indexOf('?') > -1) {
                        this.checkHIIT = 1;

                        // [2022-09-10-DA] pour replacer x?[-?-?]
                        var nbrIn = (nameI.match(/[?]-/g) || []).length;
                        for (var y = nbrIn; y > 0; y--) {
                            var repS = nameI.length - nameI.split("").reverse().join("").indexOf('-?'),
                                repE = nameI.indexOf('?', repS),
                                rep = parseInt(nameI.slice(repS, repE));
                            nameI = nameI.substring(0, repS - 1) + ' -' + nameI.substring(repS + nameI.substring(repS).indexOf('?')).replace('?', `<input class="inHIIT" onInput="goal(${data[this.select][0].indexOf(exercise)},${i}, this.value, ${y})" type="number" min="0" value="${rep}">`);
                        }

                        // [2022-09-10-DA] pour replacer [x?]-?-?
                        var repS = nameI.indexOf(' x') + 2,
                            repE = nameI.indexOf('?'),
                            rep = parseInt(nameI.slice(repS, repE));
                        nameI = nameI.substring(0, repS) + nameI.substring(repS + nameI.substring(repS).indexOf('?')).replace('?', `<input class="inHIIT" onInput="goal(${data[this.select][0].indexOf(exercise)},${i}, this.value)" type="number" min="0" value="${rep}">`);
                        tempName[i] = nameI.replaceAll(' -', '-');
                    }
                }
                tempNameOnly = [];
                tempLinkSearch = [];
                tempName.forEach(name => {
                    newName = name.split('').reverse().join('').split('x ')[1].split('').reverse().join('');
                    tempNameOnly.push(newName);
                    tempLinkSearch.push('https://www.google.com/search?q=gym+exercise+tutorial+' + newName.split(' ').join('+'));

                });
                this.exNameOnly.push(tempNameOnly);
                this.exLinkSearch.push(tempLinkSearch);
                vm.exName.push(tempName);
            });
            vm.exSet = data[this.select][1];
            vm.exRest = data[this.select][2];
            data[this.select][1].forEach(exercise => { vm.exSumSet += Number(exercise); });

            this.listExHandle();
        },

        listExHandle() {
            p = document.getElementById('myExList');
            p.innerHTML = "";
            //Make list of exercises
            for (let j = 0; j < this.exNameOnly.length; j++) {
                for (let i = 0; i < this.exNameOnly[j].length; i++) {
                    let a = document.createElement('a');
                    let br1 = document.createElement('br');
                    //let br2 = document.createElement('br');
                    p.appendChild(br1);
                    //p.appendChild(br2);
                    p.appendChild(a);
                    a.innerHTML += this.exNameOnly[j][i];
                    a.href += this.exLinkSearch[j][i];
                    a.target = "_blank";
                }
                let br = document.createElement('br');
                p.appendChild(br);
            }
        },

        handleMode() {
            if (vm.count == 0) {
                if (this.textMode == "prime") {
                    this.textMode = "free";
                }
                else {
                    this.textMode = "prime";
                }
            }
        },

        handleGendreLvl(event) {
            [this.selectSex, this.selectLvl] = event.target.value.split(':');
        }
    },

});

var vm = new Vue({
    el: '#lower-content',
    data: {
        time: 0,
        timeClock: '00:00:00',
        count: 0,
        rest: 0,
        flagLetDoIt: 0,
        flagStart: 0,
        exName: [],
        exRest: [],
        exSet: [],
        exSumSet: 0,
        exOrder: 0,
        exRound: 0,
        exHold: 0,
        leftColumn: '',
        row1_1: '',
        row1_2: '',
        row1_3: '',
        row2: '',
        row3: '',
        row3_exs: [],
        row4: '',
        textbreak: 'doit',
        buttonStart: 'Start'
    },
    methods: {
        init() {
            this.time = 0;
            this.timeClock = '00:00:00';
            this.count = 0;
            this.rest = 0;
            this.flagLetDoIt = 0;
            this.flagStart = 0;
            this.exName = [];
            this.exRest = [];
            this.exSet = [];
            this.exSumSet = 0;
            this.exOrder = 0;
            this.exRound = 0;
        },
        handleStart() {
            var that = this;
            if (this.exSumSet > 0) {
                if (this.flagStart == 0) {
                    this.flagStart = 1;
                    if ((this.rest == 0) && (this.count == 0)) {
                        ring("start.wav");
                        this.count += 1;
                        [this.exOrder, this.exRound] = getOrder(this.count);
                    }
                }
                else if ((this.flagStart == 2) && (inputCSV.checkHIIT == 1)) {
                    exportCSV();
                }
                else if (this.rest > 0) {
                    this.flagStart = 0;
                }
                else {
                    if (this.count < this.exSumSet) {
                        ring("breaktime.wav");
                        this.count += 1;
                        [this.exOrder, this.exRound] = getOrder(this.count);
                        this.rest = this.exRest[this.exOrder];
                        this.exName[this.exOrder].forEach(function(exer) {
                            if (exer.split(' x')[1].indexOf('s') > -1) that.exHold = 1;
                        });
                        if (this.exHold == 1) {
                            // [2023-03-19-DA] pause for counting hold time
                            this.flagStart = 0;
                            this.exHold = 0;
                        }
                    }
                    else if (this.count == this.exSumSet) {
                        ring("finish.wav");
                        this.count += 1;
                        this.flagStart = 2;
                        // if (inputCSV.checkHIIT == 1) {exportCSV()};
                    }
                }
            }
        },

        handleNext() {
            if ((this.exSumSet > 0) && (this.count < this.exSumSet)) {
                this.count += 1;
                this.rest = 0;
                [this.exOrder, this.exRound] = getOrder(this.count);
            }
        },

        handleBack() {
            if ((this.exSumSet > 0) && (this.count > 1)) {
                if (this.flagStart == 2) {
                    this.flagStart = 1;
                }
                this.count -= 1;
                this.rest = 0;
                [this.exOrder, this.exRound] = getOrder(this.count);
                //console.log(this.count);
            }
        },

    }
});

//console.log(vm.fileInput)
let checkScreen = 0;
setInterval(updateContext, 10);
updateContext;
setInterval(updateTime, 1000);
updateTime();


/*----------------------------------------------------------------------
Prevent Reload page when workout
----------------------------------------------------------------------*/
window.onbeforeunload = function () {
    if (vm.time > 0) {
        return "Do you want to reload page?";
    };
};


/*----------------------------------------------------------------------
Prevent Lock Screen on mobile
- first event: click
- second event: hide tab
----------------------------------------------------------------------*/
document.addEventListener('click', async () => {
    if (('wakeLock' in navigator) && (checkScreen == 0) && (vm.flagStart == 1)) {
        checkScreen = 1;
        let screenLock = await navigator.wakeLock.request('screen');
    };
});

document.addEventListener('visibilitychange', async () => {
    if (('wakeLock' in navigator) && (vm.flagStart == 1)) {
        let screenLock = await navigator.wakeLock.request('screen');
    };
});



/*----------------------------------------------------------------------
Play sound for website
----------------------------------------------------------------------*/
function ring(nameRing) {
    var ring = document.createElement("a");
    ring.addEventListener('click', function () {
        var myRing = new Audio();
        myRing.autoplay = true;
        myRing.src = "data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
        myRing.src = './sound/' + nameRing;
    });
    ring.click();
};


/*----------------------------------------------------------------------
Update time and break time each 1 sec
----------------------------------------------------------------------*/
function updateTime() {
    //update Time clock

    if (vm.flagStart > 0) {
        vm.time += 1;
        hour = (vm.time - vm.time % 3600) / 3600;
        min = (vm.time - vm.time % 60 - hour * 3600) / 60;
        sec = vm.time % 60;
        vm.timeClock = zeroPadding(hour, 2) + ':' + zeroPadding(min, 2) + ':' + zeroPadding(sec, 2);
        if (vm.rest > 0) {
            vm.rest -= 1;
            vm.flagLetDoIt = 1;
            if (vm.rest == 0) {
                ring("ringGo.wav");
            }
        }
        else {
            vm.rest = 0;
        }
    }
    else if (vm.count < 2) {
        vm.time = 0;
    }

    //update loaded program
    if ((inputCSV.loaded < 1) && (vm.time > 0)) {
        inputCSV.loaded = 1;
    }
};

/*----------------------------------------------------------------------
Format time to hh:mm:ss
----------------------------------------------------------------------*/
function zeroPadding(num, digit) {
    var zero = '';
    for (var i = 0; i < digit; i++) {
        zero += '0';
    }
    return (zero + num).slice(-digit);
}


/*----------------------------------------------------------------------
Update context for each row
----------------------------------------------------------------------*/
function updateContext() {
    //update Time clock
    if (vm.exSumSet > 0) {
        if ((vm.flagStart == 0) && (vm.count == 0)) {
            vm.row1_2 = 'Training with Njk';
            vm.row2 = "";
            vm.row3 = "" + inputCSV.programName + '\n' + vm.exSet.length + ' exercise(s)';
            vm.row4 = "";
        }
        else if (vm.flagStart == 2) {
            vm.row2 = "";
            vm.row3 = "Good job!";
            vm.row4 = "";
        }
        else {
            vm.row1_1 = 'Exercise: ' + (vm.exOrder + 1) + '/' + vm.exSet.length;
            vm.row1_2 = inputCSV.programName;
            vm.row1_3 = vm.timeClock;
            if (vm.rest > 0) {
                vm.row2 = 'ROUND: ' + vm.exRound + '/' + vm.exSet[vm.exOrder];
                vm.row3_exs = vm.exName[vm.exOrder];
                vm.row4 = 'Break time: ' + vm.rest;
                vm.textbreak = 'break';
            }
            else {
                vm.row2 = 'ROUND: ' + vm.exRound + '/' + vm.exSet[vm.exOrder];
                vm.row3_exs = vm.exName[vm.exOrder];
                vm.row4 = 'Let\'s do it';
                vm.textbreak = 'doit';
            }
        }
        if (vm.flagStart == 0) {
            vm.row4 = "Ready?";
        }
    }
    else {
        vm.row1_2 = 'Training with Njk';
        vm.row2 = '';
        vm.row3 = "CHOOSE YOUR PROGRAM";
        vm.row4 = "";
    }
    //update Button Start
    (vm.flagStart == 0) ? vm.buttonStart = 'Start' :
        (vm.rest > 0) ? vm.buttonStart = 'Pause' :
            (vm.count < vm.exSumSet) ? vm.buttonStart = 'Done' :
                vm.buttonStart = 'Finish';
};


/*----------------------------------------------------------------------
Get position of exercise at the moment
----------------------------------------------------------------------*/
function getOrder(count) {
    tempCount = count;
    for (let i = 0; i < vm.exSet.length; i++) {
        if (tempCount > vm.exSet[i]) {
            tempCount -= vm.exSet[i];
        }
        else {
            return [i, tempCount];
        }
    }
}


/*----------------------------------------------------------------------
Change goal
----------------------------------------------------------------------*/
function goal(x, y, z, sub) {
    var bias = vm.exName[x][y].indexOf("value=", bias) + 7;
    for (var i = 0; i < parseInt(sub); i++) bias = vm.exName[x][y].indexOf("value=", bias) + 7;

    if (vm.delayInputHIIT) clearTimeout(vm.delayInputHIIT);
    vm.delayInputHIIT = setTimeout(function () {
        if (z != '') {
            vm.exName[x][y] = vm.exName[x][y].substring(0, bias) + z + vm.exName[x][y].substring(vm.exName[x][y].indexOf("\"", bias));
        }
    }, 500);
}


/*----------------------------------------------------------------------
Export result
----------------------------------------------------------------------*/
function exportCSV() {
    var csvContext = 'exercise,round,rest';
    for (var i = 0, exs; (exs = vm.exName[i]); i++) {
        var con = '\r\n';
        exs.forEach(ex => {
            con += (exs.indexOf(ex) > 0 ? '+' : '');
            if (ex.indexOf('input') > -1) {
                var nbrIn = (ex.match(/input/g) || []).length;
                for (var y = 0; y < nbrIn; y++) {
                    var posRep = ex.indexOf("\"", ex.indexOf("value=") + 7);

                    console.log(ex.substring(0, ex.indexOf("<input")));
                    console.log(ex.substring(ex.indexOf("value=") + 7, posRep));
                    console.log(ex.substr(ex.indexOf("<input", posRep)));
                    ex = ex.substring(0, ex.indexOf("<input")) + ex.substring(ex.indexOf("value=") + 7, posRep) + '?' +  ((ex.indexOf("<input", posRep) > -1) ? ex.substr(ex.indexOf("<input", posRep) - 1) : ' ');
                }
                console.log(ex);
            }
            con += ex;
        });
        csvContext += con + ',' + vm.exSet[i] + ',' + vm.exRest[i];
    }
    var date = new Date(),
        blob = new Blob([csvContext], { type: 'text/csv;encoding:utf-8' });
    link = document.createElement("a"),
        nameProg = inputCSV.programName.split(' @')[0];
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `${nameProg} @${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}.csv`);
    link.click();
}
