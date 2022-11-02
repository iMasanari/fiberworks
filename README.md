# Fiberworks

Web Worker上で仮想DOMを動かすUIライブラリ


# Usage

```js
// main.js
import { createApp } from '@imasanari/fiberworks/client'

const app = createApp(new Worker('./worker.js'), document.getElementById('app'))

app.render()
```

```jsx
// worker.js
/** @jsxImportSource @imasanari/fiberworks */
import { registerApp } from '@imasanari/fiberworks'

const App = () => {
  return <div>Hello World!</div>
}

registerApp(<App />)
```
