import React from 'react';
import { useWorkout } from '../context/WorkoutContext.jsx';

export default function ExercisePlayer() {
  const {
    count, flagStart, exSumSet,
    row1_1, row1_2, row1_3, row2, row3, row3_exs, row4,
    textbreak, buttonStart,
    handleStart, handleNext, handleBack
  } = useWorkout();

  function renderRow3Item(exer) {
    const inputIdx = exer.indexOf('input');
    if (inputIdx < 0) return exer;
    const xIdx = exer.indexOf(' x');
    const beforeInput = xIdx >= 0 ? exer.slice(0, xIdx + 2) : exer.slice(0, inputIdx);
    const afterPart = xIdx >= 0 ? exer.slice(xIdx + 2) : exer.slice(inputIdx);
    return (
      <>
        <span>{beforeInput}</span>
        <span dangerouslySetInnerHTML={{ __html: afterPart }} />
      </>
    );
  }

  return (
    <>
      <div className="row">
        <div className="col-sm-3"><p className="row1">{row1_1}</p></div>
        <div className="col-sm-6"><p className="row1">{row1_2}</p></div>
        <div className="col-sm-3"><p className="row1">{row1_3}</p></div>
      </div>

      <div id="frame_row2" className="row">
        {row2.length > 0 && (
          <div id="button-back" className="button" onClick={handleBack}>
            <a href="#" onClick={e => e.preventDefault()}>{'<<<<'}</a>
          </div>
        )}
        <div id="row2">
          <p className="row2">{row2}</p>
        </div>
        {row2.length > 0 && (
          <div id="button-next" className="button" onClick={handleNext}>
            <a href="#" onClick={e => e.preventDefault()}>{'>>>>'}</a>
          </div>
        )}
      </div>

      {(count === 0 || flagStart === 2) && (
        <p className="row3" style={{ whiteSpace: 'pre-line' }}>{row3}</p>
      )}
      {count > 0 && flagStart < 2 && row3_exs.map((exer, idx) => (
        <p key={idx} className="row3">
          {renderRow3Item(exer)}
        </p>
      ))}
      <p className={`row4-${textbreak}`}>{row4}</p>

      <div id="frame_button" className="row">
        {exSumSet > 0 && (
          <div id="button-start" onClick={handleStart}>
            {buttonStart === 'Start' && <img src="./images/start.png" className="img-responsive button-img" alt="Start" />}
            {buttonStart === 'Done' && <img src="./images/done.png" className="img-responsive button-img" alt="Done" />}
            {buttonStart === 'Pause' && <img src="./images/pause.png" className="img-responsive button-img" alt="Pause" />}
            {buttonStart === 'Finish' && <img src="./images/finish.png" className="img-responsive button-img" alt="Finish" />}
          </div>
        )}
      </div>
    </>
  );
}
