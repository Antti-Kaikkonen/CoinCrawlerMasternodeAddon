const proxy = require('express-http-proxy');
const express = require('express');
const parse = require('csv-parse');
const request = require('request');
const config = require('./config');

var app = express();

var masternodes = [];

//app.use('/proxy', proxy('185.165.169.30:3001', {
app.use('/', proxy(config.proxy_url, {

  userResDecorator: function(proxyRes, proxyResData, userReq, userRes) {
    if (proxyRes.url !== "full_nodes.csv") return proxyResData;
    return new Promise(function(resolve) {
      var parser = parse({delimiter: ',', relax: true});

      let output = [];
      let i = 0;
      parser.on('readable', function() {
        while(record = parser.read()){
          //record = record.map(column => column.replace(/\"/g, "\"\""));
          let ip = record[0];
          let isMasternode = masternodes.includes(ip);
          let port = record[1];
          i++;
          record.push(isMasternode ? 1 : 0);
          //console.log(record);
          output.push(record.map(column => "\""+column+"\"").join(","));
        }
      });

      parser.on('error', function(error) {
        console.log("error", error);
      });

      parser.on('end', function() {
        resolve(output.join("\n"));
      });

      parser.write(proxyResData);
      parser.end();
    });
  }

}));

setInterval(function() {
  request.post(
      config.rpc_url,
      { json: { method: 'masternodelist', params: ["addr"] } },
      function (error, response, body) {
          if (error) console.log("error", error);
          if (!error && response.statusCode == 200) {
              if (body.result) {
                let mnlist = [];
                Object.keys(body.result).forEach(key => {
                  let ipAndPort = body.result[key];
                  let ip = ipAndPort.split(":")[0];
                  mnlist.push(ip);
                });
                masternodes = mnlist;
                console.log("mns", masternodes);
              }
          }
      }
  ).auth(config.rpc_username, config.rpc_password, false);
}, 1000*10);

app.listen(config.listen_port);
