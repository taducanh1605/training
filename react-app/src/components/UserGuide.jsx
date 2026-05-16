import React from 'react';

export default function UserGuide() {
  return (
    <div className="manual">
      <br />
      <dl>
        <dt>Two training options:</dt>
        <dd>- Click on Banner to switch options.</dd>
        <dd>- 1st Option: Select an existing exercise program.</dd>
        <dd>- 2nd Option: Upload your exercise program.</dd>
        <br />
        <dt>Instructions:</dt>
        <dd>1. Click <span style={{ color: '#00ff37' }}>Start</span> button to start the workout.</dd>
        <dd>2. Click <span style={{ color: '#00a2ff' }}>Done</span> button to take a break after finishing a round.</dd>
        <dd>3. More actions: <span style={{ color: '#e4c22e' }}>Pause</span>, <span style={{ color: '#eeff00' }}>Skip</span> or, <span style={{ color: '#eeff00' }}>Backward</span> rounds.</dd>
        <br />
        <dt>Notes:</dt>
        <dd>- Click on the exercise name to be instructed movements.</dd>
        <dd>- x10: indicates 10 reps for that movement.</dd>
        <dd>- x10-5-5: sequentially indicates 10 reps for movements, 5 secs for holding that posture, 5 more reps.</dd>
        <dd>- x30s: indicates 30 secs for holding that posture</dd>
        <br />
        <dt>More workouts:</dt>
        <dd>- Contact <a href="https://taducanh1605.github.io/site/" style={{ color: '#ffee00', fontWeight: 'bold' }} target="_blank" rel="noreferrer">Pika</a> to receive your own workout programs.</dd>
      </dl>
    </div>
  );
}
