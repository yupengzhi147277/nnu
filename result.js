function initResult() {
  const data = App.getGlobalData()
  const winner = data.winner
  
  document.getElementById('resultTitle').textContent = winner === 'civilian' ? '平民胜利' : '卧底胜利'
  document.getElementById('resultDesc').textContent = winner === 'civilian' ? '恭喜！卧底已被找出！' : '卧底成功伪装，获得胜利！'
  document.getElementById('resultIcon').textContent = winner === 'civilian' ? '🎉' : '🎭'
  document.getElementById('resultCard').className = 'result-card' + (winner === 'spy' ? ' spy' : '')
  
  document.getElementById('civilianWord').textContent = data.currentWord || ''
  document.getElementById('spyWord').textContent = data.spyWord || ''
  
  const players = data.players.map(p => ({
    ...p,
    roleName: getRoleName(p.role),
    alive: p.alive !== undefined ? p.alive : true
  }))
  
  document.getElementById('civilianCount').textContent = players.filter(p => p.role === 'civilian').length
  document.getElementById('spyCount').textContent = players.filter(p => p.role === 'spy').length
  document.getElementById('blankCount').textContent = players.filter(p => p.role === 'blank').length
  document.getElementById('angelCount').textContent = players.filter(p => p.role === 'angel').length
  document.getElementById('hostCount').textContent = players.filter(p => p.role === 'host').length
  
  const list = document.getElementById('playersList')
  list.innerHTML = players.map(p => `
    <div class="player-item">
      <div class="player-avatar role-${p.role}">${p.name.charAt(0)}</div>
      <div class="player-info">
        <span class="player-name">${p.name}</span>
        <span class="player-role role-${p.role}">${p.roleName}</span>
      </div>
      <span class="player-word">${p.word || '无'}</span>
      ${!p.alive ? '<span class="player-status">💀</span>' : ''}
    </div>
  `).join('')
}

function getRoleName(role) {
  const names = {
    civilian: '平民',
    spy: '卧底',
    blank: '白板',
    angel: '天使',
    host: '主持人'
  }
  return names[role] || '未知'
}

function restartGame() {
  App.clearGlobalData()
  window.location.href = 'index.html'
}

function goHome() {
  App.clearGlobalData()
  window.location.href = 'index.html'
}

if (typeof window !== 'undefined') {
  window.restartGame = restartGame
  window.goHome = goHome
}

initResult()