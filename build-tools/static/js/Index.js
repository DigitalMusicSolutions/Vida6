import $ from 'jquery';
import {VidaController, VidaView} from './vida';

// Create a controller
const vidaController = new VidaController({
    workerLocation: "./js/verovioWorker.js",
    verovioLocation: "verovio.min.js"
});

// Create a view
const vidaLeft = new VidaView({
    parentElement: document.getElementById("app"),
    controller: vidaController,
    iconClasses: {
        'nextPage': 'vida-next-page-add',
        'prevPage': 'vida-prev-page-add',
        'zoomIn': 'vida-zoom-in-add',
        'zoomOut': 'vida-zoom-out-add'
    }
});

$.ajax({
    method: 'GET',
    url: "/mei/bach.mei",
    success: data => {
    	// Can't do it as property value because of jQuery's 'this' hijacking
        vidaLeft.refreshVerovio(data);
    }
});
