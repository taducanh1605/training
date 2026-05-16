import React, { useEffect, useState } from 'react';
import { WorkoutProvider, useWorkout } from './context/WorkoutContext.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { useOnlineStatus } from './hooks/useOnlineStatus.js';
import { processSyncQueue } from './services/syncService.js';
import { getCurrentWorkout } from './services/api.js';
import { STORAGE_KEYS, getItem, setItem, removeItem } from './services/storage.js';
import Header from './components/Header.jsx';
import ExercisePlayer from './components/ExercisePlayer.jsx';
import ExerciseList from './components/ExerciseList.jsx';
import UserGuide from './components/UserGuide.jsx';
import ProfileForm from './components/ProfileForm.jsx';
import MentorManager from './components/MentorManager.jsx';
import ExerciseEditor from './components/ExerciseEditor.jsx';
import './App.css';

// Compare two workout progress strings and return the most recently saved one.
// Format: textMode***gen***level***program***time***count***savedAt
//
// savedAt (index[6]) is a unix ms timestamp appended on every save.
// It correctly handles Back button (count goes down but savedAt is fresh).
// Old data without index[6] defaults to savedAt=0 so any new write wins.
//
// Rules:
//   Different programs: DB wins (server holds the latest selection)
//   Same program: higher savedAt wins (the most recently written state)
//   Equal savedAt: DB wins (DB is the shared source of truth)
function pickMostRecentWorkout(local, db) {
  if (!local && !db) return null;
  if (local && !db) return local;
  if (!local && db) return db;

  const lp = local.split('***');
  const dp = db.split('***');

  // Different programs: DB is authoritative
  if (lp[3] !== dp[3]) return db;

  const lSavedAt = parseInt(lp[6]) || 0;
  const dSavedAt = parseInt(dp[6]) || 0;

  // Same program: most recently written state wins
  if (lSavedAt > dSavedAt) return local;
  if (dSavedAt > lSavedAt) return db;

  // Equal savedAt: DB is authoritative
  return db;
}

function AppContent() {
  const {
    exSumSet,
    showProfileForm, setShowProfileForm,
    showMentorEditor, showExerciseEditor,
    time,
    setDataUsers, setListProgUsers, json2ListProg,
    restoreWorkout, getDataForGen,
    dataMale, dataFemale, dataPers, dataCal, dataUsers
  } = useWorkout();

  const { checkLogin, needsProfile } = useAuth();
  const isOnline = useOnlineStatus();

  // DB workout state fetched after login; compared with localStorage on restore
  const [dbWorkoutState, setDbWorkoutState] = useState(null);

  useEffect(() => {
    async function init() {
      await checkLogin((exercises) => {
        if (exercises) {
          setDataUsers(exercises);
          setListProgUsers(json2ListProg(exercises));
        }
      });

      const token = getItem(STORAGE_KEYS.TOKEN);
      if (token) {
        // If the user explicitly cleared their workout just before this reload,
        // skip the DB lookup entirely so the stale SW-cached GET response does
        // not restore the old workout.
        if (getItem(STORAGE_KEYS.RESUME_CLEARED)) {
          removeItem(STORAGE_KEYS.RESUME_CLEARED);
          return;
        }

        // Flush any queued offline saves so DB reflects the true latest state.
        // Then fetch DB state to compare with localStorage on restore.
        await processSyncQueue();
        try {
          const result = await getCurrentWorkout();
          if (result && result.data && result.data.progress_status && result.data.progress_status !== 'done') {
            setDbWorkoutState(result.data.progress_status);
          }
        } catch (e) {
          // Silently fail - localStorage will be used as fallback
        }
      }
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const localWorkout = getItem(STORAGE_KEYS.RESUME);
    const bestWorkout = pickMostRecentWorkout(localWorkout, dbWorkoutState);

    if (!bestWorkout) return;

    const parts = bestWorkout.split('***');
    if (parts.length < 6) return;
    const [tm, gen, level, program, timeStr, countStr] = parts;

    const dataEx = getDataForGen(gen);
    if (dataEx && dataEx[level] && dataEx[level][program]) {
      // Overwrite localStorage with best known state before restoring
      setItem(STORAGE_KEYS.RESUME, bestWorkout);
      restoreWorkout(tm, gen, level, program, parseInt(timeStr) || 0, parseInt(countStr) || 0, dataEx);
    }
  }, [dataMale, dataFemale, dataPers, dataCal, dataUsers, dbWorkoutState]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (needsProfile) setShowProfileForm(true);
    else setShowProfileForm(false);
  }, [needsProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOnline) processSyncQueue();
  }, [isOnline]);

  useEffect(() => {
    function handleSwSync() { processSyncQueue(); }
    window.addEventListener('sw-process-sync-queue', handleSwSync);
    return () => window.removeEventListener('sw-process-sync-queue', handleSwSync);
  }, []);

  useEffect(() => {
    function handleBeforeUnload(e) {
      if (time > 0) {
        e.preventDefault();
        e.returnValue = 'Do you want to reload page?';
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [time]);

  return (
    <div id="main-page">
      <Header />
      <div id="lower-content" className="row">
        <div id="lower-left-content" className="col-sm-9" style={{ paddingTop: '25px', marginTop: '1px', borderTop: '1px solid #303030' }}>
          {showProfileForm && <ProfileForm />}
          {showMentorEditor && <MentorManager />}
          {showExerciseEditor && <ExerciseEditor />}
          <ExercisePlayer />
        </div>
        <div id="lower-right-content" className="col-sm-3">
          <p className="list">{exSumSet > 0 ? 'List of exercises:' : 'User guide:'}</p>
          {exSumSet > 0 ? (
            <p id="myExList"><ExerciseList /></p>
          ) : (
            <UserGuide />
          )}
        </div>
      </div>
      <div id="footer-content" className="row">
        <p style={{ paddingTop: '13px', fontSize: '12px' }}>
          Copyright &copy;2022 |{' '}
          <a href="https://taducanh1605.github.io/site/" target="_blank" rel="noreferrer">Designed by Pika</a> |{' '}
          <a href="https://taducanh1605.github.io/cardio/" target="_blank" rel="noreferrer">Cardio</a>
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <WorkoutProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </WorkoutProvider>
  );
}
