import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { STORAGE_KEYS, getItem, setItem, removeItem, buildResume } from '../services/storage.js';
import { saveWorkoutProgress, completeWorkout } from '../services/api.js';
import { addToSyncQueue } from '../services/syncService.js';

const WorkoutContext = createContext(null);

export function WorkoutProvider({ children }) {
  const [textMode, setTextMode] = useState(() => getItem(STORAGE_KEYS.TEXT_MODE) || 'free');
  const [loaded, setLoaded] = useState(0);
  const [selectGen, setSelectGen] = useState('');
  const [selectLvl, setSelectLvl] = useState('');
  const [select, setSelect] = useState('');
  const [programName, setProgramName] = useState('');

  const [dataMale, setDataMale] = useState(null);
  const [dataFemale, setDataFemale] = useState(null);
  const [dataPers, setDataPers] = useState(null);
  const [dataCal, setDataCal] = useState(null);
  const [dataUsers, setDataUsers] = useState(null);

  const [listProgMale, setListProgMale] = useState([]);
  const [listProgFemale, setListProgFemale] = useState([]);
  const [listProgPers, setListProgPers] = useState([]);
  const [listProgCal, setListProgCal] = useState([]);
  const [listProgUsers, setListProgUsers] = useState([]);

  const [exNameOnly, setExNameOnly] = useState([]);
  const [exLinkSearch, setExLinkSearch] = useState([]);
  const [checkHIIT, setCheckHIIT] = useState(0);

  const [time, setTime] = useState(0);
  const [timeClock, setTimeClock] = useState('00:00:00');
  const [count, setCount] = useState(0);
  const [rest, setRest] = useState(0);
  const [flagLetDoIt, setFlagLetDoIt] = useState(0);
  const [flagStart, setFlagStart] = useState(0);
  const [exName, setExName] = useState([]);
  const [exRest, setExRest] = useState([]);
  const [exSet, setExSet] = useState([]);
  const [exSumSet, setExSumSet] = useState(0);
  const [exOrder, setExOrder] = useState(0);
  const [exRound, setExRound] = useState(0);
  const [exHold, setExHold] = useState(0);
  const [exEstTime, setExEstTime] = useState(0);

  const [row1_1, setRow1_1] = useState('');
  const [row1_2, setRow1_2] = useState('Training with Njk');
  const [row1_3, setRow1_3] = useState('');
  const [row2, setRow2] = useState('');
  const [row3, setRow3] = useState('CHOOSE YOUR PROGRAM');
  const [row3_exs, setRow3_exs] = useState([]);
  const [row4, setRow4] = useState('');
  const [textbreak, setTextbreak] = useState('doit');
  const [buttonStart, setButtonStart] = useState('Start');

  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showMentorEditor, setShowMentorEditor] = useState(false);
  const [showExerciseEditor, setShowExerciseEditor] = useState(false);
  const [showSwitchBtn, setShowSwitchBtn] = useState(false);

  const stateRef = useRef({});
  stateRef.current = {
    time, timeClock, count, rest, flagLetDoIt, flagStart,
    exName, exRest, exSet, exSumSet, exOrder, exRound,
    textMode, selectGen, selectLvl, programName, exEstTime
  };

  function zeroPadding(num, digit) {
    return ('0'.repeat(digit) + num).slice(-digit);
  }

  function calculateWorkoutTimeEstimate(workoutData) {
    if (!workoutData || !Array.isArray(workoutData) || workoutData.length < 3) return 0;
    const [exercises, rounds, restTimes] = workoutData;
    let totalTime = 0;
    exercises.forEach((exercise, index) => {
      const exerciseRounds = rounds[index] || 1;
      const restTime = restTimes[index] || 0;
      const movements = exercise.split('+');
      const exerciseTime = movements.length * 60;
      const totalExerciseTime = exerciseTime * exerciseRounds;
      const bufferTime = exerciseRounds * 10;
      let postExerciseRest = restTime * (exerciseRounds - (index === 0 ? 1 : 0));
      postExerciseRest = postExerciseRest > 0 ? postExerciseRest : 0;
      totalTime += totalExerciseTime + bufferTime + postExerciseRest + 20;
    });
    return totalTime;
  }

  function formatTimeEstimate(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  function json2ListProg(json) {
    if (!json) return [];
    let listProg = [];
    Object.keys(json).forEach(prog => {
      let tempGroup = [];
      let tempEx = [];
      let tempEstTime = [];
      tempGroup.push(prog);
      const tmpExs = json[prog];
      Object.keys(tmpExs).forEach(ex => {
        tempEx.push(ex);
        tempEstTime.push(` (⏱️Est. ${formatTimeEstimate(calculateWorkoutTimeEstimate(tmpExs[ex]))})`);
      });
      tempGroup.push(tempEx);
      tempGroup.push(tempEstTime);
      listProg.push(tempGroup);
    });
    return listProg;
  }

  function getOrder(count, currentExSet) {
    let tempCount = count;
    const sets = currentExSet || stateRef.current.exSet;
    for (let i = 0; i < sets.length; i++) {
      if (tempCount > sets[i]) {
        tempCount -= sets[i];
      } else {
        return [i, tempCount];
      }
    }
    return [sets.length - 1, 1];
  }

  function ring(nameRing) {
    try {
      const audio = new Audio('./sound/' + nameRing);
      audio.play().catch(() => {});
    } catch (e) {}
  }

  useEffect(() => {
    fetch('./FullBodyMale.json').then(r => r.json()).then(data => {
      setDataMale(data);
      setListProgMale(json2ListProg(data));
    }).catch(() => {});
    fetch('./FullBodyFemale.json').then(r => r.json()).then(data => {
      setDataFemale(data);
      setListProgFemale(json2ListProg(data));
    }).catch(() => {});
    fetch('./FullBodyPers.json').then(r => r.json()).then(data => {
      setDataPers(data);
      setListProgPers(json2ListProg(data));
    }).catch(() => {});
    fetch('./Calisthenic.json').then(r => r.json()).then(data => {
      setDataCal(data);
      setListProgCal(json2ListProg(data));
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const interval = setInterval(() => {
      const s = stateRef.current;
      if (s.flagStart > 0) {
        setTime(prev => {
          const newTime = prev + 1;
          const hour = Math.floor(newTime / 3600);
          const min = Math.floor((newTime % 3600) / 60);
          const sec = newTime % 60;
          setTimeClock(zeroPadding(hour, 2) + '.' + zeroPadding(min, 2) + '.' + zeroPadding(sec, 2));
          return newTime;
        });
        if (s.rest > 0) {
          setRest(prev => {
            const newRest = prev - 1;
            if (newRest === 0) {
              ring('ringGo.wav');
            }
            return newRest;
          });
          setFlagLetDoIt(1);
        }
      } else if (s.count < 2) {
        setTime(0);
      }
      if (s.time > 0) {
        setLoaded(1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (exSumSet > 0) {
      if (flagStart === 0 && count === 0) {
        setRow1_2('Training with Njk');
        setRow2('');
        setRow3(`${programName}\n${exSet.length} exercise(s)\n⏱️. ${formatTimeEstimate(exEstTime)}`);
        setRow4('');
        setRow3_exs([]);
      } else if (flagStart === 2) {
        setRow2('');
        setRow3('Good job!');
        setRow4('');
        setRow3_exs([]);
      } else {
        setRow1_1(`Exercise: ${exOrder + 1}/${exSet.length}`);
        setRow1_2(programName);
        setRow1_3(timeClock);
        if (rest > 0) {
          setRow2(`ROUND: ${exRound}/${exSet[exOrder]}`);
          setRow3_exs(exName[exOrder] || []);
          setRow4(`Break time: ${rest}`);
          setTextbreak('break');
        } else {
          setRow2(`ROUND: ${exRound}/${exSet[exOrder]}`);
          setRow3_exs(exName[exOrder] || []);
          setRow4("Let's do it");
          setTextbreak('doit');
        }
      }
      if (flagStart === 0) {
        setRow4('Ready?');
      }
    } else {
      setRow1_2('Training with Njk');
      setRow2('');
      setRow3('CHOOSE YOUR PROGRAM');
      setRow4('');
    }

    if (flagStart === 0) {
      setButtonStart('Start');
    } else if (rest > 0) {
      setButtonStart('Pause');
    } else if (count < exSumSet) {
      setButtonStart('Done');
    } else {
      setButtonStart('Finish');
    }
  }, [exSumSet, flagStart, count, rest, exOrder, exRound, exSet, exName, programName, timeClock, exEstTime]); // eslint-disable-line react-hooks/exhaustive-deps

  function initWorkout() {
    setTime(0);
    setTimeClock('00:00:00');
    setCount(0);
    setRest(0);
    setFlagLetDoIt(0);
    setFlagStart(0);
    setExName([]);
    setExRest([]);
    setExSet([]);
    setExSumSet(0);
    setExOrder(0);
    setExRound(0);
    setExEstTime(0);
    setExNameOnly([]);
    setExLinkSearch([]);
    setCheckHIIT(0);
  }

  function processExercises(exerciseList) {
    const newExName = [];
    const newExNameOnly = [];
    const newExLinkSearch = [];
    let hasHIIT = 0;

    exerciseList.forEach((exercise, rowIdx) => {
      const tempName = exercise.split('+');
      const tempNameOnly = [];
      const tempLinkSearch = [];

      for (let i = 0; i < tempName.length; i++) {
        let nameI = tempName[i];
        if (nameI.indexOf('?') > -1) {
          hasHIIT = 1;
          const nbrIn = (nameI.match(/[?]-/g) || []).length;
          for (let y = nbrIn; y > 0; y--) {
            const revStr = nameI.split('').reverse().join('');
            const repS = nameI.length - revStr.indexOf('-?');
            const repE = nameI.indexOf('?', repS);
            const rep = parseInt(nameI.slice(repS, repE));
            nameI = nameI.substring(0, repS - 1) + ' -' + nameI.substring(repS + nameI.substring(repS).indexOf('?')).replace('?', `<input class="inHIIT" data-row="${rowIdx}" data-col="${i}" data-sub="${y}" type="number" min="0" value="${rep}">`);
          }
          const repS2 = nameI.indexOf(' x') + 2;
          const repE2 = nameI.indexOf('?');
          const rep2 = parseInt(nameI.slice(repS2, repE2));
          nameI = nameI.substring(0, repS2) + nameI.substring(repS2 + nameI.substring(repS2).indexOf('?')).replace('?', `<input class="inHIIT" data-row="${rowIdx}" data-col="${i}" type="number" min="0" value="${rep2}">`);
          tempName[i] = nameI.replaceAll(' -', '-');
        }

        const reversed = nameI.split('').reverse().join('');
        const xIdx = reversed.indexOf('x ');
        let newName;
        if (xIdx > -1) {
          newName = nameI.split('').reverse().join('').split('x ')[1]?.split('').reverse().join('') || nameI;
        } else {
          newName = nameI;
        }
        tempNameOnly.push(newName.trim());
        tempLinkSearch.push('https://www.google.com/search?q=gym+exercise+tutorial+' + newName.trim().split(' ').join('+'));
      }
      newExName.push(tempName);
      newExNameOnly.push(tempNameOnly);
      newExLinkSearch.push(tempLinkSearch);
    });

    return { newExName, newExNameOnly, newExLinkSearch, hasHIIT };
  }

  const selectHandle = useCallback((gen, dataEx, programNameVal, selectLvlVal, currentTextMode) => {
    if (!dataEx || !selectLvlVal || !programNameVal) return;
    if (!dataEx[selectLvlVal] || !dataEx[selectLvlVal][programNameVal]) return;

    const workoutData = dataEx[selectLvlVal][programNameVal];
    const { newExName, newExNameOnly, newExLinkSearch, hasHIIT } = processExercises(workoutData[0]);

    setExNameOnly(newExNameOnly);
    setExLinkSearch(newExLinkSearch);
    setCheckHIIT(hasHIIT);
    setExName(newExName);
    setExRest(workoutData[2]);
    setExSet(workoutData[1]);

    let sumSet = 0;
    workoutData[1].forEach(s => { sumSet += Number(s); });
    setExSumSet(sumSet);
    setExEstTime(calculateWorkoutTimeEstimate(workoutData));
    setProgramName(programNameVal);
    setSelectGen(gen);
    setSelectLvl(selectLvlVal);
    const mode = currentTextMode || stateRef.current.textMode;
    setTextMode(mode);
    setItem(STORAGE_KEYS.TEXT_MODE, mode);
    setShowSwitchBtn(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStart = useCallback(() => {
    const s = stateRef.current;
    if (s.exSumSet <= 0) return;

    if (s.count === 0) setShowSwitchBtn(true);

    if (s.flagStart === 0) {
      setFlagStart(1);
      if (s.rest === 0 && s.count === 0) {
        ring('start.wav');
        const newCount = 1;
        setCount(newCount);
        const [newOrder, newRound] = getOrder(newCount, s.exSet);
        setExOrder(newOrder);
        setExRound(newRound);
      }
    } else if (s.flagStart === 2 && s.count > s.exSumSet) {
      return;
    } else if (s.rest > 0) {
      setFlagStart(0);
    } else {
      if (s.count < s.exSumSet) {
        ring('breaktime.wav');
        const newCount = s.count + 1;
        setCount(newCount);
        const [newOrder, newRound] = getOrder(newCount, s.exSet);
        setExOrder(newOrder);
        setExRound(newRound);
        setRest(s.exRest[newOrder]);
      } else if (s.count === s.exSumSet) {
        ring('finish.wav');
        const newCount = s.count + 1;
        setCount(newCount);
        setFlagStart(2);
        if (getItem(STORAGE_KEYS.RESUME)) {
          removeItem(STORAGE_KEYS.RESUME);
          setItem(STORAGE_KEYS.DONE, s.programName);
        }
        return;
      }
    }

    const resumeStr = buildResume(s.textMode, s.selectGen, s.selectLvl, s.programName, s.time, s.count, Date.now());
    setItem(STORAGE_KEYS.RESUME, resumeStr);
    saveWorkoutProgressToDB(s);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = useCallback(() => {
    const s = stateRef.current;
    if (s.exSumSet > 0 && s.count < s.exSumSet) {
      const newCount = s.count + 1;
      setCount(newCount);
      setRest(0);
      const [newOrder, newRound] = getOrder(newCount, s.exSet);
      setExOrder(newOrder);
      setExRound(newRound);
      setItem(STORAGE_KEYS.RESUME, buildResume(s.textMode, s.selectGen, s.selectLvl, s.programName, s.time, newCount, Date.now()));
      saveWorkoutProgressToDB({ ...s, count: newCount });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBack = useCallback(() => {
    const s = stateRef.current;
    if (s.exSumSet > 0 && s.count > 1) {
      if (s.flagStart === 2) setFlagStart(1);
      const newCount = s.count - 1;
      setCount(newCount);
      setRest(0);
      const [newOrder, newRound] = getOrder(newCount, s.exSet);
      setExOrder(newOrder);
      setExRound(newRound);
      setItem(STORAGE_KEYS.RESUME, buildResume(s.textMode, s.selectGen, s.selectLvl, s.programName, s.time, newCount, Date.now()));
      saveWorkoutProgressToDB({ ...s, count: newCount });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function saveWorkoutProgressToDB(vmRef) {
    const token = getItem(STORAGE_KEYS.TOKEN);
    if (!token) return;
    const exerciseId = [vmRef.textMode, vmRef.selectGen, vmRef.selectLvl, vmRef.programName].join('***');
    // Include the current timestamp as savedAt so the server can determine
    // which write is the most recent, even when count goes backward (Back button).
    const savedAt = Date.now();
    const progressStatus = [vmRef.textMode, vmRef.selectGen, vmRef.selectLvl, vmRef.programName, vmRef.time, vmRef.count, savedAt].join('***');
    const payload = {
      exercise_id: exerciseId,
      exercise_name: vmRef.programName,
      progress_status: progressStatus,
      workout_time: vmRef.time
    };
    saveWorkoutProgress(payload).catch(() => {
      addToSyncQueue({ type: 'progress', ...payload });
    });
  }

  const restoreWorkout = useCallback((textModeVal, gen, level, program, timeVal, countVal, dataEx) => {
    if (!dataEx || !dataEx[level] || !dataEx[level][program]) return;

    selectHandle(gen, dataEx, program, level, textModeVal);

    setTime(timeVal);
    const hour = Math.floor(timeVal / 3600);
    const min = Math.floor((timeVal % 3600) / 60);
    const sec = timeVal % 60;
    setTimeClock(zeroPadding(hour, 2) + '.' + zeroPadding(min, 2) + '.' + zeroPadding(sec, 2));

    const workoutData = dataEx[level][program];
    let sumSet = 0;
    workoutData[1].forEach(s => { sumSet += Number(s); });

    setTimeout(() => {
      for (let i = 1; i <= countVal; i++) {
        const [ord, rnd] = getOrder(i, workoutData[1]);
        if (i === countVal) {
          setCount(i);
          setExOrder(ord);
          setExRound(rnd);
        }
      }
      setFlagStart(0);
      setShowSwitchBtn(true);
    }, 100);
  }, [selectHandle]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearAndRefresh = useCallback(async () => {
    const token = getItem(STORAGE_KEYS.TOKEN);
    const savedWorkout = getItem(STORAGE_KEYS.RESUME);
    if (token && savedWorkout) {
      const parts = savedWorkout.split('***');
      const prog = parts[3] || '';
      if (prog) {
        try {
          await completeWorkout(prog);
        } catch (e) {
          addToSyncQueue({ type: 'complete', exercise_name: prog });
        }
      }
    }
    removeItem(STORAGE_KEYS.RESUME);
    // Set the cleared flag so restoreBestWorkoutState skips the DB/cache lookup
    // on the next page load. This prevents the SW-cached GET response from
    // restoring the old workout when the user is offline.
    setItem(STORAGE_KEYS.RESUME_CLEARED, '1');
    window.location.reload();
  }, []);

  const handleMode = useCallback(() => {
    if (stateRef.current.count === 0) {
      setTextMode(prev => {
        const next = prev === 'prime' ? 'free' : 'prime';
        setItem(STORAGE_KEYS.TEXT_MODE, next);
        return next;
      });
    }
  }, []);

  const handleGendreLvl = useCallback((gen, lvl) => {
    setSelectGen(gen);
    setSelectLvl(lvl);
    setItem(STORAGE_KEYS.SELECTED_LVL, [stateRef.current.textMode, gen, lvl].join('***'));
  }, []);

  const getDataForGen = useCallback((gen) => {
    if (gen === 'Male') return dataMale;
    if (gen === 'Female') return dataFemale;
    if (gen === 'Pers') return dataPers;
    if (gen === 'Cal') return dataCal;
    if (gen === 'Users') return dataUsers;
    return null;
  }, [dataMale, dataFemale, dataPers, dataCal, dataUsers]);

  return (
    <WorkoutContext.Provider value={{
      textMode, setTextMode,
      loaded, setLoaded,
      selectGen, setSelectGen,
      selectLvl, setSelectLvl,
      select, setSelect,
      programName, setProgramName,
      dataMale, dataFemale, dataPers, dataCal, dataUsers, setDataUsers,
      listProgMale, listProgFemale, listProgPers, listProgCal, listProgUsers, setListProgUsers,
      exNameOnly, exLinkSearch, checkHIIT,
      time, timeClock, count, rest,
      flagLetDoIt, flagStart,
      exName, exRest, exSet, exSumSet,
      exOrder, exRound, exHold, exEstTime,
      row1_1, row1_2, row1_3,
      row2, row3, row3_exs, row4,
      textbreak, buttonStart,
      showProfileForm, setShowProfileForm,
      showMentorEditor, setShowMentorEditor,
      showExerciseEditor, setShowExerciseEditor,
      showSwitchBtn, setShowSwitchBtn,
      json2ListProg, calculateWorkoutTimeEstimate, formatTimeEstimate,
      selectHandle, handleStart, handleNext, handleBack,
      restoreWorkout, clearAndRefresh,
      handleMode, handleGendreLvl,
      getDataForGen, initWorkout,
      ring
    }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  return useContext(WorkoutContext);
}
