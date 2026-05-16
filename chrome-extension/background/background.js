let currentJobData = null

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'JOB_DETECTED') {
    currentJobData = msg.data
    // Storage এ save করো
    chrome.storage.local.set({ currentJob: msg.data })
  }

  if (msg.type === 'GET_CURRENT_JOB') {
    chrome.storage.local.get(['currentJob'], (result) => {
      sendResponse(result.currentJob)
    })
    return true // async response
  }

  if (msg.type === 'SAVE_TOKEN') {
    chrome.storage.local.set({ authToken: msg.token })
  }

  if (msg.type === 'GET_TOKEN') {
    chrome.storage.local.get(['authToken'], (result) => {
      sendResponse(result.authToken)
    })
    return true
  }
})