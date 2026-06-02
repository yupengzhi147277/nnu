const P2PManager = (function() {
  let peer = null
  let connections = []
  let isHost = false
  let roomCode = ''
  let myPlayerId = ''
  let myPlayerName = ''
  let messageHandlers = {}
  let initTimeout = null

  function init(playerId, playerName, handlers) {
    return new Promise((resolve, reject) => {
      myPlayerId = playerId
      myPlayerName = playerName
      messageHandlers = handlers || {}

      const useHostId = playerId.startsWith('host_')
      const roomPart = useHostId ? playerId.substring(5) : playerId
      const peerId = useHostId ? ('spy-room-' + roomPart) : playerId
      
      console.log('初始化 P2P:', { originalId: playerId, peerId: peerId, isHost: useHostId })
      
      // 设置连接超时（15秒）
      initTimeout = setTimeout(() => {
        console.error('P2P连接超时')
        if (peer) {
          try {
            peer.destroy()
          } catch (e) {}
        }
        reject(new Error('连接超时，请检查网络连接或稍后重试'))
      }, 15000)
      
      try {
        peer = new Peer(peerId, {
          debug: 3,
          host: 'peerjs-server.herokuapp.com',
          port: 443,
          path: '/',
          secure: true,
          config: {
            iceServers: [
              // STUN 服务器
              { url: 'stun:stun.l.google.com:19302' },
              { url: 'stun:stun1.l.google.com:19302' },
              { url: 'stun:stun2.l.google.com:19302' },
              { url: 'stun:stun3.l.google.com:19302' },
              { url: 'stun:stun4.l.google.com:19302' },
              // TURN 服务器（用于穿透严格NAT）
              {
                url: 'turn:numb.viagenie.ca',
                credential: 'muazkh',
                username: 'webrtc@live.com'
              },
              {
                url: 'turn:turn.anyfirewall.com:443?transport=tcp',
                credential: 'webrtc',
                username: 'webrtc'
              },
              {
                url: 'turn:turn.bistri.com:80',
                credential: 'homeo',
                username: 'homeo'
              },
              {
                url: 'turn:turnserver.openvpn.net:443',
                credential: 'openvpn',
                username: 'openvpn'
              }
            ],
            iceTransportPolicy: 'all',
            bundlePolicy: 'max-bundle'
          }
        })

        peer.on('open', (id) => {
          console.log('P2P连接已建立，ID:', id)
          clearTimeout(initTimeout)
          updateStatus('● 已连接')
          resolve()
        })

        peer.on('connection', (conn) => {
          console.log('收到新连接:', conn.peer, 'metadata:', conn.metadata)
          setupConnection(conn)
        })

        peer.on('error', (err) => {
          console.error('P2P错误:', err.type, err)
          clearTimeout(initTimeout)
          if (err.type === 'peer-unavailable') {
            reject(new Error('房间不存在或已关闭，请确认房间号正确'))
          } else if (err.type === 'unavailable-id') {
            reject(new Error('ID已被占用，请刷新页面重试'))
          } else if (err.type === 'timeout') {
            reject(new Error('连接超时，请检查网络或稍后重试'))
          } else {
            reject(new Error('连接失败: ' + err.message))
          }
        })

      } catch (err) {
        console.error('P2P初始化失败:', err)
        reject(err)
      }
    })
  }

  function setupConnection(conn) {
    conn.on('open', () => {
      console.log('连接已建立:', conn.peer, 'isHost:', isHost)
      connections.push(conn)
      
      if (isHost) {
        conn.send({
          type: 'host_info',
          roomCode: roomCode,
          players: []
        })
        
        broadcastMessage({
          type: 'players_update',
          players: players
        })
      }
      
      broadcastMessage({
        type: 'player_info',
        playerId: myPlayerId,
        playerName: myPlayerName
      })
    })

    conn.on('data', (data) => {
      handleMessage(data, conn)
    })

    conn.on('close', () => {
      console.log('连接已关闭:', conn.peer)
      connections = connections.filter(c => c !== conn)
      if (messageHandlers.onPlayerLeft) {
        messageHandlers.onPlayerLeft(conn.peer)
      }
    })

    conn.on('error', (err) => {
      console.error('连接错误:', err)
    })
  }

  function handleMessage(data, conn) {
    console.log('收到消息:', data.type)

    switch (data.type) {
      case 'player_info':
        if (messageHandlers.onPlayerJoined) {
          messageHandlers.onPlayerJoined(data.playerId, data.playerName, conn)
        }
        break

      case 'host_info':
        isHost = false
        roomCode = data.roomCode
        if (messageHandlers.onHostInfo) {
          messageHandlers.onHostInfo(data)
        }
        break

      case 'create_room':
        isHost = true
        roomCode = data.roomCode
        updateStatus('● 已连接（房主）')
        if (messageHandlers.onRoomCreated) {
          messageHandlers.onRoomCreated(data)
        }
        break

      case 'join_room':
        if (isHost && messageHandlers.onPlayerJoined) {
          messageHandlers.onPlayerJoined(data.player.id, data.player.name, conn)
        }
        if (isHost) {
          broadcastMessage({
            type: 'player_joined',
            player: data.player
          })
        }
        break

      case 'player_joined':
        if (messageHandlers.onPlayerJoined) {
          messageHandlers.onPlayerJoined(data.player.id, data.player.name)
        }
        break

      case 'players_update':
        if (messageHandlers.onPlayersUpdate) {
          messageHandlers.onPlayersUpdate(data.players)
        }
        break

      case 'settings_update':
        if (messageHandlers.onSettingsUpdate) {
          messageHandlers.onSettingsUpdate(data.settings)
        }
        break

      case 'game_start':
        if (messageHandlers.onGameStart) {
          messageHandlers.onGameStart(data)
        }
        break

      case 'description_submit':
        if (messageHandlers.onDescription) {
          messageHandlers.onDescription(data)
        }
        break

      case 'vote_submit':
        if (messageHandlers.onVote) {
          messageHandlers.onVote(data)
        }
        break

      case 'player_eliminated':
        if (messageHandlers.onPlayerEliminated) {
          messageHandlers.onPlayerEliminated(data)
        }
        break

      case 'next_round':
        if (messageHandlers.onNextRound) {
          messageHandlers.onNextRound(data)
        }
        break

      case 'skip_to_vote':
        if (messageHandlers.onSkipToVote) {
          messageHandlers.onSkipToVote()
        }
        break

      case 'force_eliminate':
        if (messageHandlers.onForceEliminate) {
          messageHandlers.onForceEliminate(data)
        }
        break

      case 'end_game':
        if (messageHandlers.onGameEnd) {
          messageHandlers.onGameEnd(data)
        }
        break

      case 'blank_win':
        if (messageHandlers.onBlankWin) {
          messageHandlers.onBlankWin(data)
        }
        break

      default:
        console.log('未知消息类型:', data.type)
    }
  }

  function createRoom(code, playerList) {
    isHost = true
    roomCode = code
    updateStatus('● 已连接（房主）')
    
    if (messageHandlers.onRoomCreated) {
      messageHandlers.onRoomCreated({
        roomCode: code,
        players: playerList
      })
    }
  }

  function joinRoom(code, player) {
    return new Promise((resolve, reject) => {
      roomCode = code
      isHost = false
      const hostPeerId = 'spy-room-' + code
      console.log('尝试连接房主:', hostPeerId, '本地ID:', myPlayerId)

      const conn = peer.connect(hostPeerId, {
        reliable: true,
        metadata: { isHost: false, playerName: player.name }
      })

      const timeout = setTimeout(() => {
        if (!conn.open) {
          console.error('连接超时')
          conn.close()
          reject(new Error('连接超时，请检查房间号是否正确'))
        }
      }, 15000)

      conn.on('open', () => {
        console.log('已连接到房主', conn.peer)
        clearTimeout(timeout)
        connections.push(conn)
        
        conn.on('data', (data) => {
          console.log('收到房主消息:', data.type)
          handleMessage(data, conn)
        })

        conn.on('close', () => {
          console.log('与房主的连接已关闭')
          connections = connections.filter(c => c !== conn)
          if (messageHandlers.onPlayerLeft) {
            messageHandlers.onPlayerLeft(conn.peer)
          }
        })

        conn.on('error', (err) => {
          console.error('连接错误:', err)
        })
        
        conn.send({
          type: 'join_room',
          player: player
        })
        console.log('已发送加入请求')
        updateStatus('● 已连接')
        resolve()
      })

      conn.on('error', (err) => {
        console.error('连接房主失败:', err.type)
        clearTimeout(timeout)
        if (err.type === 'peer-unavailable') {
          reject(new Error('房间不存在或已关闭'))
        } else {
          reject(new Error('无法连接到房间'))
        }
      })
    })
  }

  function broadcastMessage(message) {
    console.log('广播消息:', message.type)
    connections.forEach(conn => {
      if (conn.open) {
        conn.send(message)
      }
    })
  }

  function updateStatus(status) {
    const statusEl = document.getElementById('connectionStatus')
    if (statusEl) {
      statusEl.textContent = status
      if (status.includes('房主')) {
        statusEl.style.color = '#4caf50'
      } else if (status.includes('已连接')) {
        statusEl.style.color = '#4caf50'
      } else {
        statusEl.style.color = '#ffc107'
      }
    }
  }

  function disconnect() {
    connections.forEach(conn => {
      if (conn.open) {
        conn.close()
      }
    })
    connections = []
    if (peer && !peer.destroyed) {
      peer.destroy()
    }
    peer = null
    isHost = false
    roomCode = ''
    updateStatus('● 未连接')
  }

  function isConnected() {
    return peer && peer.open && connections.length > 0
  }

  function getRoomCode() {
    return roomCode
  }

  function getIsHost() {
    return isHost
  }

  return {
    init,
    createRoom,
    joinRoom,
    broadcastMessage,
    disconnect,
    isConnected,
    getRoomCode,
    getIsHost
  }
})()

if (typeof window !== 'undefined') {
  window.P2PManager = P2PManager
}