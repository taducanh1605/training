var inputCSV = new Vue({
    el: '#upper-left-content',
    methods: {
        //read file csv
        onFileChange(e) {
            var files = e.target.files || e.dataTransfer.files;
            if (!files.length)
                return;
            this.createInput(files[0]);
        },
        createInput(file) {
            //get name of program
            vm.programName = file.name.replace('.csv','');

            //wait for reading
            let promise = new Promise((resolve, reject) => {
                var reader = new FileReader();
                reader.onload = e => {
                  resolve((vm.fileInput = reader.result));
                };
                reader.readAsText(file);
            });
              
            //get result
            promise.then(
                result => {
                  /* handle a successful result */
                    vm.init();
                    this.csvToArray();
                    console.log(vm.exLinkSearch);
                    console.log(vm.exNameOnly);

                    //Make list of exercises
                    p = document.getElementById('myExList');
                    p.innerHTML = "List of exercises:<br/>";
                    for (let i=0; i< vm.exNameOnly.length; i++){
                        let a = document.createElement('a');
                        let br1 = document.createElement('br');
                        //let br2 = document.createElement('br');
                        p.appendChild(br1);
                        //p.appendChild(br2);
                        p.appendChild(a);
                        a.innerHTML += vm.exNameOnly[i];
                        a.href += vm.exLinkSearch[i];
                        a.target="_blank";
                    }
                },
                error => {
                    /* handle an error */ 
                    console.log(error);
                }
            );
        },

        //parse file csv from text
        csvToArray(delimiter = ",") {
            const rows = vm.fileInput.slice(vm.fileInput.indexOf("\n")+1).split("\r\n");
            (rows[rows.length - 1] == '') ? rows.pop() : null;

            //load data in each array
            rows.forEach(row => {
                temp = row.split(',');
                tempName = temp[0].split('+');
                
                //make set of original name
                tempName.forEach(name => {
                    newName = name.split('').reverse().join('').replace('x','*').split('*')[1].split('').reverse().join('');
                    vm.exNameOnly.push(newName);
                    vm.exLinkSearch.push('https://www.google.com/search?q=gym+exercise+tutorial+'+ newName.split(' ').join('+'));
                });

                vm.exName.push(tempName.join('\n'));
                vm.exSet.push(Number(temp[1]));
                vm.exRest.push(Number(temp[2]));
                vm.exSumSet += Number(temp[1]);
            });
        }
    }
});

var vm = new Vue({
    el: '#app',
    data: {
        time: 0,
        timeClock: '',
        count: 0,
        rest: 0,
        flagLetDoIt: 0,
        flagStart: 0,
        fileInput: '',
        programName : '',
        exName: [],
        exRest: [],
        exSet: [],
        exSumSet: 0,
        exOrder: 0,
        exRound: 0,
        leftColumn: 'Your exercises:',
        row1 : 'Choose your training program',
        row2 : 'Welcome!',
        buttonStart : 'Start'
    },
    methods: {
        init(){
            this.time = 0;
            this.count = 0;
            this.rest = 0;
            this.flagLetDoIt = 0;
            this.flagStart = 0;
            this.exNameOnly = [];
            this.exName = [];
            this.exLinkSearch = [];
            this.exRest = [];
            this.exSet = [];
            this.exSumSet = 0;
            this.exOrder = 0;
            this.exRound = 0;
        },
        handleStart(){
            if (this.flagStart == 0) {
                this.flagStart = 1; 
                if ((this.rest == 0) && (this.count < this.exSumSet)){
                    this.count += 1;
                }
                [this.exOrder, this.exRound] = getOrder(this.count);
            }
            else if (this.rest > 0) {
                this.flagStart = 0;
            }
            else {
                if (this.count < this.exSumSet){
                    this.count += 1;
                }
                [this.exOrder, this.exRound] = getOrder(this.count);
                this.rest = this.exRest[this.exOrder];
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
        vm.timeClock = zeroPadding((vm.time - vm.time%3600)/3600, 2) + ':' + zeroPadding((vm.time - vm.time%60)/60, 2) + ':' + zeroPadding(vm.time%60, 2);
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
    else {
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
            vm.row2 = vm.programName + '\n ' + vm.exSet.length +' exercise(s)\nReady?';
        }
        else {
            vm.row1 = vm.programName+'                    '+(vm.exOrder+1)+'/'+vm.exSet.length+'                    '+vm.timeClock;
            if (vm.rest > 0) {
                vm.row2 = vm.exName[vm.exOrder]+'\n\nRound: '+vm.exRound+'/'+vm.exSet[vm.exOrder]+'\n\nRest: '+ vm.rest;
            }
            else {
                vm.row2 = vm.exName[vm.exOrder]+'\n\nRound: '+vm.exRound+'/'+vm.exSet[vm.exOrder]+'\n\nLet\'s do it';
            }
        }
    }
    else {
        vm.row1 = 'Choose your program';
        vm.row2 = 'Training with Njk';
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

