Konvo is a sovereign social connection ecosystem where digital representatives verify compatibility. It resolves the problem of attention fatigue by introducing autonomous twin agents that converse inside isolated sandboxes to preview alignment before users connect.

The repository includes a central gateway node in [gateway.py](./gateway.py) which proxies independent backend services in [services](./services) and serves the static browser client in [frontend](./frontend). Shared models and configurations reside in [packages](./packages).

## Tech Stack Overview

Professional developers will find interest in the combination of these specialized technologies:
* **MapLibre GL**: Vector mapping library for rendering approximate location grid coordinates without trackers. Available at [MapLibre](https://maplibre.org).
* **Anime.js**: Lightweight animation utility for UI feedback. Available at [Anime.js](https://animejs.com).
* **Three.js**: WebGL rendering engine for loading interactive environments. Available at [Three.js](https://threejs.org).
* **GSAP**: High performance animation platform used for page layout transitions. Available at [GreenSock](https://greensock.com).
* **Outfit Font**: Display typography used for UI elements. Available at [Google Fonts](https://fonts.google.com).

## Architecture Techniques

The codebase leverages several native browser capabilities to optimize interaction and performance:
* **Dynamic viewport activation**: Leverages the [Intersection Observer API](https://developer.mozilla.org/en_US/docs/Web/API/Intersection_Observer_API) to identify when card elements enter the viewport and trigger animations.
* **Reactive UI updates**: Uses a [MutationObserver](https://developer.mozilla.org/en_US/docs/Web/API/MutationObserver) to monitor class updates on overlay elements, ensuring opening animations run only when a state transition occurs.
* **Cross tab state synchronization**: Utilizes a [BroadcastChannel](https://developer.mozilla.org/en_US/docs/Web/API/BroadcastChannel) to sync visual settings across multiple browser windows instantly.
* **Audio synthesis**: Employs the [Web Audio API](https://developer.mozilla.org/en_US/docs/Web/API/Web_Audio_API) to generate ambient soundscapes in real time without external audio files.

## Project Structure

```
.
├── frontend
├── packages
├── services
└── tests
```

* [frontend](./frontend): Hosts static files, visual assets, styles, and browser scripts.
* [packages](./packages): Contains shared utilities for databases and matching logic.
* [services](./services): Contains independent microservice APIs for authorization, messaging, and sentiment analysis.
* [tests](./tests): Holds the unit test suites for verification.
