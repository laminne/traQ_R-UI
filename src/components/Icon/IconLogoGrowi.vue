<template functional>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M19.535 6.00437L17.505 2.47437H10.565H6.505H6.495L0.994995 12.0044L3.035 15.5244L8.535 6.00437H19.535Z"
      :fill="props.color"
    />
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M22.985 12.0044H23.005L20.965 8.47437H9.96497L7.93497 12.0044L9.96497 15.5244L12.005 12.0044H18.915L15.455 17.9844H8.53497L6.50497 14.4544L4.46497 17.9844L6.50497 21.5144H13.425L13.415 21.5244H17.485L17.495 21.5144H17.505L19.535 17.9844L22.985 12.0044Z"
      :fill="props.color"
    />
  </svg>
</template>

<script>
export default {
  name: 'IconLogoGrowi',
  props: {
    size: {
      type: String,
      default: '16'
    },
    color: {
      type: String,
      default: 'white'
    }
  }
}
</script>
