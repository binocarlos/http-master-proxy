var masterProxy = require('./')
var tape     = require('tape')
var http = require('http')
var url = require('url')
var hyperquest = require('hyperquest')
var concat = require('concat-stream')
var async = require('async')
var etcdjs = require('etcdjs')
var locked = require('locked')
var etcd = etcdjs('127.0.0.1:4001')
var testPath = '/electedhttptest'
var locker = locked('127.0.0.1:4001')

function resetEtcd(){
  tape('clear out test key', function(t){
    etcd.del(testPath, {
      recursive:true
    }, function(err){
      t.end()
    })
  })
}

function makeServer(id, port){

  var value = '127.0.0.1:' + port
  var node = locker({
    id:id,
    path:testPath,
    value:value,
    ttl:2
  })

  var proxy = masterProxy(function(){
    return node.isSelected()
  },function(){
    return node.value()
  })

  var server = http.createServer(proxy(function(req, res){
    if(url.parse(req.url).pathname=='/leader'){
      res.end(node.value())
      return
    }
    if(req.method=='GET'){
      res.end('read: ' + value)
    }
    else{
      proxy(req, res, function(){
        res.end('write: ' + value)
      })
    }
  }))

  server.autoListen = function(){
    node.start()
    server.listen(port)
  }

  server.autoClose = function(){
    node.stop()
    server.close()
  }

  return server
}

resetEtcd()

tape('write to master - read from slaves', function(t){
  var server1 = makeServer('node1', 8080)
  var server2 = makeServer('node2', 8081)
  var server3 = makeServer('node3', 8082)

  server1.autoListen()
  server2.autoListen()
  server3.autoListen()

  async.series([
    function(next){
      setTimeout(next, 1500)
    },
    function(next){
      hyperquest('http://127.0.0.1:8082/leader').pipe(concat(function(leader){
        leader = leader.toString()
        t.ok(leader.indexOf('127.0.0.1:808')==0, 'the leader is elected')
        next()
      }))
    },
    function(next){
      hyperquest('http://127.0.0.1:8080/hello').pipe(concat(function(result){
        result = result.toString()
        console.log(result)
        next()
      }))
    },
    function(next){
      hyperquest('http://127.0.0.1:8081/hello').pipe(concat(function(result){
        result = result.toString()
        console.log(result)
        next()
      }))
    },
    function(next){
      hyperquest('http://127.0.0.1:8082/hello').pipe(concat(function(result){
        result = result.toString()
        console.log(result)
        next()
      }))
    }
  ], function(){
    server1.autoClose()
    server2.autoClose()
    server3.autoClose()
    t.end()
  })
})

resetEtcd()