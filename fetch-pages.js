var http = require('http');
var $ = require('cheerio');
var async = require('async');
var iconv = require('iconv-lite');
var fs = require('fs');
var chapterNo = 1;

var url = 'http://www.biquku.com/0/761/',
    hrefList = {};

var curCount = 0;

var getChapter = function(url, cb) {
    ++ curCount;

    console.log('读取:' + url + '中, 同时有' + curCount + '并发中');

    var req = http.request(url, function(res) {
        var buffer_arr = [];
        var buffer_len = 0;
        if (res.statusCode == 200) {
            res.on('data', function(chunk) {
                buffer_arr.push(chunk);
                buffer_len += chunk.length;
            });
            res.on('end', function() {
                var $content = $(iconv.decode(Buffer.concat(buffer_arr, buffer_len), 'gbk')).find('#content').text();
                -- curCount;
                cb(null , $content);
            })
        } else {
            console.log("status: "  + res.statusCode);
            getChapter(url, cb);
        }
    });

    req.on('error', function(err) {
        console.log('request-err');
        console.error(err);
    });

    req.end();
};

var req = http.request(url, function(res) {
    var buffer_arr = [];
    var buffer_len = 0;
    res.on('data', function(chunk) {
        buffer_arr.push(chunk);
        buffer_len += chunk.length;
    });
    res.on('end', function() {
        var $html = $(iconv.decode(Buffer.concat(buffer_arr, buffer_len), 'gbk'));
        var $urls = $html.find('#list>dl>dd>a');
        var $a = '';

        for (var i = 0; i < $urls.length; i++) {
            $a = $($urls[i]);

            hrefList[$a.text()] = (function(url) {
                return function(cb) {
                    setTimeout(function() {
                        getChapter(url, cb);
                    }, 0)
                }
            })(url.concat($a.attr('href')));
        }

        console.time('novel');

        async.parallelLimit(hrefList, 20, function(err, res) {
            if (err) {
                console.log("parallel-err:");
                console.error(err);
            } else {
                for (var key in (res)) {
                    if (!res.hasOwnProperty(key)){
                        continue;
                    }

                    var fileName = './data/' + key + '.txt';
                    (function(key){
                        fs.writeFile(fileName, res[key], function(err) {
                            if (err) {
                                console.log('writefile-err:');
                                console.error(err);
                            } else {
                                console.log(key + ': success');
                            }
                        })
                    })(key)
                }
                console.timeEnd('novel');
            }
        })

    })
});

req.on('error', function(e) {
    console.error(e);
});

req.end();
