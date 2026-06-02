let players = []
let civilianWord = ''
let spyWord = ''
let blankWord = ''
let hostName = ''
let isHost = false
let myRole = ''
let myWord = ''
let roomCode = ''
let myPlayerId = ''
let p2pReady = false
let wordVisible = true
let round = 1

function getRoleName(roleType) {
  const names = {
    civilian: '平民',
    spy: '卧底',
    blank: '白板',
    angel: '天使',
    host: '主持人'
  }
  return names[roleType] || '未知'
}

function getRoleIcon(roleType) {
  const icons = {
    civilian: '👥',
    spy: '🎭',
    blank: '📝',
    angel: '😇',
    host: '🎤'
  }
  return icons[roleType] || '❓'
}

function initGame() {
  const data = App.getGlobalData()

  players = data.players.map(p => ({
    ...p,
    roleName: getRoleName(p.role),
    alive: p.alive !== undefined ? p.alive : true
  }))

  civilianWord = data.currentWord
  spyWord = data.spyWord
  blankWord = data.blankWord || ''
  hostName = data.hostPlayer || ''
  round = data.round || 1
  isHost = data.isHost || false
  roomCode = data.roomCode || ''
  myPlayerId = data.myPlayerId || ''

  document.getElementById('round').textContent = round
  document.getElementById('roomCodeDisplay').textContent = '房间号：' + roomCode
  document.getElementById('hostName').textContent = '主持人：' + hostName

  determineMyRole()
  initP2P()
}

function initP2P() {
  const status = document.getElementById('connectionStatus')
  if (status) {
    status.textContent = '● 连接中...'
    status.style.color = '#ffc107'
  }

  if (typeof P2PManager === 'undefined') {
    console.error('P2PManager not loaded')
    return
  }

  P2PManager.init(myPlayerId, '', {
    onGameStart: (data) => {
      players = data.players.map(p => ({
        ...p,
        roleName: getRoleName(p.role),
        alive: p.alive !== undefined ? p.alive : true
      }))
      civilianWord = data.civilianWord
      spyWord = data.spyWord
      blankWord = data.blankWord || ''
      hostName = data.hostPlayer || ''

      App.setGlobalData('players', players)
      App.setGlobalData('currentWord', civilianWord)
      App.setGlobalData('spyWord', spyWord)
      App.setGlobalData('blankWord', blankWord)
      App.setGlobalData('hostPlayer', hostName)

      document.getElementById('hostName').textContent = '主持人：' + hostName
      determineMyRole()
    },

    onPlayerEliminated: (data) => {
      players = data.players.map(p => ({
        ...p,
        roleName: getRoleName(p.role),
        alive: p.alive !== undefined ? p.alive : true
      }))
      const eliminated = data.eliminatedPlayer
      const isMe = eliminated.id === myPlayerId
      if (isMe) {
        showEliminatedNotice(eliminated)
      }
      updateHostPlayersGrid()
      checkGameEnd()
    },

    onForceEliminate: (data) => {
      const playerIndex = players.findIndex(p => p.id === data.playerId)
      if (playerIndex !== -1) {
        players[playerIndex].alive = false
        const eliminated = players[playerIndex]
        if (eliminated.id === myPlayerId) {
          showEliminatedNotice(eliminated)
        }
        updateHostPlayersGrid()
        checkGameEnd()
      }
    },

    onNextRound: (data) => {
      round = data.round
      document.getElementById('round').textContent = round
      wordVisible = true
      showMyInfo()
    },

    onGameEnd: (data) => {
      App.setGlobalData('winner', data.winner)
      App.setGlobalData('players', data.players)
      App.setGlobalData('currentWord', data.civilianWord)
      App.setGlobalData('spyWord', data.spyWord)
      window.location.href = 'result.html'
    },

    onBlankWin: (data) => {
      if (data.playerId === myPlayerId) {
        alert('🎉 恭喜！你猜对了，白板获胜！')
      }
      App.setGlobalData('winner', 'blank')
      App.setGlobalData('blankWinner', data.playerName)
      window.location.href = 'result.html'
    },

    onPlayersUpdate: (data) => {
      players = data.players.map(p => ({
        ...p,
        roleName: getRoleName(p.role),
        alive: p.alive !== undefined ? p.alive : true
      }))
      updateHostPlayersGrid()
    }
  })

  p2pReady = true

  if (status) {
    status.textContent = '● 已连接'
    status.style.color = '#4caf50'
  }
}

