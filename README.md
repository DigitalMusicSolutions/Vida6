# Vida.js

Vida is a JavaScript library built off the [Verovio](http://www.verovio.org/index.xhtml) music notation engraving library. Vida optimizes Verovio for larger scores, isolating the engraving process to a WebWorker to prevent UI freezing, and controls pagination.


## ES6 Usage

Vida is currently not supported in vanilla ES5. It compiles down to a CommonJS syntax as documented below.


```
import {VidaController, VidaView} from "./Vida6";

const vidaController = new VidaController();
```

Full documentation on all supported methods will come soon.


## Development

vida6 contains a Gulp-managed development setup (in the `example` folder) that will automatically compile the above files. Running the following commands from this root directory should get you up and running:

```
npm install # install all necessary build tools and compile JS
npm run dev # starts webpack-dev-server
```