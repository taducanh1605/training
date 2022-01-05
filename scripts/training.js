var inputCSV = new Vue({
    el: '#upper-content',
    data: {
        textMode: 'prime',
        select :'',
        data: [],
        listProg: [],
        loadData : fetch("./demoTraining.json").then(response => {return response.json();}).then(jsondata => {inputCSV.data = jsondata; inputCSV.listProg = Object.keys(jsondata)}),
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
                    p.innerHTML = "List of exercises:<br/>";

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
                vm.exName.push(tempName.join('\n'));
                vm.exSet.push(Number(temp[1]));
                vm.exRest.push(Number(temp[2]));
                vm.exSumSet += Number(temp[1]);
            });
        },

        selectHandle(){
            
            //clear list
            p = document.getElementById('myExList');
            p.innerHTML = "List of exercises:<br/>";

            //parse data
            this.programName = this.select;
            this.init();
            vm.init();

            this.data[this.select][0].forEach(exercise => {
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
                vm.exName.push(tempName.join('\n'));
            });

            vm.exSet = this.data[this.select][1];
            vm.exRest = this.data[this.select][2];
            this.data[this.select][1].forEach(exercise => {vm.exSumSet += Number(exercise);});

            this.listExHandle();
        },

        listExHandle(){
            p = document.getElementById('myExList');
            p.innerHTML = "List of exercises:";
            //Make list of exercises
            for (let j=0; j< this.exNameOnly.length; j++){
                let br = document.createElement('br');
                p.appendChild(br);
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
        }
    }
    
});

var vm = new Vue({
    el: '#lower-content',
    data: {
        time: 0,
        timeClock: '',
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
        row1 : '',
        row2 : '',
        row3 : '',
        buttonStart : 'Start'
    },
    methods: {
        init(){
            this.time = 0;
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

setInterval(updateContext, 10);
updateContext;
setInterval(updateTime, 1000);
updateTime();


function ring(){
    var myRing = new Audio('./sound/ringGo.wav');
    myRing.play();
}

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
                ring();
            }
        }
        else {
            vm.rest=0;
        }
    }
    else if (vm.count < 2) {
        vm.time=0;
    }
};

function zeroPadding(num, digit) {
    var zero = '';
    for(var i = 0; i < digit; i++) {
        zero += '0';
    }
    return (zero + num).slice(-digit);
}

function updateContext() {
    //update Time clock
    if (vm.exSumSet > 0){
        if ((vm.flagStart == 0) && (vm.count == 0)) {
            vm.row1 = 'Training with Njk';
            vm.row3 = inputCSV.programName + '\n ' + vm.exSet.length +' exercise(s)\nReady?';
            vm.row2 = "";
        }
        else if (vm.flagStart == 2) {
            vm.row3 = "Good job!";
            vm.row2 = "";
        }
        else {
            vm.row1 = inputCSV.programName+'\u00a0\u00a0\u00a0'+(vm.exOrder+1)+'/'+vm.exSet.length+'\u00a0\u00a0\u00a0'+vm.timeClock;
            if (vm.rest > 0) {
                vm.row2 = 'ROUND: '+vm.exRound+'/'+vm.exSet[vm.exOrder];
                vm.row3 = vm.exName[vm.exOrder]+'\n\nRest: '+ vm.rest;
            }
            else {
                vm.row2 = 'ROUND: '+vm.exRound+'/'+vm.exSet[vm.exOrder];
                vm.row3 = vm.exName[vm.exOrder]+'\n\nLet\'s do it';
            }
        }
    }
    else {
        vm.row1 = 'Choose your program';
        vm.row3 = 'Training with Njk';
    }
    //update Button Start
    (vm.flagStart == 0) ? vm.buttonStart = 'Start' :
        (vm.rest > 0) ? vm.buttonStart = 'Pause' :
            vm.buttonStart = 'Done';
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