function determineMyRole() {
  const myPlayer = players.find(p => p.id === myPlayerId) || players[0]

  if (myPlayer) {
    myRole = myPlayer.role
    myWord = myPlayer.word

    document.getElementById('wordCard').style.display = 'none'
    document.getElementById('angelNotice').style.display = 'none'
    document.getElementById('blankNotice').style.display = 'none'
    document.getElementById('hostNotice').style.display = 'none'

    if (myRole === 'civilian' || myRole === 'spy') {
      document.getElementById('wordText').textContent = myWord
    } else if (myRole === 'angel') {
      document.getElementById('angelWord1').textContent = civilianWord
      document.getElementById('angelWord2').textContent = spyWord
      document.getElementById('angelNotice').style.display = 'block'
    } else if (myRole === 'blank') {
      if (blankWord) {
        document.getElementById('blankHintText').textContent = blankWord
        document.getElementById('blankHint').style.display = 'block'
      }
      document.getElementById('blankNotice').style.display = 'block'
    }

    if (myRole === 'host') {
      isHost = true
      document.getElementById('hostNotice').style.display = 'block'
      document.getElementById('hostPanel').style.display = 'block'
      document.getElementById('playersStatusCard').style.display = 'block'
      document.getElementById('hostCivilianWord').textContent = civilianWord
      document.getElementById('hostSpyWord').textContent = spyWord
      document.getElementById('actionCard').style.display = 'none'
    }
  } else {
    isHost = true
    document.getElementById('hostNotice').style.display = 'block'
    document.getElementById('hostPanel').style.display = 'block'
    document.getElementById('playersStatusCard').style.display = 'block'
    document.getElementById('actionCard').style.display = 'none'
  }

  updateHostPlayersGrid()
}

function showMyInfo() {
  if (isHost) return
  if (myRole !== 'blank') {
    document.getElementById('wordCard').style.display = 'block'
  } else {
    document.getElementById('blankNotice').style.display = 'block'
  }
  wordVisible = true
  document.getElementById('actionCard').style.display = 'none'
}

function hideWord() {
  document.getElementById('wordCard').style.display = 'none'
  if (myRole === 'blank') {
    document.getElementById('blankNotice').style.display = 'block'
  } else {
    document.getElementById('actionCard').style.display = 'block'
  }
  wordVisible = false
}

function showEliminatedNotice(player) {
  document.getElementById('wordCard').style.display = 'none'
  document.getElementById('angelNotice').style.display = 'none'
  document.getElementById('blankNotice').style.display = 'none'
  document.getElementById('actionCard').style.display = 'none'
  document.getElementById('hostPanel').style.display = 'none'
  
  const eliminatedCard = document.getElementById('eliminatedCard')
  if (eliminatedCard) {
    eliminatedCard.style.display = 'block'
  } else {
    const card = document.createElement('div')
    card.id = 'eliminatedCard'
    card.className = 'identity-card eliminated-card'
    card.innerHTML = `
      <div class="identity-display">
        <span class="identity-icon">💀</span>
        <span class="identity-name">你已被淘汰</span>
      </div>
    `
    document.querySelector('.game-container').insertBefore(card, document.getElementById('wordCard'))
  }
}

function updateHostPlayersGrid() {
  const grid = document.getElementById('hostPlayersGrid')
  if (!grid) return
  
  grid.innerHTML = players
    .filter(p => p.role !== 'host')
    .map((p, i) => {
      const playerIndex = players.findIndex(x => x.id === p.id)
      let wordDisplay = ''
      let wordClass = ''
      
      if (p.role === 'civilian') {
        wordDisplay = civilianWord
        wordClass = 'civilian'
      } else if (p.role === 'spy') {
        wordDisplay = spyWord
        wordClass = 'spy'
      } else if (p.role === 'blank') {
        wordDisplay = blankWord || '(无词)'
        wordClass = 'blank'
      } else if (p.role === 'angel') {
        wordDisplay = civilianWord + ' / ' + spyWord
        wordClass = 'angel'
      }
      
      return `
        <div class="host-player-card ${!p.alive ? 'eliminated' : ''}">
          <div class="host-player-header">
            <span class="host-player-name">${p.name}</span>
            <span class="host-player-status ${p.alive ? 'alive' : 'dead'}">${p.alive ? '✓' : '💀'}</span>
          </div>
          <div class="host-player-role role-${p.role}">
            <span class="role-icon">${getRoleIcon(p.role)}</span>
            <span class="role-name">${getRoleName(p.role)}</span>
          </div>
          <div class="host-player-word ${wordClass}">${wordDisplay}</div>
          ${p.alive && p.role !== 'host' ? `<button class="btn-eliminate" onclick="confirmForceEliminate(${playerIndex})">淘汰</button>` : ''}
        </div>
      `
    }).join('')
}

