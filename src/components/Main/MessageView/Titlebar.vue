<template lang="pug">
header.titlebar(ref="titlebar" :class="titlebarClass")
  .titlebar-inner-wrap
    .titlebar-channel-name(@click="toggleSidebarOpens")
      img.traq-logo(src="@/assets/img/icon/logo_white.svg")
      .channel-info-wrap(ref="titlebarInner")
        h1.text-ellipsis.channel-name(:title="title")
          | {{shortTitle}}
        p.channel-topic-text(:key="shortTitle" v-bind:class="{'has-topic': topic}")
          | {{topic}}
    .titlebar-expand-button(v-if="!isDirectMessage" @click="toggleTitlebarExpansion")
      div(:style="titlebarExpandButtonStyle")
        icon-down-direction(size="32")
  .titlebar-expand.drop-shadow
    .titlebar-menu-button-wrap
      .titlebar-menu-button(v-show="!isDirectMessage && isNotificationForced")
        icon-notification-fill(size="24" color="rgba(255,255,255,0.5)")
      .titlebar-menu-button(v-show="!isDirectMessage && !isNotificationForced && !isNotified" @click="notifyChannel")
        icon-notification(size="24")
      .titlebar-menu-button(v-show="!isDirectMessage && !isNotificationForced && isNotified" @click="unnotifyChannel")
        icon-notification-fill(size="24")
      .titlebar-menu-button.border-left(v-show="!isDirectMessage && !isStared" @click="starChannel")
        icon-star(size="24")
      .titlebar-menu-button.border-left(v-show="!isDirectMessage && isStared" @click="unstarChannel")
        icon-star-fill(size="24")
    .titlebar-menu-item(v-show="!isDirectMessage && !isNotificationForced" @click="$store.dispatch('openChannelNotificationModal')")
      .menu-icon
        icon-notification-fill(size="24")
      span
        | チャンネル通知設定
    .titlebar-menu-item(v-show="!isDirectMessage && channelDepth < 5" @click="$store.dispatch('openChannelCreateModal')")
      .menu-icon
        icon-plus(size="24")
      span
        | サブチャンネル作成
    .titlebar-menu-item.copy-channel-path(v-show="!isDirectMessage" @click="copyMessage")
      .menu-icon
        icon-copy(size="24")
      span
        | チャンネルリンクをコピー
    .titlebar-menu-item(
      v-if="$store.getters['rtc/isCalling'] && $store.state.rtc.activeMediaChannelId === $store.state.currentChannel.channelId"
      @click="$store.dispatch('rtc/closeConnection', $store.state.currentChannel.channelId)"
    )
      .menu-icon
        icon-call(size="24")
      span
        | 通話を終了
    .titlebar-menu-item(
      v-if="!$store.getters['rtc/isCalling'] && $store.state.rtc.isRtcEnabled"
      @click="$store.dispatch('rtc/joinVoiceChannel', $store.state.currentChannel.channelId)"
    )
      .menu-icon
        icon-call(size="24")
      span
        | 通話を開始
</template>

<script>
import client from '@/bin/client'
import { mapGetters } from 'vuex'
import IconDownDirection from '@/components/Icon/IconDownDirection'
import IconNotificationFill from '@/components/Icon/IconNotificationFill'
import IconNotification from '@/components/Icon/IconNotification'
import IconStar from '@/components/Icon/IconStar'
import IconStarFill from '@/components/Icon/IconStarFill'
import IconPlus from '@/components/Icon/IconPlus'
import IconCopy from '@/components/Icon/IconCopy'
import IconCall from '@/components/Icon/IconCall'

