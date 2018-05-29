# Vida.js

Vida is a JavaScript library built off the [Verovio](http://www.verovio.org/index.xhtml) music notation engraving library. Vida optimizes Verovio for larger scores, isolating the engraving process to a WebWorker to prevent UI freezing, and automatically paginates the score.

## ES6 Usage

The `verovioWorker.js`, `vida.js`, and `vida.css` files comprise Vida.js. All three must be accessible for a Vida instance to render properly. 

```
import {VidaView, VidaController} from './vida/vida.js';

const vidaController = new VidaController({
    workerLocation: "/path/to/verovioWorker.js",
    verovioLocation: "/path/to/verovio.min.js"
});

const vidaView = new VidaView({
    parentElement: document.getElementById("vida"),
    controller: vidaController,
});

vidaView.refreshVerovio(mei);
```

Use should be as simple as the code above. This repository does not come with a copy of Verovio; please download that from the site linked above.

Full documentation on all supported methods will come soon.


## Development

vida6 contains a Gulp-managed development setup (in the `example` folder) that will automatically compile the above files. Running the following commands from this root directory should get you up and running:

```
npm install # install all necessary build tools (includes webpack, gulp, and various others)
node_modules/gulp/gulp.js
```

The `gulp.js` command above will start a server on port 8066 serving a single HTML page with a Vida instance that takes up the whole screen. This also includes autoreload functionality; any changes to the CSS or JS will automatically be reflected in the browser.

## ES5 Usage

Follow the instructions for setting up the development environment above. This will create a file at `example/js/vida.min.js`, which is symlinked to `vida.min.js` in the root directory. This can be included within an ES5 environment.

An example of this is provided in `example/index.html`.
