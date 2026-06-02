const App = (function() {
  const STORAGE_KEY = 'who_is_spy_data'

  let globalData = {
    players: [],
    gameStatus: 'idle',
    currentWord: '',
    spyWord: '',
    round: 0,
    day: true,
    hostPlayer: '',
    isHost: false,
    roomCode: '',
    myPlayerId: '',
    winner: '',
    angelKnowsBoth: false
  }

  function loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        Object.assign(globalData, data)
      }
    } catch (e) {
      console.error('Failed to load data:', e)
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(globalData))
    } catch (e) {
      console.error('Failed to save data:', e)
    }
  }

  function setGlobalData(key, value) {
    if (typeof key === 'object') {
      Object.assign(globalData, key)
    } else {
      globalData[key] = value
    }
    saveData()
  }

  function getGlobalData(key) {
    if (key) {
      return globalData[key]
    }
    return { ...globalData }
  }

  function clearGlobalData() {
    globalData = {
      players: [],
      gameStatus: 'idle',
      currentWord: '',
      spyWord: '',
      round: 0,
      day: true,
      hostPlayer: '',
      isHost: false,
      roomCode: '',
      myPlayerId: '',
      winner: '',
      angelKnowsBoth: false
    }
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      console.error('Failed to clear data:', e)
    }
  }

  loadData()

  return {
    globalData: globalData,
    setGlobalData: setGlobalData,
    getGlobalData: getGlobalData,
    clearGlobalData: clearGlobalData,
    onLaunch: function() {
      console.log('谁是卧底游戏启动')
    }
  }
})()

if (typeof window !== 'undefined') {
  window.App = App
}