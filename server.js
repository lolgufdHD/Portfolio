const http = require('http');
const url = require('url');
const fs = require('fs');

http.createServer(function (req, res) {
  const filepath = url.parse(req.url, true).pathname;

  var filename = "."
  if (filepath.indexOf("/site") != 0) {
    filename += "/site"
  }
  filename += filepath

  if (filepath == "/") {
      filename += "index.html"
  }

  // check for only API call
  if (filename == "./site/media/getImages") {
    imageList = fs.readdirSync("site/media/imageGallery")
    // sort by date modified
    imageList.sort(function(a, b) {
        return fs.statSync("site/media/imageGallery/" + b).mtime.getTime() -
               fs.statSync("site/media/imageGallery/" + a).mtime.getTime();
    });

    files = {"images" : imageList}
    return res.end(JSON.stringify(files));
  } else {
    // simple http server
    filename = filename.replace("%20", " ");
    fs.readFile(filename, function(err, data) {
        if (err) {
          res.writeHead(404, {'Content-Type': 'text/html'});
          return res.end("404 " + filename + "Not Found");
        }
        return res.end(data);
      });
  }

}).listen(4000);