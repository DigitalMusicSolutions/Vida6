# Vida.js

Vida is a JavaScript library built off the [Verovio](http://www.verovio.org/index.xhtml) music notation engraving library. Vida optimizes Verovio for larger scores, isolating the engraving process to a WebWorker to prevent UI freezing, and automatically paginates the score.

## Usage

The `verovioWorker.js`, `vida.js`, and `vida.css` files comprise Vida.js. All three must be accessible for a Vida instance to render properly. 

### ES6

```
import {VidaView, VidaController} from '/path/to/vida';

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

### ES5

Can't guarantee that this will always work, but the "vida5.min.js" file should expose VidaController and VidaView classes which follow the same signatures as their ES6 equivalents. The verovioWorker.js file is not compiled into this due to how WebWorkers work, but should also work in ES5. 

I guarantee absolutely nothing in ES5 and will gladly take pull requests on the ES6 code to help it work better.


## Development

The "build-tools" folder includes a gulp-managed development setup that will automatically compile the above files. The following commands should get you up and running:

```
cd build-tools; npm install
cd static; ../node_modules/jspm/jspm.js install
cd ../; node_modules/gulp/gulp.js
```

The `gulp` command above will start a server on port 8066 serving a single HTML page with a Vida instance that takes up the whole screen. Changes to CSS and JS will automatically be reflected in the `verovioWorker.js`, `vida.css`, `vida.js`, and `vida5.min.js` files in the root directory of this repository.