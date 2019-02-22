import Vue from 'vue'
import Vuex from 'vuex'
import client from '@/bin/client'
import indexedDB from '@/bin/indexeddb'
import stampCategorizer from '@/bin/stampCategorizer'
import modal from './modal'
import theme from './theme'
const db = indexedDB.db

Vue.use(Vuex)

const loadGeneralData = (dataName, webLoad, commit) => {
  let loaded = false
  const fetch = webLoad()
    .then(res => {
      loaded = true
      commit(`set${dataName}Data`, res.data)
      db.write('generalData', {type: dataName, data: res.data})
    })
  return Promise.race([
    db.read('generalData', dataName)
        .then(data => {
          if (!loaded && data) {
            commit(`set${dataName}Data`, data)
          }
        })
        .catch(async () => {
          await fetch
        }),
    fetch
  ])
}

const stringSortGen = (key) => (lhs, rhs) => {
  const ls = lhs[key].toLowerCase()
  const rs = rhs[key].toLowerCase()
  if (ls < rs) {
    return -1
  } else if (ls > rs) {
    return 1
  } else {
    return 0
  }
}

const store = new Vuex.Store({
  modules: {
    modal,
    theme
  },
  state: {
    loaded: false,
    loadedComponent: false,
    channelData: [],
    channelMap: {},
    channelRecentMessages: [],
    openChannels: {},
    sidebarOpened: false,
    titlebarExpanded: false,
    stampPickerActive: false,
    stampPickerModel: null,
    memberData: [],
    memberMap: {},
    groupData: [],
    groupMap: {},
    stampData: [],
    stampMap: {},
    stampCategolized: {},
    stampNameMap: [],
    stampHistory: [],
    currentChannel: {},
    currentChannelUpdateDate: new Date(0),
    clipedMessages: {},
    unreadMessages: {},
    unreadEarliests: {},
    staredChannels: [],
    staredChannelMap: {},
    mutedChannels: [],
    mutedChannelMap: {},
    messages: [],
    currentChannelTopic: {},
    currentChannelPinnedMessages: [],
    currentChannelNotifications: [],
    myNotifiedChannels: [],
    me: null,
    menuContent: 'Channels',
    heartbeatStatus: {userStatuses: []},
    baseURL: process.env.NODE_ENV === 'development' ? 'https://traq-dev.tokyotech.org' : '',
    files: [],
    userModal: null,
    tagModal: null,
    directMessageId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
    editing: false,
    isActivePinnedModal: false,
    openMode: 'particular',
    openChannelId: '',
    lastChannelId: '',
    theme: 'light',
    windowWidth: 0,
    windowHeight: 0,
    filterSubscribedActivity: true
  },
  mutations: {
    setStampPickerModel (state, model) {
      state.stampPickerModel = model
    },
    activeStampPicker (state) {
      state.stampPickerActive = true
    },
    inactiveStampPicker (state) {
      state.stampPickerActive = false
    },
    openSidebar (state) {
      state.sidebarOpened = true
    },
    closeSidebar (state) {
      state.sidebarOpened = false
    },
    expandTitlebar (state) {
      state.titlebarExpanded = true
    },
    contractTitlebar (state) {
      state.titlebarExpanded = false
    },
    setMe (state, me) {
      state.me = me
    },
    setChannelData (state, newChannelData) {
      newChannelData.sort(stringSortGen('name'))
      state.channelData = newChannelData
      state.channelData.forEach(channel => {
        state.channelMap[channel.channelId] = channel
      })
      state.channelData.forEach(channel => {
        if (channel.children) {
          channel.children.sort((lhs, rhs) => stringSortGen('name')(state.channelMap[lhs], state.channelMap[rhs]))
        }
      })
    },
    setMemberData (state, newMemberData) {
      state.memberData = newMemberData
      state.memberData.forEach(member => {
        state.memberMap[member.userId] = member
      })
    },
    setGroupData (state, newGroupData) {
      newGroupData.forEach(group => {
        group.members = group.members.filter(userId => state.memberMap[userId].accountStatus !== 0)
      })
      state.groupData = newGroupData
      const map = {}
      state.groupData.forEach(group => {
        map[group.groupId] = group
      })
      state.groupMap = map
    },
    setStampData (state, newStampData) {
      state.stampData = newStampData
      state.stampCategolized = stampCategorizer(newStampData)
      state.stampData.sort(stringSortGen('name'))
      state.stampData.forEach(stamp => {
        state.stampMap[stamp.id] = stamp
        state.stampNameMap[stamp.name] = stamp
      })
    },
    setStampHistory (state, stampHistory) {
      state.stampHistory = stampHistory.map(stamp => state.stampMap[stamp.stampId])
    },
    addMessages (state, message) {
      if (Array.isArray(message)) {
        state.messages.push(...message)
      } else {
        state.messages.push(message)
      }
      db.write('channelMessages', {channelId: state.currentChannel.channelId, data: state.messages.slice(-50)})
    },
    unshiftMessages (state, message) {
      if (Array.isArray(message)) {
        state.messages.unshift(...message)
      } else {
        state.messages.unshift(message)
      }
    },
    setMessages (state, messages) {
      state.messages = messages
    },
    updateMessage (state, message) {
      const index = state.messages.findIndex(mes => mes.messageId === message.messageId)
      if (index === -1) {
        return false
      }
      Vue.set(state.messages, index, message)
      db.write('channelMessages', {channelId: state.currentChannel.channelId, data: state.messages.slice(-50)})
      return true
    },
    deleteMessage (state, messageId) {
      state.messages = state.messages.filter(message => message.messageId !== messageId)
      db.write('channelMessages', {channelId: state.currentChannel.channelId, data: state.messages.slice(-50)})
    },
    changeChannel (state, channel) {
      state.currentChannel = channel
      state.currentChannelUpdateDate = new Date(state.unreadEarliests[channel.channelId] || 0)
      state.messages = []
    },
    loadStart (state) {
      state.loaded = false
    },
    loadEnd (state) {
      state.loaded = true
    },
    loadEndComponent (state) {
      state.loadedComponent = true
    },
    changeMenuContent (state, contentName) {
      state.menuContent = contentName
    },
    setClipedMessagesData (state, data) {
      data.forEach(message => {
        Vue.set(state.clipedMessages, message.messageId, message)
      })
    },
    setUnreadMessagesData (state, data) {
      const unreads = {}
      const earliests = {}
      data.forEach(message => {
        if (unreads[message.parentChannelId]) {
          unreads[message.parentChannelId][message.messageId] = message
          earliests[message.parentChannelId] = Math.min(earliests[message.parentChannelId], new Date(message.createdAt).valueOf())
        } else {
          unreads[message.parentChannelId] = {}
          unreads[message.parentChannelId][message.messageId] = message
          earliests[message.parentChannelId] = new Date(message.createdAt).valueOf()
        }
      })
      state.unreadMessages = unreads
      state.unreadEarliests = earliests
    },
    setStaredChannelsData (state, data) {
      state.staredChannels = data
      const map = {}
      state.staredChannels.forEach(channelId => {
        map[channelId] = true
      })
      state.staredChannelMap = map
    },
    setMutedChannelsData (state, data) {
      state.mutedChannels = data || []
      const map = {}
      data.forEach(channelId => {
        map[channelId] = true
      })
      state.mutedChannelMap = map
    },
    updateHeartbeatStatus (state, data) {
      state.heartbeatStatus = data
    },
    setCurrentChannelTopic (state, data) {
      state.currentChannelTopic = data
    },
    setCurrentChannelPinnedMessages (state, data) {
      state.currentChannelPinnedMessages = data
    },
    setCurrentChannelNotifications (state, data) {
      state.currentChannelNotifications = data
    },
    updateMessageStamp (state, data) {
      const index = state.messages.findIndex(e => e.messageId === data.message_id)
      if (index >= 0) {
        const message = state.messages[index]
        if (message.stampList) {
          const userData = message.stampList.find(e => e.userId === data.user_id && e.stampId === data.stamp_id)
          if (userData) {
            userData.count = data.count
          } else {
            message.stampList.push({
              userId: data.user_id,
              stampId: data.stamp_id,
              count: data.count,
              createdAt: data.created_at
            })
          }
        } else {
          message.stampList = [{
            userId: data.user_id,
            stampId: data.stamp_id,
            count: data.count,
            createdAt: data.created_at
          }]
        }
        Vue.set(state.messages, index, message)
      }
      const pinnedIndex = state.currentChannelPinnedMessages.findIndex(e => e.message.messageId === data.message_id)
      if (pinnedIndex >= 0) {
        const message = state.currentChannelPinnedMessages[pinnedIndex].message
        if (message.stampList) {
          const userData = message.stampList.find(e => e.userId === data.user_id && e.stampId === data.stamp_id)
          if (userData) {
            userData.count = data.count
          } else {
            message.stampList.push({
              userId: data.user_id,
              stampId: data.stamp_id,
              count: data.count
            })
          }
        } else {
          message.stampList = [{
            userId: data.user_id,
            stampId: data.stamp_id,
            count: data.count
          }]
        }
        Vue.set(state.currentChannelPinnedMessages, pinnedIndex, state.currentChannelPinnedMessages[pinnedIndex])
      }
    },
    deleteMessageStamp (state, data) {
      const index = state.messages.findIndex(e => e.messageId === data.message_id)
      if (index >= 0) {
        const message = state.messages[index]
        if (message.stampList) {
          const userDataIndex = message.stampList.findIndex(e => e.userId === data.user_id && e.stampId === data.stamp_id)
          if (userDataIndex >= 0) {
            message.stampList = message.stampList.filter((_, i) => i !== userDataIndex)
            Vue.set(state.messages, index, message)
          }
        }
      }
      const pinnedIndex = state.currentChannelPinnedMessages.findIndex(e => e.message.messageId === data.message_id)
      if (pinnedIndex >= 0) {
        const message = state.currentChannelPinnedMessages[pinnedIndex].message
        if (message.stampList) {
          const userDataIndex = message.stampList.findIndex(e => e.userId === data.user_id && e.stampId === data.stamp_id)
          if (userDataIndex >= 0) {
            message.stampList = message.stampList.filter((_, i) => i !== userDataIndex)
            Vue.set(state.currentChannelPinnedMessages, pinnedIndex, state.currentChannelPinnedMessages[pinnedIndex])
          }
        }
      }
    },
    setFiles (state, files) {
      state.files = files
    },
    clearFiles (state) {
      state.files = []
    },
    setEditing (state, isEditing) {
      state.editing = isEditing
    },
    removeMessage (state, messageId) {
      state.messages = state.messages.filter(message => message.messageId !== messageId)
    },
    setPinnedModal (state, isActive) {
      state.isActivePinnedModal = isActive
    },
    setUserOnline (state, {userId, isOnline}) {
      const user = state.memberMap[userId]
      user.isOnline = isOnline
      Vue.set(state.memberMap, userId, user)
    },
    setOpenChannels (state, data) {
      state.openChannels = data
    },
    setOpenChannel (state, {channelId, isOpen}) {
      Vue.set(state.openChannels, channelId, isOpen)
    },
    setOpenMode (state, mode) {
      state.openMode = mode
    },
    setOpenChannelId (state, channelId) {
      state.openChannelId = channelId
    },
    setLastChannelId (state, channelId) {
      state.lastChannelId = channelId
    },
    setTheme (state, themeName) {
      state.theme = themeName
    },
    setWindowSize (state, {windowWidth, windowHeight}) {
      state.windowWidth = windowWidth
      state.windowHeight = windowHeight
    },
    setMyNotifiedChannels (state, channels) {
      state.myNotifiedChannels = channels
    },
    setChannelRecentMessages (state, data) {
      state.channelRecentMessages = data
    },
    setFilterSubscribedActivity (state, data) {
      state.filterSubscribedActivity = data
    }
  },
  getters: {
    childrenChannels (state) {
      return parentId => state.channelData
          .filter(channel => channel.parent === parentId && channel.name !== '')
    },
    allChannels (state) {
      return state.channelData
        .filter(channel => channel.parent !== 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa' && channel.name !== '')
    },
    getChannelByName (state, getters) {
      return channelName => {
        const channelLevels = channelName.split('/')
        let channel = null
        let channelId = ''
        channelLevels.forEach(name => {
          const levelChannels = getters.childrenChannels(channelId)
          channel = levelChannels.find(ch => ch.name === name)
          if (channel === undefined) return null
          channelId = channel.channelId
        })
        return channel
      }
    },
    getDirectMessageChannels (state, getters) {
      return state.channelData.filter(channel => channel.dm)
    },
    getUserByName (state, getters) {
      return userName => {
        const user = getters.memberData.find(user => user.name === userName)
        if (user) {
          return user
        } else {
          return null
        }
      }
    },
    getChannelPathById (state) {
      return channelId => {
        let current = state.channelMap[channelId]
        let path = current.name
        while (true) {
          const next = state.channelMap[current.parent]
          if (!next.name) {
            return path
          }
          path = next.name + '/' + path
          current = next
        }
      }
    },
    getFileDataById (state) {
      return fileId => {
        return client.getFileMeta(fileId)
      }
    },
    isPinned (state) {
      return messageId => {
        return state.currentChannelPinnedMessages.find(pin => pin.message.messageId === messageId)
      }
    },
    getMyId (state) {
      return state.me ? state.me.userId : ''
    },
    getMyName (state) {
      return state.me ? state.me.name : ''
    },
    notificationsOnMembers (state) {
      return state.currentChannelNotifications.map(id => state.memberMap[id])
    },
    notificationsOffMembers (state, getters) {
      return getters.memberData
        .filter(user => !state.currentChannelNotifications.find(id => id === user.userId))
    },
    getCurrentChannelUpdateDate (state) {
      return state.currentChannelUpdateDate
    },
    getChannelUnreadMessageNum (state) {
      return channelId => {
        if (!state.unreadMessages[channelId]) {
          return 0
        }
        return Object.keys(state.unreadMessages[channelId]).length
      }
    },
    getChannelUnreadMessageSum (state, getters) {
      return channelId => {
        let sum = getters.getChannelUnreadMessageNum(channelId)
        if (!state.channelMap[channelId].children) {
          return sum
        }
        state.channelMap[channelId].children.forEach(child => {
          sum += getters.getChannelUnreadMessageSum(child)
        })
        return sum
      }
    },
    getUnreadMessageNum (state, getters) {
      return Object.keys(state.unreadMessages).reduce((pre, channelId) => {
        return pre + getters.getChannelUnreadMessageNum(channelId)
      }, 0)
    },
    getUnreadDirectMessagesSum (state, getters) {
      return getters.getDirectMessageChannels.reduce((pre, channel) => {
        return pre + getters.getChannelUnreadMessageNum(channel.channelId)
      }, 0)
    },
    getStaredChannels (state) {
      const channels = state.staredChannels.map(channelId => state.channelMap[channelId])
      channels.sort(stringSortGen('name'))
      return channels
    },
    getUserIdByDirectMessageChannel (state) {
      return channel => {
        if (!channel.dm) {
          return ''
        }
        if (channel.member.length === 1) {
          return channel.member[0]
        } else {
          return channel.member.find(userId => userId !== state.me.userId)
        }
      }
    },
    deviceType (state) {
      return state.windowWidth < 680 ? 'sp' : 'pc'
    },
    isSidebarOpened (state) {
      return state.sidebarOpened
    },
    isTitlebarExpanded (state) {
      return state.titlebarExpanded
    },
    fileUrl (state) {
      return fileId => {
        return `${state.baseURL}/api/1.0/files/${fileId}`
      }
    },
    grades (state) {
      const gradeReg = /^\d\d[BMDR]$/
      return state.groupData
        .filter(group => gradeReg.test(group.name) && group.members.length > 0)
    },
    sortedGrades (state, getters) {
      const map = {
        B: 0,
        M: 1,
        D: 2,
        R: 3
      }
      const f = (s) => {
        return map[s[2]] * 100 + parseInt(s.substr(0, 2), 10)
      }
      return getters.grades
        .sort((lhs, rhs) => {
          return f(lhs.name) - f(rhs.name)
        })
    },
    memberData (state) {
      return state.memberData.filter(user => user.accountStatus !== 0)
    },
    nonBotUsers (state, getters) {
      return getters.memberData
        .filter(user => !user.bot)
    },
    gradeByUserMap (state, getters) {
      const map = {}
      getters.nonBotUsers.forEach(u => {
        let gradeObj = getters.grades
          .find(g => g.members.some(userId => userId === u.userId))
        map[u.userId] = gradeObj ? gradeObj.name : undefined
      })
      return map
    },
    getGroupByContent (state) {
      return groupName => state.groupData.find(group => group.name === groupName)
    },
    userDisplayName (state) {
      return userId => state.memberMap[userId].displayName
    },
    stampHistory (state) {
      return state.stampHistory
    },
    filteringUser (state) {
      return users => users.filter(userId => state.memberData[userId].accountStatus !== 0)
    }
  },
  actions: {
    whoAmI ({commit}) {
      return client.whoAmI()
      .then(res => {
        commit('setMe', res.data)
      })
      .catch(() => {
        commit('setMe', null)
      })
    },
    getMessages ({state, commit, dispatch, getters}, update) {
      const nowChannel = state.currentChannel
      let loaded = false
      const latest = state.messages.length === 0 || update
      if (latest) {
        db.read('channelMessages', nowChannel.channelId)
          .then(data => {
            if (!loaded && data) {
              commit('setMessages', data)
            }
          })
          .catch(() => {})
      }
      const loadedMessages = (!nowChannel.dm)
        ? client.loadMessages(nowChannel.channelId, 50, latest ? 0 : state.messages.length)
        : client.loadDirectMessages(getters.getUserIdByDirectMessageChannel(nowChannel), 50, latest ? 0 : state.messages.length)
      return loadedMessages
        .then(res => {
          loaded = true
          const messages = res.data.reverse()
          client.readMessages(nowChannel.channelId)
          if (latest) {
            db.write('channelMessages', {channelId: nowChannel.channelId, data: messages})
          }
          if (nowChannel === state.currentChannel) {
            if (latest) {
              commit('setMessages', messages)
              return messages.length > 0
            } else {
              commit('unshiftMessages', messages)
              return messages.length > 0
            }
          }
          return false
        })
    },
    async updateChannels ({commit}) {
      return loadGeneralData('Channel', client.getChannels, commit)
    },
    updateMembers ({commit}) {
      return loadGeneralData('Member', client.getMembers, commit)
    },
    updateGroups ({commit}) {
      return loadGeneralData('Group', client.getAllGroups, commit)
    },
    updateStamps ({commit}) {
      return loadGeneralData('Stamp', client.getStamps, commit)
    },
    getStampHistory ({commit}) {
      client
        .getStampHistory()
        .then(res => {
          commit('setStampHistory', res.data)
        })
    },
    updateClipedMessages ({commit}) {
      return loadGeneralData('ClipedMessages', client.getAllClipMessages, commit)
    },
    updateUnreadMessages ({commit}) {
      return loadGeneralData('UnreadMessages', client.getUnreadMessages, commit)
    },
    updateStaredChannels ({commit}) {
      return loadGeneralData('StaredChannels', client.getStaredChannels, commit)
    },
    updateMutedChannels ({commit}) {
      return loadGeneralData('MutedChannels', client.getMutedChannels, commit)
    },
    getCurrentChannelTopic ({commit}, channelId) {
      return client.getChannelTopic(channelId)
        .then(res => {
          commit('setCurrentChannelTopic', res.data)
        })
    },
    getCurrentChannelPinnedMessages ({commit}, channelId) {
      return client.getPinnedMessages(channelId)
        .then(res => {
          commit('setCurrentChannelPinnedMessages', res.data)
        })
    },
    getCurrentChannelNotifications ({commit}, channelId) {
      return client.getNotifications(channelId)
        .then(res => {
          commit('setCurrentChannelNotifications', res.data)
        })
    },
    checkPinnedMessage ({state, dispatch}, messageId) {
      if (state.currentChannelPinnedMessages.find(pin => pin.message.messageId === messageId)) {
        dispatch('getCurrentChannelPinnedMessages', state.currentChannel.channelId)
      }
    },
    updateUserOnline ({state, commit}, {userId, isOnline}) {
      commit('setUserOnline', {userId, isOnline})
      if (state.modal.data && state.modal.data.userId === userId) {
        commit('modal/setModalData', state.memberMap[userId])
      }
    },
    updateChannelOpen ({state, commit}, {channelId, isOpen}) {
      commit('setOpenChannel', {channelId, isOpen})
      return db.write('generalData', {type: 'openChannels', data: state.openChannels})
    },
    loadSetting ({dispatch}) {
      return Promise.all([
        dispatch('loadOpenMode'),
        dispatch('loadOpenChannelId'),
        dispatch('loadLastChannelId'),
        dispatch('loadTheme'),
        dispatch('loadOpenChannels'),
        dispatch('loadFilterSubscribedActivity')
      ])
    },
    loadOpenMode ({commit, dispatch}) {
      return db.read('browserSetting', 'openMode').then(data => {
        commit('setOpenMode', data)
      }).catch(async () => {
        await dispatch('updateOpenMode', 'particular')
      })
    },
    loadOpenChannelId ({commit, dispatch, getters}) {
      return db.read('browserSetting', 'openChannelId').then(data => {
        commit('setOpenChannelId', data)
      }).catch(async () => {
        await dispatch('updateOpenChannelId', getters.getChannelByName('general').channelId)
      })
    },
    loadLastChannelId ({commit, dispatch, getters}) {
      return db.read('browserSetting', 'lastChannelId').then(data => {
        commit('setLastChannelId', data)
      }).catch(async () => {
        await dispatch('updateLastChannelId', getters.getChannelByName('general').channelId)
      })
    },
    loadTheme ({commit, dispatch}) {
      return db.read('browserSetting', 'theme').then(data => {
        commit('setTheme', data)
      }).catch(async () => {
        await dispatch('updateTheme', 'light')
      })
    },
    loadOpenChannels ({commit}) {
      return db.read('generalData', 'openChannels').then(data => {
        commit('setOpenChannels', data || {})
      }).catch(_ => {
        commit('setOpenChannels', {})
      })
    },
    updateOpenMode ({commit}, mode) {
      commit('setOpenMode', mode)
      return db.write('browserSetting', {type: 'openMode', data: mode})
    },
    updateOpenChannelId ({commit}, channelId) {
      commit('setOpenChannelId', channelId)
      return db.write('browserSetting', {type: 'openChannelId', data: channelId})
    },
    updateLastChannelId ({commit}, channelId) {
      commit('setLastChannelId', channelId)
      return db.write('browserSetting', {type: 'lastChannelId', data: channelId})
    },
    updateTheme ({commit}, themeName) {
      commit('setTheme', themeName)
      return db.write('browserSetting', {type: 'theme', data: themeName})
    },
    async updateChannelActivity ({state, commit}) {
      const filter = state.filterSubscribedActivity || false
      const res = await client.getLatestMessages(50, filter)
      commit('setChannelRecentMessages', res.data)
    },
    async updateMyNotifiedChannels ({commit, getters}) {
      const res = await client.getNotifiedChannels(getters.getMyId)
      const data = res.data
      console.log(data)
      if (!data) return
      commit('setMyNotifiedChannels', data)
    },
    async updateCurrentChannelNotifications ({state, dispatch}, {on, off}) {
      console.log(state.currentChannel)
      await client.changeNotifications(state.currentChannel.channelId, {
        on: on || [],
        off: off || []
      })
      await dispatch('getCurrentChannelNotifications', state.currentChannel.channelId)
    },
    updateFilterSubscribedActivity ({commit}, filter) {
      commit('setFilterSubscribedActivity', filter)
      return db.write('browserSetting', {type: 'filterSubscribedActivity', data: filter})
    },
    loadFilterSubscribedActivity ({commit, dispatch}) {
      return db.read('browserSetting', 'filterSubscribedActivity').then(data => {
        commit('setFilterSubscribedActivity', data)
      }).catch(async () => {
        await dispatch('updateFilterSubscribedActivity', true)
      })
    },
    readMessages ({dispatch}, channelId) {
      return client.readMessages(channelId).then(() => {
        dispatch('updateUnreadMessages')
      })
    }
  }
})

window.openUserModal = (userId) => {
  store.dispatch('openUserModal', userId)
}

window.openGroupModal = (groupId) => {
  store.dispatch('openGroupModal', groupId)
}

export default store
