import React, { useEffect } from 'react';
import { WorkoutProvider, useWorkout } from './context/WorkoutContext.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { useOnlineStatus } from './hooks/useOnlineStatus.js';
import { processSyncQueue } from './services/syncService.js';
import { STORAGE_KEYS, getItem } from './services/storage.js';
import Header from './components/Header.jsx';
import ExercisePlayer from './components/ExercisePlayer.jsx';
import ExerciseList from './components/ExerciseList.jsx';
import UserGuide from './components/UserGuide.jsx';
import ProfileForm from './components/ProfileForm.jsx';
import MentorManager from './components/MentorManager.jsx';
import ExerciseEditor from './components/ExerciseEditor.jsx';
import './App.css';

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

  useEffect(() => {
    async function init() {
      await checkLogin((exercises) => {
        if (exercises) {
          setDataUsers(exercises);
          setListProgUsers(json2ListProg(exercises));
        }
      });
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const savedWorkout = getItem(STORAGE_KEYS.RESUME);
    if (!savedWorkout) return;
    const parts = savedWorkout.split('***');
    if (parts.length !== 6) return;
    const [tm, gen, level, program, timeStr, countStr] = parts;

    const dataEx = getDataForGen(gen);
    if (dataEx && dataEx[level] && dataEx[level][program]) {
      restoreWorkout(tm, gen, level, program, parseInt(timeStr) || 0, parseInt(countStr) || 0, dataEx);
    }
  }, [dataMale, dataFemale, dataPers, dataCal, dataUsers]); // eslint-disable-line react-hooks/exhaustive-deps

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
