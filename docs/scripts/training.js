var inputCSV = new Vue({
    el: '#upper-content',
    data: {
        textMode: localStorage.getItem('training.textMode') || 'free',
        loaded: 0,
        selectGen: '',
        selectLvl: '',
        select: '',
        user_name: localStorage.getItem('training.user_name') || null,
        user_email: localStorage.getItem('training.user_email') || null,
        mentor_code: localStorage.getItem('training.mentor_code') || null,

        checkHIIT: 0,

        dataMale: [],
        dataFemale: [],
        dataPers: [],
        dataCal: [],
        dataUsers: [],

        listProgMale: [],
        listProgFemale: [],
        listProgPers: [],
        listProgCal: [],
        listProgUsers: [],

        loadDataMale: fetch("./FullBodyMale.json").then(res => { return res.json() }).then(res => {
            inputCSV.dataMale = res;
            inputCSV.listProgMale = json2ListProg(res);
        }),
        loadDataFemale: fetch("./FullBodyFemale.json").then(res => { return res.json() }).then(res => {
            inputCSV.dataFemale = res;
            inputCSV.listProgFemale = json2ListProg(res);
        }),
        loadDataPers: fetch("./FullBodyPers.json").then(res => { return res.json() }).then(res => {
            inputCSV.dataPers = res;
            inputCSV.listProgPers = json2ListProg(res);
        }),
        loadDataCal: fetch("./Calisthenic.json").then(res => { return res.json() }).then(res => {
            inputCSV.dataCal = res;
            inputCSV.listProgCal = json2ListProg(res);
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

        selectHandle(selectGen) {
            var dataEx = [];

            if (selectGen == "Male") {
                dataEx = this.dataMale;
            }
            else if (selectGen == "Female") {
                dataEx = this.dataFemale;
            }
            else if (selectGen == "Pers") {
                dataEx = this.dataPers;
            }
            else if (selectGen == "Cal") {
                dataEx = this.dataCal;
            }
            else if (selectGen == "Users") {
                dataEx = this.dataUsers;
            }

            //clear list
            p = document.getElementById('myExList');
            p.innerHTML = "";

            //parse Exercise data
            this.programName = this.select;
            this.init();
            vm.init();
            vm.textMode = this.textMode;
            localStorage.setItem('training.textMode', this.textMode);
            vm.selectGen = selectGen;
            vm.programName = this.select;
            vm.selectLvl = this.selectLvl;

            dataEx[this.selectLvl][this.select][0].forEach(exercise => {
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
                            nameI = nameI.substring(0, repS - 1) + ' -' + nameI.substring(repS + nameI.substring(repS).indexOf('?')).replace('?', `<input class="inHIIT" onInput="goal(${dataEx[this.selectLvl][this.select][0].indexOf(exercise)},${i}, this.value, ${y})" type="number" min="0" value="${rep}">`);
                        }

                        // [2022-09-10-DA] pour replacer [x?]-?-?
                        var repS = nameI.indexOf(' x') + 2,
                            repE = nameI.indexOf('?'),
                            rep = parseInt(nameI.slice(repS, repE));
                        nameI = nameI.substring(0, repS) + nameI.substring(repS + nameI.substring(repS).indexOf('?')).replace('?', `<input class="inHIIT" onInput="goal(${dataEx[this.selectLvl][this.select][0].indexOf(exercise)},${i}, this.value)" type="number" min="0" value="${rep}">`);
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
            vm.exSet = dataEx[this.selectLvl][this.select][1];
            vm.exRest = dataEx[this.selectLvl][this.select][2];
            vm.exEstTime = calculateWorkoutTimeEstimate(dataEx[this.selectLvl][this.select]);
            dataEx[this.selectLvl][this.select][1].forEach(exercise => { vm.exSumSet += Number(exercise); });

            this.listExHandle();

            // Add button to switch programs after a program is selected
            addSwitchProgramButton();
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
                this.textMode = this.textMode == "prime" ? "free" : "prime";
                // Save to localStorage when user manually changes mode
                localStorage.setItem('training.textMode', this.textMode);
            }
        },

        handleGendreLvl(event) {
            [this.selectGen, this.selectLvl] = event.target.value.split(':');
            
            // save to localStorage
            localStorage.setItem('training.selectedLvl', [this.textMode, this.selectGen, this.selectLvl].join('***'));
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
        buttonStart: 'Start',
        textMode: 'free',
        selectGen: '',
        selectLvl: '',
        programName: ''
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
            this.exEstTime = 0;
            this.exSumSet = 0;
            this.exOrder = 0;
            this.exRound = 0;
        },
        handleStart() {
            var that = this;

            // Add button to switch programs when starting a workout
            if (this.count == 0) addSwitchProgramButton();

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
                        /*
                        this.exName[this.exOrder].forEach(function (exer) {
                            if (exer.split(' x')[1].indexOf('s') > -1) {
                                that.exHold = 1;
                            }
                        });
                        if (this.exHold == 1) {
                            // [2023-03-19-DA] pause for counting hold time
                            this.flagStart = 0;
                            this.exHold = 0;
                        }
                        */
                    }
                    else if (this.count == this.exSumSet) {
                        ring("finish.wav");
                        this.count += 1;
                        this.flagStart = 2;
                        if (localStorage.getItem('training.resume')) {
                            // [2025-05-14-DA] clear saved workout
                            localStorage.removeItem('training.resume');
                            localStorage.setItem('training.done', that.programName);
                        }
                        return;
                        // if (inputCSV.checkHIIT == 1) {exportCSV()};
                    }
                }
            }

            // [2025-05-11-DA] save state of training
            localStorage.setItem('training.resume', [that.textMode, that.selectGen, that.selectLvl, that.programName, that.time, that.count].join('***'));
        },

        handleNext() {
            if ((this.exSumSet > 0) && (this.count < this.exSumSet)) {
                this.count += 1;
                this.rest = 0;
                [this.exOrder, this.exRound] = getOrder(this.count);
                localStorage.setItem('training.resume', [this.textMode, this.selectGen, this.selectLvl, this.programName, this.time, this.count].join('***'));
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
                localStorage.setItem('training.resume', [this.textMode, this.selectGen, this.selectLvl, this.programName, this.time, this.count].join('***'));
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


/*----------------------------------
Read json to listProg
----------------------------------*/
function json2ListProg(json) {
    let listProg = [];
    let tempGroup = [];
    let tempEstTime = [];
    let tempEx = [];
    Object.keys(json).forEach(prog => {
        tempGroup.push(prog);
        let tmpExs = json[prog];
        Object.keys(tmpExs).forEach(ex => {
            tempEx.push(ex);
            tempEstTime.push(` (⏱️Est. ${formatTimeEstimate(calculateWorkoutTimeEstimate(tmpExs[ex]))})`);
        });
        tempGroup.push(tempEx);
        tempGroup.push(tempEstTime);

        listProg.push(tempGroup);
        tempGroup = [];
        tempEx = [];
        tempEstTime = [];
    });
    return listProg;
}

// Format time in seconds to readable format
function formatTimeEstimate(seconds) {
    if (seconds < 60) {
        return `${seconds}s`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const remainingMinutes = Math.floor((seconds % 3600) / 60);
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
}

// Calculate workout time estimate
function calculateWorkoutTimeEstimate(workoutData) {
    if (!workoutData || !Array.isArray(workoutData) || workoutData.length < 3) {
        return 0;
    }
    
    const [exercises, rounds, restTimes] = workoutData;
    let totalTime = 0;
    
    exercises.forEach((exercise, index) => {
        const exerciseRounds = rounds[index] || 1;
        const restTime = restTimes[index] || 0;
        
        // Count movements in this exercise (split by +)
        const movements = exercise.split('+');
        const movementCount = movements.length;
        
        // Each movement takes average 3 seconds
        const exerciseTime = movementCount * 60; // 90s for each movement
        
        // Total time for all rounds of this exercise
        const totalExerciseTime = exerciseTime * exerciseRounds;
        
        // 20s buffer per round + rest time after this exercise (except for last exercise)
        const bufferTime = exerciseRounds * 20;
        const postExerciseRest = (index < exercises.length - 1) ? restTime : 0;
        
        totalTime += totalExerciseTime + bufferTime + postExerciseRest;
    });
    
    return totalTime; // in seconds
}


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
        vm.timeClock = zeroPadding(hour, 2) + '.' + zeroPadding(min, 2) + '.' + zeroPadding(sec, 2);
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
            vm.row3 = "" + inputCSV.programName + '\n' + vm.exSet.length + ' exercise(s)' + '\n⏱️. ' + formatTimeEstimate(vm.exEstTime);
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
                    ex = ex.substring(0, ex.indexOf("<input")) + ex.substring(ex.indexOf("value=") + 7, posRep) + '?' + ((ex.indexOf("<input", posRep) > -1) ? ex.substr(ex.indexOf("<input", posRep) - 1) : ' ');
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

/*----------------------------------------------------------------------
Check for saved workout / saved gen when the page loads
----------------------------------------------------------------------*/
document.addEventListener('DOMContentLoaded', async function () {
    // Check login and update textMode first
    await checkLoginAndUpdateTextMode();
    
    if (!checkSavedWorkout()) {
        // choose lvl if found
        checkSavedLvl();
    }
});

/*----------------------------------------------------------------------
Check if there's a saved workout and restore it
----------------------------------------------------------------------*/
function checkSavedWorkout() {
    const savedWorkout = localStorage.getItem('training.resume');
    if (savedWorkout) {
        const [textMode, gen, level, program, time, count] = savedWorkout.split('***');

        // Add button to switch programs
        addSwitchProgramButton();

        // Restore the workout after a short delay
        setTimeout(() => {
            restoreSavedWorkout(textMode, gen, level, program, parseInt(time), parseInt(count));
        }, 500);
        return true;
    }
    return false;
}

/*----------------------------------------------------------------------
Check if there's a saved lvl and choose it
----------------------------------------------------------------------*/
function checkSavedLvl() {
    const savedLvl = localStorage.getItem('training.selectedLvl');
    if (savedLvl) {
        const [textMode, gen, level] = savedLvl.split('***');
        inputCSV.textMode = textMode;
        inputCSV.selectGen = gen;
        inputCSV.selectLvl = level;

        // [2025-05-14-DA] find the next program if found
        const doneBefore = localStorage.getItem('training.done');

        // Find the corresponding program in the dropdown
        setTimeout(() => {
            const selectElement = document.querySelector('select');
            if (selectElement) {
                for (let i = 0; i < selectElement.options.length; i++) {
                    if (selectElement.options[i].value === `${gen}:${level}`) {
                        selectElement.selectedIndex = i;
                        break;
                    }
                }
            }
            // [2025-05-14-DA] find the next program if found
            if (doneBefore) {
                var allProg = document.querySelectorAll(`optgroup[label="${level}"]>option`), lenProg = allProg.length;
                var nxt = lenProg;
                for (var i = 0; i < lenProg; i++) {
                    if (allProg[i].value == doneBefore) {
                        nxt = i - 1;
                        break;
                    }
                }
                if (nxt == -1) nxt = lenProg - 1;
                if (nxt < lenProg) restoreSavedWorkout(textMode, gen, level, allProg[nxt].value, 1, 0);
            }
        }, 500);
    }
}

/*----------------------------------------------------------------------
Restore the saved workout state
----------------------------------------------------------------------*/
function restoreSavedWorkout(textMode, gen, level, program, time, count) {
    // Set the gen and level
    inputCSV.textMode = textMode;
    inputCSV.selectGen = gen;
    inputCSV.selectLvl = level;

    // Find the corresponding program in the dropdown
    const selectElement = document.querySelector('select');
    if (selectElement) {
        for (let i = 0; i < selectElement.options.length; i++) {
            if (selectElement.options[i].value === `${gen}:${level}`) {
                selectElement.selectedIndex = i;
                break;
            }
        }
    }

    // Set the program
    inputCSV.select = program;

    // Load the program data
    inputCSV.selectHandle(gen);

    // Set the time and count
    vm.time = time;

    // Update the clock
    const hour = Math.floor(time / 3600);
    const min = Math.floor((time % 3600) / 60);
    const sec = time % 60;
    vm.timeClock = zeroPadding(hour, 2) + '.' + zeroPadding(min, 2) + '.' + zeroPadding(sec, 2);

    // Set the count and exercise order
    for (let i = 1; i <= count; i++) {
        vm.count = i;
        [vm.exOrder, vm.exRound] = getOrder(i);
    }

    // Pause the workout
    vm.flagStart = 0;

    // Update context
    updateContext();
}

/*----------------------------------------------------------------------
Clear the saved workout and refresh the page
----------------------------------------------------------------------*/
function clearSavedWorkoutAndRefresh() {
    localStorage.removeItem('training.resume');
    window.location.reload();
}

/*----------------------------------------------------------------------
Add a button to choose another program
----------------------------------------------------------------------*/
function addSwitchProgramButton() {
    // Check if button already exists to avoid duplicates
    if (document.querySelector('.switch-program-btn')) return;

    // Add a button to choose another program
    const upperContent = document.querySelector('#upper-right-content>div.row');
    const switchProgramBtn = document.createElement('button');
    switchProgramBtn.innerText = 'Click to choose an other program';
    switchProgramBtn.className = 'btn selectProg mb-3 mt-3 switch-program-btn';
    switchProgramBtn.onclick = clearSavedWorkoutAndRefresh;

    // [2025-03-25-DA] style the button
    switchProgramBtn.style.margin = '5px auto';
    switchProgramBtn.style.padding = '0px 9px 0px 9px';

    // Insert the button at the top of the upper content
    if (upperContent.firstChild) {
        upperContent.insertBefore(switchProgramBtn, upperContent.firstChild);
    } else {
        upperContent.appendChild(switchProgramBtn);
    }
}

/*----------------------------------------------------------------------
Check login and update textMode on app start
----------------------------------------------------------------------*/
async function checkLoginAndUpdateTextMode() {
    try {
        const response = await callAPI('/api/training/exercises');
        data = response.data;
        user = data.user;
        exercises = data.exercises;

        if (response && user) {
            // Check if user needs to complete registration in training app
            if (response.needsRegistration) {
                alert('You have a valid account, but you need to complete registration in the Training App first. Please register using the same email.');
                // Clear token and redirect to registration
                localStorage.removeItem('token');
                localStorage.removeItem('training.token');
                localStorage.removeItem('training.user_name');
                localStorage.removeItem('training.user_email');
                localStorage.removeItem('training.mentor_code');
                return;
            }
            
            // User is fully logged in, set textMode to 'prime'
            // localStorage.setItem('training.textMode', 'prime');
            
            // Save user info to localStorage for training app (without user_id for security)
            localStorage.setItem('training.user_name', user.name || '');
            localStorage.setItem('training.user_email', user.email || '');
            localStorage.setItem('training.mentor_code', user.mentor_id || '');
            inputCSV.user_name = user.name;
            inputCSV.user_email = user.email;
            inputCSV.mentor_code = user.mentor_id || null;
            
            console.log('User logged in:', user.name, user.email, 'mentor_id:', user.mentor_id);
            
            // Check if user profile is complete and show form if needed
            checkAndShowProfileForm();
        } else {
            // User not logged in, set textMode to 'free'
            // localStorage.setItem('training.textMode', 'free');
            
            // Clear user info from localStorage
            localStorage.removeItem('training.user_name');
            localStorage.removeItem('training.user_email');
            localStorage.removeItem('training.mentor_code');
            
            // Clear Vue data
            inputCSV.user_name = null;
            inputCSV.user_email = null;
            inputCSV.mentor_code = null;
            
            console.log('User not logged in');
            
            // Hide profile form since user is not logged in
            hideProfileForm();
        }

        if (response && exercises) {
            inputCSV.dataUsers = exercises;
            inputCSV.listProgUsers = json2ListProg(exercises);
            
            // Check for pending localStorage exercises after setting server data
            if (typeof checkAndRetryLocalStorageExercises === 'function') {
                checkAndRetryLocalStorageExercises();
            }
        }
    } catch (error) {
        console.log('Login check failed, setting to free mode:', error);
        console.log('Token available:', localStorage.getItem('token'));
        // Clear user info from localStorage
        localStorage.removeItem('training.user_name');
        localStorage.removeItem('training.user_email');
        if (localStorage.getItem('training.selectedLvl')?.[0] == 'p') {
            localStorage.removeItem('training.selectedLvl');
        }
        if (localStorage.getItem('training.resume')?.[0] == 'p') {
            localStorage.removeItem('training.resume');
        }
        localStorage.setItem('training.textMode', 'free');
        inputCSV.textMode = 'free';
        
        // Hide profile form since user is not logged in or token is invalid
        hideProfileForm();
    }
}

// Initialize profile check when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure all other initialization is complete
    setTimeout(() => {
        checkAndShowProfileForm();
    }, 500);
});

// Also check when page visibility changes (user returns to tab)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        // Page is now visible, recheck profile status
        setTimeout(() => {
            checkAndShowProfileForm();
        }, 100);
    }
});
