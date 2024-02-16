import clsx from "clsx";
import classes from "./logo.module.css";

const Logo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 349 89"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={clsx(classes.svg, className)}
  >
    <g className={classes.group}>
      <path d="M98.0938 61.2148C95.8906 65.1621 92.999 68.2373 89.4189 70.4404C85.8389 72.5518 81.8916 74.3418 77.5771 75.8105C73.2627 77.1875 68.7188 78.4268 63.9453 79.5283C59.2637 80.6299 54.7197 82.0527 50.3135 83.7969C49.0283 83.7969 47.8809 83.8428 46.8711 83.9346C45.9531 84.0264 45.0352 84.1641 44.1172 84.3477C43.291 84.4395 42.4648 84.5771 41.6387 84.7607C40.8125 84.8525 39.8945 84.9443 38.8848 85.0361C38.5176 84.9443 38.2881 85.0361 38.1963 85.3115C38.1045 85.4951 37.9668 85.6787 37.7832 85.8623C36.2227 86.1377 34.7998 86.2754 33.5146 86.2754C32.3213 86.2754 31.3115 86.2754 30.4854 86.2754C29.3838 86.2754 28.2363 86.4131 27.043 86.6885C25.9414 87.0557 24.9316 87.1934 24.0137 87.1016C17.1289 86.7344 11.7129 84.3018 7.76562 79.8037C3.91016 75.2139 1.75293 68.8799 1.29395 60.8018C1.38574 60.3428 1.29395 60.0674 1.01855 59.9756C0.834961 59.8838 0.651367 59.7461 0.467773 59.5625C0.467773 58.6445 0.55957 57.8643 0.743164 57.2217C1.01855 56.5791 1.06445 55.7529 0.880859 54.7432C3.26758 49.6943 5.97559 45.0127 9.00488 40.6982C12.0342 36.292 15.6602 32.4365 19.8828 29.1318C20.5254 28.5811 21.0762 28.0303 21.5352 27.4795C21.9941 26.9287 22.4072 26.3779 22.7744 25.8271C23.2334 25.2764 23.7383 24.8174 24.2891 24.4502C24.8398 23.9912 25.5283 23.6699 26.3545 23.4863C28.2822 21.2832 30.5771 19.2637 33.2393 17.4277C35.9014 15.5918 38.7012 13.8477 41.6387 12.1953C44.5762 10.4512 47.4678 8.75293 50.3135 7.10059C53.251 5.35645 55.9131 3.42871 58.2998 1.31738C59.3096 1.77637 60.0439 1.91406 60.5029 1.73047C60.9619 1.54688 61.4668 1.54688 62.0176 1.73047C62.6602 3.10742 63.5322 4.07129 64.6338 4.62207C65.8271 5.17285 66.9746 5.76953 68.0762 6.41211C69.2695 6.96289 70.3711 7.65137 71.3809 8.47754C72.3906 9.30371 73.1709 10.4053 73.7217 11.7822C73.1709 11.7822 72.8955 12.0117 72.8955 12.4707C72.9873 12.8379 73.125 13.251 73.3086 13.71C73.4922 14.0771 73.5381 14.4902 73.4463 14.9492C73.4463 15.3164 73.125 15.5 72.4824 15.5C72.5742 15.959 72.8496 16.2344 73.3086 16.3262C73.8594 16.3262 74.1348 16.5557 74.1348 17.0146C74.1348 17.4736 73.9971 17.8408 73.7217 18.1162C73.5381 18.3916 73.5381 18.8506 73.7217 19.4932C71.8857 20.6865 69.8203 21.834 67.5254 22.9355C65.3223 24.0371 62.9814 25.2305 60.5029 26.5156C58.1162 27.709 55.5918 29.04 52.9297 30.5088C50.3594 31.8857 47.835 33.4922 45.3564 35.3281C42.8779 37.1641 40.3535 39.2295 37.7832 41.5244C35.2129 43.7275 32.7344 46.0684 30.3477 48.5469C27.9609 51.0254 25.7119 53.5957 23.6006 56.2578C21.4893 58.8281 19.6992 61.3984 18.2305 63.9688C18.4141 64.4277 18.5977 64.7949 18.7812 65.0703C19.0566 65.2539 19.2861 65.5752 19.4697 66.0342C22.4072 66.2178 25.1152 66.2178 27.5938 66.0342C30.1641 65.7588 32.7344 65.8965 35.3047 66.4473C35.5801 66.2637 35.7637 65.9883 35.8555 65.6211C35.9473 65.2539 36.1768 64.9785 36.5439 64.7949C41.7764 64.2441 46.6416 63.418 51.1396 62.3164C55.6377 61.123 60.2275 59.8838 64.9092 58.5986C64.1748 58.3232 63.4863 58.0938 62.8438 57.9102C62.293 57.6348 61.7422 57.4053 61.1914 57.2217C60.7324 56.7627 60.7324 56.3955 61.1914 56.1201C61.7422 55.7529 62.2012 55.3857 62.5684 55.0186C61.2832 54.2842 60.2275 53.3662 59.4014 52.2646C58.667 51.1631 58.208 49.6943 58.0244 47.8584C58.5752 47.3994 58.8506 46.8486 58.8506 46.2061C58.8506 45.5635 58.5752 45.0586 58.0244 44.6914C57.6572 44.5996 57.4277 44.5996 57.3359 44.6914C57.2441 44.7832 57.1523 44.9209 57.0605 45.1045C57.0605 45.2881 57.0146 45.4717 56.9229 45.6553C56.8311 45.7471 56.6016 45.7012 56.2344 45.5176C56.3262 44.6914 56.5098 44.0029 56.7852 43.4521C57.1523 42.9014 57.4277 42.2588 57.6113 41.5244L67.1123 35.1904C68.1221 35.9248 69.3613 36.751 70.8301 37.6689C72.2988 38.4951 73.8135 39.3672 75.374 40.2852C77.0264 41.1113 78.6787 41.9834 80.3311 42.9014C82.0752 43.7275 83.6816 44.5537 85.1504 45.3799C86.4355 45.9307 87.583 46.665 88.5928 47.583C89.6025 48.501 90.5664 49.4648 91.4844 50.4746C92.4023 51.3926 93.3203 52.3105 94.2383 53.2285C95.248 54.1465 96.3955 54.9268 97.6807 55.5693C97.4971 56.7627 97.543 57.7266 97.8184 58.4609C98.0938 59.1953 98.1855 60.1133 98.0938 61.2148ZM173.688 7.65137C173.872 9.6709 174.193 11.415 174.652 12.8838C175.111 14.3525 175.616 15.7754 176.167 17.1523C176.626 18.4375 177.039 19.7227 177.406 21.0078C177.865 22.2012 178.187 23.6699 178.37 25.4141C177.636 27.8008 177.085 30.0039 176.718 32.0234C176.442 34.043 176.121 36.1543 175.754 38.3574C174.285 41.5703 172.862 44.416 171.485 46.8945C170.108 49.373 169.007 51.5303 168.181 53.3662C167.722 53.8252 167.309 54.376 166.941 55.0186C166.666 55.5693 166.345 56.166 165.978 56.8086C165.794 57.084 165.564 57.4971 165.289 58.0479C165.014 58.5986 164.784 58.9658 164.601 59.1494L161.847 58.1855L161.296 61.6279L159.368 62.1787L157.991 63.8311C156.247 66.8604 154.411 69.4307 152.483 71.542C150.556 73.5615 148.353 75.3975 145.874 77.0498C143.487 78.6104 140.733 80.0791 137.612 81.4561C134.583 82.833 131.141 84.3477 127.285 86C125.725 85.8164 124.348 85.7246 123.154 85.7246C122.053 85.6328 120.997 85.541 119.987 85.4492C118.243 85.4492 116.086 85.3115 113.516 85.0361C113.24 84.3018 112.827 83.7969 112.276 83.5215C111.726 83.2461 111.221 83.1084 110.762 83.1084C109.201 82.374 108.008 81.3184 107.182 79.9414C106.447 78.4727 105.713 76.9121 104.979 75.2598C104.52 74.25 104.061 73.332 103.602 72.5059C103.143 71.5879 102.638 70.6699 102.087 69.752L104.428 69.0635L101.398 65.7588C101.215 65.4834 100.985 65.2539 100.71 65.0703C100.435 64.7949 100.205 64.5195 100.021 64.2441L99.8838 62.041C99.6084 55.707 99.4707 49.9238 99.4707 44.6914C99.5625 39.3672 100.297 34.6396 101.674 30.5088V28.9941C101.949 26.9746 102.225 25.3223 102.5 24.0371C102.775 22.6602 103.005 21.375 103.188 20.1816C103.464 18.1621 103.877 16.2803 104.428 14.5361C105.713 14.2607 106.677 13.7559 107.319 13.0215C107.962 12.1953 108.513 11.4609 108.972 10.8184C110.257 10.7266 111.129 10.9102 111.588 11.3691C112.047 11.8281 112.506 12.5625 112.965 13.5723C113.424 14.3984 113.975 15.3164 114.617 16.3262C115.352 17.3359 116.407 18.1162 117.784 18.667C117.968 19.4014 118.197 20.1816 118.473 21.0078C118.84 21.7422 119.207 22.5684 119.574 23.4863C120.309 25.0469 120.951 26.6992 121.502 28.4434C122.145 30.0957 122.512 31.7021 122.604 33.2627C121.686 35.0068 120.951 37.0264 120.4 39.3213C119.941 41.6162 119.62 43.957 119.437 46.3438C119.345 48.6387 119.391 50.8877 119.574 53.0908C119.85 55.2021 120.263 56.9922 120.813 58.4609L121.64 60.251L123.98 59.9756C126.734 59.2412 129.213 58.4609 131.416 57.6348C133.711 56.7168 135.822 55.6611 137.75 54.4678C139.678 53.2744 141.514 51.8975 143.258 50.3369C145.002 48.6846 146.838 46.8027 148.766 44.6914C150.693 42.5801 152.346 40.1934 153.723 37.5312C155.191 34.7773 156.385 31.9316 157.303 28.9941C158.312 26.0566 159.047 23.165 159.506 20.3193C160.057 17.3818 160.424 14.6279 160.607 12.0576C162.168 11.5068 162.948 10.4053 162.948 8.75293L162.673 7.23828C162.306 6.6875 162.306 6.04492 162.673 5.31055C163.224 3.56641 164.509 2.23535 166.528 1.31738C167.997 2.23535 169.282 3.24512 170.384 4.34668C171.577 5.44824 172.679 6.5498 173.688 7.65137ZM203.155 60.9395C202.329 61.123 201.732 61.6279 201.365 62.4541C200.998 63.1885 200.631 63.9688 200.264 64.7949C199.988 65.6211 199.667 66.4014 199.3 67.1357C199.024 67.7783 198.565 68.0996 197.923 68.0996C197.831 68.834 197.556 69.4766 197.097 70.0273C196.729 70.5781 196.362 71.1748 195.995 71.8174C195.628 72.3682 195.353 73.0107 195.169 73.7451C194.985 74.3877 195.077 75.168 195.444 76.0859C194.71 76.6367 194.251 77.417 194.067 78.4268C193.884 79.4365 193.654 80.4004 193.379 81.3184C193.195 82.2363 192.828 83.0166 192.277 83.6592C191.727 84.3018 190.717 84.5771 189.248 84.4854C188.973 84.8525 188.927 85.082 189.11 85.1738C189.294 85.2656 189.432 85.5869 189.523 86.1377C188.514 85.9541 187.733 86 187.183 86.2754C186.724 86.6426 186.127 86.8721 185.393 86.9639C183.648 86.4131 182.18 85.4492 180.986 84.0723C179.885 82.6953 178.875 81.1807 177.957 79.5283C177.131 77.7842 176.351 76.04 175.616 74.2959C174.974 72.5518 174.331 71.0371 173.688 69.752C173.964 68.7422 174.01 67.7783 173.826 66.8604C173.643 65.8506 173.321 65.0244 172.862 64.3818C177.36 54.835 182.271 44.6455 187.596 33.8135C192.92 22.9814 197.969 12.2871 202.742 1.73047C204.854 2.55664 206.919 3.52051 208.938 4.62207C211.05 5.63184 212.932 6.8252 214.584 8.20215C216.328 9.5791 217.797 11.1855 218.99 13.0215C220.184 14.7656 220.964 16.7393 221.331 18.9424C221.147 19.4932 220.918 19.7227 220.643 19.6309C220.459 19.4473 220.275 19.4932 220.092 19.7686C220.459 20.2275 220.643 20.5488 220.643 20.7324C220.734 20.916 220.734 21.0996 220.643 21.2832C220.643 21.4668 220.643 21.7422 220.643 22.1094C220.643 22.3848 220.78 22.7979 221.056 23.3486C220.688 23.2568 220.413 23.3027 220.229 23.4863C220.138 23.6699 219.862 23.6699 219.403 23.4863C219.771 24.4961 219.862 25.3223 219.679 25.9648C219.587 26.6074 219.403 27.2041 219.128 27.7549C218.853 28.2139 218.623 28.7646 218.439 29.4072C218.256 29.958 218.302 30.6924 218.577 31.6104C218.302 31.6104 218.072 31.7021 217.889 31.8857C217.797 31.9775 217.705 32.1152 217.613 32.2988C217.521 32.3906 217.384 32.5283 217.2 32.7119C217.108 32.8037 216.925 32.8037 216.649 32.7119C216.925 34.7314 217.017 36.751 216.925 38.7705C216.833 40.79 216.741 42.8555 216.649 44.9668C216.649 46.9863 216.695 49.1436 216.787 51.4385C216.879 53.6416 217.2 55.9365 217.751 58.3232C221.056 56.3955 223.672 53.917 225.6 50.8877C227.619 47.8584 229.226 44.4619 230.419 40.6982C231.704 36.9346 232.668 32.8955 233.311 28.5811C233.953 24.2666 234.642 19.8604 235.376 15.3623C236.202 14.5361 236.845 13.5264 237.304 12.333C237.763 11.1396 238.176 9.90039 238.543 8.61523C238.91 7.23828 239.277 5.90723 239.645 4.62207C240.012 3.24512 240.471 2.00586 241.021 0.904297C242.398 1.08789 243.546 1.54688 244.464 2.28125C245.474 2.92383 246.392 3.6582 247.218 4.48438C248.044 5.21875 248.916 5.95312 249.834 6.6875C250.752 7.33008 251.899 7.74316 253.276 7.92676C254.378 9.4873 255.388 11.002 256.306 12.4707C257.224 13.9395 257.82 15.5 258.096 17.1523C257.637 17.8867 257.27 18.7129 256.994 19.6309C256.811 20.5488 256.581 21.4668 256.306 22.3848C256.03 23.3027 255.663 24.1748 255.204 25.001C254.745 25.7354 254.103 26.3779 253.276 26.9287C253.001 29.3154 252.634 31.5186 252.175 33.5381C251.808 35.4658 251.395 37.3936 250.936 39.3213C250.568 41.249 250.247 43.2686 249.972 45.3799C249.696 47.3994 249.604 49.6484 249.696 52.127C248.962 54.2383 248.182 56.4873 247.355 58.874C246.529 61.2607 245.887 63.418 245.428 65.3457C243.959 66.5391 242.812 67.9619 241.985 69.6143C241.159 71.2666 240.287 72.9189 239.369 74.5713C239.002 74.9385 238.772 75.0303 238.681 74.8467C238.589 74.6631 238.268 74.5254 237.717 74.4336C237.809 74.8008 237.809 75.0762 237.717 75.2598C237.625 75.4434 237.487 75.627 237.304 75.8105C237.212 75.9023 237.12 76.0859 237.028 76.3613C237.028 76.6367 237.12 77.0039 237.304 77.4629C236.019 78.0137 234.871 78.7939 233.861 79.8037C232.852 80.8135 231.75 81.7314 230.557 82.5576C229.455 83.3838 228.078 83.9346 226.426 84.21C224.865 84.4854 222.8 84.1641 220.229 83.2461C216.466 80.4922 213.115 77.3252 210.178 73.7451C207.332 70.165 204.991 65.8965 203.155 60.9395ZM337.546 81.043C333.14 81.2266 329.238 81.1348 325.842 80.7676C322.537 80.4004 319.278 79.5283 316.065 78.1514C315.882 78.0596 315.698 77.8301 315.515 77.4629C315.331 77.0957 315.147 76.8203 314.964 76.6367C314.413 76.3613 313.725 76.2695 312.898 76.3613C312.164 76.3613 311.521 76.2695 310.971 76.0859C310.236 75.7188 309.089 75.0303 307.528 74.0205C305.968 72.9189 304.545 71.9092 303.26 70.9912C301.607 69.7061 300.047 68.4209 298.578 67.1357C297.109 65.8506 295.824 64.4736 294.723 63.0049C294.447 62.6377 294.08 62.4541 293.621 62.4541C293.162 62.3623 292.749 62.2246 292.382 62.041C289.72 63.6934 287.471 65.7588 285.635 68.2373C283.799 70.7158 282.055 73.2402 280.402 75.8105C278.75 78.3809 277.006 80.8135 275.17 83.1084C273.334 85.4033 270.993 87.1475 268.147 88.3408C267.321 88.3408 266.587 88.2031 265.944 87.9277C265.302 87.6523 264.705 87.2852 264.154 86.8262C263.604 86.459 263.053 86.0918 262.502 85.7246C261.951 85.3574 261.354 85.082 260.712 84.8984C260.712 83.7969 260.482 82.7871 260.023 81.8691C259.656 80.9512 259.243 80.0791 258.784 79.2529C258.417 78.4268 258.142 77.6465 257.958 76.9121C257.774 76.0859 257.958 75.3057 258.509 74.5713C257.958 74.0205 257.132 73.4238 256.03 72.7812C256.581 72.2305 256.811 71.7256 256.719 71.2666C256.719 70.8076 256.627 70.3486 256.443 69.8896C256.26 69.4307 256.076 68.9258 255.893 68.375C255.801 67.8242 255.938 67.2734 256.306 66.7227C256.765 66.7227 257.315 66.6309 257.958 66.4473C257.407 65.7129 257.132 65.2998 257.132 65.208C257.224 65.0244 257.132 64.7949 256.856 64.5195C256.673 63.9688 256.765 63.6475 257.132 63.5557C257.499 63.3721 257.866 63.1885 258.233 63.0049C258.601 58.5068 259.381 54.3301 260.574 50.4746C261.768 46.6191 263.099 42.9014 264.567 39.3213C266.036 35.7412 267.459 32.1152 268.836 28.4434C270.305 24.7715 271.498 20.8242 272.416 16.6016C273.426 15.5918 274.206 14.3984 274.757 13.0215C275.399 11.6445 276.042 10.2676 276.685 8.89062C277.419 7.51367 278.199 6.18262 279.025 4.89746C279.943 3.52051 281.183 2.41895 282.743 1.59277C284.028 1.68457 285.176 2.05176 286.186 2.69434C287.195 3.24512 288.435 3.47461 289.903 3.38281C290.179 3.8418 290.408 4.30078 290.592 4.75977C290.867 5.21875 291.188 5.67773 291.556 6.13672L293.621 5.72363C294.631 6.5498 295.503 7.60547 296.237 8.89062C297.063 10.084 297.614 11.3691 297.89 12.7461C298.165 14.123 298.119 15.4541 297.752 16.7393C297.385 17.9326 296.513 18.8965 295.136 19.6309C295.228 20.0898 295.228 20.457 295.136 20.7324C295.136 20.916 295.09 21.0996 294.998 21.2832C294.906 21.4668 294.86 21.6504 294.86 21.834C294.86 22.0176 294.998 22.293 295.273 22.6602C293.438 24.0371 292.061 25.9648 291.143 28.4434C290.225 30.9219 289.72 33.125 289.628 35.0527C290.729 33.9512 291.923 32.8955 293.208 31.8857C294.585 30.7842 295.962 29.7285 297.339 28.7188C298.808 27.709 300.185 26.7451 301.47 25.8271C302.847 24.9092 304.086 23.9912 305.188 23.0732C308.217 20.3193 311.108 18.1162 313.862 16.4639C316.708 14.7197 319.691 12.792 322.812 10.6807C323.547 10.4971 324.098 10.4971 324.465 10.6807C324.924 10.7725 325.383 10.9102 325.842 11.0938C325.842 10.543 325.658 10.2217 325.291 10.1299C325.016 10.0381 324.924 9.6709 325.016 9.02832C326.393 8.66113 327.586 8.24805 328.596 7.78906C329.605 7.23828 330.707 6.7334 331.9 6.27441C332.727 7.10059 333.507 7.97266 334.241 8.89062C334.976 9.7168 335.985 10.2217 337.271 10.4053C337.729 11.415 338.28 12.1953 338.923 12.7461C339.565 13.2051 340.208 13.6641 340.851 14.123C341.493 14.582 342.044 15.1328 342.503 15.7754C343.054 16.418 343.375 17.4277 343.467 18.8047C343.1 19.4473 342.687 20.1357 342.228 20.8701C341.86 21.6045 341.493 22.4766 341.126 23.4863C339.29 25.1387 337.408 26.6074 335.48 27.8926C333.645 29.1777 331.763 30.417 329.835 31.6104C327.907 32.8037 325.934 33.9971 323.914 35.1904C321.895 36.3838 319.829 37.8066 317.718 39.459C317.259 40.1016 316.662 40.6982 315.928 41.249C315.285 41.708 314.597 42.2129 313.862 42.7637C313.128 43.2227 312.439 43.7275 311.797 44.2783C311.154 44.8291 310.649 45.4717 310.282 46.2061C310.007 46.2979 309.731 46.3438 309.456 46.3438C309.181 46.3438 308.905 46.3896 308.63 46.4814C308.354 47.124 307.896 47.6289 307.253 47.9961C306.702 48.3633 306.335 48.8682 306.151 49.5107C307.528 52.4482 309.318 54.6973 311.521 56.2578C313.725 57.8184 316.203 58.9658 318.957 59.7002C321.711 60.3428 324.694 60.71 327.907 60.8018C331.12 60.8018 334.471 60.8018 337.959 60.8018C338.326 60.71 338.464 60.5264 338.372 60.251C338.372 59.8838 338.602 59.7461 339.061 59.8379C341.264 60.5723 342.962 61.6279 344.155 63.0049C345.349 64.29 346.771 65.5752 348.424 66.8604C348.24 70.3486 347.185 73.2402 345.257 75.5352C343.329 77.8301 340.759 79.666 337.546 81.043Z" />
    </g>
  </svg>
);

export default Logo;
