let players = []
let isHost = false
let roomCode = ''
let myPlayerId = ''
let myPlayerName = ''
let p2pReady = false

let spyCount = 1
let blankCount = 0
let angelCount = 0
let selectedBlank = ''
let selectedAngel = ''
let maxPlayers = 10

function generateRoomCode() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function generatePlayerId() {
  return 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

function createRoom() {
  myPlayerName = document.getElementById('playerNameInput').value.trim()
  if (!myPlayerName) {
    alert('请输入你的名字')
    return
  }
  if (myPlayerName.length > 10) {
    alert('名字最多10个字符')
    return
  }

  isHost = true
  roomCode = generateRoomCode()
  myPlayerId = 'host_' + roomCode

  players = [{ id: myPlayerId, name: myPlayerName, role: 'host', alive: true }]

  App.setGlobalData('roomCode', roomCode)
  App.setGlobalData('myPlayerId', myPlayerId)
  App.setGlobalData('myPlayerName', myPlayerName)
  App.setGlobalData('isHost', true)
  App.setGlobalData('players', players)

  showGameSetup()
  initP2PAsHost()
  showShareLink()
}

function joinRoom() {
  const code = document.getElementById('roomCodeInput').value.trim().toUpperCase()
  myPlayerName = document.getElementById('playerNameInput').value.trim()

  if (!myPlayerName) {
    alert('请输入你的名字')
    return
  }
  if (!code) {
    alert('请输入房间号')
    return
  }

  isHost = false
  roomCode = code
  myPlayerId = generatePlayerId()

  players = [{ id: myPlayerId, name: myPlayerName, role: 'civilian', alive: true }]

  App.setGlobalData('roomCode', roomCode)
  App.setGlobalData('myPlayerId', myPlayerId)
  App.setGlobalData('myPlayerName', myPlayerName)
  App.setGlobalData('isHost', false)
  App.setGlobalData('players', players)

  showGameSetup()
  initP2PAsGuest()
}

function showGameSetup() {
  document.getElementById('roomSection').style.display = 'none'
  document.getElementById('gameSetup').style.display = 'block'
  document.getElementById('roomCodeDisplay').style.display = 'block'
  document.getElementById('roomCodeDisplay').textContent = '房间号：' + roomCode
  document.getElementById('myName').textContent = '你的名字：' + myPlayerName + (isHost ? ' (房主/主持人)' : '')
  document.getElementById('hostSettings').style.display = isHost ? 'block' : 'none'
  document.getElementById('startBtn').style.display = isHost ? 'block' : 'none'
  document.getElementById('waitingHint').style.display = isHost ? 'none' : 'flex'

  updatePlayersGrid()
  updatePlayerCount()
}

function showRoomSection() {
  if (p2pReady && P2PManager) {
    P2PManager.disconnect()
  }
  p2pReady = false
  document.getElementById('roomSection').style.display = 'block'
  document.getElementById('gameSetup').style.display = 'none'
}

async function initP2PAsHost() {
  if (typeof P2PManager === 'undefined') {
    alert('P2P 模块加载失败')
    return
  }

  const status = document.getElementById('connectionStatus')
  if (status) {
    status.textContent = '● 连接中...'
    status.style.color = '#ffc107'
  }

  try {
    await P2PManager.init(myPlayerId, myPlayerName, {
      onPlayerJoined: (playerId, playerName, conn) => {
        const exists = players.find(p => p.id === playerId)
        if (!exists) {
          const newPlayer = { id: playerId, name: playerName, role: 'civilian', alive: true }
          players.push(newPlayer)
          updatePlayersGrid()
          updatePlayerCount()
          validateStartBtn()
          
          P2PManager.broadcastMessage({
            type: 'players_update',
            players: players
          })
        }
      },
      onPlayersUpdate: (updatedPlayers) => {
        players = updatedPlayers
        updatePlayersGrid()
        updatePlayerCount()
      }
    })

    p2pReady = true
    await P2PManager.createRoom(roomCode, players)

    if (status) {
      status.textContent = '● 已连接（房主）'
      status.style.color = '#4caf50'
    }
  } catch (err) {
    console.error('创建房间失败:', err)
    alert('创建房间失败：' + err.message)
  }
}

async function initP2PAsGuest() {
  if (typeof P2PManager === 'undefined') {
    alert('P2P 模块加载失败')
    return
  }

  const status = document.getElementById('connectionStatus')
  if (status) {
    status.textContent = '● 连接中...'
    status.style.color = '#ffc107'
  }

  try {
    await P2PManager.init(myPlayerId, myPlayerName, {
      onHostInfo: (data) => {
        console.log('收到房主信息:', data)
      },
      onPlayersUpdate: (updatedPlayers) => {
        players = updatedPlayers
        updatePlayersGrid()
        updatePlayerCount()
      },
      onSettingsUpdate: (data) => {
        if (data.spyCount !== undefined) {
          spyCount = data.spyCount
          document.getElementById('spyCount').textContent = spyCount
        }
        if (data.blankCount !== undefined) {
          blankCount = data.blankCount
          document.getElementById('blankCount').textContent = blankCount
        }
        if (data.angelCount !== undefined) {
          angelCount = data.angelCount
          document.getElementById('angelCount').textContent = angelCount
        }
        if (data.selectedBlank !== undefined) selectedBlank = data.selectedBlank
        if (data.selectedAngel !== undefined) selectedAngel = data.selectedAngel
        if (data.blankWord !== undefined) {
          const input = document.getElementById('blankWordInput')
          if (input) input.value = data.blankWord
        }
        updateAssignPanelVisibility()
        updateAssignPanels()
        validateStartBtn()
      },
      onGameStart: (data) => {
        App.setGlobalData('players', data.players)
        App.setGlobalData('currentWord', data.civilianWord)
        App.setGlobalData('spyWord', data.spyWord)
        App.setGlobalData('blankWord', data.blankWord || '')
        App.setGlobalData('hostPlayer', data.hostPlayer || '')
        App.setGlobalData('round', 1)
        window.location.href = 'game.html'
      }
    })

    p2pReady = true
    await P2PManager.joinRoom(roomCode, { id: myPlayerId, name: myPlayerName })

    if (status) {
      status.textContent = '● 已连接'
      status.style.color = '#4caf50'
    }
  } catch (err) {
    console.error('加入房间失败:', err)
    alert('加入房间失败：' + err.message)
    showRoomSection()
  }
}

function updatePlayersGrid() {
  const grid = document.getElementById('playersGrid')
  if (!grid) return
  grid.innerHTML = players.map(p => `
    <div class="player-item ${p.role === 'host' ? 'host' : ''}" id="player-${p.id}">
      <span class="player-avatar">${p.name.charAt(0)}</span>
      <span class="player-name">${p.name}${p.role === 'host' ? ' 🎤' : ''}</span>
    </div>
  `).join('')
  updateAssignPanels()
}

function updatePlayerCount() {
  const cur = document.getElementById('currentPlayerCount')
  const max = document.getElementById('maxPlayerCount')
  if (cur) cur.textContent = players.length
  if (max) max.textContent = maxPlayers
}

function decreaseSpy() {
  if (!isHost) return
  if (spyCount > 1) {
    spyCount--
    document.getElementById('spyCount').textContent = spyCount
    broadcastSettings()
    validateStartBtn()
  }
}

function increaseSpy() {
  if (!isHost) return
  const max = Math.max(1, players.length - 1 - blankCount - angelCount)
  if (spyCount < max) {
    spyCount++
    document.getElementById('spyCount').textContent = spyCount
    broadcastSettings()
    validateStartBtn()
  }
}

function decreaseBlank() {
  if (!isHost) return
  if (blankCount > 0) {
    blankCount = 0
    selectedBlank = ''
    document.getElementById('blankCount').textContent = 0
    updateAssignPanelVisibility()
    updateAssignPanels()
    broadcastSettings()
    validateStartBtn()
  }
}

function increaseBlank() {
  if (!isHost) return
  if (blankCount === 0 && players.filter(p => p.role !== 'host').length - spyCount - angelCount >= 1) {
    blankCount = 1
    document.getElementById('blankCount').textContent = 1
    updateAssignPanelVisibility()
    updateAssignPanels()
    broadcastSettings()
    validateStartBtn()
  } else if (blankCount === 0) {
    alert('需要先有足够的玩家才能选择白板')
  }
}

function decreaseAngel() {
  if (!isHost) return
  if (angelCount > 0) {
    angelCount = 0
    selectedAngel = ''
    document.getElementById('angelCount').textContent = 0
    updateAssignPanelVisibility()
    updateAssignPanels()
    broadcastSettings()
    validateStartBtn()
  }
}

function increaseAngel() {
  if (!isHost) return
  if (angelCount === 0 && players.filter(p => p.role !== 'host').length - spyCount - blankCount >= 1) {
    angelCount = 1
    document.getElementById('angelCount').textContent = 1
    updateAssignPanelVisibility()
    updateAssignPanels()
    broadcastSettings()
    validateStartBtn()
  } else if (angelCount === 0) {
    alert('需要先有足够的玩家才能选择天使')
  }
}

function updateAssignPanelVisibility() {
  const showAssign = (blankCount > 0 || angelCount > 0)
  document.getElementById('assignSection').style.display = showAssign ? 'block' : 'none'
  document.getElementById('blankAssignSection').style.display = blankCount > 0 ? 'block' : 'none'
  document.getElementById('blankWordSection').style.display = blankCount > 0 ? 'block' : 'none'
  document.getElementById('angelAssignSection').style.display = angelCount > 0 ? 'block' : 'none'
}

function updateAssignPanels() {
  if (!isHost) return
  updateAssignPanel('blankPlayers', selectedBlank, 'blank')
  updateAssignPanel('angelPlayers', selectedAngel, 'angel')
}

function updateAssignPanel(containerId, selectedId, role) {
  const container = document.getElementById(containerId)
  if (!container) return
  const nonHostPlayers = players.filter(p => p.role !== 'host')
  container.innerHTML = nonHostPlayers.map(p => {
    const isSelected = selectedId === p.id
    const isOtherSelected = (role === 'blank' && selectedAngel === p.id) || (role === 'angel' && selectedBlank === p.id)
    return `
      <div class="assign-player ${isSelected ? 'selected' : ''} ${isOtherSelected ? 'disabled' : ''}" 
           onclick="selectRolePlayer('${role}', '${p.id}')">
        <span class="assign-player-name">${p.name}</span>
        ${isSelected ? '<span class="check-icon">✓</span>' : ''}
      </div>
    `
  }).join('')
}

function selectRolePlayer(role, playerId) {
  if (!isHost) return
  if (role === 'blank') {
    if (playerId === selectedAngel) {
      alert('白板和天使不能是同一人')
      return
    }
    selectedBlank = selectedBlank === playerId ? '' : playerId
  } else if (role === 'angel') {
    if (playerId === selectedBlank) {
      alert('白板和天使不能是同一人')
      return
    }
    selectedAngel = selectedAngel === playerId ? '' : playerId
  }
  updateAssignPanels()
  broadcastSettings()
  validateStartBtn()
}

function broadcastSettings() {
  if (!isHost || !p2pReady) return
  if (typeof P2PManager === 'undefined' || !P2PManager.isConnected()) return

  const blankWord = document.getElementById('blankWordInput')?.value?.trim() || ''

  P2PManager.broadcastMessage({
    type: 'settings_update',
    settings: {
      spyCount: spyCount,
      blankCount: blankCount,
      angelCount: angelCount,
      selectedBlank: selectedBlank,
      selectedAngel: selectedAngel,
      blankWord: blankWord
    }
  })
}

function validateStartBtn() {
  const btn = document.getElementById('startBtn')
  if (!btn) return
  
  const civilianWord = document.getElementById('civilianWordInput')?.value?.trim()
  const spyWord = document.getElementById('spyWordInput')?.value?.trim()
  
  const nonHostCount = players.filter(p => p.role !== 'host').length
  let valid = nonHostCount >= 3 && civilianWord && spyWord
  
  if (valid && spyCount < 1) valid = false
  if (valid && spyCount >= nonHostCount) valid = false
  if (valid && blankCount > 0 && !selectedBlank) valid = false
  if (valid && angelCount > 0 && !selectedAngel) valid = false
  
  btn.disabled = !valid
}

function prepareStart() {
  if (!isHost) {
    alert('只有房主可以开始游戏')
    return
  }
  
  const civilianWord = document.getElementById('civilianWordInput').value.trim()
  const spyWord = document.getElementById('spyWordInput').value.trim()

  if (!civilianWord || !spyWord) {
    alert('请输入平民词和卧底词')
    return
  }

  if (civilianWord === spyWord) {
    alert('平民词和卧底词不能相同')
    return
  }

  const nonHostCount = players.filter(p => p.role !== 'host').length
  if (nonHostCount < 3) {
    alert('至少需要3名玩家')
    return
  }

  if (blankCount > 0 && !selectedBlank) {
    alert('请选择白板玩家')
    return
  }

  if (angelCount > 0 && !selectedAngel) {
    alert('请选择天使玩家')
    return
  }

  const blankWord = document.getElementById('blankWordInput')?.value?.trim() || ''
  const gamePlayers = assignRoles(players, blankCount, selectedBlank, angelCount, selectedAngel, spyCount, civilianWord, spyWord)
  
  App.setGlobalData('players', gamePlayers)
  App.setGlobalData('currentWord', civilianWord)
  App.setGlobalData('spyWord', spyWord)
  App.setGlobalData('blankWord', blankWord)
  App.setGlobalData('hostPlayer', myPlayerName)
  App.setGlobalData('round', 1)

  if (p2pReady && P2PManager.isConnected()) {
    P2PManager.broadcastMessage({
      type: 'game_start',
      players: gamePlayers,
      civilianWord: civilianWord,
      spyWord: spyWord,
      blankWord: blankWord,
      hostPlayer: myPlayerName,
      round: 1
    })
  }
  
  setTimeout(() => {
    window.location.href = 'game.html'
  }, 300)
}

function assignRoles(playersList, numBlank, blankId, numAngel, angelId, numSpy, civWord, spyWord) {
  const result = JSON.parse(JSON.stringify(playersList))
  const nonHostPlayers = result.filter(p => p.role !== 'host')
  const nonHostIds = nonHostPlayers.map(p => p.id)
  
  const shuffled = [...nonHostIds].sort(() => Math.random() - 0.5)
  
  let spyAssigned = []
  let idx = 0
  
  for (let i = 0; i < numSpy && idx < shuffled.length; i++) {
    while (shuffled[idx] === blankId || shuffled[idx] === angelId) {
      idx++
      if (idx >= shuffled.length) break
    }
    if (idx < shuffled.length) {
      const playerId = shuffled[idx++]
      const playerIdx = result.findIndex(r => r.id === playerId)
      if (playerIdx >= 0) {
        result[playerIdx].role = 'spy'
        result[playerIdx].word = spyWord
        spyAssigned.push(playerId)
      }
    }
  }
  
  if (numBlank > 0 && blankId) {
    const blankIdx = result.findIndex(p => p.id === blankId)
    if (blankIdx >= 0) {
      result[blankIdx].role = 'blank'
      result[blankIdx].word = ''
    }
  }
  
  if (numAngel > 0 && angelId) {
    const angelIdx = result.findIndex(p => p.id === angelId)
    if (angelIdx >= 0) {
      result[angelIdx].role = 'angel'
      result[angelIdx].word = civWord
    }
  }
  
  result.forEach((p, i) => {
    if (p.role === 'civilian') {
      result[i].role = 'civilian'
      result[i].word = civWord
    }
  })
  
  return result
}

if (typeof window !== 'undefined') {
  window.createRoom = createRoom
  window.joinRoom = joinRoom
  window.showRoomSection = showRoomSection
  window.decreaseSpy = decreaseSpy
  window.increaseSpy = increaseSpy
  window.decreaseBlank = decreaseBlank
  window.increaseBlank = increaseBlank
  window.decreaseAngel = decreaseAngel
  window.increaseAngel = increaseAngel
  window.selectRolePlayer = selectRolePlayer
  window.prepareStart = prepareStart
  window.copyShareLink = copyShareLink
}

function showShareLink() {
  const shareSection = document.getElementById('shareLinkSection')
  const onlineHint = document.getElementById('onlineHint')
  if (shareSection) {
    shareSection.style.display = 'block'
    onlineHint.style.display = 'none'
  }
}

function copyShareLink() {
  const link = window.location.origin + window.location.pathname + '?room=' + roomCode
  navigator.clipboard.writeText(link).then(() => {
    const hint = document.getElementById('shareHint')
    if (hint) {
      hint.textContent = '已复制！'
      setTimeout(() => { hint.textContent = '' }, 2000)
    }
  }).catch(() => {
    prompt('复制此链接分享给朋友:', link)
  })
}

function checkUrlParams() {
  const params = new URLSearchParams(window.location.search)
  const roomParam = params.get('room')
  if (roomParam) {
    const input = document.getElementById('roomCodeInput')
    if (input) {
      input.value = roomParam.toUpperCase()
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const civInput = document.getElementById('civilianWordInput')
  const spyInput = document.getElementById('spyWordInput')
  const blankInput = document.getElementById('blankWordInput')
  
  if (civInput) civInput.addEventListener('input', () => { if (isHost) { validateStartBtn(); broadcastSettings() } })
  if (spyInput) spyInput.addEventListener('input', () => { if (isHost) { validateStartBtn(); broadcastSettings() } })
  if (blankInput) blankInput.addEventListener('input', () => { if (isHost) broadcastSettings() })
  
  checkUrlParams()
})