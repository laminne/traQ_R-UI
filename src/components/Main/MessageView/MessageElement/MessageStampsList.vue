<template lang="pug">
div(v-if="hasStamp").message-stamps-list
  template(v-if="!isExpanded")
    transition-group.message-stamps-wrap(name="slide-in" tag="div")
      div.stamp-container(
        v-for="stamp in stamps"
        :key="stamp.stampId"
        @click="toggleStamp(stamp.stampId)"
        :title="stamp.title"
        :class="{'stamp-pressed':isContainSelfStamp(stamp.stampId)}")
        div.stamp(:style="`background-image: url(${fileUrl(stamp.fileId)});`")
        p.stamp-number
          | {{stamp.sum}}
    div.button-open-stamps-list(@click="toggleExpand")
      icon-down-direction(size="24" color="var(--text-color)")
  template(v-else)
    div.button-close-stamps-list(@click="toggleExpand")
      icon-down-direction(size="24" color="var(--text-color)")
    div
      div.stamps-info-wrap(v-for="stamp in stamps")
        div.stamps-info-stamps-wrap
          div.stamp-container(
            :key="stamp.stampId"
            @click="toggleStamp(stamp.stampId)"
            :title="stamp.title"
            :class="{'stamp-pressed':isContainSelfStamp(stamp.stampId)}")
            div.stamp(:style="`background-image: url(${fileUrl(stamp.fileId)});`")
            p.stamp-number
              | {{stamp.sum}}
        span.stamps-info-users
          | {{stamp.title}}
</template>

<script>
import client from '@/bin/client'
import { mapGetters } from 'vuex'
import IconDownDirection from '@/components/Icon/IconDownDirection'

export default {
  name: 'MessageStampsList',
  props: {
    stampList: {
      type: Array,
      required: true
    },
    messageId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      isExpanded: false
    }
  },
  components: { IconDownDirection },
  computed: {
    ...mapGetters(['fileUrl']),
    stamps() {
      const map = {}
      if (!this.stampList) {
        return []
      }
      this.stampList.forEach(stamp => {
        if (map[stamp.stampId]) {
          map[stamp.stampId].user.push({
            userId: stamp.userId,
            count: stamp.count
          })
          map[stamp.stampId].sum += stamp.count
          if (stamp.createdAt < map[stamp.stampId].createdAt) {
            map[stamp.stampId].createdAt = stamp.createdAt
          }
        } else {
          map[stamp.stampId] = {
            fileId: '',
            stampId: stamp.stampId,
            name: '',
            user: [
              {
                userId: stamp.userId,
                count: stamp.count
              }
            ],
            sum: stamp.count,
            createdAt: stamp.createdAt
          }
          if (this.$store.state.stampMap[stamp.stampId]) {
            map[stamp.stampId].fileId = this.$store.state.stampMap[
              stamp.stampId
            ].fileId
            map[stamp.stampId].name = this.$store.state.stampMap[
              stamp.stampId
            ].name
          }
        }
      })
      Object.keys(map).forEach(key => {
        map[key].title = `:${map[key].name}: from`
        map[key].user.forEach(user => {
          map[key].title += ` ${
            this.$store.state.memberMap[user.userId].name
          }(${user.count})`
        })
      })
      const stamps = Object.values(map)
      stamps.sort((lhs, rhs) => {
        return (
          new Date(lhs.createdAt).getTime() - new Date(rhs.createdAt).getTime()
        )
      })
      return stamps
    },
    hasStamp() {
      return this.stamps.length > 0
    }
  },
  methods: {
    toggleStamp(stampId) {
      if (this.isContainSelfStamp(stampId)) {
        client.unstampMessage(this.messageId, stampId)
      } else {
        client.stampMessage(this.messageId, stampId)
      }
    },
    isContainSelfStamp(stampId) {
      return this.stamps.some(
        e =>
          e.stampId === stampId &&
          e.user.some(e => e.userId === this.$store.state.me.userId)
      )
    },
    toggleExpand() {
      this.isExpanded = !this.isExpanded
    }
  }
}
</script>

<style lang="sass">
.message-stamps-list
  display: inline-flex
  position: relative
  margin:
    left: 10px
    top: 10px

.message-stamps-wrap
  display: inline-block
  transition: height .3s ease

.stamp-container
  display: inline-flex
  align-items: center
  background: transparent
  color: $stamp-number-color
  padding: 2px 5px
  border:
    style: solid
    width: 1px
    color: $stamp-active-color
    radius: 3px
  margin:
    right: 4px
    bottom: 4px
  .stamps-info-stamps-wrap &
    margin:
      bottom: 0

  user-select: none
  cursor: pointer

  &.stamp-pressed
    background: $stamp-active-color
    color: $stamp-pressed-number-color

.slide-in
  &-enter-active, &-leave-active
    transition: all .3s ease
    transform: translateY(0)
  &-enter, &-leave-to
    transform: translateY(10px)
    opacity: 0
  &-leave-active
    position: absolute

.stamp-number
  line-height: 13px
  font-size: 13px
  margin: 0 3px

.stamp
  display: inline-block
  text-indent: 999%
  white-space: nowrap
  overflow: hidden
  color: transparent
  background-size: contain
  background-repeat: no-repeat
  background-position: center
  user-select: none
  width: 16px
  height: 16px
  .stamp-pressed &
    animation: stamp-pressed-anim .5s ease

@keyframes stamp-pressed-anim
  0%
    transform: scale(0.7)
  50%
    transform: scale(1.1)
  100%
    transform: scale(1)

.message-stamp-button
  display: inline-block
  margin: 0 5px 0
  color: #797979
  width: 20px
  height: 20px
  opacity: 0
  cursor: pointer
  .message-item:hover &
    opacity: 1

.button-open-stamps-list, .button-close-stamps-list
  cursor: pointer
  position: absolute
  left: -30px
  width: 24px
  height: 24px
  opacity: 0

  .message:hover &
    opacity: 0.6

  .message:hover &:hover
    opacity: 1

.button-close-stamps-list
  top: -1px
  transform: rotate(180deg)

.stamps-info-wrap
  display: flex
  align-items: center
  margin:
    bottom: 4px

.stamps-info-stamps-wrap

.stamps-info-users
  display: inline-flex
  align-items: center
</style>