function openEliminateModal() {
  const modal = document.getElementById('eliminateModal')
  modal.classList.add('show')

  const modalPlayers = document.getElementById('modalPlayers')
  if (modalPlayers) {
    modalPlayers.innerHTML = players
      .filter(p => p.alive && p.role !== 'host')
      .map((p, i) => {
        const idx = players.findIndex(x => x.id === p.id)
        return `
          <div class="modal-player" onclick="confirmForceEliminate(${idx})">
            <span>${p.name}</span>
          </div>
        `
      }).join('')
  }
}

function closeEliminateModal() {
  document.getElementById('eliminateModal').classList.remove('show')
}

function confirmForceEliminate(index) {
  closeEliminateModal()
  const player = players[index]
  players[index].alive = false
  
  if (p2pReady && P2PManager.isConnected()) {
    P2PManager.broadcastMessage({
      type: 'force_eliminate',
      playerId: player.id,
      players: players,
      eliminatedPlayer: player
    })
  }
  
  updateHostPlayersGrid()
  checkGameEnd()
}

function nextRound() {
  round++
  document.getElementById('round').textContent = round
  
  if (p2pReady && P2PManager.isConnected()) {
    P2PManager.broadcastMessage({
      type: 'next_round',
      round: round,
      players: players
    })
  }
}

function endGame() {
  if (p2pReady && P2PManager.isConnected()) {
    P2PManager.broadcastMessage({
      type: 'end_game',
      winner: 'host_end',
      players: players,
      civilianWord: civilianWord,
      spyWord: spyWord
    })
  } else {
    App.setGlobalData('winner', 'host_end')
    window.location.href = 'result.html'
  }
}

function checkGameEnd() {
  const alivePlayersList = players.filter(p => p.alive && p.role !== 'host')
  const spies = alivePlayersList.filter(p => p.role === 'spy')
  const civilians = alivePlayersList.filter(p => p.role === 'civilian' || p.role === 'angel')

  if (spies.length === 0) {
    setTimeout(() => showWinnerModal('civilian', '🎉 平民胜利！所有卧底被淘汰！'), 1500)
  } else if (spies.length >= civilians.length) {
    setTimeout(() => showWinnerModal('spy', '🎭 卧底胜利！卧底数量已超过平民！'), 1500)
  } else if (alivePlayersList.length <= 1) {
    setTimeout(() => showWinnerModal('civilian', '🎉 平民胜利！只剩最后一人！'), 1500)
  }
}

function showWinnerModal(winner, title) {
  const modal = document.getElementById('winnerModal')
  document.getElementById('winnerTitle').textContent = title
  const info = document.getElementById('winnerInfo')
  info.innerHTML = `
    <p>👥 平民词：${civilianWord}</p>
    <p>🎭 卧底词：${spyWord}</p>
  `
  modal.classList.add('show')

  if (p2pReady && P2PManager.isConnected()) {
    setTimeout(() => {
      P2PManager.broadcastMessage({
        type: 'end_game',
        winner: winner,
        players: players,
        civilianWord: civilianWord,
        spyWord: spyWord
      })
    }, 2000)
  }
}

function goToResult() {
  if (p2pReady && P2PManager.isConnected()) {
    P2PManager.broadcastMessage({
      type: 'end_game',
      winner: 'manual',
      players: players,
      civilianWord: civilianWord,
      spyWord: spyWord
    })
  } else {
    App.setGlobalData('winner', 'manual')
    window.location.href = 'result.html'
  }
}

if (typeof window !== 'undefined') {
  window.showMyInfo = showMyInfo
  window.hideWord = hideWord
  window.openEliminateModal = openEliminateModal
  window.closeEliminateModal = closeEliminateModal
  window.confirmForceEliminate = confirmForceEliminate
  window.nextRound = nextRound
  window.endGame = endGame
  window.goToResult = goToResult
}

initGame()