var http  = require('http');
var https = require('https');
var url   = require('url');
var querystring = require('querystring');

var imgur_config = require('./config.js');

var server = http.createServer(function (req, res) {
    console.log("Request Received: " + req);
    if(req.method == 'POST') {
        var body = '';
        req.on('data', function (data) {
            body += data;
            // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
            if (body.length > 1e6) {
                // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
                req.connection.destroy();
            }
        });
        req.on('end', function () {
            var params = querystring.parse(body);

            if(typeof params.text != 'undefined') {
                var query = querystring.stringify({ q: params.text });
                var imgurReq = https.request({
                    hostname: "api.imgur.com",
                    headers: { Authorization: "Client-ID " + imgur_config.clientID },
                    path: "/3/gallery/search/viral?" + query
                }, function(imgurRes) {
                    console.log("Got response: " + res.statusCode);
                    var imgurBody = '';
                    imgurRes.on('data', function(data) {
                        imgurBody += data;
                        // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
                        if (imgurBody.length > 1e6) {
                            // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
                            imgurReq.connection.destroy();
                        }
                    });
                    imgurRes.on('end', function() {
                        console.log("Response Data: " + imgurBody);
                        var results = JSON.parse(imgurBody);
                        if(results.data.length > 0) {
                            var postRequest = https.request({
                                method: "POST",
                                hostname: "hooks.slack.com",
                                path: "/services/T08NCMCPQ/B093XDX1R/roOvnj908JgC8xbQbt216k1v"
                            }, function(postResponse) {
                                postResponse.on('error', function (err) {
                                    console.log(err);
                                });
                            });
                            postRequest.write(JSON.stringify({ text: "<" +
                                results.data[0].link + ">"}));
                            postRequest.end();

                            res.writeHead(200);
                            res.end();
                        }
                    })
                }).end();
            } else {
                console.log("No text param supplied.");
                res.writeHead(404);
                res.end();
            }
        });
    } else {
        console.log("Method Type not POST");
        res.writeHead(404);
        res.end();
    }
});

server.listen(80);