export default {
  name: 'Titlebar',
  components: {
    IconDownDirection,
    IconNotificationFill,
    IconNotification,
    IconStar,
    IconStarFill,
    IconPlus,
    IconCopy,
    IconCall
  },
  data() {
    return {
      width: 0
    }
  },
  methods: {
    starChannel() {
      client.starChannel(this.currentChannelId).then(() => {
        this.$store.dispatch('updateStaredChannels')
      })
    },
    unstarChannel() {
      client.unstarChannel(this.currentChannelId).then(() => {
        this.$store.dispatch('updateStaredChannels')
      })
    },
    notifyChannel() {
      client
        .changeNotifications(this.currentChannelId, {
          on: [this.$store.state.me.userId]
        })
        .then(() => {
          this.$store.dispatch(
            'getCurrentChannelNotifications',
            this.currentChannelId
          )
          this.$store.dispatch('updateMyNotifiedChannels')
        })
    },
    unnotifyChannel() {
      client
        .changeNotifications(this.currentChannelId, {
          off: [this.$store.state.me.userId]
        })
        .then(() => {
          this.$store.dispatch(
            'getCurrentChannelNotifications',
            this.currentChannelId
          )
          this.$store.dispatch('updateMyNotifiedChannels')
        })
    },
    copyMessage() {
      this.$copyText(
        `[#${this.$route.params.channel}](${location.origin}${this.$route.path})`
      )
    },
    removeWidth() {
      this.$refs.titlebarInner.style.width = ''
    },
    zeroWidth() {
      this.$refs.titlebarInner.style.width = '0px'
    },
    toggleSidebarOpens() {
      if (this.isSidebarOpened) {
        this.$store.commit('closeSidebar')
      } else {
        this.$store.commit('openSidebar')
      }
    },
    toggleTitlebarExpansion() {
      if (this.isTitlebarExpanded) {
        this.$store.commit('contractTitlebar')
      } else {
        this.$store.commit('expandTitlebar')
      }
    },
    listen: function(target, eventType, callback) {
      if (!this._eventRemovers) {
        this._eventRemovers = []
      }
      target.addEventListener(eventType, callback)
      this._eventRemovers.push({
        remove: function() {
          target.removeEventListener(eventType, callback)
        }
      })
    }
  },
  computed: {
    ...mapGetters(['deviceType', 'isSidebarOpened', 'isTitlebarExpanded']),
    currentChannelId() {
      return this.$store.state.currentChannel.channelId
    },
    isDirectMessage() {
      return (
        this.$store.state.currentChannel.parent ===
        this.$store.state.directMessageId
      )
    },
    isNotificationForced() {
      return this.$store.state.currentChannel.force
    },
    isNotified() {
      return this.$store.getters.notificationsOnMembers.some(
        user => user.userId === this.$store.state.me.userId
      )
    },
    isStared() {
      if (this.isDirectMessage) return false
      if (this.$store.state.staredChannelMap[this.currentChannelId]) return true
      return false
    },
    title() {
      if (this.$route.params.user) return `@${this.$route.params.user}`
      if (this.$route.params.channel) return `#${this.$route.params.channel}`
      return ''
    },
    shortTitle() {
      if (!this.title.includes('#')) return this.title

      const channels = this.title
        .slice(1)
        .split('/')
        .slice(0, -1)
        .map(c => c.charAt(0))
      channels.push(this.$store.state.currentChannel.name)

      return `#${channels.join('/')}`
    },
    topic() {
      if (this.$route.params.user) return ''
      return this.$store.state.channelMap[this.currentChannelId].topic
    },
    titlebarClass() {
      return {
        'is-expanded': this.isTitlebarExpanded,
        'is-sidebar-opened': this.isSidebarOpened
      }
    },
    titlebarExpandButtonStyle() {
      return {
        transform: `rotate(${this.isTitlebarExpanded ? 180 : 0}deg)`
      }
    },
    channelDepth() {
      return this.$route.params.channel.split('/').length
    }
  },
  created: function() {
    this.$nextTick(() => {
      this.listen(
        window,
        'click',
        function(e) {
          if (!this.$el.contains(e.target) && e.target.nodeName !== 'BUTTON') {
            this.$store.commit('contractTitlebar')
          }
        }.bind(this)
      )
    })
  },
  destroyed: function() {
    if (this._eventRemovers) {
      this._eventRemovers.forEach(function(eventRemover) {
        eventRemover.remove()
      })
    }
  }
}
</script>

