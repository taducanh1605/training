import React from 'react';
import { useWorkout } from '../context/WorkoutContext.jsx';

export default function ExerciseList() {
  const { exSumSet, exNameOnly, exLinkSearch } = useWorkout();

  if (exSumSet === 0) return null;

  return (
    <div>
      {exNameOnly.map((group, j) => (
        <div key={j}>
          {group.map((name, i) => (
            <span key={i}>
              <br />
              <a href={exLinkSearch[j]?.[i]} target="_blank" rel="noreferrer">{name}</a>
            </span>
          ))}
          <br />
        </div>
      ))}
    </div>
  );
}
