// Recap level logic
function initializeRecap() {
  // Get level from URL
  const urlParams = new URLSearchParams(window.location.search);
  const pathParts = window.location.pathname.split('/');
  const htmlFile = pathParts[pathParts.length - 1];
  
  // Extract level number from filename (Recap-Level1.html -> 1)
  const levelMatch = htmlFile.match(/Level(\d)/);
  const currentLevel = levelMatch ? parseInt(levelMatch[1]) : 1;

  // Get recap data
  const recap = recapData[`level${currentLevel}`];
  if (!recap) {
    console.error(`No recap data for level ${currentLevel}`);
    return;
  }

  // Update title
  document.getElementById('recap-title').textContent = recap.title;
  document.getElementById('recap-subtitle').textContent = `🎓 Learn from Level ${currentLevel}`;

  // Scenario
  document.getElementById('scenario-description').textContent = recap.scenario.description;
  const chainHTML = recap.scenario.attackChain.map(item => 
    `<div class="flex gap-4 items-start">
      <div class="text-yellow-400 font-mono font-bold min-w-16">${item.time}</div>
      <div>
        <div class="text-white font-semibold">${item.event}</div>
        <div class="text-gray-400 text-sm">${item.type}</div>
      </div>
    </div>`
  ).join('');
  document.getElementById('attack-chain').innerHTML = chainHTML;

  // Timeline
  const timelineHTML = recap.timeline.events.map(event =>
    `<div class="bg-gray-800 p-4 rounded border-l-4 ${
      event.severity === 'critical' ? 'border-red-500' :
      event.severity === 'high' ? 'border-orange-500' :
      event.severity === 'medium' ? 'border-yellow-500' : 'border-green-500'
    }">
      <div class="flex justify-between items-start mb-2">
        <h4 class="text-lg font-semibold text-white">${event.id}. ${event.title}</h4>
        <span class="badge-severity severity-${event.severity}">${event.severity.toUpperCase()}</span>
      </div>
      <div class="flex gap-4 text-sm">
        <div class="text-blue-400 font-mono">${event.time}</div>
        <div class="text-gray-300">${event.description}</div>
      </div>
    </div>`
  ).join('');
  
  document.getElementById('timeline-events').innerHTML = timelineHTML;

  // Key Learnings
  const learningsHTML = recap.keyLearnings.map(learn =>
    `<div class="bg-gray-800 p-4 rounded card-hover">
      <div class="text-2xl mb-2">${learn.icon}</div>
      <h4 class="text-lg font-semibold text-blue-300 mb-2">${learn.title}</h4>
      <p class="text-gray-300 text-sm leading-relaxed">${learn.description}</p>
    </div>`
  ).join('');
  document.getElementById('learnings-container').innerHTML = learningsHTML;

  // Common Mistakes
  const mistakesHTML = recap.commonMistakes.map(mistake =>
    `<div class="bg-gray-800 p-4 rounded border-l-4 border-red-500">
      <div class="mb-2 text-red-300 font-semibold">${mistake.mistake}</div>
      <div class="mb-2 text-green-300 font-semibold text-sm">${mistake.solution}</div>
      <div class="text-gray-400 text-sm italic">${mistake.impact}</div>
    </div>`
  ).join('');
  document.getElementById('mistakes-container').innerHTML = mistakesHTML;

  // Score Explanation
  const scoreExp = recap.scoreExplanation;
  const componentHTML = scoreExp.components.map(comp =>
    `<div class="bg-gray-800 p-3 rounded border-l-4 border-blue-500">
      <div class="flex justify-between items-start mb-1">
        <span class="font-semibold text-blue-300">${comp.category}</span>
        <span class="text-yellow-400 font-bold">${comp.points} pts</span>
      </div>
      <div class="text-gray-400 text-sm">${comp.note}</div>
    </div>`
  ).join('');
  document.getElementById('score-components').innerHTML = componentHTML;

  const penaltyHTML = scoreExp.penalties.map(pen =>
    `<div class="bg-gray-800 p-3 rounded border-l-4 border-red-500">
      <div class="flex justify-between items-start mb-1">
        <span class="font-semibold">${pen.action}</span>
        <span class="text-red-400 font-bold">${pen.points}</span>
      </div>
    </div>`
  ).join('');
  document.getElementById('score-penalties').innerHTML = penaltyHTML;

  document.getElementById('score-interpretation').innerHTML = 
    `<p class="text-base"><strong>📈 Score Interpretation:</strong></p>
     <p class="mt-2">${scoreExp.interpretation}</p>`;

  // Previous level buttons
  let prevHTML = '';
  for (let i = 1; i < currentLevel; i++) {
    prevHTML += `
      <button onclick="goToLevel(${i})" class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-semibold text-sm">
        <i class="fas fa-chevron-left"></i> Level ${i} Recap
      </button>
    `;
  }
  document.getElementById('prev-levels-container').innerHTML = prevHTML || 
    '<span class="text-gray-400 text-sm">This is the first level!</span>';

  // Next level button
  const nextBtn = document.getElementById('next-level-btn');
  nextBtn.onclick = () => goToNextLevel(currentLevel);
  if (currentLevel >= 5) {
    nextBtn.textContent = '🎓 Course Complete!';
    nextBtn.onclick = () => {
      window.location.href = 'index.html';
    };
    nextBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
    nextBtn.classList.add('bg-purple-600', 'hover:bg-purple-700');
  }

  // Show score section if available
  const sessionScore = sessionStorage.getItem(`level${currentLevel}Score`);
  if (sessionScore) {
    const scoreSection = document.getElementById('score-section');
    scoreSection.classList.remove('hidden');
    const parts = sessionScore.split('|');
    document.getElementById('final-score').textContent = `${parts[0]}/100`;
    document.getElementById('accuracy').textContent = parts[1] || '0%';
    document.getElementById('time-used').textContent = parts[2] || '0m 0s';
  }
}

// Navigation functions
function goToLevel(level) {
  window.location.href = `Recap-Level${level}.html`;
}

function goToNextLevel(currentLevel) {
  if (currentLevel < 5) {
    window.location.href = `Level${currentLevel + 1}.html`;
  } else {
    window.location.href = 'index.html';
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initializeRecap);
