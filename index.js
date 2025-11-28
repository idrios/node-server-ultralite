// Run with "node index.js" in a terminal

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;

// *********************************************************************** //
// Set up a quick and dirty web server framework like express.js
// 
// To add an endpoint use the following syntax:
// 
//      app.get('/path', (req, res) => { ... });
//        --- or ---
//      handler = (req, res) => { ... }
//      app.get('/path', handler);
// 
// For parameters, use a colon -- e.g. /api/videos/:id for a variable "id" param

const app = {
    endpoints: {
        GET: [],
        POST: [],
        PUT: [],
        DELETE: []
    },
    get: (path, handler) => {
        console.log(`Registering GET endpoint: ${path}`);
        app.registerEndpoint('GET', path, handler);
    },
    put: (path, handler) => {
        console.log(`Registering PUT endpoint: ${path}`);
        app.registerEndpoint('PUT', path, handler);
    },
    post: (path, handler) => {
        console.log(`Registering POST endpoint: ${path}`);
        app.registerEndpoint('POST', path, handler);
    },
    delete: (path, handler) => {
        console.log(`Registering DELETE endpoint: ${path}`);
        app.registerEndpoint('DELETE', path, handler);
    },


    registerEndpoint: (method, path, handler) => {
        if(app.endpoints[method]){
            app.endpoints[method].push({ path, handler });
        }
    },

    deregisterEndpoint: (method, path) => {
        if(app.endpoints[method]){
            app.endpoints[method] = app.endpoints[method].filter(endpoint => endpoint.path !== path);
        }
    },

    findEndpointHandler: (method, path) => {
        if(!app.endpoints[method]) return null;

        for(const endpoint of app.endpoints[method]){
            const params = app.matchRoute(endpoint.path, path);

            // will be null if they don't match; params will be an object (possibly empty) if they do
            if(params !== null){
                return { handler: endpoint.handler, params };
            }
        }
        return null;
    },

    matchRoute: (pattern, path) => {
        // pattern like /api/videos/:id, path like /api/videos/123 -- this should return { id: '123' }
        const patternParts = pattern.split('/').filter(part => part.length > 0);
        const pathParts = path.split('/').filter(part => part.length > 0);

        if(patternParts.length !== pathParts.length){
            return null;
        }

        const params = {};

        for(let i = 0; i < patternParts.length; i++){
            const patternPart = patternParts[i];
            const pathPart = pathParts[i];
            if(patternPart.startsWith(':')){
                const paramName = patternPart.slice(1);
                params[paramName] = pathPart;
            } else if(patternPart !== pathPart){
                return null;
            }
        }

        return params;
    }   

}

// *********************************************************************** //
// Core functions to send network responses

const sendJSON = (res, data, status=200) => {
    const body = JSON.stringify(data);
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(body);
}

const send404 = (res) => {
    res.writeHead(404, {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
    });
    res.end('404 Not Found');
}

const sendFile = (res, filePath, contentType) => {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            send404(res);
        } else {
            res.writeHead(200, {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*'
            });
            res.end(data);
        }
    });
}

// WIP
// const sendFileAsStream = (res, filePath, contentType) => {
//     const readStream = fs.createReadStream(filePath);
//     readStream.on('open', () => {
//         res.writeHead(200, { 
//             'Content-Type': contentType,
//             'Content-Length'
//             'Access-Control-Allow-Origin': '*'
//         });
//         readStream.pipe(res);
//     });
//     readStream.on('error', (err) => {
//         send404(res);
//     });
// }


// *********************************************************************** //
// Add our endpoints

app.get('/', (req, res) => {
    console.log(`Received request for ${req.url}`);
    return sendJSON(res, { message: "Welcome to the Video Server API" });
});

app.get('/favicon.ico', (req, res) => {
    console.log(`Received request for ${req.url}`);
    return send404(res);
});

app.get('/api', (req, res) => {
    console.log(`Received request for ${req.url}`);
    return sendJSON(res, { videos: videoList });
});

app.get('/api/videos/:id', (req, res) => {
    console.log(`Received request for ${req.url}`);
    const videoObj = videoList.find(v => v.id === req.params.id);
    if(!videoObj){
        console.log(`Video with id: ${req.params.id} not found`, videoList);
        return send404(res);
    }
    videoPath = path.join(__dirname, videoObj.videoUrl);
    console.log(`Serving video file from path: ${videoPath}`);
    return sendFile(res, videoPath, 'video/mp4');
});

app.get('/api/thumbnails/:id', (req, res) => {
    console.log(`Received request for ${req.url}`);
    const thumbnailPath = path.join(__dirname, 'thumbnails', req.params.id);
    return sendFile(res, thumbnailPath, 'image/png');
});


// *********************************************************************** //
// Start server

const server = http.createServer((req, res) => {
    const { handler, params } = app.findEndpointHandler(req.method, req.url);
    if( handler ){
        req.params = params;
        return handler(req, res);
    }
    return send404(res);
});


// *********************************************************************** //
// Hardcoded video list instead of setting up a database
// Make sure the video file exists where it says it does. Add more files as needed

const videoList = [
    {
        id: '1',
        title: 'Metropolis',
        description: 'Metropolis, the 1927 silent film directed by Fritz Lang',
        thumbnailUrl: "./thumbnails/metropolis.png",
        videoUrl: "./videos/metropolis.mp4",
        author: "Fritz Lang",
        tags: ["dramatic", "orchestral", "silent film"],
        duration: "12000.000"
    }
];

server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
