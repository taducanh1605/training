import React from 'react';
import { useWorkout } from '../context/WorkoutContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { googleLogin } from '../services/api.js';

export default function Header() {
  const {
    textMode, loaded, selectGen, selectLvl, select, setSelect,
    listProgMale, listProgFemale, listProgPers, listProgCal, listProgUsers,
    showSwitchBtn, clearAndRefresh,
    handleMode, handleGendreLvl, selectHandle, getDataForGen,
    setShowMentorEditor, setShowExerciseEditor
  } = useWorkout();

  const { user_name, mentor_code, isLoggedIn, handleLogout } = useAuth();

  async function onGoogleLogin() {
    try {
      await googleLogin();
      window.location.reload();
    } catch (e) {
      alert('Login error: ' + e.message);
    }
  }

  function onLevelChange(e) {
    const value = e.target.value;
    if (!value) return;
    const [gen, lvl] = value.split(':');
    handleGendreLvl(gen, lvl);
  }

  function onProgramChange(e) {
    const value = e.target.value;
    setSelect(value);
    const dataEx = getDataForGen(selectGen);
    if (dataEx && selectLvl && value) {
      selectHandle(selectGen, dataEx, value, selectLvl, textMode);
    }
  }

  function onMentorClick() {
    setShowMentorEditor(true);
    setShowExerciseEditor(false);
  }

  return (
    <div id="upper-content" className="row">
      <div className="col-sm-9" id="upper-left-content" onClick={handleMode}>
        {textMode === 'free' && (
          <img width="100%" src="./images/banner_free.png" className="img-responsive" alt="Change free prime" />
        )}
        {textMode === 'prime' && (
          <img width="100%" src="./images/banner_prime.png" className="img-responsive" alt="Change free free" />
        )}
      </div>

      <div className="col-sm-3" id="upper-right-content">
        {showSwitchBtn && (
          <div className="row">
            <button
              className="btn selectProg mb-3 mt-3 switch-program-btn"
              style={{ margin: '5px auto', padding: '0px 9px' }}
              onClick={clearAndRefresh}
            >
              Click to choose an other program
            </button>
          </div>
        )}

        {textMode === 'prime' && loaded === 0 && !user_name && (
          <button onClick={onGoogleLogin} className="butLog">Login</button>
        )}

        {textMode === 'prime' && user_name && (
          <div>
            <p style={{ fontSize: '13px', marginBottom: '5px' }}>Welcome {user_name}</p>
            {mentor_code && loaded === 0 && (
              <p style={{ fontSize: '11px', marginBottom: '10px', color: '#666' }}>
                Your mentor code: <strong>{mentor_code}</strong>
              </p>
            )}
            {!mentor_code && loaded === 0 && (
              <p style={{ fontSize: '11px', marginBottom: '10px', color: '#999' }}>Loading mentor code...</p>
            )}
          </div>
        )}

        {textMode === 'prime' && loaded === 0 && user_name && (
          <div className="button-group">
            <button onClick={handleLogout} className="butLog">Logout</button>
            <button onClick={onMentorClick} className="butLog">Mentor Manager</button>
          </div>
        )}

        {textMode === 'prime' && user_name && (
          <div className="row">
            {loaded === 0 && (
              <div className="col-sm-6" style={{ padding: '0 3px 0 9px' }}>
                <select onChange={onLevelChange} name="gendre_lvl" className="selectProg" value={selectGen && selectLvl ? `${selectGen}:${selectLvl}` : ''}>
                  <option value="">Choose your level</option>
                  <optgroup label="For User">
                    {listProgUsers.map(group => (
                      <option key={group[0]} value={`Users:${group[0]}`}>{group[0]}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}
            {loaded === 0 && (
              <div className="col-sm-6" style={{ padding: '0 2px 0 9px' }}>
                <select value={select} name="program" onChange={onProgramChange} className="selectProg">
                  <option value="">Choose a workout</option>
                  {listProgUsers
                    .filter(group => group[0] === selectLvl && selectGen === 'Users')
                    .map(group => (
                      <optgroup key={group[0]} label={group[0]}>
                        {group[1].map((prog, index) => (
                          <option key={prog} value={prog}>{prog}{group[2] ? group[2][index] : ''}</option>
                        ))}
                      </optgroup>
                    ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="row">
          {textMode === 'free' && loaded === 0 && (
            <div className="col-sm-6" style={{ padding: '0 3px 0 9px' }}>
              <select onChange={onLevelChange} name="gendre_lvl" className="selectProg" value={selectGen && selectLvl ? `${selectGen}:${selectLvl}` : ''}>
                <option value="">Choose your level</option>
                <optgroup label="For Male">
                  {listProgMale.map(group => (
                    <option key={group[0]} value={`Male:${group[0]}`}>{group[0]}</option>
                  ))}
                </optgroup>
                <optgroup label="For Female">
                  {listProgFemale.map(group => (
                    <option key={group[0]} value={`Female:${group[0]}`}>{group[0]}</option>
                  ))}
                </optgroup>
                <optgroup label="For Personal">
                  {listProgPers.map(group => (
                    <option key={group[0]} value={`Pers:${group[0]}`}>{group[0]}</option>
                  ))}
                </optgroup>
                <optgroup label="For Calisthenic">
                  {listProgCal.map(group => (
                    <option key={group[0]} value={`Cal:${group[0]}`}>{group[0]}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          )}

          {textMode === 'free' && loaded === 0 && (
            <div className="col-sm-6" style={{ padding: '0 2px 0 9px' }}>
              <select value={select} name="program" onChange={onProgramChange} className="selectProg">
                <option value="">Choose a workout</option>
                {listProgMale.filter(g => g[0] === selectLvl && selectGen === 'Male').map(group => (
                  <optgroup key={group[0]} label={group[0]}>
                    {group[1].map((prog, i) => (
                      <option key={prog} value={prog}>{prog}{group[2] ? group[2][i] : ''}</option>
                    ))}
                  </optgroup>
                ))}
                {listProgFemale.filter(g => g[0] === selectLvl && selectGen === 'Female').map(group => (
                  <optgroup key={group[0]} label={group[0]}>
                    {group[1].map((prog, i) => (
                      <option key={prog} value={prog}>{prog}{group[2] ? group[2][i] : ''}</option>
                    ))}
                  </optgroup>
                ))}
                {listProgPers.filter(g => g[0] === selectLvl && selectGen === 'Pers').map(group => (
                  <optgroup key={group[0]} label={group[0]}>
                    {group[1].map((prog, i) => (
                      <option key={prog} value={prog}>{prog}{group[2] ? group[2][i] : ''}</option>
                    ))}
                  </optgroup>
                ))}
                {listProgCal.filter(g => g[0] === selectLvl && selectGen === 'Cal').map(group => (
                  <optgroup key={group[0]} label={group[0]}>
                    {group[1].map((prog, i) => (
                      <option key={prog} value={prog}>{prog}{group[2] ? group[2][i] : ''}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}
        </div>

        {loaded === 0 && (
          <p style={{ fontSize: '13px' }}>{'<<< Or click on Banner to switch mode'}</p>
        )}
      </div>
    </div>
  );
}