<style lang="sass">
$topic-height: 18px

.titlebar
  position: absolute
  display: inline-block
  z-index: $titlebar-index
  transition: max-width .3s ease, min-width .3s ease
  will-change: max-width, min-width
  contain: layout
  +mq(pc)
    left: $sidebar-width
    min-width: 260px
    max-width: calc( 100vw - #{$sidebar-width} - #{$information-sidebar-button-width} - 5px )
    height: 60px
  +mq(sp)
    // top: 10px
    min-width: 250px
    max-width: calc( 100vw - #{$information-sidebar-button-width} - 5px )
    height: 50px
    &.is-sidebar-opened
      min-width: $sidebar-width
      max-width: $sidebar-width

.titlebar-inner-wrap
  +mq(pc)
    height: 60px
  +mq(sp)
    height: 50px
  display: flex
  align-items: center
  justify-content: flex-start
  color: white
  cursor: pointer
  background: $primary-color
  position: relative
  &::before
    content: ''
    position: absolute
    bottom: 0
    left: 0
    right: 0
    display: block
    margin: auto
    width: 0
    height: 1px
    background: $border-color
    will-change: width
    transition: width .5s ease
    .is-expanded &
      width: calc( 100% - 20px )

.titlebar-channel-name
  display: flex
  flex-grow: 1
  min-width: 0
  justify-content: flex-start
  align-items: center
  height: 100%

  &:hover
    background: rgba(0,0,0,0.1)

.sidebar-open-icon
  width: 60%
  height: 60%
  color: gray

.channel-info-wrap
  padding-right: 10px
  max-width: calc(100% - 50px)
  box-sizing: content-box

.channel-name
  max-width: 100%
  font-size: 25px
  line-height: 35px
  font-weight: bold
  text-align: left
  margin: 0
  display: block

.buttons
  display: flex
  flex-flow: row
  div
    width: 50px
    height: 50px
    margin: 10px

.channel-topic-text
  font-size: 13px
  line-height: 1.4em
  margin:
    bottom: 2px
  height: 0
  overflow: hidden
  transition: height .5s ease

  +mq(sp)
    display: none

  &.has-topic
    height: $topic-height

  &::before
    content: ''
    display: block
    position: absolute
    left: 0
    top: 0
    width: 0
    height: 100%
    background: white
    z-index: $titlebar-index

.titlebar-expand
  display: flex
  z-index: -1
  position: relative
  flex-flow: column
  justify-content: center
  padding: 60px 0 10px
  background: $primary-color
  transition: transform .5s ease
  overflow: hidden
  position: relative
  will-change: transform
  transform: translateY(-100%)
  user-select: none
  contain: content
  .is-expanded &
    top: 0
    transform: translateY(-60px)

.titlebar-menu-button-wrap
  display: flex
  justify-content: center
  height: 50px
  .titlebar-menu-button
    display: flex
    justify-content: center
    align-items: center
    width: 50%
    cursor: pointer
    &:hover
      background: rgba(0,0,0,0.1)

.border-left
  position: relative
  &::after
    content: ''
    display: block
    position: absolute
    width: 1px
    height: 60%
    top: 0
    bottom: 0
    left: 0
    margin: auto
    background: $border-color

.titlebar-menu-item
  display: flex
  align-items: center
  height: 20px
  padding: 10px 0 10px 10%
  box-sizing: content-box
  color: white
  font-size: 14px
  cursor: pointer
  .menu-icon
    margin-right: 15px
  &:hover
      background: rgba(0,0,0,0.1)
.copy-channel-path:active
  background-color: rgba(0,0,0,0.2)


.traq-logo
  width: 25px
  height: 25px
  margin: 0 10px 0 15px

.titlebar-expand-button
  margin:
    left: auto
  padding:
    left: 6px
    right: 6px
  height: 100%

  div
    height: 100%
    display: flex
    align-items: center
    transition: transform .5s ease

  &:hover
    background: rgba(0,0,0,0.1)
</style>
