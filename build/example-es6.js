import {VidaController, VidaView} from "../src/js/vida.js";

// Create a single controller pointing to the included copy of Verovio and the worker
const vidaController = new VidaController();

// Create a view, linking to #app above and to the created VidaController
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

// Very simple AJAX request to handle a successful load of an included MEI file
const xhr = new XMLHttpRequest();
xhr.open('GET', '/mei/bach.mei');
xhr.onreadystatechange = function()
{
    if (xhr.readyState === 4 && xhr.status === 200)
    {
        vidaLeft.refreshVerovio(xhr.responseText);
    }
};
xhr.send(null);