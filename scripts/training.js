var inputCSV = new Vue({
    el: '#upper-content',
    data: {
        textMode: 'free',
        loaded: 0,
        selectSex :'',
        selectLvl :'',
        select :'',
        dataMale: [],
        dataFemale: [],
        listProgMale: [],
        listProgFemale: [],
        loadDataMale :  fetch("./FullBodyMale.json").
                        then(response => {
                            return response.json();
                        }).
                        then(jsondata => {
                            inputCSV.dataMale = jsondata;
                            tempGroup = [];
                            tempEx = [];
                            flag = 0;
                            Object.keys(jsondata).forEach(prog => {
                                if (jsondata[prog].length > 0){
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
                                if (jsondata[prog].length > 0){
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
            this.programName = file.name.replace('.csv','');

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
            const rows = this.fileInput.slice(this.fileInput.indexOf("\n")+1).split("\r\n");
            (rows[rows.length - 1] == '') ? rows.pop() : null;

            //load data in each array
            rows.forEach(row => {
                temp = row.split(',');
                tempName = temp[0].split('+');
                tempNameOnly = [];
                tempLinkSearch = [];
                //make set of original name
                tempName.forEach(name => {
                    newName = name.split('').reverse().join('').replace('x','*').split('*')[1].split('').reverse().join('');
                    tempNameOnly.push(newName);
                    tempLinkSearch.push('https://www.google.com/search?q=gym+exercise+tutorial+'+ newName.split(' ').join('+'));
                });
                this.exNameOnly.push(tempNameOnly);
                this.exLinkSearch.push(tempLinkSearch);
                vm.exName.push(tempName);
                vm.exSet.push(Number(temp[1]));
                vm.exRest.push(Number(temp[2]));
                vm.exSumSet += Number(temp[1]);
            });
        },

        selectHandle(selectSex){
            
            if (selectSex == "Male"){
                data = this.dataMale;
            }
            else if (selectSex == "Female"){
                data = this.dataFemale;
            }

            //clear list
            p = document.getElementById('myExList');
            p.innerHTML = "";

            //parse data
            this.programName = this.select;
            this.init();
            vm.init();
            
            data[this.select][0].forEach(exercise => {
                //console.log(exercise);
                tempName = exercise.split('+');
                tempNameOnly = [];
                tempLinkSearch = [];
                tempName.forEach(name => {
                    newName = name.split('').reverse().join('').replace('x','*').split('*')[1].split('').reverse().join('');
                    tempNameOnly.push(newName);
                    tempLinkSearch.push('https://www.google.com/search?q=gym+exercise+tutorial+'+ newName.split(' ').join('+'));
                });
                this.exNameOnly.push(tempNameOnly);
                this.exLinkSearch.push(tempLinkSearch);
                vm.exName.push(tempName);
            });

            vm.exSet = data[this.select][1];
            vm.exRest = data[this.select][2];
            data[this.select][1].forEach(exercise => {vm.exSumSet += Number(exercise);});

            this.listExHandle();
        },

        listExHandle(){
            p = document.getElementById('myExList');
            p.innerHTML = "";
            //Make list of exercises
            for (let j=0; j< this.exNameOnly.length; j++){
                for (let i=0; i< this.exNameOnly[j].length; i++){
                    let a = document.createElement('a');
                    let br1 = document.createElement('br');
                    //let br2 = document.createElement('br');
                    p.appendChild(br1);
                    //p.appendChild(br2);
                    p.appendChild(a);
                    a.innerHTML += this.exNameOnly[j][i];
                    a.href += this.exLinkSearch[j][i];
                    a.target="_blank";
                }
                let br = document.createElement('br');
                p.appendChild(br);
            }
        },

        handleMode(){
            if(vm.count == 0){
                if (this.textMode == "prime"){
                    this.textMode = "free";
                }
                else {
                    this.textMode = "prime";
                }
            }
        },

        handleGendreLvl(event){
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
        leftColumn: '',
        row1_1 : '',
        row1_2 : '',
        row1_3 : '',
        row2 : '',
        row3 : '',
        row3_exs: [],
        row4 : '',
        textbreak: 'doit',
        buttonStart : 'Start'
    },
    methods: {
        init(){
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
        handleStart(){
            if (this.exSumSet > 0){
                if (this.flagStart == 0) {
                    this.flagStart = 1; 
                    if ((this.rest == 0) && (this.count == 0)){
                        this.count += 1;
                        [this.exOrder, this.exRound] = getOrder(this.count);
                    }
                }
                else if (this.rest > 0) {
                    this.flagStart = 0;
                }
                else {
                    if (this.count < this.exSumSet){
                        ring("breaktime.wav");
                        this.count += 1;
                        [this.exOrder, this.exRound] = getOrder(this.count);
                        this.rest = this.exRest[this.exOrder];
                    }
                    else if (this.count == this.exSumSet){
                        this.count += 1;
                        this.flagStart = 2;
                    }
                }
            }
        },

        handleNext(){
            if ((this.exSumSet > 0) && (this.count < this.exSumSet)){
                this.count += 1;
                this.rest = 0;
                [this.exOrder, this.exRound] = getOrder(this.count);
            }
        },

        handleBack(){
            if ((this.exSumSet > 0) && (this.count > 1)){
                if (this.flagStart == 2){
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

window.onbeforeunload = function() {
    if (vm.time > 0){
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
function ring(nameRing){
    var myRing = new Audio('./sound/'+nameRing);
    myRing.play();
};


/*----------------------------------------------------------------------
Update time and break time each 1 sec
----------------------------------------------------------------------*/
function updateTime() {
    //update Time clock
    
    if (vm.flagStart > 0) {
        vm.time+=1;
        hour = (vm.time - vm.time%3600)/3600;
        min = (vm.time - vm.time%60 - hour*3600)/60;
        sec = vm.time%60;
        vm.timeClock = zeroPadding(hour, 2) + ':' + zeroPadding(min, 2) + ':' + zeroPadding(sec, 2);
        if (vm.rest > 0) {
            vm.rest-=1;
            vm.flagLetDoIt = 1;
            if (vm.rest == 0){
                ring("ringGo.wav");
            }
        }
        else {
            vm.rest=0;
        }
    }
    else if (vm.count < 2) {
        vm.time=0;
    }

    //update loaded program
    if ((inputCSV.loaded < 1) && (vm.time > 0)){
        inputCSV.loaded = 1;
    }
};

/*----------------------------------------------------------------------
Format time to hh:mm:ss
----------------------------------------------------------------------*/
function zeroPadding(num, digit) {
    var zero = '';
    for(var i = 0; i < digit; i++) {
        zero += '0';
    }
    return (zero + num).slice(-digit);
}


/*----------------------------------------------------------------------
Update context for each row
----------------------------------------------------------------------*/
function updateContext() {
    //update Time clock
    if (vm.exSumSet > 0){
        if ((vm.flagStart == 0) && (vm.count == 0)){
            vm.row1_2 = 'Training with Njk';
            vm.row2 = "";
            vm.row3 = "" + inputCSV.programName + '\n' + vm.exSet.length +' exercise(s)';
            vm.row4 = "";
        }
        else if (vm.flagStart == 2) {
            vm.row2 = "";
            vm.row3 = "Good job!";
            vm.row4 = "";
        }
        else {
            vm.row1_1 = 'Exercise: '+(vm.exOrder+1)+'/'+vm.exSet.length;
            vm.row1_2 = inputCSV.programName;
            vm.row1_3 = vm.timeClock;
            if (vm.rest > 0) {
                vm.row2 = 'ROUND: '+vm.exRound+'/'+vm.exSet[vm.exOrder];
                vm.row3_exs = vm.exName[vm.exOrder];
                vm.row4 = 'Break time: '+ vm.rest;
                vm.textbreak = 'break';
            }
            else {
                vm.row2 = 'ROUND: '+vm.exRound+'/'+vm.exSet[vm.exOrder];
                vm.row3_exs = vm.exName[vm.exOrder];
                vm.row4 = 'Let\'s do it';
                vm.textbreak = 'doit';
            }
        }
        if (vm.flagStart == 0){
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

function getOrder(count){
    tempCount = count;
    for (let i = 0; i < vm.exSet.length; i++) {
        if (tempCount > vm.exSet[i]){
            tempCount -= vm.exSet[i];
        }
        else {
            return [i,tempCount];
        }
    }
}


