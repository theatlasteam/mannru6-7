<template>
  <div class="hero67">
    <div class="hero67__pair">
      <span class="hero67__digit hero67__digit--6">6</span>
      <svg
        class="hero67__hand hero67__hand--6"
        viewBox="0 0 60 76"
        aria-hidden="true"
      >
        <rect
          x="10"
          y="8"
          width="16"
          height="38"
          rx="8"
        />
        <rect
          x="31"
          y="0"
          width="16"
          height="46"
          rx="8"
        />
        <path d="M4 34 h52 v14 a26 22 0 0 1 -52 0 z" />
      </svg>
    </div>
    <div class="hero67__pair">
      <span class="hero67__digit hero67__digit--7">7</span>
      <svg
        class="hero67__hand hero67__hand--7"
        viewBox="0 0 60 76"
        aria-hidden="true"
      >
        <rect
          x="10"
          y="8"
          width="16"
          height="38"
          rx="8"
        />
        <rect
          x="31"
          y="0"
          width="16"
          height="46"
          rx="8"
        />
        <path d="M4 34 h52 v14 a26 22 0 0 1 -52 0 z" />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.hero67 {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 36px;
}

.hero67__pair {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero67__digit {
  font-size: clamp(6rem, 16vw, 10.5rem);
  font-weight: 900;
  letter-spacing: -0.05em;
  line-height: 1;
  user-select: none;
}

.hero67__hand {
  width: 62px;
  height: 78px;
  margin-top: 4px;
}

.hero67__hand rect,
.hero67__hand path {
  fill: currentColor;
}

@keyframes bob67 {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-26px); }
}

@keyframes tap67 {
  0%, 100% { transform: translateY(0) rotate(-3deg); }
  50% { transform: translateY(-12px) rotate(3deg); }
}

.hero67__digit--6 {
  animation: bob67 1s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}

.hero67__digit--7 {
  animation: bob67 1s cubic-bezier(0.45, 0, 0.55, 1) 0.5s infinite;
}

.hero67__hand--6 {
  animation: tap67 1s cubic-bezier(0.45, 0, 0.55, 1) 0.14s infinite;
}

.hero67__hand--7 {
  animation: tap67 1s cubic-bezier(0.45, 0, 0.55, 1) 0.64s infinite;
}

@media (prefers-reduced-motion: reduce) {
  .hero67__digit--6,
  .hero67__digit--7,
  .hero67__hand--6,
  .hero67__hand--7 {
    animation: none;
  }
}
</style>
